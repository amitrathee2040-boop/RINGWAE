import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ref, onValue, update } from "firebase/database";
import { db } from "../firebase";
import {
  Player4Key, PLAYER4_COLORS, ALL_PLAYERS4, buildInitialBoard4,
} from "../game/boardDefinition4";
import {
  applyMove4, Board4, nextTurn4, hasAnyMoves4,
  getValidMoves4, getComboJumps4,
} from "../game/gameLogic4";
import { getBestMove4, getHintMove4 } from "../game/botAI4";
import Board4Component from "./Board4";
import HUD4 from "./HUD4";
import AdSlot, { AdInterstitial } from "./AdSlot";

import { useVoiceSpeaking4 } from "../hooks/useVoiceSpeaking4";
import VoicePanel4 from "./VoicePanel4";
import { ArrowLeft, Loader2, Copy, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props { uid: string; roomCode: string; }

interface Room4State {
  status: string;
  players: Partial<Record<Player4Key, { uid: string; displayName: string }>>;
  board: Record<string, Player4Key | null>;
  currentTurn: Player4Key;
  eliminated: Record<string, boolean>;
  pieces: Record<Player4Key, number>;
  winner: Player4Key | null;
  inCombo: boolean;
  comboFrom: number | null;
  createdAt: number;
  lastMoveAt: number;
  difficulty?: "easy" | "normal" | "hard";
}

export default function Game4({ uid, roomCode }: Props) {
  const [, setLocation] = useLocation();
  const [room, setRoom] = useState<Room4State | null>(null);
  const [myKey, setMyKey] = useState<Player4Key | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [showHintAd, setShowHintAd] = useState(false);
  const [hintAdCountdown, setHintAdCountdown] = useState(0);

  function handleHintClick() {
    if (!room || !myKey || room.currentTurn !== myKey || !!room.winner) return;
    const best = getHintMove4(room.board as Board4, myKey, room.inCombo ?? false, room.comboFrom ?? null);
    if (!best) return;
    setHintMove({ from: best.from, to: best.to });
    setHintVisible(false);
    setHintAdCountdown(5);
    setShowHintAd(true);
  }

  const myKeyRef = useRef<Player4Key | null>(null);
  // Prevents state updates on unmounted component (async onValue callback)
  const mountedRef = useRef(true);

  // Voice speaking-presence: publishes local mic activity + reads all 4 players
  const speaking = useVoiceSpeaking4(myKey, roomCode);

  useEffect(() => {
    mountedRef.current = true;
    if (!db) return;
    const roomRef = ref(db!, `rooms4/${roomCode}`);

    const unsub = onValue(roomRef, async snap => {
      if (!mountedRef.current) return;
      if (!snap.exists()) { setLoading(false); return; }
      const data = snap.val() as Room4State;
      setRoom(data);

      if (!myKeyRef.current) {
        const key = localStorage.getItem(`ringwar-4p-key-${roomCode}`) as Player4Key | null;
        if (key) {
          myKeyRef.current = key;
          if (mountedRef.current) { setMyKey(key); setLoading(false); }
          return;
        }

        for (const p of ALL_PLAYERS4) {
          const pl = data.players[p];
          if (!pl) {
            await update(ref(db!, `rooms4/${roomCode}/players`), {
              [p]: { uid, displayName: `Player ${p.slice(-1)}` },
            });
            localStorage.setItem(`ringwar-4p-key-${roomCode}`, p);
            myKeyRef.current = p;
            // Guard again after the async await — component may have unmounted
            if (mountedRef.current) { setMyKey(p); setLoading(false); }
            return;
          }
          if (pl.uid === uid) {
            localStorage.setItem(`ringwar-4p-key-${roomCode}`, p);
            myKeyRef.current = p;
            if (mountedRef.current) { setMyKey(p); setLoading(false); }
            return;
          }
        }
        if (mountedRef.current) setLoading(false);
      } else {
        if (mountedRef.current) setLoading(false);
      }
    });

    // Call the unsubscribe function directly — off(ref, event, fn) needs the
    // original callback, not the unsub handle, so that pattern never worked.
    return () => { mountedRef.current = false; unsub(); };
  }, [roomCode, uid]);

  const handleMove = useCallback(async (from: number, to: number, kills: number[]) => {
    if (!db || !room || !myKey) return;
    if (room.currentTurn !== myKey) return;
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);

    const result = applyMove4(from, to, kills, room.board as Board4, myKey, room.eliminated ?? {});

    let nextTurnPlayer = myKey;
    let finalElim = result.eliminated;

    if (!result.winner && !result.canCombo) {
      nextTurnPlayer = nextTurn4(myKey, result.eliminated);
      let skips = 0;
      while (!hasAnyMoves4(result.newBoard as Board4, nextTurnPlayer) && !finalElim[nextTurnPlayer] && skips < 4) {
        finalElim = { ...finalElim, [nextTurnPlayer]: true };
        const active = ALL_PLAYERS4.filter(p => !finalElim[p]);
        if (active.length <= 1) { break; }
        nextTurnPlayer = nextTurn4(nextTurnPlayer, finalElim);
        skips++;
      }
      const active = ALL_PLAYERS4.filter(p => !finalElim[p]);
      if (active.length <= 1 && !result.winner) {
        (result as { winner: Player4Key | null }).winner = active[0] ?? myKey;
      }
    }

    const updates: Record<string, unknown> = {
      [`rooms4/${roomCode}/board`]: result.newBoard,
      [`rooms4/${roomCode}/eliminated`]: finalElim,
      [`rooms4/${roomCode}/pieces`]: result.pieces,
      [`rooms4/${roomCode}/lastMoveAt`]: Date.now(),
    };

    if (result.winner) {
      updates[`rooms4/${roomCode}/winner`] = result.winner;
      updates[`rooms4/${roomCode}/status`] = "finished";
      updates[`rooms4/${roomCode}/inCombo`] = false;
      updates[`rooms4/${roomCode}/comboFrom`] = null;
      updates[`rooms4/${roomCode}/currentTurn`] = result.winner;
    } else if (result.canCombo) {
      updates[`rooms4/${roomCode}/inCombo`] = true;
      updates[`rooms4/${roomCode}/comboFrom`] = to;
    } else {
      updates[`rooms4/${roomCode}/currentTurn`] = nextTurnPlayer;
      updates[`rooms4/${roomCode}/inCombo`] = false;
      updates[`rooms4/${roomCode}/comboFrom`] = null;
    }

    await update(ref(db!, "/"), updates).catch(console.error);
  }, [room, myKey, roomCode]);

  // ── Bot AI for 4-Player ─────────────────────────────────────────────────
  const botMovingRef = useRef(false);

  useEffect(() => {
    if (!room || !db) return;
    if (room.winner || room.status === "finished") return;
    const currentPlayer = room.currentTurn;
    const playerData = room.players[currentPlayer];
    if (!playerData || playerData.uid !== "bot") return;
    if (botMovingRef.current) return;

    const timer = setTimeout(() => {
      if (!db || !room || botMovingRef.current) return;
      botMovingRef.current = true;

      const currentBoard = room.board as Board4;
      const eliminated = room.eliminated ?? {};
      const difficulty = room.difficulty ?? "normal";
      const all: { from: number; to: number; kills: number[] }[] = [];
      const jumps: { from: number; to: number; kills: number[] }[] = [];

      if (room.inCombo && room.comboFrom != null) {
        const cf = room.comboFrom;
        for (const m of getComboJumps4(cf, currentBoard, currentPlayer)) {
          jumps.push({ from: cf, to: m.to, kills: m.kills });
        }
      } else {
        for (let i = 0; i < 49; i++) {
          if (currentBoard[String(i)] !== currentPlayer) continue;
          for (const m of getValidMoves4(i, currentBoard, currentPlayer)) {
            all.push({ from: i, to: m.to, kills: m.kills });
            if (m.isJump) jumps.push({ from: i, to: m.to, kills: m.kills });
          }
        }
      }

      const pool = jumps.length > 0 ? jumps : all;

      if (pool.length === 0) {
        const finalElim = { ...eliminated, [currentPlayer]: true };
        const active = ALL_PLAYERS4.filter(p => !finalElim[p]);
        const nextTurnPlayer = nextTurn4(currentPlayer, finalElim);
        const updates: Record<string, unknown> = {
          [`rooms4/${roomCode}/eliminated`]: finalElim,
          [`rooms4/${roomCode}/currentTurn`]: active.length <= 1 ? currentPlayer : nextTurnPlayer,
          [`rooms4/${roomCode}/inCombo`]: false,
          [`rooms4/${roomCode}/comboFrom`]: null,
        };
        if (active.length <= 1) {
          updates[`rooms4/${roomCode}/winner`] = active[0] ?? currentPlayer;
          updates[`rooms4/${roomCode}/status`] = "finished";
        }
        update(ref(db!, "/"), updates).catch(() => {}).finally(() => { botMovingRef.current = false; });
        return;
      }

      const depth = difficulty === "hard" ? 6 : difficulty === "normal" ? 3 : 1;
      const chosen = getBestMove4(currentBoard, currentPlayer, depth, room.inCombo ?? false, room.comboFrom ?? null, eliminated)
        ?? pool[Math.floor(Math.random() * pool.length)];

      const result = applyMove4(chosen.from, chosen.to, chosen.kills, currentBoard, currentPlayer, eliminated);

      let nextTurnPlayer = currentPlayer;
      let finalElim = result.eliminated;

      if (!result.winner && !result.canCombo) {
        nextTurnPlayer = nextTurn4(currentPlayer, finalElim);
        let skips = 0;
        while (!hasAnyMoves4(result.newBoard as Board4, nextTurnPlayer) && !finalElim[nextTurnPlayer] && skips < 4) {
          finalElim = { ...finalElim, [nextTurnPlayer]: true };
          const active = ALL_PLAYERS4.filter(p => !finalElim[p]);
          if (active.length <= 1) break;
          nextTurnPlayer = nextTurn4(nextTurnPlayer, finalElim);
          skips++;
        }
        const active = ALL_PLAYERS4.filter(p => !finalElim[p]);
        if (active.length <= 1 && !result.winner) {
          (result as { winner: Player4Key | null }).winner = active[0] ?? currentPlayer;
        }
      }

      const updates: Record<string, unknown> = {
        [`rooms4/${roomCode}/board`]: result.newBoard,
        [`rooms4/${roomCode}/eliminated`]: finalElim,
        [`rooms4/${roomCode}/pieces`]: result.pieces,
        [`rooms4/${roomCode}/lastMoveAt`]: Date.now(),
      };

      if (result.winner) {
        updates[`rooms4/${roomCode}/winner`] = result.winner;
        updates[`rooms4/${roomCode}/status`] = "finished";
        updates[`rooms4/${roomCode}/inCombo`] = false;
        updates[`rooms4/${roomCode}/comboFrom`] = null;
        updates[`rooms4/${roomCode}/currentTurn`] = result.winner;
      } else if (result.canCombo) {
        updates[`rooms4/${roomCode}/inCombo`] = true;
        updates[`rooms4/${roomCode}/comboFrom`] = chosen.to;
      } else {
        updates[`rooms4/${roomCode}/currentTurn`] = nextTurnPlayer;
        updates[`rooms4/${roomCode}/inCombo`] = false;
        updates[`rooms4/${roomCode}/comboFrom`] = null;
      }

      update(ref(db!, "/"), updates).catch(() => {}).finally(() => { botMovingRef.current = false; });
    }, 800);

    return () => clearTimeout(timer);
  }, [room?.currentTurn, room?.status, room?.inCombo, room?.comboFrom, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExit() {
    if (room && !room.winner && db && myKey) {
      const newBoard = { ...(room.board as Record<string, Player4Key | null>) };
      for (let i = 0; i < 49; i++) {
        if (newBoard[String(i)] === myKey) newBoard[String(i)] = null;
      }
      const newEliminated = { ...(room.eliminated ?? {}), [myKey]: true };
      const newPieces = { ...(room.pieces ?? { player1: 12, player2: 12, player3: 12, player4: 12 }), [myKey]: 0 };
      const active = ALL_PLAYERS4.filter(p => !newEliminated[p]);

      const updates: Record<string, unknown> = {
        [`rooms4/${roomCode}/board`]: newBoard,
        [`rooms4/${roomCode}/eliminated`]: newEliminated,
        [`rooms4/${roomCode}/pieces`]: newPieces,
        [`rooms4/${roomCode}/lastMoveAt`]: Date.now(),
      };

      if (active.length <= 1) {
        updates[`rooms4/${roomCode}/winner`] = active[0] ?? myKey;
        updates[`rooms4/${roomCode}/status`] = "finished";
        updates[`rooms4/${roomCode}/inCombo`] = false;
        updates[`rooms4/${roomCode}/comboFrom`] = null;
      } else if (room.currentTurn === myKey) {
        updates[`rooms4/${roomCode}/currentTurn`] = nextTurn4(myKey, newEliminated);
        updates[`rooms4/${roomCode}/inCombo`] = false;
        updates[`rooms4/${roomCode}/comboFrom`] = null;
      }

      await update(ref(db, "/"), updates).catch(() => {});
    }
    setLocation("/");
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="screen-bg">
        <Loader2 size={36} color="#f59e0b" className="animate-spin" />
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 12 }}>Connecting…</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="screen-bg">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#f87171", marginBottom: 16 }}>Room not found: {roomCode}</div>
          <button onClick={() => setLocation("/")} className="btn-secondary" style={{ padding: "10px 24px", borderRadius: 10 }}>
            Back Home
          </button>
        </div>
      </div>
    );
  }

  if (!myKey) {
    return (
      <div className="screen-bg">
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Room is full.</div>
      </div>
    );
  }

  const joinedCount = ALL_PLAYERS4.filter(p => !!room.players[p]).length;
  const isWaiting = joinedCount < 4 && !room.winner;
  const winner = room.winner;
  const currentTurn = room.currentTurn;
  const isMyTurn = currentTurn === myKey && !winner;
  const pieces = room.pieces ?? { player1: 12, player2: 12, player3: 12, player4: 12 };
  const eliminated = room.eliminated ?? {};

  const playerInfos = ALL_PLAYERS4.map(k => ({
    key: k,
    name: room.players[k]?.displayName ?? `Slot ${k.slice(-1)}`,
    pieces: pieces[k] ?? 0,
    eliminated: !!eliminated[k],
  }));

  const myName = room.players[myKey]?.displayName ?? "You";
  const myColor = PLAYER4_COLORS[myKey];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", overflow: "hidden",
      background: "linear-gradient(150deg,#0a0e1f 0%,#080c1a 100%)" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => room && !room.winner ? setShowExitConfirm(true) : setLocation("/")}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}>4-PLAYER BATTLE</div>
          <button onClick={copyCode} style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", background: "none",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "0 auto" }}>
            <Copy size={9} /> {copied ? "Copied!" : roomCode}
          </button>
        </div>
        {isMyTurn && !winner && (
          <button onClick={handleHintClick}
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 8, padding: "6px 10px", color: "#22c55e", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
            <Lightbulb size={13} /> Hint
          </button>
        )}
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: myColor }} title={`You are ${myKey}`} />
      </div>

      {/* Waiting for players */}
      <AnimatePresence>
        {isWaiting && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ textAlign: "center", padding: "8px 0", flexShrink: 0,
              background: "rgba(245,158,11,0.06)", borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
            <span style={{ fontSize: 11, color: "rgba(245,158,11,0.8)", fontWeight: 600 }}>
              Waiting for players · {joinedCount}/4 joined · Code: <strong>{roomCode}</strong>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn indicator */}
      {!winner && !isWaiting && (
        <AnimatePresence mode="wait">
          <motion.div key={currentTurn} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            style={{ textAlign: "center", padding: "4px 0", flexShrink: 0,
              fontSize: 12, fontWeight: 700, color: PLAYER4_COLORS[currentTurn], letterSpacing: "0.06em" }}>
            {isMyTurn ? "Your Turn!" : `${room.players[currentTurn]?.displayName ?? currentTurn}'s Turn`}
          </motion.div>
        </AnimatePresence>
      )}

      {/* HUD */}
      <HUD4 players={playerInfos} currentTurn={currentTurn} myKey={myKey} winner={winner} speaking={speaking} />

      {/* Winner banner */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "10px 16px", flexShrink: 0,
              background: `${PLAYER4_COLORS[winner]}18`, border: `1px solid ${PLAYER4_COLORS[winner]}40`,
              margin: "0 10px", borderRadius: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: PLAYER4_COLORS[winner] }}>
              🏆 {room.players[winner]?.displayName ?? winner} Wins!
            </div>
            <button onClick={() => setLocation("/")} className="btn-secondary"
              style={{ marginTop: 10, padding: "8px 20px", fontSize: 13, borderRadius: 8 }}>
              Back to Lobby
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board + voice overlay */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px" }}>
        <Board4Component
          board={room.board as Board4}
          myKey={myKey}
          currentTurn={currentTurn}
          isMyTurn={isMyTurn}
          inCombo={room.inCombo ?? false}
          comboFrom={room.comboFrom ?? null}
          eliminated={eliminated}
          onMove={handleMove}
          hintFrom={hintVisible ? (hintMove?.from ?? null) : null}
          hintTo={hintVisible ? (hintMove?.to ?? null) : null}
        />

        {/* VoicePanel4 — appears when at least 2 players have joined */}
        {joinedCount >= 2 && (
          <VoicePanel4
            myKey={myKey}
            roomCode={roomCode}
            activePlayers={ALL_PLAYERS4.filter(p => !!room.players[p])}
          />
        )}
      </div>

      {/* Ad slot */}
      <div style={{ padding: "6px 10px", flexShrink: 0 }}>
        <AdSlot variant="banner" />
      </div>

      {/* Hint ad interstitial */}
      <AnimatePresence>
        {showHintAd && (
          <AdInterstitial
            countdown={hintAdCountdown}
            onClose={() => { setShowHintAd(false); setHintVisible(true); }}
          />
        )}
      </AnimatePresence>

      {/* Exit confirmation dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.65)" }}>
            <motion.div
              initial={{ scale: 0.88 }} animate={{ scale: 1 }}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 20,
                padding: "24px 20px", margin: "0 24px", textAlign: "center", maxWidth: 320, width: "100%" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚪</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", marginBottom: 6 }}>
                Leave Game?
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
                Your pieces will be removed from the board and other players will continue playing.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowExitConfirm(false)}
                  className="theme-btn-secondary"
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                  Stay
                </button>
                <button onClick={() => { setShowExitConfirm(false); handleExit(); }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", cursor: "pointer" }}>
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
