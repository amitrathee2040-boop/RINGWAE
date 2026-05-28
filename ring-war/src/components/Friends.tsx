import { useEffect, useState } from "react";
import { ref, onValue, push, set, remove } from "firebase/database";
import { db } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, UserMinus, Send, Check, User } from "lucide-react";
import PlayerProfileModal from "./PlayerProfileModal";

interface FriendEntry {
  uid: string;
  name: string;
  wins: number;
  online: boolean;
}

interface FriendRequest {
  fromUid: string;
  fromName: string;
  at: number;
}

interface Props {
  uid: string;
  myName: string;
  onClose: () => void;
  onInvite: (targetUid: string) => void;
}

export default function Friends({ uid, myName, onClose, onInvite }: Props) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<(FriendRequest & { id: string })[]>([]);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { name: string }>>({});
  const [viewingUid, setViewingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const u1 = onValue(ref(db, "presence"), (snap) => {
      setOnlineUsers(snap.exists() ? snap.val() : {});
    });
    const u2 = onValue(ref(db, `friends/${uid}`), (snap) => {
      if (!snap.exists()) { setFriends([]); return; }
      const data = snap.val() as Record<string, { name: string; wins: number }>;
      setFriends(Object.entries(data).map(([fuid, v]) => ({
        uid: fuid, name: v.name, wins: v.wins || 0, online: false,
      })));
    });
    const u3 = onValue(ref(db, `friendRequests/${uid}`), (snap) => {
      if (!snap.exists()) { setRequests([]); return; }
      const data = snap.val() as Record<string, FriendRequest>;
      setRequests(Object.entries(data).map(([id, v]) => ({ ...v, id })));
    });
    return () => { u1(); u2(); u3(); };
  }, [uid]);

  const enrichedFriends = friends.map(f => ({ ...f, online: !!onlineUsers[f.uid] }));

  async function sendRequest() {
    if (!db) return;
    const targetUid = addInput.trim();
    if (!targetUid || targetUid === uid) { setAddError("Invalid user ID"); return; }
    setAddError("");
    const snap = await new Promise<{ exists: boolean; name: string }>((resolve) => {
      onValue(ref(db!, `stats/${targetUid}/name`), (s) => {
        resolve({ exists: s.exists(), name: s.val() || "Warrior" });
      }, { onlyOnce: true });
    });
    if (!snap.exists) { setAddError("User not found"); return; }
    await push(ref(db, `friendRequests/${targetUid}`), {
      fromUid: uid, fromName: myName || "Warrior", at: Date.now(),
    }).catch(() => {});
    setAddInput("");
    setAddError("Request sent!");
    setTimeout(() => setAddError(""), 2000);
  }

  async function acceptRequest(req: FriendRequest & { id: string }) {
    if (!db) return;
    const mySnap = await new Promise<string>((res) => {
      onValue(ref(db!, `stats/${uid}/name`), s => res(s.val() || "Warrior"), { onlyOnce: true });
    });
    const myWins = await new Promise<number>((res) => {
      onValue(ref(db!, `stats/${uid}/wins`), s => res(s.val() || 0), { onlyOnce: true });
    });
    await Promise.all([
      set(ref(db, `friends/${uid}/${req.fromUid}`), { name: req.fromName, wins: 0, addedAt: Date.now() }),
      set(ref(db, `friends/${req.fromUid}/${uid}`), { name: mySnap, wins: myWins, addedAt: Date.now() }),
      remove(ref(db, `friendRequests/${uid}/${req.id}`)),
    ]);
  }

  async function removeFriend(friendUid: string) {
    if (!db) return;
    await Promise.all([
      remove(ref(db, `friends/${uid}/${friendUid}`)),
      remove(ref(db, `friends/${friendUid}/${uid}`)),
    ]);
  }

  return (
    <>
    <AnimatePresence>
      {viewingUid && (
        <PlayerProfileModal
          viewedUid={viewingUid}
          myUid={uid}
          myName={myName}
          onClose={() => setViewingUid(null)}
          onInvite={viewingUid ? () => { setViewingUid(null); onInvite(viewingUid); } : undefined}
        />
      )}
    </AnimatePresence>
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
        <div className="flex items-center gap-2">
          <UserPlus size={16} className="text-amber-400" />
          <span className="font-bold theme-text-primary">Friends</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg theme-btn-secondary">
          <X size={16} className="theme-text-muted" />
        </button>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2">
          <input
            className="theme-input flex-1 rounded-xl px-3 py-3 outline-none"
            style={{ fontSize: 16 }}
            placeholder="Paste friend's user ID"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendRequest(); }}
          />
          <button onClick={sendRequest} className="btn-gold px-3 py-2.5 rounded-xl">
            <Send size={14} />
          </button>
        </div>
        {addError && (
          <p className={`text-xs mt-1.5 ${addError.includes("sent") ? "text-green-400" : "text-red-400"}`}>{addError}</p>
        )}
        <p className="text-[11px] theme-text-muted mt-1.5 opacity-50">Your ID: <span className="font-mono">{uid.slice(0, 16)}...</span></p>
      </div>

      <div className="flex px-4 pb-2 gap-2">
        {(["friends", "requests"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tab === t ? "rgba(245,158,11,0.15)" : "var(--bg-card-inner)",
              color: tab === t ? "#f59e0b" : "var(--text-muted)",
              border: `1px solid ${tab === t ? "rgba(245,158,11,0.25)" : "var(--border-color)"}`,
            }}
          >
            {t === "requests" && requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] text-black font-bold flex items-center justify-center">
                {requests.length}
              </span>
            )}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 scroll-list px-4 py-1 space-y-2">
        {tab === "friends" && (
          <>
            {enrichedFriends.length === 0 && (
              <div className="text-center theme-text-muted text-sm pt-12">No friends yet</div>
            )}
            {enrichedFriends.map((f) => (
              <motion.div
                key={f.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold theme-text-secondary"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    {f.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: f.online ? "#22c55e" : "#374151", borderColor: "var(--bg-primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold theme-text-primary truncate">{f.name}</div>
                  <div className="text-xs" style={{ color: f.online ? "#22c55e" : "var(--text-muted)" }}>
                    {f.online ? "Online" : "Offline"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingUid(f.uid)}
                    className="p-1.5 rounded-lg"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}
                    title="View Profile"
                  >
                    <User size={13} className="text-purple-400" />
                  </button>
                  {f.online && (
                    <button
                      onClick={() => onInvite(f.uid)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      Invite
                    </button>
                  )}
                  <button onClick={() => removeFriend(f.uid)} className="p-1.5 rounded-lg hover:bg-red-500/10">
                    <UserMinus size={13} className="theme-text-muted" />
                  </button>
                </div>
              </motion.div>
            ))}
          </>
        )}

        {tab === "requests" && (
          <>
            {requests.length === 0 && (
              <div className="text-center theme-text-muted text-sm pt-12">No pending requests</div>
            )}
            {requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-card-inner)", border: "1px solid var(--border-color)" }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold theme-text-secondary"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  {req.fromName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold theme-text-primary">{req.fromName}</div>
                  <div className="text-xs theme-text-muted">wants to be friends</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req)} className="p-1.5 rounded-lg bg-green-500/15">
                    <Check size={13} className="text-green-400" />
                  </button>
                  <button
                    onClick={() => db && remove(ref(db, `friendRequests/${uid}/${req.id}`))}
                    className="p-1.5 rounded-lg bg-red-500/10"
                  >
                    <X size={13} className="text-red-400/60" />
                  </button>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
    </>

  );
}
