import { Board4, getValidMoves4, getComboJumps4, applyMove4, nextTurn4 } from "./gameLogic4";
import { Player4Key, ALL_PLAYERS4, NODE_POSITIONS4 } from "./boardDefinition4";

const CX = 250;
const CY = 250;

// Position value: closer to center = more valuable
function posValue(idx: number): number {
  const p = NODE_POSITIONS4[idx];
  if (!p) return 0;
  const dist = Math.sqrt((p.x - CX) ** 2 + (p.y - CY) ** 2);
  if (dist < 10) return 8;    // center
  if (dist < 70) return 5;    // ring 1
  if (dist < 130) return 3;   // ring 2
  if (dist < 190) return 2;   // ring 3
  return 1;                   // ring 4 (starting zone)
}

// Precompute position values
const POS_VAL: number[] = Array.from({ length: 49 }, (_, i) => posValue(i));

function evaluate4(
  board: Board4,
  botPlayer: Player4Key,
  eliminated: Record<string, boolean>
): number {
  let score = 0;
  for (let i = 0; i < 49; i++) {
    const v = board[String(i)];
    if (!v) continue;
    const pv = POS_VAL[i];
    const ps = 6 + pv;
    if (v === botPlayer) score += ps;
    else if (!eliminated[v]) score -= ps;
  }
  return score;
}

interface Move4 { from: number; to: number; kills: number[] }

function scoreMove(m: Move4, board: Board4, player: Player4Key): number {
  let s = m.kills.length * 50;
  s += POS_VAL[m.to] - POS_VAL[m.from];
  return s;
}

function getCandidateMoves(
  player: Player4Key,
  board: Board4,
  eliminated: Record<string, boolean>,
  inCombo: boolean,
  comboFrom: number | null,
  limit: number
): Move4[] {
  const moves: (Move4 & { score: number })[] = [];

  if (inCombo && comboFrom != null) {
    for (const m of getComboJumps4(comboFrom, board, player)) {
      moves.push({ from: comboFrom, to: m.to, kills: m.kills, score: m.kills.length * 50 });
    }
  } else {
    for (let i = 0; i < 49; i++) {
      if (board[String(i)] !== player) continue;
      for (const m of getValidMoves4(i, board, player)) {
        moves.push({ from: i, to: m.to, kills: m.kills, score: scoreMove({ from: i, to: m.to, kills: m.kills }, board, player) });
      }
    }
  }

  // Sort best moves first (for alpha-beta efficiency)
  moves.sort((a, b) => b.score - a.score);
  return moves.slice(0, limit).map(({ from, to, kills }) => ({ from, to, kills }));
}

function nextActivePlayer(
  after: Player4Key,
  eliminated: Record<string, boolean>
): Player4Key {
  let next = nextTurn4(after, eliminated);
  let steps = 0;
  while (eliminated[next] && steps < 4) {
    next = nextTurn4(next, eliminated);
    steps++;
  }
  return next;
}

const MOVE_LIMIT_BY_DEPTH: Record<number, number> = {
  0: 8, 1: 10, 2: 10, 3: 12, 4: 12, 5: 14, 6: 14,
};

function minimax4(
  board: Board4,
  depth: number,
  alpha: number,
  beta: number,
  activePlayer: Player4Key,
  botPlayer: Player4Key,
  eliminated: Record<string, boolean>,
  inCombo: boolean,
  comboFrom: number | null,
  botIsMax: boolean
): number {
  const active = ALL_PLAYERS4.filter(p => !eliminated[p]);
  if (active.length <= 1) {
    return active[0] === botPlayer ? 1000 + depth : -1000 - depth;
  }
  if (depth === 0) {
    return evaluate4(board, botPlayer, eliminated);
  }

  const moveLimit = MOVE_LIMIT_BY_DEPTH[Math.min(depth, 6)] ?? 10;
  const moves = getCandidateMoves(activePlayer, board, eliminated, inCombo, comboFrom, moveLimit);

  if (moves.length === 0) {
    // Player has no moves — eliminate and skip turn
    const newElim = { ...eliminated, [activePlayer]: true };
    const activeLeft = ALL_PLAYERS4.filter(p => !newElim[p]);
    if (activeLeft.length <= 1) {
      return activeLeft[0] === botPlayer ? 1000 + depth : -1000 - depth;
    }
    const next = nextActivePlayer(activePlayer, newElim);
    const nextIsMax = next === botPlayer;
    return minimax4(board, depth - 1, alpha, beta, next, botPlayer, newElim, false, null, nextIsMax);
  }

  if (botIsMax) {
    let best = -Infinity;
    for (const m of moves) {
      const result = applyMove4(m.from, m.to, m.kills, board, activePlayer, eliminated);
      if (result.winner === botPlayer) return 1000 + depth;

      let ev: number;
      if (result.canCombo) {
        // Same player continues — don't advance turn, don't reduce depth
        ev = minimax4(result.newBoard as Board4, depth, alpha, beta, activePlayer, botPlayer, result.eliminated, true, m.to, true);
      } else {
        const next = nextActivePlayer(activePlayer, result.eliminated);
        const nextIsMax = next === botPlayer;
        ev = minimax4(result.newBoard as Board4, depth - 1, alpha, beta, next, botPlayer, result.eliminated, false, null, nextIsMax);
      }

      best = Math.max(best, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const result = applyMove4(m.from, m.to, m.kills, board, activePlayer, eliminated);
      if (result.winner !== null && result.winner !== botPlayer) return -1000 - depth;

      let ev: number;
      if (result.canCombo) {
        ev = minimax4(result.newBoard as Board4, depth, alpha, beta, activePlayer, botPlayer, result.eliminated, true, m.to, false);
      } else {
        const next = nextActivePlayer(activePlayer, result.eliminated);
        const nextIsMax = next === botPlayer;
        ev = minimax4(result.newBoard as Board4, depth - 1, alpha, beta, next, botPlayer, result.eliminated, false, null, nextIsMax);
      }

      best = Math.min(best, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function getBestMove4(
  board: Board4,
  botPlayer: Player4Key,
  depth: number,
  inCombo: boolean,
  comboFrom: number | null,
  eliminated: Record<string, boolean>
): Move4 | null {
  const moveLimit = MOVE_LIMIT_BY_DEPTH[Math.min(depth, 6)] ?? 10;
  const pool = getCandidateMoves(botPlayer, board, eliminated, inCombo, comboFrom, moveLimit);

  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  // Check immediate win
  for (const m of pool) {
    const result = applyMove4(m.from, m.to, m.kills, board, botPlayer, eliminated);
    if (result.winner === botPlayer) return m;
  }

  let bestMove = pool[0];
  let bestScore = -Infinity;

  for (const m of pool) {
    const result = applyMove4(m.from, m.to, m.kills, board, botPlayer, eliminated);

    let score: number;
    if (result.canCombo) {
      score = minimax4(result.newBoard as Board4, depth, -Infinity, Infinity, botPlayer, botPlayer, result.eliminated, true, m.to, true);
    } else {
      const next = nextActivePlayer(botPlayer, result.eliminated);
      const nextIsMax = next === botPlayer;
      score = minimax4(result.newBoard as Board4, depth - 1, -Infinity, Infinity, next, botPlayer, result.eliminated, false, null, nextIsMax);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}

export function getHintMove4(
  board: Board4,
  player: Player4Key,
  inCombo: boolean,
  comboFrom: number | null
): { from: number; to: number; kills: number[] } | null {
  return getBestMove4(board, player, 3, inCombo, comboFrom, {});
}
