import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown, ChevronUp, Mail, MessageSquare, Bug, BookOpen, HelpCircle, Gamepad2, Zap, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "How do I play the game?",
    a: "Make your first move to the center node. Then jump over enemy pieces to capture them. If more jumps are available after a capture, you can chain them into a combo. A player whose pieces are all eliminated is out — the last player standing wins."
  },
  {
    q: "Why must the first move go to the center?",
    a: "This is Ring War's core rule — all players are drawn toward the center at the start. The center node is the only valid destination for your very first move. After that, all normal movement rules apply."
  },
  {
    q: "What is a combo attack?",
    a: "When you jump over an enemy piece to capture it, if your new position allows another jump, you can keep jumping in the same turn. This chain of jumps is called a combo."
  },
  {
    q: "How does 4-Player mode work?",
    a: "4-Player mode has South (P1), North (P2), West (P3), and East (P4) starting positions. All 12 inner-ring nodes are connected from the center. Turns proceed clockwise. A player is eliminated when all their pieces are captured or they have no valid moves. The last player remaining wins."
  },
  {
    q: "What is the difference between a move and a jump?",
    a: "Normal move: slide your piece to an adjacent empty node. Jump: leap over an enemy piece and land on the empty node beyond it — the enemy piece is captured. During a combo, only jumps are allowed; normal slides are not."
  },
  {
    q: "What do I need for online mode?",
    a: "Online mode requires an internet connection. If Firebase is not configured, the app automatically runs in offline mode. Offline mode includes Bot matches, 2-Player Hot Seat, and 4-Player Hot Seat."
  },
  {
    q: "How do I change the bot difficulty?",
    a: "After selecting VS BOT, choose Easy, Normal, or Hard difficulty. Easy bot looks 1 move ahead. Normal bot looks 3 moves ahead. Hard bot looks 6 moves ahead and plays strategically."
  },
  {
    q: "Where do I find the room code?",
    a: "When you create a Private Room, a 6-character code is generated. Share that code with your friends. They enter it using the ROOMS or 'Join with Code' option."
  },
];

const CATEGORIES = [
  { icon: <BookOpen size={18} />, label: "How to Play", color: "#f59e0b" },
  { icon: <Bug size={18} />, label: "Bug Report", color: "#ef4444" },
  { icon: <MessageSquare size={18} />, label: "Feedback", color: "#8b5cf6" },
  { icon: <Shield size={18} />, label: "Game Rules", color: "#22c55e" },
];

interface Props {
  onClose?: () => void;
}

export default function Support({ onClose }: Props) {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"bug" | "feedback" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleBack() {
    if (onClose) onClose();
    else setLocation("/");
  }

  function handleSubmit() {
    if (!feedbackText.trim()) return;
    setSubmitted(true);
    setFeedbackText("");
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-lg mx-auto px-4 pb-24 md:pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 py-4 sticky top-0 z-10"
          style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)" }}>
          <button onClick={handleBack}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "7px 11px", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.06em", color: "#f59e0b" }}>PLAYER SUPPORT</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Help center &amp; contact</div>
          </div>
          <div className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <HelpCircle size={18} className="text-amber-400" />
          </div>
        </div>

        <div className="space-y-4 pt-4">

          {/* Quick Links */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>
              QUICK HELP
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <motion.button key={cat.label} whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left",
                    background: activeCategory === cat.label ? `${cat.color}18` : "var(--bg-card)",
                    border: `1px solid ${activeCategory === cat.label ? cat.color + "50" : "var(--border-color)"}`,
                    color: activeCategory === cat.label ? cat.color : "rgba(255,255,255,0.6)",
                  }}>
                  <span style={{ color: cat.color }}>{cat.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{cat.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* How to Play panel */}
          <AnimatePresence>
            {activeCategory === "How to Play" && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", marginBottom: 12 }}>⚔️ How to Play Ring War</div>
                <div className="space-y-2">
                  {[
                    { icon: <Zap size={13} />, text: "Your first move must go to the center node (0) — this is mandatory" },
                    { icon: <Gamepad2 size={13} />, text: "Jump over enemy pieces to capture them" },
                    { icon: "🔥", text: "If more jumps are available after a capture, chain them into a combo" },
                    { icon: "🏆", text: "A player whose pieces are all gone is eliminated — last player wins" },
                    { icon: "👥", text: "4-Player has 4 directions: South, North, West, East" },
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(245,158,11,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#f59e0b", flexShrink: 0, fontSize: 13 }}>
                        {step.icon}
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Game Rules panel */}
            {activeCategory === "Game Rules" && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", marginBottom: 12 }}>📋 Official Game Rules</div>
                <div className="space-y-3">
                  {[
                    { title: "Board", desc: "49 nodes — center + 4 rings of 12 nodes each" },
                    { title: "Pieces", desc: "Each player starts with 12 pieces on their side" },
                    { title: "First Move", desc: "Your first move can only go to the center node" },
                    { title: "Movement", desc: "Slide your piece to an adjacent empty node" },
                    { title: "Jump", desc: "Leap over an enemy piece — it is captured" },
                    { title: "Combo", desc: "If more jumps follow a capture, continue in the same turn" },
                    { title: "Elimination", desc: "All pieces gone = eliminated" },
                    { title: "Win Condition", desc: "Last surviving player wins" },
                  ].map((rule, i) => (
                    <div key={i} style={{ display: "flex", gap: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", minWidth: 80, flexShrink: 0 }}>{rule.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{rule.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Bug Report / Feedback panel */}
            {(activeCategory === "Bug Report" || activeCategory === "Feedback") && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: activeCategory === "Bug Report" ? "#ef4444" : "#8b5cf6", marginBottom: 12 }}>
                  {activeCategory === "Bug Report" ? "🐛 Bug Report" : "💬 Send Feedback"}
                </div>

                {/* Type toggle */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {(["bug", "feedback"] as const).map(t => (
                    <button key={t} onClick={() => setFeedbackType(t)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: feedbackType === t
                          ? t === "bug" ? "linear-gradient(135deg,#b91c1c,#ef4444)" : "linear-gradient(135deg,#6d28d9,#8b5cf6)"
                          : "rgba(255,255,255,0.05)",
                        color: feedbackType === t ? "#fff" : "rgba(255,255,255,0.4)",
                        border: feedbackType === t ? "none" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      {t === "bug" ? "🐛 Bug" : "💡 Feedback"}
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={feedbackType === "bug"
                    ? "Describe the bug — what happened, when, which mode..."
                    : "Write your feedback or suggestion here..."}
                  rows={4}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "12px 14px", color: "rgba(255,255,255,0.85)", fontSize: 12,
                    outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6,
                    boxSizing: "border-box",
                  }}
                />

                <AnimatePresence>
                  {submitted ? (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, textAlign: "center",
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
                        fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
                      ✅ Thank you! Your message has been sent.
                    </motion.div>
                  ) : (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
                      disabled={!feedbackText.trim() || !feedbackType}
                      style={{
                        marginTop: 10, width: "100%", padding: "11px 0", borderRadius: 12,
                        fontSize: 13, fontWeight: 700, cursor: feedbackText.trim() && feedbackType ? "pointer" : "not-allowed",
                        opacity: feedbackText.trim() && feedbackType ? 1 : 0.4,
                        background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#000", border: "none",
                      }}>
                      📤 Submit
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAQ Section */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 10 }}>
              FREQUENTLY ASKED QUESTIONS
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden" }}>
              {FAQS.map((faq, i) => (
                <div key={i}>
                  {i > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />}
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(245,158,11,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <HelpCircle size={11} style={{ color: "#f59e0b" }} />
                    </div>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                      {faq.q}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                      {openFaq === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: "hidden" }}>
                        <div style={{ padding: "0 16px 14px 50px", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Contact section */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 12 }}>
              CONTACT US
            </div>
            <div className="space-y-2">
              <a href="mailto:ringwar8@gmail.com"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                  textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(245,158,11,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Mail size={15} style={{ color: "#f59e0b" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Email Support</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>ringwar8@gmail.com</div>
                </div>
              </a>

              <a href="https://discord.gg/ringwar" target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12,
                  background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.2)",
                  textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(88,101,242,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: 16 }}>
                  💬
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Discord Community</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Join players &amp; get quick help</div>
                </div>
              </a>
            </div>
          </div>

          {/* Version info */}
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Ring War v1.0 · All rights reserved</div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
