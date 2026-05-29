/**
 * Lightweight production performance monitor.
 * Logs FPS, JS heap usage and frame jank to the console every 5s.
 * Zero deps, safe on low-end Android. Call startPerfMonitor() once on boot.
 */

let started = false;

export function startPerfMonitor(intervalMs = 5000): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  let frames = 0;
  let lastTs = performance.now();
  let rafId = 0;

  const tick = (now: number) => {
    frames++;
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  const interval = setInterval(() => {
    const now = performance.now();
    const seconds = (now - lastTs) / 1000;
    const fps = Math.round(frames / seconds);
    frames = 0;
    lastTs = now;

    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const heapMB = mem ? Math.round(mem.usedJSHeapSize / 1048576) : null;

    console.log(
      `[PERF] fps=${fps}` +
        (heapMB !== null ? ` heap=${heapMB}MB` : "") +
        ` online=${navigator.onLine}`
    );
  }, intervalMs);

  return () => {
    started = false;
    clearInterval(interval);
    cancelAnimationFrame(rafId);
  };
}

export function logBotAITiming(label: string, fn: () => void): void {
  const t0 = performance.now();
  fn();
  const dt = performance.now() - t0;
  if (dt > 16) {
    console.log(`[PERF][BOT] ${label} took ${dt.toFixed(1)}ms`);
  }
}