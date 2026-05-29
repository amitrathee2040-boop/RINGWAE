import { useEffect, useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { hasFirebaseConfig, auth, googleProvider, authReady } from "./firebase";
import { isOfflineModePreferred, onNetworkChange } from "./lib/offlineMode";
import { PlayerProvider } from "./contexts/PlayerContext";
import Lobby from "./components/Lobby";
import Game from "./components/Game";
import BotGame from "./components/BotGame";
import BotGame4 from "./components/BotGame4";
import OfflineGame from "./components/OfflineGame";
import Game4 from "./components/Game4";
import OfflineGame4 from "./components/OfflineGame4";
import QuickMatch4 from "./components/QuickMatch4";
import Profile from "./components/Profile";
import SpectatorView from "./components/SpectatorView";
import NotFound from "./pages/not-found";
import AdminPage from "./pages/AdminPage";
import MatchHistory from "./pages/MatchHistory";
import Support from "./components/Support";

export default function App() {
  const [uid, setUid] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Track internet connectivity
  useEffect(() => onNetworkChange(setIsOnline), []);

  useEffect(() => {
    if (isOfflineModePreferred()) {
      console.log("[OFFLINE MODE] App started in local-only mode — auth skipped");
      setUid("offline-" + Math.random().toString(36).slice(2));
      setIsGuest(true);
      setLoading(false);
      return;
    }
    if (!hasFirebaseConfig || auth === null) {
      console.log("[OFFLINE MODE] No firebase config — local-only fallback");
      setUid("offline-" + Math.random().toString(36).slice(2));
      setIsGuest(true);
      setLoading(false);
      return;
    }

    const firebaseAuth = auth;
    let cancelled = false;
    // Guards that prevent the guest-init race condition:
    //   1. `persistenceReady` — wait until Firebase persistence is configured
    //      so signInAnonymously isn't called before the persisted user is
    //      restored from localStorage / IndexedDB.
    //   2. `redirectChecked` — wait until getRedirectResult() resolves so a
    //      Google-redirect login isn't overwritten by an anonymous fallback.
    //   3. `hasRealUser` — once we observe a non-anonymous user we NEVER
    //      fall back to guest; we just wait for the real session to restore.
    let persistenceReady = false;
    let redirectChecked = false;
    let hasRealUser = false;

    // Safety timeout: if Firebase never resolves (8s), drop to offline mode.
    const timeout = setTimeout(() => {
      if (cancelled || hasRealUser) return;
      console.warn("[auth] firebase auth timed out — offline fallback");
      setUid("offline-" + Math.random().toString(36).slice(2));
      setIsGuest(true);
      setLoading(false);
    }, 8000);

    const maybeSignInAnon = async (user: import("firebase/auth").User | null) => {
      if (cancelled || hasRealUser) return;
      if (!persistenceReady || !redirectChecked) {
        console.log("[auth] deferring guest init — persistence/redirect not ready", {
          persistenceReady, redirectChecked,
        });
        return;
      }
      // Re-check currentUser at the moment we'd sign in — it may have been
      // restored from persistence between events.
      const current = firebaseAuth.currentUser ?? user;
      if (current) {
        console.log("[auth] currentUser present, skip anon init:", current.uid, "anon=", current.isAnonymous);
        return;
      }
      try {
        console.log("[auth] no user after auth-ready — signing in anonymously");
        const cred = await signInAnonymously(firebaseAuth);
        if (cancelled || hasRealUser) return;
        setUid(cred.user.uid);
        setIsGuest(true);
        setAuthError(null);
        setLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[auth] anonymous sign-in failed:", msg);
        setAuthError(msg);
        setUid("offline-" + Math.random().toString(36).slice(2));
        setIsGuest(true);
        setLoading(false);
      }
    };

    // Register auth listener IMMEDIATELY so a persisted (Google) session is
    // picked up as soon as Firebase restores it from local storage.
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      if (cancelled) return;
      console.log("[auth] onAuthStateChanged:", {
        uid: user?.uid ?? null,
        anonymous: user?.isAnonymous ?? null,
        email: user?.email ?? null,
      });
      clearTimeout(timeout);
      if (user) {
        if (!user.isAnonymous) {
          // Real account: lock in and never fall back to guest.
          hasRealUser = true;
          console.log("[auth] real account locked in:", user.uid);
        }
        setUid(user.uid);
        setIsGuest(user.isAnonymous);
        setAuthError(null);
        setLoading(false);
      } else {
        // No user yet — DO NOT immediately create a guest. Wait until
        // persistence + redirect result have both been checked.
        void maybeSignInAnon(null);
      }
    });

    // Run persistence init + redirect check, then re-evaluate.
    (async () => {
      try {
        await authReady;
        if (cancelled) return;
        persistenceReady = true;
        console.log("[auth] persistence ready, current=", firebaseAuth.currentUser?.uid ?? null);
      } catch (e) {
        console.warn("[auth] authReady failed:", e);
        persistenceReady = true;
      }
      try {
        const result = await getRedirectResult(firebaseAuth);
        if (cancelled) return;
        if (result?.user) {
          hasRealUser = true;
          console.log("[auth] restored from redirect login:", result.user.uid);
          setUid(result.user.uid);
          setIsGuest(false);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[auth] getRedirectResult failed:", err);
      } finally {
        redirectChecked = true;
        void maybeSignInAnon(firebaseAuth.currentUser);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  // Google login handler — called when user clicks "Login" in Lobby
  const handleLogin = useCallback(async () => {
    if (!auth) {
      console.warn("[auth] login clicked but firebase auth unavailable");
      return;
    }
    try {
      // Ensure persistence is configured BEFORE sign-in so the session is
      // written to IndexedDB/localStorage and survives reloads.
      await authReady;
      console.log("[auth] starting Google popup login");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[auth] popup login success:", result.user.uid, result.user.email);
      // Commit synchronously so the UI cannot flicker back to guest before
      // onAuthStateChanged fires.
      setUid(result.user.uid);
      setIsGuest(false);
      setAuthError(null);
      setLoading(false);
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      // User-cancelled popups should NOT degrade to redirect — that would
      // navigate away and re-trigger guest init on return.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/user-cancelled"
      ) {
        console.log("[auth] popup cancelled by user:", code);
        return;
      }
      console.warn("[auth] popup login failed, falling back to redirect:", e);
      try {
        await authReady;
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error("[auth] redirect login failed:", redirectError);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="screen-bg">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black tracking-widest shimmer-text">RING WAR</div>
            <div className="text-xs theme-text-muted text-center mt-1 animate-pulse-soft">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="screen-bg">
        <div className="w-full max-w-sm mx-auto px-4 text-center space-y-6 animate-slide-up">
          <div className="text-3xl font-black tracking-widest shimmer-text">RING WAR</div>
          <div className="theme-card p-5 text-left space-y-3 rounded-2xl">
            <p className="font-semibold text-sm text-red-400">Firebase Auth Error</p>
            <p className="text-xs theme-text-muted font-mono break-all leading-relaxed">{authError}</p>
          </div>
          <button
            onClick={() => { setAuthError(null); setLoading(true); window.location.reload(); }}
            className="btn-gold w-full py-3 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isOffline = uid?.startsWith("offline-") ?? false;
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

  return (
    <PlayerProvider uid={uid!}>
      <WouterRouter base={basePath}>
        <Switch>
          <Route path="/" component={() => (
            <Lobby
              uid={uid!}
              isOffline={isOffline}
              isGuest={isGuest}
              isOnline={isOnline}
              onLogin={handleLogin}
            />
          )} />
          <Route path="/room/:code"     component={(props: any) => <Game uid={uid!} roomCode={props?.params?.code ?? ""} />} />
          <Route path="/spectate/:code" component={(props: any) => <SpectatorView uid={uid!} roomCode={props?.params?.code ?? ""} />} />
          <Route path="/bot/:difficulty" component={(props: any) => <BotGame uid={uid!} difficulty={(props?.params?.difficulty as "easy" | "normal" | "hard") ?? "normal"} />} />
          <Route path="/bot4/:difficulty" component={(props: any) => <BotGame4 uid={uid!} difficulty={(props?.params?.difficulty as "easy" | "normal" | "hard") ?? "normal"} />} />
          <Route path="/offline"   component={() => <OfflineGame uid={uid!} />} />
          <Route path="/offline4"  component={() => <OfflineGame4 uid={uid!} />} />
          <Route path="/quickmatch4" component={() => <QuickMatch4 uid={uid!} />} />
          <Route path="/room4/:code" component={(props: any) => <Game4 uid={uid!} roomCode={props?.params?.code ?? ""} />} />
          <Route path="/profile"   component={() => <Profile uid={uid!} />} />
          <Route path="/admin"     component={() => <AdminPage />} />
          <Route path="/history"   component={() => <MatchHistory />} />
          <Route path="/support"   component={() => <Support />} />
          <Route component={NotFound} />
        </Switch>
      </WouterRouter>
    </PlayerProvider>
  );
}
