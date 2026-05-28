/**
 * useVoiceChat — Agora RTC voice chat hook (2-player)
 *
 * Transport : Agora RTC SDK (agora-rtc-sdk-ng)
 * Features  : PTT (push-to-talk), mic toggle, opponent mute,
 *             speaking detection (Agora volume indicator), auto-reconnect
 */
import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "connecting" | "reconnecting" | "connected" | "failed";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID ?? "";

// Map string uid → stable numeric Agora UID (1-999999)
function hashUid(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return (h % 999998) + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
export function useVoiceChat(
  uid: string,
  roomCode: string,
  opponentUid: string | undefined,
) {
  const [status,          setStatus]          = useState<VoiceStatus>("idle");
  const [micOn,           setMicOn]           = useState(true);
  const [speakerOn,       setSpeakerOn]       = useState(true);
  const [mutedOpp,        setMutedOpp]        = useState(false);
  const [isSpeaking,      setIsSpeaking]      = useState(false);
  const [isOppSpeaking,   setIsOppSpeaking]   = useState(false);
  const [pttMode,         setPttMode]         = useState(false);
  const [pttActive,       setPttActive]       = useState(false);
  const [reconnectCount]                      = useState(0);
  const [sensitivity,     setSensitivity]     = useState(3);
  const [audioLevel,      setAudioLevel]      = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const clientRef      = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef  = useRef<IMicrophoneAudioTrack | null>(null);
  const joinedRef      = useRef(false);
  const pttModeRef     = useRef(false);
  const micOnRef       = useRef(true);
  const mutedOppRef    = useRef(false);
  const speakerOnRef   = useRef(true);

  useEffect(() => { pttModeRef.current  = pttMode;   }, [pttMode]);
  useEffect(() => { micOnRef.current    = micOn;     }, [micOn]);
  useEffect(() => { mutedOppRef.current = mutedOpp;  }, [mutedOpp]);
  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);

  // Auto-connect when opponent UID becomes known
  const hasAutoConnected = useRef(false);
  useEffect(() => {
    if (!opponentUid || !APP_ID) return;
    if (hasAutoConnected.current) return;
    hasAutoConnected.current = true;
    setTimeout(() => connectImplRef.current?.(), 400);
  }, [opponentUid]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectImplRef = useRef<(() => Promise<void>) | null>(null);

  // Unlock audio after iOS autoplay block — re-play all remote tracks
  const unlockAudio = useCallback(() => {
    clientRef.current?.remoteUsers.forEach(u => {
      if (u.audioTrack) {
        u.audioTrack.setVolume(mutedOppRef.current || !speakerOnRef.current ? 0 : 100);
        u.audioTrack.play();
      }
    });
    setAutoplayBlocked(false);
  }, []);

  connectImplRef.current = async function connectImpl() {
    if (!APP_ID || joinedRef.current) return;
    try {
      setStatus("connecting");

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // iOS Safari blocks audio autoplay — show a "tap to enable" prompt
      AgoraRTC.onAudioAutoplayFailed = () => setAutoplayBlocked(true);

      // Helper: subscribe and play a remote user's audio
      async function subscribeAudio(user: IAgoraRTCRemoteUser) {
        try {
          await client.subscribe(user, "audio");
          if (user.audioTrack) {
            user.audioTrack.setVolume(
              mutedOppRef.current || !speakerOnRef.current ? 0 : 100,
            );
            user.audioTrack.play();
          }
        } catch { /* autoplay blocked or subscribe failed — ignore */ }
      }

      // New user publishes audio
      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        if (mediaType === "audio") await subscribeAudio(user);
      });

      // User stops publishing (leaves / unpublishes)
      client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        if (mediaType === "audio") {
          user.audioTrack?.stop();
          setIsOppSpeaking(false);
        }
      });

      client.on("connection-state-change", (state: string) => {
        if (state === "CONNECTED")         setStatus("connected");
        else if (state === "RECONNECTING") setStatus("reconnecting");
        else if (state === "DISCONNECTED") { if (joinedRef.current) setStatus("idle"); }
      });

      const numUid = hashUid(uid);
      await client.join(APP_ID, `rw_${roomCode}`, null, numUid);
      joinedRef.current = true;

      // Subscribe to users already in the channel when we join
      // (fixes one-way audio when joining as the second player)
      for (const user of client.remoteUsers) {
        if (user.hasAudio) await subscribeAudio(user);
      }

      const track = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true, ANS: true, AGC: true,
        encoderConfig: { sampleRate: 48000, stereo: false, bitrate: 64 },
      });
      localTrackRef.current = track;
      // Respect current mic/PTT state when track is created
      if (pttModeRef.current) {
        track.setEnabled(false);
      } else {
        track.setEnabled(micOnRef.current);
      }
      await client.publish([track]);

      // Volume indicator (fires every 2 seconds)
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const myNum = hashUid(uid);
        for (const v of volumes) {
          if (v.uid === myNum) {
            setAudioLevel(Math.min(100, v.level));
            setIsSpeaking(v.level > 12);
          } else {
            setIsOppSpeaking(v.level > 12);
          }
        }
      });

      setStatus("connected");
    } catch {
      setStatus("failed");
    }
  };

  const connect = useCallback(async () => {
    if (status === "connected" || status === "connecting") return;
    hasAutoConnected.current = true;
    await connectImplRef.current?.();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(async () => {
    localTrackRef.current?.stop();
    localTrackRef.current?.close();
    localTrackRef.current = null;
    if (clientRef.current && joinedRef.current) {
      await clientRef.current.leave().catch(() => {});
    }
    joinedRef.current = false;
    clientRef.current = null;
    hasAutoConnected.current = false;
    setStatus("idle");
    setIsSpeaking(false);
    setIsOppSpeaking(false);
    setPttActive(false);
    setAudioLevel(0);
  }, []);

  const toggleMic = useCallback(() => {
    if (pttModeRef.current) return;
    setMicOn(v => {
      const next = !v;
      localTrackRef.current?.setEnabled(next);
      if (!next) setIsSpeaking(false);
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn(v => {
      const next = !v;
      clientRef.current?.remoteUsers.forEach(u => {
        u.audioTrack?.setVolume(next ? 100 : 0);
      });
      return next;
    });
  }, []);

  const toggleMuteOpp = useCallback(() => {
    setMutedOpp(v => {
      const next = !v;
      clientRef.current?.remoteUsers.forEach(u => {
        u.audioTrack?.setVolume(next ? 0 : 100);
      });
      return next;
    });
  }, []);

  const togglePttMode = useCallback(() => {
    setPttMode(v => {
      const next = !v;
      pttModeRef.current = next;
      if (next) {
        localTrackRef.current?.setEnabled(false);
        setIsSpeaking(false);
        setPttActive(false);
      } else {
        localTrackRef.current?.setEnabled(micOnRef.current);
      }
      return next;
    });
  }, []);

  const startPTT = useCallback(() => {
    if (!pttModeRef.current) return;
    setPttActive(true);
    localTrackRef.current?.setEnabled(true);
  }, []);

  const stopPTT = useCallback(() => {
    if (!pttModeRef.current) return;
    setPttActive(false);
    localTrackRef.current?.setEnabled(false);
    setIsSpeaking(false);
  }, []);

  // Keyboard PTT: Spacebar
  useEffect(() => {
    if (status !== "connected" || !pttMode) return;
    const onDown = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); startPTT(); } };
    const onUp   = (e: KeyboardEvent) => { if (e.code === "Space") stopPTT(); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [status, pttMode, startPTT, stopPTT]);

  // Cleanup on unmount
  useEffect(() => { return () => { if (joinedRef.current) disconnect(); }; }, []); // eslint-disable-line

  return {
    status, micOn, speakerOn, mutedOpp, isSpeaking, isOppSpeaking,
    pttMode, pttActive, reconnectCount, sensitivity, audioLevel,
    autoplayBlocked,
    connect, disconnect,
    toggleMic, toggleSpeaker, toggleMuteOpp,
    togglePttMode, startPTT, stopPTT,
    setSensitivity, unlockAudio,
  };
}
