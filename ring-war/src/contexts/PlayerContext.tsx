import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { ref, onValue, update } from "firebase/database";
import { onAuthStateChanged, type User } from "firebase/auth";
import { db, auth } from "../firebase";

export type League = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "crown" | "legend";
export type Theme = "dark" | "light" | "auto";
export type SkinCategory = "piece" | "frame" | "trail" | "killEffect" | "winEffect" | "boardTheme";

export interface Skin {
  id: string;
  name: string;
  category: SkinCategory;
  rarity: "common" | "rare" | "epic" | "legendary";
  price: { coins?: number; gems?: number };
  cssClass?: string;
  color?: string;
  gradient?: string;
  icon?: string;
  animated?: boolean;
  rankReward?: League;
}

export interface PlayerData {
  uid?: string;
  displayName?: string;
  pieceColor?: string;
  coins: number;
  gems: number;
  xp: number;
  wins: number;
  losses: number;
  kills: number;
  winStreak: number;
  bestStreak: number;
  name: string;
  email: string;
  bio: string;
  avatar: string;
  profilePhoto: string;
  bannerPhoto: string;
  equippedSkins: Record<SkinCategory, string>;
  ownedSkins: string[];
  loginStreak: number;
  lastLoginDay: string;
  lastDailyClaimedDay: string;
  matchHistory: MatchRecord[];
  elo: number;
}

export interface PlayerContextValue {
  data: PlayerData | null;
  league: LeagueInfo;
  theme: Theme;
  setTheme: (t: Theme) => void;
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  spendGems: (amount: number) => boolean;
  equipSkin: (skinId: string, category: SkinCategory) => void;
  ownSkin: (skinId: string) => void;
  hasSkin: (skinId: string) => boolean;
  addMatchResult: (record: Omit<MatchRecord, "id">) => void;
  claimDailyReward: () => DailyReward | null;
  dailyAvailable: boolean;
  uid: string;
}

export interface LeagueInfo {
  league: League;
  leagueLabel: string;
  color: string;
  gradient: string;
  icon: string;
  nextLeague: League | null;
  nextLabel: string | null;
  xpForCurrent: number;
  xpForNext: number | null;
  progress: number;
}

export interface DailyReward {
  day: number;
  coins: number;
  gems: number;
}

export interface MatchRecord {
  id: string;
  result: "win" | "loss";
  opponentName: string;
  coinsEarned: number;
  gemsEarned: number;
  surrendered: boolean;
  gameMode: "online" | "offline";
  roomCode?: string;
  playedAt: number;
  eloChange?: number;
  opponentElo?: number;
  myEloBefore?: number;
}

export function calcEloChange(myElo: number, oppElo: number, won: boolean): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  return Math.round(K * ((won ? 1 : 0) - expected));
}

const LEAGUES: { league: League; label: string; color: string; gradient: string; icon: string; minWins: number }[] = [
  { league: "bronze",   label: "Bronze",   color: "#cd7f32", gradient: "linear-gradient(135deg,#cd7f32,#a0522d)", icon: "🥉", minWins: 0 },
  { league: "silver",   label: "Silver",   color: "#c0c0c0", gradient: "linear-gradient(135deg,#c0c0c0,#808080)", icon: "🥈", minWins: 5 },
  { league: "gold",     label: "Gold",     color: "#ffd700", gradient: "linear-gradient(135deg,#ffd700,#f59e0b)", icon: "🥇", minWins: 15 },
  { league: "platinum", label: "Platinum", color: "#e5e4e2", gradient: "linear-gradient(135deg,#e5e4e2,#b0b0c8)", icon: "💎", minWins: 30 },
  { league: "diamond",  label: "Diamond",  color: "#b9f2ff", gradient: "linear-gradient(135deg,#b9f2ff,#7dd3fc)", icon: "💠", minWins: 50 },
  { league: "crown",    label: "Crown",    color: "#ff6ec7", gradient: "linear-gradient(135deg,#ff6ec7,#a855f7)", icon: "👑", minWins: 80 },
  { league: "legend",   label: "Legend",   color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)", icon: "⚡", minWins: 120 },
];

export function getLeagueInfo(wins: number): LeagueInfo {
  let idx = 0;
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (wins >= LEAGUES[i].minWins) { idx = i; break; }
  }
  const curr = LEAGUES[idx];
  const next = LEAGUES[idx + 1] ?? null;
  const xpForCurrent = curr.minWins;
  const xpForNext = next ? next.minWins : null;
  const progress = next
    ? Math.min(1, (wins - xpForCurrent) / (xpForNext! - xpForCurrent))
    : 1;
  return {
    league: curr.league,
    leagueLabel: curr.label,
    color: curr.color,
    gradient: curr.gradient,
    icon: curr.icon,
    nextLeague: next?.league ?? null,
    nextLabel: next?.label ?? null,
    xpForCurrent,
    xpForNext,
    progress,
  };
}

export const ALL_SKINS: Skin[] = [
  // ── PIECE SKINS ──────────────────────────────────────────────────────────────
  { id: "piece_default",        name: "Classic",          category: "piece",      rarity: "common",    price: {},              icon: "⚪" },
  // Special
  { id: "piece_fire_core",      name: "Fire Core",        category: "piece",      rarity: "rare",      price: {},  color: "#ff4500", gradient: "linear-gradient(135deg,#ff4500,#ff6b00)", animated: true, icon: "🔴" },
  { id: "piece_aqua_orb",       name: "Aqua Orb",         category: "piece",      rarity: "rare",      price: {},  color: "#38bdf8", gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)", animated: true, icon: "🔵" },
  { id: "piece_emerald_spirit", name: "Emerald Spirit",   category: "piece",      rarity: "rare",      price: {},  color: "#34d399", gradient: "linear-gradient(135deg,#059669,#34d399)", animated: true, icon: "🟢" },
  { id: "piece_desert_soul",    name: "Desert Soul",      category: "piece",      rarity: "rare",      price: {},  color: "#fbbf24", gradient: "linear-gradient(135deg,#d97706,#fbbf24)", animated: true, icon: "🟡" },
  { id: "piece_night_pulse",    name: "Night Pulse",      category: "piece",      rarity: "rare",      price: {},  color: "#a78bfa", gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)", animated: true, icon: "🟣" },
  // Epic
  { id: "piece_cyber_samurai",  name: "Cyber Samurai",    category: "piece",      rarity: "epic",      price: {},  color: "#22d3ee", gradient: "linear-gradient(135deg,#0891b2,#22d3ee,#67e8f9)", animated: true, icon: "🤖" },
  { id: "piece_frost_hunter",   name: "Frost Hunter",     category: "piece",      rarity: "epic",      price: {},  color: "#bae6fd", gradient: "linear-gradient(135deg,#3b82f6,#bae6fd,#e0f2fe)", animated: true, icon: "🧊" },
  { id: "piece_toxic_venom",    name: "Toxic Venom",      category: "piece",      rarity: "epic",      price: {},  color: "#4ade80", gradient: "linear-gradient(135deg,#16a34a,#4ade80,#bbf7d0)", animated: true, icon: "☣️" },
  { id: "piece_neon_phantom",   name: "Neon Phantom",     category: "piece",      rarity: "epic",      price: {},  color: "#f472b6", gradient: "linear-gradient(135deg,#db2777,#f472b6,#fbcfe8)", animated: true, icon: "👻" },
  { id: "piece_lava_beast",     name: "Lava Beast",       category: "piece",      rarity: "epic",      price: {},  color: "#f97316", gradient: "linear-gradient(135deg,#c2410c,#f97316,#fed7aa)", animated: true, icon: "🌋" },
  // Legendary
  { id: "piece_inferno_king",   name: "Inferno King",     category: "piece",      rarity: "legendary", price: {},  color: "#ff4500", gradient: "linear-gradient(135deg,#7f1d1d,#dc2626,#ff4500,#fbbf24)", animated: true, icon: "😈", rankReward: "diamond" },
  { id: "piece_galaxy_phantom", name: "Galaxy Phantom",   category: "piece",      rarity: "legendary", price: {},  color: "#9333ea", gradient: "linear-gradient(135deg,#1e1b4b,#7c3aed,#9333ea,#c084fc)", animated: true, icon: "👾", rankReward: "diamond" },
  { id: "piece_thunder_titan",  name: "Thunder Titan",    category: "piece",      rarity: "legendary", price: {},  color: "#3b82f6", gradient: "linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6,#93c5fd)", animated: true, icon: "⚡", rankReward: "diamond" },
  { id: "piece_shadow_reaper",  name: "Shadow Reaper",    category: "piece",      rarity: "legendary", price: {},  color: "#6b21a8", gradient: "linear-gradient(135deg,#0c0c1a,#3b0764,#6b21a8,#a855f7)", animated: true, icon: "💀", rankReward: "crown" },
  { id: "piece_crystal_dragon", name: "Crystal Dragon",   category: "piece",      rarity: "legendary", price: {},  color: "#bae6fd", gradient: "linear-gradient(135deg,#0f172a,#0284c7,#bae6fd,#ffffff)", animated: true, icon: "🐉", rankReward: "crown" },
  { id: "piece_divine_emperor", name: "Divine Emperor",   category: "piece",      rarity: "legendary", price: {},  color: "#fbbf24", gradient: "linear-gradient(135deg,#78350f,#fbbf24,#ffffff,#fbbf24)", animated: true, icon: "🌟", rankReward: "legend" },

  // ── AVATAR FRAMES ─────────────────────────────────────────────────────────────
  { id: "frame_default",        name: "Basic Frame",      category: "frame",      rarity: "common",    price: {},              icon: "⬜" },
  { id: "frame_divine_crown",   name: "Divine Crown",     category: "frame",      rarity: "legendary", price: {},  color: "#f59e0b", gradient: "linear-gradient(135deg,#92400e,#f59e0b,#fde68a,#f59e0b)", animated: true, icon: "👑", rankReward: "gold" },
  { id: "frame_galaxy_emperor", name: "Galaxy Emperor",   category: "frame",      rarity: "legendary", price: {},  color: "#8b5cf6", gradient: "linear-gradient(135deg,#1e1b4b,#7c3aed,#8b5cf6,#c4b5fd)", animated: true, icon: "🌌", rankReward: "platinum" },
  { id: "frame_thunder_god",    name: "Thunder God",      category: "frame",      rarity: "legendary", price: {},  color: "#3b82f6", gradient: "linear-gradient(135deg,#1e3a8a,#3b82f6,#93c5fd)", animated: true, icon: "⚡", rankReward: "platinum" },
  { id: "frame_shadow_phantom", name: "Shadow Phantom",   category: "frame",      rarity: "legendary", price: {},  color: "#7c3aed", gradient: "linear-gradient(135deg,#0c0a1a,#3b0764,#7c3aed,#a855f7)", animated: true, icon: "👻", rankReward: "diamond" },
  { id: "frame_crystal_dragon", name: "Crystal Dragon",   category: "frame",      rarity: "legendary", price: {},  color: "#bae6fd", gradient: "linear-gradient(135deg,#0c4a6e,#0284c7,#bae6fd,#e0f2fe)", animated: true, icon: "🐉", rankReward: "diamond" },
  { id: "frame_royal_diamond",  name: "Royal Diamond",    category: "frame",      rarity: "legendary", price: {},  color: "#e2e8f0", gradient: "linear-gradient(135deg,#475569,#e2e8f0,#ffffff,#bae6fd)", animated: true, icon: "💎", rankReward: "crown" },

  // ── MOVEMENT TRAIL EFFECTS ────────────────────────────────────────────────────
  { id: "trail_none",           name: "No Trail",         category: "trail",      rarity: "common",    price: {},              icon: "✖️" },
  { id: "trail_fire",           name: "Fire Trail",       category: "trail",      rarity: "rare",      price: {},  color: "#ef4444", gradient: "linear-gradient(90deg,#f97316,#ef4444)", animated: true, icon: "🔥" },
  { id: "trail_ice",            name: "Ice Trail",        category: "trail",      rarity: "rare",      price: {},  color: "#7dd3fc", gradient: "linear-gradient(90deg,#7dd3fc,#3b82f6)", animated: true, icon: "❄️" },
  { id: "trail_thunder",        name: "Thunder Trail",    category: "trail",      rarity: "epic",      price: {},  color: "#facc15", gradient: "linear-gradient(90deg,#facc15,#f59e0b)", animated: true, icon: "⚡" },
  { id: "trail_galaxy",         name: "Galaxy Trail",     category: "trail",      rarity: "epic",      price: {},  gradient: "linear-gradient(90deg,#7c3aed,#ec4899)", animated: true, icon: "🌌" },
  { id: "trail_shadow",         name: "Shadow Trail",     category: "trail",      rarity: "epic",      price: {},  color: "#7c3aed", gradient: "linear-gradient(90deg,#0c0a1a,#3b0764,#7c3aed)", animated: true, icon: "🌑" },
  { id: "trail_divine_golden",  name: "Divine Golden Trail", category: "trail",   rarity: "legendary", price: {},  color: "#fbbf24", gradient: "linear-gradient(90deg,#92400e,#fbbf24,#ffffff,#fbbf24,#92400e)", animated: true, icon: "⭐", rankReward: "diamond" },

  // ── PREMIUM SHINING TAILS ─────────────────────────────────────────────────────
  { id: "trail_energy_ribbon",  name: "Energy Ribbon",    category: "trail",      rarity: "legendary", price: {},  color: "#22d3ee", gradient: "linear-gradient(90deg,#0e7490,#22d3ee,#a5f3fc,#22d3ee)", animated: true, icon: "🌊", rankReward: "platinum" },
  { id: "trail_flame",          name: "Flame Tail",       category: "trail",      rarity: "epic",      price: {},  color: "#f97316", gradient: "linear-gradient(90deg,#7f1d1d,#dc2626,#f97316,#fbbf24)", animated: true, icon: "☄️" },
  { id: "trail_crystal",        name: "Crystal Tail",     category: "trail",      rarity: "epic",      price: {},  color: "#bae6fd", gradient: "linear-gradient(90deg,#0c4a6e,#0284c7,#bae6fd,#e0f2fe)", animated: true, icon: "💠" },
  { id: "trail_lightning",      name: "Lightning Tail",   category: "trail",      rarity: "epic",      price: {},  color: "#facc15", gradient: "linear-gradient(90deg,#1e3a8a,#facc15,#ffffff)", animated: true, icon: "⚡" },
  { id: "trail_shadow_tail",    name: "Shadow Tail",      category: "trail",      rarity: "epic",      price: {},  color: "#7c3aed", gradient: "linear-gradient(90deg,#0c0a1a,#3b0764,#7c3aed,#a855f7)", animated: true, icon: "🌑" },
  { id: "trail_golden_royal",   name: "Golden Royal Tail",category: "trail",      rarity: "legendary", price: {},  gradient: "linear-gradient(90deg,#f59e0b,#fde68a,#f59e0b)", animated: true, icon: "✨", rankReward: "gold" },

  // ── WIN EFFECTS ────────────────────────────────────────────────────────────────
  { id: "win_default",          name: "Basic Win",        category: "winEffect",  rarity: "common",    price: {},              icon: "🎉" },
  { id: "win_explosion",        name: "Explosion",        category: "winEffect",  rarity: "rare",      price: {},  animated: true, color: "#ef4444", icon: "💥" },
  { id: "win_fireworks",        name: "Fireworks",        category: "winEffect",  rarity: "epic",      price: {},  animated: true, color: "#f59e0b", icon: "🎆" },

  // ── KILL EFFECTS ───────────────────────────────────────────────────────────────
  { id: "kill_default",         name: "Basic Kill",       category: "killEffect", rarity: "common",    price: {},              icon: "💢" },
  { id: "kill_fire",            name: "Fire Explosion",   category: "killEffect", rarity: "rare",      price: {},  animated: true, color: "#ef4444", gradient: "linear-gradient(135deg,#f97316,#ef4444)", icon: "🔥" },
  { id: "kill_ice",             name: "Ice Break",        category: "killEffect", rarity: "rare",      price: {},  animated: true, color: "#7dd3fc", gradient: "linear-gradient(135deg,#7dd3fc,#3b82f6)", icon: "❄️" },
  { id: "kill_thunder",         name: "Thunder Strike",   category: "killEffect", rarity: "epic",      price: {},  animated: true, color: "#facc15", gradient: "linear-gradient(135deg,#facc15,#f59e0b)", icon: "⚡" },
  { id: "kill_shadow_destroy",  name: "Shadow Destroy",   category: "killEffect", rarity: "epic",      price: {},  animated: true, color: "#7c3aed", gradient: "linear-gradient(135deg,#0c0a1a,#3b0764,#7c3aed,#a855f7)", icon: "💫" },
  { id: "kill_galaxy",          name: "Galaxy Blast",     category: "killEffect", rarity: "epic",      price: {},  animated: true, color: "#8b5cf6", gradient: "linear-gradient(135deg,#7c3aed,#ec4899)", icon: "🌌" },
  { id: "kill_divine_golden",   name: "Divine Golden Kill",category: "killEffect",rarity: "legendary", price: {},  animated: true, color: "#fbbf24", gradient: "linear-gradient(135deg,#92400e,#fbbf24,#ffffff,#fbbf24)", icon: "⭐", rankReward: "gold" },

  // ── BOARD THEMES ──────────────────────────────────────────────────────────────
  { id: "board_classic",        name: "Classic Board",    category: "boardTheme", rarity: "common",    price: {},              color: "#8b4513", icon: "🟤" },
  { id: "board_royal_gold",     name: "Royal Gold",       category: "boardTheme", rarity: "rare",      price: {},  color: "#f59e0b", gradient: "linear-gradient(135deg,#92400e,#f59e0b,#fde68a)", animated: true, icon: "🏆" },
  { id: "board_wooden",         name: "Wooden Board",     category: "boardTheme", rarity: "rare",      price: {},  color: "#92400e", gradient: "linear-gradient(135deg,#78350f,#a16207)", icon: "🌲" },
  { id: "board_stone",          name: "Stone Board",      category: "boardTheme", rarity: "rare",      price: {},  color: "#6b7280", gradient: "linear-gradient(135deg,#374151,#6b7280,#9ca3af)", icon: "🪨" },
  { id: "board_desert",         name: "Desert Board",     category: "boardTheme", rarity: "rare",      price: {},  color: "#d97706", gradient: "linear-gradient(135deg,#78350f,#d97706,#fde68a)", icon: "🏜️" },
  { id: "board_ice",            name: "Ice Board",        category: "boardTheme", rarity: "epic",      price: {},  color: "#bae6fd", gradient: "linear-gradient(135deg,#0c4a6e,#0284c7,#bae6fd,#e0f2fe)", animated: true, icon: "🧊" },
  { id: "board_cyberpunk",      name: "Cyberpunk Board",  category: "boardTheme", rarity: "epic",      price: {},  color: "#22d3ee", gradient: "linear-gradient(135deg,#0f172a,#0891b2,#22d3ee,#f472b6)", animated: true, icon: "🤖" },
  { id: "board_lava",           name: "Lava Board",       category: "boardTheme", rarity: "epic",      price: {},  color: "#ef4444", gradient: "linear-gradient(135deg,#1c0a00,#7f1d1d,#dc2626,#f97316)", animated: true, icon: "🌋" },
  { id: "board_galaxy",         name: "Galaxy Board",     category: "boardTheme", rarity: "legendary", price: {},  color: "#8b5cf6", gradient: "linear-gradient(135deg,#0f0a1a,#4c1d95,#7c3aed,#ec4899)", animated: true, icon: "🌌", rankReward: "diamond" },
];

const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 100,  gems: 0 },
  { day: 2, coins: 150,  gems: 0 },
  { day: 3, coins: 200,  gems: 5 },
  { day: 4, coins: 200,  gems: 0 },
  { day: 5, coins: 300,  gems: 0 },
  { day: 6, coins: 300,  gems: 10 },
  { day: 7, coins: 500,  gems: 20 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const LOCAL_KEY = "ringwar-player-data";

const DEFAULT_DATA: PlayerData = {
  coins: 200,
  gems: 10,
  xp: 0,
  wins: 0,
  losses: 0,
  kills: 0,
  winStreak: 0,
  bestStreak: 0,
  name: "Warrior",
  email: "",
  bio: "",
  avatar: "",
  profilePhoto: "",
  bannerPhoto: "",
  equippedSkins: { piece: "piece_default", frame: "frame_default", trail: "trail_none", killEffect: "kill_default", winEffect: "win_default", boardTheme: "board_classic" },
  ownedSkins: ["piece_default", "frame_default", "trail_none", "kill_default", "win_default", "board_classic"],
  loginStreak: 0,
  lastLoginDay: "",
  lastDailyClaimedDay: "",
  matchHistory: [],
  elo: 1200,
};

function loadLocalData(): PlayerData {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerData>;
      return {
        ...DEFAULT_DATA,
        ...parsed,
        equippedSkins: { ...DEFAULT_DATA.equippedSkins, ...(parsed.equippedSkins || {}) },
        ownedSkins: parsed.ownedSkins || DEFAULT_DATA.ownedSkins,
      };
    }
  } catch {}
  return { ...DEFAULT_DATA };
}

function saveLocalData(data: PlayerData) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {}
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("ringwar-theme") as Theme) || "dark"
  );

  const isOffline = !db || uid.startsWith("offline-");

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = theme === "auto"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : theme;
    root.setAttribute("data-theme", effectiveTheme);
    if (effectiveTheme === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [theme]);

  // Track Firebase auth user so the player profile can be seeded with
  // displayName / email / photoURL from Google (instead of the "Warrior" default).
  const [authUser, setAuthUser] = useState<User | null>(() => auth?.currentUser ?? null);
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setAuthUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    if (isOffline) {
      setData(loadLocalData());
      return;
    }

    const playerRef = ref(db!, `players/${uid}`);
    const unsub = onValue(playerRef, (snap) => {
      // Pull live Google profile info from Firebase Auth (if signed in & not anonymous)
      const googleName  = authUser && !authUser.isAnonymous ? (authUser.displayName || "") : "";
      const googleEmail = authUser && !authUser.isAnonymous ? (authUser.email       || "") : "";
      const googlePhoto = authUser && !authUser.isAnonymous ? (authUser.photoURL    || "") : "";

      if (snap.exists()) {
        const d = snap.val() as Partial<PlayerData>;
        // Backfill profile fields from Google account when missing or still defaulted.
        const patch: Partial<PlayerData> = {};
        if (googleName  && (!d.name  || d.name === "Warrior")) patch.name  = googleName;
        if (googleEmail && !d.email)                            patch.email = googleEmail;
        if (googlePhoto && !d.profilePhoto)                     patch.profilePhoto = googlePhoto;
        if (Object.keys(patch).length) {
          update(playerRef, patch).catch(() => {});
        }
        setData({
          ...DEFAULT_DATA,
          ...d,
          ...patch,
          equippedSkins: { ...DEFAULT_DATA.equippedSkins, ...(d.equippedSkins || {}) },
          ownedSkins: d.ownedSkins || DEFAULT_DATA.ownedSkins,
        });
      } else {
        const initial: PlayerData = {
          ...DEFAULT_DATA,
          name:         googleName  || DEFAULT_DATA.name,
          email:        googleEmail || DEFAULT_DATA.email,
          profilePhoto: googlePhoto || DEFAULT_DATA.profilePhoto,
        };
        update(playerRef, initial).catch(() => {});
        setData(initial);
      }
    });
    return unsub;
  }, [uid, isOffline, authUser]);

  const patchData = useCallback((patch: Partial<PlayerData>) => {
    if (!uid) return;
    setData(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (isOffline) {
        saveLocalData(next);
      } else if (db) {
        update(ref(db, `players/${uid}`), patch).catch(() => {});
      }
      return next;
    });
  }, [uid, isOffline]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("ringwar-theme", t);
  }, []);

  const addCoins = useCallback((amount: number) => {
    setData(prev => {
      if (!prev) return prev;
      const coins = prev.coins + amount;
      const next = { ...prev, coins };
      if (isOffline) saveLocalData(next);
      else if (db) update(ref(db, `players/${uid}`), { coins }).catch(() => {});
      return next;
    });
  }, [uid, isOffline]);

  const addGems = useCallback((amount: number) => {
    setData(prev => {
      if (!prev) return prev;
      const gems = prev.gems + amount;
      const next = { ...prev, gems };
      if (isOffline) saveLocalData(next);
      else if (db) update(ref(db, `players/${uid}`), { gems }).catch(() => {});
      return next;
    });
  }, [uid, isOffline]);

  const spendCoins = useCallback((amount: number): boolean => {
    if (!data || data.coins < amount) return false;
    const coins = data.coins - amount;
    patchData({ coins });
    return true;
  }, [data, patchData]);

  const spendGems = useCallback((amount: number): boolean => {
    if (!data || data.gems < amount) return false;
    const gems = data.gems - amount;
    patchData({ gems });
    return true;
  }, [data, patchData]);

  const equipSkin = useCallback((skinId: string, category: SkinCategory) => {
    if (!data) return;
    const equippedSkins = { ...data.equippedSkins, [category]: skinId };
    patchData({ equippedSkins });
  }, [data, patchData]);

  const ownSkin = useCallback((skinId: string) => {
    if (!data) return;
    if (data.ownedSkins.includes(skinId)) return;
    const ownedSkins = [...data.ownedSkins, skinId];
    patchData({ ownedSkins });
  }, [data, patchData]);

  const hasSkin = useCallback((skinId: string) => {
    return data?.ownedSkins.includes(skinId) ?? false;
  }, [data]);

  const dailyAvailable = !data || data.lastDailyClaimedDay !== todayStr();

  const addMatchResult = useCallback((record: Omit<MatchRecord, "id">) => {
    setData(prev => {
      if (!prev) return prev;
      const myElo = prev.elo ?? 1200;
      let eloChange = record.eloChange;
      if (eloChange === undefined && record.opponentElo !== undefined && record.gameMode === "online") {
        eloChange = calcEloChange(myElo, record.opponentElo, record.result === "win");
      }
      const newElo = eloChange !== undefined ? Math.max(100, myElo + eloChange) : myElo;
      const entry: MatchRecord = {
        ...record,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        eloChange,
        myEloBefore: myElo,
      };
      const matchHistory = [entry, ...(prev.matchHistory ?? [])].slice(0, 50);
      const next = { ...prev, matchHistory, elo: newElo };
      // Firebase rejects undefined values — strip them from every record before writing
      const sanitizedHistory = matchHistory.map(r =>
        Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)),
      );
      const dbPatch: Record<string, unknown> = { matchHistory: sanitizedHistory };
      if (eloChange !== undefined) dbPatch.elo = newElo;
      if (isOffline) saveLocalData(next);
      else if (db) update(ref(db, `players/${uid}`), dbPatch).catch(() => {});
      return next;
    });
  }, [uid, isOffline]);

  const claimDailyReward = useCallback((): DailyReward | null => {
    if (!data) return null;
    const today = todayStr();
    if (data.lastDailyClaimedDay === today) return null;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = data.lastDailyClaimedDay === yesterday ? (data.loginStreak % 7) + 1 : 1;
    const reward = DAILY_REWARDS[(newStreak - 1) % 7];

    patchData({
      loginStreak: newStreak,
      lastDailyClaimedDay: today,
      coins: data.coins + reward.coins,
      gems: data.gems + reward.gems,
    });
    return reward;
  }, [data, patchData]);

  const league = getLeagueInfo(data?.wins ?? 0);

  return (
    <PlayerContext.Provider value={{
      data, league, theme, setTheme,
      addCoins, addGems, spendCoins, spendGems,
      equipSkin, ownSkin, hasSkin,
      addMatchResult, claimDailyReward, dailyAvailable, uid,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
