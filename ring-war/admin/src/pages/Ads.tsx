import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import { Zap, AlertTriangle, RefreshCw } from "lucide-react";

type AdsConfig = {
  bannerEnabled: boolean;
  interstitialEnabled: boolean;
  emergencyOff: boolean;
  interstitialFrequency: number;
  bannerRefreshSeconds: number;
  updatedAt?: number;
  updatedBy?: string;
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="toggle" style={{ opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" checked={checked} onChange={(e) => !disabled && onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function Ads() {
  const [config, setConfig] = useState<AdsConfig>({
    bannerEnabled: true, interstitialEnabled: true, emergencyOff: false,
    interstitialFrequency: 3, bannerRefreshSeconds: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAds();
      setConfig(res as AdsConfig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.updateAds(config as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function formatTs(ts?: number) {
    if (!ts) return "Never";
    return new Date(ts).toLocaleString();
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div className="spinner" style={{ width: 28, height: 28, border: "3px solid rgba(245,158,11,0.2)", borderTopColor: "#f59e0b", borderRadius: "50%" }} />
    </div>
  );

  return (
    <div className="animate-in" style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Ad Management</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Control ad visibility and frequency
          </p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Emergency Off — prominent red card */}
      <div className="card" style={{
        marginBottom: 16,
        border: config.emergencyOff ? "1px solid rgba(239,68,68,0.5)" : "1px solid var(--border)",
        background: config.emergencyOff ? "rgba(239,68,68,0.07)" : "var(--bg-card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: config.emergencyOff ? "var(--red-dim)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${config.emergencyOff ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--red)",
          }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: config.emergencyOff ? "var(--red)" : "var(--text)" }}>
              Emergency Ad Kill Switch
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {config.emergencyOff
                ? "⚠️ ALL ADS ARE DISABLED — Players see no ads"
                : "Disables all ads instantly regardless of other settings"}
            </div>
          </div>
          <Toggle
            checked={config.emergencyOff}
            onChange={(v) => setConfig({ ...config, emergencyOff: v })}
          />
        </div>
      </div>

      {/* Banner & Interstitial toggles */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 14 }}>AD UNITS</div>
        {[
          { label: "Banner Ads", sub: "Shown at bottom of game screen", key: "bannerEnabled" as const, icon: "📢" },
          { label: "Interstitial Ads", sub: "Shown between matches / hint popups", key: "interstitialEnabled" as const, icon: "🪟" },
        ].map(({ label, sub, key, icon }) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0",
            borderBottom: key === "bannerEnabled" ? "1px solid var(--border)" : "none",
            opacity: config.emergencyOff ? 0.4 : 1,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>
            </div>
            <Toggle
              checked={config[key]}
              onChange={(v) => setConfig({ ...config, [key]: v })}
              disabled={config.emergencyOff}
            />
          </div>
        ))}
      </div>

      {/* Frequency controls */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 14 }}>FREQUENCY</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Interstitial Frequency</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Show every N matches</div>
              </div>
              <span style={{ fontWeight: 800, color: "var(--accent)", fontSize: 18 }}>{config.interstitialFrequency}</span>
            </div>
            <input
              type="range" min={1} max={10} step={1}
              value={config.interstitialFrequency}
              onChange={(e) => setConfig({ ...config, interstitialFrequency: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--accent)" }}
              disabled={config.emergencyOff}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)", marginTop: 4 }}>
              <span>1 (every match)</span>
              <span>10 (less frequent)</span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Banner Refresh</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Refresh interval (seconds)</div>
              </div>
              <span style={{ fontWeight: 800, color: "var(--accent)", fontSize: 18 }}>{config.bannerRefreshSeconds}s</span>
            </div>
            <input
              type="range" min={30} max={300} step={15}
              value={config.bannerRefreshSeconds}
              onChange={(e) => setConfig({ ...config, bannerRefreshSeconds: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--accent)" }}
              disabled={config.emergencyOff}
            />
          </div>
        </div>
      </div>

      {/* Last updated */}
      {config.updatedAt ? (
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 14 }}>
          Last updated: {formatTs(config.updatedAt)} by <b>{config.updatedBy}</b>
        </div>
      ) : null}

      {error && <div style={{ background: "var(--red-dim)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>{error}</div>}
      {saved && <div style={{ background: "var(--green-dim)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--green)", marginBottom: 12 }}>✓ Settings saved</div>}

      <button className="btn-primary" onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Zap size={14} />
        {saving ? "Saving…" : "Save Ad Settings"}
      </button>
    </div>
  );
}
