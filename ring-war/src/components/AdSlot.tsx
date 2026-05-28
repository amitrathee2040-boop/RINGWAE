import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Milliseconds before the shield automatically re-enables after the user taps through it. */
const SHIELD_REARM_DELAY_MS = 4000;

/** Minimum milliseconds between two tap events (debounce — prevents rapid-fire accidental taps). */
const TAP_DEBOUNCE_MS = 350;

const GOOGLE_AD_CLIENT = import.meta.env.VITE_GOOGLE_AD_CLIENT as string | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// useBannerAdShield hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages accidental-click protection for a banner ad.
 *
 * State machine:
 *   "armed"    → shield is ON  (transparent overlay blocks the ad)
 *   "lowered"  → shield is OFF (user tapped once; ad is now clickable)
 *
 * Interaction flow:
 *   1. First tap   → shield lowers, hint tooltip shows briefly.
 *   2. User taps ad normally → ad click fires (standard browser behaviour).
 *   3. After SHIELD_REARM_DELAY_MS → shield re-arms automatically.
 *
 * AdMob policy compliance:
 *   - The ad is always fully visible; the shield is purely transparent.
 *   - We never intercept or redirect ad clicks — we only delay first access.
 *   - Re-arming is automatic so the ad surface is never permanently blocked.
 */
function useBannerAdShield() {
  const [armed, setArmed] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const rearmTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTime = useRef<number>(0);

  /** Clear all pending timers safely. */
  const clearTimers = useCallback(() => {
    if (rearmTimer.current)  { clearTimeout(rearmTimer.current);  rearmTimer.current  = null; }
    if (hintTimer.current)   { clearTimeout(hintTimer.current);   hintTimer.current   = null; }
  }, []);

  /** Called when the user taps the shield overlay. */
  const handleShieldTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();

    // Debounce: ignore taps that come in too fast (e.g. accidental double-tap)
    if (now - lastTapTime.current < TAP_DEBOUNCE_MS) return;
    lastTapTime.current = now;

    // Consume the event so it does NOT propagate to the ad below.
    e.stopPropagation();
    e.preventDefault();

    // Lower the shield so the next intentional tap reaches the ad.
    setArmed(false);
    setShowHint(true);

    clearTimers();

    // Hide the "tap again" hint after 1.8 s
    hintTimer.current = setTimeout(() => setShowHint(false), 1800);

    // Re-arm the shield after the configured delay
    rearmTimer.current = setTimeout(() => {
      setArmed(true);
      setShowHint(false);
    }, SHIELD_REARM_DELAY_MS);
  }, [clearTimers]);

  // Clean up on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  return { armed, showHint, handleShieldTap };
}

// ─────────────────────────────────────────────────────────────────────────────
// AdSlot component
// ─────────────────────────────────────────────────────────────────────────────

interface AdSlotProps {
  variant: "banner" | "leaderboard" | "rectangle";
  className?: string;
}

export default function AdSlot({ variant, className = "" }: AdSlotProps) {
  const sizes = {
    banner:      { width: "100%", height: 50,  label: "Advertisement · 320×50",  slot: import.meta.env.VITE_GOOGLE_AD_SLOT_BANNER as string | undefined },
    leaderboard: { width: "100%", height: 90,  label: "Advertisement · 728×90",  slot: import.meta.env.VITE_GOOGLE_AD_SLOT_LEADERBOARD as string | undefined },
    rectangle:   { width: "100%", height: 200, label: "Advertisement · 300×200", slot: import.meta.env.VITE_GOOGLE_AD_SLOT_RECTANGLE as string | undefined },
  };
  const s = sizes[variant];
  const { armed, showHint, handleShieldTap } = useBannerAdShield();

  const adContent = GOOGLE_AD_CLIENT && s.slot ? (
    /* Real AdSense unit — rendered by Google's script after mount */
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", height: s.height }}
      data-ad-client={GOOGLE_AD_CLIENT}
      data-ad-slot={s.slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  ) : (
    /* Placeholder shown when AdSense is not configured */
    <div style={{
      width: "100%", height: s.height,
      background: "rgba(255,255,255,0.025)",
      border: "1px dashed rgba(255,255,255,0.07)",
      borderRadius: 10, display: "flex", alignItems: "center",
      justifyContent: "center", userSelect: "none",
    }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", fontWeight: 500, letterSpacing: "0.08em" }}>
        {s.label}
      </span>
    </div>
  );

  return (
    /*
     * Outer wrapper adds spacing above the ad so gameplay buttons
     * are never flush against the banner (reduces edge-of-screen accidents).
     */
    <div
      className={className}
      style={{
        width: s.width,
        flexShrink: 0,
        /* 8px breathing room between the last gameplay element and the ad */
        marginTop: 8,
        paddingTop: 4,
      }}
    >
      {/* ── Inner wrapper — position:relative so the shield can be absolute ── */}
      <div style={{ position: "relative", width: "100%", height: s.height }}>

        {/* Ad content sits underneath the shield */}
        {adContent}

        {/* ── Accidental-click shield ────────────────────────────────────────
         *  Fully transparent so the ad is always visible.
         *  pointer-events are enabled only while armed.
         *  When lowered, the overlay is invisible and passes all clicks to the ad.
         * ──────────────────────────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          onTouchStart={armed ? handleShieldTap : undefined}
          onClick={armed ? handleShieldTap : undefined}
          style={{
            position: "absolute",
            inset: 0,
            /* Transparent — ad is always clearly visible */
            background: "transparent",
            /* Only intercept events when armed */
            pointerEvents: armed ? "all" : "none",
            cursor: armed ? "default" : "pointer",
            zIndex: 10,
            /* Subtle pulsing border only when armed — optional visual cue */
            borderRadius: 6,
            border: armed ? "1px solid rgba(255,255,255,0.04)" : "none",
            transition: "border 0.2s",
          }}
        />

        {/* ── "Tap again to open" hint tooltip ───────────────────────────── */}
        {showHint && (
          <div
            aria-live="polite"
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 20,
              letterSpacing: "0.02em",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              animation: "fadeInUp 0.18s ease",
            }}
          >
            Tap to open ad
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdInterstitial component (hint interstitial — no shield needed here,
// user explicitly taps a button to trigger it)
// ─────────────────────────────────────────────────────────────────────────────

interface AdInterstitialProps {
  /** Unique Google AdSense slot ID for the hint interstitial */
  adSlot?: string;
  countdown: number;
  onClose: () => void;
}

export function AdInterstitial({ adSlot, countdown, onClose }: AdInterstitialProps) {
  const canClose = countdown <= 0;
  const slotId = adSlot ?? (import.meta.env.VITE_GOOGLE_AD_SLOT_HINT as string | undefined);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        width: "90%", maxWidth: 340, background: "var(--bg-card)",
        border: "1px solid var(--border-color)", borderRadius: 20,
        padding: "18px 18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>ADVERTISEMENT</div>

        {/* Ad container — Google AdSense renders here when configured */}
        <div style={{
          width: "100%", height: 250, borderRadius: 12, overflow: "hidden",
          background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {GOOGLE_AD_CLIENT && slotId ? (
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: 250 }}
              data-ad-client={GOOGLE_AD_CLIENT}
              data-ad-slot={slotId}
              data-ad-format="auto"
            />
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📢</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Ad Placeholder</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", marginTop: 4 }}>300 × 250</div>
            </div>
          )}
        </div>

        <button
          onClick={canClose ? onClose : undefined}
          disabled={!canClose}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
            fontSize: 14, fontWeight: 700, cursor: canClose ? "pointer" : "not-allowed",
            background: canClose
              ? "linear-gradient(135deg,#4ade80,#16a34a)"
              : "rgba(255,255,255,0.07)",
            color: canClose ? "#000" : "rgba(255,255,255,0.35)",
            transition: "background 0.3s, color 0.3s",
          }}
        >
          {canClose ? "💡 Get Hint!" : `Wait ${countdown}s…`}
        </button>
      </div>
    </div>
  );
}
