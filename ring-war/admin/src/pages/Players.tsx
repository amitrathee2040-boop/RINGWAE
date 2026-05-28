import { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import { Search, RefreshCw, Trash2, VolumeX, Volume2, ShieldOff, Shield, ChevronLeft, ChevronRight } from "lucide-react";

type Player = Record<string, unknown>;

function statusBadge(p: Player) {
  if (p["banned"]) return <span className="badge badge-red">BANNED</span>;
  if (p["muted"]) return <span className="badge badge-amber">MUTED</span>;
  return <span className="badge badge-green">ACTIVE</span>;
}

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banReason, setBanReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await api.getPlayers(s, p);
      setPlayers(res.players);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    load(1, val);
  }

  async function toggleBan(p: Player) {
    const uid = p["uid"] as string;
    const banned = !(p["banned"] as boolean);
    setActionLoading(uid + "_ban");
    try {
      await api.banPlayer(uid, banned, banned ? banReason : undefined);
      showToast(`Player ${banned ? "banned" : "unbanned"} successfully`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleMute(p: Player) {
    const uid = p["uid"] as string;
    const muted = !(p["muted"] as boolean);
    setActionLoading(uid + "_mute");
    try {
      await api.mutePlayer(uid, muted);
      showToast(`Player ${muted ? "muted" : "unmuted"} successfully`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function deletePlayer(uid: string) {
    setActionLoading(uid + "_del");
    try {
      await api.deletePlayer(uid);
      setConfirmDelete(null);
      showToast("Player deleted");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Players</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            {total} total players
          </p>
        </div>
        <button onClick={() => load()} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} className={loading ? "spinner" : ""} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          className="admin-input"
          style={{ paddingLeft: 36 }}
          placeholder="Search by name or UID…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--red)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>PLAYER</th>
                <th>UID</th>
                <th>W / L</th>
                <th>ELO</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading…</td></tr>
              ) : players.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  No players found. Firebase may not be configured.
                </td></tr>
              ) : players.map((p) => {
                const uid = p["uid"] as string;
                return (
                  <tr key={uid}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 800, color: "var(--accent)",
                        }}>
                          {((p["displayName"] as string) ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>
                          {(p["displayName"] as string) ?? "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td><code style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4 }}>{uid.slice(0, 16)}…</code></td>
                    <td style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--green)" }}>{(p["wins"] as number) ?? 0}W</span>
                      {" / "}
                      <span style={{ color: "var(--red)" }}>{(p["losses"] as number) ?? 0}L</span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>{(p["elo"] as number) ?? 1000}</td>
                    <td>{statusBadge(p)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                          onClick={() => toggleBan(p)}
                          className={p["banned"] ? "btn-success" : "btn-danger"}
                          disabled={actionLoading === uid + "_ban"}
                          title={p["banned"] ? "Unban" : "Ban"}
                        >
                          {p["banned"] ? <Shield size={12} /> : <ShieldOff size={12} />}
                        </button>
                        <button
                          onClick={() => toggleMute(p)}
                          className={p["muted"] ? "btn-success" : "btn-ghost"}
                          disabled={actionLoading === uid + "_mute"}
                          title={p["muted"] ? "Unmute" : "Mute"}
                        >
                          {p["muted"] ? <Volume2 size={12} /> : <VolumeX size={12} />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(uid)}
                          className="btn-danger"
                          title="Delete account"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
          onClick={() => setConfirmDelete(null)}
        >
          <div className="card" style={{ width: 360 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "var(--red)" }}>⚠️ Delete Player</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              This permanently deletes the player account and all their data. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-danger"
                style={{ flex: 1, padding: "10px" }}
                onClick={() => deletePlayer(confirmDelete)}
                disabled={actionLoading === confirmDelete + "_del"}
              >
                {actionLoading === confirmDelete + "_del" ? "Deleting…" : "Delete"}
              </button>
              <button className="btn-ghost" style={{ flex: 1, padding: "10px" }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 300,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "12px 18px",
          fontSize: 13, fontWeight: 600, color: "var(--green)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
