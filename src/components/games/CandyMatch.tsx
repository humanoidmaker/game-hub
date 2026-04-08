"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ─── constants ─── */
const SIZE = 8;
const CELL = 48;
const GAP = 2;
const CANDY_COUNT = 6;
const MOVES_PER_LEVEL = 30;
const BASE_TARGET = 300;
const TARGET_STEP = 200;

const COLORS = [
  { fill: "#e53e3e", hi: "#fc8181", label: "Red" },
  { fill: "#ecc94b", hi: "#fefcbf", label: "Yellow" },
  { fill: "#38a169", hi: "#9ae6b4", label: "Green" },
  { fill: "#3182ce", hi: "#90cdf4", label: "Blue" },
  { fill: "#805ad5", hi: "#d6bcfa", label: "Purple" },
  { fill: "#ed8936", hi: "#fbd38d", label: "Orange" },
];

const enum Special {
  None = 0,
  StripedH = 1,
  StripedV = 2,
  Rainbow = 3,
}

interface Candy {
  color: number;
  special: Special;
}

/* ─── sound helpers ─── */
function playTone(freq: number, dur: number, vol = 0.12, type: OscillatorType = "sine") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}
function sndPop() { playTone(660, 0.1, 0.1, "square"); }
function sndChain() { playTone(880, 0.15, 0.12, "triangle"); }
function sndLevelUp() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 0.15, "sine"), i * 100));
}

/* ─── board helpers ─── */
function rndColor(): number { return Math.floor(Math.random() * CANDY_COUNT); }

function makeCandy(color?: number): Candy {
  return { color: color ?? rndColor(), special: Special.None };
}

function makeBoard(): Candy[][] {
  const b: Candy[][] = [];
  for (let r = 0; r < SIZE; r++) {
    b[r] = [];
    for (let c = 0; c < SIZE; c++) {
      let col: number;
      do {
        col = rndColor();
      } while (
        (c >= 2 && b[r][c - 1].color === col && b[r][c - 2].color === col) ||
        (r >= 2 && b[r - 1][c].color === col && b[r - 2][c].color === col)
      );
      b[r][c] = makeCandy(col);
    }
  }
  return b;
}

function clone(board: Candy[][]): Candy[][] {
  return board.map((row) => row.map((c) => ({ ...c })));
}

/* find all matched positions and the groups they belong to */
interface MatchGroup {
  cells: [number, number][];
  horizontal: boolean;
}

function findMatchGroups(board: Candy[][]): MatchGroup[] {
  const groups: MatchGroup[] = [];
  // horizontal
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      let end = c + 1;
      while (end < SIZE && board[r][end].color === board[r][c].color) end++;
      const len = end - c;
      if (len >= 3) {
        const cells: [number, number][] = [];
        for (let i = c; i < end; i++) cells.push([r, i]);
        groups.push({ cells, horizontal: true });
      }
      c = end;
    }
  }
  // vertical
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      let end = r + 1;
      while (end < SIZE && board[end][c].color === board[r][c].color) end++;
      const len = end - r;
      if (len >= 3) {
        const cells: [number, number][] = [];
        for (let i = r; i < end; i++) cells.push([i, c]);
        groups.push({ cells, horizontal: false });
      }
      r = end;
    }
  }
  return groups;
}

function allMatchedCells(groups: MatchGroup[]): Set<string> {
  const s = new Set<string>();
  for (const g of groups) for (const [r, c] of g.cells) s.add(`${r},${c}`);
  return s;
}

/* Process specials: determine which cells a special candy clears */
function activateSpecials(board: Candy[][], matched: Set<string>): Set<string> {
  const extra = new Set<string>();
  for (const key of matched) {
    const [r, c] = key.split(",").map(Number);
    const candy = board[r][c];
    if (candy.special === Special.StripedH) {
      for (let cc = 0; cc < SIZE; cc++) extra.add(`${r},${cc}`);
    } else if (candy.special === Special.StripedV) {
      for (let rr = 0; rr < SIZE; rr++) extra.add(`${rr},${c}`);
    } else if (candy.special === Special.Rainbow) {
      const targetColor = candy.color;
      for (let rr = 0; rr < SIZE; rr++)
        for (let cc = 0; cc < SIZE; cc++)
          if (board[rr][cc].color === targetColor) extra.add(`${rr},${cc}`);
    }
  }
  return new Set([...matched, ...extra]);
}

/* Assign specials to the swap position based on match length */
function assignSpecials(
  board: Candy[][],
  groups: MatchGroup[],
  swapPos: [number, number] | null
): void {
  for (const g of groups) {
    if (g.cells.length === 4) {
      // Striped candy at swap position or last cell
      const target = swapPos && g.cells.some(([r, c]) => r === swapPos[0] && c === swapPos[1])
        ? swapPos
        : g.cells[1];
      board[target[0]][target[1]].special = g.horizontal ? Special.StripedH : Special.StripedV;
    } else if (g.cells.length >= 5) {
      // Rainbow candy
      const target = swapPos && g.cells.some(([r, c]) => r === swapPos[0] && c === swapPos[1])
        ? swapPos
        : g.cells[2];
      board[target[0]][target[1]].special = Special.Rainbow;
    }
  }
}

/* Remove matched cells and drop; return new board and count removed */
function removeAndDrop(
  board: Candy[][],
  toClear: Set<string>,
  groups: MatchGroup[],
  swapPos: [number, number] | null
): [Candy[][], number] {
  const nb = clone(board);

  // First assign specials before clearing
  assignSpecials(nb, groups, swapPos);

  // Determine which cells are actually removed (not the special-receiving cell for match-4/5)
  const specialTargets = new Set<string>();
  for (const g of groups) {
    if (g.cells.length >= 4) {
      const target = swapPos && g.cells.some(([r, c]) => r === swapPos[0] && c === swapPos[1])
        ? swapPos
        : g.cells.length >= 5 ? g.cells[2] : g.cells[1];
      specialTargets.add(`${target[0]},${target[1]}`);
    }
  }

  let removed = 0;
  for (const key of toClear) {
    if (specialTargets.has(key)) continue;
    const [r, c] = key.split(",").map(Number);
    nb[r][c] = { color: -1, special: Special.None };
    removed++;
  }

  // Drop
  for (let c = 0; c < SIZE; c++) {
    let writeRow = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      if (nb[r][c].color !== -1) {
        if (r !== writeRow) {
          nb[writeRow][c] = nb[r][c];
          nb[r][c] = { color: -1, special: Special.None };
        }
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      nb[r][c] = makeCandy();
    }
  }
  return [nb, removed];
}

/* ─── component ─── */
export default function CandyMatch() {
  const [board, setBoard] = useState<Candy[][]>(() => makeBoard());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MOVES_PER_LEVEL);
  const [level, setLevel] = useState(1);
  const [message, setMessage] = useState("");
  const [popping, setPopping] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target = BASE_TARGET + (level - 1) * TARGET_STEP;

  /* Ensure initial board has no matches */
  useEffect(() => {
    let b = makeBoard();
    let groups = findMatchGroups(b);
    while (groups.length > 0) {
      b = makeBoard();
      groups = findMatchGroups(b);
    }
    setBoard(b);
  }, []);

  /* Check level completion / game over */
  useEffect(() => {
    if (levelComplete || gameOver) return;
    if (score >= target) {
      setLevelComplete(true);
      sndLevelUp();
      setMessage(`Level ${level} complete!`);
    } else if (moves <= 0) {
      setGameOver(true);
      setMessage(`Game Over! Final score: ${score}`);
    }
  }, [score, moves, target, level, levelComplete, gameOver]);

  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    let b = makeBoard();
    let groups = findMatchGroups(b);
    while (groups.length > 0) {
      b = makeBoard();
      groups = findMatchGroups(b);
    }
    setBoard(b);
    setMoves(MOVES_PER_LEVEL);
    setLevel(newLevel);
    setScore(0);
    setSelected(null);
    setLevelComplete(false);
    setMessage("");
    setPopping(new Set());
  }, [level]);

  const restart = useCallback(() => {
    let b = makeBoard();
    let groups = findMatchGroups(b);
    while (groups.length > 0) {
      b = makeBoard();
      groups = findMatchGroups(b);
    }
    setBoard(b);
    setMoves(MOVES_PER_LEVEL);
    setLevel(1);
    setScore(0);
    setSelected(null);
    setGameOver(false);
    setLevelComplete(false);
    setMessage("");
    setPopping(new Set());
  }, []);

  /* Core swap + cascade logic */
  const doSwap = useCallback(
    (r1: number, c1: number, r2: number, c2: number) => {
      if (moves <= 0 || levelComplete || gameOver) return;

      const nb = clone(board);
      const tmp = nb[r1][c1];
      nb[r1][c1] = nb[r2][c2];
      nb[r2][c2] = tmp;

      const groups = findMatchGroups(nb);
      if (groups.length === 0) {
        setSelected(null);
        return;
      }

      sndPop();
      const matched = allMatchedCells(groups);
      const toClear = activateSpecials(nb, matched);
      setPopping(toClear);

      // Apply after short animation delay
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const [dropped, removed] = removeAndDrop(nb, toClear, groups, [r2, c2]);
        let totalScore = removed * 10;
        let currentBoard = dropped;
        let chainCount = 0;

        // Cascade
        const cascade = () => {
          const nextGroups = findMatchGroups(currentBoard);
          if (nextGroups.length === 0) {
            setBoard(currentBoard);
            setScore((s) => s + totalScore);
            setMoves((m) => m - 1);
            setSelected(null);
            setPopping(new Set());
            return;
          }
          chainCount++;
          sndChain();
          const nextMatched = allMatchedCells(nextGroups);
          const nextClear = activateSpecials(currentBoard, nextMatched);
          setBoard(currentBoard);
          setPopping(nextClear);

          setTimeout(() => {
            const [nextDropped, nextRemoved] = removeAndDrop(
              currentBoard,
              nextClear,
              nextGroups,
              null
            );
            totalScore += nextRemoved * 10 + chainCount * 20;
            currentBoard = nextDropped;
            cascade();
          }, 200);
        };

        cascade();
      }, 200);
    },
    [board, moves, levelComplete, gameOver]
  );

  const handleClick = (r: number, c: number) => {
    if (moves <= 0 || levelComplete || gameOver) return;
    if (selected) {
      const [sr, sc] = selected;
      if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
        doSwap(sr, sc, r, c);
      } else {
        setSelected([r, c]);
      }
    } else {
      setSelected([r, c]);
    }
  };

  /* ─── render candy ─── */
  const renderCandy = (candy: Candy, r: number, c: number) => {
    const col = COLORS[candy.color] || COLORS[0];
    const isSel = selected?.[0] === r && selected?.[1] === c;
    const isPop = popping.has(`${r},${c}`);
    const sz = CELL - 10;

    let decoration: React.ReactNode = null;
    if (candy.special === Special.StripedH) {
      decoration = (
        <>
          <line x1="6" y1={sz / 2 - 4} x2={sz - 6} y2={sz / 2 - 4} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <line x1="6" y1={sz / 2} x2={sz - 6} y2={sz / 2} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <line x1="6" y1={sz / 2 + 4} x2={sz - 6} y2={sz / 2 + 4} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        </>
      );
    } else if (candy.special === Special.StripedV) {
      decoration = (
        <>
          <line x1={sz / 2 - 4} y1="6" x2={sz / 2 - 4} y2={sz - 6} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <line x1={sz / 2} y1="6" x2={sz / 2} y2={sz - 6} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <line x1={sz / 2 + 4} y1="6" x2={sz / 2 + 4} y2={sz - 6} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        </>
      );
    } else if (candy.special === Special.Rainbow) {
      decoration = (
        <text
          x={sz / 2}
          y={sz / 2 + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="16"
          fill="white"
          fontWeight="bold"
        >
          ★
        </text>
      );
    }

    return (
      <div
        key={`${r},${c}`}
        onClick={() => handleClick(r, c)}
        style={{
          width: CELL,
          height: CELL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isSel ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
          border: isSel ? "2px solid #fff" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.15s ease",
          transform: isPop ? "scale(0)" : "scale(1)",
          opacity: isPop ? 0 : 1,
        }}
      >
        <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
          <defs>
            <radialGradient id={`cg-${candy.color}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={col.hi} />
              <stop offset="100%" stopColor={col.fill} />
            </radialGradient>
          </defs>
          <circle cx={sz / 2} cy={sz / 2} r={sz / 2 - 2} fill={`url(#cg-${candy.color})`} />
          <circle cx={sz * 0.36} cy={sz * 0.33} r={sz * 0.1} fill="rgba(255,255,255,0.45)" />
          {decoration}
        </svg>
      </div>
    );
  };

  const progressPct = Math.min(100, Math.round((score / target) * 100));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: "#0f0f17",
        minHeight: "100%",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "#e2e8f0",
        userSelect: "none",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 12,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        <span style={{ color: "#a78bfa" }}>Level {level}</span>
        <span style={{ color: "#fbbf24" }}>Score: {score}</span>
        <span style={{ color: moves <= 5 ? "#f87171" : "#94a3b8" }}>
          Moves: {moves}
        </span>
      </div>

      {/* target bar */}
      <div
        style={{
          width: SIZE * (CELL + GAP),
          height: 10,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 5,
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            background: progressPct >= 100
              ? "linear-gradient(90deg, #34d399, #6ee7b7)"
              : "linear-gradient(90deg, #7c3aed, #a78bfa)",
            borderRadius: 5,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
        Target: {target} pts
      </div>

      {/* message */}
      {message && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 20px",
            borderRadius: 8,
            background: levelComplete
              ? "rgba(52,211,153,0.15)"
              : "rgba(248,113,113,0.15)",
            color: levelComplete ? "#6ee7b7" : "#fca5a5",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {message}
        </div>
      )}

      {/* grid */}
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`,
          gap: GAP,
          padding: 6,
          borderRadius: 12,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {board.map((row, r) => row.map((candy, c) => renderCandy(candy, r, c)))}
      </div>

      {/* buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {levelComplete && (
          <button
            onClick={nextLevel}
            style={{
              padding: "10px 28px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            Next Level
          </button>
        )}
        <button
          onClick={restart}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#e2e8f0",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {gameOver ? "Play Again" : "Restart"}
        </button>
      </div>

      {/* legend */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "#64748b",
        }}
      >
        <span>▬ Striped: clears row/col</span>
        <span>★ Rainbow: clears all of one color</span>
      </div>
    </div>
  );
}
