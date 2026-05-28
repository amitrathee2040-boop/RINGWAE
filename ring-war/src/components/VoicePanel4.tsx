/**
 * VoicePanel4 — PUBG-style voice HUD for 4-player rooms
 *
 * Stack (bottom-right, same visual language as VoicePanel):
 *   [⚙]   gear  — opens PTT settings popover
 *   TEAM  label
 *   ●●●   peer status dots (one per teammate)
 *   [🎤]  mic button — tap-toggle (open-mic) or hold (PTT)
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Settings } from "lucide-react";
import { useVoiceChat4 } from "../hooks/useVoiceChat4";
import type { Player4Key } from "../game/boardDefinition4";
import { PLAYER4_COLORS } from "../game/boardDefinition4";

// ── Palette ───────────────────────────────────────────────────────────────
const BG       = "rgba(6, 10, 24, 0.78)";
const CYAN     = "rgba(0, 200, 255, 0.70)";
const CYAN_B   = "rgba(0, 200, 255, 0.22)";
const YELLOW   = "#ffe066";
const YELLOW_B = "rgba(255,224,102,0.65)";
const YELLOW_G = "rgba(255,224,102,0.38)";
const RED      = "#ff4060";
const MUTED    = "rgba(255,255,255,0.18)";
const MUTED_B  = "rgba(255,255,255,0.12)";

// ── Expanding PUBG-style speaking rings ───────────────────────────────────
function TxRings({ color }: { color: string }) {
  return (
    <>
      {[0, 0.32, 0.64].map(delay => (
        <motion.div
          key={delay}
          initial={{ scale: 1, opacity: 0.70 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 1.05, repeat: Infinity, ease: "easeOut", delay }}
          style={{
            position: "absolute", inset: -3,
            borderRadius: "50%",
            border: `1.5px solid ${color}`,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────
interface Props {
  myKey:         Player4Key;
  roomCode:      string;
  activePlayers: Player4Key[];
}

// ─────────────────────────────────────────────────────────────────────────
export default function VoicePanel4({ myKey, roomCode, activePlayers }: Props) {
  const voice = useVoiceChat4(myKey, roomCode, activePlayers);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const peers      = activePlayers.filter(p => p !== myKey);
  const micActive  = voice.pttMode ? voice.pttActive : voice.micOn;
  const micBorder  = micActive ? YELLOW_B : voice.micOn ? CYAN_B : MUTED_B;
  const micBg      = micActive ? "rgba(255,224,102,0.10)" : BG;

  // ── PTT handlers ─────────────────────────────────────────────────────
  function handleMicClick() {
    if (voice.pttMode) return;
    voice.toggleMic();
  }
  function handleMicDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!voice.pttMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    voice.startPTT();
  }
  function handleMicUp() {
    if (!voice.pttMode) return;
    voice.stopPTT();
  }

  return (
    <>
    {/* ── iOS autoplay unlock banner ─────────────────────────────────────── */}
    <AnimatePresence>
      {voice.autoplayBlocked && (
        <motion.button
          key="unlock-audio-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22 }}
          onClick={voice.unlockAudio}
          style={{
            position: "absolute",
            bottom: 90,
            right: 10,
            zIndex: 30,
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px",
            borderRadius: 20,
            background: "rgba(255,224,102,0.15)",
            border: `1px solid ${YELLOW_B}`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: YELLOW,
            fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <motion.span
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >🔊</motion.span>
          Tap to enable audio
        </motion.button>
      )}
    </AnimatePresence>

    <div
      style={{
        position: "absolute",
        bottom: 10, right: 10,
        zIndex: 25,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6,
        pointerEvents: "auto",
      }}
    >
      {/* ── Settings gear ──────────────────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        <motion.button
          data-small
          whileTap={{ scale: 1.12 }}
          onClick={() => setSettingsOpen(v => !v)}
          title="Voice settings"
          style={{
            width: 22, height: 22, borderRadius: "50%",
            background: settingsOpen ? "rgba(0,200,255,0.12)" : "transparent",
            border: `1px solid ${settingsOpen ? CYAN_B : "rgba(255,255,255,0.10)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          <motion.div
            animate={{ rotate: settingsOpen ? 60 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex" }}
          >
            <Settings size={11} color={settingsOpen ? CYAN : "rgba(255,255,255,0.35)"} />
          </motion.div>
        </motion.button>

        {/* ── PTT settings popover ──────────────────────────────────────── */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              key="settings-pop"
              initial={{ opacity: 0, scale: 0.85, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 4 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "absolute",
                bottom: 28, right: 0,
                width: 152,
                background: "rgba(6,10,24,0.94)",
                border: `1px solid rgba(0,200,255,0.18)`,
                borderRadius: 10,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                padding: "10px 12px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
              }}
            >
              {/* Header */}
              <div style={{
                fontSize: 8, fontWeight: 900, letterSpacing: 2,
                color: CYAN, marginBottom: 10,
                textShadow: `0 0 8px rgba(0,200,255,0.4)`,
              }}>
                VOICE SETTINGS
              </div>

              {/* PTT toggle row */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                    Push-to-Talk
                  </div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                    {voice.pttMode ? "Hold mic to speak" : "Tap mic to toggle"}
                  </div>
                </div>

                {/* Toggle pill */}
                <motion.button
                  data-small
                  onClick={voice.togglePttMode}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    border: "none",
                    background: voice.pttMode
                      ? `linear-gradient(90deg, rgba(0,200,255,0.7), rgba(0,200,255,0.5))`
                      : "rgba(255,255,255,0.12)",
                    cursor: "pointer",
                    position: "relative", flexShrink: 0,
                    transition: "background 0.25s",
                    boxShadow: voice.pttMode ? `0 0 8px rgba(0,200,255,0.35)` : "none",
                  }}
                >
                  <motion.div
                    animate={{ x: voice.pttMode ? 17 : 2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    style={{
                      position: "absolute",
                      top: 3, width: 14, height: 14, borderRadius: "50%",
                      background: voice.pttMode ? "#fff" : "rgba(255,255,255,0.4)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }}
                  />
                </motion.button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "9px 0" }} />

              {/* Peers connected */}
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", fontWeight: 600 }}>
                {peers.filter(p => voice.peerStatus[p] === "connected").length}/{peers.length} teammates connected
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "9px 0" }} />

              {/* Current mode badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: voice.pttMode ? CYAN : YELLOW,
                  boxShadow: `0 0 5px ${voice.pttMode ? CYAN : YELLOW}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.50)", fontWeight: 600 }}>
                  {voice.pttMode ? "PTT MODE ACTIVE" : "OPEN MIC ACTIVE"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TEAM label */}
      <span style={{
        fontSize: 7, fontWeight: 900, letterSpacing: 2,
        color: voice.anyConnected ? CYAN : "rgba(255,255,255,0.15)",
        textShadow: voice.anyConnected ? `0 0 8px rgba(0,200,255,0.5)` : "none",
        userSelect: "none", transition: "color 0.4s",
      }}>
        TEAM
      </span>

      {/* Per-peer status dots */}
      <div style={{ display: "flex", gap: 4 }}>
        {peers.map(pk => {
          const status = voice.peerStatus[pk];
          const color  = PLAYER4_COLORS[pk];
          const isConn = status === "connected";
          return (
            <motion.div
              key={pk}
              animate={isConn ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.3 }}
              transition={isConn ? { duration: 1.4, repeat: Infinity } : {}}
              title={pk}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isConn ? color : "rgba(255,255,255,0.15)",
                boxShadow: isConn ? `0 0 5px ${color}` : "none",
                transition: "background 0.3s, box-shadow 0.3s",
              }}
            />
          );
        })}
      </div>

      {/* Mic button */}
      <div style={{ position: "relative" }}>
        <AnimatePresence>
          {micActive && <TxRings key="rings" color={YELLOW} />}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 1.08 }}
          onClick={handleMicClick}
          onPointerDown={handleMicDown}
          onPointerUp={handleMicUp}
          onPointerLeave={handleMicUp}
          title={
            voice.pttMode
              ? "Hold to talk"
              : voice.micOn ? "Tap to mute mic" : "Tap to unmute mic"
          }
          animate={{
            boxShadow: micActive
              ? [`0 0 6px ${YELLOW_G}`, `0 0 20px rgba(255,220,80,0.50)`, `0 0 8px ${YELLOW_G}`]
              : "inset 0 0 8px rgba(0,0,0,0.55)",
          }}
          transition={micActive ? { duration: 0.7, repeat: Infinity } : { duration: 0.25 }}
          style={{
            width: 42, height: 42, borderRadius: "50%",
            background: micBg,
            border: `1.5px solid ${micBorder}`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            touchAction: "none",
            userSelect: "none",
            position: "relative", zIndex: 1,
            transition: "background 0.18s, border-color 0.18s",
          }}
        >
          {!voice.micOn && !voice.pttMode
            ? <MicOff size={17} color={RED} />
            : <motion.div
                animate={micActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={micActive ? { duration: 0.5, repeat: Infinity } : {}}
                style={{ display: "flex" }}
              >
                <Mic
                  size={17}
                  color={micActive ? YELLOW : voice.anyConnected ? CYAN : MUTED}
                  style={{
                    filter: micActive ? `drop-shadow(0 0 5px ${YELLOW})` : "none",
                    transition: "filter 0.2s, color 0.2s",
                  }}
                />
              </motion.div>
          }
        </motion.button>
      </div>
    </div>
    </>
  );
}
