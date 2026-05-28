import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="screen-bg">
      <div className="text-center space-y-4 animate-slide-up">
        <div className="text-6xl font-black" style={{ color: "rgba(255,255,255,0.1)" }}>404</div>
        <p className="theme-text-muted text-sm">Page not found</p>
        <button onClick={() => setLocation("/")} className="btn-gold px-6 py-2 text-sm">
          Go Home
        </button>
      </div>
    </div>
  );
}
