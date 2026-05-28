import { useEffect, useMemo, useRef, useState } from "react";
import {
  ADJACENCY4, CX4, CY4, NODE_POSITIONS4, NODE_RADIUS4, PIECE_RADIUS4,
  SVG_SIZE4, PLAYER4_COLORS, Player4Key,
} from "../game/boardDefinition4";
import { getValidMoves4, getComboJumps4, ValidMove4 } from "../game/gameLogic4";

type Board4 = Record<string, Player4Key | null>;

interface Props {
  board: Board4;
  myKey: Player4Key;
  currentTurn: Player4Key;
  isMyTurn: boolean;
  inCombo: boolean;
  comboFrom: number | null;
  eliminated: Record<string, boolean>;
  onMove: (from: number, to: number, kills: number[]) => void;
  hintFrom?: number | null;
  hintTo?: number | null;
}

interface MovingPiece {
  player: Player4Key;
  from: number;
  to: number;
  startTime: number;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ease(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

const RING_COLORS = ["rgba(255,255,255,0.10)","rgba(255,255,255,0.07)","rgba(255,255,255,0.05)","rgba(255,255,255,0.04)"];
const RING_RADII = [55, 112, 172, 228];

export default function Board4({ board, myKey, currentTurn, isMyTurn, inCombo, comboFrom, eliminated, onMove, hintFrom = null, hintTo = null }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove4[]>([]);
  const [killedNodes, setKilledNodes] = useState<number[]>([]);
  const [landedNode, setLandedNode] = useState<number | null>(null);
  const [movingPiece, setMovingPiece] = useState<MovingPiece | null>(null);
  const [animPos, setAnimPos] = useState<{ x: number; y: number } | null>(null);
  const killTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrame = useRef<number | null>(null);
  const prevBoard = useRef<Board4>({});

  const uniqueEdges = useMemo(() => {
    const seen = new Set<string>();
    const result: [number, number][] = [];
    for (let i = 0; i < 49; i++) {
      for (const j of ADJACENCY4[i] ?? []) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) { seen.add(key); result.push([i, j]); }
      }
    }
    return result;
  }, []);

  const movablePieces = useMemo(() => {
    if (!isMyTurn) return new Set<number>();
    const result = new Set<number>();
    for (let i = 0; i < 49; i++) {
      if (board[String(i)] === myKey && getValidMoves4(i, board, myKey).length > 0) result.add(i);
    }
    return result;
  }, [board, myKey, isMyTurn]);

  const capturableEnemies = useMemo(() => {
    if (!isMyTurn || selected === null) return new Set<number>();
    const result = new Set<number>();
    for (const m of validMoves) if (m.isJump) for (const k of m.kills) result.add(k);
    return result;
  }, [isMyTurn, selected, validMoves]);

  useEffect(() => {
    if (inCombo && comboFrom !== null && isMyTurn) {
      setSelected(comboFrom);
      setValidMoves(getComboJumps4(comboFrom, board, myKey));
    } else if (!isMyTurn) {
      setSelected(null);
      setValidMoves([]);
    }
  }, [inCombo, comboFrom, isMyTurn, board, myKey]);

  useEffect(() => {
    const prev = prevBoard.current;
    const curr = board;
    const disappeared: number[] = [];
    const appeared: number[] = [];
    for (let i = 0; i < 49; i++) {
      if (prev[String(i)] !== null && curr[String(i)] === null) disappeared.push(i);
      if (prev[String(i)] === null && curr[String(i)] !== null) appeared.push(i);
    }
    if (appeared.length === 1) {
      const to = appeared[0];
      const player = curr[String(to)]!;
      const from = disappeared.find(i => prev[String(i)] === player);
      if (from !== undefined) {
        const startTime = performance.now();
        setMovingPiece({ player, from, to, startTime });
        if (animFrame.current) cancelAnimationFrame(animFrame.current);
        const DURATION = 340;
        function tick() {
          const t = Math.min((performance.now() - startTime) / DURATION, 1);
          const et = ease(t);
          const a = NODE_POSITIONS4[from!];
          const b = NODE_POSITIONS4[to];
          setAnimPos({ x: lerp(a.x, b.x, et), y: lerp(a.y, b.y, et) });
          if (t < 1) animFrame.current = requestAnimationFrame(tick);
          else { setMovingPiece(null); setAnimPos(null); animFrame.current = null; }
        }
        animFrame.current = requestAnimationFrame(tick);
      }
    }
    prevBoard.current = { ...curr };
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps

  function flashKilled(kills: number[]) {
    setKilledNodes(kills);
    if (killTimer.current) clearTimeout(killTimer.current);
    killTimer.current = setTimeout(() => setKilledNodes([]), 600);
  }
  function flashLanded(n: number) {
    setLandedNode(n);
    if (landTimer.current) clearTimeout(landTimer.current);
    landTimer.current = setTimeout(() => setLandedNode(null), 350);
  }

  function handleTap(nodeIndex: number) {
    if (!isMyTurn) return;
    if (selected === null) {
      if (!movablePieces.has(nodeIndex)) return;
      setSelected(nodeIndex);
      setValidMoves(getValidMoves4(nodeIndex, board, myKey));
      return;
    }
    const move = validMoves.find(m => m.to === nodeIndex);
    if (move) {
      flashKilled(move.kills);
      flashLanded(nodeIndex);
      onMove(selected, nodeIndex, move.kills);
      setSelected(null);
      setValidMoves([]);
      return;
    }
    if (board[String(nodeIndex)] === myKey && movablePieces.has(nodeIndex)) {
      setSelected(nodeIndex);
      setValidMoves(getValidMoves4(nodeIndex, board, myKey));
      return;
    }
    setSelected(null);
    setValidMoves([]);
  }

  const validDests = new Set(validMoves.map(m => m.to));
  const animFrom = movingPiece?.from ?? -1;

  function pieceColor(i: number) {
    const occ = board[String(i)];
    if (!occ) return null;
    return PLAYER4_COLORS[occ];
  }

  const turnColor = PLAYER4_COLORS[currentTurn];

  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox={`0 0 ${SVG_SIZE4} ${SVG_SIZE4}`} className="game-board-svg" style={{ overflow: "visible", touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none" }}>
        <defs>
          <radialGradient id="bg4" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#141c3a" />
            <stop offset="60%" stopColor="#0e1428" />
            <stop offset="100%" stopColor="#080c1a" />
          </radialGradient>
          <filter id="glow4" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="killGlow4" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Board bg */}
        <circle cx={CX4} cy={CY4} r={SVG_SIZE4/2 - 6} fill="url(#bg4)" />

        {/* Pulse ring */}
        <circle cx={CX4} cy={CY4} r={R4 + 18} fill="none" stroke={turnColor} strokeWidth={2.5} strokeOpacity={0.15} filter="url(#glow4)">
          <animate attributeName="stroke-opacity" values="0.06;0.28;0.06" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Ring circles */}
        {RING_RADII.map((r, i) => (
          <circle key={`ring-${i}`} cx={CX4} cy={CY4} r={r} fill="none" stroke={RING_COLORS[i]} strokeWidth={1.2} />
        ))}
        <circle cx={CX4} cy={CY4} r={RING_RADII[3] + 12} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

        {/* Spokes */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <line key={`sp-${i}`}
              x1={CX4} y1={CY4}
              x2={CX4 + (RING_RADII[3] + 6) * Math.sin(a)}
              y2={CY4 - (RING_RADII[3] + 6) * Math.cos(a)}
              stroke="rgba(255,255,255,0.05)" strokeWidth={0.8}
            />
          );
        })}

        {/* Edges */}
        {uniqueEdges.map(([a, b]) => {
          const pa = NODE_POSITIONS4[a];
          const pb = NODE_POSITIONS4[b];
          const oa = board[String(a)];
          const ob = board[String(b)];
          let stroke = "rgba(255,255,255,0.08)";
          if (oa && ob && oa === ob) stroke = PLAYER4_COLORS[oa] + "30";
          return <line key={`e-${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={stroke} strokeWidth={1.2} />;
        })}

        {/* Valid move destinations */}
        {validDests.size > 0 && Array.from(validDests).map(n => {
          const p = NODE_POSITIONS4[n];
          return (
            <circle key={`dest-${n}`} cx={p.x} cy={p.y} r={NODE_RADIUS4 + 5}
              fill={PLAYER4_COLORS[myKey] + "18"} stroke={PLAYER4_COLORS[myKey]} strokeWidth={1.5} strokeOpacity={0.7}
            >
              <animate attributeName="stroke-opacity" values="0.4;0.9;0.4" dur="1s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Capturable enemies */}
        {Array.from(capturableEnemies).map(n => {
          const p = NODE_POSITIONS4[n];
          return (
            <circle key={`cap-${n}`} cx={p.x} cy={p.y} r={PIECE_RADIUS4 + 4}
              fill="none" stroke="#ef4444" strokeWidth={2} strokeOpacity={0.8} filter="url(#killGlow4)"
            >
              <animate attributeName="r" values={`${PIECE_RADIUS4+2};${PIECE_RADIUS4+6};${PIECE_RADIUS4+2}`} dur="0.7s" repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Hint rings */}
        {hintFrom != null && (() => {
          const p = NODE_POSITIONS4[hintFrom];
          return p ? (
            <circle key="hint-from" cx={p.x} cy={p.y} r={PIECE_RADIUS4 + 7}
              fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth={2.5} strokeOpacity={0.9}
              filter="url(#glow4)" pointerEvents="none">
              <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="0.9s" repeatCount="indefinite" />
              <animate attributeName="r" values={`${PIECE_RADIUS4+5};${PIECE_RADIUS4+9};${PIECE_RADIUS4+5}`} dur="0.9s" repeatCount="indefinite" />
            </circle>
          ) : null;
        })()}
        {hintTo != null && (() => {
          const p = NODE_POSITIONS4[hintTo];
          return p ? (
            <circle key="hint-to" cx={p.x} cy={p.y} r={NODE_RADIUS4 + 7}
              fill="rgba(34,197,94,0.10)" stroke="#22c55e" strokeWidth={2} strokeOpacity={0.7}
              strokeDasharray="5 3" pointerEvents="none">
              <animateTransform attributeName="transform" type="rotate"
                from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`} dur="2s" repeatCount="indefinite" />
            </circle>
          ) : null;
        })()}

        {/* Nodes */}
        {Array.from({ length: 49 }, (_, i) => {
          const p = NODE_POSITIONS4[i];
          const occ = board[String(i)];
          const color = pieceColor(i);
          const isSel = selected === i;
          const isLanded = landedNode === i;
          const isKilled = killedNodes.includes(i);
          const isMovingFrom = animFrom === i;
          const isMovable = movablePieces.has(i);
          const isDest = validDests.has(i);

          if (occ) {
            if (isMovingFrom && animPos) return null;
            return (
              <g key={`node-${i}`} onClick={() => handleTap(i)} onTouchEnd={(e) => { e.preventDefault(); handleTap(i); }} style={{ cursor: isMyTurn ? "pointer" : "default" }}>
                {isSel && (
                  <circle cx={p.x} cy={p.y} r={PIECE_RADIUS4 + 6} fill={color! + "22"} stroke={color!} strokeWidth={1.5} filter="url(#glow4)" />
                )}
                {isKilled && (
                  <circle cx={p.x} cy={p.y} r={PIECE_RADIUS4 + 8} fill="#ef444420" stroke="#ef4444" strokeWidth={2} filter="url(#killGlow4)" />
                )}
                {isLanded && (
                  <circle cx={p.x} cy={p.y} r={PIECE_RADIUS4 + 6} fill={color! + "30"} stroke={color!} strokeWidth={1.5} />
                )}
                <circle cx={p.x} cy={p.y} r={PIECE_RADIUS4}
                  fill={color!}
                  fillOpacity={eliminated[occ] ? 0.25 : 1}
                  stroke={isSel ? "#ffffff" : color! + "90"}
                  strokeWidth={isSel ? 2 : 1}
                  filter={isSel || isLanded ? "url(#glow4)" : undefined}
                />
                {isMovable && !isSel && (
                  <circle cx={p.x} cy={p.y} r={PIECE_RADIUS4 + 3} fill="none" stroke="#ffffff" strokeWidth={1} strokeOpacity={0.3} strokeDasharray="3 3">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`} dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={p.x - PIECE_RADIUS4 * 0.25} cy={p.y - PIECE_RADIUS4 * 0.3} r={PIECE_RADIUS4 * 0.3}
                  fill="rgba(255,255,255,0.25)" />
              </g>
            );
          }

          return (
            <g key={`node-${i}`} onClick={() => handleTap(i)} onTouchEnd={(e) => { e.preventDefault(); handleTap(i); }} style={{ cursor: isDest && isMyTurn ? "pointer" : "default" }}>
              <circle cx={p.x} cy={p.y} r={NODE_RADIUS4 + HIT} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={NODE_RADIUS4}
                fill={isDest ? PLAYER4_COLORS[myKey] + "15" : "rgba(255,255,255,0.04)"}
                stroke={isDest ? "none" : "rgba(255,255,255,0.12)"}
                strokeWidth={0.8}
              />
            </g>
          );
        })}

        {/* Center node */}
        <circle cx={CX4} cy={CY4} r={8} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <circle cx={CX4} cy={CY4} r={3} fill="rgba(255,255,255,0.3)" />

        {/* Animating piece */}
        {movingPiece && animPos && (() => {
          const color = PLAYER4_COLORS[movingPiece.player];
          return (
            <g pointerEvents="none">
              <circle cx={animPos.x} cy={animPos.y} r={PIECE_RADIUS4 + 4} fill={color + "20"} filter="url(#glow4)" />
              <circle cx={animPos.x} cy={animPos.y} r={PIECE_RADIUS4} fill={color} stroke={color + "90"} strokeWidth={1} filter="url(#glow4)" />
              <circle cx={animPos.x - PIECE_RADIUS4 * 0.25} cy={animPos.y - PIECE_RADIUS4 * 0.3}
                r={PIECE_RADIUS4 * 0.3} fill="rgba(255,255,255,0.3)" />
            </g>
          );
        })()}

        {/* Player direction labels */}
        <text x={CX4} y={18} textAnchor="middle" fill={PLAYER4_COLORS.player2} fontSize={11} fontWeight={700} opacity={0.7}>▲ NORTH</text>
        <text x={CX4} y={490} textAnchor="middle" fill={PLAYER4_COLORS.player1} fontSize={11} fontWeight={700} opacity={0.7}>▼ SOUTH</text>
        <text x={12} y={CY4 + 4} textAnchor="middle" fill={PLAYER4_COLORS.player3} fontSize={11} fontWeight={700} opacity={0.7}
          transform={`rotate(-90,12,${CY4})`}>◀ WEST</text>
        <text x={488} y={CY4 + 4} textAnchor="middle" fill={PLAYER4_COLORS.player4} fontSize={11} fontWeight={700} opacity={0.7}
          transform={`rotate(90,488,${CY4})`}>EAST ▶</text>
      </svg>
    </div>
  );
}

const HIT = 8;
const R4 = 228;
