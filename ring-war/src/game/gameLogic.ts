import { PlayerKey } from "../types";
import { ADJACENCY, JUMP_MAP, INNER_RING } from "./boardDefinition";

export type Board = Record<string, PlayerKey | null>;

function opponent(p: PlayerKey): PlayerKey {
  return p === "player1" ? "player2" : "player1";
}

export function getJumpLanding(from: number, over: number, board: Board): number | null {
  const key = `${from}-${over}`;
  const landing = JUMP_MAP.get(key);
  if (landing === undefined) return null;
  if (board[String(landing)] !== null) return null;
  return landing;
}

export interface ValidMove {
  to: number;
  kills: number[];
  isJump: boolean;
}

export function getValidMoves(from: number, board: Board, player: PlayerKey): ValidMove[] {
  const moves: ValidMove[] = [];
  const adj = ADJACENCY[from] ?? [];

  for (const to of adj) {
    if (board[String(to)] === null) {
      moves.push({ to, kills: [], isJump: false });
    }
  }

  for (const over of adj) {
    if (board[String(over)] === opponent(player)) {
      const landing = getJumpLanding(from, over, board);
      if (landing !== null) {
        moves.push({ to: landing, kills: [over], isJump: true });
      }
    }
  }

  return moves;
}

export function getComboJumps(from: number, board: Board, player: PlayerKey): ValidMove[] {
  const adj = ADJACENCY[from] ?? [];
  const jumps: ValidMove[] = [];
  for (const over of adj) {
    if (board[String(over)] === opponent(player)) {
      const landing = getJumpLanding(from, over, board);
      if (landing !== null) {
        jumps.push({ to: landing, kills: [over], isJump: true });
      }
    }
  }
  return jumps;
}

export interface ApplyResult {
  newBoard: Board;
  killed: number[];
  winner: PlayerKey | null;
  canCombo: boolean;
}

export function applyMove(
  from: number,
  to: number,
  kills: number[],
  board: Board,
  player: PlayerKey
): ApplyResult {
  const newBoard = { ...board };
  newBoard[String(to)] = player;
  newBoard[String(from)] = null;
  for (const k of kills) {
    newBoard[String(k)] = null;
  }

  const opp = opponent(player);
  const oppPieces = Object.values(newBoard).filter((v) => v === opp).length;
  const winner: PlayerKey | null = oppPieces === 0 ? player : null;

  const canCombo = kills.length > 0 && winner === null && getComboJumps(to, newBoard, player).length > 0;

  return { newBoard, killed: kills, winner, canCombo };
}

export function isValidFirstMove(from: number, to: number, player: PlayerKey, board: Board): boolean {
  if (to !== 0) return false;
  if (!INNER_RING.has(from)) return false;
  if (board[String(from)] !== player) return false;
  if (board["0"] !== null) return false;
  return true;
}

export function hasAnyMoves(board: Board, player: PlayerKey): boolean {
  for (let i = 0; i < 25; i++) {
    if (board[String(i)] === player) {
      const moves = getValidMoves(i, board, player);
      if (moves.length > 0) return true;
    }
  }
  return false;
}

export function countPieces(board: Board, player: PlayerKey): number {
  return Object.values(board).filter((v) => v === player).length;
}
