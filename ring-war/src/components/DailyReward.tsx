import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { usePlayer, DailyReward as DR } from "../contexts/PlayerContext";

const STREAK_REWARDS = [
  { day: 1, coins: 100, gems: 0 },
  { day: 2, coins: 150, gems: 0 },
  { day: 3, coins: 200, gems: 5 },
  { day: 4, coins: 200, gems: 0 },
  { day: 5, coins: 300, gems: 0 },
  { day: 6, coins: 300, gems: 10 },
  { day: 7, coins: 500, gems: 20 },
];

interface Props { onClose: () => void; }

export default function DailyReward({ onClose }: Props) {
  const { claimDailyReward, data, dailyAvailable } = usePlayer();
  const [claimed, setClaimed] = useState<DR | null>(null);
  const [claiming, setClaiming] = useState(false);

  const currentDay = ((data?.loginStreak ?? 0) % 7) + 1;

  function handleClaim() {
    if (claiming || !dailyAvailable) return;
    setClaiming(true);
    const reward = claimDailyReward();
    setTimeout(() => {
      setClaimed(reward);
      setClaiming(false);
    }, 400);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="theme-card w-full max-w-sm rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative p-5 text-center"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.1))" }}>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg theme-btn-secondary">
            <X size={14} className="theme-text-muted" />
          </button>
          <div className="text-3xl mb-1">🎁</div>
          <div className="font-black text-xl theme-text-primary">Daily Reward</div>
          <div className="text-xs theme-text-muted mt-0.5">Day {currentDay} of 7 · Streak: {data?.loginStreak ?? 0}</div>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-7 gap-1">
            {STREAK_REWARDS.map((r, i) => {
              const dayNum = i + 1;
              const isPast = (data?.loginStreak ?? 0) % 7 > i;
              const isToday = currentDay === dayNum;
              return (
                <div
                  key={dayNum}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-0.5"
                  style={{
                    background: isToday ? "rgba(245,158,11,0.2)" : isPast ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isToday ? "rgba(245,158,11,0.4)" : isPast ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <span className="text-[10px] theme-text-muted font-medium">D{dayNum}</span>
                  <span className="text-xs">{isPast ? "✅" : r.gems > 0 ? "💎" : "🪙"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="rounded-xl p-4 flex items-center justify-center gap-6"
            style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">🪙</span>
              <span className="text-lg font-black text-amber-400">+{STREAK_REWARDS[(currentDay - 1) % 7].coins}</span>
              <span className="text-[10px] theme-text-muted">Coins</span>
            </div>
            {STREAK_REWARDS[(currentDay - 1) % 7].gems > 0 && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">💎</span>
                <span className="text-lg font-black text-cyan-400">+{STREAK_REWARDS[(currentDay - 1) % 7].gems}</span>
                <span className="text-[10px] theme-text-muted">Gems</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-5 pt-1">
          <AnimatePresence mode="wait">
            {claimed ? (
              <motion.div
                key="claimed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 py-3"
              >
                <div className="text-2xl">✅</div>
                <div className="font-bold theme-text-secondary text-sm">Reward Claimed!</div>
                <button onClick={onClose} className="btn-gold px-6 py-2.5 text-sm mt-1">Continue</button>
              </motion.div>
            ) : (
              <motion.button
                key="claim"
                onClick={handleClaim}
                disabled={!dailyAvailable || claiming}
                className="btn-gold w-full py-3.5 font-bold text-base disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                {claiming ? "Claiming..." : dailyAvailable ? "🎁 Claim Daily Reward" : "✅ Already Claimed Today"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
