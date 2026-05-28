import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) { setError("Enter username and password"); return; }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
      padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 20, padding: "36px 32px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
          }}>⚔️</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.08em" }}>
            RING WAR
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", marginTop: 2 }}>
            ADMIN PANEL
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              USERNAME
            </label>
            <input
              className="admin-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="admin-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "var(--text-muted)",
                  cursor: "pointer", padding: 2,
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "8px 12px",
              fontSize: 12, color: "var(--red)", fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 4, padding: "12px", fontSize: 14, borderRadius: 12 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          justifyContent: "center", marginTop: 20,
        }}>
          <Shield size={12} style={{ color: "var(--text-dim)" }} />
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Secure admin access only</span>
        </div>
      </div>
    </div>
  );
}
