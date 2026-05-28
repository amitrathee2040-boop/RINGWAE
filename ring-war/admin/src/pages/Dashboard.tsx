import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import {
  Users, Swords, WifiOff, ShieldOff, Activity,
  Clock, RefreshCw, Trophy, TrendingUp
} from "lucide-react";

type DashData = Awaited<ReturnType<typeof api.getDashboard>>;

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center", color,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function formatTs(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function logTypeColor(type: string): string {
  if (type.includes("ban")) return "badge-red";
  if (type.includes("login") || type.includes("logout") || type.includes("auth")) return "badge-blue";
  if (type.includes("reward") || type.includes("promo")) return "badge-green";
  if (type.includes("end_match")) return "badge-purple";
  if (type.includes("announcement")) return "badge-amber";
  return "badge-gray";
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      setData(await api.getDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(() => load(true), 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div className="spinner" style={{ width: 32, height: 32, border: "3px solid rgba(245,158,11,0.2)", borderTopColor: "#f59e0b", borderRadius: "50%" }} />
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Ring War game overview — live stats
          </p>
        </div>
        <button
          onClick={() => load(true)}
          className="btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
          disabled={refreshing}
        >
          <RefreshCw size={13} className={refreshing ? "spinner" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 20,
          fontSize: 13, color: "var(--red)",
        }}>
          ⚠️ {error} — Firebase may not be configured yet.
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Users size={18} />}   label="TOTAL PLAYERS"  value={data?.totalPlayers ?? 0}  color="#3b82f6" />
        <StatCard icon={<Activity size={18} />} label="ONLINE NOW"     value={data?.onlinePlayers ?? 0}  color="#22c55e" />
        <StatCard icon={<Swords size={18} />}   label="LIVE MATCHES"   value={data?.liveMatches ?? 0}    color="#8b5cf6"
          sub={`${data?.liveMatches2p ?? 0} × 2P · ${data?.liveMatches4p ?? 0} × 4P`} />
        <StatCard icon={<ShieldOff size={18} />} label="BANNED"         value={data?.bannedPlayers ?? 0}  color="#ef4444" />
        <StatCard icon={<WifiOff size={18} />}  label="MUTED"          value={data?.mutedPlayers ?? 0}   color="#f97316" />
        <StatCard icon={<Clock size={18} />}    label="SERVER UPTIME"  value={formatUptime(data?.serverUptime ?? 0)} color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Top Players */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Trophy size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "0.04em" }}>TOP PLAYERS</span>
          </div>
          {(data?.topPlayers ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              No player data — connect Firebase to see stats
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(data?.topPlayers ?? []).map((p, i) => (
                <div key={p.uid} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 10,
                  background: i === 0 ? "rgba(245,158,11,0.07)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${i === 0 ? "rgba(245,158,11,0.2)" : "var(--border)"}`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: i === 0 ? "var(--accent-dim)" : "rgba(255,255,255,0.05)",
                    color: i === 0 ? "var(--accent)" : "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.displayName || "Unknown"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <TrendingUp size={11} style={{ color: "var(--green)" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{p.wins}W</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 16 }}>
            RECENT ACTIVITY
          </div>
          {(data?.recentLogs ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
              No admin actions yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 280, overflowY: "auto" }}>
              {(data?.recentLogs ?? []).map((log, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "7px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <span className={`badge ${logTypeColor((log["type"] as string) ?? "")}`} style={{ flexShrink: 0, marginTop: 1 }}>
                    {(log["type"] as string)?.replace(/_/g, " ")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(log["admin"] as string) && <b style={{ color: "var(--text)" }}>{log["admin"] as string}</b>}
                      {log["target"] ? ` → ${log["target"] as string}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>
                    {formatTs((log["at"] as number) ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
