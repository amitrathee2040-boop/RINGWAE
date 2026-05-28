/**
 * useVoiceSpeaking4 — Lightweight 4-player speaking-presence system
 *
 * Each client:
 *  1. Grabs the local mic (getUserMedia) and analyses audio levels
 *  2. Publishes true/false to Firebase at  voice4/<roomCode>/<playerKey>
 *  3. Subscribes to all four players' speaking states
 *
 * Returns a map of { player1: boolean, player2: boolean, … } so HUD4
 * can show a mic ring next to whoever is currently speaking.
 *
 * No WebRTC — just presence signals. Audio is not routed through this hook.
 */

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set, remove, onDisconnect } from "firebase/database";
import { db } from "../firebase";
import type { Player4Key } from "../game/boardDefinition4";

// ── Audio analysis constants ───────────────────────────────────────────────
const ANALYSIS_FFT         = 512;
const ANALYSIS_INTERVAL_MS = 60;   // ~16 fps
const SPEAK_THRESHOLD      = 18;   // avg RMS to mark as "speaking"
const SILENCE_THRESHOLD    = 6;    // avg RMS to mark as "silent"

// ─────────────────────────────────────────────────────────────────────────────
export type SpeakingMap = Partial<Record<Player4Key, boolean>>;

export function useVoiceSpeaking4(
  myKey:    Player4Key | null,
  roomCode: string,
): SpeakingMap {
  const [speaking, setSpeaking] = useState<SpeakingMap>({});
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakingRef  = useRef(false);
  const streamRef    = useRef<MediaStream | null>(null);
  const acRef        = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!myKey || !db || !roomCode) return;

    const basePath = `voice4/${roomCode}`;
    const myRef    = ref(db!, `${basePath}/${myKey}`);

    // ── 1. Subscribe to all speaking states ─────────────────────────────────
    const unsub = onValue(ref(db!, basePath), snap => {
      setSpeaking(snap.exists() ? (snap.val() as SpeakingMap) : {});
    });

    // ── 2. Analyse local mic and publish ────────────────────────────────────
    let mounted = true;

    async function startMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl:  { ideal: true },
            channelCount:     { ideal: 1 },
          },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const ac      = new AudioContext();
        acRef.current = ac;
        const src     = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = ANALYSIS_FFT;
        analyser.smoothingTimeConstant = 0.65;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        // Clean up on disconnect / tab close
        onDisconnect(myRef).remove();

        intervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((s, v) => s + v, 0) / data.length;

          if (!speakingRef.current && avg > SPEAK_THRESHOLD) {
            speakingRef.current = true;
            set(myRef, true).catch(() => {});
          } else if (speakingRef.current && avg < SILENCE_THRESHOLD) {
            speakingRef.current = false;
            remove(myRef).catch(() => {});
          }
        }, ANALYSIS_INTERVAL_MS);
      } catch {
        // Mic denied or unavailable — silent fail; indicators just stay off
      }
    }

    startMic();

    return () => {
      mounted = false;
      unsub();
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      acRef.current?.close();
      acRef.current = null;
      if (speakingRef.current) { remove(myRef).catch(() => {}); }
      speakingRef.current = false;
    };
  }, [myKey, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  return speaking;
}
