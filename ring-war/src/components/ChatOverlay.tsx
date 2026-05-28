/**
 * ChatOverlay — PUBG-style transparent text chat overlay
 *
 * Anchored to bottom-LEFT of the board (max 60% width) so the right
 * side remains fully clickable for game pieces.
 * Messages auto-fade after 6 s of inactivity (re-appear on new message).
 * VoicePanel is a separate component — this file handles text chat only.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "../firebase";
import { Send, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  uid: string;
  name: string;
  text: string;
  at: number;
}

// ── Profanity filter (replace bad words with asterisks) ───────────────────────
const BAD_WORDS = ["fuck", "shit", "ass", "bitch", "cunt", "nigger", "faggot", "retard"];
function filterMsg(text: string): string {
  let t = text;
  for (const w of BAD_WORDS) {
    t = t.replace(new RegExp(w, "gi"), "*".repeat(w.length));
  }
  return t;
}

const QUICK_MSGS  = ["GG!", "Nice move!", "gg wp", "Rematch?", "👍", "🔥", "💀", "lol"];
const MSG_FADE_MS = 6000; // ms before messages auto-fade

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  uid:      string;
  roomCode: string;
  myName:   string;
  onRead:   () => void;
}

// ── Free translation via MyMemory API ─────────────────────────────────────────
async function translateText(text: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`,
    );
    const data = await res.json() as { responseData?: { translatedText?: string } };
    return data.responseData?.translatedText || text;
  } catch {
    return text;
  }
}

export default function ChatOverlay({ uid, roomCode, myName, onRead }: Props) {
  const [messages,     setMessages]     = useState<ChatMsg[]>([]);
  const [input,        setInput]        = useState("");
  const [focused,      setFocused]      = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [sending,      setSending]      = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating,  setTranslating]  = useState<Record<string, boolean>>({});

  async function handleTranslate(msg: ChatMsg) {
    if (translations[msg.id]) {
      setTranslations(prev => { const n = { ...prev }; delete n[msg.id]; return n; });
      return;
    }
    setTranslating(prev => ({ ...prev, [msg.id]: true }));
    const result = await translateText(msg.text);
    setTranslations(prev => ({ ...prev, [msg.id]: result }));
    setTranslating(prev => { const n = { ...prev }; delete n[msg.id]; return n; });
  }

  const inputRef       = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Subscribe to chat messages ────────────────────────────────────────────
  useEffect(() => {
    onRead();
    if (!db) return;
    return onValue(ref(db, `rooms/${roomCode}/chat`), (snap) => {
      if (!snap.exists()) { setMessages([]); return; }
      const d = snap.val() as Record<string, Omit<ChatMsg, "id">>;
      const sorted = Object.entries(d)
        .map(([id, v]) => ({ ...v, id }))
        .sort((a, b) => a.at - b.at)
        .slice(-30);
      setMessages(sorted);
    });
  }, [roomCode, onRead]);

  // Auto-fade: show messages for MSG_FADE_MS then hide when not focused
  useEffect(() => {
    if (messages.length === 0) return;
    setShowMessages(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    if (!focused) {
      fadeTimerRef.current = setTimeout(() => setShowMessages(false), MSG_FADE_MS);
    }
    return () => { if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current); };
  }, [messages.length, focused]);

  // Keep messages visible while input is focused
  useEffect(() => {
    if (focused) {
      setShowMessages(true);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    }
  }, [focused]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride?: string) => {
    if (!db) return;
    const raw = (textOverride ?? input).trim();
    if (!raw) return;
    const text = filterMsg(raw);
    setSending(true);
    try {
      await push(ref(db, `rooms/${roomCode}/chat`), {
        uid, name: myName || "You", text, at: Date.now(),
      });
      if (!textOverride) setInput("");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      remove(ref(db, `rooms/${roomCode}/typing/${uid}`)).catch(() => {});
    } finally {
      setSending(false);
    }
  }, [input, uid, roomCode, myName]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (!db) return;
    update(ref(db, `rooms/${roomCode}/typing/${uid}`), { name: myName || "You", at: Date.now() }).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (db) remove(ref(db, `rooms/${roomCode}/typing/${uid}`)).catch(() => {});
    }, 3000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); sendMessage(); }
    if (e.key === "Escape") { setFocused(false); inputRef.current?.blur(); }
  }

  function handleFocus() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setFocused(true);
  }

  function handleBlur() {
    blurTimerRef.current = setTimeout(() => setFocused(false), 200);
  }

  const displayMessages = messages.slice(-3);

  return (
    /* Container: bottom-left, max 60% so right board half stays clickable */
    <div
      style={{
        position: "absolute",
        bottom: 6,
        left: 6,
        maxWidth: "60%",
        zIndex: 20,
        pointerEvents: "none",   // pass-through by default
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* ── Message bubbles (auto-fade) ──────────────────────────────────── */}
      <AnimatePresence>
        {showMessages && displayMessages.length > 0 && (
          <motion.div
            key="msgs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex", flexDirection: "column", gap: 1,
                  padding: "2px 8px",
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  borderRadius: 5,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    whiteSpace: "nowrap", lineHeight: "1.6",
                    color: msg.uid === uid ? "#fbbf24" : "#94a3b8",
                  }}>
                    {msg.uid === uid ? "You" : msg.name}:
                  </span>
                  <span style={{
                    fontSize: 11, color: "rgba(255,255,255,0.92)",
                    wordBreak: "break-word", lineHeight: "1.6", flex: 1,
                  }}>
                    {msg.text}
                  </span>
                  {/* Translate button — only for opponent messages */}
                  {msg.uid !== uid && (
                    <button
                      onClick={() => handleTranslate(msg)}
                      title={translations[msg.id] ? "Hide translation" : "Translate"}
                      style={{
                        flexShrink: 0, background: "none", border: "none",
                        padding: "0 2px", cursor: "pointer",
                        opacity: translating[msg.id] ? 0.4 : 0.55,
                        color: translations[msg.id] ? "#06b6d4" : "rgba(255,255,255,0.5)",
                        display: "flex", alignItems: "center",
                        pointerEvents: "auto",
                      }}
                    >
                      <Globe size={10} />
                    </button>
                  )}
                </div>
                {/* Translated text */}
                {translations[msg.id] && (
                  <div style={{
                    fontSize: 10, color: "#06b6d4", fontStyle: "italic",
                    paddingLeft: 2, lineHeight: 1.5,
                  }}>
                    🌐 {translations[msg.id]}
                  </div>
                )}
                {translating[msg.id] && (
                  <div style={{ fontSize: 10, color: "rgba(6,182,212,0.5)", paddingLeft: 2 }}>
                    Translating…
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input row ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", pointerEvents: "auto" }}>
        <div style={{
          flex: 1,
          background: focused ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.40)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: focused ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.13)",
          borderRadius: 8,
          transition: "all 0.2s",
          display: "flex", alignItems: "center",
          padding: "0 8px", height: 28,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Chat..."
            maxLength={120}
            autoComplete="off"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "rgba(255,255,255,0.92)", fontSize: 11, caretColor: "#f59e0b",
              WebkitUserSelect: "text", userSelect: "text", minWidth: 0,
            }}
          />
        </div>

        {/* Send button — appears only when there's text */}
        <AnimatePresence>
          {input.trim() && (
            <motion.button
              key="send-btn"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={() => sendMessage()}
              disabled={sending}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: "rgba(245,158,11,0.9)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, cursor: "pointer", pointerEvents: "auto",
              }}
            >
              <Send size={12} color="#000" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick-message strip (shown when input focused) ────────────────── */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden", display: "flex", gap: 3, flexWrap: "wrap", pointerEvents: "auto" }}
          >
            {QUICK_MSGS.map((q) => (
              <button
                key={q}
                onMouseDown={(e) => { e.preventDefault(); sendMessage(q); setFocused(false); inputRef.current?.blur(); }}
                onTouchStart={(e) => { e.preventDefault(); sendMessage(q); setFocused(false); inputRef.current?.blur(); }}
                style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.13)",
                  color: "rgba(255,255,255,0.65)",
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
