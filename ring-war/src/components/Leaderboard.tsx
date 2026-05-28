import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { X, Trophy, Flame, Swords, Crown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLeagueInfo } from "../contexts/PlayerContext";
import RankBadge from "./RankBadge";
import SeasonalFrame from "./SeasonalFrame";
import { getSkinForRank, RARITY_CONFIG } from "../data/seasonalSkins";
import PlayerProfileModal from "./PlayerProfileModal";

interface StatEntry {
  uid: string;
  name: string;
  wins: number;
  losses: number;
  kills: number;
  winStreak: number;
  bestStreak: number;
  xp: number;
}

const TABS = ["wins", "kills", "streak"] as const;
type Tab = typeof TABS[number];

interface Props { uid: string; onClose: () => void; }

export default function Leaderboard({ uid, onClose }: Props) {
  const [entries, setEntries] = useState<StatEntry[]>([]);
  const [tab, setTab] = useState<Tab>("wins");
  const [loading, setLoading] = useState(true);
  const [viewingUid, setViewingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsub = onValue(ref(db, "stats"), (snap) => {
      setLoading(false);
      if (!snap.exists()) { setEntries([]); return; }
      const data = snap.val() as Record<string, StatEntry & { uid?: string }>;
      const list: StatEntry[] = Object.entries(data).map(([id, v]) => ({
        uid: id, name: v.name || "Warrior",
        wins: v.wins || 0, losses: v.losses || 0,
        kills: v.kills || 0, winStreak: v.winStreak || 0,
        bestStreak: v.bestStreak || 0, xp: v.xp || 0,
      }));
      setEntries(list);
    });
    return unsub;
  }, []);

  const sorted = [...entries].sort((a, b) => {
    if (tab === "kills") return b.kills - a.kills;
    if (tab === "streak") return b.bestStreak - a.bestStreak;
    return b.wins - a.wins;
  }).slice(0, 50);

  const tabIcons: Record<Tab, React.ReactNode> = {
    wins:   <Trophy size={13} />,
    kills:  <Swords size={13} />,
    streak: <Flame size={13} />,
  };

  const getVal = (e: StatEntry) => {
    if (tab === "kills") return `${e.kills}`;
    if (tab === "streak") return `${e.bestStreak}`;
    return `${e.wins}`;
  };
  const getUnit = () => {
    if (tab === "kills") return "kills";
    if (tab === "streak") return "streak";
    return "wins";
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg-primary)" }}>

      <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
        <div className="flex items-center gap-2.5">
          <Trophy size={18} className="text-amber-400" />
          <span className="font-black text-lg theme-text-primary">Leaderboard</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl theme-btn-secondary">
          <X size={16} className="theme-text-muted" />
        </button>
      </div>


      <div className="flex px-4 pt-3 pb-2 gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: tab === t ? "rgba(245,158,11,0.15)" : "var(--bg-card-inner)",
              color: tab === t ? "#f59e0b" : "var(--text-muted)",
              border: `1px solid ${tab === t ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
              minHeight: 36,
            }}
          >
            {tabIcons[t]}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {!loading && sorted.length >= 3 && (
        <div className="flex items-end justify-center gap-2 px-4 pb-2">
          {[sorted[1], sorted[0], sorted[2]].map((entry, i) => {
            const podiumRank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const skin = getSkinForRank(podiumRank);
            const medals = ["🥈", "🥇", "🥉"];
            const heights = ["h-20", "h-24", "h-16"];
            const rarityInfo = skin ? RARITY_CONFIG[skin.rarity] : RARITY_CONFIG.none;
            const isFirst = i === 1;

            return (
              <motion.div
                key={entry.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex-1 flex flex-col items-center gap-1.5 rounded-2xl py-2.5 px-1 justify-end ${heights[i]}`}
                style={{
                  background: skin ? skin.bgGradient : "var(--bg-card-inner)",
                  border: `1px solid ${isFirst ? "rgba(245,158,11,0.35)" : rarityInfo.glow}`,
                  boxShadow: isFirst ? `0 0 24px ${rarityInfo.glow}` : undefined,
                }}
              >
                <span className="text-lg">{medals[i]}</span>
                <SeasonalFrame skin={skin} name={entry.name} size="sm" rank={podiumRank} showCrown={podiumRank === 1} />
                <div className="text-[9px] theme-text-secondary font-semibold truncate w-full text-center px-1">{entry.name}</div>
                <div className="text-xs font-black theme-text-primary">{getVal(entry)}<span className="text-[9px] theme-text-muted font-normal ml-0.5">{getUnit()}</span></div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex-1 scroll-list px-4 pb-6 space-y-1.5">
        {loading && (
          <div className="flex items-center justify-center pt-16">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 animate-spin" />
          </div>
        )}
        {!loading && sorted.length === 0 && (
          <div className="text-center theme-text-muted text-sm pt-16">No players yet. Play your first match!</div>
        )}
        {sorted.map((entry, index) => {
          const rank = index + 1;
          const leagueInfo = getLeagueInfo(entry.wins);
          const isMe = entry.uid === uid;
          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
          const skin = getSkinForRank(rank);
          const rarityInfo = skin ? RARITY_CONFIG[skin.rarity] : RARITY_CONFIG.none;

          return (
            <motion.div
              key={entry.uid}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.5) }}
              onClick={() => setViewingUid(entry.uid)}
              className="flex items-center gap-3 p-3 rounded-2xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: isMe
                  ? "rgba(245,158,11,0.08)"
                  : skin && rank <= 5
                    ? skin.bgGradient
                    : "var(--bg-card-inner)",
                border: `1px solid ${isMe ? "rgba(245,158,11,0.3)" : skin && rank <= 10 ? `${skin.frameColor}25` : "var(--border-color)"}`,
                boxShadow: rank <= 3 ? `0 2px 12px ${rarityInfo.glow}` : undefined,
              }}
            >
              <div className="w-7 text-center flex-shrink-0">
                {medal ? <span className="text-base">{medal}</span> : <span className="text-xs theme-text-muted font-bold">{rank}</span>}
              </div>

              <SeasonalFrame skin={skin} name={entry.name} size="sm" rank={rank} showCrown={rank === 1} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold theme-text-primary truncate">{entry.name}</span>
                  {isMe && (
                    <span className="text-[9px] text-amber-400 font-bold px-1.5 py-0.5 rounded-md bg-amber-400/10 flex-shrink-0">you</span>
                  )}
                  {rank === 1 && !isMe && (
                    <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>👑</motion.span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <RankBadge league={leagueInfo} size="sm" />
                  <span className="text-[9px]" style={{ color: leagueInfo.color }}>{leagueInfo.leagueLabel}</span>
                  {skin && skin.rarity !== "none" && (
                    <>
                      <span className="text-[9px] theme-text-muted">·</span>
                      <span className="text-[9px] font-bold" style={{ color: skin.frameColor }}>{skin.name}</span>
                      <span className="text-[8px] font-black px-1 py-px rounded"
                        style={{ background: `${rarityInfo.color}20`, color: rarityInfo.color }}>
                        {rarityInfo.label}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-base font-black" style={{ color: skin ? skin.frameColor : "var(--text-primary)" }}>
                  {getVal(entry)}
                </div>
                <div className="text-[10px] theme-text-muted uppercase">{getUnit()}</div>
                <div className="text-[9px] theme-text-muted">{entry.wins}W {entry.losses}L</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>

    <AnimatePresence>
      {viewingUid && (
        <PlayerProfileModal
          viewedUid={viewingUid}
          myUid={uid}
          myName=""
          onClose={() => setViewingUid(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
