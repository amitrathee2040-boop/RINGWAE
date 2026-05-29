import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startPerfMonitor } from "./lib/perfMonitor";

createRoot(document.getElementById("root")!).render(<App />);

// Production perf logs (FPS / heap / network) — cheap, runs every 5s.
if (import.meta.env.PROD) startPerfMonitor();
