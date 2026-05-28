import { PieceColor } from "../types";

export const PIECE_COLORS: { id: PieceColor; color: string; rgb: string; label: string }[] = [
  { id: "orange", color: "#f97316", rgb: "249,115,22",   label: "Orange" },
  { id: "pink",   color: "#ec4899", rgb: "236,72,153",   label: "Pink"   },
  { id: "blue",   color: "#3b82f6", rgb: "59,130,246",   label: "Blue"   },
  { id: "green",  color: "#22c55e", rgb: "34,197,94",    label: "Green"  },
  { id: "purple", color: "#a855f7", rgb: "168,85,247",   label: "Purple" },
  { id: "red",    color: "#ef4444", rgb: "239,68,68",    label: "Red"    },
  { id: "gold",   color: "#f59e0b", rgb: "245,158,11",   label: "Gold"   },
  { id: "teal",   color: "#14b8a6", rgb: "20,184,166",   label: "Teal"   },
];

export function colorOf(color?: PieceColor | null, fallback: PieceColor = "orange"): string {
  return PIECE_COLORS.find((c) => c.id === (color || fallback))?.color ?? "#f97316";
}

export function rgbOf(color?: PieceColor | null, fallback: PieceColor = "orange"): string {
  return PIECE_COLORS.find((c) => c.id === (color || fallback))?.rgb ?? "249,115,22";
}
