import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

type Log = Record<string, unknown>;

const LOG_TYPES = [
  "all", "login", "logout", "ban", "unban", "mute", "unmute",
  "delete_player", "end_match_2p", "end_match_4p",
  "send_reward", "create_promo", "delete_promo",
  "create_announcement", "delete_announcement", "update_ads", "auth_fail",
];

function formatTs(at: number): string {
  return new Date(at).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function typeColor(t: string): string {
  if (t.includes("ban") || t.includes("delete") || t.includes("end_match") || t === "auth_fail") return "badge-red";
  if (t.includes("login") || t.includes("logout") || t.includes("auth")) return "badge-blue";
  if (t.includes("reward") || t.includes("promo")) return "badge-green";
  if (t.includes("announcement") || t.includes("ads")) return "badge-amber";
  if (t.includes("mute")) return "badge-purple";
  return "badge-gray";
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p = page, t = typeFilter) => {
    setLoading(true);
    try {
      const res = await api.getLogs(p, t === "all" ? undefined : t);
      setLogs(res.logs);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function handleFilter(t: string) {
    setTypeFilter(t); setPage(1); load(1, t);
  }

  return (
    <div className="animate-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Activity Logs</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{total} total log entries</p>
        </div>
        <button onClick={() => load()} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} className={loading ? "spinner" : ""} /> Refresh
        </button>
      </div>

      {/* Type filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {LOG_TYPES.map((t) => (
          <button key={t} onClick={() => handleFilter(t)}
            style={{
              padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
              background: typeFilter === t ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: typeFilter === t ? "#000" : "var(--text-muted)",
              transition: "all 0.15s",
            }}>
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error && <div style={{ background: "var(--red-dim)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--red)" }}>⚠️ {error}</div>}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>ACTION</th>
                <th>ADMIN</th>
                <th>TARGET</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  No logs yet — admin actions will appear here.
                </td></tr>
              ) : logs.map((log, i) => (
                <tr key={(log["id"] as string) ?? i}>
                  <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {log["at"] ? formatTs(log["at"] as number) : "—"}
                  </td>
                  <td>
                    <span className={`badge ${typeColor((log["type"] as string) ?? "")}`}>
                      {((log["type"] as string) ?? "unknown").replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                    {(log["admin"] as string) ?? "—"}
                  </td>
                  <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <code style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4 }}>
                      {(log["target"] as string) ?? "—"}
                    </code>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(log["details"] as string) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Page {page} of {pages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setPage(page - 1); load(page - 1); }} className="btn-ghost" disabled={page === 1}>
                <ChevronLeft size={13} />
              </button>
              <button onClick={() => { setPage(page + 1); load(page + 1); }} className="btn-ghost" disabled={page === pages}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
