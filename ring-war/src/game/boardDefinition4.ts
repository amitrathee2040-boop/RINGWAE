export const SVG_SIZE4 = 500;
export const CX4 = 250;
export const CY4 = 250;
export const R1 = 55;
export const R2 = 112;
export const R3 = 172;
export const R4 = 228;
export const NODE_RADIUS4 = 9;
export const PIECE_RADIUS4 = 12;
export const TOTAL_NODES4 = 49;

export interface NodePos4 { x: number; y: number; ring: 0 | 1 | 2 | 3 | 4; }

function nodePos4(ring: 1 | 2 | 3 | 4, idx: number): { x: number; y: number } {
  const radii = [0, R1, R2, R3, R4];
  const r = radii[ring];
  const angle = ((idx - 1) * 30 * Math.PI) / 180;
  return { x: CX4 + r * Math.sin(angle), y: CY4 - r * Math.cos(angle) };
}

export const NODE_POSITIONS4: NodePos4[] = (() => {
  const pos: NodePos4[] = [];
  pos[0] = { x: CX4, y: CY4, ring: 0 };
  for (let ring = 1; ring <= 4; ring++) {
    for (let i = 1; i <= 12; i++) {
      const nodeIdx = (ring - 1) * 12 + i;
      const p = nodePos4(ring as 1 | 2 | 3 | 4, i);
      pos[nodeIdx] = { ...p, ring: ring as 0 | 1 | 2 | 3 | 4 };
    }
  }
  return pos;
})();

export const ADJACENCY4: Record<number, number[]> = (() => {
  const adj: Record<number, number[]> = {};

  adj[0] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  for (let i = 1; i <= 12; i++) {
    const prev = i === 1 ? 12 : i - 1;
    const next = i === 12 ? 1 : i + 1;
    const outward = i + 12;
    const a = [prev, next, outward, 0];
    adj[i] = a;
  }

  for (let ring = 2; ring <= 3; ring++) {
    const base = (ring - 1) * 12;
    for (let i = 1; i <= 12; i++) {
      const nodeIdx = base + i;
      const prev = i === 1 ? base + 12 : nodeIdx - 1;
      const next = i === 12 ? base + 1 : nodeIdx + 1;
      const inward = nodeIdx - 12;
      const outward = nodeIdx + 12;
      adj[nodeIdx] = [prev, next, inward, outward];
    }
  }

  for (let i = 1; i <= 12; i++) {
    const nodeIdx = 36 + i;
    const prev = i === 1 ? 48 : nodeIdx - 1;
    const next = i === 12 ? 37 : nodeIdx + 1;
    const inward = nodeIdx - 12;
    adj[nodeIdx] = [prev, next, inward];
  }

  return adj;
})();

export const JUMP_MAP4: Map<string, number> = (() => {
  const m = new Map<string, number>();

  for (let i = 1; i <= 12; i++) {
    const r2 = i + 12;
    const r3 = i + 24;
    const r4 = i + 36;

    if (!m.has(`${i}-${r2}`)) m.set(`${i}-${r2}`, r3);
    if (!m.has(`${r3}-${r2}`)) m.set(`${r3}-${r2}`, i);
    if (!m.has(`${r2}-${r3}`)) m.set(`${r2}-${r3}`, r4);
    if (!m.has(`${r4}-${r3}`)) m.set(`${r4}-${r3}`, r2);

    // All inner ring nodes can jump through center
    if (!m.has(`0-${i}`)) m.set(`0-${i}`, r2);
    if (!m.has(`${r2}-${i}`)) m.set(`${r2}-${i}`, 0);
    const opposite = ((i - 1 + 6) % 12) + 1;
    if (!m.has(`${i}-0`)) m.set(`${i}-0`, opposite);
    if (!m.has(`${opposite}-0`)) m.set(`${opposite}-0`, i);
  }

  const rings4 = [
    [1,2,3,4,5,6,7,8,9,10,11,12],
    [13,14,15,16,17,18,19,20,21,22,23,24],
    [25,26,27,28,29,30,31,32,33,34,35,36],
    [37,38,39,40,41,42,43,44,45,46,47,48],
  ];
  for (const ring of rings4) {
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

export const P1_START = new Set([6,7,8, 18,19,20, 30,31,32, 42,43,44]);
export const P2_START = new Set([12,1,2, 24,13,14, 36,25,26, 48,37,38]);
export const P3_START = new Set([9,10,11, 21,22,23, 33,34,35, 45,46,47]);
export const P4_START = new Set([3,4,5, 15,16,17, 27,28,29, 39,40,41]);

export type Player4Key = "player1" | "player2" | "player3" | "player4";
export const ALL_PLAYERS4: Player4Key[] = ["player1","player2","player3","player4"];

export function buildInitialBoard4(): Record<string, Player4Key | null> {
  const board: Record<string, Player4Key | null> = {};
  for (let i = 0; i < TOTAL_NODES4; i++) board[i] = null;
  P1_START.forEach(n => (board[n] = "player1"));
  P2_START.forEach(n => (board[n] = "player2"));
  P3_START.forEach(n => (board[n] = "player3"));
  P4_START.forEach(n => (board[n] = "player4"));
  return board;
}

export const PLAYER4_COLORS: Record<Player4Key, string> = {
  player1: "#f97316",
  player2: "#ec4899",
  player3: "#3b82f6",
  player4: "#22c55e",
};

export const PLAYER4_LABELS: Record<Player4Key, string> = {
  player1: "South",
  player2: "North",
  player3: "West",
  player4: "East",
};
