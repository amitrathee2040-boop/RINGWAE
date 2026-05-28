import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerKey } from "../types";

interface Props {
  tossResult: PlayerKey | null;
  myKey: PlayerKey;
  p1Name: string;
  p2Name: string;
  p1Color: string;
  p2Color: string;
}

export default function TossScreen({ tossResult, myKey, p1Name, p2Name, p1Color, p2Color }: Props) {
  const [showResult, setShowResult] = useState(false);
  const [flipping, setFlipping] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setFlipping(false), 1500);
    const t2 = setTimeout(() => setShowResult(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const winner = tossResult;
  const iWon = winner === myKey;
  const winnerName = winner === "player1" ? p1Name : p2Name;
  const winnerColor = winner === "player1" ? p1Color : p2Color;

  return (
    <div className="screen-bg">
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <p className="text-white/40 text-sm font-medium tracking-widest uppercase">Coin Toss</p>

        <div className="relative w-28 h-28">
          <motion.div
            className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-black shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${p1Color}, ${p2Color})` }}
            animate={flipping ? { rotateY: [0, 360, 720, 1080, 1440] } : { rotateY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            ⬤
          </motion.div>
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 40px rgba(245,158,11,0.25)` }} />
        </div>

        <AnimatePresence>
          {showResult && winner && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-2"
            >
              <div className="text-2xl font-black" style={{ color: winnerColor }}>
                {winnerName}
              </div>
              <div className="text-white/50 text-sm">goes first!</div>
              {iWon ? (
                <div className="text-green-400 font-semibold text-sm mt-2">You won the toss</div>
              ) : (
                <div className="text-white/30 text-sm mt-2">Opponent goes first</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!showResult && (
          <p className="text-white/30 text-sm animate-pulse-soft">Tossing coin...</p>
        )}
      </div>
    </div>
  );
}
