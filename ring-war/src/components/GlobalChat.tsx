import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "../firebase";
import { X, Send, Globe, Smile, ChevronDown, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "../contexts/PlayerContext";

/* ── Types ─────────────────────────────────────────────────── */
interface GlobalMsg {
  id: string;
  uid: string;
  name: string;
  text: string;
  at: number;
  isPremium?: boolean;
  league?: string;
}

interface TypingUser { name: string; at: number }

/* ── Constants ─────────────────────────────────────────────── */
const BAD_WORDS = ["fuck", "shit", "ass", "bitch", "cunt", "nigger", "faggot", "retard"];
function filterMsg(text: string): string {
  let t = text;
  for (const w of BAD_WORDS) {
    t = t.replace(new RegExp(w, "gi"), "*".repeat(w.length));
  }
  return t;
}

const QUICK = ["GG!", "Hello!", "Anyone up for a game?", "gg wp", "🔥", "👑", "Let's play!", "Nice game!"];

const LANGS = [
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

const LEAGUE_ICONS: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎",
  diamond: "💠", crown: "👑", legend: "⚡",
};

function isPremiumUser(data: ReturnType<typeof usePlayer>["data"]): boolean {
  if (!data) return false;
  if (data.wins >= 20) return true;
  const legendary = ["piece_inferno_king","piece_galaxy_phantom","piece_thunder_titan",
    "piece_shadow_reaper","piece_crystal_dragon","piece_divine_emperor"];
  return legendary.includes(data.equippedSkins?.piece ?? "");
}

/* ── Single message row ─────────────────────────────────────── */
function GlobalMsgRow({
  msg, isOwn, myUid, onTranslate, targetLang,
}: {
  msg: GlobalMsg; isOwn: boolean; myUid: string;
  onTranslate: (text: string, targetLang: string) => Promise<string>;
  targetLang: string;
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [showOrig, setShowOrig] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (isOwn || targetLang === "en") return;
    let cancelled = false;
    setTranslating(true);
    onTranslate(msg.text, targetLang).then(result => {
      if (!cancelled) { setTranslated(result); setTranslating(false); setShowOrig(false); }
    });
    return () => { cancelled = true; };
  }, [msg.text, targetLang, isOwn, onTranslate]);

  async function doTranslate() {
    if (translated && !showOrig) { setShowOrig(true); return; }
    if (showOrig) { setShowOrig(false); return; }
    setTranslating(true);
    const t = await onTranslate(msg.text, targetLang);
    setTranslated(t);
    setTranslating(false);
  }

  const displayText = translated && !showOrig ? translated : msg.text;
  const leagueIcon = msg.league ? (LEAGUE_ICONS[msg.league] ?? "") : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1.5`}
    >
      <div className={`max-w-[82%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        {!isOwn && (
          <span className="text-[10px] ml-1 mb-0.5 font-semibold flex items-center gap-0.5"
            style={{ color: msg.isPremium ? "#f59e0b" : "rgba(255,255,255,0.3)" }}>
            {leagueIcon && <span>{leagueIcon}</span>}
            {msg.isPremium && <span>👑</span>}
            {msg.name}
          </span>
        )}

        <div
          className="rounded-2xl px-3.5 py-2.5 relative overflow-hidden"
          style={{
            background: isOwn
              ? msg.isPremium
                ? "linear-gradient(135deg, rgba(245,158,11,0.28), rgba(239,68,68,0.18))"
                : "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))"
              : "rgba(255,255,255,0.06)",
            border: isOwn
              ? `1px solid ${msg.isPremium ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.2)"}`
              : "1px solid rgba(255,255,255,0.07)",
            boxShadow: isOwn && msg.isPremium ? "0 0 16px rgba(245,158,11,0.12)" : undefined,
          }}
        >
          <p className="text-sm leading-snug" style={{ color: isOwn ? "#fde68a" : "rgba(255,255,255,0.85)", wordBreak: "break-word" }}>
            {displayText}
          </p>
          <span className="text-[9px] opacity-25 mt-1 block">
            {new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Kingshot-style translate button below bubble */}
        <button
          onClick={doTranslate}
          className={`flex items-center gap-1 mt-0.5 text-[10px] font-medium transition-all ${isOwn ? "self-end" : "self-start"}`}
          style={{ color: translating ? "#f59e0b" : "rgba(255,255,255,0.28)" }}
        >
          {translating ? (
            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
              Translating...
            </motion.span>
          ) : translated ? (
            showOrig ? "▲ Show translation" : "▲ Show original"
          ) : (
            "🌐 Translate"
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ── Props ─────────────────────────────────────────────────── */
interface Props {
  uid: string;
  onClose: () => void;
  onlineCount?: number;
}

/* ── GlobalChat ─────────────────────────────────────────────── */
export default function GlobalChat({ uid, onClose, onlineCount = 0 }: Props) {
  const { data, league } = usePlayer();
  const [messages, setMessages] = useState<GlobalMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [targetLang, setTargetLang] = useState(() => localStorage.getItem("ringwar-chat-lang") ?? "en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [typing, setTyping] = useState<Record<string, TypingUser>>({});
  const [filterEnabled] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myName = data?.name || localStorage.getItem("ringwar-name") || "Warrior";
  const amPremium = isPremiumUser(data);
  const selectedLang = LANGS.find(l => l.code === targetLang) ?? LANGS[0];

  /* Messages feed */
  useEffect(() => {
    if (!db) return;
    const chatRef = ref(db, "globalChat");
    return onValue(chatRef, (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const d = snap.val() as Record<string, Omit<GlobalMsg, "id">>;
      const sorted = Object.entries(d)
        .map(([id, v]) => ({ ...v, id }))
        .sort((a, b) => a.at - b.at)
        .slice(-100);
      setMessages(sorted);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Typing indicator */
  useEffect(() => {
    if (!db) return;
    const tRef = ref(db, "globalTyping");
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
  }, [uid]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (!db) return;
    update(ref(db, `globalTyping/${uid}`), { name: myName, at: Date.now() }).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (db) remove(ref(db, `globalTyping/${uid}`)).catch(() => {});
    }, 3000);
  }

  async function sendMessage(textOverride?: string) {
    if (!db) return;
    const raw = (textOverride ?? input).trim();
    if (!raw) return;
    const text = filterEnabled ? filterMsg(raw) : raw;
    setSending(true);
    try {
      await push(ref(db, "globalChat"), {
        uid,
        name: myName,
        text,
        at: Date.now(),
        isPremium: amPremium,
        league: league.league,
      });
      if (!textOverride) setInput("");
      remove(ref(db, `globalTyping/${uid}`)).catch(() => {});
    } finally {
      setSending(false);
    }
  }

  const doTranslate = useCallback(translateText, []);
  const typingNames = Object.values(typing).map(t => t.name);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: "linear-gradient(160deg, #0b1525 0%, #060d1a 100%)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Globe size={16} className="text-amber-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <span className="font-black text-white text-sm tracking-wide">GLOBAL CHAT</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <Users size={9} className="text-green-400" />
            <span className="text-[10px] font-bold text-green-400">{onlineCount} online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(p => !p)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
            >
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
                  <div className="p-1.5 text-[10px] text-white/30 font-bold px-3 pt-2">Translate to:</div>
                  {LANGS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setTargetLang(l.code); localStorage.setItem("ringwar-chat-lang", l.code); setShowLangPicker(false); }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs hover:bg-white/5 transition-colors"
                      style={{ color: targetLang === l.code ? "#f59e0b" : "rgba(255,255,255,0.7)" }}
                    >
                      <span>{l.flag}</span>{l.label}
                      {targetLang === l.code && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <X size={14} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ overscrollBehavior: "contain" }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-16 space-y-3"
          >
            <div className="text-4xl">🌍</div>
            <div className="text-white/20 text-sm font-medium">Global chat is empty</div>
            <div className="text-white/15 text-xs">Be the first to say hello!</div>
          </motion.div>
        )}

        {messages.map((m) => (
          <GlobalMsgRow
            key={m.id}
            msg={m}
            isOwn={m.uid === uid}
            myUid={uid}
            onTranslate={doTranslate}
            targetLang={targetLang}
          />
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingNames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 ml-1 mt-1"
            >
              <div className="flex gap-1 px-3 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/40"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-white/25">
                {typingNames.slice(0, 2).join(", ")}{typingNames.length > 2 ? ` +${typingNames.length - 2}` : ""} typing...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Quick replies ── */}
      <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        {QUICK.map(q => (
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

      {/* ── Emoji quick row ── */}
      <div className="flex gap-2 px-3 pb-1 overflow-x-auto no-scrollbar flex-shrink-0">
        {["😂", "🔥", "👑", "💀", "❤️", "⚡", "🎯", "👍", "😮", "💎"].map(e => (
          <motion.button
            key={e}
            whileTap={{ scale: 0.75 }}
            onClick={() => sendMessage(e)}
            className="text-xl flex-shrink-0"
          >
            {e}
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
            className="w-full rounded-2xl px-4 py-3 text-white outline-none"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 15,
            }}
            placeholder={amPremium ? "✨ Chat with the world..." : "Chat with everyone..."}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            maxLength={120}
            enterKeyHint="send"
            autoComplete="off"
          />
          {input.length > 90 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/25">
              {120 - input.length}
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
                ? "linear-gradient(135deg, #f59e0b, #a855f7)"
                : "linear-gradient(135deg, #f59e0b, #d97706)"
              : "rgba(255,255,255,0.06)",
            opacity: sending ? 0.6 : 1,
            boxShadow: input.trim() ? "0 0 16px rgba(245,158,11,0.4)" : undefined,
          }}
        >
          <Send size={15} className="text-white" />
        </motion.button>
      </div>
    </motion.div>
  );
}
