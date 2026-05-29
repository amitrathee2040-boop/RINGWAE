import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ref, set, get, onValue, remove, onDisconnect } from "firebase/database";
import { db } from "../firebase";
import { PieceColor } from "../types";
import { colorOf, PIECE_COLORS } from "../game/colors";
import { buildInitialBoard } from "../game/boardDefinition";
import { buildInitialBoard4 } from "../game/boardDefinition4";
import { countPieces4 } from "../game/gameLogic4";
import type { Player4Key } from "../game/boardDefinition4";
import { GameState } from "../types";
import { usePlayer } from "../contexts/PlayerContext";
import QuickMatch from "./QuickMatch";
import Leaderboard from "./Leaderboard";
import Friends from "./Friends";
import Shop from "./Shop";
import ActiveGames from "./ActiveGames";
import RankBadge from "./RankBadge";
import GlobalChat from "./GlobalChat";
import { AnimatePresence, motion } from "framer-motion";
import {
  Zap, Users, Wifi, WifiOff, Trophy, Settings,
  Gamepad2, ShoppingBag, Eye, Bell, X,
  Home, Play, UserPlus, LayoutGrid, ChevronRight, ChevronLeft,
  Swords, Menu, Plus, MessageSquare, Clock, HelpCircle,
} from "lucide-react";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

type Screen = "home" | "quickmatch" | "mode_select" | "offline_mode_select" | "private_create" | "private_join" | "leaderboard" | "friends" | "shop" | "watch" | "bot_select";
type NavItem = "home" | "play" | "watch" | "friends" | "leaderboard" | "rooms" | "store" | "settings" | "history" | "support";

interface RoomInvite {
  id: string; roomCode: string; fromName: string; fromUid: string; at: number;
}
interface Props {
  uid: string;
  isOffline: boolean;
  isGuest: boolean;
  isOnline: boolean;
  onLogin: () => void;
}

export default function Lobby({ uid, isOffline, isGuest, isOnline, onLogin }: Props) {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>("home");
  const [activeNav, setActiveNav] = useState<NavItem>("home");
  const [name, setName] = useState(() => localStorage.getItem("ringwar-name") || "");
  const [pieceColor] = useState<PieceColor>(() => (localStorage.getItem("ringwar-piece-color") as PieceColor) || "orange");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [creating, setCreating] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [proUser] = useState(() => localStorage.getItem("ringwar-pro-plan") === "1");
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([]);
  const [activeRoomCount, setActiveRoomCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [joinOpen, setJoinOpen] = useState(false);
  const [spectateMode, setSpectateMode] = useState(false);
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalChatUnread, setGlobalChatUnread] = useState(0);
  const [lastGlobalRead, setLastGlobalRead] = useState(() => parseInt(localStorage.getItem("ringwar-globalchat-read") || "0", 10));
  const [botMode, setBotMode] = useState<"2p" | "4p">("2p");
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [authBlock, setAuthBlock] = useState<null | "no-internet" | "login">(null);
  // viewMode: offline users/guests start in "offline" so they only see offline UI
  const [viewMode, setViewMode] = useState<"offline" | "online">(() =>
    isOffline || isGuest ? "offline" : "online"
  );

  // Guest onboarding (age → gender → name)
  const [showOnboarding, setShowOnboarding] = useState(() =>
    !localStorage.getItem("ringwar-setup-done")
  );
  const [onboardStep, setOnboardStep] = useState<0 | 1 | 2 | 3>(0);
  const [tempAge,    setTempAge]    = useState<string>("");
  const [tempGender, setTempGender] = useState<string>("");
  const [tempName,   setTempName]   = useState<string>("");

  const { data, league } = usePlayer();
  const displayName = name.trim() || "Warrior";
  const myColor = colorOf(pieceColor);
  const wins = data?.wins ?? 0;
  const losses = data?.losses ?? 0;

  useEffect(() => {
    if (!uid || isOffline || !db) return;
    const presenceRef = ref(db, `presence/${uid}`);
    onDisconnect(presenceRef).remove().catch(() => {});
    set(presenceRef, { name: displayName, color: pieceColor, at: Date.now() }).catch(() => {});
    const unsub = onValue(ref(db, "presence"), (snap) => setOnlineCount(snap.exists() ? Object.keys(snap.val()).length : 0));
    return () => unsub();
  }, [uid, displayName, pieceColor, isOffline]);

  useEffect(() => {
    if (!uid || isOffline || !db) return;
    const unsub = onValue(ref(db, `roomInvites/${uid}`), (snap) => {
      if (!snap.exists()) { setRoomInvites([]); return; }
      const d = snap.val() as Record<string, Omit<RoomInvite, "id">>;
      setRoomInvites(Object.entries(d).map(([id, v]) => ({ ...v, id })).filter(i => Date.now() - i.at < 300000).sort((a, b) => b.at - a.at));
    });
    return unsub;
  }, [uid, isOffline]);

  useEffect(() => {
    if (isOffline || !db) return;
    const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours
    const unsub = onValue(ref(db, "rooms"), (snap) => {
      if (!snap.exists()) { setActiveRoomCount(0); return; }
      const rooms = snap.val() as Record<string, GameState>;
      const now = Date.now();
      setActiveRoomCount(Object.values(rooms).filter(r =>
        r.status === "playing" &&
        r.players.player1 && r.players.player2 &&
        (now - (r.lastMoveAt ?? r.createdAt ?? 0)) < STALE_MS
      ).length);
    });
    return unsub;
  }, [isOffline]);


  useEffect(() => {
    if (!db || isOffline) return;
    return onValue(ref(db, "globalChat"), (snap) => {
      if (!snap.exists()) return;
      const count = Object.keys(snap.val()).length;
      if (!globalChatOpen) setGlobalChatUnread(Math.max(0, count - lastGlobalRead));
    });
  }, [isOffline, globalChatOpen, lastGlobalRead]);

  function acceptInvite(invite: RoomInvite) {
    if (!db) return;
    remove(ref(db, `roomInvites/${uid}/${invite.id}`)).catch(() => {});
    setLocation(`/room/${invite.roomCode}`);
  }

  async function createBotRoom(difficulty: "easy" | "normal" | "hard") {
    if (!db) return;
    setCreating(true);
    let code = "";
    for (let i = 0; i < 10; i++) {
      code = generateCode();
      const ex = await get(ref(db, `rooms/${code}`)).catch(() => ({ exists: () => false }));
      if (!ex.exists()) break;
    }
    const startingTurn: import("../types").PlayerKey = Math.random() < 0.5 ? "player1" : "player2";
    const initialState: GameState = {
      status: "playing",
      players: {
        player1: { uid, displayName, avatar: data?.avatar || "", profilePhoto: data?.profilePhoto || "" },
        player2: { uid: "bot", displayName: "🤖 RingBot", avatar: "🤖", profilePhoto: "" },
      },
      colors: { player1: "orange", player2: "pink" },
      board: buildInitialBoard(),
      currentTurn: startingTurn,
      firstMoveDone: false,
      orangePieces: 12, pinkPieces: 12,
      createdAt: Date.now(), lastMoveAt: Date.now(),
      startedAt: Date.now(),
      pieceColors: { player1: pieceColor, player2: "pink" },
      difficulty,
    };
    await set(ref(db, `rooms/${code}`), initialState).catch(() => {});
    setCreating(false);
    setLocation(`/room/${code}`);
  }

  async function createBot4Room(difficulty: "easy" | "normal" | "hard") {
    if (!db) return;
    setCreating(true);
    let code = "";
    for (let i = 0; i < 10; i++) {
      code = generateCode();
      const ex = await get(ref(db, `rooms4/${code}`)).catch(() => ({ exists: () => false }));
      if (!ex.exists()) break;
    }
    const board = buildInitialBoard4();
    const pieces: Record<Player4Key, number> = { player1: 0, player2: 0, player3: 0, player4: 0 };
    for (const key of (["player1","player2","player3","player4"] as Player4Key[])) {
      pieces[key] = countPieces4(board, key);
    }
    const initialState = {
      status: "playing",
      players: {
        player1: { uid, displayName: displayName, avatar: data?.avatar || "", profilePhoto: data?.profilePhoto || "" },
        player2: { uid: "bot", displayName: "🤖 Bot 1" },
        player3: { uid: "bot", displayName: "🤖 Bot 2" },
        player4: { uid: "bot", displayName: "🤖 Bot 3" },
      },
      board,
      currentTurn: "player1" as Player4Key,
      eliminated: {},
      pieces,
      winner: null,
      inCombo: false,
      comboFrom: null,
      createdAt: Date.now(),
      lastMoveAt: Date.now(),
      difficulty,
    };
    await set(ref(db, `rooms4/${code}`), initialState).catch(() => {});
    localStorage.setItem(`ringwar-4p-key-${code}`, "player1");
    setCreating(false);
    setLocation(`/room4/${code}`);
  }

  async function createPrivateRoom() {
    if (!db) return;
    setCreating(true);
    let code = "";
    for (let i = 0; i < 10; i++) {
      code = generateCode();
      const ex = await get(ref(db, `rooms/${code}`)).catch(() => ({ exists: () => false }));
      if (!ex.exists()) break;
    }
    const initialState: GameState = {
      status: "waiting",
      players: { player1: { uid, displayName, avatar: data?.avatar || "", profilePhoto: data?.profilePhoto || "" } },
      colors: { player1: "orange", player2: "pink" },
      board: buildInitialBoard(),
      currentTurn: "player1",
      firstMoveDone: false,
      orangePieces: 12, pinkPieces: 12,
      createdAt: Date.now(), lastMoveAt: Date.now(),
      pieceColors: { player1: pieceColor, player2: "pink" },
    };
    await set(ref(db, `rooms/${code}`), initialState).catch(() => {});
    setCreating(false);
    setLocation(`/room/${code}`);
  }

  async function joinAsSpectator() {
    if (!db) return;
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setJoinError("Enter a valid room code"); return; }
    setJoinError("");
    const snap = await get(ref(db, `rooms/${code}`)).catch(() => null);
    if (!snap || !snap.exists()) { setJoinError("Room not found"); return; }
    setLocation(`/room/${code}`);
  }

  async function joinPrivateRoom() {
    if (!db) return;
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setJoinError("Enter a valid room code"); return; }
    setJoinError("");
    const snap = await get(ref(db, `rooms/${code}`)).catch(() => null);
    if (!snap || !snap.exists()) { setJoinError("Room not found"); return; }
    const state = snap.val() as GameState;
    if (state.status !== "waiting") { setJoinError("Game already started"); return; }
    if (state.players.player2) { setJoinError("Room is full"); return; }
    if (state.players.player1?.uid === uid) { setJoinError("That's your own room"); return; }
    const myPieceColor: PieceColor = (state.pieceColors?.player1 || "orange") === pieceColor
      ? (pieceColor === "orange" ? "pink" : "orange") : pieceColor;
    await set(ref(db, `rooms/${code}/players/player2`), { uid, displayName, avatar: data?.avatar || "", profilePhoto: data?.profilePhoto || "" });
    await set(ref(db, `rooms/${code}/pieceColors/player2`), myPieceColor).catch(() => {});
    setLocation(`/room/${code}`);
  }

  if (screen === "bot_select") return (
    <div className="screen-bg">
      <div className="w-full max-w-sm mx-auto px-5 space-y-5 animate-slide-up">
        <button onClick={() => setScreen("home")} className="flex items-center gap-2 text-xs theme-text-muted mb-2">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="text-center">
          <div className="text-2xl font-black tracking-widest shimmer-text mb-1">🤖 VS BOT</div>
          <div className="text-xs theme-text-muted">Challenge the AI and sharpen your skills</div>
        </div>

        {/* Battle Mode */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <div className="text-xs font-bold theme-text-muted uppercase tracking-widest">Battle Mode</div>
          <div className="grid grid-cols-2 gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setBotMode("2p")}
              className="py-3 px-4 rounded-xl text-sm font-bold transition-all"
              style={{
                background: botMode === "2p" ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "var(--bg-card-inner)",
                color: botMode === "2p" ? "#000" : "var(--text-muted)",
                border: botMode === "2p" ? "none" : "1px solid var(--border-color)",
              }}>
              ⚔️ 1v1
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setBotMode("4p")}
              className="py-3 px-4 rounded-xl text-sm font-bold transition-all"
              style={{
                background: botMode === "4p" ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "var(--bg-card-inner)",
                color: botMode === "4p" ? "#fff" : "var(--text-muted)",
                border: botMode === "4p" ? "none" : "1px solid var(--border-color)",
              }}>
              👥 1v3 Bots
            </motion.button>
          </div>
          <div className="text-[11px] theme-text-muted text-center">
            {botMode === "2p" ? "You vs 1 AI opponent" : "You vs 3 AI opponents · Free-for-all"}
          </div>
        </div>

        {/* Difficulty */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <div className="text-xs font-bold theme-text-muted uppercase tracking-widest">Difficulty</div>
          <div className="grid grid-cols-3 gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setBotDifficulty("easy")}
              className="py-3 px-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: botDifficulty === "easy" ? "linear-gradient(135deg,#1e40af,#3b82f6)" : "var(--bg-card-inner)",
                color: botDifficulty === "easy" ? "#fff" : "var(--text-muted)",
                border: botDifficulty === "easy" ? "none" : "1px solid var(--border-color)",
              }}>
              🟡 Easy
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setBotDifficulty("normal")}
              className="py-3 px-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: botDifficulty === "normal" ? "linear-gradient(135deg,#065f46,#059669)" : "var(--bg-card-inner)",
                color: botDifficulty === "normal" ? "#fff" : "var(--text-muted)",
                border: botDifficulty === "normal" ? "none" : "1px solid var(--border-color)",
              }}>
              🟢 Normal
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setBotDifficulty("hard")}
              className="py-3 px-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: botDifficulty === "hard" ? "linear-gradient(135deg,#b91c1c,#ef4444)" : "var(--bg-card-inner)",
                color: botDifficulty === "hard" ? "#fff" : "var(--text-muted)",
                border: botDifficulty === "hard" ? "none" : "1px solid var(--border-color)",
              }}>
              🔴 Hard
            </motion.button>
          </div>
          <div className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
            {botDifficulty === "easy" && "🟡 Bot looks 1 move ahead — great for beginners"}
            {botDifficulty === "normal" && "🟢 Bot looks 3 moves ahead — a fair challenge"}
            {botDifficulty === "hard" && "🔴 Bot looks 6 moves ahead — extremely difficult!"}
          </div>
        </div>

        {/* Start */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (botMode === "2p") {
              setLocation(`/bot/${botDifficulty}`);
            } else if (isOffline || !db) {
              setLocation(`/bot4/${botDifficulty}`);
            } else {
              createBot4Room(botDifficulty);
            }
          }}
          disabled={creating}
          className="w-full py-4 rounded-2xl text-base font-black disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}>
          {creating ? "Starting…" : "⚔️  START BATTLE"}
        </motion.button>
      </div>
    </div>
  );

  if (screen === "mode_select") return (
    <div className="screen-bg">
      <div className="w-full max-w-sm mx-auto px-5 space-y-5 animate-slide-up">
        <button onClick={() => setScreen("home")} className="flex items-center gap-2 text-xs theme-text-muted mb-2">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="text-center">
          <div className="text-2xl font-black tracking-widest shimmer-text mb-1">SELECT MODE</div>
          <div className="text-xs theme-text-muted">Choose your battle type</div>
        </div>
        {/* 2-Player Quick Match */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => requireAuth(() => setScreen("quickmatch"))}
          className="w-full rounded-2xl p-5 text-left relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#1a0a00,#3d1200,#7f2d00)", border: "1px solid rgba(245,158,11,0.35)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%,rgba(239,68,68,0.2),transparent 70%)" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)" }}>
              <Zap size={22} className="text-amber-400" fill="#f59e0b" />
            </div>
            <div>
              <div className="text-lg font-black text-white">2-PLAYER</div>
              <div className="text-xs text-amber-400 font-bold">Online Matchmaking</div>
              <div className="text-[11px] theme-text-muted mt-0.5">1v1 ranked battle</div>
            </div>
            <div className="ml-auto px-4 py-2 rounded-xl text-xs font-black text-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>PLAY</div>
          </div>
        </motion.button>
        {/* 4-Player Quick Match */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => requireAuth(() => setLocation("/quickmatch4"))}
          className="w-full rounded-2xl p-5 text-left relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#0d0720,#160b30,#0a0d20)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%,rgba(139,92,246,0.2),transparent 70%)" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <span className="text-xl">⚔️</span>
            </div>
            <div>
              <div className="text-lg font-black text-white">4-PLAYER</div>
              <div className="text-xs font-bold" style={{ color: "#a78bfa" }}>Online Matchmaking</div>
              <div className="text-[11px] theme-text-muted mt-0.5">Free-for-all chaos</div>
            </div>
            <div className="ml-auto px-4 py-2 rounded-xl text-xs font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>PLAY</div>
          </div>
        </motion.button>
        {/* Hot Seat (offline 4P) */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => setLocation("/offline4")}
          className="w-full rounded-2xl p-4 text-left"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-3">
            <Gamepad2 size={18} className="text-green-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-black theme-text-primary">4-PLAYER HOT SEAT</div>
              <div className="text-[11px] theme-text-muted">Offline · Pass the device</div>
            </div>
            <ChevronRight size={14} className="ml-auto theme-text-muted" />
          </div>
        </motion.button>
      </div>
    </div>
  );
  if (screen === "offline_mode_select") return (
    <div className="screen-bg">
      <div className="w-full max-w-sm mx-auto px-5 space-y-5 animate-slide-up">
        <button onClick={() => setScreen("home")} className="flex items-center gap-2 text-xs theme-text-muted mb-2">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="text-center">
          <div className="text-2xl font-black tracking-widest shimmer-text mb-1">OFFLINE PLAY</div>
          <div className="text-xs theme-text-muted">No internet needed · Pass &amp; play</div>
        </div>
        {/* 2-Player Offline */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => setLocation("/offline")}
          className="w-full rounded-2xl p-5 text-left relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#0a1f0a,#0d2d0d,#0a1a0a)", border: "1px solid rgba(34,197,94,0.35)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%,rgba(34,197,94,0.15),transparent 70%)" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}>
              <Gamepad2 size={22} className="text-green-400" />
            </div>
            <div>
              <div className="text-lg font-black text-white">2-PLAYER</div>
              <div className="text-xs text-green-400 font-bold">Hot Seat · Same Device</div>
              <div className="text-[11px] theme-text-muted mt-0.5">Take turns on one screen</div>
            </div>
            <div className="ml-auto px-4 py-2 rounded-xl text-xs font-black text-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>PLAY</div>
          </div>
        </motion.button>
        {/* 4-Player Offline */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => setLocation("/offline4")}
          className="w-full rounded-2xl p-5 text-left relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#0d0720,#160b30,#0a0d20)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%,rgba(139,92,246,0.2),transparent 70%)" }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <span className="text-xl">⚔️</span>
            </div>
            <div>
              <div className="text-lg font-black text-white">4-PLAYER</div>
              <div className="text-xs font-bold" style={{ color: "#a78bfa" }}>Hot Seat · Same Device</div>
              <div className="text-[11px] theme-text-muted mt-0.5">Four players, one screen</div>
            </div>
            <div className="ml-auto px-4 py-2 rounded-xl text-xs font-black text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>PLAY</div>
          </div>
        </motion.button>
      </div>
    </div>
  );
  if (screen === "quickmatch") return <QuickMatch uid={uid} name={displayName} pieceColor={pieceColor} avatar={data?.avatar || ""} profilePhoto={data?.profilePhoto || ""} onCancel={() => setScreen("home")} />;
  if (screen === "leaderboard") return <Leaderboard uid={uid} onClose={() => setScreen("home")} />;
  if (screen === "friends") return <Friends uid={uid} myName={displayName} onClose={() => setScreen("home")} onInvite={() => setScreen("home")} />;

  const NAV_ITEMS: { id: NavItem; label: string; icon: React.ReactNode; badge?: number; action?: () => void }[] = [
    { id: "home",        label: "HOME",        icon: <Home size={16} />,       action: () => { setActiveNav("home"); setSidebarOpen(false); } },
    { id: "play",        label: "PLAY",        icon: <Play size={16} />,       action: () => { setActiveNav("play"); setScreen("mode_select"); } },
    { id: "watch",       label: "WATCH",       icon: <Eye size={16} />,        badge: activeRoomCount || undefined, action: () => { setActiveNav("watch"); setScreen("watch"); setSidebarOpen(false); } },
    { id: "friends",     label: "FRIENDS",     icon: <UserPlus size={16} />,   badge: roomInvites.length || undefined, action: () => { setActiveNav("friends"); setScreen("friends"); } },
    { id: "leaderboard", label: "LEADERBOARD", icon: <Trophy size={16} />,     action: () => { setActiveNav("leaderboard"); setScreen("leaderboard"); } },
    { id: "rooms",       label: "ROOMS",       icon: <LayoutGrid size={16} />, action: () => { setActiveNav("rooms"); setSidebarOpen(false); setJoinOpen(true); } },
    { id: "store",       label: "STORE",       icon: <ShoppingBag size={16} />,action: () => { setActiveNav("store"); setScreen("shop"); setSidebarOpen(false); } },
    { id: "history",     label: "HISTORY",     icon: <Clock size={16} />,       action: () => { setActiveNav("history"); setLocation("/history"); } },
    { id: "support",     label: "SUPPORT",     icon: <HelpCircle size={16} />, action: () => { setActiveNav("support"); setLocation("/support"); } },
    { id: "settings",    label: "SETTINGS",    icon: <Settings size={16} />,   action: () => { setActiveNav("settings"); setLocation("/profile"); } },
  ];

  function requireAuth(cb: () => void) {
    if (!isOnline) { setAuthBlock("no-internet"); return; }
    // In online viewMode guests have explicitly chosen to go online — let them through
    if (isGuest && viewMode === "offline") { setAuthBlock("login"); return; }
    cb();
  }

  function goOnline() {
    if (!isOnline) { setAuthBlock("no-internet"); return; }
    import("../lib/offlineMode").then(m => m.setOfflineModePreferred(false));
    setViewMode("online");
    setScreen("home");
    setActiveNav("home");
    // Reload so Firebase / multiplayer subsystems can initialize cleanly.
    setTimeout(() => window.location.reload(), 50);
  }

  function goOffline() {
    import("../lib/offlineMode").then(m => m.setOfflineModePreferred(true));
    setViewMode("offline");
    setScreen("home");
    setActiveNav("home");
    // Reload so any active Firebase / Photon / Agora listeners are torn down.
    setTimeout(() => window.location.reload(), 50);
  }

  function openGlobalChat() {
    setGlobalChatOpen(true);
    setSidebarOpen(false);
    if (!db) return;
    onValue(ref(db, "globalChat"), (snap) => {
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      setLastGlobalRead(count);
      localStorage.setItem("ringwar-globalchat-read", String(count));
      setGlobalChatUnread(0);
    }, { onlyOnce: true });
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      <AnimatePresence>
        {screen === "shop" && <Shop onClose={() => setScreen("home")} />}
        {screen === "watch" && (
          <ActiveGames onSpectate={(code) => { setScreen("home"); setLocation(`/spectate/${code}`); }} onClose={() => setScreen("home")} />
        )}
        {globalChatOpen && (
          <GlobalChat uid={uid} onClose={() => setGlobalChatOpen(false)} onlineCount={onlineCount} />
        )}

        {/* ── Guest Onboarding: Age → Gender → Name ── */}
        {showOnboarding && (
          <motion.div
            key="onboarding-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)" }}
            >
              {/* Progress bar — only steps 1-3 */}
              <div className="h-1 w-full" style={{ background: "var(--border-color)" }}>
                <motion.div
                  className="h-1 rounded-full"
                  style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)" }}
                  animate={{ width: onboardStep === 0 ? "0%" : `${(onboardStep / 3) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>

              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center space-y-1">
                  {onboardStep > 0 && (
                    <div className="text-xs theme-text-muted font-semibold tracking-wider">
                      STEP {onboardStep} OF 3
                    </div>
                  )}
                  <div className="text-xl font-black shimmer-text">
                    {onboardStep === 0 ? "Ring War ⚔️"
                      : onboardStep === 1 ? "Your Age"
                      : onboardStep === 2 ? "Your Gender"
                      : "Your Name"}
                  </div>
                  <div className="text-sm theme-text-muted">
                    {onboardStep === 0
                      ? "How do you want to play?"
                      : onboardStep === 1
                      ? "Enter your exact age (5–100)"
                      : onboardStep === 2
                      ? "Select your gender"
                      : "Enter your player name"}
                  </div>
                </div>

                {/* Step 0 — Welcome: Login / Guest / Offline */}
                {onboardStep === 0 && (
                  <div className="space-y-3">
                    {/* Login */}
                    <button
                      onClick={async () => {
                        setShowOnboarding(false);
                        localStorage.setItem("ringwar-setup-done", "1");
                        await onLogin();
                      }}
                      className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                      style={{ background: "#fff", color: "#1a1a1a", border: "1px solid #e5e7eb" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Login with Google
                    </button>

                    {/* Guest */}
                    <button
                      onClick={() => setOnboardStep(1)}
                      className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                      style={{
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#f59e0b",
                      }}
                    >
                      👤 Play as Guest
                    </button>

                    {/* Offline */}
                    <button
                      onClick={() => {
                        localStorage.setItem("ringwar-name",      "Warrior");
                        localStorage.setItem("ringwar-setup-done","1");
                        setName("Warrior");
                        setShowOnboarding(false);
                      }}
                      className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                      style={{
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        color: "#22c55e",
                      }}
                    >
                      <Gamepad2 size={16} /> Play Offline (no login)
                    </button>

                    <div className="text-center text-xs theme-text-muted pt-1">
                      Quick Match &amp; Private Rooms require a login
                    </div>
                  </div>
                )}

                {/* Step 1 — Age */}
                {onboardStep === 1 && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={tempAge}
                        onChange={(e) => setTempAge(e.target.value)}
                        onKeyDown={(e) => {
                          const v = parseInt(tempAge, 10);
                          if (e.key === "Enter" && v >= 5 && v <= 100) setOnboardStep(2);
                        }}
                        placeholder="Apni age enter karein…"
                        autoFocus
                        className="w-full px-4 py-4 rounded-2xl text-2xl font-black text-center outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border-strong)",
                          color: "var(--text-primary)",
                          MozAppearance: "textfield",
                        }}
                      />
                    </div>
                    <button
                      disabled={!(parseInt(tempAge, 10) >= 5 && parseInt(tempAge, 10) <= 100)}
                      onClick={() => setOnboardStep(2)}
                      className="w-full py-3.5 rounded-2xl text-base font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}
                    >
                      Next →
                    </button>
                  </div>
                )}

                {/* Step 2 — Gender */}
                {onboardStep === 2 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Male",   emoji: "♂️", value: "male"   },
                        { label: "Female", emoji: "♀️", value: "female" },
                        { label: "Other",  emoji: "⚧️", value: "other"  },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setTempGender(opt.value); setOnboardStep(3); }}
                          className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all active:scale-95 font-bold text-sm"
                          style={{
                            background: tempGender === opt.value
                              ? "rgba(139,92,246,0.2)"
                              : "rgba(255,255,255,0.05)",
                            border: tempGender === opt.value
                              ? "2px solid rgba(139,92,246,0.7)"
                              : "1px solid var(--border-color)",
                          }}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <span className="theme-text-primary">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setOnboardStep(1)}
                      className="w-full py-2 rounded-xl text-xs theme-text-muted"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {/* Step 3 — Name */}
                {onboardStep === 3 && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value.slice(0, 16))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tempName.trim().length >= 2) {
                            const n = tempName.trim();
                            localStorage.setItem("ringwar-name",      n);
                            localStorage.setItem("ringwar-gender",    tempGender);
                            localStorage.setItem("ringwar-age",       tempAge);
                            localStorage.setItem("ringwar-setup-done","1");
                            setName(n);
                            setShowOnboarding(false);
                          }
                        }}
                        placeholder="Enter your warrior name…"
                        autoFocus
                        className="w-full px-4 py-3.5 rounded-2xl text-base font-bold outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border-strong)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs theme-text-muted font-mono">
                        {tempName.length}/16
                      </span>
                    </div>

                    {/* Recap chips */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                        🎂 {tempAge}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
                        {tempGender === "male" ? "♂️ Male"
                          : tempGender === "female" ? "♀️ Female"
                          : tempGender === "other" ? "⚧️ Other"
                          : "🤐 Private"}
                      </span>
                    </div>

                    <button
                      disabled={tempName.trim().length < 2}
                      onClick={() => {
                        const n = tempName.trim();
                        localStorage.setItem("ringwar-name",      n);
                        localStorage.setItem("ringwar-gender",    tempGender);
                        localStorage.setItem("ringwar-age",       tempAge);
                        localStorage.setItem("ringwar-setup-done","1");
                        setName(n);
                        setShowOnboarding(false);
                      }}
                      className="w-full py-3.5 rounded-2xl text-base font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}
                    >
                      Enter the Ring ⚔️
                    </button>

                    <button
                      onClick={() => setOnboardStep(2)}
                      className="w-full py-2 rounded-xl text-xs theme-text-muted"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      ← Back
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Auth / Internet Block Modal ── */}
        {authBlock && (
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setAuthBlock(null); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="w-full max-w-sm rounded-3xl p-6 space-y-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)" }}
            >
              {authBlock === "no-internet" ? (
                <>
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                      style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <WifiOff size={28} className="text-red-400" />
                    </div>
                    <div className="text-xl font-black theme-text-primary">No Internet</div>
                    <div className="text-sm theme-text-muted leading-relaxed">
                      An internet connection is required for Quick Match and Private Rooms.
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 space-y-2"
                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div className="text-xs font-bold text-green-400 mb-2">Play without internet:</div>
                    <button onClick={() => { setAuthBlock(null); setScreen("offline_mode_select"); }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                      <Gamepad2 size={16} /> Play Offline
                    </button>
                    <button onClick={() => { setAuthBlock(null); setScreen("bot_select"); }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                      🤖 VS Bot
                    </button>
                  </div>
                  <button onClick={() => setAuthBlock(null)}
                    className="w-full py-3 rounded-xl text-sm font-bold theme-text-muted theme-btn-secondary">
                    Close
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-1">
                    <div className="text-xl font-black shimmer-text">Ring War ⚔️</div>
                    <div className="text-sm theme-text-muted">How do you want to play?</div>
                  </div>

                  {/* Login with Google */}
                  <button
                    onClick={async () => {
                      setAuthBlock(null);
                      await onLogin();
                    }}
                    className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                    style={{ background: "#fff", color: "#1a1a1a", border: "1px solid #e5e7eb" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Login with Google
                  </button>

                  {/* Guest */}
                  <button
                    onClick={() => setAuthBlock(null)}
                    className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f59e0b",
                    }}>
                    👤 Play as Guest
                  </button>

                  {/* Offline */}
                  <button
                    onClick={() => { setAuthBlock(null); setScreen("offline_mode_select"); }}
                    className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.25)",
                      color: "#22c55e",
                    }}>
                    <Gamepad2 size={16} /> Play Offline (no login)
                  </button>

                  <div className="text-center text-xs theme-text-muted">
                    Quick Match &amp; Private Rooms require a login
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════ MOBILE BOTTOM NAV ════════════════ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border-strong)", paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
        {(viewMode === "offline" ? [
          { id: "home" as NavItem,     icon: <Home size={20} />,        label: "HOME",    action: () => { setActiveNav("home"); setScreen("home"); } },
          { id: "play" as NavItem,     icon: <Gamepad2 size={20} />,    label: "OFFLINE", action: () => { setActiveNav("play"); setScreen("offline_mode_select"); } },
          { id: "watch" as NavItem,    icon: <span className="text-lg">🤖</span>, label: "BOT",  action: () => { setActiveNav("watch"); setScreen("bot_select"); } },
          { id: "store" as NavItem,    icon: <ShoppingBag size={20} />, label: "STORE",   action: () => { setActiveNav("store"); setScreen("shop"); } },
          { id: "settings" as NavItem, icon: <Settings size={20} />,    label: "PROFILE", action: () => { setActiveNav("settings"); setLocation("/profile"); } },
        ] : [
          { id: "home" as NavItem,        icon: <Home size={20} />,        label: "HOME",    action: () => { setActiveNav("home"); setScreen("home"); } },
          { id: "play" as NavItem,        icon: <Zap size={20} />,         label: "PLAY",    action: () => { setActiveNav("play"); setScreen("mode_select"); } },
          { id: "friends" as NavItem,     icon: <Users size={20} />,       label: "FRIENDS", badge: roomInvites.length || undefined, action: () => { setActiveNav("friends"); setScreen("friends"); } },
          { id: "leaderboard" as NavItem, icon: <Trophy size={20} />,      label: "RANK",    action: () => { setActiveNav("leaderboard"); setScreen("leaderboard"); } },
          { id: "store" as NavItem,       icon: <ShoppingBag size={20} />, label: "STORE",   action: () => { setActiveNav("store"); setScreen("shop"); } },
        ]).map(item => {
          const active = activeNav === item.id;
          return (
            <button key={item.id} onClick={item.action}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all"
              style={{ color: active ? "#f59e0b" : "var(--text-muted)" }}
            >
              {item.badge ? (
                <span className="absolute top-1.5 right-1/2 translate-x-4 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
              {item.icon}
              <span className="text-[9px] font-bold tracking-wider">{item.label}</span>
              {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>

      {/* Static sidebar for md+ screens */}
      <aside className="hidden md:flex w-[185px] flex-shrink-0 flex-col h-full"
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border-color)" }}>
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
            <Zap size={18} className="text-black" fill="black" />
          </div>
          <div>
            <div className="text-sm font-black tracking-widest" style={{ color: "#f59e0b" }}>RING WAR</div>
            <div className="text-[9px] theme-text-muted flex items-center gap-1">
              {isOffline ? <><WifiOff size={8} className="text-red-400" /> Offline</> : <><Wifi size={8} className="text-green-400" /> {onlineCount} online</>}
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.filter(item => viewMode === "online" || ["home","store","settings","support"].includes(item.id)).map(item => {
            const active = activeNav === item.id;
            return (
              <button key={item.id} onClick={item.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all relative"
                style={{
                  background: active ? "rgba(245,158,11,0.12)" : "transparent",
                  color: active ? "#f59e0b" : "var(--text-muted)",
                  borderLeft: active ? "3px solid #f59e0b" : "3px solid transparent",
                }}
              >
                {item.icon}
                {item.label}
                {item.badge ? (
                  <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">

        {/* ── Mobile top bar (no hamburger — bottom nav handles navigation) ── */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-color)" }}>
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
              <Zap size={14} className="text-black" fill="black" />
            </div>
            <span className="text-sm font-black tracking-widest" style={{ color: "#f59e0b" }}>RING WAR</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={openGlobalChat} className="relative p-1.5 rounded-xl theme-btn-secondary">
              <MessageSquare size={15} className="text-amber-400" />
              {globalChatUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                  {globalChatUnread > 9 ? "9+" : globalChatUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={`p-4 md:p-5 space-y-4 flex-1 ${proUser ? "pb-24 md:pb-5" : "pb-44 md:pb-16"}`}>

          {/* ── Invites ── */}
          <AnimatePresence>
            {roomInvites.map(invite => (
              <motion.div key={invite.id}
                initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.08))", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Bell size={15} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-amber-400">Game Invite!</div>
                  <div className="text-xs theme-text-muted truncate">{invite.fromName} invited you</div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => acceptInvite(invite)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>Join</button>
                  <button onClick={() => remove(ref(db!, `roomInvites/${uid}/${invite.id}`)).catch(() => {})}
                    className="p-1.5 rounded-xl theme-btn-secondary"><X size={11} className="theme-text-muted" /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Player Card ── */}
          <motion.div layout className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            onClick={() => isGuest ? onLogin() : setLocation("/profile")}
            whileTap={{ scale: 0.99 }}
          >
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl font-black overflow-hidden"
                style={{ background: `linear-gradient(135deg,${myColor}30,${myColor}10)`, border: `2px solid ${myColor}60`, color: myColor }}>
                {data?.profilePhoto
                  ? <img src={data.profilePhoto} alt="avatar" className="w-full h-full object-cover" />
                  : (data?.avatar || displayName.charAt(0).toUpperCase())}
              </div>
              {!isGuest && <div className="absolute -bottom-1 -right-1"><RankBadge league={league} size="md" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-black theme-text-primary">{displayName}</div>
              {isGuest ? (
                <div className="text-xs mt-0.5" style={{ color: "#f59e0b" }}>
                  Guest — tap to login
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: league.color }}>{league.icon} {league.leagueLabel}</span>
                    <span className="text-xs theme-text-muted">· {wins}W · {losses}L</span>
                  </div>
                  {league.nextLeague && (
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: league.gradient }}
                        initial={{ width: 0 }} animate={{ width: `${league.progress * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                    </div>
                  )}
                </>
              )}
            </div>
            {isGuest ? (
              <div className="px-3 py-1.5 rounded-xl text-xs font-black flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000" }}>
                LOGIN
              </div>
            ) : (
              <ChevronRight size={16} className="theme-text-muted flex-shrink-0" />
            )}
          </motion.div>

          {/* ── Offline Mode Hero Banner (offline/guest viewMode) ── */}
          {viewMode === "offline" && (
            <motion.div
              className="w-full rounded-2xl overflow-hidden relative text-left"
              style={{
                background: "linear-gradient(135deg,#051a0a 0%,#0a2d10 30%,#0d3d14 60%,#051a0a 100%)",
                border: "1px solid rgba(34,197,94,0.35)",
                minHeight: 110,
              }}
            >
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%,rgba(34,197,94,0.2) 0%,transparent 70%)" }} />
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-green-400"
                  style={{ left: `${8 + i * 18}%`, top: `${20 + (i % 3) * 25}%` }}
                  animate={{ y: [-4, 4, -4], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "easeInOut" }} />
              ))}
              <div className="relative z-10 p-5 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}>
                  <Gamepad2 size={24} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl font-black text-white">OFFLINE MODE</div>
                  <div className="text-xs font-bold text-green-400 mb-1">LOCAL PLAY · NO INTERNET NEEDED</div>
                  <div className="text-xs theme-text-muted">Hot seat, bot matches — play anywhere</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Quick Match Hero Banner (online mode only) ── */}
          {viewMode === "online" && !isOffline && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => requireAuth(() => setScreen("mode_select"))}
              className="w-full rounded-2xl overflow-hidden relative text-left"
              style={{
                background: "linear-gradient(135deg,#1a0a00 0%,#3d1200 30%,#7f2d00 60%,#1a0a00 100%)",
                border: "1px solid rgba(245,158,11,0.3)",
                minHeight: 120,
              }}
            >
              {/* Glow overlay */}
              <div className="absolute inset-0" style={{
                background: "radial-gradient(ellipse at 70% 50%,rgba(239,68,68,0.25) 0%,transparent 70%)",
              }} />
              {/* Animated particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div key={i}
                  className="absolute w-1 h-1 rounded-full bg-amber-400"
                  style={{ left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
                  animate={{ y: [-4, 4, -4], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
              <div className="relative z-10 p-5 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)" }}>
                  <Zap size={24} className="text-amber-400" fill="#f59e0b" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl md:text-2xl font-black text-white">QUICK MATCH</div>
                  <div className="text-xs font-bold text-amber-400 mb-1">AUTO MATCHMAKING</div>
                  <div className="text-xs theme-text-muted">Jump into the battle and test your skills</div>
                </div>
                <div className="hidden md:block flex-shrink-0">
                  <div className="px-6 py-2.5 rounded-xl text-sm font-black text-black"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
                    PLAY NOW
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 md:hidden"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
                  <Play size={16} className="text-black" fill="black" />
                </div>
              </div>
            </motion.button>
          )}

          {/* ── Three Action Cards ── */}
          <div className={`grid gap-3 ${viewMode === "offline" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
            {/* Private Room — ONLINE ONLY */}
            {viewMode === "online" && (
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => requireAuth(() => setScreen("private_create"))}
                className="rounded-2xl p-4 text-left transition-all card-accent-purple">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)" }}>
                    <Users size={18} className="text-purple-400" />
                  </div>
                  <ChevronRight size={14} className="theme-text-muted mt-1" />
                </div>
                <div className="text-sm font-black theme-text-primary">PRIVATE ROOM</div>
                <div className="text-[11px] theme-text-muted mt-1">Create or join private matches</div>
              </motion.button>
            )}

            {/* Play Offline */}
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setScreen("offline_mode_select")}
              className="rounded-2xl p-4 text-left transition-all card-accent-green">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <Gamepad2 size={18} className="text-green-400" />
                </div>
                <ChevronRight size={14} className="theme-text-muted mt-1" />
              </div>
              <div className="text-sm font-black theme-text-primary">PLAY OFFLINE</div>
              <div className="text-[11px] theme-text-muted mt-1">Hot seat · same device</div>
            </motion.button>

            {/* VS BOT */}
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setScreen("bot_select")}
              className="rounded-2xl p-4 text-left transition-all"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  🤖
                </div>
                <ChevronRight size={14} className="theme-text-muted mt-1" />
              </div>
              <div className="text-sm font-black theme-text-primary">VS BOT</div>
              <div className="text-[11px] theme-text-muted mt-1">Easy, Normal or Hard difficulty</div>
            </motion.button>
          </div>

          {/* Join Room input panel */}
          <AnimatePresence>
            {joinOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold theme-text-primary">Join with Code</div>
                  {/* Player / Spectate toggle */}
                  <div className="flex rounded-xl overflow-hidden text-[10px] font-bold" style={{ border: "1px solid var(--border-color)" }}>
                    <button
                      onClick={() => setSpectateMode(false)}
                      className="px-3 py-1.5 transition-all"
                      style={{ background: !spectateMode ? "rgba(245,158,11,0.2)" : "transparent", color: !spectateMode ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
                      ⚔️ Play
                    </button>
                    <button
                      onClick={() => setSpectateMode(true)}
                      className="px-3 py-1.5 transition-all"
                      style={{ background: spectateMode ? "rgba(59,130,246,0.2)" : "transparent", color: spectateMode ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                      👁 Watch
                    </button>
                  </div>
                </div>
                <input
                  className="theme-input w-full px-4 py-3 rounded-xl outline-none uppercase tracking-widest text-center font-black text-base"
                  placeholder="ENTER CODE"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === "Enter") spectateMode ? joinAsSpectator() : joinPrivateRoom(); }}
                  maxLength={6} autoCapitalize="characters"
                />
                {joinError && <p className="text-red-400 text-xs text-center">{joinError}</p>}
                {spectateMode && (
                  <p className="text-blue-400 text-xs text-center flex items-center justify-center gap-1">
                    <Eye size={11} /> You will watch the game without playing
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={spectateMode ? joinAsSpectator : joinPrivateRoom}
                    className="flex-1 py-3 text-sm font-bold rounded-xl"
                    style={{ background: spectateMode ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : undefined }}
                  >
                    <span className={spectateMode ? "text-white" : "btn-gold"} style={spectateMode ? {} : {}}>
                      {spectateMode ? "👁 Watch Game" : "Join Room"}
                    </span>
                  </button>
                  <button onClick={() => { setJoinOpen(false); setJoinCode(""); setJoinError(""); setSpectateMode(false); }}
                    className="px-4 py-3 rounded-xl text-sm theme-btn-secondary theme-text-muted">Cancel</button>
                </div>
              </motion.div>
            )}
            {screen === "private_create" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="rounded-2xl p-4 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <div className="text-sm font-bold theme-text-primary">Private Room</div>

                {/* Create room */}
                <div className="space-y-2">
                  <div className="text-[11px] theme-text-muted uppercase tracking-widest font-bold">Create</div>
                  <button onClick={createPrivateRoom} disabled={creating || isOffline}
                    className="w-full btn-gold py-3 text-sm font-bold disabled:opacity-50 rounded-xl flex items-center justify-center gap-2">
                    <Users size={15} />
                    {creating ? "Creating..." : "Create Room for Friends"}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
                  <span className="text-[10px] theme-text-muted">OR</span>
                  <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
                </div>

                {/* Join with code */}
                <div className="space-y-2">
                  <div className="text-[11px] theme-text-muted uppercase tracking-widest font-bold">Join with Code</div>
                  <div className="flex items-center gap-1 text-[10px] rounded-lg px-2 py-1 mb-1"
                    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                    <Eye size={10} className="text-blue-400 flex-shrink-0" />
                    <button onClick={() => setSpectateMode(false)} className="px-2 py-0.5 rounded font-bold transition-all"
                      style={{ background: !spectateMode ? "rgba(245,158,11,0.2)" : "transparent", color: !spectateMode ? "#f59e0b" : "rgba(255,255,255,0.35)" }}>
                      ⚔️ Play
                    </button>
                    <button onClick={() => setSpectateMode(true)} className="px-2 py-0.5 rounded font-bold transition-all"
                      style={{ background: spectateMode ? "rgba(59,130,246,0.2)" : "transparent", color: spectateMode ? "#60a5fa" : "rgba(255,255,255,0.35)" }}>
                      👁 Watch
                    </button>
                  </div>
                  <input
                    className="theme-input w-full px-4 py-3 rounded-xl outline-none uppercase tracking-widest text-center font-black text-base"
                    placeholder="ENTER CODE"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") spectateMode ? joinAsSpectator() : joinPrivateRoom(); }}
                    maxLength={6} autoCapitalize="characters"
                  />
                  {joinError && <p className="text-red-400 text-xs text-center">{joinError}</p>}
                  <button
                    onClick={spectateMode ? joinAsSpectator : joinPrivateRoom}
                    className="w-full py-3 text-sm font-bold rounded-xl"
                    style={{ background: spectateMode ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}>
                    {spectateMode ? "👁 Watch Game" : "Join Room"}
                  </button>
                </div>

                <button onClick={() => { setScreen("home"); setJoinCode(""); setJoinError(""); setSpectateMode(false); }}
                  className="w-full text-xs theme-text-muted py-1">Cancel</button>
              </motion.div>
            )}
          </AnimatePresence>


          {/* ── How to Play ── */}
          <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="text-xs font-bold theme-text-muted uppercase tracking-widest mb-3">HOW TO PLAY</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: "🎯", title: "First Move", desc: "Your first move must go to the center node." },
                { icon: "⚔️", title: "Jump Over", desc: "Jump over enemy pieces to capture them." },
                { icon: "🔥", title: "Combo Attacks", desc: "Chain captures for devastating combos." },
              ].map(tip => (
                <div key={tip.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    {tip.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold theme-text-primary">{tip.title}</div>
                    <div className="text-[11px] theme-text-muted mt-0.5">{tip.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* ════════════════ RIGHT PANEL ════════════════ */}
      <aside className="hidden lg:flex w-[260px] xl:w-[280px] flex-shrink-0 flex-col h-full overflow-y-auto"
        style={{ background: "var(--bg-card)", borderLeft: "1px solid var(--border-color)" }}>

        {/* Header row */}
        <div className="px-4 py-4 flex-shrink-0 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="text-xs font-bold theme-text-muted uppercase tracking-widest">Stats</div>
        </div>

        <div className="p-4 space-y-4 flex-1">

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black theme-text-primary tracking-wider">EVENTS</span>
              <span className="text-[10px] text-amber-400 font-semibold cursor-pointer">VIEW ALL</span>
            </div>
            <div className="rounded-2xl p-3.5" style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-start gap-3">
                <div>
                  <div className="text-xs font-black text-amber-400">WEEKEND WARRIOR</div>
                  <div className="text-[11px] theme-text-muted mt-0.5 leading-relaxed">Win matches and earn exclusive rewards!</div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-[10px] theme-text-muted">⏱</span>
                    <span className="text-[10px] font-bold text-amber-400/70">2d 14h 35m</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-3xl">🎁</div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${i === 0 ? "bg-amber-400" : "bg-white/10"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Online Friends */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black theme-text-primary tracking-wider">FRIENDS</span>
              <button onClick={() => setScreen("friends")} className="text-[10px] text-amber-400 font-semibold">SEE ALL</button>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "ShadowX",    status: "Online",   color: "#22c55e" },
                { name: "Hunter99",   status: "In Match",  color: "#f97316" },
                { name: "Blaze",      status: "Online",   color: "#22c55e" },
                { name: "NightFury",  status: "Offline",  color: "#6b7280" },
              ].map(friend => (
                <div key={friend.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                  style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg,${friend.color}40,${friend.color}20)`, border: `1px solid ${friend.color}50` }}>
                    {friend.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold theme-text-primary truncate">{friend.name}</div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: friend.color }} />
                      <span className="text-[10px]" style={{ color: friend.color }}>{friend.status}</span>
                    </div>
                  </div>
                  <button className="w-6 h-6 rounded-full flex items-center justify-center theme-btn-secondary">
                    <Plus size={10} className="theme-text-muted" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="text-xs font-black theme-text-primary tracking-wider mb-2.5">QUICK STATS</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Wins",   value: wins,   color: "#22c55e" },
                { label: "Losses", value: losses, color: "#ef4444" },
                { label: "Rank",   value: league.leagueLabel, color: league.color },
                { label: "Streak", value: data?.winStreak ?? 0, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}>
                  <div className="text-base font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] theme-text-muted uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Desktop Ad Slot */}
        {!proUser && (
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)" }}>
            <div style={{ height: 200, width: "100%", background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Advertisement · 300×200
              </span>
            </div>
          </div>
        )}

        {/* Global Chat button */}
        <div className="px-4 pb-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
          <button
            onClick={openGlobalChat}
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 relative transition-all"
            style={{
              background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(168,85,247,0.08))",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#f59e0b",
            }}
          >
            <MessageSquare size={13} />
            Global Chat
            {globalChatUnread > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                {globalChatUnread > 9 ? "9+" : globalChatUnread}
              </span>
            )}
          </button>
        </div>

        {/* Watch live button */}
        {activeRoomCount > 0 && (
          <div className="p-4 pt-0 flex-shrink-0">
            <button onClick={() => setScreen("watch")}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#3b82f6" }}>
              <Eye size={13} /> Watch Live ({activeRoomCount})
            </button>
          </div>
        )}
      </aside>

      {/* ── Floating Mode Toggle Button ── */}
      <AnimatePresence>
        {(isGuest || isOffline) && (
          <motion.button
            key="mode-toggle"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 300 }}
            onClick={viewMode === "offline" ? goOnline : goOffline}
            className="fixed right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black shadow-2xl"
            style={{
              bottom: proUser ? "76px" : "118px",
              ...(viewMode === "offline"
                ? { background: "linear-gradient(135deg,#0ea5e9,#3b82f6)", color: "#fff", boxShadow: "0 4px 20px rgba(14,165,233,0.45)" }
                : { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e", boxShadow: "0 4px 20px rgba(34,197,94,0.25)" }
              ),
            }}
          >
            {viewMode === "offline"
              ? <><Wifi size={14} /> Online Khelo</>
              : <><WifiOff size={14} /> Offline Mode</>
            }
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Fixed Bottom Ad Strip (all screens) ── */}
      {!proUser && (
        <div
          className="fixed left-0 right-0 z-30 flex items-center justify-center bottom-[62px] md:bottom-0"
          style={{ height: 50, background: "rgba(8,8,20,0.94)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-full mx-4 md:max-w-[728px]"
            style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 6 }}
          >
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.07)", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Advertisement
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
