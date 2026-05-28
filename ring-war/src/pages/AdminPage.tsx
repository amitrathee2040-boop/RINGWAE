import { useState, useEffect, useRef } from "react";
import { ref, onValue, update, remove, get } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Users, Gamepad2, Trophy, RefreshCw,
  LogOut, Search, ChevronDown, ChevronUp, AlertTriangle,
  Trash2, X, Wifi, WifiOff,
} from "lucide-react";
import { db, hasFirebaseConfig } from "../firebase";
import { getLeagueInfo, PlayerData } from "../contexts/PlayerContext";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "ringwar2024";

interface PlayerRow extends Partial<PlayerData> { uid: string }
interface RoomRow {
  code: string;
  player1?: { displayName?: string; uid?: string };
  player2?: { displayName?: string; uid?: string };
  status?: string;
  currentTurn?: string;
  orangePieces?: number;
  pinkPieces?: number;
  createdAt?: number;
}
interface Stats { totalPlayers: number; onlinePlayers: number; activeRooms: number; totalWins: number }
type Tab = "overview" | "players" | "rooms";

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="theme-card rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black theme-text-primary">{value}</div>
        <div className="text-xs theme-text-muted font-medium">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [wrongPw, setWrongPw] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPlayers: 0, onlinePlayers: 0, activeRooms: 0, totalWins: 0 });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof PlayerRow>("wins");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [giveCoins, setGiveCoins] = useState("");
  const [giveGems, setGiveGems] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlineUids, setOnlineUids] = useState<Set<string>>(new Set());
  const unsubs = useRef<(() => void)[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) { setAuthed(true); }
    else { setWrongPw(true); setTimeout(() => setWrongPw(false), 1500); }
  }

  useEffect(() => {
    if (!authed || !db) return;
    setLoading(true);
    const u1 = onValue(ref(db, "players"), (snap) => {
      const rows: PlayerRow[] = [];
      let totalWins = 0;
      snap.forEach(child => { const d = child.val() as Partial<PlayerData>; rows.push({ uid: child.key!, ...d }); totalWins += d.wins ?? 0; });
      setPlayers(rows);
      setStats(s => ({ ...s, totalPlayers: rows.length, totalWins }));
      setLoading(false);
    });
    const u2 = onValue(ref(db, "rooms"), (snap) => {
      const rows: RoomRow[] = [];
      snap.forEach(child => { rows.push({ code: child.key!, ...child.val() }); });
      setRooms(rows);
      setStats(s => ({ ...s, activeRooms: rows.length }));
    });
    const u3 = onValue(ref(db, "presence"), (snap) => {
      const uids = new Set<string>();
      snap.forEach(child => { if (child.val()?.online) uids.add(child.key!); });
      setOnlineUids(uids);
      setStats(s => ({ ...s, onlinePlayers: uids.size }));
    });
    unsubs.current = [u1, u2, u3];
    return () => { unsubs.current.forEach(fn => fn()); };
  }, [authed]);

  async function handleGiveCurrency(uid: string) {
    if (!db) return;
    const p = players.find(p => p.uid === uid);
    if (!p) return;
    await update(ref(db, `players/${uid}`), { coins: (p.coins ?? 0) + (parseInt(giveCoins) || 0), gems: (p.gems ?? 0) + (parseInt(giveGems) || 0) });
    showToast(`Gave ${giveCoins} coins + ${giveGems} gems`);
    setGiveCoins(""); setGiveGems(""); setSelectedPlayer(null);
  }

  async function handleResetPlayer(uid: string) {
    if (!db || !confirm("Reset this player's stats?")) return;
    await update(ref(db, `players/${uid}`), { wins: 0, losses: 0, kills: 0, coins: 200, gems: 10, winStreak: 0, bestStreak: 0 });
    showToast("Player stats reset."); setSelectedPlayer(null);
  }

  async function handleDeleteRoom(code: string) {
    if (!db || !confirm(`Delete room ${code}?`)) return;
    await remove(ref(db, `rooms/${code}`));
    showToast(`Room ${code} deleted.`);
  }

  async function handleRefresh() {
    if (!db) return;
    setLoading(true);
    const snap = await get(ref(db, "players"));
    const rows: PlayerRow[] = [];
    snap.forEach(child => { rows.push({ uid: child.key!, ...child.val() }); });
    setPlayers(rows); setLoading(false); showToast("Refreshed.");
  }

  const filteredPlayers = players
    .filter(p => !search || (p.name ?? "").toLowerCase().includes(search.toLowerCase()) || p.uid.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number, bv = (b[sortKey] ?? 0) as number;
      return sortAsc ? av - bv : bv - av;
    });

  function toggleSort(key: keyof PlayerRow) {
    if (sortKey === key) setSortAsc(v => !v); else { setSortKey(key); setSortAsc(false); }
  }

  if (!hasFirebaseConfig || !db) {
    return (
      <div className="screen-bg p-4">
        <div className="theme-card rounded-2xl p-8 text-center max-w-sm">
          <WifiOff size={40} className="mx-auto mb-4 text-red-400" />
          <div className="font-bold text-lg theme-text-primary mb-2">Firebase Not Connected</div>
          <div className="text-sm theme-text-muted">Admin panel requires Firebase.</div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="screen-bg p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="theme-card rounded-3xl p-8 w-full max-w-sm">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30">
              <Shield size={28} className="text-amber-400" />
            </div>
            <div className="text-2xl font-black shimmer-text">ADMIN PANEL</div>
            <div className="text-xs theme-text-muted">Ring War — Restricted Access</div>
          </div>
          <div className="space-y-3">
            <input
              type="password" placeholder="Enter admin password" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 rounded-xl text-sm theme-text-primary outline-none"
              style={{ background: "var(--bg-secondary)", border: `1px solid ${wrongPw ? "#ef4444" : "var(--border-color)"}` }}
              autoFocus
            />
            {wrongPw && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 text-center">Incorrect password</motion.div>}
            <button onClick={handleLogin} className="btn-gold w-full py-3 text-sm font-bold rounded-xl">Enter Admin Panel</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider sticky top-0 z-20" style={{ background: "var(--bg-primary)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30"><Shield size={15} className="text-amber-400" /></div>
          <div><div className="text-sm font-black shimmer-text tracking-widest">ADMIN</div><div className="text-[10px] theme-text-muted -mt-0.5">Ring War</div></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2 rounded-xl theme-btn-secondary"><RefreshCw size={14} className={`theme-text-muted ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setAuthed(false)} className="p-2 rounded-xl theme-btn-secondary"><LogOut size={14} className="theme-text-muted" /></button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 py-2 border-b border-divider">
        {(["overview", "players", "rooms"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
            style={{ background: tab === t ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)", color: tab === t ? "#f59e0b" : "var(--text-muted)", border: `1px solid ${tab === t ? "rgba(245,158,11,0.3)" : "var(--border-color)"}` }}>
            {t === "overview" ? "📊 " : t === "players" ? "👥 " : "🎮 "}{t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
        {tab === "overview" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Users size={18} />} label="Total Players" value={stats.totalPlayers} color="#f59e0b" />
              <StatCard icon={<Wifi size={18} />} label="Online Now" value={stats.onlinePlayers} color="#22c55e" />
              <StatCard icon={<Gamepad2 size={18} />} label="Active Rooms" value={stats.activeRooms} color="#3b82f6" />
              <StatCard icon={<Trophy size={18} />} label="Total Wins" value={stats.totalWins} color="#a855f7" />
            </div>
            <div>
              <div className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-2">Top 5 Players</div>
              <div className="space-y-2">
                {[...players].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0)).slice(0, 5).map((p, i) => {
                  const league = getLeagueInfo(p.wins ?? 0);
                  return (
                    <div key={p.uid} className="theme-card rounded-xl p-3 flex items-center gap-3">
                      <div className="text-lg font-black" style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "var(--text-muted)" }}>#{i + 1}</div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: league.gradient }}>
                        {(p.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold theme-text-primary truncate">{p.name ?? "Unknown"}</div>
                        <div className="text-xs theme-text-muted">{league.icon} {league.leagueLabel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-400">{p.wins ?? 0}W</div>
                        <div className="text-xs theme-text-muted">{p.losses ?? 0}L</div>
                      </div>
                      {onlineUids.has(p.uid) && <div className="w-2 h-2 rounded-full bg-green-400" />}
                    </div>
                  );
                })}
                {players.length === 0 && <div className="text-center py-8 theme-text-muted text-sm">No players yet</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "players" && (
          <div className="space-y-3 animate-fade-in">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or UID…"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none theme-text-primary"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }} />
            </div>
            <div className="text-xs theme-text-muted">{filteredPlayers.length} players</div>
            <div className="grid grid-cols-5 gap-1 text-[10px] font-bold theme-text-muted uppercase px-1">
              <div className="col-span-2">Player</div>
              {(["wins", "losses", "coins", "gems"] as (keyof PlayerRow)[]).map(k => (
                <button key={k} onClick={() => toggleSort(k)} className="flex items-center gap-0.5">
                  {k}{sortKey === k ? (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : null}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredPlayers.map(p => {
                const league = getLeagueInfo(p.wins ?? 0);
                const isOnline = onlineUids.has(p.uid);
                return (
                  <motion.button key={p.uid} layout onClick={() => setSelectedPlayer(selectedPlayer?.uid === p.uid ? null : p)}
                    className="w-full theme-card rounded-xl p-3 text-left"
                    style={{ border: selectedPlayer?.uid === p.uid ? "1px solid rgba(245,158,11,0.4)" : undefined }}>
                    <div className="grid grid-cols-5 gap-1 items-center">
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: league.gradient }}>
                            {(p.name ?? "?")[0].toUpperCase()}
                          </div>
                          {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-black" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold theme-text-primary truncate">{p.name ?? "Unknown"}</div>
                          <div className="text-[10px] theme-text-muted truncate">{p.uid.slice(0, 10)}…</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-green-400 text-center">{p.wins ?? 0}</div>
                      <div className="text-xs font-bold text-red-400 text-center">{p.losses ?? 0}</div>
                      <div className="text-xs font-bold text-amber-400 text-center">{p.coins ?? 0}</div>
                    </div>
                    <AnimatePresence>
                      {selectedPlayer?.uid === p.uid && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" onClick={e => e.stopPropagation()}>
                          <div className="pt-3 mt-3 border-t border-divider space-y-3">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">🪙</span>
                                <input type="number" placeholder="Coins" value={giveCoins} onChange={e => setGiveCoins(e.target.value)}
                                  className="w-full pl-7 pr-2 py-2 rounded-xl text-xs outline-none theme-text-primary"
                                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }} />
                              </div>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">💎</span>
                                <input type="number" placeholder="Gems" value={giveGems} onChange={e => setGiveGems(e.target.value)}
                                  className="w-full pl-7 pr-2 py-2 rounded-xl text-xs outline-none theme-text-primary"
                                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }} />
                              </div>
                              <button onClick={() => handleGiveCurrency(p.uid)} className="px-3 py-2 rounded-xl text-xs font-bold text-black bg-amber-500">Give</button>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleResetPlayer(p.uid)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-red-400"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <AlertTriangle size={11} /> Reset Stats
                              </button>
                              <button onClick={() => setSelectedPlayer(null)} className="px-3 py-2 rounded-xl text-xs font-semibold theme-text-muted theme-btn-secondary">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
              {loading && <div className="text-center py-8"><div className="w-6 h-6 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin mx-auto" /></div>}
              {!loading && filteredPlayers.length === 0 && <div className="text-center py-8 theme-text-muted text-sm">{search ? "No match" : "No players yet"}</div>}
            </div>
          </div>
        )}

        {tab === "rooms" && (
          <div className="space-y-3 animate-fade-in">
            <div className="text-xs theme-text-muted">{rooms.length} rooms</div>
            {rooms.length === 0 ? (
              <div className="text-center py-16"><Gamepad2 size={32} className="mx-auto mb-3 theme-text-muted opacity-40" /><div className="theme-text-muted text-sm">No active rooms</div></div>
            ) : (
              <div className="space-y-3">
                {rooms.map(r => (
                  <div key={r.code} className="theme-card rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">{r.code}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: r.status === "playing" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: r.status === "playing" ? "#22c55e" : "#f59e0b" }}>
                          {r.status ?? "waiting"}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteRoom(r.code)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
                        <div className="text-xs font-bold text-orange-400">🟠 P1</div>
                        <div className="text-sm font-semibold theme-text-primary truncate mt-0.5">{r.player1?.displayName ?? "—"}</div>
                      </div>
                      <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.15)" }}>
                        <div className="text-xs font-bold text-pink-400">🩷 P2</div>
                        <div className="text-sm font-semibold theme-text-primary truncate mt-0.5">{r.player2?.displayName ?? "waiting…"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold text-white z-50 whitespace-nowrap"
            style={{ background: "rgba(30,40,60,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
