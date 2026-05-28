import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ref, set, onValue, off, remove, update, get, onDisconnect } from "firebase/database";
import { db, hasFirebaseConfig } from "../firebase";
import { buildInitialBoard4, Player4Key } from "../game/boardDefinition4";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CharacterSelect4 from "./CharacterSelect4";

interface Props { uid: string; displayName?: string; }

type Screen = "charselect" | "idle" | "queuing" | "matched" | "error";

const DUMMY_NAMES: Record<Player4Key, string> = {
  player1: "Player 1", player2: "Player 2", player3: "Player 3", player4: "Player 4",
};

function genCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

export default function QuickMatch4({ uid, displayName }: Props) {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>("charselect");
  const [selectedChar, setSelectedChar] = useState<string | null>(
    () => localStorage.getItem("ringwar-4p-char") ?? null
  );
  const [queueCount, setQueueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cleanup() {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (db && uid) remove(ref(db!, `matchmaking4/${uid}`)).catch(() => {});
  }

  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCharDone(chosen: Record<string, string>) {
    const charId = chosen["player1"] ?? Object.values(chosen)[0];
    setSelectedChar(charId);
    localStorage.setItem("ringwar-4p-char", charId);
    setScreen("idle");
  }

  async function joinQueue() {
    if (!hasFirebaseConfig || !db) {
      setError("Online play requires Firebase. Use Hot Seat mode instead.");
      setScreen("error");
      return;
    }
    setScreen("queuing");
    setError(null);

    const myQueueRef = ref(db!, `matchmaking4/${uid}`);
    try {
      await set(myQueueRef, {
        uid, at: Date.now(), status: "waiting",
        charId: selectedChar ?? "warrior",
        displayName: displayName ?? "Player",
      });
      onDisconnect(myQueueRef).remove();
      cleanupRef.current = () => { off(myQueueRef); };

      pollRef.current = setInterval(async () => {
        const snap = await get(ref(db!, "matchmaking4"));
        if (!snap.exists()) return;
        const entries = Object.values(snap.val() as Record<string, {
          uid: string; at: number; status: string; roomCode?: string;
          charId?: string; displayName?: string;
        }>);
        const waiting = entries.filter(e => e.uid !== uid && e.status === "waiting");
        setQueueCount(waiting.length + 1);

        const myEntry = entries.find(e => e.uid === uid);
        if (myEntry?.status === "matched" && myEntry.roomCode) {
          clearInterval(pollRef.current!);
          setRoomCode(myEntry.roomCode);
          setScreen("matched");
          setTimeout(() => setLocation(`/room4/${myEntry.roomCode}`), 600);
          return;
        }

        if (waiting.length >= 3) {
          const others = waiting.slice(0, 3);
          const code = genCode();
          const now = Date.now();
          const initialBoard = buildInitialBoard4();

          const players: Record<string, { uid: string; displayName: string; charId: string }> = {
            player1: { uid, displayName: displayName ?? "Player", charId: selectedChar ?? "warrior" },
            player2: { uid: others[0].uid, displayName: others[0].displayName ?? "Player", charId: others[0].charId ?? "warrior" },
            player3: { uid: others[1].uid, displayName: others[1].displayName ?? "Player", charId: others[1].charId ?? "warrior" },
            player4: { uid: others[2].uid, displayName: others[2].displayName ?? "Player", charId: others[2].charId ?? "warrior" },
          };

          await set(ref(db!, `rooms4/${code}`), {
            status: "playing", players, board: initialBoard,
            currentTurn: "player1", eliminated: {},
            pieces: { player1: 12, player2: 12, player3: 12, player4: 12 },
            inCombo: false, comboFrom: null, winner: null,
            createdAt: now, lastMoveAt: now,
          });

          await update(myQueueRef, { status: "matched", roomCode: code });
          for (const o of others) {
            await update(ref(db!, `matchmaking4/${o.uid}`), { status: "matched", roomCode: code }).catch(() => {});
          }

          clearInterval(pollRef.current!);
          setRoomCode(code);
          setScreen("matched");
          setTimeout(() => setLocation(`/room4/${code}`), 600);
        }
      }, 2000);
    } catch (e) {
      setError(String(e));
      setScreen("error");
    }
  }

  function leaveQueue() {
    cleanup();
    setScreen("idle");
    setQueueCount(0);
  }

  const CHAR_EMOJIS: Record<string, string> = {
    warrior:"⚔️", shadow:"🗡️", dragon:"🐲", phoenix:"🔥",
    knight:"🛡️", thunder:"⚡", ghost:"👻", wolf:"🐺",
  };
  const CHAR_NAMES: Record<string, string> = {
    warrior:"Warrior", shadow:"Shadow", dragon:"Dragon", phoenix:"Phoenix",
    knight:"Knight", thunder:"Thunder", ghost:"Ghost", wolf:"Wolf",
  };

  /* ─── CHARACTER SELECT ──────────────────────────── */
  if (screen === "charselect") {
    return (
      <CharacterSelect4
        players={["player1"]}
        chosen={selectedChar ? { player1: selectedChar } : {}}
        names={DUMMY_NAMES}
        onBack={() => setLocation("/")}
        onDone={handleCharDone}
        singlePlayer
      />
    );
  }

  /* ─── MATCHMAKING SCREENS ───────────────────────── */
  return (
    <div className="screen-bg">
      <div style={{ width: "100%", maxWidth: 380, padding: "0 16px", textAlign: "center" }}>
        <button onClick={() => { cleanup(); setLocation("/"); }}
          className="flex items-center gap-2 mb-8"
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="shimmer-text" style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.06em", marginBottom: 6 }}>
          4-PLAYER BATTLE
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>
          Online Quick Match
        </div>

        <AnimatePresence mode="wait">

          {screen === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Selected character display */}
              {selectedChar && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
                    background: "rgba(255,255,255,0.04)", borderRadius: 14,
                    border: "1.5px solid rgba(255,255,255,0.1)", padding: "14px 18px" }}>
                  <div style={{ fontSize: 32 }}>{CHAR_EMOJIS[selectedChar] ?? "⚔️"}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                      {CHAR_NAMES[selectedChar] ?? selectedChar}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Your selected character</div>
                  </div>
                  <button onClick={() => setScreen("charselect")}
                    style={{ marginLeft: "auto", fontSize: 11, color: "#f59e0b", fontWeight: 700,
                      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
                    Change
                  </button>
                </motion.div>
              )}

              {/* Player slots */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20,
                background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 16,
                border: "1px solid rgba(255,255,255,0.07)" }}>
                {(["player1","player2","player3","player4"] as Player4Key[]).map((p, i) => {
                  const colors = ["#f97316","#ec4899","#3b82f6","#22c55e"];
                  const dirs   = ["South","North","West","East"];
                  const isYou  = i === 0;
                  return (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[i], flexShrink: 0 }} />
                      {isYou && selectedChar && <span style={{ fontSize: 14 }}>{CHAR_EMOJIS[selectedChar] ?? ""}</span>}
                      <span style={{ fontSize: 13, color: isYou ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: isYou ? 700 : 400 }}>
                        {isYou ? "You" : `Player ${i + 1}`} · {dirs[i]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button onClick={joinQueue} className="btn-gold w-full" style={{ padding: "14px 0", fontSize: 15, borderRadius: 12 }}>
                ⚡ Find Match
              </button>
            </motion.div>
          )}

          {screen === "queuing" && (
            <motion.div key="queuing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <Loader2 size={80} color="rgba(245,158,11,0.15)" />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center" }}>
                    {selectedChar
                      ? <div style={{ fontSize: 22 }}>{CHAR_EMOJIS[selectedChar]}</div>
                      : <Users size={22} color="#f59e0b" />}
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", marginTop: 2 }}>{queueCount}/4</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
                Waiting for {4 - queueCount} more player{4 - queueCount !== 1 ? "s" : ""}…
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: "50%",
                    background: i < queueCount ? ["#f97316","#ec4899","#3b82f6","#22c55e"][i] : "rgba(255,255,255,0.1)",
                    transition: "background 0.4s" }} />
                ))}
              </div>
              <button onClick={leaveQueue} className="btn-secondary" style={{ padding: "11px 28px", fontSize: 14, borderRadius: 10 }}>
                Cancel
              </button>
            </motion.div>
          )}

          {screen === "matched" && (
            <motion.div key="matched" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>
                {selectedChar ? CHAR_EMOJIS[selectedChar] : "⚔️"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b", marginBottom: 6 }}>Match Found!</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Room: {roomCode}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>Entering battle…</div>
            </motion.div>
          )}

          {screen === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ color: "#f87171", fontSize: 13, marginBottom: 20, padding: "12px 16px",
                background: "#ef44441a", borderRadius: 10, border: "1px solid #ef444430" }}>
                {error}
              </div>
              <button onClick={() => setScreen("idle")} className="btn-secondary"
                style={{ padding: "11px 24px", fontSize: 14, borderRadius: 10 }}>
                Try Again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
