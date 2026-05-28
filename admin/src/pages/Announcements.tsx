import { useEffect, useState, useCallback, type FormEvent } from "react";
import { api } from "@/api";
import { Plus, Trash2, Volume2, RefreshCw } from "lucide-react";

type Announcement = Record<string, unknown>;

const TYPE_COLORS: Record<string, string> = {
  info: "badge-blue",
  warning: "badge-red",
  event: "badge-amber",
  maintenance: "badge-purple",
};

function formatTs(at: number): string {
  return new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "event" | "maintenance">("info");
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAnnouncements();
      setAnnouncements(res.announcements);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title || !message) { setFormErr("Title and message are required"); return; }
    setCreating(true); setFormErr("");
    try {
      await api.createAnnouncement({ title, message, type });
      setTitle(""); setMessage(""); setType("info");
      showToast("Announcement created");
      load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteAnnouncement(id);
      showToast("Announcement removed");
      load();
    } catch { /* ignore */ }
  }

  return (
    <div className="animate-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Announcements</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>Broadcast messages to all players in-game</p>
        </div>
        <button onClick={load} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} className={loading ? "spinner" : ""} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "start" }}>

        {/* Create form */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Plus size={15} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>New Announcement</span>
          </div>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>TYPE</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {(["info", "warning", "event", "maintenance"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    style={{
                      padding: "7px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                      background: type === t ? (t === "warning" ? "var(--red-dim)" : t === "event" ? "var(--accent-dim)" : t === "maintenance" ? "var(--purple-dim)" : "var(--blue-dim)") : "rgba(255,255,255,0.04)",
                      color: type === t ? (t === "warning" ? "var(--red)" : t === "event" ? "var(--accent)" : t === "maintenance" ? "var(--purple)" : "var(--blue)") : "var(--text-muted)",
                    }}>
                    {t === "info" ? "ℹ️" : t === "warning" ? "⚠️" : t === "event" ? "🎉" : "🔧"} {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>TITLE</label>
              <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend Tournament!" maxLength={80} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>MESSAGE</label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Compete in the weekend tournament and win exclusive rewards…"
                rows={3} maxLength={500}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-strong)",
                  borderRadius: 10, padding: "10px 14px", color: "var(--text)", fontSize: 13,
                  outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>{message.length}/500</div>
            </div>
            {formErr && <div style={{ background: "var(--red-dim)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--red)" }}>{formErr}</div>}
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Posting…" : "Post Announcement"}
            </button>
          </form>
        </div>

        {/* Active announcements */}
        <div>
          {error && <div style={{ background: "var(--red-dim)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "var(--red)" }}>⚠️ {error}</div>}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading…</div>
          ) : announcements.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <Volume2 size={32} style={{ display: "block", margin: "0 auto 10px", opacity: 0.3 }} />
              No announcements yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {announcements.map((a) => (
                <div key={a["id"] as string} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span className={`badge ${TYPE_COLORS[a["type"] as string] ?? "badge-gray"}`}>
                          {a["type"] as string}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          by {a["createdBy"] as string} · {formatTs(a["at"] as number)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{a["title"] as string}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{a["message"] as string}</div>
                    </div>
                    <button className="btn-danger" onClick={() => handleDelete(a["id"] as string)} style={{ flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 18px", fontSize: 13, fontWeight: 600, color: "var(--green)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
