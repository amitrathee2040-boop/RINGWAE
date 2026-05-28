import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { buildInitialBoard } from "../game/boardDefinition";
import {
  applyMove, hasAnyMoves, Board, countPieces,
  getValidMoves, getComboJumps,
} from "../game/gameLogic";
import { getBestMove } from "../game/botAI";
import { colorOf } from "../game/colors";
import { PlayerKey } from "../types";
import { usePlayer } from "../contexts/PlayerContext";
import GameBoard from "./Board";
import GameResult from "./GameResult";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, LogOut, Lightbulb } from "lucide-react";
import AdSlot, { AdInterstitial } from "./AdSlot";


interface Props {
  uid: string;
  difficulty: "easy" | "normal" | "hard";
}

type Screen = "playing" | "result";

export default function BotGame({ uid: _uid, difficulty }: Props) {
  const [, setLocation] = useLocation();
  const { data } = usePlayer();
  const myName = data?.displayName || localStorage.getItem("ringwar-name") || "Warrior";
  const myPieceColor = data?.pieceColor || "orange";

  const [screen, setScreen] = useState<Screen>("playing");
  const [board, setBoard] = useState<Board>(() => buildInitialBoard() as Board);
  const [currentTurn, setCurrentTurn] = useState<PlayerKey>("player1");
  const [firstMoveDone, setFirstMoveDone] = useState(false);
  const [inCombo, setInCombo] = useState(false);
  const [comboFrom, setComboFrom] = useState<number | null>(null);
  const [winner, setWinner] = useState<PlayerKey | null>(null);
  const [surrendered, setSurrendered] = useState<PlayerKey | null>(null);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [showHintAd, setShowHintAd] = useState(false);
  const [hintAdCountdown, setHintAdCountdown] = useState(5);

  const botThinkingRef = useRef(false);
  const boardRef = useRef<Board>(board);
  const firstMoveDoneRef = useRef(firstMoveDone);
  const inComboRef = useRef(inCombo);
  const comboFromRef = useRef(comboFrom);

  boardRef.current = board;
  firstMoveDoneRef.current = firstMoveDone;
  inComboRef.current = inCombo;
  comboFromRef.current = comboFrom;

  const p1Color = colorOf(myPieceColor as any);
  const p2Color = colorOf("pink");
  const p1Pieces = countPieces(board, "player1");
  const p2Pieces = countPieces(board, "player2");

  function handleHintClick() {
    const best = getBestMove(boardRef.current, "player1", 2, inComboRef.current, comboFromRef.current);
    if (!best) return;
    setHintMove({ from: best.from, to: best.to });
    setHintVisible(true);
  }

  const endGame = useCallback((w: PlayerKey, surr?: PlayerKey) => {
    setWinner(w);
    if (surr) setSurrendered(surr);
    setTimeout(() => setScreen("result"), 50);
  }, []);

  const switchTurn = useCallback((newBoard: Board, nextPlayer: PlayerKey) => {
    let candidate = nextPlayer;
    let tries = 0;
    while (!hasAnyMoves(newBoard, candidate) && tries < 2) {
      candidate = candidate === "player1" ? "player2" : "player1";
      tries++;
    }
    if (tries >= 2) {
      const p1 = countPieces(newBoard, "player1");
      const p2 = countPieces(newBoard, "player2");
      endGame(p1 > p2 ? "player1" : "player2");
      return;
    }
    setCurrentTurn(candidate);
  }, [endGame]);

  const handleMove = useCallback((from: number, to: number, kills: number[]) => {
    if (currentTurn !== "player1") return;
    setBoard(prev => {
      const result = applyMove(from, to, kills, prev, "player1");
      const newBoard = result.newBoard as Board;

      // Clear hint when player makes a move
      setHintVisible(false);
      setHintMove(null);

      if (result.winner) {
        setTimeout(() => endGame(result.winner!), 50);
        return newBoard;
      }

      if (!firstMoveDoneRef.current && to === 0) {
        setFirstMoveDone(true);
        firstMoveDoneRef.current = true;
      }

      if (result.canCombo) {
        setInCombo(true);
        setComboFrom(to);
        inComboRef.current = true;
        comboFromRef.current = to;
        return newBoard;
      }

      setInCombo(false);
      setComboFrom(null);
      inComboRef.current = false;
      comboFromRef.current = null;
      switchTurn(newBoard, "player2");
      return newBoard;
    });
  }, [currentTurn, endGame, switchTurn]);

  useEffect(() => {
    if (currentTurn !== "player2" || screen !== "playing") return;
    if (botThinkingRef.current) return;
    botThinkingRef.current = true;

    const delay = inCombo ? 350 : (difficulty === "hard" ? 800 : difficulty === "normal" ? 1100 : 600);

    const timer = setTimeout(() => {
      const curBoard = boardRef.current;
      const curInCombo = inComboRef.current;
      const curComboFrom = comboFromRef.current;

      // ── First-move special case (only if center is still empty) ──
      if (!firstMoveDoneRef.current && !curInCombo) {
        if (curBoard["0"] === null) {
          const fromNode = [1,2,3,4,5,6,7,8].find(i =>
            curBoard[String(i)] === "player2" &&
            getValidMoves(i, curBoard, "player2").some(m => m.to === 0)
          );
          if (fromNode !== undefined) {
            const result = applyMove(fromNode, 0, [], curBoard, "player2");
            setBoard(result.newBoard as Board);
            boardRef.current = result.newBoard as Board;
            setFirstMoveDone(true);
            firstMoveDoneRef.current = true;
            setInCombo(false);
            setComboFrom(null);
            inComboRef.current = false;
            comboFromRef.current = null;
            botThinkingRef.current = false;
            switchTurn(result.newBoard as Board, "player1");
            return;
          }
        }
        // Center occupied or no path — mark done and fall through to normal moves
        setFirstMoveDone(true);
        firstMoveDoneRef.current = true;
      }

      // ── Normal / combo AI ──
      const all: { from: number; to: number; kills: number[] }[] = [];
      const jumps: { from: number; to: number; kills: number[] }[] = [];

      if (curInCombo && curComboFrom != null) {
        for (const m of getComboJumps(curComboFrom, curBoard, "player2")) {
          jumps.push({ from: curComboFrom, to: m.to, kills: m.kills });
        }
      } else {
        for (let i = 0; i < 25; i++) {
          if (curBoard[String(i)] !== "player2") continue;
          for (const m of getValidMoves(i, curBoard, "player2")) {
            all.push({ from: i, to: m.to, kills: m.kills });
            if (m.isJump) jumps.push({ from: i, to: m.to, kills: m.kills });
          }
        }
      }

      const pool = jumps.length > 0 ? jumps : all;
      if (pool.length === 0) {
        botThinkingRef.current = false;
        endGame("player1");
        return;
      }

      // Easy=1 step, Normal=3 steps, Hard=6 steps (minimax alpha-beta)
      const depth = difficulty === "hard" ? 6 : difficulty === "normal" ? 3 : 1;
      const chosen = getBestMove(curBoard, "player2", depth, curInCombo, curComboFrom)
        ?? pool[Math.floor(Math.random() * pool.length)];

      const result = applyMove(chosen.from, chosen.to, chosen.kills, curBoard, "player2");
      const newBoard = result.newBoard as Board;
      setBoard(newBoard);
      boardRef.current = newBoard;
      botThinkingRef.current = false;

      if (result.winner) {
        endGame(result.winner);
      } else if (result.canCombo) {
        setInCombo(true);
        setComboFrom(chosen.to);
        inComboRef.current = true;
        comboFromRef.current = chosen.to;
        // NOTE: currentTurn stays "player2" — effect will re-fire because inCombo changed
      } else {
        setInCombo(false);
        setComboFrom(null);
        inComboRef.current = false;
        comboFromRef.current = null;
        switchTurn(newBoard, "player1");
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      botThinkingRef.current = false;
    };
  }, [currentTurn, inCombo, comboFrom, screen, difficulty, endGame, switchTurn]);

  function resetGame() {
    botThinkingRef.current = false;
    const fresh = buildInitialBoard() as Board;
    setBoard(fresh);
    setCurrentTurn("player1");
    setFirstMoveDone(false);
    setInCombo(false);
    setComboFrom(null);
    setWinner(null);
    setSurrendered(null);
    setConfirmSurrender(false);
    setConfirmExit(false);
    setHintMove(null);
    setShowHintAd(false);
    setHintVisible(false);
    boardRef.current = fresh;
    firstMoveDoneRef.current = false;
    inComboRef.current = false;
    comboFromRef.current = null;
    setScreen("playing");
  }

  if (screen === "result" && winner) {
    return (
      <GameResult
        winner={winner}
        surrendered={surrendered}
        myKey="player1"
        p1Name={myName}
        p2Name={`🤖 RingBot${difficulty === "hard" ? " (Hard)" : ""}`}
        p1Color={p1Color}
        p2Color={p2Color}
        gameMode="offline"
        onPlayAgain={resetGame}
        onHome={() => setLocation("/")}
      />
    );
  }

  const isMyTurn = currentTurn === "player1";
  const isBotTurn = currentTurn === "player2";

  return (
    <div className="screen-bg overflow-hidden">
      <div className="game-container">

        {/* HUD */}
        <div className="hud-outer w-full px-3 pt-2 pb-1.5 flex flex-col gap-0">
          <div className="hud-player-row flex items-center gap-2">

            {/* Bot card (opponent) */}
            <div className="hud-player-card flex-1 premium-card p-2 flex items-center gap-2 min-w-0"
              style={{ opacity: isBotTurn ? 1 : 0.55, transition: "opacity 0.3s" }}>
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-base"
                style={{ background: `${p2Color}22`, border: `1.5px solid ${p2Color}55` }}>
                🤖
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold truncate" style={{ color: p2Color }}>
                  RingBot{difficulty === "hard" ? " 🔴" : " 🟢"}
                </div>
                <div className="text-[10px] theme-text-muted">{p2Pieces} pieces</div>
              </div>
              {isBotTurn && (
                <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: p2Color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }} />
              )}
            </div>

            {/* Center turn indicator */}
            <div className="flex flex-col items-center flex-shrink-0 gap-0.5 px-1">
              <div className="text-[10px] theme-text-muted font-bold">VS</div>
              <div className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  color: isMyTurn ? p1Color : p2Color,
                  background: `${isMyTurn ? p1Color : p2Color}14`,
                  border: `1px solid ${isMyTurn ? p1Color : p2Color}30`,
                }}>
                {isMyTurn ? "Your Turn" : "Bot Thinking…"}
              </div>
            </div>

            {/* Player card */}
            <div className="hud-player-card flex-1 premium-card p-2 flex items-center gap-2 flex-row-reverse min-w-0"
              style={{ opacity: isMyTurn ? 1 : 0.55, transition: "opacity 0.3s" }}>
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: `${p1Color}22`, border: `1.5px solid ${p1Color}55`, color: p1Color }}>
                {myName.charAt(0).toUpperCase()}
              </div>
              <div className="text-right min-w-0 flex-1">
                <div className="text-[11px] font-bold truncate" style={{ color: p1Color }}>{myName}</div>
                <div className="text-[10px] theme-text-muted">{p1Pieces} pieces</div>
              </div>
              {isMyTurn && (
                <motion.div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: p1Color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }} />
              )}
            </div>
          </div>

          {/* Surrender / Exit / Hint buttons */}
          <div className="flex gap-2 mt-1.5 justify-center">
            <button onClick={() => setConfirmSurrender(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold theme-text-muted theme-btn-secondary">
              <Flag size={10} /> Surrender
            </button>
            {isMyTurn && (
              <button
                onClick={handleHintClick}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  background: hintVisible ? "rgba(74,222,128,0.18)" : "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.35)",
                  color: "#4ade80",
                  cursor: "pointer",
                }}>
                <Lightbulb size={10} /> Hint
              </button>
            )}
            <button onClick={() => setConfirmExit(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold theme-text-muted theme-btn-secondary">
              <LogOut size={10} /> Exit
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="board-region">
          <GameBoard
            board={board}
            myKey="player1"
            currentTurn={currentTurn}
            isMyTurn={isMyTurn}
            firstMoveDone={firstMoveDone}
            inCombo={inCombo}
            comboFrom={comboFrom}
            onMove={handleMove}
            p1Color={p1Color}
            p2Color={p2Color}
            noFlip={true}
            hintFrom={hintVisible ? hintMove?.from : null}
            hintTo={hintVisible ? hintMove?.to : null}
          />
        </div>

        {/* Difficulty badge */}
        <div className="px-3 pt-1 pb-1 flex justify-center">
          <span className="text-[10px] theme-text-muted px-3 py-1 rounded-full"
            style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}>
            🤖 VS Bot · {difficulty === "hard" ? "🔴 Hard" : "🟢 Normal"}
          </span>
        </div>

        {/* Bottom banner ad */}
        <div style={{ padding: "2px 10px 6px", flexShrink: 0 }}>
          <AdSlot variant="banner" />
        </div>
      </div>

      {/* Surrender confirm */}
      <AnimatePresence>
        {confirmSurrender && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="theme-card p-6 mx-6 rounded-2xl space-y-4 text-center"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div className="text-2xl">🏳️</div>
              <div className="font-bold theme-text-primary">Surrender?</div>
              <div className="text-xs theme-text-muted">Bot wins the match.</div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmSurrender(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm theme-btn-secondary">Cancel</button>
                <button onClick={() => { setConfirmSurrender(false); setSurrendered("player1"); endGame("player2", "player1"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
                  Surrender
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Ad interstitial */}
      <AnimatePresence>
        {showHintAd && (
          <AdInterstitial
            countdown={hintAdCountdown}
            onClose={() => {
              setShowHintAd(false);
              setHintVisible(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Exit confirm */}
      <AnimatePresence>
        {confirmExit && (
          <motion.div className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="theme-card p-6 mx-6 rounded-2xl space-y-4 text-center"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div className="text-2xl">🚪</div>
              <div className="font-bold theme-text-primary">Leave Game?</div>
              <div className="text-xs theme-text-muted">Your progress will be lost.</div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmExit(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm theme-btn-secondary">Cancel</button>
                <button onClick={() => { setConfirmExit(false); endGame("player2"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}>
                  Leave (Bot Wins)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
