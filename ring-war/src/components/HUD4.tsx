import { Player4Key, PLAYER4_COLORS, PLAYER4_LABELS } from "../game/boardDefinition4";
import { Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SpeakingMap } from "../hooks/useVoiceSpeaking4";

const CHAR_EMOJIS: Record<string, string> = {
  warrior:"⚔️", shadow:"🗡️", dragon:"🐲", phoenix:"🔥",
  knight:"🛡️", thunder:"⚡", ghost:"👻", wolf:"🐺",
};

interface PlayerInfo {
  key: Player4Key;
  name: string;
  charId?: string;
  pieces: number;
  eliminated: boolean;
}

interface Props {
  players:     PlayerInfo[];
  currentTurn: Player4Key;
  myKey:       Player4Key;
  winner:      Player4Key | null;
  chars?:      Record<string, string>;
  speaking?:   SpeakingMap;
}

// Pulsing mic rings — same PUBG-amber style as VoicePanel
function MicRings({ color }: { color: string }) {
  return (
    <>
      {[0, 0.35, 0.70].map(delay => (
        <motion.div
          key={delay}
          initial={{ scale: 1, opacity: 0.75 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.95, repeat: Infinity, ease: "easeOut", delay }}
          style={{
            position: "absolute", inset: -2,
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

export default function HUD4({ players, currentTurn, myKey, winner, chars, speaking = {} }: Props) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      padding: "6px 10px", justifyContent: "center", flexShrink: 0,
    }}>
      {players.map(p => {
        const color    = PLAYER4_COLORS[p.key];
        const isActive = currentTurn === p.key && !p.eliminated && !winner;
        const isMe     = p.key === myKey;
        const isWinner = winner === p.key;
        const charId   = p.charId ?? chars?.[p.key];
        const emoji    = charId ? (CHAR_EMOJIS[charId] ?? "") : "";
        const isTalking = !!speaking[p.key] && !p.eliminated;

        // Speaking glow override: amber when talking, else normal active colour
        const borderColor = isTalking
          ? "rgba(255,224,102,0.80)"
          : isActive
          ? color
          : "rgba(255,255,255,0.08)";

        const bgColor = isTalking
          ? "rgba(255,224,102,0.07)"
          : isActive
          ? `${color}20`
          : "rgba(255,255,255,0.04)";

        return (
          <div key={p.key}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px",
              borderRadius: 10,
              background: bgColor,
              border: `1.5px solid ${borderColor}`,
              opacity: p.eliminated ? 0.38 : 1,
              transition: "all 0.22s",
              minWidth: 100,
              flexShrink: 0,
              position: "relative",
            }}>

            {isWinner && <Crown size={12} color="#fbbf24" />}

            {/* Avatar dot / emoji — with mic rings when speaking */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <AnimatePresence>
                {isTalking && (
                  <MicRings color="#ffe066" />
                )}
              </AnimatePresence>

              {emoji
                ? <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
                : <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: color,
                    boxShadow: isTalking ? `0 0 6px #ffe066` : "none",
                    transition: "box-shadow 0.2s",
                  }} />
              }
            </div>

            {/* Name + sub-label */}
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, lineHeight: 1.2,
                color: isTalking ? "#ffe066" : isMe ? color : "rgba(255,255,255,0.85)",
                transition: "color 0.2s",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {p.name}{isMe ? " ★" : ""}

                {/* Tiny animated EQ bars beside name when speaking */}
                <AnimatePresence>
                  {isTalking && (
                    <motion.span
                      key="eq"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      style={{ display: "flex", alignItems: "flex-end", gap: 1.5, overflow: "hidden" }}
                    >
                      {[5, 9, 6, 10, 7].map((h, i) => (
                        <motion.span
                          key={i}
                          animate={{ height: [2, h, 3, h * 0.6, 2] }}
                          transition={{ duration: 0.38, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
                          style={{
                            display: "inline-block", width: 2, borderRadius: 1,
                            background: "#ffe066", minHeight: 2,
                          }}
                        />
                      ))}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                {PLAYER4_LABELS[p.key]} · {p.eliminated ? "Out" : `${p.pieces}♟`}
              </div>
            </div>

            {/* Active turn dot */}
            {isActive && !isTalking && (
              <div style={{
                marginLeft: "auto", width: 7, height: 7, borderRadius: "50%",
                background: color,
                animation: "pulse 1s ease-in-out infinite",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
