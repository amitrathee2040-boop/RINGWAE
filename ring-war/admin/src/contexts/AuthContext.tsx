import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, getToken, setToken, clearToken } from "@/api";

interface AdminUser {
  username: string;
  role: string;
}

interface AuthCtx {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — verify existing token by calling /dashboard (lightweight)
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.getDashboard()
      .then(() => {
        // If token is valid, extract username from localStorage
        const stored = localStorage.getItem("rw-admin-user");
        if (stored) setUser(JSON.parse(stored) as AdminUser);
        else setUser({ username: "admin", role: "superadmin" });
      })
      .catch(() => {
        clearToken();
        localStorage.removeItem("rw-admin-user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setToken(res.token);
    const u = { username: res.username, role: res.role };
    localStorage.setItem("rw-admin-user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    clearToken();
    localStorage.removeItem("rw-admin-user");
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
