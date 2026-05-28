import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Lock, Check, Eye, Sparkles } from "lucide-react";
import { usePlayer, ALL_SKINS, Skin, SkinCategory } from "../contexts/PlayerContext";

const CATEGORIES: { id: SkinCategory | "all"; label: string; icon: string }[] = [
  { id: "all",        label: "All",     icon: "🛒" },
  { id: "piece",      label: "Pieces",  icon: "⚙️" },
  { id: "frame",      label: "Frames",  icon: "🔲" },
  { id: "trail",      label: "Trails",  icon: "✨" },
  { id: "killEffect", label: "Kill FX", icon: "💥" },
  { id: "winEffect",  label: "Win FX",  icon: "🎆" },
  { id: "boardTheme", label: "Boards",  icon: "🎮" },
];

const RARITY_COLORS: Record<string, string> = {
  common:    "#9ca3af",
  rare:      "#3b82f6",
  epic:      "#a855f7",
  legendary: "#f59e0b",
};

const RARITY_BG: Record<string, string> = {
  common:    "rgba(156,163,175,0.10)",
  rare:      "rgba(59,130,246,0.12)",
  epic:      "rgba(168,85,247,0.13)",
  legendary: "rgba(245,158,11,0.13)",
};

// ── Glow intensity per rarity
const RARITY_GLOW: Record<string, number> = {
  common: 0, rare: 14, epic: 22, legendary: 32,
};

interface Props { onClose: () => void; }

/* ──────────── Live Canvas Preview ──────────── */
function PiecePreview({ skin, isOwned }: { skin: Skin; isOwned: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const t = useRef(0);

  const isTrail  = skin.category === "trail";
  const isKill   = skin.category === "killEffect";
  const isWin    = skin.category === "winEffect";
  const isPiece  = skin.category === "piece";
  const isFrame  = skin.category === "frame";
  const isBoard  = skin.category === "boardTheme";
  const col      = skin.color || "#f97316";
  const gradColors = skin.gradient?.match(/#[0-9a-f]{6}/gi) || [col, col];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    type Pt = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; hue: number };
    const particles: Pt[] = [];

    function mkPt(x: number, y: number, hue?: number): Pt {
      return { x, y, vx: (Math.random() - 0.5) * 2.8, vy: -1 - Math.random() * 2.2,
        life: 0, maxLife: 22 + Math.random() * 22, r: 1.8 + Math.random() * 3, hue: hue ?? Math.random() * 360 };
    }

    function glow(color: string, blur: number) { ctx!.shadowBlur = blur; ctx!.shadowColor = color; }
    function noGlow() { ctx!.shadowBlur = 0; }

    function drawRadialPiece(cx: number, cy: number, r: number) {
      const g = ctx!.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      g.addColorStop(0, gradColors[gradColors.length - 1] || col);
      g.addColorStop(0.5, col);
      g.addColorStop(1, gradColors[0] || col);
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = g;
      glow(col, RARITY_GLOW[skin.rarity]);
      ctx!.fill();
      noGlow();
    }

    function drawDefaultPiece(cx: number, cy: number, r: number, fillColor: string) {
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = fillColor;
      ctx!.fill();
    }

    function boardPreviewFrame() {
      // Board grid with theme colors
      ctx!.clearRect(0, 0, W, H);
      t.current += 0.03;

      // Background gradient fill
      const bg = ctx!.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, `${gradColors[0]}30`);
      bg.addColorStop(1, `${gradColors[gradColors.length - 1]}15`);
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // Draw a mini 5×5-like ring-war board nodes
      const nodeR = 5;
      const spacing = 28;
      const cols = 5, rows = 4;
      const startX = (W - (cols - 1) * spacing) / 2;
      const startY = (H - (rows - 1) * spacing) / 2;

      // Lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
          ctx!.beginPath();
          ctx!.moveTo(startX + c * spacing, startY + r * spacing);
          ctx!.lineTo(startX + (c + 1) * spacing, startY + r * spacing);
          ctx!.strokeStyle = `${col}50`;
          ctx!.lineWidth = 1.5;
          glow(col, 6);
          ctx!.stroke();
          noGlow();
        }
      }
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows - 1; r++) {
          ctx!.beginPath();
          ctx!.moveTo(startX + c * spacing, startY + r * spacing);
          ctx!.lineTo(startX + c * spacing, startY + (r + 1) * spacing);
          ctx!.strokeStyle = `${col}50`;
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        }
      }

      // Nodes
      const pulse = (Math.sin(t.current * 2) + 1) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const nx = startX + c * spacing;
          const ny = startY + r * spacing;
          ctx!.beginPath();
          ctx!.arc(nx, ny, nodeR + (skin.animated ? pulse * 1.5 : 0), 0, Math.PI * 2);
          const ng = ctx!.createRadialGradient(nx, ny, 1, nx, ny, nodeR + 2);
          ng.addColorStop(0, gradColors[gradColors.length - 1] || col);
          ng.addColorStop(1, `${col}80`);
          ctx!.fillStyle = ng;
          glow(col, 10 + pulse * 5);
          ctx!.fill();
          noGlow();
        }
      }

      // Two pieces on the board
      const p1x = startX + 2 * spacing, p1y = startY + 1.5 * spacing;
      const p2x = startX + 1 * spacing, p2y = startY + 1.5 * spacing;
      ctx!.beginPath();
      ctx!.arc(p1x, p1y, 10, 0, Math.PI * 2);
      const pfg = ctx!.createRadialGradient(p1x, p1y, 1, p1x, p1y, 10);
      pfg.addColorStop(0, "#fff"); pfg.addColorStop(1, col);
      ctx!.fillStyle = pfg;
      glow(col, 18);
      ctx!.fill();
      noGlow();

      ctx!.beginPath();
      ctx!.arc(p2x, p2y, 10, 0, Math.PI * 2);
      ctx!.fillStyle = "#ec4899";
      glow("#ec4899", 14);
      ctx!.fill();
      noGlow();

      // Label
      ctx!.font = "bold 9px Inter,sans-serif";
      ctx!.fillStyle = `${col}cc`;
      ctx!.textAlign = "center";
      ctx!.fillText(skin.name, W / 2, H - 6);

      raf.current = requestAnimationFrame(boardPreviewFrame);
    }

    function mainFrame() {
      ctx!.clearRect(0, 0, W, H);
      t.current += 0.04;

      // Background tint from skin color
      const bgTint = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      bgTint.addColorStop(0, `${col}18`);
      bgTint.addColorStop(1, "transparent");
      ctx!.fillStyle = bgTint;
      ctx!.fillRect(0, 0, W, H);

      // Grid lines
      ctx!.strokeStyle = "rgba(255,255,255,0.04)";
      ctx!.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx!.beginPath(); ctx!.moveTo(W * 0.15 + i * W * 0.25, 0); ctx!.lineTo(W * 0.15 + i * W * 0.25, H); ctx!.stroke();
        ctx!.beginPath(); ctx!.moveTo(0, H * 0.2 + i * H * 0.22); ctx!.lineTo(W, H * 0.2 + i * H * 0.22); ctx!.stroke();
      }

      const cx = W / 2, cy = H / 2;
      const p2x = cx - 55, p2y = cy;
      const p1x = cx + 55, p1y = cy;

      // ── Trail ──
      if (isTrail) {
        const prog = (Math.sin(t.current) + 1) / 2;
        const trailEndX = p2x + (p1x - p2x) * prog;
        const tailLen = 0.4;
        const trailStartX = p2x + (p1x - p2x) * Math.max(0, prog - tailLen);

        const lg = ctx!.createLinearGradient(trailStartX, p2y, trailEndX, p1y);
        gradColors.forEach((c, i) => lg.addColorStop(i / Math.max(gradColors.length - 1, 1), c));

        const steps = 14;
        for (let i = 1; i <= steps; i++) {
          const r = i / steps;
          const tx = trailStartX + (trailEndX - trailStartX) * r;
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(tx, p2y, 5 * r * 0.8, 0, Math.PI * 2);
          ctx!.fillStyle = gradColors[Math.floor(r * (gradColors.length - 1))] || col;
          ctx!.globalAlpha = r * 0.8;
          glow(col, 10);
          ctx!.fill();
          ctx!.restore();
        }
        noGlow();
      }

      // ── Kill Effect ──
      if (isKill) {
        const burst = (Math.sin(t.current * 2.5) + 1) / 2;
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 + t.current;
          const dist = 14 + burst * 18;
          const kCol = gradColors[i % gradColors.length] || col;
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(p2x + Math.cos(angle) * dist, p2y + Math.sin(angle) * dist, 2.5 + burst * 2, 0, Math.PI * 2);
          ctx!.fillStyle = kCol;
          ctx!.globalAlpha = 0.6 + burst * 0.4;
          glow(kCol, 14 + burst * 10);
          ctx!.fill();
          ctx!.restore();
        }
        // Inner flash
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(p2x, p2y, 10 + burst * 8, 0, Math.PI * 2);
        ctx!.fillStyle = col;
        ctx!.globalAlpha = burst * 0.35;
        glow(col, 20);
        ctx!.fill();
        ctx!.restore();
        if (Math.random() < 0.2) particles.push(mkPt(p2x, p2y));
        noGlow();
      }

      // ── Win Effect ──
      if (isWin) {
        if (Math.random() < 0.3) particles.push(mkPt(Math.random() * W, 0, Math.random() * 360));
        // Gold ring expand
        const ring = (Math.sin(t.current * 1.5) + 1) / 2;
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(cx, cy, 20 + ring * 35, 0, Math.PI * 2);
        ctx!.strokeStyle = col;
        ctx!.lineWidth = 2;
        ctx!.globalAlpha = (1 - ring) * 0.5;
        glow(col, 18);
        ctx!.stroke();
        ctx!.restore();
        noGlow();
      }

      // ── Board nodes (simplified 3 visible) ──
      [{ x: cx - 80, y: cy - 28 }, { x: cx, y: cy - 28 }, { x: cx + 80, y: cy - 28 },
       { x: cx - 80, y: cy + 28 }, { x: cx, y: cy + 28 }, { x: cx + 80, y: cy + 28 }].forEach(n => {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(255,255,255,0.1)";
        ctx!.fill();
      });

      // ── Player piece ──
      const PIECE_R = 20;
      if (isPiece) {
        drawRadialPiece(p1x, p1y, PIECE_R);
      } else {
        drawDefaultPiece(p1x, p1y, PIECE_R, "#f97316");
        glow("#f97316", 8); ctx!.fill(); noGlow();
      }

      // ── Frame ring ──
      if (isFrame) {
        const pulse = Math.sin(t.current * 2.5) * 0.5 + 0.5;
        const lg = ctx!.createLinearGradient(p1x - PIECE_R, p1y, p1x + PIECE_R, p1y);
        gradColors.forEach((c, i) => lg.addColorStop(i / Math.max(gradColors.length - 1, 1), c));

        for (let ring = 0; ring < 2; ring++) {
          ctx!.beginPath();
          ctx!.arc(p1x, p1y, PIECE_R + 4 + ring * 5 + pulse * 3, 0, Math.PI * 2);
          ctx!.strokeStyle = lg;
          ctx!.lineWidth = ring === 0 ? 3.5 : 1.5;
          ctx!.globalAlpha = ring === 0 ? 1 : 0.4;
          glow(col, RARITY_GLOW[skin.rarity]);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
        noGlow();

        // Sparkle orbits
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + t.current * 1.2;
          const orbitR = PIECE_R + 12;
          ctx!.beginPath();
          ctx!.arc(p1x + Math.cos(angle) * orbitR, p1y + Math.sin(angle) * orbitR, 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = gradColors[i % gradColors.length] || col;
          glow(col, 12);
          ctx!.fill();
          noGlow();
        }
      }

      // ── Opponent piece (always pink) ──
      drawDefaultPiece(p2x, p2y, PIECE_R, "#ec4899");
      glow("#ec4899", 8); ctx!.fill(); noGlow();

      // ── Animated sparkle particles ──
      if (skin.animated && (isPiece || isFrame) && Math.random() < 0.15) {
        particles.push(mkPt(p1x + (Math.random() - 0.5) * 30, p1y + (Math.random() - 0.5) * 30));
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++; p.x += p.vx; p.y += p.vy;
        if (p.life > p.maxLife || p.y > H) { particles.splice(i, 1); continue; }
        const alpha = 1 - p.life / p.maxLife;
        ctx!.save();
        ctx!.globalAlpha = alpha;
        if (isWin) ctx!.fillStyle = `hsl(${p.hue},90%,65%)`;
        else ctx!.fillStyle = gradColors[0] || col;
        glow(col, 8);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
        noGlow();
      }

      // Labels
      ctx!.font = "bold 9px Inter,sans-serif";
      ctx!.fillStyle = "rgba(255,255,255,0.35)";
      ctx!.textAlign = "center";
      ctx!.fillText("YOU", p1x, p1y + 35);
      ctx!.fillText("OPP", p2x, p2y + 35);

      raf.current = requestAnimationFrame(mainFrame);
    }

    if (isBoard) boardPreviewFrame(); else mainFrame();
    return () => cancelAnimationFrame(raf.current);
  }, [skin.id]);

  return (
    <canvas
      ref={canvasRef}
      width={224}
      height={112}
      className="rounded-xl w-full"
      style={{ maxHeight: 112, background: "rgba(0,0,0,0.28)", display: "block" }}
    />
  );
}

/* ──────────── Pro Plan Banner ──────────── */
function ProPlanBanner() {
  const [active, setActive] = useState(() => localStorage.getItem("ringwar-pro-plan") === "1");

  function activate() {
    localStorage.setItem("ringwar-pro-plan", "1");
    setActive(true);
  }

  if (active) {
    return (
      <div className="mx-3 mt-2 mb-1 rounded-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0"
        style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.08))", border: "1px solid rgba(34,197,94,0.25)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)" }}>
          <span className="text-base">✓</span>
        </div>
        <div>
          <div className="text-xs font-black text-green-400">PRO PLAN ACTIVE</div>
          <div className="text-[10px] theme-text-muted">Ads are removed. Enjoy the game!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-2 mb-1 rounded-2xl overflow-hidden flex-shrink-0"
      style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.1))", border: "1px solid rgba(139,92,246,0.3)" }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
          <span className="text-lg">🚀</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-xs font-black text-white">PRO PLAN</div>
            <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(139,92,246,0.3)", color: "#a78bfa" }}>1 MONTH</div>
          </div>
          <div className="text-[10px] theme-text-muted">Remove all ads from the game</div>
        </div>
        <button
          onClick={activate}
          className="flex flex-col items-center px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
          <span className="text-xs font-black text-white">₹30</span>
          <span className="text-[9px] text-purple-200">/month</span>
        </button>
      </div>
    </div>
  );
}

/* ──────────── Main Shop ──────────── */
export default function Shop({ onClose }: Props) {
  const { data, hasSkin, ownSkin, equipSkin, league } = usePlayer();
  const [category, setCategory] = useState<SkinCategory | "all">("all");
  const [buying, setBuying] = useState<string | null>(null);
  const [selected, setSelected] = useState<Skin | null>(null);
  const [justPurchased, setJustPurchased] = useState<Skin | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = ALL_SKINS.filter(s => category === "all" || s.category === category);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function canAfford(skin: Skin) {
    if (!skin.price.coins && !skin.price.gems) return true;
    if (skin.price.coins && (data?.coins ?? 0) < skin.price.coins) return false;
    if (skin.price.gems && (data?.gems ?? 0) < skin.price.gems) return false;
    return true;
  }

  function isRankLocked(_skin: Skin) {
    return false; // all items unlocked
  }

  async function handleBuy(skin: Skin) {
    if (isRankLocked(skin)) { showToast(`Requires ${skin.rankReward} rank!`); return; }
    if (hasSkin(skin.id)) {
      equipSkin(skin.id, skin.category);
      setJustPurchased(skin);
      setTimeout(() => setJustPurchased(null), 2200);
      showToast(`Equipped ${skin.name}!`);
      return;
    }
    setBuying(skin.id);
    ownSkin(skin.id);
    equipSkin(skin.id, skin.category);
    setJustPurchased(skin);
    setTimeout(() => setJustPurchased(null), 2200);
    showToast(`🎉 Unlocked ${skin.name}!`);
    setTimeout(() => setBuying(null), 600);
  }

  const S = selected;
  const equippedId  = S ? (data?.equippedSkins?.[S.category] ?? "") : "";
  const isOwned     = S ? hasSkin(S.id) : false;
  const isEquipped  = S ? equippedId === S.id : false;
  const locked      = S ? isRankLocked(S) : false;
  const affordable  = true; // all items are free
  const isFree      = true; // all items are free
  const rarityColor = S ? RARITY_COLORS[S.rarity] : "#9ca3af";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-amber-400" />
          <span className="font-black text-lg theme-text-primary">Shop</span>
          <span className="text-xs theme-text-muted font-medium ml-1">{ALL_SKINS.length} items</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-xl theme-btn-secondary">
            <X size={16} className="theme-text-muted" />
          </button>
        </div>
      </div>

      {/* ── Live Preview Panel ── */}
      <AnimatePresence mode="wait">
        {S ? (
          <motion.div
            key={S.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mx-3 mt-2.5 rounded-2xl overflow-hidden flex-shrink-0 relative"
            style={{
              background: RARITY_BG[S.rarity],
              border: `1.5px solid ${rarityColor}30`,
              boxShadow: `0 0 ${RARITY_GLOW[S.rarity] * 1.5}px ${rarityColor}22`,
            }}
          >
            {/* rarity stripe */}
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg,transparent,${rarityColor},transparent)` }} />

            <div className="p-2.5 flex gap-3 items-stretch">
              {/* Canvas */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Eye size={10} style={{ color: rarityColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: rarityColor }}>Live Preview</span>
                </div>
                <PiecePreview skin={S} isOwned={isOwned} />
              </div>

              {/* Info */}
              <div className="w-[108px] flex flex-col gap-1.5 flex-shrink-0 justify-between">
                <div>
                  <div className="text-sm font-black theme-text-primary leading-tight">{S.name}</div>
                  <div className="text-[10px] font-bold capitalize mt-0.5" style={{ color: rarityColor }}>{S.rarity}</div>
                  <div className="text-[10px] theme-text-muted capitalize">
                    {S.category === "winEffect" ? "Win Effect" : S.category === "killEffect" ? "Kill Effect" : S.category === "boardTheme" ? "Board Theme" : S.category}
                  </div>
                  {S.rankReward && (
                    <div className="text-[9px] mt-0.5 font-semibold text-amber-400/70">
                      🏆 {S.rankReward} rank
                    </div>
                  )}
                </div>

                {/* State badge */}
                {isEquipped && <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-amber-400" style={{ background:"rgba(245,158,11,0.14)", border:`1px solid rgba(245,158,11,0.3)` }}><Check size={9} /> Equipped</div>}
                {isOwned && !isEquipped && <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-green-400" style={{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)" }}><Check size={9} /> Owned</div>}

                {/* Price */}
                {!isOwned && !locked && (
                  <div className="text-xs font-black text-green-400">
                    {isFree ? "Free" : S.price.gems ? `💎 ${S.price.gems}` : `🪙 ${S.price.coins}`}
                  </div>
                )}
                {locked && <div className="text-[10px] text-gray-400 font-semibold">🔒 {S.rankReward}</div>}

                {/* CTA button */}
                <button
                  onClick={() => handleBuy(S)}
                  disabled={buying === S.id || locked || isEquipped}
                  className="w-full py-2 rounded-xl text-xs font-black transition-all"
                  style={{
                    background: isEquipped ? "rgba(245,158,11,0.07)"
                      : locked ? "rgba(100,100,100,0.1)"
                      : isOwned ? "linear-gradient(135deg,#22c55e,#16a34a)"
                      : `linear-gradient(135deg,${rarityColor}dd,${rarityColor}88)`,
                    color: isEquipped ? "#f59e0b60" : locked ? "#666" : "#fff",
                    opacity: locked || isEquipped ? 0.55 : 1,
                    boxShadow: (!isEquipped && !locked) ? `0 0 14px ${rarityColor}44` : undefined,
                  }}
                >
                  {isEquipped ? "Equipped" : locked ? "Locked" : isOwned ? "Equip Now" : "Get Free"}
                </button>
              </div>
            </div>

            {/* Purchase-success burst overlay */}
            <AnimatePresence>
              {justPurchased?.id === S.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl z-10"
                  style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(5px)" }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1.2, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 16 }}
                    className="text-4xl"
                  >
                    {S.icon}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-black text-white mt-2"
                  >
                    {S.name}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-xs font-bold mt-1"
                    style={{ color: rarityColor }}
                  >
                    ✓ Equipped!
                  </motion.div>
                  {/* Confetti burst */}
                  {[...Array(14)].map((_, i) => (
                    <motion.div key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{ background: `hsl(${i * 26},90%,62%)`, top: "50%", left: "50%" }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos(i / 14 * Math.PI * 2) * 70,
                        y: Math.sin(i / 14 * Math.PI * 2) * 45,
                        opacity: 0, scale: 0.3,
                      }}
                      transition={{ duration: 0.65, ease: "easeOut" }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            className="mx-3 mt-2.5 rounded-2xl px-4 py-2 flex items-center gap-2 flex-shrink-0"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.10)" }}
          >
            <Sparkles size={11} className="text-amber-400/50 flex-shrink-0" />
            <span className="text-[11px] text-amber-400/50 font-medium">Tap any item to preview it live before buying</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pro Plan Banner ── */}
      <ProPlanBanner />

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar flex-shrink-0">
        {CATEGORIES.map(cat => {
          const count = cat.id === "all" ? ALL_SKINS.length : ALL_SKINS.filter(s => s.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as SkinCategory | "all")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: category === cat.id ? "rgba(245,158,11,0.15)" : "var(--bg-card-inner)",
                color: category === cat.id ? "#f59e0b" : "var(--text-muted)",
                border: `1px solid ${category === cat.id ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
              }}
            >
              {cat.icon} {cat.label}
              <span className="ml-0.5 text-[9px] opacity-50">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Item Grid ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {filtered.map((skin) => {
            const owned    = hasSkin(skin.id);
            const equipped = data?.equippedSkins?.[skin.category] === skin.id;
            const locked   = isRankLocked(skin);
            const afford   = true;
            const freeS    = true;
            const isPrev   = selected?.id === skin.id;
            const rc       = RARITY_COLORS[skin.rarity];
            const glowPx   = RARITY_GLOW[skin.rarity];

            return (
              <motion.button
                key={skin.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelected(isPrev ? null : skin)}
                className="theme-card rounded-2xl p-3 flex flex-col items-center gap-2 relative overflow-hidden text-left"
                style={{
                  border: isPrev
                    ? `2px solid ${rc}`
                    : equipped
                    ? `1.5px solid ${rc}60`
                    : "1px solid var(--border-color)",
                  opacity: locked ? 0.5 : 1,
                  background: isPrev ? RARITY_BG[skin.rarity] : undefined,
                  boxShadow: isPrev
                    ? `0 0 ${glowPx + 8}px ${rc}35, inset 0 0 ${glowPx}px ${rc}15`
                    : equipped
                    ? `0 0 ${glowPx * 0.6}px ${rc}20`
                    : undefined,
                  transition: "box-shadow 0.2s, border 0.2s",
                }}
              >
                {/* Rarity top stripe */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: skin.rarity === "common" ? "transparent" : `linear-gradient(90deg,transparent,${rc},transparent)` }} />

                {/* Preview eye / equipped check / lock */}
                {isPrev && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10"
                    style={{ background: rc }}>
                    <Eye size={10} className="text-white" />
                  </motion.div>
                )}
                {equipped && !isPrev && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10" style={{ background: "#f59e0b" }}>
                    <Check size={10} className="text-black" />
                  </div>
                )}
                {locked && !isPrev && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center z-10">
                    <Lock size={9} className="text-white" />
                  </div>
                )}

                {/* Icon with glow */}
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl relative"
                  animate={skin.animated && owned ? { scale: [1, 1.06, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    background: skin.gradient
                      ? skin.gradient
                      : skin.color ? `${skin.color}25` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${skin.color ? `${skin.color}50` : "rgba(255,255,255,0.08)"}`,
                    boxShadow: (skin.rarity !== "common" && (owned || isPrev))
                      ? `0 0 ${glowPx}px ${rc}60, 0 0 ${glowPx * 2}px ${rc}20`
                      : skin.rarity !== "common"
                      ? `0 0 ${glowPx * 0.4}px ${rc}30`
                      : undefined,
                  }}
                >
                  {skin.icon || "⚪"}
                </motion.div>

                {/* Name + rarity */}
                <div className="text-center w-full">
                  <div className="text-xs font-bold theme-text-primary truncate leading-tight">{skin.name}</div>
                  <div className="text-[10px] font-semibold capitalize mt-0.5" style={{ color: rc }}>{skin.rarity}</div>
                </div>

                {/* Status pill */}
                <div className="w-full">
                  {owned ? (
                    <div className="w-full py-1.5 rounded-xl text-center text-xs font-bold"
                      style={{ background: equipped ? `${rc}20` : "rgba(34,197,94,0.12)", color: equipped ? rc : "#22c55e",
                               boxShadow: equipped ? `0 0 8px ${rc}30` : undefined }}>
                      {equipped ? "✓ Equipped" : "Tap to equip"}
                    </div>
                  ) : locked ? (
                    <div className="w-full py-1.5 rounded-xl text-center text-[10px] font-semibold text-gray-400" style={{ background: "rgba(100,100,100,0.1)" }}>
                      🔒 {skin.rankReward}
                    </div>
                  ) : (
                    <div className="w-full py-1.5 rounded-xl text-center text-xs font-bold text-green-400" style={{ background: "rgba(34,197,94,0.1)" }}>
                      Get Free
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold text-white z-50 whitespace-nowrap"
            style={{ background: "rgba(15,20,40,0.96)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
