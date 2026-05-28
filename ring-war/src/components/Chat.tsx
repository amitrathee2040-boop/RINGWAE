import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "../firebase";
import { X, Send, Globe, Smile, VolumeX, Flag, Ban, Settings, ChevronDown, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "../contexts/PlayerContext";

/* ── Types ─────────────────────────────────────────────────── */
interface ChatMsg {
  id: string;
  uid: string;
  name: string;
  text: string;
  at: number;
  isPremium?: boolean;
  translated?: string;
}

interface TypingUser { name: string; at: number }

/* ── Constants ─────────────────────────────────────────────── */
const QUICK_MSGS = [
  "GG!", "Nice move!", "Good game", "Well played", "Let's go!",
  "gg wp", "Noice!", "Too easy 😎", "That was close!", "Rematch?",
  "GL HF", "lol", "No way!", "Respect 🤝", "MVP!",
];

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "🔥", "💀", "👑", "⚡", "🎯", "💎", "🤝", "💪"];

const REACTION_EMOJIS = ["🔥", "👍", "❤️", "😂", "💀", "👑"];

const BAD_WORDS = ["fuck", "shit", "ass", "bitch", "cunt", "nigger", "faggot", "retard"];

function filterMsg(text: string): string {
  let t = text;
  for (const w of BAD_WORDS) {
    const re = new RegExp(w, "gi");
    t = t.replace(re, "*".repeat(w.length));
  }
  return t;
}

const LANGS: { code: string; label: string; flag: string }[] = [
  { code: "en",       label: "English",    flag: "🇬🇧" },
  { code: "hinglish", label: "Hinglish",   flag: "🇮🇳" },
  { code: "hi",       label: "Hindi",      flag: "🇮🇳" },
  { code: "ur",       label: "Urdu",       flag: "🇵🇰" },
  { code: "bn",       label: "Bengali",    flag: "🇧🇩" },
  { code: "ar",       label: "Arabic",     flag: "🇸🇦" },
  { code: "es",       label: "Spanish",    flag: "🇪🇸" },
  { code: "pt",       label: "Portuguese", flag: "🇧🇷" },
  { code: "fr",       label: "French",     flag: "🇫🇷" },
  { code: "de",       label: "German",     flag: "🇩🇪" },
  { code: "it",       label: "Italian",    flag: "🇮🇹" },
  { code: "ru",       label: "Russian",    flag: "🇷🇺" },
  { code: "tr",       label: "Turkish",    flag: "🇹🇷" },
  { code: "nl",       label: "Dutch",      flag: "🇳🇱" },
  { code: "pl",       label: "Polish",     flag: "🇵🇱" },
  { code: "zh",       label: "Chinese",    flag: "🇨🇳" },
  { code: "ja",       label: "Japanese",   flag: "🇯🇵" },
  { code: "ko",       label: "Korean",     flag: "🇰🇷" },
  { code: "id",       label: "Indonesian", flag: "🇮🇩" },
  { code: "ms",       label: "Malay",      flag: "🇲🇾" },
  { code: "th",       label: "Thai",       flag: "🇹🇭" },
  { code: "vi",       label: "Vietnamese", flag: "🇻🇳" },
  { code: "tl",       label: "Filipino",   flag: "🇵🇭" },
  { code: "sw",       label: "Swahili",    flag: "🇰🇪" },
  { code: "el",       label: "Greek",      flag: "🇬🇷" },
];

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const apiRoot = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
    const res = await fetch(`${apiRoot}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return text;
    const data = await res.json() as { translated?: string };
    return data.translated ?? text;
  } catch {
    return text;
  }
}

function transliterateHinglish(hindi: string): string {
  const consonantBase: Record<string, string> = {
    "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ng",
    "च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"ny",
    "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n",
    "त":"t","थ":"th","द":"d","ध":"dh","न":"n",
    "प":"p","फ":"f","ब":"b","भ":"bh","म":"m",
    "य":"y","र":"r","ल":"l","व":"v",
    "श":"sh","ष":"sh","स":"s","ह":"h",
  };
  const vowelMark: Record<string, string> = {
    "ा":"a","ि":"i","ी":"i","ु":"u","ू":"u",
    "े":"e","ै":"ai","ो":"o","ौ":"au","ृ":"ri",
    "ं":"n","ः":"","ँ":"n",
  };
  const standalone: Record<string, string> = {
    "अ":"a","आ":"a","इ":"i","ई":"i","उ":"u","ऊ":"u",
    "ए":"e","ऐ":"ai","ओ":"o","औ":"au","ऋ":"ri",
  };
  const HALANT = "्";
  const chars = [...hindi];
  let result = "";
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    const next = chars[i + 1] ?? "";
    if (ch in consonantBase) {
      const base = consonantBase[ch];
      if (next === HALANT) {
        result += base; i += 2;
      } else if (next in vowelMark) {
        result += base + vowelMark[next]; i += 2;
      } else {
        const atWordEnd = !next || next === " " || /[!?.,;:\u0964\u0965]/.test(next);
        result += base + (atWordEnd ? "" : "a"); i++;
      }
    } else if (ch in standalone) {
      result += standalone[ch]; i++;
    } else if (ch in vowelMark) {
      result += vowelMark[ch]; i++;
    } else if (ch === HALANT) {
      i++;
    } else {
      result += ch; i++;
    }
  }
  return result;
}

function isPremiumUser(data: ReturnType<typeof usePlayer>["data"]): boolean {
  if (!data) return false;
  if (data.wins >= 20) return true;
  const eq = data.equippedSkins;
  const legendaryPieces = ["piece_inferno_king","piece_galaxy_phantom","piece_thunder_titan","piece_shadow_reaper","piece_crystal_dragon","piece_divine_emperor"];
  return legendaryPieces.includes(eq?.piece ?? "");
}

/* ── Bubble component ───────────────────────────────────────── */
function MsgBubble({
  msg, isOwn, isPremium, myUid, roomCode, blocked, onBlock, targetLang,
}: {
  msg: ChatMsg; isOwn: boolean; isPremium: boolean; myUid: string;
  roomCode: string; blocked: Set<string>; onBlock: (uid: string) => void;
  targetLang: string;
}) {
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (isOwn || targetLang === "en") return;
    let cancelled = false;
    setTranslating(true);
    translateText(msg.text, targetLang).then(result => {
      if (!cancelled) { setTranslated(result); setTranslating(false); setShowOriginal(false); }
    });
    return () => { cancelled = true; };
  }, [msg.text, targetLang, isOwn]);

  useEffect(() => {
    if (!db || !msg.id) return;
    const rRef = ref(db, `rooms/${roomCode}/reactions/${msg.id}`);
    return onValue(rRef, (snap) => {
      if (!snap.exists()) { setReactions({}); return; }
      const data = snap.val() as Record<string, Record<string, boolean>>;
      const result: Record<string, string[]> = {};
      for (const [emoji, uids] of Object.entries(data)) {
        result[emoji] = Object.keys(uids);
      }
      setReactions(result);
    });
  }, [msg.id, roomCode]);

  async function addReaction(emoji: string) {
    if (!db) return;
    const rRef = ref(db, `rooms/${roomCode}/reactions/${msg.id}/${emoji}/${myUid}`);
    const existing = reactions[emoji]?.includes(myUid);
    if (existing) {
      await remove(rRef);
    } else {
      await update(rRef.parent!.parent!.parent!, {
        [`${msg.id}/${emoji}/${myUid}`]: true,
      });
    }
    setShowReactPicker(false);
  }

  async function handleTranslate() {
    if (translated && !showOriginal) { setShowOriginal(true); return; }
    if (showOriginal) { setShowOriginal(false); return; }
    setTranslating(true);
    const result = await translateText(msg.text, targetLang);
    setTranslated(result);
    setTranslating(false);
  }

  const displayText = translated && !showOriginal ? translated : msg.text;
  const totalReactions = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-1`}
    >
      {/* Name */}
      {!isOwn && (
        <span
          className="text-[10px] font-bold ml-1 mb-0.5"
          style={{ color: isPremium ? "#f59e0b" : "rgba(255,255,255,0.35)" }}
        >
          {isPremium && <span className="mr-0.5">👑</span>}
          {msg.name}
        </span>
      )}

      <div className={`flex gap-1.5 items-end ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Bubble */}
        <div className="relative max-w-[76%]">
          <motion.div
            whileTap={{ scale: 0.98 }}
            onContextMenu={(e) => { e.preventDefault(); setShowOptions(true); }}
            onClick={() => { if (showOptions) setShowOptions(false); }}
            className="relative rounded-2xl px-3.5 py-2.5 cursor-pointer select-none"
            style={{
              background: isOwn
                ? isPremium
                  ? "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(239,68,68,0.2), rgba(168,85,247,0.15))"
                  : "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(245,158,11,0.12))"
                : "rgba(255,255,255,0.07)",
              border: isOwn
                ? isPremium
                  ? "1px solid rgba(245,158,11,0.45)"
                  : "1px solid rgba(245,158,11,0.22)"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: isPremium && isOwn
                ? "0 0 18px rgba(245,158,11,0.15)"
                : undefined,
              wordBreak: "break-word",
            }}
          >
            {/* Animated shimmer for premium own messages */}
            {isOwn && isPremium && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
                style={{ opacity: 0.25 }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                    animation: "shimmerSlide 2.5s infinite",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            )}

            <p className="text-sm leading-snug" style={{ color: isOwn ? "#fde68a" : "rgba(255,255,255,0.88)" }}>
              {displayText}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] opacity-25">
                {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </motion.div>

          {/* Kingshot-style translate button below bubble */}
          <button
            onClick={(e) => { e.stopPropagation(); handleTranslate(); }}
            className={`flex items-center gap-1 mt-0.5 text-[10px] font-medium transition-all ${isOwn ? "self-end" : "self-start"}`}
            style={{ color: translating ? "#f59e0b" : "rgba(255,255,255,0.28)" }}
          >
            {translating ? (
              <>
                <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
                  Translating...
                </motion.span>
              </>
            ) : translated ? (
              showOriginal ? "▲ Show translation" : "▲ Show original"
            ) : (
              "🌐 Translate"
            )}
          </button>

          {/* Options popup */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className={`absolute z-50 ${isOwn ? "right-0" : "left-0"} bottom-full mb-1 rounded-xl overflow-hidden`}
                style={{ background: "#1a2540", border: "1px solid rgba(255,255,255,0.1)", minWidth: 140 }}
              >
                {!isOwn && (
                  <>
                    <button
                      onClick={() => { onBlock(msg.uid); setShowOptions(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Ban size={12} /> Block user
                    </button>
                    <button
                      onClick={() => { setReported(true); setShowOptions(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-orange-400 hover:bg-orange-500/10 transition-colors"
                    >
                      <Flag size={12} /> {reported ? "Reported" : "Report"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => { navigator.clipboard?.writeText(msg.text); setShowOptions(false); }}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-white/50 hover:bg-white/5 transition-colors"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => setShowOptions(false)}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-white/30 hover:bg-white/5 transition-colors"
                >
                  <X size={12} /> Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* React button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowReactPicker(p => !p)}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Smile size={12} className="text-white/40" />
          </button>

          <AnimatePresence>
            {showReactPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute z-50 bottom-full mb-1 flex gap-1 p-1.5 rounded-xl ${isOwn ? "right-0" : "left-0"}`}
                style={{ background: "#1a2540", border: "1px solid rgba(255,255,255,0.12)", whiteSpace: "nowrap" }}
              >
                {REACTION_EMOJIS.map(emoji => (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 0.75 }}
                    whileHover={{ scale: 1.25 }}
                    onClick={() => addReaction(emoji)}
                    className="text-base leading-none p-0.5"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reactions strip */}
      {totalReactions.length > 0 && (
        <div className={`flex gap-1 mt-0.5 flex-wrap ${isOwn ? "justify-end mr-9" : "justify-start ml-1"}`}>
          {totalReactions.map(([emoji, uids]) => (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.85 }}
              onClick={() => addReaction(emoji)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
              style={{
                background: uids.includes(myUid) ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
                border: uids.includes(myUid) ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span>{emoji}</span>
              <span className="text-[10px] opacity-60">{uids.length}</span>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── Props ──────────────────────────────────────────────────── */
interface Props {
  uid: string;
  roomCode: string;
  myName: string;
  onClose: () => void;
  onRead: () => void;
}

/* ── Main Chat component ───────────────────────────────────── */
export default function Chat({ uid, roomCode, myName, onClose, onRead }: Props) {
  const { data } = usePlayer();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"chat" | "emoji">("chat");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem("ringwar-chat-lang") ?? "en");
  const [blocked, setBlocked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("ringwar-blocked") || "[]")); }
    catch { return new Set(); }
  });
  const [typing, setTyping] = useState<Record<string, TypingUser>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const amPremium = isPremiumUser(data);

  /* Messages */
  useEffect(() => {
    onRead();
    if (!db) return;
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    return onValue(chatRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const d = snap.val() as Record<string, Omit<ChatMsg, "id">>;
      const sorted = Object.entries(d)
        .map(([id, v]) => ({ ...v, id }))
        .sort((a, b) => a.at - b.at)
        .slice(-80);
      setMessages(sorted);
    });
  }, [roomCode, onRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Typing indicators */
  useEffect(() => {
    if (!db) return;
    const tRef = ref(db, `rooms/${roomCode}/typing`);
    return onValue(tRef, (snap) => {
      if (!snap.exists()) { setTyping({}); return; }
      const d = snap.val() as Record<string, TypingUser>;
      const now = Date.now();
      const active: Record<string, TypingUser> = {};
      for (const [k, v] of Object.entries(d)) {
        if (k !== uid && now - v.at < 5000) active[k] = v;
      }
      setTyping(active);
    });
  }, [roomCode, uid]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (!db) return;
    update(ref(db, `rooms/${roomCode}/typing/${uid}`), { name: myName || "You", at: Date.now() }).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (db) remove(ref(db, `rooms/${roomCode}/typing/${uid}`)).catch(() => {});
    }, 3000);
  }

  async function sendMessage(textOverride?: string) {
    if (!db) return;
    const raw = (textOverride ?? input).trim();
    if (!raw) return;
    const text = filterEnabled ? filterMsg(raw) : raw;
    setSending(true);
    try {
      await push(ref(db, `rooms/${roomCode}/chat`), {
        uid, name: myName || "You", text, at: Date.now(), isPremium: amPremium,
      });
      if (!textOverride) setInput("");
      remove(ref(db, `rooms/${roomCode}/typing/${uid}`)).catch(() => {});
    } finally {
      setSending(false);
    }
  }

  function blockUser(targetUid: string) {
    const next = new Set(blocked);
    next.add(targetUid);
    setBlocked(next);
    localStorage.setItem("ringwar-blocked", JSON.stringify([...next]));
  }

  const visibleMessages = messages.filter(m => !blocked.has(m.uid));
  const typingNames = Object.values(typing).map(t => t.name);
  const selectedLang = LANGS.find(l => l.code === targetLang) ?? LANGS[0];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: "linear-gradient(160deg, #0b1525 0%, #070d1a 100%)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-black text-white text-sm tracking-wide">CHAT</span>
          </div>
          {amPremium && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
              👑 Premium
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(p => !p)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
            >
              <Globe size={11} />
              <span>{selectedLang.flag}</span>
              <ChevronDown size={10} />
            </button>
            <AnimatePresence>
              {showLangPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.92 }}
                  className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
                  style={{ background: "#1a2540", border: "1px solid rgba(255,255,255,0.1)", minWidth: 160 }}
                >
                  <div className="p-1.5 text-[10px] text-white/30 font-bold px-3 pt-2">Translate messages to:</div>
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setTargetLang(l.code); localStorage.setItem("ringwar-chat-lang", l.code); setShowLangPicker(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs hover:bg-white/5 transition-colors"
                      style={{ color: targetLang === l.code ? "#f59e0b" : "rgba(255,255,255,0.7)" }}
                    >
                      <span>{l.flag}</span> {l.label}
                      {targetLang === l.code && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(p => !p)}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Settings size={13} className="text-white/40" />
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <X size={14} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white/70">Profanity Filter</div>
                <div className="text-[10px] text-white/30">Auto-censor offensive words</div>
              </div>
              <button
                onClick={() => setFilterEnabled(p => !p)}
                className="w-10 h-5 rounded-full transition-all relative"
                style={{ background: filterEnabled ? "#f59e0b" : "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: filterEnabled ? "calc(100% - 18px)" : "2px" }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-3 py-2 flex-shrink-0">
        {(["chat", "emoji"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t ? "rgba(245,158,11,0.15)" : "transparent",
              color: tab === t ? "#f59e0b" : "rgba(255,255,255,0.3)",
              border: `1px solid ${tab === t ? "rgba(245,158,11,0.3)" : "transparent"}`,
            }}
          >
            {t === "chat" ? "💬 Chat" : "😊 Emojis"}
          </button>
        ))}
      </div>

      {tab === "emoji" ? (
        /* ── Emoji tab ── */
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-[10px] text-white/30 font-bold mb-2 uppercase tracking-wider">Quick Emojis</div>
          <div className="grid grid-cols-6 gap-2">
            {EMOJI_LIST.map(e => (
              <motion.button
                key={e}
                whileTap={{ scale: 0.75 }}
                whileHover={{ scale: 1.2 }}
                onClick={() => { sendMessage(e); setTab("chat"); }}
                className="aspect-square flex items-center justify-center text-2xl rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {e}
              </motion.button>
            ))}
          </div>
          <div className="text-[10px] text-white/30 font-bold mt-4 mb-2 uppercase tracking-wider">Quick Messages</div>
          <div className="space-y-1.5">
            {QUICK_MSGS.map(q => (
              <motion.button
                key={q}
                whileTap={{ scale: 0.97 }}
                onClick={() => { sendMessage(q); setTab("chat"); }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
              >
                {q}
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        /* ── Chat tab ── */
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" style={{ overscrollBehavior: "contain" }}>
          {visibleMessages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-12 space-y-2"
            >
              <div className="text-3xl">💬</div>
              <div className="text-white/20 text-xs">No messages yet</div>
              <div className="text-white/15 text-[10px]">Say something to your opponent!</div>
            </motion.div>
          )}

          {visibleMessages.map((m) => (
            <MsgBubble
              key={m.id}
              msg={m}
              isOwn={m.uid === uid}
              isPremium={!!m.isPremium}
              myUid={uid}
              roomCode={roomCode}
              blocked={blocked}
              onBlock={blockUser}
              targetLang={targetLang}
            />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {typingNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2 ml-1"
              >
                <div className="flex gap-1 px-3 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-white/40"
                    animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-white/40"
                    animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-white/40"
                    animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <span className="text-[10px] text-white/25">{typingNames.join(", ")} typing...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Quick replies strip ── */}
      <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        {["GG!", "Nice!", "lol", "gg wp", "Rematch?", "👍", "🔥", "💀"].map((q) => (
          <motion.button
            key={q}
            whileTap={{ scale: 0.88 }}
            onClick={() => sendMessage(q)}
            className="text-xs px-3 py-1.5 rounded-full flex-shrink-0 whitespace-nowrap"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
          >
            {q}
          </motion.button>
        ))}
      </div>

      {/* ── Input bar ── */}
      <div
        className="px-3 flex gap-2 items-center flex-shrink-0"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))", paddingTop: 8 }}
      >
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            className="w-full rounded-2xl px-4 py-3 text-white outline-none pr-10"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 15,
            }}
            placeholder={amPremium ? "✨ Premium chat..." : "Say something..."}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            maxLength={100}
            enterKeyHint="send"
            autoComplete="off"
          />
          {input.length > 70 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/25">
              {100 - input.length}
            </span>
          )}
        </div>

        <motion.button
          onClick={() => sendMessage()}
          disabled={sending || !input.trim()}
          whileTap={{ scale: 0.88 }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: input.trim()
              ? amPremium
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "linear-gradient(135deg, #f59e0b, #d97706)"
              : "rgba(255,255,255,0.06)",
            opacity: sending ? 0.6 : 1,
            boxShadow: input.trim() ? "0 0 16px rgba(245,158,11,0.4)" : undefined,
          }}
        >
          <motion.div
            animate={sending ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Send size={15} className="text-white" />
          </motion.div>
        </motion.button>
      </div>

      <style>{`
        @keyframes shimmerSlide {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
