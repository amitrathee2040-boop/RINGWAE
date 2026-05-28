import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ref, set } from "firebase/database";
import { db } from "../firebase";
import { PieceColor } from "../types";
import { colorOf, PIECE_COLORS } from "../game/colors";
import {
  ArrowLeft, Camera, Check, Edit3, ShoppingBag, Mail, FileText,
  User, X, Shield, Share2, Sun, Moon, Monitor, Copy, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer, getLeagueInfo, ALL_SKINS } from "../contexts/PlayerContext";
import RankBadge from "./RankBadge";
import Shop from "./Shop";

const LEAGUES = [
  { id: "bronze",   label: "Bronze",   minWins: 0,   icon: "🥉", color: "#cd7f32" },
  { id: "silver",   label: "Silver",   minWins: 5,   icon: "🥈", color: "#c0c0c0" },
  { id: "gold",     label: "Gold",     minWins: 15,  icon: "🥇", color: "#ffd700" },
  { id: "platinum", label: "Platinum", minWins: 30,  icon: "💎", color: "#e5e4e2" },
  { id: "diamond",  label: "Diamond",  minWins: 50,  icon: "💠", color: "#b9f2ff" },
  { id: "crown",    label: "Crown",    minWins: 80,  icon: "👑", color: "#ff6ec7" },
  { id: "legend",   label: "Legend",   minWins: 120, icon: "⚡", color: "#f59e0b" },
];

const AVATAR_EMOJIS = ["🔥","⚡","💎","👑","🌌","❄️","🌪️","☄️","🐉","👾","⚔️","🛡️","🎯","💥","🌊","🦅","🦁","🐺","🦊","🤖","😈","👻","🌟","🏆"];

const PROFILE_FRAMES = [
  { id: "none",    label: "None",     border: "2px solid rgba(255,255,255,0.15)", glow: "none" },
  { id: "gold",    label: "Gold",     border: "3px solid #f59e0b", glow: "0 0 14px #f59e0b80" },
  { id: "fire",    label: "Fire",     border: "3px solid #ef4444", glow: "0 0 14px #ef444480" },
  { id: "ice",     label: "Ice",      border: "3px solid #7dd3fc", glow: "0 0 14px #7dd3fc80" },
  { id: "galaxy",  label: "Galaxy",   border: "3px solid #a855f7", glow: "0 0 14px #a855f780" },
  { id: "diamond", label: "Diamond",  border: "3px solid #b9f2ff", glow: "0 0 18px #b9f2ff90" },
  { id: "legend",  label: "Legend",   border: "3px solid #f59e0b", glow: "0 0 22px #f59e0b, 0 0 40px #ef444460" },
];

export default function Profile({ uid }: { uid: string }) {
  const [, setLocation] = useLocation();
  const { data, theme, setTheme } = usePlayer();
  const [shopOpen, setShopOpen]             = useState(false);
  const [editMode, setEditMode]             = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showFramePicker, setShowFramePicker]   = useState(false);
  const [showShareToast, setShowShareToast]     = useState(false);
  const [nameInput, setNameInput]   = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [bioInput, setBioInput]     = useState("");
  const [saving, setSaving]         = useState(false);
  const [pieceColor, setPieceColor] = useState<PieceColor>("orange");
  const [selectedFrame, setSelectedFrame] = useState("none");
  const nameRef   = useRef<HTMLInputElement>(null);
  const photoRef  = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const bannerPhoto = data?.bannerPhoto || localStorage.getItem("ringwar-banner-photo") || "";

  const playerData  = data;
  const wins        = playerData?.wins ?? 0;
  const losses      = playerData?.losses ?? 0;
  const kills       = playerData?.kills ?? 0;
  const totalGames  = wins + losses;
  const winPct      = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const leagueInfo  = getLeagueInfo(wins);
  const displayName = playerData?.name || "Warrior";
  const email       = playerData?.email || "";
  const bio         = playerData?.bio || "";
  const avatar      = playerData?.avatar || "";
  const profilePhoto = playerData?.profilePhoto || "";
  const pc          = colorOf((localStorage.getItem("ringwar-piece-color") as PieceColor) || "orange");

  const shortId = uid.replace("offline-", "").slice(0, 8).toUpperCase();
  const playerId = `#RW-${shortId}`;

  const equippedSkins  = playerData?.equippedSkins;
  const equippedFrameId = equippedSkins?.frame ?? "frame_default";
  const equippedFrameSkin = ALL_SKINS.find(s => s.id === equippedFrameId);
  const frameStyle = equippedFrameSkin?.gradient
    ? { background: equippedFrameSkin.gradient, padding: 3, borderRadius: "50%", boxShadow: equippedFrameSkin.animated ? `0 0 18px ${equippedFrameSkin.color ?? "#f59e0b"}70` : undefined }
    : equippedFrameSkin?.color
      ? { border: `3px solid ${equippedFrameSkin.color}`, borderRadius: "50%", boxShadow: `0 0 14px ${equippedFrameSkin.color}60` }
      : { border: "3px solid var(--bg-primary)", borderRadius: "50%" };

  const customFrame = PROFILE_FRAMES.find(f => f.id === selectedFrame) ?? PROFILE_FRAMES[0];

  useEffect(() => {
    setNameInput(playerData?.name || "Warrior");
    setEmailInput(playerData?.email || "");
    setBioInput(playerData?.bio || "");
    setPieceColor((localStorage.getItem("ringwar-piece-color") as PieceColor) || "orange");
    const saved = localStorage.getItem("ringwar-profile-frame") || "none";
    setSelectedFrame(saved);
  }, [playerData]);

  useEffect(() => {
    if (editMode && nameRef.current) nameRef.current.focus();
  }, [editMode]);

  async function saveProfile() {
    setSaving(true);
    const patch = {
      name: nameInput.trim() || "Warrior",
      email: emailInput.trim(),
      bio: bioInput.trim(),
    };
    localStorage.setItem("ringwar-name", patch.name);
    if (db) {
      await Promise.all([
        set(ref(db, `players/${uid}/name`), patch.name),
        set(ref(db, `players/${uid}/email`), patch.email),
        set(ref(db, `players/${uid}/bio`), patch.bio),
        set(ref(db, `stats/${uid}/name`), patch.name),
        set(ref(db, `presence/${uid}/name`), patch.name),
      ]).catch(() => {});
    }
    setSaving(false);
    setEditMode(false);
  }

  async function saveAvatar(emoji: string) {
    if (db) set(ref(db, `players/${uid}/avatar`), emoji).catch(() => {});
    setShowAvatarPicker(false);
  }

  async function savePieceColor(c: PieceColor) {
    setPieceColor(c);
    localStorage.setItem("ringwar-piece-color", c);
    if (db) set(ref(db, `stats/${uid}/pieceColor`), c).catch(() => {});
  }

  function handlePhotoClick() {
    photoRef.current?.click();
  }

  function handleBannerClick() {
    bannerRef.current?.click();
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width  = 800;
        canvas.height = 280;
        const ctx = canvas.getContext("2d")!;
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const sw = canvas.width / scale;
        const sh = canvas.height / scale;
        const sx = (img.width  - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        if (db) {
          set(ref(db, `players/${uid}/bannerPhoto`), dataUrl).catch(() => {});
        } else {
          localStorage.setItem("ringwar-banner-photo", dataUrl);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width  = 128;
        canvas.height = 128;
        const ctx = canvas.getContext("2d")!;
        const size = Math.min(img.width, img.height);
        const ox = (img.width  - size) / 2;
        const oy = (img.height - size) / 2;
        ctx.drawImage(img, ox, oy, size, size, 0, 0, 128, 128);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        if (db) {
          set(ref(db, `players/${uid}/profilePhoto`), dataUrl).catch(() => {});
        } else {
          localStorage.setItem("ringwar-profile-photo", dataUrl);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function saveFrame(id: string) {
    setSelectedFrame(id);
    localStorage.setItem("ringwar-profile-frame", id);
    setShowFramePicker(false);
  }

  async function handleShare() {
    const url   = window.location.origin;
    const text  = `Challenge me on Ring War! I'm ${displayName} (${playerId}) — can you beat me? 🎮`;
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Ring War", text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  }

  const SKIN_CATS: Array<{ key: "piece" | "frame" | "trail" | "killEffect" | "winEffect" | "boardTheme"; label: string }> = [
    { key: "piece",      label: "Piece" },
    { key: "frame",      label: "Frame" },
    { key: "trail",      label: "Trail" },
    { key: "killEffect", label: "Kill" },
    { key: "winEffect",  label: "Win" },
    { key: "boardTheme", label: "Board" },
  ];

  const avatarInner = (
    <motion.div whileTap={{ scale: 0.95 }} onClick={handlePhotoClick} className="cursor-pointer"
      style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden",
        background: profilePhoto ? "transparent" : `linear-gradient(135deg,${pc}40,${pc}15)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: profilePhoto ? undefined : "2.2rem", fontWeight: 900, color: pc,
      }}>
      {profilePhoto
        ? <img src={profilePhoto} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (avatar || displayName.charAt(0).toUpperCase())}
    </motion.div>
  );

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
      {/* Hidden file inputs */}
      <input ref={photoRef}  type="file" accept="image/*" className="hidden" style={{ display: "none" }} onChange={handlePhotoChange} />
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" style={{ display: "none" }} onChange={handleBannerChange} />

      <AnimatePresence>
        {shopOpen && <Shop onClose={() => setShopOpen(false)} />}

        {/* Avatar Emoji Picker */}
        {showAvatarPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowAvatarPicker(false)}>
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
              className="w-full max-w-sm rounded-t-3xl p-5 pb-8"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black theme-text-primary">Choose Avatar</span>
                <button onClick={() => setShowAvatarPicker(false)} className="p-1.5 rounded-xl theme-btn-secondary">
                  <X size={14} className="theme-text-muted" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_EMOJIS.map(e => (
                  <button key={e} onClick={() => saveAvatar(e)}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all"
                    style={{
                      background: avatar === e ? "rgba(245,158,11,0.2)" : "var(--bg-card-inner)",
                      border: avatar === e ? "2px solid #f59e0b" : "1px solid var(--border-color)",
                    }}>
                    {e}
                  </button>
                ))}
                <button onClick={() => saveAvatar("")}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-bold transition-all theme-text-muted"
                  style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}>
                  A
                </button>
              </div>
              <button onClick={handlePhotoClick}
                className="mt-4 w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
                <Upload size={14} /> Upload Photo
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Profile Frame Picker */}
        {showFramePicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowFramePicker(false)}>
            <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
              className="w-full max-w-sm rounded-t-3xl p-5 pb-8"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black theme-text-primary">Profile Frame</span>
                <button onClick={() => setShowFramePicker(false)} className="p-1.5 rounded-xl theme-btn-secondary">
                  <X size={14} className="theme-text-muted" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {PROFILE_FRAMES.map(f => (
                  <button key={f.id} onClick={() => saveFrame(f.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                    style={{
                      background: selectedFrame === f.id ? "rgba(245,158,11,0.15)" : "var(--bg-card-inner)",
                      border: selectedFrame === f.id ? "2px solid #f59e0b" : "1px solid var(--border-color)",
                    }}>
                    <div className="w-10 h-10 rounded-full"
                      style={{ border: f.border, boxShadow: f.glow }} />
                    <span className="text-[10px] theme-text-muted font-semibold">{f.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Share Toast */}
        {showShareToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-black"
            style={{ transform: "translateX(-50%)", background: "linear-gradient(135deg,#f59e0b,#22c55e)" }}>
            <Copy size={14} /> Copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-lg mx-auto pb-12">

        {/* ── Cover + Avatar ── */}
        <div className="relative">
          {/* Banner */}
          <div className="h-44 w-full relative overflow-hidden">
            {bannerPhoto ? (
              <img src={bannerPhoto} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full relative"
                style={{ background: `linear-gradient(135deg,${leagueInfo.color}30 0%,${pc}20 50%,rgba(0,0,0,0.8) 100%),linear-gradient(135deg,#0f0a1a,#1a1040)` }}>
                <motion.div className="absolute inset-0"
                  animate={{ x: ["-100%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.06),transparent)", willChange: "transform" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center opacity-40">
                    <Camera size={22} className="text-white mx-auto mb-1" />
                    <div className="text-[11px] text-white font-semibold">Add Cover Photo</div>
                  </div>
                </div>
              </div>
            )}
            {/* Banner upload overlay button */}
            <button onClick={handleBannerClick}
              className="absolute bottom-2.5 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }}>
              <Camera size={12} />
              {bannerPhoto ? "Change Cover" : "Add Cover"}
            </button>
          </div>

          {/* Back + actions */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <button onClick={() => setLocation("/")}
              className="p-2 rounded-xl flex items-center gap-1.5"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <ArrowLeft size={15} className="text-white" />
              <span className="text-xs text-white font-semibold">Back</span>
            </button>
            <div className="flex gap-1.5">
              {/* Share */}
              <button onClick={handleShare}
                className="p-2 rounded-xl relative"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Share2 size={15} className="text-blue-400" />
              </button>
              {/* Shop */}
              <button onClick={() => setShopOpen(true)}
                className="p-2 rounded-xl"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <ShoppingBag size={15} className="text-amber-400" />
              </button>
              {/* Edit / Save */}
              <button onClick={() => editMode ? saveProfile() : setEditMode(true)}
                disabled={saving}
                className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                style={{
                  background: editMode ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(8px)",
                  border: editMode ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: editMode ? "#fff" : "rgba(255,255,255,0.8)",
                }}>
                {editMode ? (saving ? "Saving…" : <><Check size={13} /> Save</>) : <><Edit3 size={13} /> Edit</>}
              </button>
            </div>
          </div>

          {/* Avatar with frame */}
          <div className="absolute -bottom-14 left-5">
            <div className="relative">
              {/* Frame ring */}
              <div style={{
                borderRadius: "50%",
                border: customFrame.id !== "none" ? customFrame.border : "3px solid var(--bg-primary)",
                boxShadow: customFrame.id !== "none" ? customFrame.glow : undefined,
                display: "inline-block",
              }}>
                {/* Shop equipped frame ring (outer) */}
                {equippedFrameSkin && equippedFrameSkin.id !== "frame_default" && equippedFrameSkin.gradient ? (
                  <div style={{ ...frameStyle, display: "inline-block" }}>
                    {avatarInner}
                  </div>
                ) : avatarInner}
              </div>
              {/* Camera / upload button */}
              <button onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", border: "2px solid var(--bg-primary)" }}>
                <Camera size={12} className="text-black" />
              </button>
              {/* Frame button */}
              <button onClick={() => setShowFramePicker(true)}
                className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: "rgba(30,30,60,0.9)", border: "1.5px solid rgba(255,255,255,0.15)" }}
                title="Change frame">
                🖼
              </button>
              {/* Rank badge */}
              <div className="absolute -top-1 -right-1">
                <RankBadge league={leagueInfo} size="md" animated />
              </div>
            </div>
          </div>
        </div>

        {/* ── Profile Info ── */}
        <div className="pt-20 px-5">

          {/* Name + handle */}
          {editMode ? (
            <input ref={nameRef}
              className="theme-input w-full px-3 py-2 rounded-xl outline-none text-xl font-black theme-text-primary mb-1"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              maxLength={16}
              placeholder="Display name"
            />
          ) : (
            <div className="text-xl font-black theme-text-primary">{displayName}</div>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
            <span className="text-xs theme-text-muted">@{displayName.toLowerCase().replace(/\s+/g, "")} · {leagueInfo.leagueLabel} {leagueInfo.icon}</span>
          </div>
          {/* Unique Player ID */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>
              <Shield size={10} />
              {playerId}
            </div>
            <button onClick={async () => {
              await navigator.clipboard.writeText(playerId).catch(() => {});
              setShowShareToast(true);
              setTimeout(() => setShowShareToast(false), 2000);
            }} className="p-1 rounded-md theme-btn-secondary" title="Copy ID">
              <Copy size={11} className="theme-text-muted" />
            </button>
          </div>

          {/* Stat row */}
          <div className="flex gap-0 mb-4">
            {[
              { value: wins,           label: "Wins"  },
              { value: kills,          label: "Kills" },
              { value: totalGames,     label: "Games" },
              { value: `${winPct}%`,   label: "Win%"  },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 text-center py-2 ${i > 0 ? "border-l border-divider" : ""}`}>
                <div className="text-base font-black theme-text-primary">{s.value}</div>
                <div className="text-[10px] theme-text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          <div className="mb-3">
            {editMode ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <FileText size={13} className="text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Bio</span>
                </div>
                <textarea
                  className="theme-input w-full px-3 pb-3 outline-none text-sm resize-none"
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  maxLength={120}
                  rows={3}
                  placeholder="Tell the world about yourself…"
                  style={{ background: "transparent" }}
                />
              </div>
            ) : bio ? (
              <p className="text-sm theme-text-secondary leading-relaxed">{bio}</p>
            ) : (
              <button onClick={() => setEditMode(true)} className="text-sm text-amber-400/60 italic">+ Add a bio</button>
            )}
          </div>

          {/* Email */}
          <div className="mb-5">
            {editMode ? (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <Mail size={13} className="text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Email</span>
                  <span className="text-[9px] theme-text-muted ml-auto">Private</span>
                </div>
                <input
                  className="theme-input w-full px-3 pb-3 outline-none text-sm"
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  maxLength={64}
                  placeholder="your@email.com"
                  style={{ background: "transparent" }}
                />
              </div>
            ) : email ? (
              <div className="flex items-center gap-2 text-sm theme-text-muted">
                <Mail size={13} className="text-amber-400/60" />
                <span>{email}</span>
                <Shield size={10} className="text-green-400/60 ml-auto" />
                <span className="text-[10px] text-green-400/60">Private</span>
              </div>
            ) : (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-2 text-sm text-amber-400/60 italic">
                <Mail size={13} /> Add email
              </button>
            )}
          </div>

          {/* ── Theme Toggle ── */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2 mb-3">
              {theme === "light" ? <Sun size={13} className="text-amber-400" /> : theme === "dark" ? <Moon size={13} className="text-blue-400" /> : <Monitor size={13} className="text-purple-400" />}
              <div className="text-xs font-black theme-text-muted uppercase tracking-wider">Theme</div>
            </div>
            <div className="flex gap-2">
              {([
                { id: "dark",  icon: <Moon size={14} />,    label: "Dark",  active: "from-blue-600 to-indigo-700" },
                { id: "light", icon: <Sun size={14} />,     label: "Light", active: "from-amber-400 to-orange-500" },
                { id: "auto",  icon: <Monitor size={14} />, label: "Auto",  active: "from-purple-600 to-pink-600" },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold transition-all ${theme === t.id ? `bg-gradient-to-br ${t.active} text-white` : "theme-btn-secondary theme-text-muted"}`}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── League Progress ── */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black theme-text-muted uppercase tracking-wider">League Road</div>
              <div className="text-xs font-bold" style={{ color: leagueInfo.color }}>{leagueInfo.icon} {leagueInfo.leagueLabel}</div>
            </div>
            <div className="flex items-center gap-0 mb-3">
              {LEAGUES.map(l => {
                const reached   = wins >= l.minWins;
                const isCurrent = leagueInfo.league === l.id;
                return (
                  <div key={l.id} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm relative"
                      style={{
                        background: reached ? `${l.color}25` : "rgba(255,255,255,0.04)",
                        border: `2px solid ${reached ? `${l.color}60` : "rgba(255,255,255,0.08)"}`,
                        boxShadow: isCurrent ? `0 0 12px ${l.color}60` : undefined,
                      }}>
                      {l.icon}
                      {isCurrent && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-black" />}
                    </div>
                  </div>
                );
              })}
            </div>
            {leagueInfo.nextLeague ? (
              <>
                <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: leagueInfo.gradient }}
                    initial={{ width: 0 }} animate={{ width: `${leagueInfo.progress * 100}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
                </div>
                <div className="flex justify-between text-[10px] theme-text-muted">
                  <span>{wins} wins</span>
                  <span>{leagueInfo.xpForNext} wins → {leagueInfo.nextLabel}</span>
                </div>
              </>
            ) : (
              <div className="text-center text-xs font-bold" style={{ color: leagueInfo.color }}>⚡ MAX RANK — LEGEND</div>
            )}
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Wins",   value: wins,               color: "#22c55e" },
              { label: "Losses", value: losses,             color: "#ef4444" },
              { label: "Win %",  value: `${winPct}%`,       color: "#f59e0b" },
              { label: "Kills",  value: kills,              color: "#a855f7" },
              { label: "Streak", value: data?.winStreak ?? 0,  color: "#3b82f6" },
              { label: "Best",   value: data?.bestStreak ?? 0, color: "#f97316" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] theme-text-muted uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Equipped Skins ── */}
          {equippedSkins && (
            <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-black theme-text-muted uppercase tracking-wider">Equipped</div>
                <button onClick={() => setShopOpen(true)} className="text-xs text-amber-400 font-bold">Change →</button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {SKIN_CATS.map(cat => {
                  const skinId = equippedSkins[cat.key as keyof typeof equippedSkins];
                  const skin   = ALL_SKINS.find(s => s.id === skinId);
                  return (
                    <div key={cat.key} className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                        style={{
                          background: skin?.gradient || (skin?.color ? `${skin.color}20` : "var(--bg-card-inner)"),
                          border: `1px solid ${skin?.color ? `${skin.color}40` : "var(--border-color)"}`,
                          boxShadow: skin?.animated ? `0 0 10px ${skin.color || "#f59e0b"}40` : undefined,
                        }}>
                        {skin?.icon || "⚪"}
                      </div>
                      <span className="text-[9px] theme-text-muted text-center leading-tight">{cat.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Piece Color ── */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2 mb-3">
              <User size={13} className="text-amber-400" />
              <div className="text-xs font-black theme-text-muted uppercase tracking-wider">Piece Color</div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {PIECE_COLORS.map(c => (
                <button key={c.id} onClick={() => savePieceColor(c.id)}
                  className="w-9 h-9 rounded-full transition-all"
                  style={{
                    background: c.color,
                    transform: pieceColor === c.id ? "scale(1.25)" : "scale(1)",
                    boxShadow: pieceColor === c.id ? `0 0 14px ${c.color}80` : "none",
                    border: pieceColor === c.id ? `2px solid ${c.color}` : "2px solid transparent",
                  }} title={c.label}
                />
              ))}
            </div>
          </div>

          {/* ── Collection + Share ── */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black theme-text-muted uppercase tracking-wider mb-1">My Collection</div>
                <div className="text-2xl font-black theme-text-primary">
                  {data?.ownedSkins?.length ?? 0}
                  <span className="text-sm font-normal theme-text-muted"> / {ALL_SKINS.length} skins</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)", width: 160 }}>
                  <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((data?.ownedSkins?.length ?? 0) / ALL_SKINS.length) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
              <button onClick={() => setShopOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-black"
                style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
                Browse Shop
              </button>
            </div>
          </div>

          {/* ── Share Card ── */}
          <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <Share2 size={18} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black theme-text-primary">Share Ring War</div>
                <div className="text-[11px] theme-text-muted">Invite friends to battle</div>
              </div>
              <button onClick={handleShare}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}>
                Share
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <span className="text-[11px] theme-text-muted flex-1 truncate">{window.location.origin}</span>
              <button onClick={async () => {
                await navigator.clipboard.writeText(window.location.origin).catch(() => {});
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 2000);
              }} className="flex-shrink-0">
                <Copy size={12} className="text-amber-400" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
