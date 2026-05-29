import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { buildInitialBoard } from "../game/boardDefinition";
import { applyMove, hasAnyMoves, Board, countPieces } from "../game/gameLogic";
import { getBestMove } from "../game/botAI";
import { PlayerKey } from "../types";
import { colorOf } from "../game/colors";
import GameBoard from "./Board";
import GameResult from "./GameResult";

import { ArrowLeft, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdSlot, { AdInterstitial } from "./AdSlot";
import { logOfflineGameplay } from "../lib/offlineMode";

type Screen = "setup" | "playing" | "result";

export default function OfflineGame({ uid: _uid }: { uid: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { logOfflineGameplay("OfflineGame"); }, []);
  const [screen, setScreen] = useState<Screen>("setup");
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [board, setBoard] = useState<Board>(() => buildInitialBoard() as Board);
  const [currentTurn, setCurrentTurn] = useState<PlayerKey>("player1");
  const [firstMoveDone, setFirstMoveDone] = useState(false);
  const [inCombo, setInCombo] = useState(false);
  const [comboFrom, setComboFrom] = useState<number | null>(null);
  const [winner, setWinner] = useState<PlayerKey | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [showHintAd, setShowHintAd] = useState(false);
  const [hintAdCountdown, setHintAdCountdown] = useState(5);

  const boardRef = useRef<Board>(board);
  const inComboRef = useRef(false);
  const comboFromRef = useRef<number | null>(null);
  const currentTurnRef = useRef<PlayerKey>("player1");
  boardRef.current = board;
  inComboRef.current = inCombo;
  comboFromRef.current = comboFrom;
  currentTurnRef.current = currentTurn;

  function handleHintClick() {
    const best = getBestMove(boardRef.current, currentTurnRef.current, 2, inComboRef.current, comboFromRef.current);
    if (!best) return;
    setHintMove({ from: best.from, to: best.to });
    setHintVisible(true);
  }

  const p1Color = colorOf("orange");
  const p2Color = colorOf("pink");

  const handleMove = useCallback((from: number, to: number, kills: number[]) => {
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);
    setBoard(prevBoard => {
      const result = applyMove(from, to, kills, prevBoard, currentTurn);
      const newBoard = result.newBoard as Board;

      if (result.winner) {
        setTimeout(() => { setWinner(result.winner!); setScreen("result"); }, 50);
        return newBoard;
      }

      if (!firstMoveDone && to === 0) setFirstMoveDone(true);

      if (result.canCombo) {
        setInCombo(true);
        setComboFrom(to);
        return newBoard;
      }

      const next: PlayerKey = currentTurn === "player1" ? "player2" : "player1";
      let nextPlayer = next;
      let turns = 0;
      while (!hasAnyMoves(newBoard, nextPlayer) && turns < 2) {
        nextPlayer = nextPlayer === "player1" ? "player2" : "player1";
        turns++;
      }
      if (turns >= 2) {
        const p1 = countPieces(newBoard, "player1");
        const p2 = countPieces(newBoard, "player2");
        setTimeout(() => { setWinner(p1 > p2 ? "player1" : "player2"); setScreen("result"); }, 50);
        return newBoard;
      }
      setCurrentTurn(nextPlayer);
      setInCombo(false);
      setComboFrom(null);
      return newBoard;
    });
  }, [currentTurn, firstMoveDone]);

  function resetGame() {
    setBoard(buildInitialBoard() as Board);
    setCurrentTurn("player1");
    setFirstMoveDone(false);
    setInCombo(false);
    setComboFrom(null);
    setWinner(null);
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);
    setScreen("playing");
  }

  const p1Pieces = countPieces(board, "player1");
  const p2Pieces = countPieces(board, "player2");
  const isP1Turn = currentTurn === "player1";

  if (screen === "result" && winner) {
    return (
      <GameResult
        winner={winner}
        myKey="player1"
        p1Name={p1Name}
        p2Name={p2Name}
        p1Color={p1Color}
        p2Color={p2Color}
        onPlayAgain={resetGame}
        onHome={() => setLocation("/")}
      />
    );
  }

  if (screen === "setup") {
    return (
      <div className="screen-bg overflow-auto">
        <div className="flex flex-col gap-5 px-5 py-6 w-full max-w-sm animate-slide-up">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="p-2 rounded-xl theme-btn-secondary">
              <ArrowLeft size={16} className="theme-text-muted" />
            </button>
            <div className="font-bold theme-text-primary text-lg">2-Player Local</div>
          </div>

          <div className="space-y-3">
            <div className="theme-card p-4 space-y-2 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: p1Color }} />
                <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">Player 1 (Orange)</span>
              </div>
              <input
                className="theme-input w-full px-3 py-3 rounded-xl outline-none"
                style={{ fontSize: 16 }}
                placeholder="Enter name"
                value={p1Name}
                onChange={e => setP1Name(e.target.value)}
                maxLength={16}
              />
            </div>

            <div className="theme-card p-4 space-y-2 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: p2Color }} />
                <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">Player 2 (Pink)</span>
              </div>
              <input
                className="theme-input w-full px-3 py-3 rounded-xl outline-none"
                style={{ fontSize: 16 }}
                placeholder="Enter name"
                value={p2Name}
                onChange={e => setP2Name(e.target.value)}
                maxLength={16}
              />
            </div>
          </div>

          <button onClick={() => setScreen("playing")} className="btn-gold py-4 font-semibold text-sm">
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-bg overflow-hidden" style={{ position: "relative" }}>
      <div className="game-container">
        <div className="px-3 pt-2 pb-1 flex items-center gap-2">
          <div className="flex-1 theme-card p-2 flex items-center gap-2 min-w-0 rounded-2xl"
            style={{ opacity: isP1Turn ? 1 : 0.6 }}>
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: `${p1Color}25`, border: `1.5px solid ${p1Color}60`, color: p1Color }}>
              {p1Name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold theme-text-primary truncate">{p1Name}</div>
              <div className="text-[11px] theme-text-muted">{p1Pieces} pcs</div>
            </div>
            {isP1Turn && (
              <motion.div className="ml-auto w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            )}
          </div>

          <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
            <div className="text-center text-[10px] theme-text-muted font-bold">VS</div>
            <div className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ color: isP1Turn ? p1Color : p2Color, background: `${isP1Turn ? p1Color : p2Color}12`, border: `1px solid ${isP1Turn ? p1Color : p2Color}30` }}>
              {isP1Turn ? p1Name : p2Name}'s Turn
            </div>
          </div>

          <div className="flex-1 theme-card p-2 flex items-center gap-2 flex-row-reverse min-w-0 rounded-2xl"
            style={{ opacity: !isP1Turn ? 1 : 0.6 }}>
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: `${p2Color}25`, border: `1.5px solid ${p2Color}60`, color: p2Color }}>
              {p2Name.charAt(0).toUpperCase()}
            </div>
            <div className="text-right min-w-0">
              <div className="text-xs font-semibold theme-text-primary truncate">{p2Name}</div>
              <div className="text-[11px] theme-text-muted">{p2Pieces} pcs</div>
            </div>
            {!isP1Turn && (
              <motion.div className="mr-auto w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
            )}
          </div>
        </div>

        <div className="px-3 pt-1 pb-0 flex items-center justify-center gap-2">
          <button onClick={handleHintClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }}>
            <Lightbulb size={13} /> Hint
          </button>
          <button onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold theme-btn-secondary">
            <ArrowLeft size={13} /> Quit
          </button>
        </div>

        <div className="board-region">
          <GameBoard
            board={board}
            myKey={currentTurn}
            currentTurn={currentTurn}
            isMyTurn={true}
            firstMoveDone={firstMoveDone}
            inCombo={inCombo}
            comboFrom={comboFrom}
            onMove={handleMove}
            p1Color={p1Color}
            p2Color={p2Color}
            noFlip={true}
            hintFrom={hintVisible ? (hintMove?.from ?? null) : null}
            hintTo={hintVisible ? (hintMove?.to ?? null) : null}
          />
        </div>

        <div style={{ padding: "4px 10px 6px", flexShrink: 0 }}>
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
        {showExitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.65)" }}>
            <motion.div initial={{ scale: 0.88 }} animate={{ scale: 1 }}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 20,
                padding: "24px 20px", margin: "0 24px", textAlign: "center", maxWidth: 320, width: "100%" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚪</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", marginBottom: 6 }}>Quit Game?</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>Current game progress will be lost.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowExitConfirm(false)}
                  className="theme-btn-secondary"
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                  Continue
                </button>
                <button onClick={() => setLocation("/")}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", cursor: "pointer" }}>
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
