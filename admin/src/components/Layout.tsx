import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden" }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{ width: 220, height: "100%", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: "absolute", top: 14, right: -38,
                background: "rgba(0,0,0,0.5)",
                border: "none", borderRadius: "50%",
                width: 30, height: 30,
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Mobile top bar */}
        <div
          className="flex md:hidden"
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 8px",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center",
            }}
          >
            <Menu size={18} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.06em" }}>
            ⚔️ RING WAR ADMIN
          </span>
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
