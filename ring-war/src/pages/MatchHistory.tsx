import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Skull, Swords, Wifi, WifiOff } from "lucide-react";
import { usePlayer, MatchRecord } from "../contexts/PlayerContext";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function MatchCard({ record, index }: { record: MatchRecord; index: number }) {
  const isWin = record.result === "win";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: isWin
          ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(34,197,94,0.06))"
          : "linear-gradient(135deg, rgba(239,68,68,0.07), rgba(100,116,139,0.06))",
        border: `1px solid ${isWin ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.15)"}`,
      }}
    >
      <div className="flex items-center gap-3 p-3.5">
        {/* Result badge */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
          style={{
            background: isWin
              ? "linear-gradient(135deg, #f59e0b, #22c55e)"
              : "linear-gradient(135deg, #ef4444, #6b7280)",
            boxShadow: isWin ? "0 0 14px rgba(245,158,11,0.35)" : "0 0 10px rgba(239,68,68,0.2)",
          }}
        >
          {isWin ? <Trophy size={18} className="text-white" /> : <Skull size={18} className="text-white" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-black"
              style={{ color: isWin ? "#f59e0b" : "#ef4444" }}
            >
              {isWin ? "Victory" : "Defeat"}
            </span>
            {record.surrendered && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
                SURRENDER
              </span>
            )}
            <span className="flex items-center gap-1 text-[9px] theme-text-muted ml-auto">
              {record.gameMode === "online"
                ? <Wifi size={9} />
                : <WifiOff size={9} />}
              {record.gameMode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <Swords size={10} className="theme-text-muted flex-shrink-0" />
            <span className="text-xs theme-text-muted truncate">vs {record.opponentName}</span>
          </div>

          <div className="text-[10px] theme-text-muted mt-0.5 opacity-60">
            {formatDate(record.playedAt)} · {timeAgo(record.playedAt)}
          </div>
        </div>

        {/* Rewards */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-amber-400">+{record.coinsEarned}</span>
            <span className="text-xs">🪙</span>
          </div>
          {record.gemsEarned > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-cyan-400">+{record.gemsEarned}</span>
              <span className="text-xs">💎</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MatchHistory() {
  const [, setLocation] = useLocation();
  const { data } = usePlayer();

  const history = data?.matchHistory ?? [];
  const wins   = history.filter(m => m.result === "win").length;
  const losses = history.filter(m => m.result === "loss").length;
  const totalCoins = history.reduce((s, m) => s + m.coinsEarned, 0);
  const totalGems  = history.reduce((s, m) => s + m.gemsEarned, 0);
  const winRate    = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;

  return (
    <div className="screen-bg flex flex-col" style={{ minHeight: "100dvh" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-card)" }}
      >
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-xl theme-btn-secondary"
        >
          <ArrowLeft size={18} className="theme-text-muted" />
        </button>
        <div>
          <div className="font-black text-base theme-text-primary">Match History</div>
          <div className="text-xs theme-text-muted">{history.length} match{history.length !== 1 ? "es" : ""} recorded</div>
        </div>
      </div>

      {/* Summary stats */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 rounded-2xl flex gap-2 flex-shrink-0"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
        >
          <div className="flex-1 text-center">
            <div className="text-xl font-black text-amber-400">{winRate}%</div>
            <div className="text-[10px] theme-text-muted font-semibold uppercase tracking-wide">Win Rate</div>
          </div>
          <div className="w-px" style={{ background: "var(--border-color)" }} />
          <div className="flex-1 text-center">
            <div className="text-xl font-black text-green-400">{wins}</div>
            <div className="text-[10px] theme-text-muted font-semibold uppercase tracking-wide">Wins</div>
          </div>
          <div className="w-px" style={{ background: "var(--border-color)" }} />
          <div className="flex-1 text-center">
            <div className="text-xl font-black text-red-400">{losses}</div>
            <div className="text-[10px] theme-text-muted font-semibold uppercase tracking-wide">Losses</div>
          </div>
          <div className="w-px" style={{ background: "var(--border-color)" }} />
          <div className="flex-1 text-center">
            <div className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
              {totalCoins.toLocaleString()}<span className="text-sm">🪙</span>
            </div>
            {totalGems > 0 && (
              <div className="text-xs font-bold text-cyan-400 flex items-center justify-center gap-1">
                +{totalGems}<span>💎</span>
              </div>
            )}
            <div className="text-[10px] theme-text-muted font-semibold uppercase tracking-wide">Earned</div>
          </div>
        </motion.div>
      )}

      {/* Match list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 mt-4 space-y-2.5">
        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-4 pt-24 text-center"
          >
            <div className="text-5xl">🎮</div>
            <div className="theme-text-primary font-bold text-lg">No matches yet</div>
            <div className="theme-text-muted text-sm max-w-xs">
              Play your first game and your match history will appear here.
            </div>
            <button
              onClick={() => setLocation("/")}
              className="btn-gold px-8 py-3 text-sm font-semibold mt-2"
            >
              Play Now
            </button>
          </motion.div>
        ) : (
          history.map((record, i) => (
            <MatchCard key={record.id} record={record} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
