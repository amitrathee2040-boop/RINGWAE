import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { Eye, Swords, X } from "lucide-react";
import { motion } from "framer-motion";
import { GameState } from "../types";

interface ActiveRoom {
  code: string;
  p1Name: string;
  p2Name: string;
  p1Pieces: number;
  p2Pieces: number;
  spectators: number;
  startedAt: number;
  currentTurn: string;
}

interface Props {
  onSpectate: (code: string) => void;
  onClose: () => void;
}

export default function ActiveGames({ onSpectate, onClose }: Props) {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsub = onValue(ref(db, "rooms"), (snap) => {
      setLoading(false);
      if (!snap.exists()) { setRooms([]); return; }
      const data = snap.val() as Record<string, GameState & { spectators?: Record<string, unknown> }>;
      const active: ActiveRoom[] = [];
      Object.entries(data).forEach(([code, room]) => {
        if (room.status !== "playing") return;
        if (!room.players.player1 || !room.players.player2) return;
        active.push({
          code,
          p1Name: room.players.player1.displayName || "Player 1",
          p2Name: room.players.player2.displayName || "Player 2",
          p1Pieces: room.orangePieces || 0,
          p2Pieces: room.pinkPieces || 0,
          spectators: room.spectators ? Object.keys(room.spectators).length : 0,
          startedAt: room.startedAt || room.createdAt || Date.now(),
          currentTurn: room.currentTurn,
        });
      });
      setRooms(active.sort((a, b) => b.spectators - a.spectators));
    });
    return unsub;
  }, []);

  function elapsed(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
        <div className="flex items-center gap-2.5">
          <Eye size={18} className="text-amber-400" />
          <span className="font-black text-lg theme-text-primary">Watch Live Games</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl theme-btn-secondary">
          <X size={16} className="theme-text-muted" />
        </button>
      </div>

      <div className="flex-1 scroll-list px-4 py-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center pt-20">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 animate-spin" />
          </div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 gap-4">
            <div className="text-5xl">🎮</div>
            <div className="theme-text-muted text-sm text-center">No active games right now.<br />Start one to be the first!</div>
          </div>
        )}

        {rooms.map((room, i) => (
          <motion.div
            key={room.code}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="theme-card p-4 rounded-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold theme-text-primary truncate">{room.p1Name}</div>
                <div className="text-xs text-amber-400">{room.p1Pieces} pieces</div>
              </div>
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                <Swords size={14} className="text-red-400" />
                <span className="text-[9px] theme-text-muted font-bold">VS</span>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-sm font-bold theme-text-primary truncate">{room.p2Name}</div>
                <div className="text-xs text-pink-400">{room.p2Pieces} pieces</div>
              </div>
            </div>

            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(room.p1Pieces / (room.p1Pieces + room.p2Pieces || 1)) * 100}%`,
                  background: "linear-gradient(90deg, #f97316, #ec4899)",
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Eye size={11} className="theme-text-muted" />
                  <span className="text-[10px] theme-text-muted">{room.spectators} watching</span>
                </div>
                <div className="text-[10px] theme-text-muted">⏱ {elapsed(room.startedAt)}</div>
              </div>
              <button
                onClick={() => onSpectate(room.code)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                <Eye size={11} /> Watch
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
