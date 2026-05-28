export interface BoardThemeVisual {
  bgStart:    string;
  bgMid:      string;
  bgEnd:      string;
  ringOuter:  string;
  ringMiddle: string;
  ringInner:  string;
  spoke:      string;
  edgeLine:   string;
  nodeEmpty0: string;
  nodeEmpty1: string;
  outerGlow:  string;
  pulseColor: string;
}

export interface PieceSkinVisual {
  highlight:        string;
  mid:              string;
  dark:             string;
  glowColor:        string;
  isLegendary:      boolean;
  extraRingColor?:  string;
}

export const DEFAULT_BOARD_THEME: BoardThemeVisual = {
  bgStart: "#0e1e3a", bgMid: "#091428", bgEnd: "#050c1a",
  ringOuter: "rgba(100,160,255,0.07)", ringMiddle: "rgba(120,180,255,0.12)", ringInner: "rgba(80,120,200,0.08)",
  spoke: "rgba(80,120,200,0.08)", edgeLine: "rgba(30,50,100,0.85)",
  nodeEmpty0: "#1e3060", nodeEmpty1: "#0f1e40",
  outerGlow: "#3b82f6", pulseColor: "#3b82f6",
};

export const BOARD_THEME_VISUALS: Record<string, BoardThemeVisual> = {
  board_classic: DEFAULT_BOARD_THEME,
  board_royal_gold: {
    bgStart: "#1a0d00", bgMid: "#0f0800", bgEnd: "#070400",
    ringOuter: "rgba(245,158,11,0.14)", ringMiddle: "rgba(253,186,116,0.18)", ringInner: "rgba(161,98,7,0.12)",
    spoke: "rgba(161,98,7,0.10)", edgeLine: "rgba(120,70,0,0.9)",
    nodeEmpty0: "#3d2000", nodeEmpty1: "#1f1000",
    outerGlow: "#f59e0b", pulseColor: "#fbbf24",
  },
  board_wooden: {
    bgStart: "#2d1508", bgMid: "#1a0d05", bgEnd: "#0d0602",
    ringOuter: "rgba(146,64,14,0.14)", ringMiddle: "rgba(161,98,7,0.18)", ringInner: "rgba(107,52,0,0.12)",
    spoke: "rgba(107,52,0,0.10)", edgeLine: "rgba(90,45,0,0.9)",
    nodeEmpty0: "#3d2000", nodeEmpty1: "#1e1000",
    outerGlow: "#d97706", pulseColor: "#a16207",
  },
  board_stone: {
    bgStart: "#1a1f28", bgMid: "#111520", bgEnd: "#080b14",
    ringOuter: "rgba(107,114,128,0.14)", ringMiddle: "rgba(156,163,175,0.18)", ringInner: "rgba(75,85,99,0.12)",
    spoke: "rgba(75,85,99,0.10)", edgeLine: "rgba(55,65,81,0.9)",
    nodeEmpty0: "#374151", nodeEmpty1: "#1f2937",
    outerGlow: "#9ca3af", pulseColor: "#6b7280",
  },
  board_desert: {
    bgStart: "#2d1a00", bgMid: "#1a1000", bgEnd: "#0d0800",
    ringOuter: "rgba(217,119,6,0.14)", ringMiddle: "rgba(251,191,36,0.18)", ringInner: "rgba(161,98,7,0.12)",
    spoke: "rgba(161,98,7,0.10)", edgeLine: "rgba(120,80,0,0.9)",
    nodeEmpty0: "#3d2200", nodeEmpty1: "#1f1100",
    outerGlow: "#d97706", pulseColor: "#fbbf24",
  },
  board_ice: {
    bgStart: "#00172d", bgMid: "#000e1e", bgEnd: "#000812",
    ringOuter: "rgba(125,211,252,0.14)", ringMiddle: "rgba(186,230,253,0.18)", ringInner: "rgba(3,105,161,0.12)",
    spoke: "rgba(3,105,161,0.10)", edgeLine: "rgba(3,105,161,0.85)",
    nodeEmpty0: "#0a3050", nodeEmpty1: "#051825",
    outerGlow: "#7dd3fc", pulseColor: "#bae6fd",
  },
  board_cyberpunk: {
    bgStart: "#050f1a", bgMid: "#020910", bgEnd: "#010508",
    ringOuter: "rgba(34,211,238,0.14)", ringMiddle: "rgba(244,114,182,0.18)", ringInner: "rgba(14,116,144,0.12)",
    spoke: "rgba(14,116,144,0.10)", edgeLine: "rgba(14,116,144,0.85)",
    nodeEmpty0: "#0e1e35", nodeEmpty1: "#071018",
    outerGlow: "#22d3ee", pulseColor: "#f472b6",
  },
  board_lava: {
    bgStart: "#1c0400", bgMid: "#0d0200", bgEnd: "#060100",
    ringOuter: "rgba(239,68,68,0.18)", ringMiddle: "rgba(249,115,22,0.22)", ringInner: "rgba(127,29,29,0.15)",
    spoke: "rgba(127,29,29,0.10)", edgeLine: "rgba(100,20,0,0.9)",
    nodeEmpty0: "#3d0a00", nodeEmpty1: "#1f0400",
    outerGlow: "#ef4444", pulseColor: "#f97316",
  },
  board_galaxy: {
    bgStart: "#0d0018", bgMid: "#06000e", bgEnd: "#030008",
    ringOuter: "rgba(139,92,246,0.18)", ringMiddle: "rgba(236,72,153,0.22)", ringInner: "rgba(76,29,149,0.15)",
    spoke: "rgba(76,29,149,0.10)", edgeLine: "rgba(60,20,120,0.85)",
    nodeEmpty0: "#1e0440", nodeEmpty1: "#0f0220",
    outerGlow: "#8b5cf6", pulseColor: "#ec4899",
  },
};

export const DEFAULT_PIECE_SKIN: PieceSkinVisual = {
  highlight: "#fed7aa", mid: "#f97316", dark: "#9a3412",
  glowColor: "#f97316", isLegendary: false,
};

export const PIECE_SKIN_VISUALS: Record<string, PieceSkinVisual> = {
  piece_default:        { highlight: "#fed7aa", mid: "#f97316", dark: "#9a3412", glowColor: "#f97316", isLegendary: false },
  piece_fire_core:      { highlight: "#fed7aa", mid: "#ff4500", dark: "#7f1d1d", glowColor: "#ff4500", isLegendary: false },
  piece_aqua_orb:       { highlight: "#e0f2fe", mid: "#38bdf8", dark: "#0369a1", glowColor: "#38bdf8", isLegendary: false },
  piece_emerald_spirit: { highlight: "#bbf7d0", mid: "#34d399", dark: "#065f46", glowColor: "#34d399", isLegendary: false },
  piece_desert_soul:    { highlight: "#fef3c7", mid: "#fbbf24", dark: "#92400e", glowColor: "#fbbf24", isLegendary: false },
  piece_night_pulse:    { highlight: "#ede9fe", mid: "#a78bfa", dark: "#4c1d95", glowColor: "#a78bfa", isLegendary: false },
  piece_cyber_samurai:  { highlight: "#a5f3fc", mid: "#22d3ee", dark: "#0e7490", glowColor: "#22d3ee", isLegendary: false, extraRingColor: "#f472b6" },
  piece_frost_hunter:   { highlight: "#f0f9ff", mid: "#bae6fd", dark: "#0c4a6e", glowColor: "#7dd3fc", isLegendary: false },
  piece_toxic_venom:    { highlight: "#dcfce7", mid: "#4ade80", dark: "#14532d", glowColor: "#4ade80", isLegendary: false },
  piece_neon_phantom:   { highlight: "#fce7f3", mid: "#f472b6", dark: "#831843", glowColor: "#f472b6", isLegendary: false },
  piece_lava_beast:     { highlight: "#fee2e2", mid: "#f97316", dark: "#7f1d1d", glowColor: "#ef4444", isLegendary: false },
  piece_inferno_king:   { highlight: "#ffd6d6", mid: "#dc2626", dark: "#450a0a", glowColor: "#ff4500", isLegendary: true, extraRingColor: "#fbbf24" },
  piece_galaxy_phantom: { highlight: "#e9d5ff", mid: "#9333ea", dark: "#1e1b4b", glowColor: "#9333ea", isLegendary: true, extraRingColor: "#c084fc" },
  piece_thunder_titan:  { highlight: "#dbeafe", mid: "#3b82f6", dark: "#1e3a8a", glowColor: "#60a5fa", isLegendary: true, extraRingColor: "#93c5fd" },
  piece_shadow_reaper:  { highlight: "#c4b5fd", mid: "#6b21a8", dark: "#0c0c1a", glowColor: "#7c3aed", isLegendary: true, extraRingColor: "#a855f7" },
  piece_crystal_dragon: { highlight: "#f0f9ff", mid: "#7dd3fc", dark: "#0c4a6e", glowColor: "#22d3ee", isLegendary: true, extraRingColor: "#e0f2fe" },
  piece_divine_emperor: { highlight: "#ffffff", mid: "#fbbf24", dark: "#78350f", glowColor: "#fbbf24", isLegendary: true, extraRingColor: "#ffffff" },
};
