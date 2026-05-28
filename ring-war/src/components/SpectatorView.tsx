import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "../firebase";
import { GameState, PlayerKey } from "../types";
import { colorOf } from "../game/colors";
import { Eye, Home } from "lucide-react";
import { motion } from "framer-motion";
import GameBoard from "./Board";

function normalizeBoard(board: Record<string, unknown>) {
  const result: Record<string, "player1" | "player2" | null> = {};
  for (let i = 0; i < 25; i++) {
    const v = board[String(i)];
    result[String(i)] = v === "player1" || v === "player2" ? v : null;
  }
  return result;
}

interface Props { uid: string; roomCode: string; }

export default function SpectatorView({ uid, roomCode }: Props) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!db) { setLoadError(true); return; }
    const unsub = onValue(
      ref(db, `rooms/${roomCode}`),
      (snap) => { if (snap.exists()) setGameState(snap.val() as GameState); else setLoadError(true); },
      () => setLoadError(true)
    );
    return unsub;
  }, [roomCode]);

  useEffect(() => {
    if (!db) return;
    const specRef = ref(db, `rooms/${roomCode}/spectators/${uid}`);
    set(specRef, { at: Date.now() }).catch(() => {});
    return () => { remove(specRef).catch(() => {}); };
  }, [uid, roomCode]);

  useEffect(() => {
    if (!db) return;
    const unsub = onValue(ref(db, `rooms/${roomCode}/spectators`), (snap) => {
      setSpectatorCount(snap.exists() ? Object.keys(snap.val()).length : 0);
    });
    return unsub;
  }, [roomCode]);

  if (loadError) {
    return (
      <div className="screen-bg">
        <div className="text-center space-y-4 px-6">
          <div className="text-5xl">🔍</div>
          <div className="theme-text-muted text-sm">Room not found or game ended.</div>
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
          <div className="theme-text-muted text-sm">Loading spectator view...</div>
        </div>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div className="screen-bg">
        <div className="text-center space-y-4 px-6">
          <div className="text-5xl">⏳</div>
          <div className="theme-text-primary font-bold">Game hasn't started yet</div>
          <div className="theme-text-muted text-sm">Waiting for players to join...</div>
          <button onClick={() => setLocation("/")} className="btn-secondary px-6 py-3 text-sm">Back</button>
        </div>
      </div>
    );
  }

  if (gameState.status === "finished" && gameState.winner) {
    const winnerName = gameState.winner === "player1"
      ? gameState.players.player1?.displayName
      : gameState.players.player2?.displayName;
    return (
      <div className="screen-bg">
        <div className="text-center space-y-5 px-6">
          <div className="text-5xl">🏆</div>
          <div className="text-2xl font-black text-amber-400">{winnerName} wins!</div>
          <div className="theme-text-muted text-sm">This game has ended.</div>
          <button onClick={() => setLocation("/")} className="btn-gold px-6 py-3 text-sm">Watch Other Games</button>
        </div>
      </div>
    );
  }

  const p1 = gameState.players.player1;
  const p2 = gameState.players.player2;
  const p1Name = p1?.displayName || "Player 1";
  const p2Name = p2?.displayName || "Player 2";
  const p1Color = colorOf(gameState.pieceColors?.player1 || "orange");
  const p2Color = colorOf(gameState.pieceColors?.player2 || "pink");
  const board = normalizeBoard(gameState.board as Record<string, unknown>);
  const currentTurn = gameState.currentTurn;

  return (
    <div className="screen-bg overflow-hidden">
      <div className="game-container">
        <div className="px-3 pt-2 pb-1.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 theme-card p-2.5 flex items-center gap-2 rounded-2xl"
              style={{ opacity: currentTurn === "player1" ? 1 : 0.55, borderColor: currentTurn === "player1" ? `${p1Color}50` : undefined }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${p1Color}25`, border: `1.5px solid ${p1Color}60`, color: p1Color }}>
                {p1Name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold theme-text-primary truncate">{p1Name}</div>
                <div className="text-[10px] theme-text-muted">{gameState.orangePieces} pieces</div>
              </div>
              {currentTurn === "player1" && (
                <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p1Color }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
              )}
            </div>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Eye size={11} className="text-amber-400" />
                <span className="text-[10px] text-amber-400 font-bold">{spectatorCount}</span>
              </div>
              <div className="text-[9px] theme-text-muted">VS</div>
            </div>

            <div className="flex-1 theme-card p-2.5 flex items-center gap-2 flex-row-reverse rounded-2xl"
              style={{ opacity: currentTurn === "player2" ? 1 : 0.55, borderColor: currentTurn === "player2" ? `${p2Color}50` : undefined }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${p2Color}25`, border: `1.5px solid ${p2Color}60`, color: p2Color }}>
                {p2Name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-xs font-bold theme-text-primary truncate">{p2Name}</div>
                <div className="text-[10px] theme-text-muted">{gameState.pinkPieces} pieces</div>
              </div>
              {currentTurn === "player2" && (
                <motion.div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p2Color }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <div className="flex items-center gap-1.5">
              <Eye size={11} className="text-amber-400/70" />
              <span className="text-[10px] font-semibold text-amber-400/70">SPECTATING LIVE</span>
              <motion.div className="w-1.5 h-1.5 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            </div>
            <button onClick={() => setLocation("/")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold theme-text-muted theme-btn-secondary">
              <Home size={10} /> Exit
            </button>
          </div>
        </div>

        <div className="board-region">
          <GameBoard
            board={board}
            myKey={"player1" as PlayerKey}
            currentTurn={gameState.currentTurn}
            isMyTurn={false}
            firstMoveDone={gameState.firstMoveDone}
            inCombo={gameState.inCombo || false}
            comboFrom={gameState.comboFrom ?? null}
            onMove={() => {}}
            p1Color={p1Color}
            p2Color={p2Color}
          />
        </div>

        <div className="text-center pb-2 text-[10px] theme-text-muted font-mono tracking-widest">{roomCode}</div>
      </div>
    </div>
  );
}
