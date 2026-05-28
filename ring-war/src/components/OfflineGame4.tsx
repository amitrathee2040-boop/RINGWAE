import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { buildInitialBoard4, Player4Key, PLAYER4_COLORS, ALL_PLAYERS4 } from "../game/boardDefinition4";
import { applyMove4, hasAnyMoves4, Board4, nextTurn4, countPieces4 } from "../game/gameLogic4";
import { getHintMove4 } from "../game/botAI4";
import Board4Component from "./Board4";
import HUD4 from "./HUD4";
import CharacterSelect4 from "./CharacterSelect4";

import { ArrowLeft, RotateCcw, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdSlot from "./AdSlot";

type Screen = "setup" | "charselect" | "playing" | "result";

const DEFAULT_NAMES: Record<Player4Key, string> = {
  player1: "Player 1",
  player2: "Player 2",
  player3: "Player 3",
  player4: "Player 4",
};

export default function OfflineGame4({ uid: _uid }: { uid: string }) {
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>("setup");
  const [names, setNames] = useState<Record<Player4Key, string>>({ ...DEFAULT_NAMES });
  const [chars, setChars] = useState<Record<string, string>>({});
  const [board, setBoard] = useState<Board4>(() => buildInitialBoard4());
  const [currentTurn, setCurrentTurn] = useState<Player4Key>("player1");
  const [inCombo, setInCombo] = useState(false);
  const [comboFrom, setComboFrom] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player4Key | null>(null);
  const [eliminated, setEliminated] = useState<Record<string, boolean>>({});
  const [pieces, setPieces] = useState<Record<Player4Key, number>>({ player1: 12, player2: 12, player3: 12, player4: 12 });
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  function handleHintClick() {
    const best = getHintMove4(board, currentTurn, inCombo, comboFrom);
    if (!best) return;
    setHintMove({ from: best.from, to: best.to });
    setHintVisible(false);
    setHintAdCountdown(5);
    setShowHintAd(true);
  }

  const handleMove = useCallback((from: number, to: number, kills: number[]) => {
    setHintMove(null);
    setHintVisible(false);
    setShowHintAd(false);
    setBoard(prevBoard => {
      const result = applyMove4(from, to, kills, prevBoard, currentTurn, eliminated);
      setEliminated(result.eliminated);
      setPieces(result.pieces);

      if (result.winner) {
        setTimeout(() => { setWinner(result.winner); setScreen("result"); }, 60);
        return result.newBoard;
      }

      if (result.canCombo) {
        setInCombo(true);
        setComboFrom(to);
        return result.newBoard;
      }

      let next = nextTurn4(currentTurn, result.eliminated);
      let skips = 0;
      while (!hasAnyMoves4(result.newBoard, next) && !result.eliminated[next] && skips < 4) {
        const newElim = { ...result.eliminated, [next]: true };
        setEliminated(newElim);
        const active = ALL_PLAYERS4.filter(p => !newElim[p]);
        if (active.length <= 1) {
          const w = active[0] ?? currentTurn;
          setTimeout(() => { setWinner(w); setScreen("result"); }, 60);
          return result.newBoard;
        }
        next = nextTurn4(next, newElim);
        skips++;
      }

      setCurrentTurn(next);
      setInCombo(false);
      setComboFrom(null);
      return result.newBoard;
    });
  }, [currentTurn, eliminated]);

  function startPlaying(selectedChars: Record<string, string>) {
    setChars(selectedChars);
    setBoard(buildInitialBoard4());
    setCurrentTurn("player1");
    setInCombo(false);
    setComboFrom(null);
    setWinner(null);
    setEliminated({});
    setPieces({ player1: 12, player2: 12, player3: 12, player4: 12 });
    setScreen("playing");
  }

  function resetGame() {
    setScreen("charselect");
  }

  const playerInfos = ALL_PLAYERS4.map(k => ({
    key: k,
    name: names[k],
    charId: chars[k],
    pieces: pieces[k],
    eliminated: !!eliminated[k],
  }));

  /* ─── SETUP SCREEN ─────────────────────────────── */
  if (screen === "setup") {
    return (
      <div className="screen-bg" style={{ overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 440, padding: "16px 16px 32px", margin: "0 auto" }}>
          <button onClick={() => setLocation("/")}
            className="flex items-center gap-2 mb-6"
            style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-6">
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.05em" }} className="shimmer-text">
              4-PLAYER BATTLE
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Hot-seat · Enter player names
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ALL_PLAYERS4.map(k => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.04)", borderRadius: 10,
                border: `1.5px solid ${PLAYER4_COLORS[k]}30`, padding: "10px 14px" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: PLAYER4_COLORS[k], flexShrink: 0 }} />
                <input
                  value={names[k]}
                  onChange={e => setNames(prev => ({ ...prev, [k]: e.target.value }))}
                  style={{ background: "transparent", border: "none", outline: "none", flex: 1,
                    color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 600 }}
                  placeholder={DEFAULT_NAMES[k]}
                />
              </div>
            ))}
          </div>

          <button onClick={() => setScreen("charselect")}
            className="btn-gold w-full mt-6"
            style={{ padding: "14px 0", fontSize: 15, borderRadius: 12 }}>
            Select Characters →
          </button>

          <AdSlot variant="leaderboard" className="mt-6" />
        </div>
      </div>
    );
  }

  /* ─── CHARACTER SELECT SCREEN ──────────────────── */
  if (screen === "charselect") {
    return (
      <CharacterSelect4
        players={ALL_PLAYERS4}
        chosen={chars}
        names={names}
        onBack={() => setScreen("setup")}
        onDone={startPlaying}
      />
    );
  }

  /* ─── RESULT SCREEN ────────────────────────────── */
  if (screen === "result") {
    const winnerInfo = playerInfos.find(p => p.key === winner);
    const winColor = winner ? PLAYER4_COLORS[winner] : "#fbbf24";
    const winChar = winner ? chars[winner] : null;
    const winEmoji = winChar
      ? (["⚔️","🗡️","🐲","🔥","🛡️","⚡","👻","🐺"].find((_, i) =>
          ["warrior","shadow","dragon","phoenix","knight","thunder","ghost","wolf"][i] === winChar) ?? "🏆")
      : "🏆";

    return (
      <div className="screen-bg">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: "100%", maxWidth: 360, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{winEmoji}</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Winner!</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: winColor, marginBottom: 4 }}>
            {winnerInfo?.name ?? "Winner"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Final standings:</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {[...playerInfos].sort((a, b) => b.pieces - a.pieces).map((p, rank) => {
              const charEmoji = p.charId
                ? (["⚔️","🗡️","🐲","🔥","🛡️","⚡","👻","🐺"].find((_, i) =>
                    ["warrior","shadow","dragon","phoenix","knight","thunder","ghost","wolf"][i] === p.charId) ?? "")
                : "";
              return (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 14px", borderRadius: 10,
                  background: p.key === winner ? `${PLAYER4_COLORS[p.key]}18` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${p.key === winner ? PLAYER4_COLORS[p.key] + "50" : "rgba(255,255,255,0.07)"}` }}>
                  <div style={{ fontSize: 16, width: 24, textAlign: "center" }}>
                    {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "4️⃣"}
                  </div>
                  <span style={{ fontSize: 18 }}>{charEmoji}</span>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PLAYER4_COLORS[p.key] }} />
                  <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{p.pieces}♟</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={resetGame} className="btn-gold" style={{ flex: 1, padding: "12px 0", fontSize: 14, borderRadius: 10 }}>
              Play Again
            </button>
            <button onClick={() => setLocation("/")} className="btn-secondary" style={{ flex: 1, padding: "12px 0", fontSize: 14, borderRadius: 10 }}>
              Home
            </button>
          </div>
          <AdSlot variant="leaderboard" className="mt-4" />
        </motion.div>
      </div>
    );
  }

  /* ─── PLAYING SCREEN ───────────────────────────── */
  const turnColor = PLAYER4_COLORS[currentTurn];
  const turnName = names[currentTurn];
  const turnCharId = chars[currentTurn];
  const CHAR_EMOJIS: Record<string, string> = {
    warrior:"⚔️", shadow:"🗡️", dragon:"🐲", phoenix:"🔥",
    knight:"🛡️", thunder:"⚡", ghost:"👻", wolf:"🐺",
  };
  const turnEmoji = turnCharId ? (CHAR_EMOJIS[turnCharId] ?? "") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", width: "100%", overflow: "hidden",
      background: "linear-gradient(150deg,#0a0e1f 0%,#080c1a 100%)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => setShowExitConfirm(true)}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em" }}>4-PLAYER BATTLE</div>
        </div>
        <button onClick={handleHintClick}
          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: 8, padding: "6px 10px", color: "#22c55e", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
          <Lightbulb size={13} /> Hint
        </button>
        <button onClick={resetGame}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
          <RotateCcw size={16} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentTurn} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
          style={{ textAlign: "center", padding: "5px 0", flexShrink: 0,
            fontSize: 12, fontWeight: 700, color: turnColor, letterSpacing: "0.06em" }}>
          {turnEmoji} {turnName}'s Turn
        </motion.div>
      </AnimatePresence>

      <HUD4 players={playerInfos} currentTurn={currentTurn} myKey={currentTurn} winner={winner} chars={chars} />

      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px" }}>
        <Board4Component
          board={board}
          myKey={currentTurn}
          currentTurn={currentTurn}
          isMyTurn={true}
          inCombo={inCombo}
          comboFrom={comboFrom}
          eliminated={eliminated}
          onMove={handleMove}
          hintFrom={hintVisible ? (hintMove?.from ?? null) : null}
          hintTo={hintVisible ? (hintMove?.to ?? null) : null}
        />
      </div>

      <div style={{ padding: "6px 10px", flexShrink: 0 }}>
        <AdSlot variant="banner" />
      </div>

      <AnimatePresence>
        {showHintAd && (
          <AdInterstitial
            countdown={hintAdCountdown}
            onClose={() => { setShowHintAd(false); setHintVisible(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(0,0,0,0.65)" }}>
            <motion.div initial={{ scale: 0.88 }} animate={{ scale: 1 }}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 20,
                padding: "24px 20px", margin: "0 24px", textAlign: "center", maxWidth: 320, width: "100%" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚪</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", marginBottom: 6 }}>Quit Game?</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>Current game progress will be lost.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowExitConfirm(false)}
                  className="theme-btn-secondary"
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                  Continue
                </button>
                <button onClick={() => setLocation("/")}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", cursor: "pointer" }}>
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
