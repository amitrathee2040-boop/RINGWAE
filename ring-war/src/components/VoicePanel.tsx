/**
 * VoicePanel — PUBG Mobile / BGMI authentic voice HUD
 *
 * 3 elements only, stacked vertically at bottom-right:
 *   "TEAM"   tiny cyan label
 *   [🔊]     32px speaker circle  — tap to mute/unmute opponent
 *   [🎤]     46px mic circle      — hold = push-to-talk
 *
 * Voice connects automatically in the background when the game starts.
 * No "JOIN", no "CONNECTING", no status text — fully invisible like PUBG.
 *
 * Speaking state uses AMBER / YELLOW rings (PUBG-authentic).
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Settings } from "lucide-react";
import { useVoiceChat } from "../hooks/useVoiceChat";

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────
const BG        = "rgba(6, 10, 24, 0.76)";
const CYAN      = "rgba(0, 200, 255, 0.70)";
const CYAN_B    = "rgba(0, 200, 255, 0.22)";
const YELLOW    = "#ffe066";                      // PUBG speaking colour
const YELLOW_G  = "rgba(255,224,102,0.38)";       // yellow glow
const YELLOW_B  = "rgba(255,224,102,0.65)";       // yellow border
const RED       = "#ff4060";
const RED_B     = "rgba(255,64,96,0.45)";
const MUTED_IC  = "rgba(255,255,255,0.28)";
const MUTED_B   = "rgba(255,255,255,0.12)";

// ─────────────────────────────────────────────────────────────────────────────
// Sound effects (Web Audio — no deps)
// ─────────────────────────────────────────────────────────────────────────────
function beep(f0: number, f1: number, ms: number, vol = 0.05) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.setValueAtTime(f0, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(f1, ctx.currentTime + ms * 0.0006);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    osc.start(); osc.stop(ctx.currentTime + ms / 1000);
  } catch { /**/ }
}
const sfx = {
  pttDn: () => beep(820, 820, 55),
  pttUp: () => beep(660, 660, 45),
  mute:  () => beep(420, 260, 90),
  unmute:() => beep(700, 900, 90),
};

// ─────────────────────────────────────────────────────────────────────────────
// Expanding PUBG-style speaking rings (amber/yellow)
// ─────────────────────────────────────────────────────────────────────────────
function SpeakRings({ color }: { color: string }) {
  return (
    <>
      {[0, 0.32, 0.64].map((delay) => (
        <motion.div
          key={delay}
          initial={{ scale: 1, opacity: 0.70 }}
          animate={{ scale: 2.9, opacity: 0 }}
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

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  uid:          string;
  roomCode:     string;
  myName:       string;
  opponentName: string;
  opponentUid:  string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// VoicePanel
// ─────────────────────────────────────────────────────────────────────────────
export default function VoicePanel({ uid, roomCode, myName: _myName, opponentName, opponentUid }: Props) {
  const voice = useVoiceChat(uid, roomCode, opponentUid);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const prevMicOn = useRef(voice.micOn);
  useEffect(() => {
    if (prevMicOn.current !== voice.micOn) {
      voice.micOn ? sfx.unmute() : sfx.mute();
      prevMicOn.current = voice.micOn;
    }
  }, [voice.micOn]);

  const isConnected = voice.status === "connected";

  // micActive: mic is enabled and transmitting (open-mic ON, or PTT held)
  const micActive = isConnected && (
    (!voice.pttMode && voice.micOn) ||
    (voice.pttMode && voice.pttActive)
  );

  // speaking: voice actually detected by audio analyser
  const speaking = micActive && voice.isSpeaking;

  // ── Mic button visual state ──────────────────────────────────────────────
  // Yellow when mic is actively ON (transmitting), grey when muted, cyan when connected/idle
  const micBorder = micActive
    ? YELLOW_B
    : isConnected && voice.micOn
    ? CYAN_B
    : MUTED_B;

  const micGlow = micActive ? YELLOW_G : undefined;

  const micBg = micActive
    ? "rgba(255,224,102,0.10)"
    : "rgba(6,10,24,0.76)";

  const micIconColor = micActive
    ? YELLOW
    : isConnected
    ? CYAN
    : MUTED_IC;

  // ── Speaker button visual state ──────────────────────────────────────────
  const spkBorder = voice.mutedOpp ? RED_B : CYAN_B;

  // ── Mic tap-toggle (open-mic mode) ────────────────────────────────────────
  function handleMicClick() {
    if (!isConnected || voice.pttMode) return;
    if (voice.micOn) { sfx.mute(); } else { sfx.unmute(); }
    voice.toggleMic();
  }

  // ── PTT handlers (only used when pttMode = true) ──────────────────────────
  function handleMicDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!voice.pttMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (isConnected) { sfx.pttDn(); voice.startPTT(); }
  }
  function handleMicUp() {
    if (!voice.pttMode) return;
    if (isConnected) { sfx.pttUp(); voice.stopPTT(); }
  }

  // ── Speaker tap ──────────────────────────────────────────────────────────
  function handleSpkTap() {
    if (isConnected) voice.toggleMuteOpp();
  }

  return (
    <>
      {/* ── Opponent speaking badge — top-centre of board ─────────────────── */}
      <AnimatePresence>
        {isConnected && voice.isOppSpeaking && (
          <motion.div
            key="opp-speaking"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              top: 8,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(4,8,20,0.80)",
              border: `1px solid ${YELLOW_B}`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              pointerEvents: "none",
              zIndex: 30,
              whiteSpace: "nowrap",
            }}
          >
            {/* Pulsing yellow dot */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.45, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: YELLOW, boxShadow: `0 0 6px ${YELLOW}`, flexShrink: 0 }}
            />
            {/* Mini EQ bars */}
            {[7, 12, 8, 14, 9].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [2, h, 2.5, h * 0.65, 2] }}
                transition={{ duration: 0.38, repeat: Infinity, ease: "easeInOut", delay: i * 0.065 }}
                style={{ width: 2.5, borderRadius: 2, background: YELLOW, minHeight: 2, flexShrink: 0 }}
              />
            ))}
            <span style={{ fontSize: 10, fontWeight: 800, color: YELLOW, letterSpacing: 0.7 }}>
              {(opponentName || "OPPONENT").toUpperCase()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS autoplay unlock banner ───────────────────────────────────── */}
      <AnimatePresence>
        {voice.autoplayBlocked && (
          <motion.button
            key="unlock-audio"
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

      {/* ── HUD button stack — bottom-right ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          zIndex: 25,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 7,
          pointerEvents: "auto",
        }}
      >
        {/* ── Settings gear button ───────────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          <motion.button
            data-small
            whileTap={{ scale: 1.12 }}
            onClick={() => setSettingsOpen(v => !v)}
            title="Voice settings"
            style={{
              width: 22, height: 22,
              borderRadius: "50%",
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
                  bottom: 28,
                  right: 0,
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
                    onClick={voice.togglePttMode}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      width: 36, height: 20,
                      borderRadius: 10,
                      border: "none",
                      background: voice.pttMode
                        ? `linear-gradient(90deg, rgba(0,200,255,0.7), rgba(0,200,255,0.5))`
                        : "rgba(255,255,255,0.12)",
                      cursor: "pointer",
                      position: "relative",
                      flexShrink: 0,
                      transition: "background 0.25s",
                      boxShadow: voice.pttMode ? `0 0 8px rgba(0,200,255,0.35)` : "none",
                    }}
                  >
                    <motion.div
                      animate={{ x: voice.pttMode ? 17 : 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      style={{
                        position: "absolute",
                        top: 3, width: 14, height: 14,
                        borderRadius: "50%",
                        background: voice.pttMode ? "#fff" : "rgba(255,255,255,0.4)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      }}
                    />
                  </motion.button>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "9px 0" }} />

                {/* Sensitivity slider row */}
                <div>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 6,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                      Mic Sensitivity
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 800,
                      color: voice.sensitivity <= 2 ? "rgba(255,255,255,0.5)"
                           : voice.sensitivity >= 4 ? YELLOW : CYAN,
                      minWidth: 28, textAlign: "right",
                    }}>
                      {["LOW","","MED","","HIGH"][voice.sensitivity - 1]}
                    </span>
                  </div>

                  {/* Track + filled portion */}
                  <div style={{ position: "relative", height: 18, display: "flex", alignItems: "center" }}>
                    {/* Track background */}
                    <div style={{
                      position: "absolute", left: 0, right: 0, height: 3,
                      borderRadius: 2, background: "rgba(255,255,255,0.10)",
                    }} />
                    {/* Filled portion */}
                    <div style={{
                      position: "absolute", left: 0, height: 3,
                      borderRadius: 2,
                      width: `${((voice.sensitivity - 1) / 4) * 100}%`,
                      background: voice.sensitivity >= 4
                        ? `linear-gradient(90deg, ${CYAN}, ${YELLOW})`
                        : `linear-gradient(90deg, rgba(0,200,255,0.5), rgba(0,200,255,0.8))`,
                      transition: "width 0.15s, background 0.2s",
                    }} />
                    <input
                      type="range"
                      min={1} max={5} step={1}
                      value={voice.sensitivity}
                      onChange={e => voice.setSensitivity(Number(e.target.value))}
                      style={{
                        position: "relative", zIndex: 1,
                        width: "100%", margin: 0,
                        appearance: "none", WebkitAppearance: "none",
                        background: "transparent", cursor: "pointer",
                        height: 18,
                      }}
                    />
                  </div>

                  {/* Tick labels */}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    marginTop: 2, paddingLeft: 1, paddingRight: 1,
                  }}>
                    {[1,2,3,4,5].map(v => (
                      <div key={v} style={{
                        width: 2, height: 2, borderRadius: "50%",
                        background: v <= voice.sensitivity
                          ? (v >= 4 ? YELLOW : CYAN)
                          : "rgba(255,255,255,0.2)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>

                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>
                    {voice.sensitivity <= 2
                      ? "Loud voice needed"
                      : voice.sensitivity >= 4
                      ? "Whisper triggers mic"
                      : "Balanced (default)"}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "9px 0" }} />

                {/* Current mode badge */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                }}>
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
          fontSize: 8,
          fontWeight: 900,
          letterSpacing: 2,
          color: isConnected ? CYAN : "rgba(255,255,255,0.15)",
          textShadow: isConnected ? `0 0 8px rgba(0,200,255,0.5)` : "none",
          transition: "color 0.4s",
          userSelect: "none",
        }}>
          TEAM
        </span>

        {/* Speaker / mute-opponent button — 32px */}
        <motion.button
          data-small
          whileTap={{ scale: 1.10 }}
          onClick={handleSpkTap}
          title={voice.mutedOpp ? "Unmute opponent" : "Mute opponent"}
          style={{
            width: 32, height: 32,
            borderRadius: "50%",
            background: voice.mutedOpp ? "rgba(255,64,96,0.12)" : BG,
            border: `1.5px solid ${spkBorder}`,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "inset 0 0 6px rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
          }}
        >
          {voice.mutedOpp
            ? <VolumeX size={13} color={RED} />
            : <Volume2 size={13} color={isConnected ? CYAN : MUTED_IC} />
          }
        </motion.button>

        {/* Mic / PTT button — 46px, primary */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>

          {/* Live audio level bar — left of mic button */}
          <div style={{
            width: 4, height: 46,
            borderRadius: 3,
            background: "rgba(255,255,255,0.07)",
            overflow: "hidden",
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
          }}>
            <div style={{
              width: "100%",
              height: `${micActive ? Math.max(4, voice.audioLevel) : 0}%`,
              borderRadius: 3,
              background: voice.audioLevel > 70
                ? RED
                : voice.audioLevel > 35
                ? YELLOW
                : CYAN,
              transition: "height 55ms linear, background 0.15s",
              boxShadow: micActive && voice.audioLevel > 10
                ? `0 0 4px ${voice.audioLevel > 70 ? RED : voice.audioLevel > 35 ? YELLOW : CYAN}`
                : "none",
            }} />
          </div>

          {/* Mic button + rings wrapper */}
          <div style={{ position: "relative" }}>
          {/* PUBG amber/yellow speaking rings */}
          {speaking && <SpeakRings color={YELLOW} />}

          <motion.button
            whileTap={{ scale: 1.07 }}
            onClick={handleMicClick}
            onPointerDown={handleMicDown}
            onPointerUp={handleMicUp}
            onPointerLeave={handleMicUp}
            title={voice.pttMode ? "Hold to talk" : (voice.micOn ? "Tap to mute mic" : "Tap to unmute mic")}
            animate={{
              boxShadow: micActive
                ? [`0 0 6px ${YELLOW_G}`, `0 0 20px rgba(255,220,80,0.50)`, `0 0 8px ${YELLOW_G}`]
                : micGlow ? `0 0 10px ${micGlow}` : "inset 0 0 8px rgba(0,0,0,0.55)",
            }}
            transition={micActive ? { duration: 0.7, repeat: Infinity } : { duration: 0.25 }}
            style={{
              width: 46, height: 46,
              borderRadius: "50%",
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
            {isConnected && !voice.micOn && !voice.pttMode
              ? <MicOff size={18} color={RED} />
              : <motion.div
                  animate={speaking ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={speaking ? { duration: 0.5, repeat: Infinity } : {}}
                  style={{ display: "flex" }}
                >
                  <Mic
                    size={18}
                    color={micIconColor}
                    style={{
                      filter: micActive ? `drop-shadow(0 0 5px ${YELLOW})` : "none",
                      transition: "filter 0.2s, color 0.2s",
                    }}
                  />
                </motion.div>
            }
          </motion.button>
          </div>{/* end mic+rings wrapper */}
        </div>{/* end flex row (level bar + mic) */}
      </div>{/* end HUD stack */}
    </>
  );
}
