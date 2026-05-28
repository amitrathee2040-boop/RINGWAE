import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, Swords, Gift, Megaphone,
  ScrollText, LogOut, ChevronRight, Zap, Volume2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const NAV: NavItem[] = [
  { label: "Dashboard",     path: "/",             icon: <LayoutDashboard size={17} />, color: "#f59e0b" },
  { label: "Players",       path: "/players",       icon: <Users size={17} />,           color: "#3b82f6" },
  { label: "Matches",       path: "/matches",       icon: <Swords size={17} />,          color: "#8b5cf6" },
  { label: "Rewards",       path: "/rewards",       icon: <Gift size={17} />,            color: "#22c55e" },
  { label: "Ads",           path: "/ads",           icon: <Zap size={17} />,             color: "#f97316" },
  { label: "Announcements", path: "/announcements", icon: <Volume2 size={17} />,         color: "#06b6d4" },
  { label: "Logs",          path: "/logs",          icon: <ScrollText size={17} />,      color: "#6b7280" },
  { label: "Megaphone",     path: "/megaphone",     icon: <Megaphone size={17} />,       color: "#ec4899" },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const currentPath = location || "/";

  function navigate(path: string) {
    setLocation(path);
    onNavigate?.();
  }

  return (
    <aside style={{
      width: 220,
      background: "var(--bg-card)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 18px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, flexShrink: 0,
        }}>⚔️</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.06em" }}>RING WAR</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.04em" }}>ADMIN PANEL</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {NAV.filter(n => n.label !== "Megaphone").map((item) => {
          const active = currentPath === item.path ||
            (item.path !== "/" && currentPath.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                border: "none",
                background: active ? `${item.color}18` : "transparent",
                color: active ? item.color : "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                textAlign: "left",
                marginBottom: 2,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }
              }}
            >
              <span style={{ color: active ? item.color : "inherit", flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <ChevronRight size={13} style={{ color: item.color }} />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          marginBottom: 4,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg,#f59e0b40,#ef444430)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "var(--accent)",
            flexShrink: 0,
          }}>
            {(user?.username ?? "A").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", truncate: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {user?.username}
            </div>
            <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
              {user?.role?.toUpperCase()}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 10, border: "none",
            background: "transparent", color: "var(--text-muted)",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--red-dim)";
            (e.currentTarget as HTMLElement).style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
