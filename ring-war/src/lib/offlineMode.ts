/**
 * Offline-mode preference + network detection helpers.
 *
 * Ring War is offline-first. Bot games, hot-seat games and local save data
 * never touch Firebase / Photon / Agora. This module gives the rest of the
 * app one place to:
 *   - persist the user's explicit "Offline Mode" choice across sessions
 *   - check live navigator.onLine state
 *   - subscribe to online/offline transitions
 *   - emit clear `[OFFLINE MODE]` / `[ONLINE MODE]` logs
 *
 * Hard rule: if `isOfflineModePreferred()` returns true, NO networked
 * subsystem (Firebase Auth/DB, Photon, Agora, websockets) may initialize.
 */

const STORAGE_KEY = "ringwar-offline-mode";

export function isOfflineModePreferred(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOfflineModePreferred(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, "1");
      console.log("[OFFLINE MODE] preference saved — networked systems disabled");
    } else {
      localStorage.removeItem(STORAGE_KEY);
      console.log("[ONLINE MODE] preference cleared — networked systems allowed");
    }
  } catch {
    /* storage unavailable — ignore */
  }
}

export function isDeviceOnline(): boolean {
  try {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  } catch {
    return true;
  }
}

export function onNetworkChange(cb: (online: boolean) => void): () => void {
  const onOnline  = () => { console.log("[NETWORK] device online");  cb(true);  };
  const onOffline = () => { console.log("[NETWORK] device offline"); cb(false); };
  window.addEventListener("online",  onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online",  onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/**
 * Returns true when networked systems MUST stay disabled:
 *   - user explicitly chose Offline Mode, OR
 *   - device currently has no internet.
 */
export function shouldStayOffline(): boolean {
  return isOfflineModePreferred() || !isDeviceOnline();
}

export function logOfflineGameplay(component: string): void {
  console.log(`[OFFLINE MODE] Local-only gameplay started (${component})`);
}

export function logOnlineInit(system: string): void {
  console.log(`[ONLINE MODE] Multiplayer systems initialized (${system})`);
}