import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Home, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { PlayerKey } from "../types";
import { usePlayer } from "../contexts/PlayerContext";
import RankBadge from "./RankBadge";
import { getLeagueInfo } from "../contexts/PlayerContext";

interface Props {
  winner: PlayerKey;
  surrendered?: PlayerKey | null;
  myKey: PlayerKey;
  p1Name: string;
  p2Name: string;
  p1Color: string;
  p2Color: string;
  gameMode?: "online" | "offline";
  roomCode?: string;
  opponentElo?: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function GameResult({ winner, surrendered, myKey, p1Name, p2Name, p1Color, p2Color, gameMode = "online", roomCode, opponentElo, onPlayAgain, onHome }: Props) {
  const iWon = winner === myKey;
  const winnerName = winner === "player1" ? p1Name : p2Name;
  const winnerColor = winner === "player1" ? p1Color : p2Color;
  const opponentName = myKey === "player1" ? p2Name : p1Name;
  const { addCoins, addGems, addMatchResult, data } = usePlayer();
  const [, setLocation] = useLocation();

  const [rewardCoins] = useState(() => iWon ? Math.floor(Math.random() * 100) + 100 : 20);
  const [rewardGems] = useState(() => iWon ? (Math.random() < 0.3 ? 5 : 0) : 0);
  const [rewarded, setRewarded] = useState(false);
  const [eloChange, setEloChange] = useState<number | undefined>(undefined);

  const leagueInfo = getLeagueInfo(data?.wins ?? 0);

  useEffect(() => {
    if (!rewarded) {
      setRewarded(true);
      addCoins(rewardCoins);
      if (rewardGems > 0) addGems(rewardGems);
      const myElo = data?.elo ?? 1200;
      let change: number | undefined;
      if (gameMode === "online" && opponentElo !== undefined) {
        const K = 32;
        const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
        change = Math.round(K * ((iWon ? 1 : 0) - expected));
      }
      setEloChange(change);
      addMatchResult({
        result: iWon ? "win" : "loss",
        opponentName,
        coinsEarned: rewardCoins,
        gemsEarned: rewardGems,
        surrendered: !!surrendered,
        gameMode,
        roomCode,
        playedAt: Date.now(),
        opponentElo,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="flex flex-col items-center gap-6 px-6 w-full max-w-sm"
      >
        <div className="relative">
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: iWon ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
              border: `2px solid ${iWon ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}
            animate={iWon ? {
              boxShadow: ["0 0 20px rgba(245,158,11,0.2)", "0 0 50px rgba(245,158,11,0.5)", "0 0 20px rgba(245,158,11,0.2)"]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {iWon ? (
              <Trophy size={40} style={{ color: "#f59e0b" }} />
            ) : (
              <span className="text-4xl">😔</span>
            )}
          </motion.div>
          {iWon && (
            <motion.div
              className="absolute -top-2 -right-2"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <span className="text-2xl">🏆</span>
            </motion.div>
          )}
        </div>

        <div className="text-center space-y-1">
          <motion.div
            className="text-3xl font-black"
            style={{ color: iWon ? "#f59e0b" : "rgba(255,255,255,0.5)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {iWon ? "Victory! 🎉" : "Defeated"}
          </motion.div>
          <div className="text-sm theme-text-muted">
            {surrendered
              ? `${winner === "player1" ? p2Name : p1Name} surrendered`
              : `${winnerName} wins the match`}
          </div>
        </div>

        <div className="theme-card p-4 w-full flex items-center justify-center gap-3 rounded-2xl">
          <div className="w-3 h-3 rounded-full" style={{ background: winnerColor }} />
          <span className="font-bold theme-text-primary">{winnerName}</span>
          <span className="theme-text-muted text-sm">wins</span>
        </div>

        <motion.div
          className="w-full theme-card p-4 rounded-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-xs font-semibold theme-text-muted uppercase tracking-wider text-center mb-3">
            {iWon ? "🎁 Rewards Earned" : "📦 Consolation"}
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <motion.span
                className="text-xl font-black text-amber-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
              >
                +{rewardCoins}
              </motion.span>
              <div className="flex items-center gap-1">
                <span className="text-sm">🪙</span>
                <span className="text-[10px] theme-text-muted">Coins</span>
              </div>
            </div>
            {rewardGems > 0 && (
              <div className="flex flex-col items-center gap-1">
                <motion.span
                  className="text-xl font-black text-cyan-400"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                >
                  +{rewardGems}
                </motion.span>
                <div className="flex items-center gap-1">
                  <span className="text-sm">💎</span>
                  <span className="text-[10px] theme-text-muted">Gems</span>
                </div>
              </div>
            )}
            {eloChange !== undefined && (
              <div className="flex flex-col items-center gap-1">
                <motion.span
                  className={`text-xl font-black ${eloChange >= 0 ? "text-green-400" : "text-red-400"}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.75, type: "spring" }}
                >
                  {eloChange >= 0 ? "+" : ""}{eloChange}
                </motion.span>
                <div className="flex items-center gap-1">
                  <span className="text-sm">📊</span>
                  <span className="text-[10px] theme-text-muted">ELO</span>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <RankBadge league={leagueInfo} size="md" animated />
              <span className="text-[10px] theme-text-muted">{leagueInfo.leagueLabel}</span>
            </div>
          </div>
        </motion.div>

        <div className="w-full space-y-2.5">
          <motion.button
            onClick={onPlayAgain}
            className="btn-gold w-full py-3.5 font-semibold flex items-center justify-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            <RotateCcw size={16} /> Play Again
          </motion.button>
          <div className="flex gap-2">
            <button
              onClick={onHome}
              className="theme-btn-secondary flex-1 py-3.5 flex items-center justify-center gap-2 text-sm rounded-2xl"
            >
              <Home size={16} /> Home
            </button>
            <button
              onClick={() => setLocation("/history")}
              className="theme-btn-secondary flex-1 py-3.5 flex items-center justify-center gap-2 text-sm rounded-2xl"
            >
              <Clock size={16} /> History
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
