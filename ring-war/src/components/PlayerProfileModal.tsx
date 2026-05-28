import { useEffect, useState } from "react";
import { ref, onValue, push, remove } from "firebase/database";
import { db } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, UserMinus, Gamepad2, Trophy, Target, Zap, Swords } from "lucide-react";
import { getLeagueInfo } from "../contexts/PlayerContext";
import RankBadge from "./RankBadge";

interface PData {
  name: string;
  avatar: string;
  profilePhoto: string;
  bannerPhoto: string;
  bio: string;
}

interface SData {
  wins: number;
  losses: number;
  kills: number;
  winStreak: number;
}

interface Props {
  viewedUid: string;
  myUid: string;
  myName: string;
  onClose: () => void;
  onInvite?: () => void;
}

export default function PlayerProfileModal({ viewedUid, myUid, myName, onClose, onInvite }: Props) {
  const [pdata, setPdata]         = useState<PData | null>(null);
  const [sdata, setSdata]         = useState<SData | null>(null);
  const [isFriend, setIsFriend]   = useState(false);
  const [reqSent, setReqSent]     = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    const u1 = onValue(ref(db, `players/${viewedUid}`), (snap) => {
      const d = snap.exists() ? snap.val() : {};
      setPdata({
        name:         d.name         || "Warrior",
        avatar:       d.avatar       || "",
        profilePhoto: d.profilePhoto || "",
        bannerPhoto:  d.bannerPhoto  || "",
        bio:          d.bio          || "",
      });
      setLoading(false);
    });
    const u2 = onValue(ref(db, `stats/${viewedUid}`), (snap) => {
      const d = snap.exists() ? snap.val() : {};
      setSdata({ wins: d.wins || 0, losses: d.losses || 0, kills: d.kills || 0, winStreak: d.winStreak || 0 });
    });
    const u3 = onValue(ref(db, `friends/${myUid}/${viewedUid}`), (snap) => setIsFriend(snap.exists()));
    return () => { u1(); u2(); u3(); };
  }, [viewedUid, myUid]);

  async function addFriend() {
    if (!db || reqSent) return;
    await push(ref(db, `friendRequests/${viewedUid}`), {
      fromUid: myUid, fromName: myName || "Warrior", at: Date.now(),
    }).catch(() => {});
    setReqSent(true);
  }

  async function removeFriend() {
    if (!db) return;
    await Promise.all([
      remove(ref(db, `friends/${myUid}/${viewedUid}`)),
      remove(ref(db, `friends/${viewedUid}/${myUid}`)),
    ]).catch(() => {});
  }

  const displayName = pdata?.name || "Warrior";
  const wins        = sdata?.wins ?? 0;
  const losses      = sdata?.losses ?? 0;
  const kills       = sdata?.kills ?? 0;
  const streak      = sdata?.winStreak ?? 0;
  const totalGames  = wins + losses;
  const winPct      = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const league      = getLeagueInfo(wins);
  const isOwn       = viewedUid === myUid;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: "var(--bg-primary)", maxHeight: "90dvh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="relative h-44 overflow-hidden flex-shrink-0">
          {loading ? (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#0f0a1a,#1a1040)" }} />
          ) : pdata?.bannerPhoto ? (
            <img src={pdata.bannerPhoto} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full relative overflow-hidden" style={{
              background: `linear-gradient(135deg,${league.color}35 0%,rgba(0,0,0,0.7) 100%),linear-gradient(160deg,#0a0f20,#12083a)`,
            }}>
              <motion.div className="absolute inset-0"
                animate={{ x: ["-100%","100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ background: `linear-gradient(90deg,transparent,${league.color}25,transparent)` }} />
            </div>
          )}
          {/* drag handle */}
          <div className="absolute top-2.5 left-1/2 w-10 h-1 rounded-full bg-white/30"
            style={{ transform: "translateX(-50%)" }} />
          <button onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="px-5 pb-8">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-14 mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 flex-shrink-0"
                style={{ borderColor: "var(--bg-primary)", background: `${league.color}25` }}>
                {loading ? (
                  <div className="w-full h-full animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
                ) : pdata?.profilePhoto ? (
                  <img src={pdata.profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-4xl"
                    style={{ color: league.color }}>
                    {pdata?.avatar || displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -top-1 -right-1">
                <RankBadge league={league} size="md" animated />
              </div>
            </div>

            {/* Action buttons */}
            {!isOwn && !loading && (
              <div className="flex gap-2 pb-2">
                {isFriend ? (
                  <button onClick={removeFriend}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    <UserMinus size={12} /> Friends
                  </button>
                ) : (
                  <button onClick={addFriend} disabled={reqSent}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{
                      background: reqSent ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.15)",
                      border: `1px solid ${reqSent ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                      color: reqSent ? "#22c55e" : "#f59e0b",
                    }}>
                    <UserPlus size={12} />
                    {reqSent ? "Sent!" : "Add Friend"}
                  </button>
                )}
                {onInvite && (
                  <button onClick={onInvite}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                    <Gamepad2 size={12} /> Invite
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Name & handle */}
          {loading ? (
            <div className="space-y-2 mb-4">
              <div className="h-7 w-36 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="h-4 w-24 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
          ) : (
            <>
              <div className="text-2xl font-black theme-text-primary leading-tight">{displayName}</div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-3">
                <span className="text-xs theme-text-muted">@{displayName.toLowerCase().replace(/\s+/g,"")}</span>
                <span className="text-xs font-bold" style={{ color: league.color }}>
                  {league.icon} {league.leagueLabel}
                </span>
              </div>
              {pdata?.bio ? (
                <p className="text-sm theme-text-secondary leading-relaxed mb-4">{pdata.bio}</p>
              ) : null}
            </>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: "Wins",   value: wins,         icon: <Trophy size={14}/>,  color: "#f59e0b" },
              { label: "Losses", value: losses,        icon: <X size={14}/>,       color: "#ef4444" },
              { label: "Win%",   value: `${winPct}%`, icon: <Target size={14}/>,  color: "#22c55e" },
              { label: "Streak", value: streak,        icon: <Zap size={14}/>,     color: "#06b6d4" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 flex flex-col items-center gap-1"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div className="text-base font-black theme-text-primary leading-none">
                  {loading ? "—" : s.value}
                </div>
                <div className="text-[10px] theme-text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Kills badge */}
          {kills > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-4"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <Swords size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-sm font-bold text-red-400">{kills} Total Kills</span>
            </div>
          )}

          {/* Player ID */}
          <div className="text-[10px] theme-text-muted text-center font-mono opacity-40">
            RING WAR · {viewedUid.replace("offline-","").slice(0,12).toUpperCase()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
