import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerKey } from "../types";
import {
  ADJACENCY, CX, CY, NODE_POSITIONS, NODE_RADIUS, PIECE_RADIUS,
  R_INNER, R_MIDDLE, R_OUTER, SVG_SIZE,
} from "../game/boardDefinition";
import { getValidMoves, getComboJumps, ValidMove } from "../game/gameLogic";
import { usePlayer } from "../contexts/PlayerContext";
import {
  BOARD_THEME_VISUALS, PIECE_SKIN_VISUALS,
  DEFAULT_BOARD_THEME, DEFAULT_PIECE_SKIN,
} from "../game/skinVisuals";

type Board = Record<string, PlayerKey | null>;

interface Props {
  board: Board;
  myKey: PlayerKey;
  currentTurn: PlayerKey;
  isMyTurn: boolean;
  firstMoveDone: boolean;
  inCombo: boolean;
  comboFrom: number | null;
  onMove: (from: number, to: number, kills: number[]) => void;
  p1Color?: string;
  p2Color?: string;
  noFlip?: boolean;
  hintFrom?: number | null;
  hintTo?: number | null;
}

const HIT_EXTRA = 10;

interface TrailParticle {
  id: string;
  x: number;
  y: number;
  player: PlayerKey;
  opacity: number;
  scale: number;
  born: number;
  trailType: string;
  isHead: boolean;
}

interface KillParticle {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  born: number;
  trailType: string;
  size: number;
}

interface ShockwaveRing {
  id: string;
  x: number;
  y: number;
  color: string;
  born: number;
}

interface MovingPiece {
  player: PlayerKey;
  from: number;
  to: number;
  startTime: number;
  kills: number[];
}

const TRAIL_COLORS: Record<string, string[]> = {
  trail_fire:           ["#f97316", "#ef4444", "#fbbf24"],
  trail_ice:            ["#7dd3fc", "#3b82f6", "#e0f2fe"],
  trail_thunder:        ["#facc15", "#f59e0b", "#fef08a"],
  trail_galaxy:         ["#7c3aed", "#ec4899", "#a855f7"],
  trail_shadow:         ["#7c3aed", "#3b0764", "#a855f7"],
  trail_flame:          ["#dc2626", "#f97316", "#fbbf24"],
  trail_crystal:        ["#bae6fd", "#0284c7", "#e0f2fe"],
  trail_lightning:      ["#facc15", "#ffffff", "#93c5fd"],
  trail_shadow_tail:    ["#7c3aed", "#a855f7", "#0c0a1a"],
  trail_energy_ribbon:  ["#22d3ee", "#a5f3fc", "#0e7490"],
  trail_golden_royal:   ["#f59e0b", "#fde68a", "#f59e0b"],
  trail_divine_golden:  ["#fbbf24", "#ffffff", "#f59e0b"],
};

const KILL_COLORS: Record<string, string[]> = {
  kill_fire:            ["#f97316", "#ef4444", "#fbbf24", "#fee2e2"],
  kill_ice:             ["#7dd3fc", "#3b82f6", "#e0f2fe", "#ffffff"],
  kill_thunder:         ["#facc15", "#f59e0b", "#fef08a", "#ffffff"],
  kill_galaxy:          ["#7c3aed", "#ec4899", "#a855f7", "#c4b5fd"],
  kill_shadow_destroy:  ["#7c3aed", "#a855f7", "#0c0a1a", "#c4b5fd"],
  kill_divine_golden:   ["#fbbf24", "#ffffff", "#f59e0b", "#fef9c3"],
  kill_default:         ["#ffffff", "#f97316", "#facc15"],
  win_explosion:        ["#f97316", "#ef4444", "#fbbf24", "#ffffff"],
};

function lerpPos(from: number, to: number, t: number) {
  const a = NODE_POSITIONS[from];
  const b = NODE_POSITIONS[to];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function GameBoard({
  board, myKey, currentTurn, isMyTurn, firstMoveDone, inCombo, comboFrom, onMove,
  p1Color = "#f97316",
  p2Color = "#ec4899",
  noFlip = false,
  hintFrom = null,
  hintTo = null,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [killedNodes, setKilledNodes] = useState<number[]>([]);
  const [landedNode, setLandedNode] = useState<number | null>(null);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [killParticles, setKillParticles] = useState<KillParticle[]>([]);
  const [shockwaves, setShockwaves] = useState<ShockwaveRing[]>([]);
  const [movingPiece, setMovingPiece] = useState<MovingPiece | null>(null);
  const [animPos, setAnimPos] = useState<{ x: number; y: number } | null>(null);

  const killTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBoardRef = useRef<Board>({});
  const animFrameRef = useRef<number | null>(null);
  const particleFrameRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);

  const { data } = usePlayer();
  const equippedTrail      = data?.equippedSkins?.trail       ?? "trail_none";
  const equippedKill       = data?.equippedSkins?.killEffect  ?? "kill_default";
  const equippedBoardTheme = data?.equippedSkins?.boardTheme  ?? "board_classic";
  const equippedPieceSkin  = data?.equippedSkins?.piece       ?? "piece_default";

  const theme    = BOARD_THEME_VISUALS[equippedBoardTheme]  ?? DEFAULT_BOARD_THEME;
  const mySkin   = PIECE_SKIN_VISUALS[equippedPieceSkin]    ?? DEFAULT_PIECE_SKIN;

  const turnColor  = currentTurn === "player1" ? p1Color : p2Color;
  const shouldFlip = !noFlip && myKey === "player2";
  const flipTransform = `rotate(180 ${CX} ${CY})`;

  const myGrad   = myKey === "player1" ? "myGrad"   : "myGrad";
  const oppGrad  = myKey === "player1" ? "oppGrad"  : "oppGrad";
  const myRef    = "myReflect";
  const oppRef   = "oppReflect";

  const p1GradId  = myKey === "player1" ? myGrad  : oppGrad;
  const p2GradId  = myKey === "player1" ? oppGrad : myGrad;
  const p1RefId   = myKey === "player1" ? myRef   : oppRef;
  const p2RefId   = myKey === "player1" ? oppRef  : myRef;

  const uniqueEdges = useMemo(() => {
    const seen = new Set<string>();
    const result: [number, number][] = [];
    for (let i = 0; i < 25; i++) {
      for (const j of ADJACENCY[i] ?? []) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) { seen.add(key); result.push([i, j]); }
      }
    }
    return result;
  }, []);

  const movablePieces = useMemo(() => {
    if (!isMyTurn) return new Set<number>();
    const result = new Set<number>();
    for (let i = 0; i < 25; i++) {
      if (board[String(i)] === myKey) {
        const moves = firstMoveDone
          ? getValidMoves(i, board, myKey)
          : getValidMoves(i, board, myKey).filter((m) => m.to === 0);
        if (moves.length > 0) result.add(i);
      }
    }
    return result;
  }, [board, myKey, isMyTurn, firstMoveDone]);

  const capturableEnemies = useMemo(() => {
    if (!isMyTurn || selected === null) return new Set<number>();
    const result = new Set<number>();
    for (const m of validMoves) {
      if (m.isJump) for (const k of m.kills) result.add(k);
    }
    return result;
  }, [isMyTurn, selected, validMoves]);

  useEffect(() => {
    if (inCombo && comboFrom !== null && isMyTurn) {
      setSelected(comboFrom);
      setValidMoves(getComboJumps(comboFrom, board, myKey));
    } else if (!isMyTurn) {
      setSelected(null);
      setValidMoves([]);
    }
  }, [inCombo, comboFrom, isMyTurn, board, myKey]);

  useEffect(() => {
    const prev = prevBoardRef.current;
    const curr = board;

    const disappeared: number[] = [];
    const appearedOwn: number[] = [];

    for (let i = 0; i < 25; i++) {
      const p = prev[String(i)];
      const c = curr[String(i)];
      if (p !== null && c === null) disappeared.push(i);
      if (p === null && (c === "player1" || c === "player2")) appearedOwn.push(i);
    }

    let movedFrom = -1;
    let movedTo = -1;
    let movedPlayer: PlayerKey | null = null;
    const kills: number[] = [];

    if (appearedOwn.length === 1) {
      const to = appearedOwn[0];
      const player = curr[String(to)]!;
      const from = disappeared.find(i => prev[String(i)] === player);
      if (from !== undefined && from !== to) {
        movedFrom = from;
        movedTo = to;
        movedPlayer = player;
        for (const i of disappeared) {
          if (i !== from) kills.push(i);
        }
      }
    }

    if (movedFrom !== -1 && movedTo !== -1 && movedPlayer) {
      const startTime = performance.now();
      const moving: MovingPiece = { player: movedPlayer, from: movedFrom, to: movedTo, startTime, kills };
      setMovingPiece(moving);

      if (equippedTrail !== "trail_none") {
        const colors = TRAIL_COLORS[equippedTrail] || TRAIL_COLORS["trail_sparkle"];
        const trailCount = 16;
        const newParticles: TrailParticle[] = [];
        for (let t = 0; t <= trailCount; t++) {
          const progress = t / trailCount;
          const pos = lerpPos(movedFrom, movedTo, progress);
          newParticles.push({
            id: `trail-${++particleIdRef.current}`,
            x: pos.x + (Math.random() - 0.5) * 4,
            y: pos.y + (Math.random() - 0.5) * 4,
            player: movedPlayer,
            opacity: 0.9,
            scale: 0.3 + progress * 0.7,
            born: startTime + progress * 360,
            trailType: equippedTrail,
            isHead: t === trailCount,
          });
        }
        setTrailParticles(prev => [...prev.slice(-60), ...newParticles]);
      }

      if (kills.length > 0) {
        const killColors = KILL_COLORS[equippedKill] || KILL_COLORS["kill_default"];
        const newKillParticles: KillParticle[] = [];
        const newShockwaves: ShockwaveRing[] = [];

        for (const killIdx of kills) {
          const pos = NODE_POSITIONS[killIdx];

          newShockwaves.push({
            id: `sw-${++particleIdRef.current}`,
            x: pos.x, y: pos.y,
            color: killColors[0],
            born: startTime,
          });

          const particleCount = 20;
          for (let p = 0; p < particleCount; p++) {
            const angle = (p / particleCount) * Math.PI * 2;
            const speed = 2.5 + Math.random() * 4;
            const size = 2 + Math.random() * 4;
            newKillParticles.push({
              id: `kill-${++particleIdRef.current}`,
              x: pos.x,
              y: pos.y,
              dx: Math.cos(angle) * speed,
              dy: Math.sin(angle) * speed,
              color: killColors[p % killColors.length],
              born: startTime,
              trailType: equippedKill,
              size,
            });
          }
          for (let p = 0; p < 8; p++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            newKillParticles.push({
              id: `kill-inner-${++particleIdRef.current}`,
              x: pos.x + (Math.random() - 0.5) * 6,
              y: pos.y + (Math.random() - 0.5) * 6,
              dx: Math.cos(angle) * speed,
              dy: Math.sin(angle) * speed,
              color: "#ffffff",
              born: startTime,
              trailType: equippedKill,
              size: 1.5 + Math.random() * 2,
            });
          }
        }
        setKillParticles(prev => [...prev.slice(-120), ...newKillParticles]);
        setShockwaves(prev => [...prev.slice(-8), ...newShockwaves]);
      }

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const DURATION = 380;
      function tick() {
        const now = performance.now();
        const elapsed = now - startTime;
        const t = Math.min(elapsed / DURATION, 1);
        const et = easeInOutCubic(t);
        const pos = lerpPos(movedFrom, movedTo, et);
        setAnimPos(pos);
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setMovingPiece(null);
          setAnimPos(null);
          animFrameRef.current = null;
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }

    prevBoardRef.current = { ...curr };
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const TRAIL_LIFE = 650;
    const KILL_LIFE = 900;
    const SHOCKWAVE_LIFE = 500;

    function particleTick() {
      const now = performance.now();
      setTrailParticles(prev => {
        const alive = prev
          .map(p => ({ ...p, opacity: Math.max(0, 0.9 - (now - p.born) / TRAIL_LIFE) }))
          .filter(p => p.opacity > 0.01);
        return alive.length === prev.length ? prev : alive;
      });
      setKillParticles(prev => {
        const alive = prev
          .map(p => {
            const age = (now - p.born) / KILL_LIFE;
            return {
              ...p,
              x: p.x + p.dx * age * 9,
              y: p.y + p.dy * age * 9,
              opacity: Math.max(0, 1 - age * 1.2),
            } as KillParticle & { opacity: number };
          })
          .filter((p: KillParticle & { opacity: number }) => p.opacity > 0.01);
        return alive.length === prev.length ? prev : (alive as KillParticle[]);
      });
      setShockwaves(prev => {
        const alive = prev.filter(s => (now - s.born) < SHOCKWAVE_LIFE);
        return alive.length === prev.length ? prev : alive;
      });
      particleFrameRef.current = requestAnimationFrame(particleTick);
    }

    particleFrameRef.current = requestAnimationFrame(particleTick);
    return () => {
      if (particleFrameRef.current) cancelAnimationFrame(particleFrameRef.current);
    };
  }, []);

  function flashKilled(kills: number[]) {
    setKilledNodes(kills);
    if (killTimerRef.current) clearTimeout(killTimerRef.current);
    killTimerRef.current = setTimeout(() => setKilledNodes([]), 700);
  }

  function flashLanded(node: number) {
    setLandedNode(node);
    if (landTimerRef.current) clearTimeout(landTimerRef.current);
    landTimerRef.current = setTimeout(() => setLandedNode(null), 400);
  }

  function handleNodeTap(nodeIndex: number) {
    if (!isMyTurn) return;
    if (selected === null) {
      if (!movablePieces.has(nodeIndex)) return;
      setSelected(nodeIndex);
      const moves = firstMoveDone
        ? getValidMoves(nodeIndex, board, myKey)
        : getValidMoves(nodeIndex, board, myKey).filter((m) => m.to === 0);
      setValidMoves(moves);
      return;
    }
    const move = validMoves.find((m) => m.to === nodeIndex);
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
      const moves = firstMoveDone
        ? getValidMoves(nodeIndex, board, myKey)
        : getValidMoves(nodeIndex, board, myKey).filter((m) => m.to === 0);
      setValidMoves(moves);
      return;
    }
    setSelected(null);
    setValidMoves([]);
  }

  function getNodeColor(i: number): string {
    const occ = board[String(i)];
    if (occ === "player1") return p1Color;
    if (occ === "player2") return p2Color;
    return "transparent";
  }

  const validMoveDests    = new Set(validMoves.map(m => m.to));
  const animatingFromNode = movingPiece?.from ?? -1;

  const getTrailColor = (particle: TrailParticle, index: number) => {
    const colors = TRAIL_COLORS[particle.trailType] || ["#fbbf24"];
    return colors[index % colors.length];
  };

  const oppSkin = DEFAULT_PIECE_SKIN;
  const p1Skin  = myKey === "player1" ? mySkin : oppSkin;
  const p2Skin  = myKey === "player2" ? mySkin : oppSkin;

  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="game-board-svg"
        style={{ overflow: "visible", touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none" }}
      >
        <defs>
          {/* ── Board background gradient (theme-driven) ── */}
          <radialGradient id="boardBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={theme.bgStart} />
            <stop offset="55%"  stopColor={theme.bgMid}   />
            <stop offset="100%" stopColor={theme.bgEnd}    />
          </radialGradient>

          {/* ── Empty node gradient (theme-driven) ── */}
          <radialGradient id="nodeEmpty" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={theme.nodeEmpty0} />
            <stop offset="100%" stopColor={theme.nodeEmpty1} />
          </radialGradient>

          {/* ── My piece gradient (skin-driven) ── */}
          <radialGradient id="myGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor={mySkin.highlight} />
            <stop offset="50%"  stopColor={mySkin.mid}       />
            <stop offset="100%" stopColor={mySkin.dark}      />
          </radialGradient>

          {/* ── Opponent piece gradient (default orb style) ── */}
          <radialGradient id="oppGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#fbcfe8" />
            <stop offset="50%"  stopColor={p2Color}  />
            <stop offset="100%" stopColor="#831843"  />
          </radialGradient>

          {/* ── Reflection highlights ── */}
          <radialGradient id="myReflect" cx="35%" cy="25%" r="40%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
          </radialGradient>
          <radialGradient id="oppReflect" cx="35%" cy="25%" r="40%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.50)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
          </radialGradient>

          {/* ── Filters ── */}
          <filter id="premiumGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="1 0.5 0 0 0  0.5 0.3 0 0 0  0 0 0 0 0  0 0 0 1.5 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="captureGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="boardGlow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="trailGlow" x="-80%" y="-80%" width="360%" height="360%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="killGlow" x="-100%" y="-100%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="legendaryGlow" x="-80%" y="-80%" width="360%" height="360%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="2" result="saturated" />
            <feMerge><feMergeNode in="saturated" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="shockGlow" x="-100%" y="-100%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={shouldFlip ? flipTransform : undefined}>

          {/* ── Board background ── */}
          <circle cx={CX} cy={CY} r={SVG_SIZE / 2 - 8} fill="url(#boardBg)" />

          {/* ── Outer pulse ring (turn indicator + theme color) ── */}
          <circle cx={CX} cy={CY} r={R_OUTER + 22}
            fill="none" stroke={theme.pulseColor} strokeWidth={3} strokeOpacity={0.18}
            filter="url(#boardGlow)"
          >
            <animate attributeName="stroke-opacity" values="0.08;0.30;0.08" dur="1.6s" repeatCount="indefinite" />
          </circle>

          {/* ── Ring circles (theme-driven) ── */}
          <circle cx={CX} cy={CY} r={R_OUTER + 14} fill="none" stroke={theme.ringOuter}  strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={R_OUTER}       fill="none" stroke={theme.ringOuter}  strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={R_MIDDLE}      fill="none" stroke={theme.ringMiddle} strokeWidth={1.2} />
          <circle cx={CX} cy={CY} r={R_INNER}       fill="none" stroke={theme.ringInner}  strokeWidth={1.2} />

          {/* ── Spokes (theme-driven) ── */}
          {[0,1,2,3,4,5,6,7].map(i => {
            const a = ((i * 45 + 22.5) * Math.PI) / 180;
            return (
              <line key={`spoke-${i}`}
                x1={CX} y1={CY}
                x2={CX + (R_OUTER + 8) * Math.sin(a)}
                y2={CY - (R_OUTER + 8) * Math.cos(a)}
                stroke={theme.spoke} strokeWidth={1}
              />
            );
          })}

          {/* ── Edges (theme-driven, tinted by occupation) ── */}
          {uniqueEdges.map(([a, b]) => {
            const pa = NODE_POSITIONS[a];
            const pb = NODE_POSITIONS[b];
            const oa = board[String(a)];
            const ob = board[String(b)];
            let stroke = theme.edgeLine;
            if (oa && ob && oa === ob) {
              stroke = oa === "player1" ? `${p1Color}40` : `${p2Color}40`;
            }
            return (
              <line key={`e-${a}-${b}`}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={stroke} strokeWidth={1.8}
              />
            );
          })}

          {/* ── Shockwave rings (kill effect) ── */}
          {shockwaves.map(sw => {
            const age = (performance.now() - sw.born) / 500;
            return (
              <circle key={sw.id}
                cx={sw.x} cy={sw.y}
                r={PIECE_RADIUS + 6 + age * 28}
                fill="none"
                stroke={sw.color}
                strokeWidth={Math.max(0.5, 3 - age * 3)}
                strokeOpacity={Math.max(0, 1 - age * 1.4)}
                filter="url(#shockGlow)"
                pointerEvents="none"
              />
            );
          })}

          {/* ── Trail particles (enhanced ribbon) ── */}
          {equippedTrail !== "trail_none" && trailParticles.map((p, idx) => {
            const color = getTrailColor(p, idx);
            const r = p.isHead
              ? PIECE_RADIUS * 0.65 * p.scale
              : PIECE_RADIUS * 0.35 * p.scale;
            return (
              <g key={p.id} pointerEvents="none">
                <circle
                  cx={p.x} cy={p.y}
                  r={r * 1.8}
                  fill={color}
                  opacity={p.opacity * 0.25}
                  filter="url(#trailGlow)"
                />
                <circle
                  cx={p.x} cy={p.y} r={r}
                  fill={color}
                  opacity={p.opacity}
                  filter="url(#trailGlow)"
                />
              </g>
            );
          })}

          {/* ── Kill particles ── */}
          {killParticles.map((p) => {
            const pWithOp = p as KillParticle & { opacity?: number };
            return (
              <g key={p.id} pointerEvents="none">
                <circle
                  cx={p.x} cy={p.y}
                  r={(p.size ?? 3) * 1.6}
                  fill={p.color}
                  opacity={(pWithOp.opacity ?? 1) * 0.25}
                  filter="url(#killGlow)"
                />
                <circle
                  cx={p.x} cy={p.y}
                  r={p.size ?? 3}
                  fill={p.color}
                  opacity={pWithOp.opacity ?? 1}
                  filter="url(#killGlow)"
                />
              </g>
            );
          })}

          {/* ── Valid move hints ── */}
          {isMyTurn && selected !== null && validMoveDests.size > 0 && Array.from(validMoveDests).map(i => {
            const p = NODE_POSITIONS[i];
            const isCapture = validMoves.find(m => m.to === i)?.isJump;
            return (
              <g key={`hint-${i}`}>
                <circle cx={p.x} cy={p.y} r={NODE_RADIUS + 6}
                  fill="none"
                  stroke={isCapture ? "rgba(251,191,36,0.65)" : "rgba(120,180,255,0.35)"}
                  strokeWidth={2} strokeDasharray={isCapture ? "4 2" : "none"}
                />
                <circle cx={p.x} cy={p.y} r={5}
                  fill={isCapture ? "rgba(251,191,36,0.7)" : "rgba(120,180,255,0.4)"}
                />
              </g>
            );
          })}

          {/* ── AI Hint: source piece (green pulse) ── */}
          {hintFrom != null && NODE_POSITIONS[hintFrom] && (() => {
            const p = NODE_POSITIONS[hintFrom];
            return (
              <g key="ai-hint-from" pointerEvents="none">
                <circle cx={p.x} cy={p.y} r={PIECE_RADIUS + 10}
                  fill="none" stroke="#4ade80" strokeWidth={2.5} filter="url(#premiumGlow)">
                  <animate attributeName="r" values={`${PIECE_RADIUS+8};${PIECE_RADIUS+13};${PIECE_RADIUS+8}`} dur="0.9s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="1;0.35;1" dur="0.9s" repeatCount="indefinite" />
                </circle>
                <circle cx={p.x} cy={p.y} r={5} fill="#4ade80" fillOpacity={0.55} />
              </g>
            );
          })()}

          {/* ── AI Hint: destination (dashed green ring) ── */}
          {hintTo != null && NODE_POSITIONS[hintTo] && (() => {
            const p = NODE_POSITIONS[hintTo];
            return (
              <g key="ai-hint-to" pointerEvents="none">
                <circle cx={p.x} cy={p.y} r={NODE_RADIUS + 9}
                  fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth={2}
                  strokeDasharray="5 3" filter="url(#premiumGlow)">
                  <animate attributeName="stroke-opacity" values="0.9;0.2;0.9" dur="0.9s" repeatCount="indefinite" />
                </circle>
                <circle cx={p.x} cy={p.y} r={5} fill="#4ade80" fillOpacity={0.65} />
              </g>
            );
          })()}

          {/* ── Capturable enemy highlights ── */}
          {Array.from(capturableEnemies).map(i => {
            const p = NODE_POSITIONS[i];
            return (
              <circle key={`capt-${i}`}
                cx={p.x} cy={p.y} r={PIECE_RADIUS + 5}
                fill="none" stroke="rgba(251,191,36,0.5)" strokeWidth={2.5}
                filter="url(#captureGlow)"
              />
            );
          })}

          {/* ── Kill flash rings ── */}
          {killedNodes.map(i => {
            const p = NODE_POSITIONS[i];
            const killColors = KILL_COLORS[equippedKill] || KILL_COLORS["kill_default"];
            return (
              <circle key={`kill-ring-${i}`}
                cx={p.x} cy={p.y} r={PIECE_RADIUS + 8}
                fill="none" stroke={killColors[0]} strokeWidth={3}
                filter="url(#captureGlow)"
              >
                <animate attributeName="r"             values={`${PIECE_RADIUS};${PIECE_RADIUS+20};${PIECE_RADIUS+30}`} dur="0.6s" fill="freeze" />
                <animate attributeName="stroke-opacity" values="0.95;0.5;0"                                            dur="0.6s" fill="freeze" />
                <animate attributeName="stroke-width"   values="3;2;0.5"                                               dur="0.6s" fill="freeze" />
              </circle>
            );
          })}

          {/* ── Pieces ── */}
          {NODE_POSITIONS.map((pos, i) => {
            const occ          = board[String(i)];
            const isSelected   = selected === i;
            const isKilled     = killedNodes.includes(i);
            const isLanded     = landedNode === i;
            const isMovable    = movablePieces.has(i);
            const isValidDest  = validMoveDests.has(i);
            const isTurnPiece  = occ !== null && occ === myKey && isMyTurn;
            const isAnimating  = i === animatingFromNode;
            const isMyPiece    = occ === myKey;

            if (occ) {
              const gradId    = occ === "player1" ? p1GradId : p2GradId;
              const reflectId = occ === "player1" ? p1RefId  : p2RefId;
              const pieceColor = getNodeColor(i);
              const pieceSkin  = isMyPiece ? mySkin : oppSkin;

              return (
                <g key={i}
                  onClick={() => handleNodeTap(i)}
                  onTouchEnd={(e) => { e.preventDefault(); handleNodeTap(i); }}
                  style={{ cursor: isMyTurn ? "pointer" : "default", opacity: isAnimating ? 0 : 1 }}
                >
                  <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS + HIT_EXTRA} fill="transparent" />

                  {/* Legendary outer glow ring */}
                  {isMyPiece && pieceSkin.isLegendary && !isAnimating && (
                    <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS + 11}
                      fill="none"
                      stroke={pieceSkin.extraRingColor ?? pieceSkin.glowColor}
                      strokeWidth={1.5}
                      strokeOpacity={0}
                      filter="url(#legendaryGlow)"
                    >
                      <animate attributeName="stroke-opacity" values="0;0.7;0.3;0.7;0" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="r" values={`${PIECE_RADIUS+9};${PIECE_RADIUS+14};${PIECE_RADIUS+9}`} dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Epic+ extra ring for owned pieces */}
                  {isMyPiece && !pieceSkin.isLegendary && pieceSkin.extraRingColor && !isAnimating && (
                    <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS + 8}
                      fill="none"
                      stroke={pieceSkin.extraRingColor}
                      strokeWidth={1}
                      strokeOpacity={0.4}
                    />
                  )}

                  {/* Turn glow pulse */}
                  {isTurnPiece && !isSelected && !isAnimating && (
                    <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS + 7}
                      fill="none"
                      stroke={isMyPiece ? pieceSkin.glowColor : pieceColor}
                      strokeWidth={2} strokeOpacity={0}
                      filter="url(#premiumGlow)"
                    >
                      <animate attributeName="stroke-opacity" values="0;0.8;0" dur="1.8s" repeatCount="indefinite" />
                      <animate attributeName="r" values={`${PIECE_RADIUS+5};${PIECE_RADIUS+12};${PIECE_RADIUS+5}`} dur="1.8s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Drop shadow */}
                  <circle cx={pos.x + 1.5} cy={pos.y + 2.5} r={PIECE_RADIUS} fill="rgba(0,0,0,0.55)" />

                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS + 6}
                      fill="none"
                      stroke={isMyPiece ? pieceSkin.glowColor : pieceColor}
                      strokeWidth={2.5} strokeOpacity={0.6}
                      filter="url(#premiumGlow)"
                    >
                      <animate attributeName="r" values={`${PIECE_RADIUS+4};${PIECE_RADIUS+10};${PIECE_RADIUS+4}`} dur="1.0s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.8;0.3;0.8" dur="1.0s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Movable indicator */}
                  {isMovable && !isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS + 3}
                      fill="none"
                      stroke={isMyPiece ? pieceSkin.glowColor : pieceColor}
                      strokeWidth={1.2} strokeOpacity={0.35}
                    />
                  )}

                  {/* Piece body */}
                  <circle
                    cx={pos.x} cy={pos.y} r={PIECE_RADIUS}
                    fill={isKilled ? "rgba(255,255,255,0.08)" : `url(#${gradId})`}
                    opacity={isKilled ? 0.15 : 1}
                    filter={isSelected ? "url(#premiumGlow)" : capturableEnemies.has(i) ? "url(#captureGlow)" : undefined}
                    style={{
                      transition: "opacity 0.3s",
                      transform: isSelected ? "scale(1.12)" : isLanded ? "scale(1.06)" : "scale(1)",
                      transformOrigin: `${pos.x}px ${pos.y}px`,
                    }}
                  />

                  {/* Reflection highlight */}
                  {!isKilled && (
                    <circle cx={pos.x} cy={pos.y} r={PIECE_RADIUS}
                      fill={`url(#${reflectId})`} pointerEvents="none"
                    />
                  )}
                </g>
              );
            } else {
              return (
                <g key={i}
                  onClick={() => handleNodeTap(i)}
                  onTouchEnd={(e) => { e.preventDefault(); handleNodeTap(i); }}
                  style={{ cursor: isMyTurn && isValidDest ? "pointer" : "default" }}
                >
                  <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS + HIT_EXTRA} fill="transparent" />
                  <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS}
                    fill="url(#nodeEmpty)"
                    stroke={theme.ringInner}
                    strokeWidth={1.2}
                  />
                </g>
              );
            }
          })}

          {/* ── Moving piece (animated) ── */}
          {movingPiece && animPos && (() => {
            const isMyMovingPiece = movingPiece.player === myKey;
            const movGradId  = movingPiece.player === "player1" ? p1GradId : p2GradId;
            const movRefId   = movingPiece.player === "player1" ? p1RefId  : p2RefId;
            const movColor   = movingPiece.player === "player1" ? p1Color  : p2Color;
            const movSkin    = isMyMovingPiece ? mySkin : oppSkin;
            return (
              <g pointerEvents="none">
                <circle cx={animPos.x + 1.5} cy={animPos.y + 2.5} r={PIECE_RADIUS} fill="rgba(0,0,0,0.55)" />
                <circle
                  cx={animPos.x} cy={animPos.y} r={PIECE_RADIUS + 9}
                  fill="none"
                  stroke={isMyMovingPiece ? movSkin.glowColor : movColor}
                  strokeWidth={2} strokeOpacity={0.55}
                  filter="url(#premiumGlow)"
                />
                <circle
                  cx={animPos.x} cy={animPos.y} r={PIECE_RADIUS}
                  fill={`url(#${movGradId})`}
                  filter="url(#softGlow)"
                />
                <circle
                  cx={animPos.x} cy={animPos.y} r={PIECE_RADIUS}
                  fill={`url(#${movRefId})`}
                />
                {isMyMovingPiece && movSkin.isLegendary && (
                  <circle
                    cx={animPos.x} cy={animPos.y} r={PIECE_RADIUS + 13}
                    fill="none"
                    stroke={movSkin.extraRingColor ?? movSkin.glowColor}
                    strokeWidth={1.5} strokeOpacity={0.5}
                    filter="url(#legendaryGlow)"
                  />
                )}
              </g>
            );
          })()}

        </g>

        {isMyTurn && !inCombo && movablePieces.size === 0 && (
          <text x={CX} y={CY + SVG_SIZE / 2 - 30}
            textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="12"
          >
            No moves — turn skipped
          </text>
        )}
        {inCombo && isMyTurn && (
          <text x={CX} y={28}
            textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="700" letterSpacing="2"
          >
            COMBO! Keep capturing
          </text>
        )}
      </svg>
    </div>
  );
}
