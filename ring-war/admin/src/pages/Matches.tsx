import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import { RefreshCw, StopCircle, Swords, Users, Trash2 } from "lucide-react";

type Match = Record<string, unknown>;

function formatAge(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [live2p, setLive2p] = useState(0);
  const [live4p, setLive4p] = useState(0);
  const [tab, setTab] = useState<"all" | "2p" | "4p">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [confirmEnd, setConfirmEnd] = useState<Match | null>(null);
  const [cleaning, setCleaning] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleCleanup() {
    setCleaning(true);
    try {
      const res = await api.cleanupRooms();
      showToast(`Cleaned up ${res.deleted2p} 2P + ${res.deleted4p} 4P stale rooms`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getMatches();
      setMatches(res.matches);
      setLive2p(res.live2p);
      setLive4p(res.live4p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => load(), 15_000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = matches.filter(m =>
    tab === "all" ? true : m["type"] === tab
  );

  async function endMatch(m: Match) {
    const code = m["code"] as string;
    const type = m["type"] as string;
    setActionLoading(code);
    try {
      if (type === "4p") await api.endMatch4p(code);
      else await api.endMatch2p(code);
      showToast(`Match ${code} ended`);
      setConfirmEnd(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  function getPlayerNames(m: Match): string {
    const p = (m["players"] ?? {}) as Record<string, { displayName?: string } | null>;
    return Object.values(p)
      .filter(Boolean)
      .map((x) => x?.displayName ?? "?")
      .join(" vs ");
  }

  return (
    <div className="animate-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Matches</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            <span style={{ color: "var(--green)" }}>{live2p}</span> live 2P ·{" "}
            <span style={{ color: "var(--purple)" }}>{live4p}</span> live 4P
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.1)", color: "#ef4444",
              cursor: cleaning ? "not-allowed" : "pointer", opacity: cleaning ? 0.6 : 1,
            }}
          >
            <Trash2 size={13} className={cleaning ? "spinner" : ""} />
            {cleaning ? "Cleaning…" : "Clean Stale Rooms"}
          </button>
          <button onClick={load} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} className={loading ? "spinner" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "2p", "4p"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: tab === t ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#000" : "var(--text-muted)",
            }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "var(--red-dim)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--red)" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>TYPE</th>
                <th>PLAYERS</th>
                <th>STATUS</th>
                <th>STARTED</th>
                <th>LAST MOVE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  No matches found. Firebase may not be configured.
                </td></tr>
              ) : filtered.map((m) => {
                const code = m["code"] as string;
                const status = m["status"] as string;
                const isLive = status === "playing";
                return (
                  <tr key={code}>
                    <td><code style={{ fontSize: 12, color: "var(--accent)", background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{code}</code></td>
                    <td>
                      <span className={`badge ${m["type"] === "4p" ? "badge-purple" : "badge-blue"}`}>
                        {m["type"] === "4p" ? <Users size={10} style={{ marginRight: 3 }} /> : <Swords size={10} style={{ marginRight: 3 }} />}
                        {(m["type"] as string)?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getPlayerNames(m)}
                    </td>
                    <td>
                      <span className={`badge ${isLive ? "badge-green" : status === "waiting" ? "badge-amber" : "badge-gray"}`}>
                        {status}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {m["createdAt"] ? formatAge(m["createdAt"] as number) : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {m["lastMoveAt"] ? formatAge(m["lastMoveAt"] as number) : "—"}
                    </td>
                    <td>
                      {isLive && (
                        <button
                          className="btn-danger"
                          style={{ display: "flex", alignItems: "center", gap: 5 }}
                          onClick={() => setConfirmEnd(m)}
                          disabled={actionLoading === code}
                        >
                          <StopCircle size={12} />
                          End
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm end modal */}
      {confirmEnd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setConfirmEnd(null)}>
          <div className="card" style={{ width: 340 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "var(--red)" }}>⚠️ End Match?</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Room <b style={{ color: "var(--accent)" }}>{confirmEnd["code"] as string}</b> will be force-ended. Players will see the game as finished.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-danger" style={{ flex: 1, padding: "10px" }}
                onClick={() => endMatch(confirmEnd)}
                disabled={actionLoading === (confirmEnd["code"] as string)}>
                {actionLoading === (confirmEnd["code"] as string) ? "Ending…" : "End Match"}
              </button>
              <button className="btn-ghost" style={{ flex: 1, padding: "10px" }} onClick={() => setConfirmEnd(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "var(--green)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
