import { useCallback, useRef } from "react";

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const muteRef = useRef(localStorage.getItem("ringwar-mute") === "true");

  function ctx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }

  function tone(
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    gain: number,
    ac: AudioContext,
    freqEnd?: number
  ) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    }
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  function noise(startTime: number, duration: number, gain: number, ac: AudioContext) {
    const bufferSize = ac.sampleRate * duration;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    source.connect(filter);
    filter.connect(g);
    g.connect(ac.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  }

  const playMove = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      tone(480, "sine", t, 0.06, 0.12, ac, 600);
      tone(720, "sine", t + 0.03, 0.05, 0.08, ac);
    } catch {}
  }, []);

  const playCapture = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      tone(150, "sine", t, 0.08, 0.3, ac, 80);
      noise(t, 0.06, 0.18, ac);
      tone(600, "triangle", t + 0.04, 0.12, 0.15, ac, 900);
      tone(800, "sine", t + 0.08, 0.08, 0.1, ac);
    } catch {}
  }, []);

  const playCombo = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      const freqs = [523, 659, 784, 1047];
      freqs.forEach((f, i) => {
        tone(f, "sine", t + i * 0.07, 0.12, 0.22 - i * 0.02, ac);
      });
      tone(220, "triangle", t, 0.1, 0.18, ac, 180);
    } catch {}
  }, []);

  const playWin = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      const melody = [523, 659, 784, 1047, 1319];
      melody.forEach((f, i) => {
        tone(f, "sine", t + i * 0.11, 0.35, 0.2, ac);
        if (i < 3) tone(f * 1.25, "triangle", t + i * 0.11 + 0.05, 0.2, 0.08, ac);
      });
      [262, 330, 392].forEach((f, i) => {
        tone(f, "sine", t + i * 0.11, 0.25, 0.12, ac);
      });
    } catch {}
  }, []);

  const playLose = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      [440, 370, 330, 220].forEach((f, i) => {
        tone(f, "sine", t + i * 0.16, 0.35, 0.18 - i * 0.02, ac);
      });
      tone(110, "triangle", t + 0.3, 0.5, 0.15, ac, 80);
    } catch {}
  }, []);

  const playYourTurn = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      tone(880, "sine", t, 0.05, 0.12, ac);
      tone(1100, "sine", t + 0.06, 0.05, 0.1, ac);
    } catch {}
  }, []);

  const playSelect = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      tone(600, "sine", t, 0.04, 0.08, ac, 800);
    } catch {}
  }, []);

  const playDeselect = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      tone(500, "sine", t, 0.04, 0.06, ac, 400);
    } catch {}
  }, []);

  const playToss = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      [440, 554, 659, 554, 440, 554, 659, 784].forEach((f, i) => {
        tone(f, "sine", t + i * 0.08, 0.07, 0.15 - i * 0.01, ac);
      });
    } catch {}
  }, []);

  const playPurchase = useCallback(() => {
    if (muteRef.current) return;
    try {
      const ac = ctx();
      const t = ac.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => {
        tone(f, "triangle", t + i * 0.06, 0.1, 0.15, ac);
      });
    } catch {}
  }, []);

  const setMute = useCallback((muted: boolean) => {
    muteRef.current = muted;
    localStorage.setItem("ringwar-mute", String(muted));
  }, []);

  const isMuted = () => muteRef.current;

  return {
    playMove, playCapture, playCombo, playWin, playLose, playYourTurn,
    playSelect, playDeselect, playToss, playPurchase, setMute, isMuted,
  };
}
