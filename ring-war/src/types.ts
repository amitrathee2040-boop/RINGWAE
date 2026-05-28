export type TeamColor = "orange" | "pink";
export type PieceColor = "orange" | "pink" | "blue" | "green" | "purple" | "red" | "gold" | "teal";
export type PlayerKey = "player1" | "player2";
export type GameStatus = "waiting" | "toss" | "playing" | "finished";

export interface Player {
  uid: string;
  displayName: string;
  avatar?: string;
  profilePhoto?: string;
}

export interface Spectator {
  displayName: string;
  joinedAt: number;
}

export interface MoveRecord {
  moveNumber: number;
  player: PlayerKey;
  from: number;
  to: number;
  kills: number[];
  board: Record<string, PlayerKey | null>;
  orangePieces: number;
  pinkPieces: number;
  timestamp: number;
  isCombo: boolean;
}

export interface GameState {
  status: GameStatus;
  players: {
    player1?: Player;
    player2?: Player;
  };
  colors: {
    player1: TeamColor;
    player2: TeamColor;
  };
  tossResult?: PlayerKey | null;
  tossAnimation?: boolean;
  board: Record<string, PlayerKey | null>;
  currentTurn: PlayerKey;
  firstMoveDone: boolean;
  winner?: PlayerKey | null;
  surrendered?: PlayerKey | null;
  orangePieces: number;
  pinkPieces: number;
  createdAt: number;
  lastMoveAt: number;
  startedAt?: number | null;
  comboFrom?: number | null;
  inCombo?: boolean;
  spectators?: Record<string, Spectator>;
  moveHistory?: Record<string, MoveRecord>;
  pieceColors?: { player1?: PieceColor; player2?: PieceColor };
  difficulty?: "easy" | "normal" | "hard";
  eloSnapshot?: { player1?: number; player2?: number };
}

export interface MovePayload {
  from: number;
  to: number;
  killed?: number[];
  comboFrom?: number | null;
  inCombo?: boolean;
}
