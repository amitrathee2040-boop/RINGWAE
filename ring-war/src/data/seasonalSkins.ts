export type SkinRarity = "mythic" | "legendary" | "epic" | "rare" | "special" | "none";

export interface SeasonalSkin {
  id: string;
  name: string;
  subtitle: string;
  rarity: SkinRarity;
  rankRange: [number, number];
  frameColor: string;
  glowColor: string;
  particleColor: string;
  accentColor: string;
  bgGradient: string;
  icon: string;
  description: string;
  effects: string[];
  trailLabel: string;
  winEffectLabel: string;
}

export const RARITY_CONFIG: Record<SkinRarity, { label: string; color: string; gradient: string; glow: string }> = {
  mythic:    { label: "MYTHIC",    color: "#ff4444", gradient: "linear-gradient(135deg, #ff4444, #ffd700)", glow: "rgba(255,68,68,0.6)"    },
  legendary: { label: "LEGENDARY", color: "#a855f7", gradient: "linear-gradient(135deg, #a855f7, #ffd700)", glow: "rgba(168,85,247,0.6)"   },
  epic:      { label: "EPIC",      color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #a855f7)", glow: "rgba(59,130,246,0.5)"   },
  rare:      { label: "RARE",      color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #3b82f6)", glow: "rgba(16,185,129,0.5)"   },
  special:   { label: "SPECIAL",   color: "#f97316", gradient: "linear-gradient(135deg, #f97316, #fbbf24)", glow: "rgba(249,115,22,0.5)"   },
  none:      { label: "",          color: "#6b7280", gradient: "linear-gradient(135deg, #374151, #1f2937)", glow: "rgba(107,114,128,0.2)"  },
};

export const SEASONAL_SKINS: SeasonalSkin[] = [
  {
    id: "divine_emperor",
    name: "Divine Emperor",
    subtitle: "Supreme Ruler of the Ring",
    rarity: "mythic",
    rankRange: [1, 1],
    frameColor: "#ffd700",
    glowColor: "#ff4444",
    particleColor: "#ffa500",
    accentColor: "#ff4444",
    bgGradient: "linear-gradient(135deg, rgba(255,68,68,0.2), rgba(255,215,0,0.15))",
    icon: "👑",
    description: "Floating golden energy core with rotating crown ring and fire particles.",
    effects: ["Rotating crown ring", "Red-gold fire particles", "Lightning pulse", "Ultra glowing aura"],
    trailLabel: "Burning Golden Flame",
    winEffectLabel: "Throne + Fire Aura",
  },
  {
    id: "galaxy_overlord",
    name: "Galaxy Overlord",
    subtitle: "Master of the Cosmos",
    rarity: "legendary",
    rankRange: [2, 2],
    frameColor: "#a855f7",
    glowColor: "#6366f1",
    particleColor: "#818cf8",
    accentColor: "#c084fc",
    bgGradient: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))",
    icon: "🌌",
    description: "Cosmic sphere with galaxy swirl animation and orbiting planets.",
    effects: ["Galaxy swirl animation", "Purple-blue stars", "Black hole pulse", "Orbiting planets"],
    trailLabel: "Space Dust Particles",
    winEffectLabel: "Galaxy Burst Explosion",
  },
  {
    id: "thunder_titan",
    name: "Thunder Titan",
    subtitle: "God of Lightning",
    rarity: "epic",
    rankRange: [3, 3],
    frameColor: "#3b82f6",
    glowColor: "#60a5fa",
    particleColor: "#93c5fd",
    accentColor: "#38bdf8",
    bgGradient: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(56,189,248,0.15))",
    icon: "⚡",
    description: "Electric energy orb with lightning effects and thunder pulse.",
    effects: ["Electric sparks", "Thunder pulse", "Flashing blue border", "Lightning trail"],
    trailLabel: "Electric Lightning",
    winEffectLabel: "Thunder Strike",
  },
  {
    id: "shadow_reaper",
    name: "Shadow Reaper",
    subtitle: "Lord of Darkness",
    rarity: "rare",
    rankRange: [4, 4],
    frameColor: "#7c3aed",
    glowColor: "#4c1d95",
    particleColor: "#8b5cf6",
    accentColor: "#a78bfa",
    bgGradient: "linear-gradient(135deg, rgba(76,29,149,0.25), rgba(124,58,237,0.15))",
    icon: "💀",
    description: "Black-purple shadow orb with smoke animation and evil aura.",
    effects: ["Purple smoke movement", "Eye glow effects", "Dark shadow frame", "Shadow explosion"],
    trailLabel: "Dark Smoke",
    winEffectLabel: "Shadow Explosion",
  },
  {
    id: "crystal_dragon",
    name: "Crystal Dragon",
    subtitle: "Ancient Ice Wyrm",
    rarity: "rare",
    rankRange: [5, 5],
    frameColor: "#06b6d4",
    glowColor: "#0891b2",
    particleColor: "#67e8f9",
    accentColor: "#a5f3fc",
    bgGradient: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(103,232,249,0.1))",
    icon: "🐉",
    description: "Ice crystal sphere with dragon energy particles and frost aura.",
    effects: ["Frost aura", "Ice shine animation", "Snow particles", "Frozen crystal frame"],
    trailLabel: "Frost Movement",
    winEffectLabel: "Ice Dragon Summon",
  },
  {
    id: "cyber_samurai",
    name: "Cyber Samurai",
    subtitle: "Digital Warrior",
    rarity: "special",
    rankRange: [6, 6],
    frameColor: "#22c55e",
    glowColor: "#16a34a",
    particleColor: "#86efac",
    accentColor: "#4ade80",
    bgGradient: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(74,222,128,0.08))",
    icon: "⚔️",
    description: "Neon green cyber aesthetic with animated border.",
    effects: ["Neon glow", "Animated border", "Digital particles"],
    trailLabel: "Cyber Trail",
    winEffectLabel: "Digital Slash",
  },
  {
    id: "frost_hunter",
    name: "Frost Hunter",
    subtitle: "Arctic Predator",
    rarity: "special",
    rankRange: [7, 7],
    frameColor: "#38bdf8",
    glowColor: "#0284c7",
    particleColor: "#bae6fd",
    accentColor: "#e0f2fe",
    bgGradient: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(186,230,253,0.08))",
    icon: "❄️",
    description: "Ice-cold aesthetic with frost particles.",
    effects: ["Frost particles", "Ice border", "Cold aura"],
    trailLabel: "Frost Trail",
    winEffectLabel: "Blizzard",
  },
  {
    id: "toxic_venom",
    name: "Toxic Venom",
    subtitle: "Poison Master",
    rarity: "special",
    rankRange: [8, 8],
    frameColor: "#84cc16",
    glowColor: "#4d7c0f",
    particleColor: "#bef264",
    accentColor: "#d9f99d",
    bgGradient: "linear-gradient(135deg, rgba(132,204,22,0.15), rgba(190,242,100,0.08))",
    icon: "☠️",
    description: "Toxic green with venom drip animations.",
    effects: ["Venom drip", "Toxic glow", "Poison particles"],
    trailLabel: "Toxic Drip",
    winEffectLabel: "Venom Burst",
  },
  {
    id: "neon_phantom",
    name: "Neon Phantom",
    subtitle: "Ghost of the Grid",
    rarity: "special",
    rankRange: [9, 9],
    frameColor: "#ec4899",
    glowColor: "#be185d",
    particleColor: "#f9a8d4",
    accentColor: "#fce7f3",
    bgGradient: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(249,168,212,0.08))",
    icon: "👻",
    description: "Neon pink phantom with ghost shimmer.",
    effects: ["Ghost shimmer", "Pink neon", "Phantom glow"],
    trailLabel: "Ghost Trail",
    winEffectLabel: "Phantom Fade",
  },
  {
    id: "lava_beast",
    name: "Lava Beast",
    subtitle: "Volcanic Destroyer",
    rarity: "special",
    rankRange: [10, 10],
    frameColor: "#ef4444",
    glowColor: "#b91c1c",
    particleColor: "#fca5a5",
    accentColor: "#fee2e2",
    bgGradient: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(252,165,165,0.08))",
    icon: "🌋",
    description: "Molten lava with fire and magma particles.",
    effects: ["Magma drip", "Fire glow", "Lava particles"],
    trailLabel: "Magma Trail",
    winEffectLabel: "Volcanic Eruption",
  },
  {
    id: "fire_core",
    name: "Fire Core",
    subtitle: "Flame Warrior",
    rarity: "none",
    rankRange: [11, 20],
    frameColor: "#f97316",
    glowColor: "#c2410c",
    particleColor: "#fdba74",
    accentColor: "#fed7aa",
    bgGradient: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(253,186,116,0.06))",
    icon: "🔥",
    description: "Fire-themed piece with warm glow.",
    effects: ["Warm glow", "Light movement"],
    trailLabel: "Ember Trail",
    winEffectLabel: "Fire Burst",
  },
  {
    id: "aqua_orb",
    name: "Aqua Orb",
    subtitle: "Ocean Spirit",
    rarity: "none",
    rankRange: [21, 30],
    frameColor: "#06b6d4",
    glowColor: "#0891b2",
    particleColor: "#67e8f9",
    accentColor: "#cffafe",
    bgGradient: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(103,232,249,0.06))",
    icon: "🌊",
    description: "Water-themed with gentle wave effect.",
    effects: ["Wave motion", "Aqua glow"],
    trailLabel: "Bubble Trail",
    winEffectLabel: "Tidal Wave",
  },
  {
    id: "emerald_spirit",
    name: "Emerald Spirit",
    subtitle: "Forest Guardian",
    rarity: "none",
    rankRange: [31, 40],
    frameColor: "#10b981",
    glowColor: "#059669",
    particleColor: "#6ee7b7",
    accentColor: "#a7f3d0",
    bgGradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(110,231,183,0.06))",
    icon: "💚",
    description: "Nature energy with emerald green light.",
    effects: ["Leaf shimmer", "Nature glow"],
    trailLabel: "Leaf Trail",
    winEffectLabel: "Nature Bloom",
  },
  {
    id: "night_pulse",
    name: "Night Pulse",
    subtitle: "Midnight Striker",
    rarity: "none",
    rankRange: [41, 50],
    frameColor: "#6366f1",
    glowColor: "#4338ca",
    particleColor: "#a5b4fc",
    accentColor: "#e0e7ff",
    bgGradient: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(165,180,252,0.06))",
    icon: "🌙",
    description: "Night-themed with indigo pulse effect.",
    effects: ["Night pulse", "Star shimmer"],
    trailLabel: "Starlight Trail",
    winEffectLabel: "Midnight Blast",
  },
];

export function getSkinForRank(rank: number): SeasonalSkin | null {
  return SEASONAL_SKINS.find(s => rank >= s.rankRange[0] && rank <= s.rankRange[1]) ?? null;
}

export function getSeasonInfo(): { key: string; label: string; daysLeft: number; endsAt: Date; seasonNumber: number } {
  const now = new Date();
  const epochStart = new Date("2026-01-01T00:00:00Z");
  const msPerSeason = 30 * 24 * 60 * 60 * 1000;
  const elapsed = now.getTime() - epochStart.getTime();
  const seasonIndex = Math.floor(elapsed / msPerSeason);
  const seasonStart = new Date(epochStart.getTime() + seasonIndex * msPerSeason);
  const endsAt = new Date(seasonStart.getTime() + msPerSeason);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const year = now.getFullYear();
  const seasonNumber = seasonIndex + 1;
  return { key: `${year}-S${seasonNumber}`, label: `Season ${seasonNumber}`, daysLeft, endsAt, seasonNumber };
}
