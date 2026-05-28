import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ref, set, get, onValue, remove, update } from "firebase/database";
import { onDisconnect } from "firebase/database";
import { db } from "../firebase";
import { buildInitialBoard } from "../game/boardDefinition";
import { GameState, PieceColor } from "../types";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { usePlayer } from "../contexts/PlayerContext";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getEloRange(elapsedSeconds: number): number {
  if (elapsedSeconds < 10) return 100;
  if (elapsedSeconds < 20) return 200;
  if (elapsedSeconds < 30) return 300;
  return Infinity;
}

function eloRangeLabel(elapsedSeconds: number): string {
  if (elapsedSeconds < 10) return "±100";
  if (elapsedSeconds < 20) return "±200";
  if (elapsedSeconds < 30) return "±300";
  return "Any rank";
}

interface Props {
  uid: string;
  name: string;
  pieceColor: PieceColor;
  avatar?: string;
  profilePhoto?: string;
  onCancel: () => void;
}

type MatchStatus = "searching" | "found" | "creating";

export default function QuickMatch({ uid, name, pieceColor, avatar = "", profilePhoto = "", onCancel }: Props) {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<MatchStatus>("searching");
  const [searchTime, setSearchTime] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [matchedOpponentElo, setMatchedOpponentElo] = useState<number | undefined>(undefined);
  const unsubRef = useRef<(() => void) | null>(null);
  const matchedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { data: playerData } = usePlayer();
  const myElo = playerData?.elo ?? 1200;

  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setSearchTime(t => t + 1), 1000);
    startMatchmaking();
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (unsubRef.current) unsubRef.current();
    if (!matchedRef.current && db) {
      remove(ref(db, `matchmaking/${uid}`)).catch(() => {});
    }
  }

  function findBestOpponent(
    entries: Record<string, { uid: string; name: string; color: PieceColor; at: number; status: string; elo?: number }>,
    elapsedSecs: number
  ): [string, number] | null {
    const range = getEloRange(elapsedSecs);
    const opponents = Object.entries(entries)
      .filter(([id, v]) => id !== uid && v.status === "waiting")
      .filter(([, v]) => {
        const oppElo = v.elo ?? 1200;
        return range === Infinity || Math.abs(oppElo - myElo) <= range;
      })
      .sort((a, b) => {
        const aDiff = Math.abs((a[1].elo ?? 1200) - myElo);
        const bDiff = Math.abs((b[1].elo ?? 1200) - myElo);
        return aDiff - bDiff;
      });
    if (opponents.length === 0) return null;
    const [oppUid, oppData] = opponents[0];
    return [oppUid, oppData.elo ?? 1200];
  }

  async function startMatchmaking() {
    if (!db) return;
    const myEntry = {
      uid,
      name: name.trim() || "Warrior",
      color: pieceColor,
      avatar,
      profilePhoto,
      at: Date.now(),
      status: "waiting",
      elo: myElo,
    };
    const myRef = ref(db, `matchmaking/${uid}`);
    onDisconnect(myRef).remove().catch(() => {});
    await set(myRef, myEntry);

    const queueUnsub = onValue(ref(db, "matchmaking"), (snap) => {
      if (!snap.exists()) { setQueueSize(0); return; }
      const d = snap.val() as Record<string, { status: string }>;
      setQueueSize(Object.values(d).filter(v => v.status === "waiting").length);
    });

    const snap = await get(ref(db, "matchmaking"));
    if (snap.exists()) {
      const entries = snap.val() as Record<string, { uid: string; name: string; color: PieceColor; at: number; status: string; elo?: number }>;
      const result = findBestOpponent(entries, 0);
      if (result && !matchedRef.current) {
        const [oppUid, oppElo] = result;
        queueUnsub();
        await pairWith(oppUid, oppElo);
        return;
      }
    }

    const myUnsub = onValue(myRef, async (snap) => {
      if (!snap.exists() || matchedRef.current) return;
      const d = snap.val() as { status: string; roomCode?: string };
      if (d.status === "matched" && d.roomCode) {
        matchedRef.current = true;
        myUnsub();
        queueUnsub();
        setStatus("found");
        setTimeout(() => setLocation(`/room/${d.roomCode}`), 700);
      }
    });

    pollRef.current = setInterval(async () => {
      if (matchedRef.current || !db) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const snap = await get(ref(db, "matchmaking")).catch(() => null);
      if (!snap || !snap.exists()) return;
      const entries = snap.val() as Record<string, { uid: string; name: string; color: PieceColor; at: number; status: string; elo?: number }>;
      const result = findBestOpponent(entries, elapsed);
      if (result && !matchedRef.current) {
        if (pollRef.current) clearInterval(pollRef.current);
        const [oppUid, oppElo] = result;
        queueUnsub();
        myUnsub();
        await pairWith(oppUid, oppElo);
      }
    }, 4000);

    unsubRef.current = () => { myUnsub(); queueUnsub(); };
  }

  async function pairWith(oppUid: string, oppElo: number) {
    if (matchedRef.current || !db) return;
    matchedRef.current = true;
    setStatus("creating");
    setMatchedOpponentElo(oppElo);

    let code = "";
    for (let i = 0; i < 10; i++) {
      code = generateCode();
      const existing = await get(ref(db, `rooms/${code}`));
      if (!existing.exists()) break;
    }

    const oppSnap = await get(ref(db, `matchmaking/${oppUid}`));
    if (!oppSnap.exists()) {
      matchedRef.current = false;
      setMatchedOpponentElo(undefined);
      setStatus("searching");
      startMatchmaking();
      return;
    }
    const opp = oppSnap.val() as { uid: string; name: string; color: PieceColor; avatar?: string; profilePhoto?: string; elo?: number };
    const myName = name.trim() || "Warrior";
    const myColor = pieceColor;
    const oppColor: PieceColor = opp.color === myColor ? (myColor === "orange" ? "pink" : "orange") : opp.color;
    const resolvedOppElo = opp.elo ?? oppElo;

    const initialState: GameState = {
      status: "waiting",
      players: {
        player1: { uid, displayName: myName, avatar, profilePhoto },
        player2: { uid: oppUid, displayName: opp.name || "Warrior", avatar: opp.avatar || "", profilePhoto: opp.profilePhoto || "" },
      },
      colors: { player1: "orange", player2: "pink" },
      board: buildInitialBoard(),
      currentTurn: "player1",
      firstMoveDone: false,
      orangePieces: 12,
      pinkPieces: 12,
      createdAt: Date.now(),
      lastMoveAt: Date.now(),
      pieceColors: { player1: myColor, player2: oppColor },
      eloSnapshot: { player1: myElo, player2: resolvedOppElo },
    };

    await set(ref(db, `rooms/${code}`), initialState);
    await update(ref(db, `matchmaking/${oppUid}`), { status: "matched", roomCode: code, role: "player2" });
    await remove(ref(db, `matchmaking/${uid}`));

    setStatus("found");
    setTimeout(() => setLocation(`/room/${code}`), 700);
  }

  const dots = ".".repeat((searchTime % 3) + 1);
  const currentRange = eloRangeLabel(searchTime);
  const K = 32;
  const expectedWin = matchedOpponentElo !== undefined
    ? 1 / (1 + Math.pow(10, (matchedOpponentElo - myElo) / 400))
    : null;
  const estimatedGain = expectedWin !== null ? Math.round(K * (1 - expectedWin)) : null;
  const estimatedLoss = expectedWin !== null ? Math.round(K * (0 - expectedWin)) : null;

  return (
    <div className="screen-bg">
      <div className="flex flex-col items-center gap-8 px-6 w-full max-w-sm animate-fade-in">
        <button
          onClick={onCancel}
          className="self-start p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <X size={16} className="text-white/50" />
        </button>

        <div className="flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: `rgba(245,158,11,${0.3 / i})` }}
                animate={{ scale: [1, 1.5 + i * 0.3], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
              />
            ))}
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))", border: "2px solid rgba(245,158,11,0.3)" }}>
              <div className="text-3xl">⬤</div>
            </div>
          </div>

          <div className="text-center space-y-1">
            {status === "searching" && (
              <>
                <div className="text-xl font-bold text-white">Finding Opponent{dots}</div>
                <div className="text-white/30 text-sm">{searchTime}s · {queueSize} in queue</div>
              </>
            )}
            {status === "creating" && (
              <div className="text-xl font-bold text-white">Setting up match{dots}</div>
            )}
            {status === "found" && (
              <div className="text-xl font-bold text-green-400">Opponent found!</div>
            )}
          </div>
        </div>

        <div className="premium-card p-4 w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: "rgba(245,158,11,0.15)", border: "1.5px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}>
              {(name || "W").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{name || "Warrior"}</div>
              <div className="text-xs text-white/30">Looking for match</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-amber-400">{myElo}</div>
              <div className="text-[10px] text-white/30">ELO</div>
            </div>
          </div>

          {status === "searching" && (
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="text-[11px] text-white/30">Search range</div>
              <motion.div
                key={currentRange}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[11px] font-bold text-amber-400"
              >
                {currentRange}
              </motion.div>
            </div>
          )}

          {status === "searching" && searchTime >= 10 && searchTime < 30 && (
            <div className="text-[10px] text-white/20 text-center">
              {searchTime < 20 ? "Expanding to ±200 in " : "Expanding to any rank in "}{30 - searchTime}s…
            </div>
          )}

          {(status === "creating" || status === "found") && matchedOpponentElo !== undefined && estimatedGain !== null && estimatedLoss !== null && (
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="text-[11px] text-white/30">Opponent ELO</div>
              <div className="text-[11px] font-bold text-white/60">{matchedOpponentElo}</div>
              <div className="flex gap-2 text-[11px] font-bold">
                <span className="text-green-400">+{estimatedGain}</span>
                <span className="text-white/20">/</span>
                <span className="text-red-400">{estimatedLoss}</span>
              </div>
            </div>
          )}
        </div>

        {status === "searching" && (
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}

        <button onClick={onCancel} className="btn-secondary w-full py-3 text-sm">
          Cancel Search
        </button>
      </div>
    </div>
  );
}
