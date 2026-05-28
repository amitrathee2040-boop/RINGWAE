import { useEffect, useState } from "react";
import { ref, onValue, push } from "firebase/database";
import { db } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Check, UserPlus, Send } from "lucide-react";

interface FriendEntry {
  uid: string;
  name: string;
  online: boolean;
}

interface Props {
  roomCode: string;
  myName: string;
  uid: string;
  onCancel: () => void;
}

export default function WaitingRoom({ roomCode, myName, uid, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, unknown>>({});
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!db) return;
    const u1 = onValue(ref(db, "presence"), (snap) => {
      setOnlineUsers(snap.exists() ? snap.val() : {});
    });
    const u2 = onValue(ref(db, `friends/${uid}`), (snap) => {
      if (!snap.exists()) { setFriends([]); return; }
      const data = snap.val() as Record<string, { name: string }>;
      setFriends(Object.entries(data).map(([fuid, v]) => ({
        uid: fuid, name: v.name || "Warrior", online: false,
      })));
    });
    return () => { u1(); u2(); };
  }, [uid]);

  const enriched = friends.map(f => ({ ...f, online: !!onlineUsers[f.uid] }));
  const onlineFriends = enriched.filter(f => f.online);

  function copyCode() {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareLink() {
    const url = `${window.location.origin}${window.location.pathname}#join=${roomCode}`;
    if (navigator.share) {
      navigator.share({ title: "Ring War", text: `Join my game! Code: ${roomCode}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function inviteFriend(friendUid: string, friendName: string) {
    if (!db) return;
    await push(ref(db, `roomInvites/${friendUid}`), {
      roomCode,
      fromName: myName || "Warrior",
      fromUid: uid,
      at: Date.now(),
    }).catch(() => {});
    setInvited(prev => new Set([...prev, friendUid]));
    void friendName;
  }

  return (
    <div className="screen-bg">
      <div className="flex flex-col items-center gap-6 px-5 w-full max-w-sm animate-slide-up">
        <div className="text-center space-y-1">
          <div className="text-2xl font-black theme-text-primary">Waiting for Opponent</div>
          <div className="theme-text-muted text-sm">Share your room code with a friend</div>
        </div>

        <div className="theme-card p-5 w-full text-center space-y-3 rounded-2xl">
          <div className="text-xs theme-text-muted uppercase tracking-widest font-medium">Room Code</div>
          <div className="text-4xl font-black tracking-[0.22em] shimmer-text py-1">{roomCode}</div>
          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: copied ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.12)",
                color: copied ? "#22c55e" : "#f59e0b",
                border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}
            >
              <Send size={14} />
              Share Link
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full">
          <div className="theme-card p-3 flex items-center gap-3 flex-1 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400">
              {myName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold theme-text-primary">{myName}</div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-soft" />
                Ready
              </div>
            </div>
          </div>

          <div className="theme-text-muted font-bold text-sm">VS</div>

          <div className="theme-card p-3 flex items-center gap-3 flex-1 rounded-2xl">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card-inner)" }}>
              <Users size={14} className="theme-text-muted" />
            </div>
            <div>
              <div className="text-sm font-semibold theme-text-muted">Waiting...</div>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--text-muted)" }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowInvite(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
          style={{
            background: showInvite ? "rgba(245,158,11,0.15)" : "var(--bg-card-inner)",
            color: showInvite ? "#f59e0b" : "var(--text-secondary)",
            border: `1px solid ${showInvite ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
          }}
        >
          <UserPlus size={15} />
          Invite Friends ({onlineFriends.length} online)
        </button>

        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="theme-card p-3 rounded-2xl space-y-2">
                {onlineFriends.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-sm theme-text-muted">No friends online right now.</div>
                    <div className="text-xs theme-text-muted mt-1">Share the room code instead!</div>
                  </div>
                ) : (
                  onlineFriends.map(f => (
                    <div key={f.uid} className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: "var(--bg-card-inner)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold theme-text-primary truncate">{f.name}</div>
                        <div className="text-xs text-green-400">Online</div>
                      </div>
                      <button
                        onClick={() => inviteFriend(f.uid, f.name)}
                        disabled={invited.has(f.uid)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        style={{
                          background: invited.has(f.uid) ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.15)",
                          color: invited.has(f.uid) ? "#22c55e" : "#f59e0b",
                          border: `1px solid ${invited.has(f.uid) ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                        }}
                      >
                        {invited.has(f.uid) ? "✓ Sent" : "Invite"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={onCancel} className="btn-secondary w-full py-3 text-sm rounded-2xl">
          Cancel
        </button>
      </div>
    </div>
  );
}
