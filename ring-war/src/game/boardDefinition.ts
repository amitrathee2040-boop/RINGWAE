export const SVG_SIZE = 500;
export const CX = 250;
export const CY = 250;
export const R_INNER = 75;
export const R_MIDDLE = 155;
export const R_OUTER = 225;
export const NODE_RADIUS = 12;
export const PIECE_RADIUS = 16;

export interface NodePos {
  x: number;
  y: number;
  ring: "center" | "inner" | "middle" | "outer";
}

function nodeAngle(index: number): number {
  // 22.5° offset so no node lands on the horizontal equator → clean top/bottom split
  return ((index * 45 + 22.5) * Math.PI) / 180;
}

function ringPos(r: number, angleIndex: number): { x: number; y: number } {
  const a = nodeAngle(angleIndex);
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

export const NODE_POSITIONS: NodePos[] = (() => {
  const pos: NodePos[] = [];
  pos[0] = { x: CX, y: CY, ring: "center" };
  for (let i = 1; i <= 8; i++) {
    const p = ringPos(R_INNER, i - 1);
    pos[i] = { ...p, ring: "inner" };
  }
  for (let i = 9; i <= 16; i++) {
    const p = ringPos(R_MIDDLE, i - 9);
    pos[i] = { ...p, ring: "middle" };
  }
  for (let i = 17; i <= 24; i++) {
    const p = ringPos(R_OUTER, i - 17);
    pos[i] = { ...p, ring: "outer" };
  }
  return pos;
})();

export const TOTAL_NODES = 25;

export const ADJACENCY: Record<number, number[]> = {
  0: [1, 2, 3, 4, 5, 6, 7, 8],
  1: [0, 2, 8, 9],
  2: [0, 1, 3, 10],
  3: [0, 2, 4, 11],
  4: [0, 3, 5, 12],
  5: [0, 4, 6, 13],
  6: [0, 5, 7, 14],
  7: [0, 6, 8, 15],
  8: [0, 7, 1, 16],
  9: [1, 10, 16, 17],
  10: [2, 9, 11, 18],
  11: [3, 10, 12, 19],
  12: [4, 11, 13, 20],
  13: [5, 12, 14, 21],
  14: [6, 13, 15, 22],
  15: [7, 14, 16, 23],
  16: [8, 15, 9, 24],
  17: [9, 18, 24],
  18: [10, 17, 19],
  19: [11, 18, 20],
  20: [12, 19, 21],
  21: [13, 20, 22],
  22: [14, 21, 23],
  23: [15, 22, 24],
  24: [16, 23, 17],
};

export const SPOKES: number[][] = [
  [0, 1, 9, 17],
  [0, 2, 10, 18],
  [0, 3, 11, 19],
  [0, 4, 12, 20],
  [0, 5, 13, 21],
  [0, 6, 14, 22],
  [0, 7, 15, 23],
  [0, 8, 16, 24],
];

export const RINGS: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23, 24],
];

export const CENTER_CROSS_PAIRS: [number, number][] = [
  [1, 5], [2, 6], [3, 7], [4, 8],
  [9, 13], [10, 14], [11, 15], [12, 16],
];

export const JUMP_MAP: Map<string, number> = (() => {
  const m = new Map<string, number>();

  for (const spoke of SPOKES) {
    for (let i = 0; i <= spoke.length - 3; i++) {
      const a = spoke[i];
      const b = spoke[i + 1];
      const c = spoke[i + 2];
      if (!m.has(`${a}-${b}`)) m.set(`${a}-${b}`, c);
      if (!m.has(`${c}-${b}`)) m.set(`${c}-${b}`, a);
    }
  }

  for (const [a, b] of CENTER_CROSS_PAIRS) {
    m.set(`${a}-0`, b);
    m.set(`${b}-0`, a);
  }

  for (const ring of RINGS) {
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const a = ring[(i - 1 + n) % n];
      const b = ring[i];
      const c = ring[(i + 1) % n];
      const d = ring[(i + 2) % n];
      if (!m.has(`${a}-${b}`)) m.set(`${a}-${b}`, c);
      if (!m.has(`${c}-${b}`)) m.set(`${c}-${b}`, a);
      if (!m.has(`${b}-${c}`)) m.set(`${b}-${c}`, d);
      if (!m.has(`${d}-${c}`)) m.set(`${d}-${c}`, b);
    }
  }

  return m;
})();

// Bottom half (angles 112.5°-247.5°): player1 orange — perfectly below horizontal
export const ORANGE_START = new Set([3, 4, 5, 6, 11, 12, 13, 14, 19, 20, 21, 22]);
// Top half (angles 292.5°-67.5°): player2 pink — perfectly above horizontal
export const PINK_START = new Set([1, 2, 7, 8, 9, 10, 15, 16, 17, 18, 23, 24]);
export const INNER_RING = new Set([1, 2, 3, 4, 5, 6, 7, 8]);

export function buildInitialBoard(): Record<string, "player1" | "player2" | null> {
  const board: Record<string, "player1" | "player2" | null> = {};
  for (let i = 0; i < TOTAL_NODES; i++) {
    board[i] = null;
  }
  ORANGE_START.forEach((n) => (board[n] = "player1"));
  PINK_START.forEach((n) => (board[n] = "player2"));
  return board;
}
