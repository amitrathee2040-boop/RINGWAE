import { useEffect, useState, useCallback, type FormEvent } from "react";
import { api } from "@/api";
import { Gift, Plus, Trash2, RefreshCw } from "lucide-react";

type Promo = Record<string, unknown>;

export default function Rewards() {
  const [tab, setTab] = useState<"send" | "promo">("send");

  // Send reward state
  const [uid, setUid] = useState("");
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [gold, setGold] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [sendErr, setSendErr] = useState("");

  // Promo state
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newCoins, setNewCoins] = useState(0);
  const [newGems, setNewGems] = useState(0);
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [creating, setCreating] = useState(false);
  const [promoErr, setPromoErr] = useState("");

  const loadPromos = useCallback(async () => {
    setPromoLoading(true);
    try {
      const res = await api.getPromos();
      setPromos(res.promos);
    } catch { /* ignore */ }
    finally { setPromoLoading(false); }
  }, []);

  useEffect(() => { if (tab === "promo") loadPromos(); }, [tab, loadPromos]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!uid.trim()) { setSendErr("Enter a player UID"); return; }
    if (!coins && !gems && !gold) { setSendErr("Enter at least one reward amount"); return; }
    setSending(true); setSendErr(""); setSendMsg("");
    try {
      await api.sendReward(uid.trim(), coins, gems, gold, message || undefined);
      setSendMsg(`✓ Reward sent to ${uid.trim()}`);
      setUid(""); setCoins(0); setGems(0); setGold(0); setMessage("");
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  async function handleCreatePromo(e: FormEvent) {
    e.preventDefault();
    if (!newCode) { setPromoErr("Enter a promo code"); return; }
    setCreating(true); setPromoErr("");
    try {
      await api.createPromo({ code: newCode.toUpperCase(), coins: newCoins, gems: newGems, maxUses: newMaxUses });
      setNewCode(""); setNewCoins(0); setNewGems(0); setNewMaxUses(1);
      loadPromos();
    } catch (e) {
      setPromoErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function deletePromo(code: string) {
    try {
      await api.deletePromo(code);
      loadPromos();
    } catch { /* ignore */ }
  }

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: "var(--text)" }}>Rewards & Promo</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Send currency to players or manage promo codes
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["send", "promo"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "7px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
              background: tab === t ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#000" : "var(--text-muted)",
            }}>
            {t === "send" ? "Send Reward" : "Promo Codes"}
          </button>
        ))}
      </div>

      {tab === "send" && (
        <div style={{ maxWidth: 480 }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Gift size={16} style={{ color: "var(--green)" }} />
              <span style={{ fontSize: 14, fontWeight: 800 }}>Send Reward to Player</span>
            </div>
            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>PLAYER UID</label>
                <input className="admin-input" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Firebase UID…" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "COINS 🪙", val: coins, set: setCoins, color: "#f59e0b" },
                  { label: "GEMS 💎", val: gems, set: setGems, color: "#06b6d4" },
                  { label: "GOLD 🏅", val: gold, set: setGold, color: "#eab308" },
                ].map(({ label, val, set, color }) => (
                  <div key={label}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{label}</label>
                    <input
                      className="admin-input"
                      type="number"
                      min={0}
                      value={val}
                      onChange={(e) => set(Number(e.target.value))}
                      style={{ borderColor: val > 0 ? color : undefined }}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>CUSTOM MESSAGE (optional)</label>
                <input className="admin-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Thanks for playing Ring War!" />
              </div>
              {sendErr && <div style={{ background: "var(--red-dim)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--red)" }}>{sendErr}</div>}
              {sendMsg && <div style={{ background: "var(--green-dim)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--green)" }}>{sendMsg}</div>}
              <button type="submit" className="btn-primary" disabled={sending}>
                {sending ? "Sending…" : "Send Reward"}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "promo" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 800 }}>
          {/* Create */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Plus size={15} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>Create Promo Code</span>
            </div>
            <form onSubmit={handleCreatePromo} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>CODE</label>
                <input className="admin-input" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="RINGWAR2024" maxLength={20} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>COINS</label>
                  <input className="admin-input" type="number" min={0} value={newCoins} onChange={(e) => setNewCoins(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>GEMS</label>
                  <input className="admin-input" type="number" min={0} value={newGems} onChange={(e) => setNewGems(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>MAX USES</label>
                <input className="admin-input" type="number" min={1} value={newMaxUses} onChange={(e) => setNewMaxUses(Number(e.target.value))} />
              </div>
              {promoErr && <div style={{ background: "var(--red-dim)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--red)" }}>{promoErr}</div>}
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? "Creating…" : "Create Code"}</button>
            </form>
          </div>

          {/* List */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Active Codes</span>
              <button onClick={loadPromos} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <RefreshCw size={12} className={promoLoading ? "spinner" : ""} />
              </button>
            </div>
            <div style={{ padding: 8 }}>
              {promos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: 12 }}>No promo codes yet</div>
              ) : promos.map((p) => (
                <div key={p["code"] as string} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 8, marginBottom: 4, background: "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ flex: 1 }}>
                    <code style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>{p["code"] as string}</code>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {(p["coins"] as number) > 0 && `${p["coins"]} coins `}
                      {(p["gems"] as number) > 0 && `${p["gems"]} gems `}
                      · {p["uses"] as number}/{p["maxUses"] as number} used
                    </div>
                  </div>
                  <button className="btn-danger" onClick={() => deletePromo(p["code"] as string)}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
