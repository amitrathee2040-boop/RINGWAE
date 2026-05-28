import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SeasonalSkin, RARITY_CONFIG, SkinRarity } from "../data/seasonalSkins";

interface Props {
  skin: SeasonalSkin | null;
  name: string;
  size?: "sm" | "md" | "lg";
  showCrown?: boolean;
  rank?: number;
}

const SIZE_MAP = { sm: 36, md: 48, lg: 64 };
const TEXT_SIZE = { sm: "text-xs", md: "text-base", lg: "text-xl" };

export default function SeasonalFrame({ skin, name, size = "md", showCrown, rank }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const px = SIZE_MAP[size];
  const initial = name.charAt(0).toUpperCase();

  const rarity: SkinRarity = skin?.rarity ?? "none";
  const cfg = RARITY_CONFIG[rarity];
  const frameColor = skin?.frameColor ?? "#374151";
  const glowColor = skin?.glowColor ?? "#374151";
  const particleColor = skin?.particleColor ?? "#6b7280";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !skin || rarity === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; angle: number; radius: number; speed: number };
    const particles: Particle[] = [];

    function mkParticle(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const radius = (px / 2) * 0.85 + Math.random() * 6;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - (rarity === "mythic" ? 0.4 : 0),
        life: 0,
        maxLife: 40 + Math.random() * 40,
        size: 1 + Math.random() * (rarity === "mythic" ? 3 : rarity === "legendary" ? 2.5 : 2),
        angle,
        radius,
        speed: 0.02 + Math.random() * 0.04,
      };
    }

    for (let i = 0; i < 12; i++) particles.push(mkParticle());
    let t = 0;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      t += 0.02;

      const rings = rarity === "mythic" ? 2 : rarity === "legendary" ? 2 : 1;
      for (let r = 0; r < rings; r++) {
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.rotate(t * (r % 2 === 0 ? 1 : -1.3));
        const grad = ctx!.createLinearGradient(-px / 2, 0, px / 2, 0);
        grad.addColorStop(0, frameColor + "ff");
        grad.addColorStop(0.4, glowColor + "60");
        grad.addColorStop(1, frameColor + "ff");
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = rarity === "mythic" ? 2.5 : 1.8;
        ctx!.shadowBlur = rarity === "mythic" ? 12 : 8;
        ctx!.shadowColor = frameColor;
        ctx!.beginPath();
        ctx!.arc(0, 0, (px / 2) - 2 - r * 4, 0, Math.PI * 2 * (rarity === "legendary" ? 0.75 : rarity === "epic" ? 0.85 : 1));
        ctx!.stroke();
        ctx!.restore();
      }

      if (Math.random() < 0.4) particles.push(mkParticle());
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.angle += p.speed;
        p.x += p.vx;
        p.y += p.vy;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = 1 - p.life / p.maxLife;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx!.fillStyle = particleColor + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx!.shadowBlur = 6;
        ctx!.shadowColor = particleColor;
        ctx!.fill();
      }

      if (rarity === "epic" && Math.random() < 0.08) {
        ctx!.save();
        ctx!.strokeStyle = "#93c5fd";
        ctx!.lineWidth = 1;
        ctx!.shadowBlur = 8;
        ctx!.shadowColor = "#60a5fa";
        ctx!.globalAlpha = 0.8;
        ctx!.beginPath();
        const sx = cx + (Math.random() - 0.5) * px * 0.8;
        ctx!.moveTo(sx, cy - px / 3);
        ctx!.lineTo(sx + (Math.random() - 0.5) * 8, cy);
        ctx!.lineTo(sx + (Math.random() - 0.5) * 12, cy + px / 3);
        ctx!.stroke();
        ctx!.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [skin?.id, px, frameColor, glowColor, particleColor, rarity]);

  const pulseDuration = rarity === "mythic" ? 1.5 : rarity === "legendary" ? 2 : 2.5;

  return (
    <div className="relative flex-shrink-0" style={{ width: px, height: px }}>
      {skin && rarity !== "none" && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{ boxShadow: [`0 0 ${px * 0.3}px ${cfg.glow}`, `0 0 ${px * 0.6}px ${cfg.glow}`, `0 0 ${px * 0.3}px ${cfg.glow}`] }}
          transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
          style={{ borderRadius: "50%" }}
        />
      )}

      {skin && rarity !== "none" && (
        <canvas
          ref={canvasRef}
          width={px}
          height={px}
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: "50%", zIndex: 2 }}
        />
      )}

      <div
        className="absolute inset-0 rounded-full flex items-center justify-center font-black z-10"
        style={{
          background: skin
            ? `linear-gradient(135deg, ${frameColor}25, ${glowColor}15)`
            : "var(--bg-card-inner)",
          border: skin ? `2px solid ${frameColor}70` : "2px solid var(--border-color)",
          color: skin ? frameColor : "var(--text-muted)",
          fontSize: px * 0.38,
        }}
      >
        {skin?.icon && rarity !== "none" ? (
          <span style={{ fontSize: px * 0.34 }}>{skin.icon}</span>
        ) : (
          <span className={TEXT_SIZE[size]}>{initial}</span>
        )}
      </div>

      {showCrown && rank === 1 && (
        <motion.div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: px * 0.42 }}
        >
          👑
        </motion.div>
      )}

      {rank !== undefined && rank <= 10 && (
        <div
          className="absolute -bottom-1 -right-1 z-20 rounded-full flex items-center justify-center font-black text-white"
          style={{
            width: px * 0.38,
            height: px * 0.38,
            fontSize: px * 0.18,
            background: rank === 1 ? "linear-gradient(135deg, #ff4444, #ffd700)"
              : rank === 2 ? "linear-gradient(135deg, #a855f7, #6366f1)"
              : rank === 3 ? "linear-gradient(135deg, #3b82f6, #60a5fa)"
              : cfg.gradient,
            boxShadow: `0 0 8px ${cfg.glow}`,
          }}
        >
          {rank}
        </div>
      )}
    </div>
  );
}
