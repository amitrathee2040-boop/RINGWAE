import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ref, onValue, update } from "firebase/database";
import { db } from "../firebase";
import { GameState, PlayerKey } from "../types";
import { applyMove, hasAnyMoves, Board, getValidMoves, getComboJumps } from "../game/gameLogic";
import { getBestMove } from "../game/botAI";
import { colorOf } from "../game/colors";
import { useSound } from "../hooks/useSound";
import WaitingRoom from "./WaitingRoom";
import TossScreen from "./TossScreen";
import GameResult from "./GameResult";
import GameBoard from "./Board";
import HUD from "./HUD";
import ChatOverlay from "./ChatOverlay";
import VoicePanel from "./VoicePanel";
import PlayerProfileModal from "./PlayerProfileModal";

import { AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import AdSlot, { AdInterstitial } from "./AdSlot";

function normalizeBoard(board: Record<string, unknown>): Board {
  const result: Board = {};
  for (let i = 0; i < 25; i++) {
    const v = board[String(i)];
    result[String(i)] = v === "player1" || v === "player2" ? v : null;
  }
  return result;
}

interface Props { uid: string; roomCode: string; }

export default function Game({ uid, roomCode }: Props) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [lastReadCount, setLastReadCount] = useState(0);
  const [, setLocation] = useLocation();
  const movingRef = useRef(false);
  const prevTurnRef = useRef<PlayerKey | null>(null);

  const sound = useSound();

  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [showHintAd, setShowHintAd] = useState(false);
  const [hintAdCountdown, setHintAdCountdown] = useState(5);
  const [viewingProfileUid, setViewingProfileUid] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setLoadError(true); return; }
    const roomRef = ref(db, `rooms/${roomCode}`);
    const unsub = onValue(
      roomRef,
      (snap) => { if (snap.exists()) setGameState(snap.val() as GameState); else setLoadError(true); },
      () => setLoadError(true)
    );
    return unsub;
  }, [roomCode]);

  const handleRead = useCallback(() => {
    if (!db) return;
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    onValue(chatRef, (snap) => {
      setLastReadCount(snap.exists() ? Object.keys(snap.val()).length : 0);
    }, { onlyOnce: true });
  }, [roomCode]);

  // suppress unused warning
  void lastReadCount;

  useEffect(() => {
    if (!gameState || gameState.status !== "playing") return;
    const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" : "player2";
    if (prevTurnRef.current !== null && prevTurnRef.current !== myKey && gameState.currentTurn === myKey) {
      sound.playYourTurn();
    }
    prevTurnRef.current = gameState.currentTurn;
  }, [gameState?.currentTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gameState || gameState.status !== "finished" || !gameState.winner) return;
    const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" : "player2";
    if (gameState.winner === myKey) sound.playWin();
    else sound.playLose();
  }, [gameState?.status, gameState?.winner]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gameState || gameState.status !== "playing" || !db) return;
    if (!gameState.firstMoveDone || gameState.inCombo) return;
    const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" : "player2";
    if (gameState.currentTurn !== myKey) return;
    const board = normalizeBoard(gameState.board as Record<string, unknown>);
    if (hasAnyMoves(board, myKey)) return;
    const oppKey: PlayerKey = myKey === "player1" ? "player2" : "player1";
    const dbRef = db;
    const timer = setTimeout(() => {
      update(ref(dbRef, `rooms/${roomCode}`), { currentTurn: oppKey }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameState, uid, roomCode]);

  // ── Heartbeat: write presence every 8 s so opponents can detect disconnect ──
  useEffect(() => {
    if (!db || !uid) return;
    const write = () => {
      if (db) update(ref(db, `rooms/${roomCode}/presence`), { [uid]: Date.now() }).catch(() => {});
    };
    write();
    const timer = setInterval(write, 8000);
    return () => clearInterval(timer);
  }, [uid, roomCode]);

  // ── Disconnect detection: opponent gone > 25 s → they forfeit ───────────────
  useEffect(() => {
    if (!db || !gameState || gameState.status !== "playing") return;
    const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" : "player2";
    const oppKey: PlayerKey = myKey === "player1" ? "player2" : "player1";
    const oppUid = gameState.players[oppKey]?.uid;
    if (!oppUid || oppUid === "bot") return;

    const timer = setInterval(() => {
      if (!db) return;
      onValue(ref(db, `rooms/${roomCode}/presence/${oppUid}`), (snap) => {
        if (!snap.exists()) return;
        const lastSeen = snap.val() as number;
        if (Date.now() - lastSeen > 25000) {
          update(ref(db!, `rooms/${roomCode}`), {
            status: "finished",
            winner: myKey,
            surrendered: oppKey,
          }).catch(() => {});
        }
      }, { onlyOnce: true });
    }, 10000);
    return () => clearInterval(timer);
  }, [gameState?.status, uid, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gameState || gameState.status !== "waiting" || !db) return;
    const p1 = gameState.players.player1;
    const p2 = gameState.players.player2;
    if (!p1 || !p2) return;
    if (p1.uid !== uid) return;
    const winner: PlayerKey = Math.random() < 0.5 ? "player1" : "player2";
    update(ref(db, `rooms/${roomCode}`), {
      status: "toss",
      tossResult: winner,
      tossAnimation: true,
      currentTurn: winner,
    }).catch(() => {});
  }, [gameState?.status, gameState?.players, uid, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gameState || gameState.status !== "toss" || !db) return;
    if (!gameState.tossResult) return;
    if (gameState.players.player1?.uid !== uid) return;
    const dbRef = db;
    const timer = setTimeout(() => {
      update(ref(dbRef, `rooms/${roomCode}`), { status: "playing", startedAt: Date.now() }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [gameState?.status, gameState?.tossResult, uid, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bot AI ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState || !db) return;
    if (gameState.players.player2?.uid !== "bot") return;
    if (gameState.status !== "playing") return;
    if (gameState.currentTurn !== "player2") return;
    if (movingRef.current) return;

    const board = normalizeBoard(gameState.board as Record<string, unknown>);

    const timer = setTimeout(() => {
      if (movingRef.current || !db || !gameState) return;
      movingRef.current = true;

      if (!gameState.firstMoveDone) {
        const fromNode = [1,2,3,4,5,6,7,8].find(i =>
          board[String(i)] === "player2" &&
          getValidMoves(i, board, "player2").some(m => m.to === 0)
        );
        if (fromNode !== undefined) {
          const result = applyMove(fromNode, 0, [], board, "player2");
          update(ref(db, `rooms/${roomCode}`), {
            board: result.newBoard,
            orangePieces: Object.values(result.newBoard).filter(v => v === "player1").length,
            pinkPieces: Object.values(result.newBoard).filter(v => v === "player2").length,
            firstMoveDone: true,
            currentTurn: "player1",
            inCombo: false,
            lastMoveAt: Date.now(),
          }).catch(() => {}).finally(() => { movingRef.current = false; });
        } else { movingRef.current = false; }
        return;
      }

      const all: { from: number; to: number; kills: number[] }[] = [];
      const jumps: { from: number; to: number; kills: number[] }[] = [];

      if (gameState.inCombo && gameState.comboFrom != null) {
        const cf = gameState.comboFrom;
        for (const m of getComboJumps(cf, board, "player2")) {
          jumps.push({ from: cf, to: m.to, kills: m.kills });
        }
      } else {
        for (let i = 0; i < 25; i++) {
          if (board[String(i)] !== "player2") continue;
          for (const m of getValidMoves(i, board, "player2")) {
            all.push({ from: i, to: m.to, kills: m.kills });
            if (m.isJump) jumps.push({ from: i, to: m.to, kills: m.kills });
          }
        }
      }

      const pool = jumps.length > 0 ? jumps : all;
      if (pool.length === 0) {
        // Bot has no moves — pass turn to prevent deadlock
        update(ref(db, `rooms/${roomCode}`), { currentTurn: "player1", inCombo: false, comboFrom: null })
          .catch(() => {})
          .finally(() => { movingRef.current = false; });
        return;
      }

      const difficulty = gameState.difficulty ?? "normal";
      const botDepth = difficulty === "hard" ? 6 : difficulty === "normal" ? 3 : 1;
      const chosen = getBestMove(board, "player2", botDepth, gameState.inCombo || false, gameState.comboFrom ?? null)
        ?? pool[Math.floor(Math.random() * pool.length)];
      const result = applyMove(chosen.from, chosen.to, chosen.kills, board, "player2");
      const newOrange = Object.values(result.newBoard).filter(v => v === "player1").length;
      const newPink   = Object.values(result.newBoard).filter(v => v === "player2").length;

      const updates: Record<string, unknown> = {
        board: result.newBoard,
        orangePieces: newOrange,
        pinkPieces: newPink,
        lastMoveAt: Date.now(),
      };

      if (result.winner) {
        updates.status = "finished";
        updates.winner = result.winner;
        updates.inCombo = false;
        updates.comboFrom = null;
      } else if (result.canCombo) {
        updates.inCombo = true;
        updates.comboFrom = chosen.to;
        updates.currentTurn = "player2";
      } else {
        updates.currentTurn = "player1";
        updates.inCombo = false;
        updates.comboFrom = null;
      }

      update(ref(db, `rooms/${roomCode}`), updates)
        .catch(() => {})
        .finally(() => { movingRef.current = false; });
    }, 900);

    return () => clearTimeout(timer);
  }, [gameState?.currentTurn, gameState?.status, gameState?.inCombo, gameState?.comboFrom, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback((from: number, to: number, kills: number[]) => {
    if (!gameState || movingRef.current || !db) return;
    movingRef.current = true;
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);

    const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" : "player2";
    const board = normalizeBoard(gameState.board as Record<string, unknown>);
    const result = applyMove(from, to, kills, board, myKey);
    const oppKey: PlayerKey = myKey === "player1" ? "player2" : "player1";

    const newOrangePieces = Object.values(result.newBoard).filter(v => v === "player1").length;
    const newPinkPieces = Object.values(result.newBoard).filter(v => v === "player2").length;

    const updates: Record<string, unknown> = {
      board: result.newBoard,
      orangePieces: newOrangePieces,
      pinkPieces: newPinkPieces,
      lastMoveAt: Date.now(),
    };

    if (!gameState.firstMoveDone && to === 0) updates.firstMoveDone = true;

    if (kills.length > 0) sound.playCapture();
    else sound.playMove();

    if (result.winner) {
      updates.status = "finished";
      updates.winner = result.winner;
      updates.inCombo = false;
      updates.comboFrom = null;
      const winnerUid = result.winner === "player1" ? gameState.players.player1?.uid : gameState.players.player2?.uid;
      const loserUid = result.winner === "player1" ? gameState.players.player2?.uid : gameState.players.player1?.uid;
      if (winnerUid) updateStats(winnerUid, true, kills.length, result.winner === "player1" ? gameState.players.player1?.displayName || "Warrior" : gameState.players.player2?.displayName || "Warrior");
      if (loserUid) updateStats(loserUid, false, 0, result.winner === "player1" ? gameState.players.player2?.displayName || "Warrior" : gameState.players.player1?.displayName || "Warrior");
    } else if (result.canCombo) {
      sound.playCombo();
      updates.inCombo = true;
      updates.comboFrom = to;
      updates.currentTurn = myKey;
    } else {
      updates.currentTurn = oppKey;
      updates.inCombo = false;
      updates.comboFrom = null;
    }

    update(ref(db, `rooms/${roomCode}`), updates)
      .catch(() => {})
      .finally(() => { movingRef.current = false; });
  }, [gameState, uid, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStats(playerUid: string, won: boolean, kills: number, name: string) {
    if (!db) return;
    const statsRef = ref(db, `stats/${playerUid}`);
    onValue(statsRef, (snap) => {
      const s = snap.val() || { wins: 0, losses: 0, xp: 0, kills: 0, winStreak: 0, bestStreak: 0 };
      const wins = s.wins + (won ? 1 : 0);
      const losses = s.losses + (won ? 0 : 1);
      const winStreak = won ? (s.winStreak || 0) + 1 : 0;
      update(ref(db!, `stats/${playerUid}`), {
        name,
        wins,
        losses,
        xp: (s.xp || 0) + (won ? 150 : 30) + kills * 10,
        kills: (s.kills || 0) + kills,
        winStreak,
        bestStreak: Math.max(s.bestStreak || 0, winStreak),
        lastSeen: Date.now(),
      });
    }, { onlyOnce: true });
  }

  function handleSurrender() {
    if (!gameState || !db) return;
    const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" : "player2";
    const oppKey: PlayerKey = myKey === "player1" ? "player2" : "player1";
    update(ref(db, `rooms/${roomCode}`), {
      status: "finished",
      winner: oppKey,
      surrendered: myKey,
    });
  }

  // Exit mid-game counts as a surrender so the opponent isn't left hanging
  function handleExit() {
    if (gameState?.status === "playing") handleSurrender();
    setLocation("/");
  }

  if (loadError) {
    return (
      <div className="screen-bg">
        <div className="text-center space-y-4 px-6">
          <div className="theme-text-muted text-sm">Room not found or connection error.</div>
          <button onClick={() => setLocation("/")} className="btn-gold px-6 py-3 text-sm">Back to Home</button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="screen-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 animate-spin" />
          <div className="theme-text-muted text-sm">Loading game...</div>
        </div>
      </div>
    );
  }

  const myKey: PlayerKey = gameState.players.player1?.uid === uid ? "player1" :
    gameState.players.player2?.uid === uid ? "player2" : "player1";
  const isOnline = gameState.players.player1?.uid === uid || gameState.players.player2?.uid === uid;
  const isSpectator = !isOnline;
  const isBot = gameState.players.player2?.uid === "bot";
  const myName = localStorage.getItem("ringwar-name") || "Warrior";
  const p1Name = gameState.players.player1?.displayName || "Player 1";
  const p2Name = gameState.players.player2?.displayName || "Player 2";
  const p1Color = colorOf(gameState.pieceColors?.player1 || "orange");
  const p2Color = colorOf(gameState.pieceColors?.player2 || "pink");

  if (gameState.status === "waiting" && !isSpectator) {
    return (
      <WaitingRoom
        roomCode={roomCode}
        uid={uid}
        myName={myName}
        onCancel={() => setLocation("/")}
      />
    );
  }

  if (gameState.status === "waiting" && isSpectator) {
    return (
      <div className="screen-bg">
        <div className="flex flex-col items-center gap-6 px-5 w-full max-w-sm animate-slide-up text-center">
          <div className="text-4xl">👁</div>
          <div>
            <div className="text-xl font-black theme-text-primary">Spectating</div>
            <div className="text-sm theme-text-muted mt-1">Waiting for players to start…</div>
          </div>
          <div className="theme-card px-8 py-4 rounded-2xl">
            <div className="text-xs theme-text-muted uppercase tracking-widest mb-1">Room</div>
            <div className="text-2xl font-black tracking-widest shimmer-text">{roomCode}</div>
          </div>
          <button onClick={() => setLocation("/")} className="btn-secondary px-8 py-3 text-sm rounded-2xl">Leave</button>
        </div>
      </div>
    );
  }

  if (gameState.status === "toss") {
    return (
      <TossScreen
        tossResult={gameState.tossResult ?? null}
        myKey={myKey}
        p1Name={p1Name}
        p2Name={p2Name}
        p1Color={p1Color}
        p2Color={p2Color}
      />
    );
  }

  if (gameState.status === "finished" && gameState.winner) {
    const oppKey: PlayerKey = myKey === "player1" ? "player2" : "player1";
    const opponentElo = gameState.eloSnapshot?.[oppKey];
    return (
      <GameResult
        winner={gameState.winner}
        surrendered={gameState.surrendered}
        myKey={myKey}
        p1Name={p1Name}
        p2Name={p2Name}
        p1Color={p1Color}
        p2Color={p2Color}
        opponentElo={opponentElo}
        onPlayAgain={() => setLocation("/")}
        onHome={() => setLocation("/")}
      />
    );
  }

  const board = normalizeBoard(gameState.board as Record<string, unknown>);
  const isMyTurn = gameState.currentTurn === myKey;

  function handleHintClick() {
    if (!gameState || !isMyTurn || isSpectator || gameState.status !== "playing") return;
    const best = getBestMove(board, myKey, 2, gameState.inCombo || false, gameState.comboFrom ?? null);
    if (!best) return;
    setHintMove({ from: best.from, to: best.to });
    setHintVisible(false);
    setHintAdCountdown(5);
    setShowHintAd(true);
  }

  return (
    <div className="screen-bg overflow-hidden">
      <div className="game-container">
        <HUD
          gameState={gameState}
          myKey={myKey}
          uid={uid}
          onSurrender={handleSurrender}
          onExit={handleExit}
          isSpectator={isSpectator}
          onViewProfile={(pUid) => setViewingProfileUid(pUid)}
        />

        {isMyTurn && !isSpectator && (
          <div className="px-3 pt-1 pb-0 flex justify-center">
            <button onClick={handleHintClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }}>
              <Lightbulb size={13} /> Hint
            </button>
          </div>
        )}

        <div className="board-region" style={{ position: "relative" }}>
          <GameBoard
            board={board}
            myKey={myKey}
            currentTurn={gameState.currentTurn}
            isMyTurn={isMyTurn && !isSpectator && !(isBot && gameState.currentTurn === "player2")}
            firstMoveDone={gameState.firstMoveDone}
            inCombo={gameState.inCombo || false}
            comboFrom={gameState.comboFrom ?? null}
            onMove={(isOnline && !isSpectator) ? handleMove : () => {}}
            p1Color={p1Color}
            p2Color={p2Color}
            hintFrom={hintVisible ? (hintMove?.from ?? null) : null}
            hintTo={hintVisible ? (hintMove?.to ?? null) : null}
          />

          {/* PUBG-style text chat overlay — bottom-left */}
          {!isSpectator && (
            <ChatOverlay
              uid={uid}
              roomCode={roomCode}
              myName={myName}
              onRead={handleRead}
            />
          )}

          {/* PUBG/BGMI-style voice panel — bottom-right */}
          {!isSpectator && !isBot && (
            <VoicePanel
              uid={uid}
              roomCode={roomCode}
              myName={myName}
              opponentName={myKey === "player1" ? p2Name : p1Name}
              opponentUid={
                gameState.players.player1?.uid === uid
                  ? gameState.players.player2?.uid
                  : gameState.players.player1?.uid
              }
            />
          )}
        </div>

        <div className="room-code-label px-3 pt-1 pb-1 text-center text-xs theme-text-muted font-mono tracking-widest opacity-30">
          {roomCode}
        </div>

        {/* Bottom banner ad */}
        <div style={{ padding: "2px 10px 6px", flexShrink: 0 }}>
          <AdSlot variant="banner" />
        </div>
      </div>

      <AnimatePresence>
        {showHintAd && (
          <AdInterstitial
            countdown={hintAdCountdown}
            onClose={() => { setShowHintAd(false); setHintVisible(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProfileUid && (
          <PlayerProfileModal
            key={viewingProfileUid}
            viewedUid={viewingProfileUid}
            myUid={uid}
            myName={myName}
            onClose={() => setViewingProfileUid(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
