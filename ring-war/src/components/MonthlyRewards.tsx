import { useEffect, useState } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { db } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Crown, Lock, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { usePlayer } from "../contexts/PlayerContext";
import { SEASONAL_SKINS, RARITY_CONFIG, getSeasonInfo, getSkinForRank } from "../data/seasonalSkins";
import SeasonalFrame from "./SeasonalFrame";

interface Winner { uid: string; name: string; wins: number; rank: number }
interface MonthRecord { processed: boolean; winners: Winner[]; processedAt: number }

interface Props { onClose: () => void }

export default function MonthlyRewards({ onClose }: Props) {
  const { data, uid } = usePlayer();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [expandedSkin, setExpandedSkin] = useState<string | null>(null);

  const season = getSeasonInfo();
  const monthKey = season.key;

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const unsub = onValue(ref(db, `monthlyRewards/${monthKey}`), async (snap) => {
      if (snap.exists()) {
        setRecord(snap.val() as MonthRecord);
        setLoading(false);
        return;
      }
      const statsSnap = await get(ref(db!, "stats")).catch(() => null);
      if (!statsSnap?.exists()) { setLoading(false); return; }
      const stats = statsSnap.val() as Record<string, { name?: string; wins?: number }>;
      const sorted = Object.entries(stats)
        .map(([entryUid, v]) => ({ uid: entryUid, name: v.name || "Warrior", wins: v.wins || 0 }))
        .filter(e => e.wins > 0)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 50)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      if (sorted.length === 0) { setLoading(false); return; }
      const newRecord: MonthRecord = { processed: true, winners: sorted, processedAt: Date.now() };
      await update(ref(db!, `monthlyRewards/${monthKey}`), newRecord).catch(() => {});
      const prizes = [
        { coins: 2000, gems: 100 },
        { coins: 1000, gems: 50 },
        { coins: 500, gems: 25 },
      ];
      for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const w = sorted[i];
        const p = prizes[i];
        const playerSnap = await get(ref(db!, `players/${w.uid}`)).catch(() => null);
        const pd = playerSnap?.val() ?? { coins: 0, gems: 0 };
        await update(ref(db!, `players/${w.uid}`), { coins: (pd.coins || 0) + p.coins, gems: (pd.gems || 0) + p.gems }).catch(() => {});
      }
      setRecord(newRecord);
      setLoading(false);
    });
    return unsub;
  }, [monthKey]);

  async function claimReward() {
    if (!record || !uid || !db) return;
    const myEntry = record.winners.find(w => w.uid === uid);
    if (!myEntry) return;
    const skin = getSkinForRank(myEntry.rank);
    if (!skin) return;
    await update(ref(db, `players/${uid}`), {
      [`seasonSkin_${monthKey}`]: skin.id,
      [`seasonSkinExpiry_${monthKey}`]: season.endsAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    }).catch(() => {});
    setClaimed(true);
  }

  const myEntry = record?.winners.find(w => w.uid === uid);
  const mySkin = myEntry ? getSkinForRank(myEntry.rank) : null;
  const alreadyClaimed = data && (data as unknown as Record<string, unknown>)[`monthlyRewardClaimed_${monthKey}`] === true;

  const daysText = season.daysLeft === 0 ? "Ends today!" : season.daysLeft === 1 ? "1 day left" : `${season.daysLeft} days left`;
  const urgency = season.daysLeft <= 3;

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
          <Crown size={18} className="text-amber-400" />
          <div>
            <div className="font-black text-base theme-text-primary">{season.label} Rewards</div>
            <div className={`text-[11px] font-semibold ${urgency ? "text-red-400" : "theme-text-muted"}`}>{daysText}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl theme-btn-secondary">
          <X size={16} className="theme-text-muted" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-list">
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="flex items-center gap-3 p-4">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
              <Clock size={20} className={urgency ? "text-red-400" : "text-amber-400"} />
            </motion.div>
            <div className="flex-1">
              <div className="text-sm font-bold theme-text-primary">{season.label} ends in</div>
              <div className={`text-xl font-black ${urgency ? "text-red-400" : "text-amber-400"}`}>{daysText}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] theme-text-muted uppercase tracking-widest">Season</div>
              <div className="text-lg font-black shimmer-text">{season.seasonNumber}</div>
            </div>
          </div>
          <div className="mx-4 mb-4 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: urgency ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#f59e0b,#ef4444)" }}
              initial={{ width: 0 }}
              animate={{ width: `${((30 - season.daysLeft) / 30) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {myEntry && mySkin && (
          <div className="mx-4 mt-4 rounded-2xl p-4 space-y-3"
            style={{ background: mySkin.bgGradient, border: `1px solid ${mySkin.frameColor}30` }}>
            <div className="flex items-center gap-3">
              <SeasonalFrame skin={mySkin} name={myEntry.name} size="md" rank={myEntry.rank} showCrown={myEntry.rank === 1} />
              <div className="flex-1">
                <div className="text-xs theme-text-muted">Your Rank This Season</div>
                <div className="text-xl font-black" style={{ color: mySkin.frameColor }}>#{myEntry.rank}</div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={11} style={{ color: mySkin.frameColor }} />
                  <span className="text-xs font-bold" style={{ color: mySkin.frameColor }}>{mySkin.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: `${RARITY_CONFIG[mySkin.rarity].color}20`, color: RARITY_CONFIG[mySkin.rarity].color }}>
                    {RARITY_CONFIG[mySkin.rarity].label}
                  </span>
                </div>
              </div>
            </div>
            {!claimed && !alreadyClaimed ? (
              <button
                onClick={claimReward}
                className="w-full py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: `linear-gradient(135deg, ${mySkin.frameColor}, ${mySkin.glowColor})`, boxShadow: `0 4px 20px ${mySkin.frameColor}40` }}
              >
                Claim {mySkin.name} Skin
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl font-bold text-sm text-center"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                ✓ Claimed — {mySkin.name} Active
              </div>
            )}
          </div>
        )}

        {!myEntry && !loading && (
          <div className="mx-4 mt-4 theme-card p-4 rounded-2xl text-center space-y-2">
            <Lock size={24} className="theme-text-muted mx-auto" />
            <div className="text-sm font-semibold theme-text-primary">You're not ranked this season</div>
            <div className="text-xs theme-text-muted">Win games to climb the leaderboard and earn exclusive seasonal skins!</div>
          </div>
        )}

        <div className="px-4 mt-5">
          <div className="text-xs theme-text-muted uppercase tracking-widest font-semibold mb-3">This Season's Exclusive Skins</div>
          <div className="space-y-2">
            {SEASONAL_SKINS.filter(s => s.rarity !== "none").map((skin) => {
              const isExpanded = expandedSkin === skin.id;
              const rarityInfo = RARITY_CONFIG[skin.rarity];
              const rankLabel = skin.rankRange[0] === skin.rankRange[1]
                ? `Top ${skin.rankRange[0]}`
                : `Top ${skin.rankRange[0]}–${skin.rankRange[1]}`;

              return (
                <motion.div key={skin.id} layout className="rounded-2xl overflow-hidden"
                  style={{ background: skin.bgGradient, border: `1px solid ${skin.frameColor}25` }}>
                  <button className="w-full flex items-center gap-3 p-3.5"
                    onClick={() => setExpandedSkin(isExpanded ? null : skin.id)}>
                    <SeasonalFrame skin={skin} name={skin.name} size="sm" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black theme-text-primary">{skin.name}</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                          style={{ background: `${rarityInfo.color}20`, color: rarityInfo.color }}>
                          {rarityInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={10} className="theme-text-muted" />
                        <span className="text-[10px] theme-text-muted">30 days · {rankLabel}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="theme-text-muted flex-shrink-0" /> : <ChevronDown size={14} className="theme-text-muted flex-shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3">
                          <div className="h-px" style={{ background: `${skin.frameColor}20` }} />
                          <div className="text-xs theme-text-muted italic">"{skin.description}"</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {skin.effects.map(e => (
                              <div key={e} className="flex items-center gap-1.5 text-[11px]" style={{ color: skin.accentColor }}>
                                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: skin.accentColor }} />
                                {e}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-xl p-2 text-center text-[10px]" style={{ background: "rgba(0,0,0,0.2)", color: skin.accentColor }}>
                              <div className="font-bold">Trail</div>
                              <div className="theme-text-muted">{skin.trailLabel}</div>
                            </div>
                            <div className="flex-1 rounded-xl p-2 text-center text-[10px]" style={{ background: "rgba(0,0,0,0.2)", color: skin.accentColor }}>
                              <div className="font-bold">Win FX</div>
                              <div className="theme-text-muted">{skin.winEffectLabel}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", color: skin.frameColor }}>
                            <Lock size={9} />
                            <span>Season Exclusive · Expires in {season.daysLeft} days</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="text-xs theme-text-muted uppercase tracking-widest font-semibold mb-2.5">Top 11–50 Ranked Skins</div>
            <div className="grid grid-cols-2 gap-2">
              {SEASONAL_SKINS.filter(s => s.rarity === "none").map(skin => (
                <div key={skin.id} className="rounded-2xl p-3 flex items-center gap-2.5"
                  style={{ background: skin.bgGradient, border: `1px solid ${skin.frameColor}20` }}>
                  <span className="text-xl">{skin.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold theme-text-primary truncate">{skin.name}</div>
                    <div className="text-[9px] theme-text-muted">Rank {skin.rankRange[0]}–{skin.rankRange[1]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {record && record.winners.length > 0 && (
          <div className="px-4 mt-5 pb-6">
            <div className="text-xs theme-text-muted uppercase tracking-widest font-semibold mb-3">Current Season Leaders</div>
            <div className="space-y-2">
              {record.winners.slice(0, 10).map((w) => {
                const skin = getSkinForRank(w.rank);
                const rarityInfo = skin ? RARITY_CONFIG[skin.rarity] : RARITY_CONFIG.none;
                return (
                  <div key={w.uid} className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ background: "var(--bg-card-inner)", border: `1px solid ${w.rank <= 3 ? rarityInfo.glow : "var(--border-color)"}` }}>
                    <SeasonalFrame skin={skin} name={w.name} size="sm" rank={w.rank} showCrown={w.rank === 1} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold theme-text-primary truncate">{w.name}</div>
                      {skin && <div className="text-[10px] font-semibold" style={{ color: skin.frameColor }}>{skin.name}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black theme-text-primary">{w.wins}W</div>
                      <div className="text-[10px] theme-text-muted">#{w.rank}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
