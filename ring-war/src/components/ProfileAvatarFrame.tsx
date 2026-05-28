import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export interface AvatarFrameDef {
  id: string;
  name: string;
  colors: { a: string; b: string; c: string; glow: string };
  pulseDuration: number;
  type: "crown" | "gems" | "lightning" | "shadow" | "crystal" | "diamond";
}

export const AVATAR_FRAMES: AvatarFrameDef[] = [
  {
    id: "none",
    name: "No Frame",
    colors: { a: "transparent", b: "transparent", c: "transparent", glow: "transparent" },
    pulseDuration: 0,
    type: "crown",
  },
  {
    id: "frame_divine_crown",
    name: "Divine Crown",
    colors: { a: "#92400e", b: "#f59e0b", c: "#fde68a", glow: "#f59e0b" },
    pulseDuration: 1.8,
    type: "crown",
  },
  {
    id: "frame_galaxy_emperor",
    name: "Galaxy Emperor",
    colors: { a: "#1e1b4b", b: "#7c3aed", c: "#c4b5fd", glow: "#8b5cf6" },
    pulseDuration: 2.2,
    type: "gems",
  },
  {
    id: "frame_thunder_god",
    name: "Thunder God",
    colors: { a: "#1e3a8a", b: "#3b82f6", c: "#93c5fd", glow: "#60a5fa" },
    pulseDuration: 1.5,
    type: "lightning",
  },
  {
    id: "frame_shadow_phantom",
    name: "Shadow Phantom",
    colors: { a: "#0c0a1a", b: "#3b0764", c: "#a855f7", glow: "#7c3aed" },
    pulseDuration: 2.5,
    type: "shadow",
  },
  {
    id: "frame_crystal_dragon",
    name: "Crystal Dragon",
    colors: { a: "#0c4a6e", b: "#0284c7", c: "#bae6fd", glow: "#22d3ee" },
    pulseDuration: 2.0,
    type: "crystal",
  },
  {
    id: "frame_royal_diamond",
    name: "Royal Diamond",
    colors: { a: "#475569", b: "#e2e8f0", c: "#ffffff", glow: "#cbd5e1" },
    pulseDuration: 2.0,
    type: "diamond",
  },
];

interface Props {
  frameId: string;
  size?: number;
  previewOnly?: boolean;
  children?: ReactNode;
}

function FrameCanvas({ frame, size }: { frame: AvatarFrameDef; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frame.id === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R  = size / 2 + 6;  // ring radius, just outside avatar
    let t = 0;

    type Particle = { angle: number; r: number; life: number; maxLife: number; speed: number; sz: number };
    const particles: Particle[] = [];
    for (let i = 0; i < 18; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        r: R - 2 + Math.random() * 8,
        life: Math.random() * 60,
        maxLife: 40 + Math.random() * 50,
        speed: (Math.random() - 0.5) * 0.04,
        sz: 1 + Math.random() * 2,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      t += 0.018;

      // ── Outer glow ring ──
      const glowGrad = ctx!.createLinearGradient(cx - R, cy, cx + R, cy);
      glowGrad.addColorStop(0, frame.colors.a);
      glowGrad.addColorStop(0.5, frame.colors.c);
      glowGrad.addColorStop(1, frame.colors.b);

      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(t * 0.4);
      ctx!.strokeStyle = glowGrad;
      ctx!.lineWidth = 3.5;
      ctx!.shadowBlur = 18;
      ctx!.shadowColor = frame.colors.glow;
      ctx!.globalAlpha = 0.9;
      ctx!.beginPath();
      ctx!.arc(0, 0, R, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.restore();

      // ── Inner accent ring (counter-rotate) ──
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(-t * 0.6);
      ctx!.strokeStyle = frame.colors.c + "80";
      ctx!.lineWidth = 1.5;
      ctx!.shadowBlur = 10;
      ctx!.shadowColor = frame.colors.c;
      ctx!.globalAlpha = 0.6;
      ctx!.beginPath();
      ctx!.arc(0, 0, R - 6, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.restore();

      // ── Frame-specific decorations ──
      ctx!.save();
      ctx!.shadowBlur = 14;
      ctx!.shadowColor = frame.colors.glow;

      if (frame.type === "crown") {
        // 5 crown spikes at top arc
        const spikes = 5;
        const span   = Math.PI * 0.75;
        for (let i = 0; i < spikes; i++) {
          const a   = -Math.PI / 2 - span / 2 + (i / (spikes - 1)) * span;
          const bx1 = cx + (R - 3) * Math.cos(a - 0.12);
          const by1 = cy + (R - 3) * Math.sin(a - 0.12);
          const bx2 = cx + (R - 3) * Math.cos(a + 0.12);
          const by2 = cy + (R - 3) * Math.sin(a + 0.12);
          const len = i === 2 ? 14 : i === 1 || i === 3 ? 10 : 7;
          const tx  = cx + (R + len) * Math.cos(a);
          const ty  = cy + (R + len) * Math.sin(a);
          ctx!.beginPath();
          ctx!.moveTo(bx1, by1);
          ctx!.lineTo(tx, ty);
          ctx!.lineTo(bx2, by2);
          ctx!.closePath();
          ctx!.fillStyle = frame.colors.b + "dd";
          ctx!.strokeStyle = frame.colors.c;
          ctx!.lineWidth = 1;
          ctx!.fill();
          ctx!.stroke();
        }
        // Jewel at bottom
        const jx = cx;
        const jy = cy + R + 3;
        const rr = 4;
        ctx!.beginPath();
        ctx!.arc(jx, jy, rr, 0, Math.PI * 2);
        ctx!.fillStyle = frame.colors.c;
        ctx!.fill();
      }

      if (frame.type === "gems") {
        // 6 diamond gems around ring
        for (let i = 0; i < 6; i++) {
          const a  = (i / 6) * Math.PI * 2 + t * 0.3;
          const gx = cx + (R + 4) * Math.cos(a);
          const gy = cy + (R + 4) * Math.sin(a);
          const gs = 5;
          ctx!.save();
          ctx!.translate(gx, gy);
          ctx!.rotate(a + Math.PI / 4);
          ctx!.beginPath();
          ctx!.moveTo(0, -gs);
          ctx!.lineTo(gs, 0);
          ctx!.lineTo(0, gs);
          ctx!.lineTo(-gs, 0);
          ctx!.closePath();
          ctx!.fillStyle = i % 2 === 0 ? frame.colors.c : frame.colors.b;
          ctx!.fill();
          ctx!.restore();
        }
      }

      if (frame.type === "lightning") {
        // 4 lightning bolts at N/E/S/W
        for (let i = 0; i < 4; i++) {
          const a  = (i / 4) * Math.PI * 2 - Math.PI / 2;
          const ox = cx + (R + 2) * Math.cos(a);
          const oy = cy + (R + 2) * Math.sin(a);
          const len = 12;
          const nx = Math.cos(a);
          const ny = Math.sin(a);
          const px2 = -ny;
          const py2 = nx;
          ctx!.save();
          ctx!.strokeStyle = frame.colors.c;
          ctx!.lineWidth = 2;
          ctx!.globalAlpha = 0.85 + 0.15 * Math.sin(t * 6 + i);
          ctx!.beginPath();
          ctx!.moveTo(ox - ny * 3,        oy + nx * 3);
          ctx!.lineTo(ox + nx * len * 0.4 + px2 * 3, oy + ny * len * 0.4 + py2 * 3);
          ctx!.lineTo(ox + nx * len * 0.4 - px2 * 3, oy + ny * len * 0.4 - py2 * 3);
          ctx!.lineTo(ox + nx * len,      oy + ny * len);
          ctx!.stroke();
          ctx!.restore();
        }
      }

      if (frame.type === "shadow") {
        // 8 wispy arcs around ring
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.2;
          ctx!.save();
          ctx!.translate(cx, cy);
          ctx!.rotate(a);
          ctx!.strokeStyle = frame.colors.c;
          ctx!.lineWidth = 1.5;
          ctx!.globalAlpha = 0.4 + 0.3 * Math.sin(t * 3 + i);
          ctx!.beginPath();
          ctx!.arc(R, 0, 5, -Math.PI * 0.6, Math.PI * 0.6);
          ctx!.stroke();
          ctx!.restore();
        }
      }

      if (frame.type === "crystal") {
        // 6 elongated crystal shards
        for (let i = 0; i < 6; i++) {
          const a  = (i / 6) * Math.PI * 2;
          const ox = cx + (R + 2) * Math.cos(a);
          const oy = cy + (R + 2) * Math.sin(a);
          ctx!.save();
          ctx!.translate(ox, oy);
          ctx!.rotate(a + Math.PI / 2);
          const h = 12;
          const w = 4;
          ctx!.beginPath();
          ctx!.moveTo(0, -h);
          ctx!.lineTo(w, -h * 0.3);
          ctx!.lineTo(w * 0.5, h * 0.4);
          ctx!.lineTo(0, h);
          ctx!.lineTo(-w * 0.5, h * 0.4);
          ctx!.lineTo(-w, -h * 0.3);
          ctx!.closePath();
          ctx!.fillStyle = frame.colors.b + "aa";
          ctx!.strokeStyle = frame.colors.c;
          ctx!.lineWidth = 1;
          ctx!.fill();
          ctx!.stroke();
          ctx!.restore();
        }
      }

      if (frame.type === "diamond") {
        // 8 four-pointed sparkles
        for (let i = 0; i < 8; i++) {
          const a  = (i / 8) * Math.PI * 2 + t * 0.15;
          const sx = cx + (R + 4) * Math.cos(a);
          const sy = cy + (R + 4) * Math.sin(a);
          const ss = 4 + 2 * Math.sin(t * 4 + i);
          ctx!.save();
          ctx!.translate(sx, sy);
          ctx!.strokeStyle = frame.colors.c;
          ctx!.lineWidth = 1.5;
          ctx!.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4 + i);
          ctx!.beginPath();
          ctx!.moveTo(0, -ss); ctx!.lineTo(0, ss);
          ctx!.moveTo(-ss, 0); ctx!.lineTo(ss, 0);
          ctx!.stroke();
          ctx!.restore();
        }
      }

      ctx!.restore();

      // ── Particles ──
      for (const p of particles) {
        p.angle += p.speed;
        p.life++;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.maxLife = 40 + Math.random() * 50;
          p.angle = Math.random() * Math.PI * 2;
          p.r = R - 2 + Math.random() * 8;
        }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.8;
        const px_ = cx + p.r * Math.cos(p.angle);
        const py_ = cy + p.r * Math.sin(p.angle);
        ctx!.beginPath();
        ctx!.arc(px_, py_, p.sz * alpha, 0, Math.PI * 2);
        ctx!.fillStyle = frame.colors.c + Math.round(alpha * 200).toString(16).padStart(2, "0");
        ctx!.shadowBlur = 6;
        ctx!.shadowColor = frame.colors.glow;
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [frame.id, size]);

  if (frame.id === "none") return null;
  const W = size + 32;
  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={W}
      className="absolute pointer-events-none"
      style={{
        top: -(W - size) / 2,
        left: -(W - size) / 2,
        zIndex: 10,
        borderRadius: "50%",
      }}
    />
  );
}

export default function ProfileAvatarFrame({ frameId, size = 96, previewOnly = false, children }: Props) {
  const frame = AVATAR_FRAMES.find(f => f.id === frameId) ?? AVATAR_FRAMES[0];

  if (frame.id === "none") {
    return <div style={{ position: "relative", width: size, height: size }}>{children}</div>;
  }

  const glowLow  = `0 0 ${size * 0.25}px ${frame.colors.glow}60`;
  const glowHigh = `0 0 ${size * 0.5}px ${frame.colors.glow}90, 0 0 ${size * 0.25}px ${frame.colors.glow}`;

  return (
    <motion.div
      style={{ position: "relative", width: size, height: size, borderRadius: "50%" }}
      animate={{ boxShadow: [glowLow, glowHigh, glowLow] }}
      transition={{ duration: frame.pulseDuration, repeat: Infinity, ease: "easeInOut" }}
    >
      {!previewOnly && children}
      <FrameCanvas frame={frame} size={size} />
    </motion.div>
  );
}

/** Small preview tile used in the frame picker */
export function FramePickerTile({ frame, selected, onClick }: { frame: AvatarFrameDef; selected: boolean; onClick: () => void }) {
  if (frame.id === "none") {
    return (
      <button onClick={onClick}
        className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
        style={{
          background: selected ? "rgba(245,158,11,0.15)" : "var(--bg-card-inner)",
          border: selected ? "2px solid #f59e0b" : "1px solid var(--border-color)",
        }}>
        <div className="w-10 h-10 rounded-full"
          style={{ border: "2px dashed rgba(255,255,255,0.2)", background: "var(--bg-card)" }} />
        <span className="text-[10px] theme-text-muted font-semibold">None</span>
      </button>
    );
  }

  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
      style={{
        background: selected ? `${frame.colors.glow}15` : "var(--bg-card-inner)",
        border: selected ? `2px solid ${frame.colors.b}` : "1px solid var(--border-color)",
        boxShadow: selected ? `0 0 12px ${frame.colors.glow}50` : undefined,
      }}>
      <div style={{ position: "relative", width: 40, height: 40 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: `linear-gradient(135deg,${frame.colors.a},${frame.colors.b})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>
          {frame.type === "crown" && "👑"}
          {frame.type === "gems" && "🌌"}
          {frame.type === "lightning" && "⚡"}
          {frame.type === "shadow" && "👻"}
          {frame.type === "crystal" && "🐉"}
          {frame.type === "diamond" && "💎"}
        </div>
        <motion.div className="absolute inset-0 rounded-full pointer-events-none"
          animate={{ boxShadow: [`0 0 6px ${frame.colors.glow}60`, `0 0 14px ${frame.colors.glow}90`, `0 0 6px ${frame.colors.glow}60`] }}
          transition={{ duration: frame.pulseDuration, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span className="text-[9px] font-semibold text-center leading-tight"
        style={{ color: frame.colors.c, maxWidth: 52 }}>
        {frame.name}
      </span>
    </button>
  );
}
