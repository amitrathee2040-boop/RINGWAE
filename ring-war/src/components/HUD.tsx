import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, LogOut } from "lucide-react";
import { PlayerKey, GameState } from "../types";
import { colorOf } from "../game/colors";

interface Props {
  gameState: GameState;
  myKey: PlayerKey;
  uid: string;
  onSurrender: () => void;
  onExit: () => void;
  isSpectator?: boolean;
  onViewProfile?: (uid: string) => void;
}

export default function HUD({
  gameState, myKey, uid: _uid, onSurrender, onExit, isSpectator, onViewProfile,
}: Props) {
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [confirmExit, setConfirmExit]           = useState(false);

  const p1 = gameState.players.player1;
  const p2 = gameState.players.player2;
  const p1Name = p1?.displayName ?? "Player 1";
  const p2Name = p2?.displayName ?? "Player 2";
  const p1Color = colorOf(gameState.pieceColors?.player1 ?? "orange");
  const p2Color = colorOf(gameState.pieceColors?.player2 ?? "pink");

  const isMyTurn  = gameState.currentTurn === myKey;
  const myPieces  = myKey === "player1" ? gameState.orangePieces : gameState.pinkPieces;
  const oppPieces = myKey === "player1" ? gameState.pinkPieces   : gameState.orangePieces;
  const myColor   = myKey === "player1" ? p1Color : p2Color;
  const oppColor  = myKey === "player1" ? p2Color : p1Color;
  const myName    = myKey === "player1" ? p1Name  : p2Name;
  const oppName   = myKey === "player1" ? p2Name  : p1Name;
  const oppKey: PlayerKey = myKey === "player1" ? "player2" : "player1";

  const myPlayer  = myKey  === "player1" ? p1 : p2;
  const oppPlayer = oppKey === "player1" ? p1 : p2;

  return (
    <div className="hud-outer w-full px-3 pt-2 pb-1.5 flex flex-col gap-0">

      {/* ── Player row ── */}
      <div className="hud-player-row flex items-center gap-2">

        {/* Opponent card */}
        <div
          className="hud-player-card flex-1 premium-card p-2 flex items-center gap-2 min-w-0"
          style={{
            opacity: isMyTurn ? 0.6 : 1,
            transition: "opacity 0.3s",
            borderColor: !isMyTurn ? `${oppColor}40` : undefined,
            boxShadow:   !isMyTurn ? `0 0 12px ${oppColor}18` : undefined,
          }}
        >
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
              style={{ background: `${oppColor}25`, border: `1.5px solid ${oppColor}60`, color: oppColor, cursor: onViewProfile && oppPlayer?.uid ? "pointer" : "default" }}
              onClick={() => oppPlayer?.uid && onViewProfile?.(oppPlayer.uid)}
            >
              {oppPlayer?.profilePhoto
                ? <img src={oppPlayer.profilePhoto} alt="" className="w-full h-full object-cover" />
                : (oppPlayer?.avatar || oppName.charAt(0).toUpperCase())}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate leading-tight">{oppName}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: oppColor }} />
              <span className="text-[11px] text-white/40">{oppPieces}</span>
              {gameState.currentTurn === oppKey && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: oppColor }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Center controls */}
        <div className="hud-center-col flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              color:      isMyTurn ? "#f59e0b" : "rgba(255,255,255,0.25)",
              background: isMyTurn ? "rgba(245,158,11,0.12)" : "transparent",
              border:     isMyTurn ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
            }}
          >
            {isMyTurn ? "Your Turn" : "Waiting"}
          </div>
          <div className="flex gap-1">
            {isSpectator ? (
              <div className="px-2 py-1 rounded-lg text-[9px] font-black tracking-widest flex items-center gap-1"
                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
                👁 SPECTATING
              </div>
            ) : (
              <>
                <button
                  onClick={() => setConfirmSurrender(true)}
                  className="hud-icon-btn"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
                  title="Give Up"
                >
                  <Flag size={15} className="text-red-400/70" />
                </button>
              </>
            )}

            <button
              onClick={() => setConfirmExit(true)}
              className="hud-icon-btn"
              style={{ background: "rgba(100,120,180,0.08)", border: "1px solid rgba(100,120,180,0.18)" }}
              title="Exit Game"
            >
              <LogOut size={15} className="text-blue-300/60" />
            </button>
          </div>
        </div>

        {/* My card */}
        <div
          className="hud-player-card flex-1 premium-card p-2 flex items-center gap-2 flex-row-reverse min-w-0"
          style={{
            opacity: isMyTurn ? 1 : 0.6,
            transition: "opacity 0.3s",
            borderColor: isMyTurn ? `${myColor}40` : undefined,
            boxShadow:   isMyTurn ? `0 0 12px ${myColor}18` : undefined,
          }}
        >
          <div className="relative flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
              style={{ background: `${myColor}25`, border: `1.5px solid ${myColor}60`, color: myColor, cursor: onViewProfile && myPlayer?.uid ? "pointer" : "default" }}
              onClick={() => myPlayer?.uid && onViewProfile?.(myPlayer.uid)}
            >
              {myPlayer?.profilePhoto
                ? <img src={myPlayer.profilePhoto} alt="" className="w-full h-full object-cover" />
                : (myPlayer?.avatar || myName.charAt(0).toUpperCase())}
            </div>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs font-semibold text-white truncate leading-tight">{myName}</div>
            <div className="flex items-center gap-1.5 justify-end">
              {isMyTurn && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: myColor }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
              <span className="text-[11px] text-white/40">{myPieces}</span>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: myColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Surrender confirm ── */}
      {confirmSurrender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={() => setConfirmSurrender(false)}>
          <div className="premium-card p-5 w-full max-w-xs space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-white text-center">Give up this match?</p>
            <p className="text-white/40 text-xs text-center">Your opponent will win.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSurrender(false)} className="btn-secondary flex-1 py-3 text-sm">Cancel</button>
              <button onClick={() => { setConfirmSurrender(false); onSurrender(); }}
                className="flex-1 py-3 text-sm font-semibold rounded-xl text-white"
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", minHeight: 44 }}>Give Up</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exit confirm ── */}
      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={() => setConfirmExit(false)}>
          <div className="premium-card p-5 w-full max-w-xs space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-white text-center">Exit game?</p>
            <p className="text-white/40 text-xs text-center">You'll leave the match and go back to the lobby.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExit(false)} className="btn-secondary flex-1 py-3 text-sm">Stay</button>
              <button onClick={() => { setConfirmExit(false); onExit(); }}
                className="flex-1 py-3 text-sm font-semibold rounded-xl text-white"
                style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", minHeight: 44 }}>Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
