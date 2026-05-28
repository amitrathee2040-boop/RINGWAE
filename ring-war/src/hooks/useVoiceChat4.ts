/**
 * useVoiceChat4 — Agora RTC voice chat hook (4-player)
 *
 * All 4 players join the same Agora channel; Agora handles the mesh.
 * Player keys (p1-p4) map to deterministic numeric UIDs (1-4).
 */
import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Player4Key } from "../game/boardDefinition4";

export type PeerStatusMap = Partial<Record<Player4Key, "connecting" | "connected" | "failed">>;

const APP_ID = import.meta.env.VITE_AGORA_APP_ID ?? "";

const KEY_TO_UID: Record<Player4Key, number> = { player1: 1, player2: 2, player3: 3, player4: 4 };
const UID_TO_KEY: Record<number, Player4Key> = { 1: "player1", 2: "player2", 3: "player3", 4: "player4" };

// ─────────────────────────────────────────────────────────────────────────────
export function useVoiceChat4(
  myKey: Player4Key,
  roomCode: string,
  activePlayers: Player4Key[],
) {
  const [micOn,           setMicOn]          = useState(true);
  const [pttMode,         setPttMode]        = useState(false);
  const [pttActive,       setPttActive]      = useState(false);
  const [peerStatus,      setPeerStatus]     = useState<PeerStatusMap>({});
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const clientRef     = useRef<IAgoraRTCClient | null>(null);
  const trackRef      = useRef<IMicrophoneAudioTrack | null>(null);
  const joinedRef     = useRef(false);
  const pttModeRef    = useRef(false);
  const micOnRef      = useRef(true);
  const mountedRef    = useRef(true);

  useEffect(() => { pttModeRef.current = pttMode; }, [pttMode]);
  useEffect(() => { micOnRef.current   = micOn;   }, [micOn]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Join / leave when roomCode or myKey changes
  useEffect(() => {
    if (!APP_ID) return;

    const myUid = KEY_TO_UID[myKey];
    if (!myUid) return;

    let client: IAgoraRTCClient;

    async function init() {
      client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // iOS Safari blocks audio autoplay — show a "tap to enable" prompt
      AgoraRTC.onAudioAutoplayFailed = () => {
        if (mountedRef.current) setAutoplayBlocked(true);
      };

      async function subscribeAudio(user: IAgoraRTCRemoteUser) {
        try {
          await client.subscribe(user, "audio");
          user.audioTrack?.play();
          const peerKey = UID_TO_KEY[user.uid as number];
          if (peerKey && mountedRef.current) {
            setPeerStatus(prev => ({ ...prev, [peerKey]: "connected" }));
          }
        } catch { /* autoplay blocked — will be re-played on unlockAudio */ }
      }

      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        if (mediaType === "audio") await subscribeAudio(user);
      });

      client.on("user-unpublished", (user: IAgoraRTCRemoteUser) => {
        const peerKey = UID_TO_KEY[user.uid as number];
        if (peerKey && mountedRef.current) {
          setPeerStatus(prev => ({ ...prev, [peerKey]: "failed" }));
        }
      });

      client.on("user-joined", (user: IAgoraRTCRemoteUser) => {
        const peerKey = UID_TO_KEY[user.uid as number];
        if (peerKey && mountedRef.current) {
          setPeerStatus(prev => ({ ...prev, [peerKey]: "connecting" }));
        }
      });

      client.on("user-left", (user: IAgoraRTCRemoteUser) => {
        const peerKey = UID_TO_KEY[user.uid as number];
        if (peerKey && mountedRef.current) {
          setPeerStatus(prev => {
            const next = { ...prev };
            delete next[peerKey];
            return next;
          });
        }
      });

      await client.join(APP_ID, `rw4_${roomCode}`, null, myUid);
      joinedRef.current = true;

      // Subscribe to users already in channel (fixes one-way audio when joining late)
      for (const user of client.remoteUsers) {
        if (user.hasAudio) await subscribeAudio(user);
      }

      const track = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true, ANS: true, AGC: true,
        encoderConfig: { sampleRate: 48000, stereo: false, bitrate: 64 },
      });
      trackRef.current = track;
      if (pttModeRef.current) track.setEnabled(false);
      await client.publish([track]);
    }

    init().catch(() => {});

    return () => {
      mountedRef.current = false;
      trackRef.current?.stop();
      trackRef.current?.close();
      trackRef.current = null;
      if (joinedRef.current) {
        client?.leave().catch(() => {});
        joinedRef.current = false;
      }
      clientRef.current = null;
      if (mountedRef.current !== false) setPeerStatus({});
    };
  }, [myKey, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = useCallback(() => {
    if (pttModeRef.current) return;
    setMicOn(v => {
      const next = !v;
      trackRef.current?.setEnabled(next);
      return next;
    });
  }, []);

  const togglePttMode = useCallback(() => {
    setPttMode(v => {
      const next = !v;
      pttModeRef.current = next;
      if (next) {
        trackRef.current?.setEnabled(false);
        setPttActive(false);
      } else {
        trackRef.current?.setEnabled(micOnRef.current);
      }
      return next;
    });
  }, []);

  const startPTT = useCallback(() => {
    if (!pttModeRef.current) return;
    setPttActive(true);
    trackRef.current?.setEnabled(true);
  }, []);

  const stopPTT = useCallback(() => {
    if (!pttModeRef.current) return;
    setPttActive(false);
    trackRef.current?.setEnabled(false);
  }, []);

  const anyConnected = Object.values(peerStatus).some(s => s === "connected");

  // Unlock audio after iOS autoplay block — re-play all remote tracks
  const unlockAudio = useCallback(() => {
    clientRef.current?.remoteUsers.forEach(u => u.audioTrack?.play());
    setAutoplayBlocked(false);
  }, []);

  return {
    micOn,
    pttMode,
    pttActive,
    toggleMic,
    togglePttMode,
    startPTT,
    stopPTT,
    peerStatus,
    anyConnected,
    autoplayBlocked,
    unlockAudio,
  };
}
