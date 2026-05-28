import { Board, getValidMoves, getComboJumps, applyMove } from "./gameLogic";
import { PlayerKey } from "../types";

function opp(p: PlayerKey): PlayerKey {
  return p === "player1" ? "player2" : "player1";
}

function getAllMoves(board: Board, player: PlayerKey) {
  const moves: { from: number; to: number; kills: number[] }[] = [];
  for (let i = 0; i < 25; i++) {
    if (board[String(i)] !== player) continue;
    for (const m of getValidMoves(i, board, player)) {
      moves.push({ from: i, to: m.to, kills: m.kills });
    }
  }
  return moves;
}

// Position value: center is most valuable, inner ring next, outer least
const POS_VALUE: Record<number, number> = {
  0: 8,
  1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3,
};

function evaluate(board: Board, botPlayer: PlayerKey): number {
  const oppPlayer = opp(botPlayer);
  let score = 0;
  for (let i = 0; i < 25; i++) {
    const v = board[String(i)];
    if (!v) continue;
    const pv = POS_VALUE[i] ?? 1;
    const pieceScore = 5 + pv;
    if (v === botPlayer) score += pieceScore;
    else if (v === oppPlayer) score -= pieceScore;
  }
  // Add mobility bonus: more available moves = better position
  const botMoves = getAllMoves(board, botPlayer).length;
  const oppMoves = getAllMoves(board, oppPlayer).length;
  score += (botMoves - oppMoves) * 0.4;
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botPlayer: PlayerKey,
  samePlayerCombo: boolean,
  comboFrom: number | null
): number {
  const currentPlayer = isMaximizing ? botPlayer : opp(botPlayer);

  let moves: { from: number; to: number; kills: number[] }[];
  if (samePlayerCombo && comboFrom != null) {
    const combos = getComboJumps(comboFrom, board, currentPlayer);
    moves = combos.map(m => ({ from: comboFrom, to: m.to, kills: m.kills }));
    if (moves.length === 0) {
      // No combo continuations — end of this player's turn
      return minimax(board, depth, alpha, beta, !isMaximizing, botPlayer, false, null);
    }
  } else {
    moves = getAllMoves(board, currentPlayer);
  }

  if (depth === 0 || moves.length === 0) {
    return evaluate(board, botPlayer);
  }

  if (isMaximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const result = applyMove(m.from, m.to, m.kills, board, currentPlayer);
      if (result.winner === botPlayer) return 900 + depth * 20;
      const childIsCombo = result.canCombo;
      const ev = minimax(
        result.newBoard as Board,
        depth - 1,
        alpha,
        beta,
        childIsCombo ? true : false, // still maximizing if combo continues
        botPlayer,
        childIsCombo,
        childIsCombo ? m.to : null
      );
      best = Math.max(best, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const result = applyMove(m.from, m.to, m.kills, board, currentPlayer);
      if (result.winner === opp(botPlayer)) return -900 - depth * 20;
      const childIsCombo = result.canCombo;
      const ev = minimax(
        result.newBoard as Board,
        depth - 1,
        alpha,
        beta,
        childIsCombo ? false : true, // still minimizing if opponent combo continues
        botPlayer,
        childIsCombo,
        childIsCombo ? m.to : null
      );
      best = Math.min(best, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function getBestMove(
  board: Board,
  botPlayer: PlayerKey,
  depth: number,
  inCombo: boolean,
  comboFrom: number | null
): { from: number; to: number; kills: number[] } | null {
  let pool: { from: number; to: number; kills: number[] }[];

  if (inCombo && comboFrom != null) {
    const combos = getComboJumps(comboFrom, board, botPlayer);
    pool = combos.map(m => ({ from: comboFrom, to: m.to, kills: m.kills }));
    // If only one combo option, just take it immediately
    if (pool.length <= 1) return pool[0] ?? null;
  } else {
    const all = getAllMoves(board, botPlayer);
    const jumps = all.filter(m => m.kills.length > 0);
    pool = jumps.length > 0 ? jumps : all;
  }

  if (pool.length === 0) return null;

  let bestMove = pool[0];
  let bestScore = -Infinity;

  for (const m of pool) {
    const result = applyMove(m.from, m.to, m.kills, board, botPlayer);
    // Immediate win — take it without searching further
    if (result.winner === botPlayer) return m;
    const childIsCombo = result.canCombo;
    const score = minimax(
      result.newBoard as Board,
      depth - 1,
      -Infinity,
      Infinity,
      childIsCombo ? true : false, // maximizing = still bot's combo turn
      botPlayer,
      childIsCombo,
      childIsCombo ? m.to : null
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}
