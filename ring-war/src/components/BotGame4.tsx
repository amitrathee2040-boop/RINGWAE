import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { buildInitialBoard4, Player4Key, PLAYER4_COLORS, ALL_PLAYERS4 } from "../game/boardDefinition4";
import {
  applyMove4, Board4, nextTurn4, hasAnyMoves4,
  getValidMoves4, getComboJumps4, countPieces4,
} from "../game/gameLogic4";
import { getBestMove4, getHintMove4 } from "../game/botAI4";
import Board4Component from "./Board4";
import HUD4 from "./HUD4";

import { usePlayer } from "../contexts/PlayerContext";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdSlot, { AdInterstitial } from "./AdSlot";
import { logOfflineGameplay } from "../lib/offlineMode";

interface Props { uid: string; difficulty: "easy" | "normal" | "hard"; }

const BOT_NAMES: Record<Player4Key, string> = {
  player1: "",
  player2: "🤖 Bot Alpha",
  player3: "🤖 Bot Beta",
  player4: "🤖 Bot Gamma",
};

const CHAR_EMOJIS: Record<string, string> = {
  warrior:"⚔️", shadow:"🗡️", dragon:"🐲", phoenix:"🔥",
  knight:"🛡️", thunder:"⚡", ghost:"👻", wolf:"🐺",
};

export default function BotGame4({ uid: _uid, difficulty }: Props) {
  useEffect(() => { logOfflineGameplay("BotGame4"); }, []);
  const [, setLocation] = useLocation();
  const { data } = usePlayer();
  const myName = data?.displayName || localStorage.getItem("ringwar-name") || "Warrior";

  const [board, setBoard] = useState<Board4>(() => buildInitialBoard4());
  const [currentTurn, setCurrentTurn] = useState<Player4Key>("player1");
  const [inCombo, setInCombo] = useState(false);
  const [comboFrom, setComboFrom] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player4Key | null>(null);
  const [eliminated, setEliminated] = useState<Record<string, boolean>>({});
  const [pieces, setPieces] = useState<Record<Player4Key, number>>({ player1: 12, player2: 12, player3: 12, player4: 12 });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [showHintAd, setShowHintAd] = useState(false);
  const [hintAdCountdown, setHintAdCountdown] = useState(5);

  const boardRef = useRef<Board4>(board);
  const eliminatedRef = useRef<Record<string, boolean>>(eliminated);
  const inComboRef = useRef(false);
  const comboFromRef = useRef<number | null>(null);
  const currentTurnRef = useRef<Player4Key>("player1");
  const botThinkingRef = useRef(false);

  boardRef.current = board;
  eliminatedRef.current = eliminated;
  currentTurnRef.current = currentTurn;
  inComboRef.current = inCombo;
  comboFromRef.current = comboFrom;

  const names: Record<Player4Key, string> = {
    player1: myName,
    player2: BOT_NAMES.player2,
    player3: BOT_NAMES.player3,
    player4: BOT_NAMES.player4,
  };

  const playerInfos = ALL_PLAYERS4.map(k => ({
    key: k,
    name: names[k],
    pieces: pieces[k] ?? 0,
    eliminated: !!eliminated[k],
  }));

  function advanceTurn(newBoard: Board4, newElim: Record<string, boolean>, from: Player4Key) {
    let next = nextTurn4(from, newElim);
    let skips = 0;
    while (!hasAnyMoves4(newBoard, next) && !newElim[next] && skips < 4) {
      const updatedElim = { ...newElim, [next]: true };
      setEliminated(updatedElim);
      eliminatedRef.current = updatedElim;
      newElim = updatedElim;
      const active = ALL_PLAYERS4.filter(p => !updatedElim[p]);
      if (active.length <= 1) {
        const w = active[0] ?? from;
        setTimeout(() => setWinner(w), 60);
        return;
      }
      next = nextTurn4(next, updatedElim);
      skips++;
    }
    setCurrentTurn(next);
    currentTurnRef.current = next;
    setInCombo(false);
    setComboFrom(null);
    inComboRef.current = false;
    comboFromRef.current = null;
    botThinkingRef.current = false;
  }

  const handleMove = useCallback((from: number, to: number, kills: number[]) => {
    if (currentTurnRef.current !== "player1") return;
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);

    setBoard(prevBoard => {
      const result = applyMove4(from, to, kills, prevBoard, "player1", eliminatedRef.current);
      setEliminated(result.eliminated);
      eliminatedRef.current = result.eliminated;
      setPieces(result.pieces);

      if (result.winner) {
        setTimeout(() => setWinner(result.winner!), 60);
        return result.newBoard as Board4;
      }

      if (result.canCombo) {
        setInCombo(true);
        setComboFrom(to);
        inComboRef.current = true;
        comboFromRef.current = to;
        return result.newBoard as Board4;
      }

      boardRef.current = result.newBoard as Board4;
      advanceTurn(result.newBoard as Board4, result.eliminated, "player1");
      return result.newBoard as Board4;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Bot AI
  useEffect(() => {
    if (winner) return;
    const botPlayers: Player4Key[] = ["player2", "player3", "player4"];
    if (!botPlayers.includes(currentTurn)) return;
    if (botThinkingRef.current) return;
    botThinkingRef.current = true;

    const delay = difficulty === "hard" ? 850 : difficulty === "normal" ? 1100 : 600;

    const timer = setTimeout(() => {
      const curBoard = boardRef.current;
      const curElim = eliminatedRef.current;
      const curBot = currentTurnRef.current;
      const curInCombo = inComboRef.current;
      const curComboFrom = comboFromRef.current;

      if (!botPlayers.includes(curBot)) {
        botThinkingRef.current = false;
        return;
      }

      const all: { from: number; to: number; kills: number[] }[] = [];
      const jumps: { from: number; to: number; kills: number[] }[] = [];

      if (curInCombo && curComboFrom != null) {
        for (const m of getComboJumps4(curComboFrom, curBoard, curBot)) {
          jumps.push({ from: curComboFrom, to: m.to, kills: m.kills });
        }
      } else {
        for (let i = 0; i < 49; i++) {
          if (curBoard[String(i)] !== curBot) continue;
          for (const m of getValidMoves4(i, curBoard, curBot)) {
            all.push({ from: i, to: m.to, kills: m.kills });
            if (m.isJump) jumps.push({ from: i, to: m.to, kills: m.kills });
          }
        }
      }

      const pool = jumps.length > 0 ? jumps : all;

      if (pool.length === 0) {
        const newElim = { ...curElim, [curBot]: true };
        setEliminated(newElim);
        eliminatedRef.current = newElim;
        const active = ALL_PLAYERS4.filter(p => !newElim[p]);
        if (active.length <= 1) {
          setWinner(active[0] ?? curBot);
          botThinkingRef.current = false;
          return;
        }
        advanceTurn(curBoard, newElim, curBot);
        return;
      }

      // Easy=1 step, Normal=3 steps, Hard=6 steps (paranoid minimax)
      const depth = difficulty === "hard" ? 6 : difficulty === "normal" ? 3 : 1;
      const chosen = getBestMove4(curBoard, curBot, depth, curInCombo, curComboFrom, curElim)
        ?? pool[Math.floor(Math.random() * pool.length)];

      const result = applyMove4(chosen.from, chosen.to, chosen.kills, curBoard, curBot, curElim);
      const newBoard = result.newBoard as Board4;

      setBoard(newBoard);
      boardRef.current = newBoard;
      setEliminated(result.eliminated);
      eliminatedRef.current = result.eliminated;
      setPieces(result.pieces);

      if (result.winner) {
        setWinner(result.winner);
        botThinkingRef.current = false;
        return;
      }

      if (result.canCombo) {
        setInCombo(true);
        setComboFrom(chosen.to);
        inComboRef.current = true;
        comboFromRef.current = chosen.to;
        botThinkingRef.current = false;
        return;
      }

      advanceTurn(newBoard, result.eliminated, curBot);
    }, delay);

    return () => { clearTimeout(timer); botThinkingRef.current = false; };
  }, [currentTurn, inCombo, comboFrom, winner, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleHintClick() {
    if (currentTurnRef.current !== "player1") return;
    const best = getHintMove4(boardRef.current, "player1", inComboRef.current, comboFromRef.current);
    if (!best) return;
    setHintMove({ from: best.from, to: best.to });
    setHintVisible(true);
  }

  function resetGame() {
    botThinkingRef.current = false;
    const fresh = buildInitialBoard4();
    setBoard(fresh);
    boardRef.current = fresh;
    setCurrentTurn("player1");
    currentTurnRef.current = "player1";
    setInCombo(false);
    setComboFrom(null);
    inComboRef.current = false;
    comboFromRef.current = null;
    setWinner(null);
    setEliminated({});
    eliminatedRef.current = {};
    setPieces({ player1: 12, player2: 12, player3: 12, player4: 12 });
    setShowExitConfirm(false);
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);
  }

  /* ─── WINNER SCREEN ─── */
  if (winner) {
    const winColor = PLAYER4_COLORS[winner];
    const winName = names[winner];
    return (
      <div className="screen-bg">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: "100%", maxWidth: 360, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{winner === "player1" ? "🏆" : "😅"}</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            {winner === "player1" ? "You Win!" : "Winner!"}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: winColor, marginBottom: 20 }}>{winName}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {[...playerInfos].sort((a, b) => b.pieces - a.pieces).map((p, rank) => (
              <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", borderRadius: 10,
                background: p.key === winner ? `${PLAYER4_COLORS[p.key]}18` : "rgba(255,255,255,0.04)",
                border: `1px solid ${p.key === winner ? PLAYER4_COLORS[p.key] + "50" : "rgba(255,255,255,0.07)"}` }}>
                <div style={{ fontSize: 16, width: 24, textAlign: "center" }}>
                  {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "4️⃣"}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: PLAYER4_COLORS[p.key] }} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{p.pieces}♟</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={resetGame} className="btn-gold" style={{ flex: 1, padding: "12px 0", fontSize: 14, borderRadius: 10 }}>
              Play Again
            </button>
            <button onClick={() => setLocation("/")} className="btn-secondary" style={{ flex: 1, padding: "12px 0", fontSize: 14, borderRadius: 10 }}>
              Home
            </button>
          </div>
          <AdSlot variant="leaderboard" className="mt-4" />
        </motion.div>
      </div>
    );
  }

  /* ─── PLAYING SCREEN ─── */
  const isMyTurn = currentTurn === "player1";
  const turnColor = PLAYER4_COLORS[currentTurn];
  const turnName = names[currentTurn];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", overflow: "hidden",
      background: "linear-gradient(150deg,#0a0e1f 0%,#080c1a 100%)", position: "relative" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setShowExitConfirm(true)}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}>1 vs 3 BOTS</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            {difficulty === "hard" ? "🔴 Hard" : difficulty === "normal" ? "🟢 Normal" : "🟡 Easy"}
          </div>
        </div>
        {isMyTurn && (
          <button onClick={handleHintClick}
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
              borderRadius: 8, padding: "6px 10px", color: "#22c55e", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
            <Lightbulb size={13} /> Hint
          </button>
        )}
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: PLAYER4_COLORS["player1"] }} />
      </div>

      {/* Turn indicator */}
      <AnimatePresence mode="wait">
        <motion.div key={currentTurn} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
          style={{ textAlign: "center", padding: "4px 0", flexShrink: 0,
            fontSize: 12, fontWeight: 700, color: turnColor, letterSpacing: "0.05em" }}>
          {isMyTurn ? "⚡ Your Turn!" : `${turnName} thinking…`}
        </motion.div>
      </AnimatePresence>

      {/* HUD */}
      <HUD4 players={playerInfos} currentTurn={currentTurn} myKey="player1" winner={winner} />

      {/* Board */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px" }}>
        <Board4Component
          board={board}
          myKey="player1"
          currentTurn={currentTurn}
          isMyTurn={isMyTurn}
          inCombo={inCombo}
          comboFrom={comboFrom}
          eliminated={eliminated}
          onMove={handleMove}
          hintFrom={hintVisible ? (hintMove?.from ?? null) : null}
          hintTo={hintVisible ? (hintMove?.to ?? null) : null}
        />
      </div>

      {/* Ad */}
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

      {/* Exit confirm */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.65)" }}>
            <motion.div initial={{ scale: 0.88 }} animate={{ scale: 1 }}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 20,
                padding: "24px 20px", margin: "0 24px", textAlign: "center", maxWidth: 320, width: "100%" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚪</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", marginBottom: 6 }}>Leave Game?</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>Progress will be lost.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowExitConfirm(false)}
                  className="theme-btn-secondary"
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                  Stay
                </button>
                <button onClick={() => setLocation("/")}
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
