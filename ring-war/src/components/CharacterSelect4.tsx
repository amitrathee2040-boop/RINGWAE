import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player4Key, PLAYER4_COLORS, PLAYER4_LABELS, ALL_PLAYERS4 } from "../game/boardDefinition4";
import { ArrowLeft, ChevronRight, Check } from "lucide-react";

export interface Character {
  id: string;
  emoji: string;
  name: string;
  title: string;
  ability: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const CHARACTERS: Character[] = [
  { id: "warrior",  emoji: "⚔️",  name: "Warrior",  title: "Iron Blade",      ability: "Unstoppable charge",      rarity: "common"    },
  { id: "shadow",   emoji: "🗡️",  name: "Shadow",   title: "Dark Striker",    ability: "Strikes from darkness",   rarity: "rare"      },
  { id: "dragon",   emoji: "🐲",  name: "Dragon",   title: "Ancient Fury",    ability: "Devastates all foes",     rarity: "legendary" },
  { id: "phoenix",  emoji: "🔥",  name: "Phoenix",  title: "Eternal Flame",   ability: "Rises from defeat",       rarity: "epic"      },
  { id: "knight",   emoji: "🛡️",  name: "Knight",   title: "Iron Fortress",   ability: "Unbreakable defense",     rarity: "rare"      },
  { id: "thunder",  emoji: "⚡",  name: "Thunder",  title: "Storm Bringer",   ability: "Speed & precision",       rarity: "epic"      },
  { id: "ghost",    emoji: "👻",  name: "Ghost",    title: "The Unseen",      ability: "Invisible until it's late", rarity: "rare"    },
  { id: "wolf",     emoji: "🐺",  name: "Wolf",     title: "Pack Hunter",     ability: "Hunts in patterns",       rarity: "common"    },
];

const RARITY_COLORS: Record<string, string> = {
  common:    "#9ca3af",
  rare:      "#3b82f6",
  epic:      "#a855f7",
  legendary: "#f59e0b",
};

interface Props {
  /** Which players still need to pick (offline: all 4 in turn; online: just 1) */
  players: Player4Key[];
  /** Already chosen characters keyed by player */
  chosen: Record<string, string>;
  onDone: (chosen: Record<string, string>) => void;
  onBack: () => void;
  /** Names of each player */
  names: Record<Player4Key, string>;
  /** For online mode, only 1 player picks */
  singlePlayer?: boolean;
}

export default function CharacterSelect4({ players, chosen, onDone, onBack, names, singlePlayer }: Props) {
  const [step, setStep]         = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({ ...chosen });
  const [hovered, setHovered]   = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const currentPlayerKey = players[step];
  const playerColor      = PLAYER4_COLORS[currentPlayerKey];
  const playerLabel      = PLAYER4_LABELS[currentPlayerKey];
  const playerName       = names[currentPlayerKey];
  const selectedId       = selections[currentPlayerKey];

  const usedByOthers = singlePlayer
    ? new Set<string>()
    : new Set(Object.entries(selections).filter(([k]) => k !== currentPlayerKey).map(([, v]) => v));

  function selectChar(id: string) {
    if (usedByOthers.has(id)) return;
    setSelections(prev => ({ ...prev, [currentPlayerKey]: id }));
  }

  function confirm() {
    if (!selectedId) return;
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      if (step < players.length - 1) {
        setStep(s => s + 1);
      } else {
        onDone(selections);
      }
    }, 350);
  }

  const char = CHARACTERS.find(c => c.id === selectedId);

  return (
    <div style={{
      minHeight: "100dvh", width: "100%", overflow: "auto",
      background: "linear-gradient(160deg,#060916 0%,#0c0f2a 60%,#07111f 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Header */}
      <div style={{ width: "100%", maxWidth: 520, padding: "14px 16px 0", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)",
            fontSize: 13, background: "none", border: "none", cursor: "pointer", marginBottom: 14 }}>
          <ArrowLeft size={15} /> Back
        </button>

        {/* Player turn banner */}
        <AnimatePresence mode="wait">
          <motion.div key={currentPlayerKey}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: playerColor, boxShadow: `0 0 10px ${playerColor}` }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: playerColor, textTransform: "uppercase" }}>
                {singlePlayer ? "Your Character" : `${playerName} — ${playerLabel}`}
              </div>
              {!singlePlayer && (
                <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {step + 1} / {players.length}
                </div>
              )}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.05em", marginBottom: 2,
              background: `linear-gradient(90deg, #fff 0%, ${playerColor} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SELECT CHARACTER
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
              Choose your fighter for this battle
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step dots (offline multi-player) */}
        {!singlePlayer && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {ALL_PLAYERS4.map((k, i) => (
              <div key={k} style={{
                height: 4, flex: 1, borderRadius: 4,
                background: i < step
                  ? PLAYER4_COLORS[k]
                  : i === step
                    ? playerColor
                    : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Character grid */}
      <div style={{ width: "100%", maxWidth: 520, padding: "0 16px", flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div key={currentPlayerKey + step}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {CHARACTERS.map((c, i) => {
              const isSelected = selectedId === c.id;
              const isTaken    = usedByOthers.has(c.id);
              const isHovered  = hovered === c.id && !isTaken;
              const rarityColor = RARITY_COLORS[c.rarity];

              return (
                <motion.button key={c.id}
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  whileHover={!isTaken ? { scale: 1.04 } : {}}
                  whileTap={!isTaken ? { scale: 0.96 } : {}}
                  onClick={() => selectChar(c.id)}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    position: "relative", padding: "12px 8px 10px",
                    borderRadius: 14, cursor: isTaken ? "not-allowed" : "pointer",
                    border: `2px solid ${isSelected ? playerColor : isHovered ? rarityColor + "80" : "rgba(255,255,255,0.08)"}`,
                    background: isSelected
                      ? `linear-gradient(145deg, ${playerColor}18, ${playerColor}08)`
                      : isHovered
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.03)",
                    opacity: isTaken ? 0.35 : 1,
                    transition: "border 0.18s, background 0.18s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>

                  {/* Rarity glow dot */}
                  <div style={{ position: "absolute", top: 7, right: 8, width: 5, height: 5,
                    borderRadius: "50%", background: rarityColor, boxShadow: `0 0 5px ${rarityColor}` }} />

                  {/* Check mark */}
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ position: "absolute", top: 6, left: 8,
                        background: playerColor, borderRadius: "50%", width: 16, height: 16,
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={10} color="#000" strokeWidth={3} />
                    </motion.div>
                  )}

                  {/* Taken badge */}
                  {isTaken && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 12, display: "flex",
                      alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)",
                      fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>
                      TAKEN
                    </div>
                  )}

                  <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: isSelected ? playerColor : "rgba(255,255,255,0.85)",
                    letterSpacing: "0.04em", textAlign: "center" }}>
                    {c.name.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 8.5, color: rarityColor, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase" }}>
                    {c.rarity}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Selected character detail card */}
        <AnimatePresence mode="wait">
          {char && (
            <motion.div key={char.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              style={{ marginTop: 16, padding: "14px 18px",
                background: `linear-gradient(135deg, ${playerColor}12, rgba(255,255,255,0.03))`,
                borderRadius: 14, border: `1.5px solid ${playerColor}40`,
                display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 36 }}>{char.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "0.04em" }}>
                  {char.name} <span style={{ fontSize: 11, color: RARITY_COLORS[char.rarity], fontWeight: 700 }}>· {char.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
                  ✦ {char.ability}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={confirm}
          disabled={!selectedId || confirming}
          style={{
            width: "100%", marginTop: 14, padding: "14px 0",
            borderRadius: 12, border: "none", cursor: selectedId ? "pointer" : "not-allowed",
            background: selectedId
              ? `linear-gradient(90deg, ${playerColor}, ${playerColor}cc)`
              : "rgba(255,255,255,0.08)",
            color: selectedId ? "#000" : "rgba(255,255,255,0.25)",
            fontWeight: 900, fontSize: 14, letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.2s",
          }}>
          {confirming ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}>
              ⟳
            </motion.div>
          ) : (
            <>
              {step < players.length - 1 && !singlePlayer
                ? `CONFIRM · NEXT PLAYER`
                : "CONFIRM · START BATTLE"}
              <ChevronRight size={16} />
            </>
          )}
        </motion.button>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
