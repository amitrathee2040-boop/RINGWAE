import { ADJACENCY4, JUMP_MAP4, Player4Key, ALL_PLAYERS4 } from "./boardDefinition4";

export type Board4 = Record<string, Player4Key | null>;

export interface ValidMove4 { to: number; kills: number[]; isJump: boolean; }

export function getJumpLanding4(from: number, over: number, board: Board4): number | null {
  const key = `${from}-${over}`;
  const landing = JUMP_MAP4.get(key);
  if (landing === undefined) return null;
  if (board[String(landing)] !== null) return null;
  return landing;
}

export function getValidMoves4(from: number, board: Board4, player: Player4Key): ValidMove4[] {
  const moves: ValidMove4[] = [];
  const adj = ADJACENCY4[from] ?? [];
  for (const to of adj) {
    if (board[String(to)] === null) moves.push({ to, kills: [], isJump: false });
  }
  for (const over of adj) {
    const occ = board[String(over)];
    if (occ !== null && occ !== player) {
      const landing = getJumpLanding4(from, over, board);
      if (landing !== null) moves.push({ to: landing, kills: [over], isJump: true });
    }
  }
  return moves;
}

export function getComboJumps4(from: number, board: Board4, player: Player4Key): ValidMove4[] {
  const adj = ADJACENCY4[from] ?? [];
  const jumps: ValidMove4[] = [];
  for (const over of adj) {
    const occ = board[String(over)];
    if (occ !== null && occ !== player) {
      const landing = getJumpLanding4(from, over, board);
      if (landing !== null) jumps.push({ to: landing, kills: [over], isJump: true });
    }
  }
  return jumps;
}

export interface ApplyResult4 {
  newBoard: Board4;
  killed: number[];
  winner: Player4Key | null;
  canCombo: boolean;
  eliminated: Record<string, boolean>;
  pieces: Record<Player4Key, number>;
}

export function applyMove4(
  from: number,
  to: number,
  kills: number[],
  board: Board4,
  player: Player4Key,
  eliminated: Record<string, boolean>
): ApplyResult4 {
  const newBoard = { ...board };
  newBoard[String(to)] = player;
  newBoard[String(from)] = null;
  for (const k of kills) newBoard[String(k)] = null;

  const newElim = { ...eliminated };
  const pieces: Record<Player4Key, number> = { player1: 0, player2: 0, player3: 0, player4: 0 };

  for (const p of ALL_PLAYERS4) {
    pieces[p] = Object.values(newBoard).filter(v => v === p).length;
    if (!newElim[p] && pieces[p] === 0) newElim[p] = true;
  }

  const active = ALL_PLAYERS4.filter(p => !newElim[p]);
  const winner: Player4Key | null = active.length === 1 ? active[0] : null;
  const canCombo = kills.length > 0 && winner === null && getComboJumps4(to, newBoard, player).length > 0;

  return { newBoard, killed: kills, winner, canCombo, eliminated: newElim, pieces };
}

export function nextTurn4(current: Player4Key, eliminated: Record<string, boolean>): Player4Key {
  const idx = ALL_PLAYERS4.indexOf(current);
  for (let i = 1; i <= 4; i++) {
    const next = ALL_PLAYERS4[(idx + i) % 4];
    if (!eliminated[next]) return next;
  }
  return current;
}

export function hasAnyMoves4(board: Board4, player: Player4Key): boolean {
  for (let i = 0; i < 49; i++) {
    if (board[String(i)] === player && getValidMoves4(i, board, player).length > 0) return true;
  }
  return false;
}

export function countPieces4(board: Board4, player: Player4Key): number {
  return Object.values(board).filter(v => v === player).length;
}
