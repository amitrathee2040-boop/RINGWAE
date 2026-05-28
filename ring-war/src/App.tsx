import { useEffect, useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { signInAnonymously, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { hasFirebaseConfig, auth, googleProvider } from "./firebase";
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
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig || auth === null) {
      setUid("offline-" + Math.random().toString(36).slice(2));
      setIsGuest(true);
      setLoading(false);
      return;
    }

    // Safety timeout: if Firebase auth takes >8s, fall back to offline mode
    const timeout = setTimeout(() => {
      setUid("offline-" + Math.random().toString(36).slice(2));
      setIsGuest(true);
      setLoading(false);
    }, 8000);

    const firebaseAuth = auth;
    const unsub = onAuthStateChanged(firebaseAuth, async (user) => {
      clearTimeout(timeout);
      if (user) {
        setUid(user.uid);
        // Anonymous users are guests; real accounts (Google etc.) are not
        setIsGuest(user.isAnonymous);
        setAuthError(null);
        setLoading(false);
      } else {
        try {
          const cred = await signInAnonymously(firebaseAuth);
          setUid(cred.user.uid);
          setIsGuest(true);
          setAuthError(null);
          setLoading(false);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setAuthError(msg);
          setUid("offline-" + Math.random().toString(36).slice(2));
          setIsGuest(true);
          setLoading(false);
        }
      }
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  // Google login handler — called when user clicks "Login" in Lobby
  const handleLogin = useCallback(async () => {
    if (!auth) return;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUid(result.user.uid);
      setIsGuest(false);
    } catch (e: unknown) {
      console.warn("Popup login failed, trying redirect login:", e);

      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error("Redirect login failed:", redirectError);
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
          <Route path="/room/:code"     component={({ params }) => <Game uid={uid!} roomCode={params.code} />} />
          <Route path="/spectate/:code" component={({ params }) => <SpectatorView uid={uid!} roomCode={params.code} />} />
          <Route path="/bot/:difficulty" component={({ params }) => <BotGame uid={uid!} difficulty={params.difficulty as "easy" | "normal" | "hard"} />} />
          <Route path="/bot4/:difficulty" component={({ params }) => <BotGame4 uid={uid!} difficulty={params.difficulty as "easy" | "normal" | "hard"} />} />
          <Route path="/offline"   component={() => <OfflineGame uid={uid!} />} />
          <Route path="/offline4"  component={() => <OfflineGame4 uid={uid!} />} />
          <Route path="/quickmatch4" component={() => <QuickMatch4 uid={uid!} />} />
          <Route path="/room4/:code" component={({ params }) => <Game4 uid={uid!} roomCode={params.code} />} />
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
