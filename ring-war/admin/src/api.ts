/**
 * Admin API client — all calls go to /api/admin/* with JWT auth.
 * Token is stored in localStorage under "rw-admin-token".
 */

const API_ROOT = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const BASE = `${API_ROOT}/api/admin`;

export function getToken(): string | null {
  return localStorage.getItem("rw-admin-token");
}
export function setToken(t: string) {
  localStorage.setItem("rw-admin-token", t);
}
export function clearToken() {
  localStorage.removeItem("rw-admin-token");
}

async function req<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "Request failed");
  return body as T;
}

export const api = {
  // ── Auth ───────────────────────────────────────────────
  login: (username: string, password: string) =>
    req<{ token: string; username: string; role: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => req("/auth/logout", { method: "POST" }),

  // ── Dashboard ─────────────────────────────────────────
  getDashboard: () =>
    req<{
      totalPlayers: number; onlinePlayers: number; bannedPlayers: number;
      mutedPlayers: number; liveMatches: number; liveMatches2p: number;
      liveMatches4p: number; recentLogs: Record<string, unknown>[];
      topPlayers: { uid: string; displayName: string; wins: number }[];
      serverUptime: number; timestamp: number;
    }>("/dashboard"),

  // ── Players ───────────────────────────────────────────
  getPlayers: (search = "", page = 1) =>
    req<{ players: Record<string, unknown>[]; total: number; page: number; pages: number }>(
      `/players?search=${encodeURIComponent(search)}&page=${page}`
    ),
  getPlayer: (uid: string) => req<Record<string, unknown>>(`/players/${uid}`),
  banPlayer: (uid: string, banned: boolean, reason?: string) =>
    req(`/players/${uid}/ban`, { method: "PATCH", body: JSON.stringify({ banned, reason }) }),
  mutePlayer: (uid: string, muted: boolean) =>
    req(`/players/${uid}/mute`, { method: "PATCH", body: JSON.stringify({ muted }) }),
  deletePlayer: (uid: string) => req(`/players/${uid}`, { method: "DELETE" }),

  // ── Matches ───────────────────────────────────────────
  getMatches: () =>
    req<{ matches: Record<string, unknown>[]; live2p: number; live4p: number }>("/matches"),
  endMatch2p: (code: string) => req(`/matches/${code}`, { method: "DELETE" }),
  endMatch4p: (code: string) => req(`/matches/4p/${code}`, { method: "DELETE" }),
  cleanupRooms: () =>
    req<{ ok: boolean; deleted2p: number; deleted4p: number }>("/matches/cleanup", { method: "POST" }),

  // ── Rewards ───────────────────────────────────────────
  sendReward: (uid: string, coins: number, gems: number, gold: number, message?: string) =>
    req("/rewards/send", { method: "POST", body: JSON.stringify({ uid, coins, gems, gold, message }) }),
  getPromos: () =>
    req<{ promos: Record<string, unknown>[] }>("/rewards/promo"),
  createPromo: (data: Record<string, unknown>) =>
    req("/rewards/promo", { method: "POST", body: JSON.stringify(data) }),
  deletePromo: (code: string) =>
    req(`/rewards/promo/${code}`, { method: "DELETE" }),

  // ── Ads ───────────────────────────────────────────────
  getAds: () => req<Record<string, unknown>>("/ads"),
  updateAds: (updates: Record<string, unknown>) =>
    req("/ads", { method: "PATCH", body: JSON.stringify(updates) }),

  // ── Announcements ─────────────────────────────────────
  getAnnouncements: () =>
    req<{ announcements: Record<string, unknown>[] }>("/announcements"),
  createAnnouncement: (data: Record<string, unknown>) =>
    req("/announcements", { method: "POST", body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) =>
    req(`/announcements/${id}`, { method: "DELETE" }),

  // ── Logs ──────────────────────────────────────────────
  getLogs: (page = 1, type?: string) =>
    req<{ logs: Record<string, unknown>[]; total: number; pages: number }>(
      `/logs?page=${page}${type ? `&type=${type}` : ""}`
    ),
};
