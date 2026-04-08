"use client";
import { useState, useCallback, useMemo } from "react";

/* ─── Helpers ─── */
function createGrid(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function toggleAt(grid: boolean[][], row: number, col: number, size: number): boolean[][] {
  const g = grid.map((r) => [...r]);
  const dirs = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      g[nr][nc] = !g[nr][nc];
    }
  }
  return g;
}

function generatePuzzle(size: number, presses: number): { grid: boolean[][]; solution: boolean[][] } {
  let grid = createGrid(size);
  const solution = createGrid(size);
  const used = new Set<string>();
  let count = 0;
  while (count < presses) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    const key = `${r},${c}`;
    if (used.has(key)) continue;
    used.add(key);
    grid = toggleAt(grid, r, c, size);
    solution[r][c] = true;
    count++;
  }
  return { grid, solution };
}

function isSolved(grid: boolean[][]): boolean {
  return grid.every((row) => row.every((cell) => !cell));
}

/* ─── Styles ─── */
const BG = "#0a0a1a";
const ACCENT = "#06b6d4";
const CARD = "#141428";
const BTN = "#7c3aed";
const ON_COLOR = "#06b6d4";
const OFF_COLOR = "#1e1e3a";

interface LevelConfig {
  size: number;
  presses: number;
  label: string;
}

const LEVELS: LevelConfig[] = [
  { size: 5, presses: 4, label: "1 - Easy" },
  { size: 5, presses: 6, label: "2 - Medium" },
  { size: 5, presses: 8, label: "3 - Hard" },
  { size: 5, presses: 10, label: "4 - Expert" },
  { size: 5, presses: 12, label: "5 - Master" },
  { size: 5, presses: 5, label: "6" },
  { size: 5, presses: 7, label: "7" },
  { size: 5, presses: 9, label: "8" },
  { size: 5, presses: 11, label: "9" },
  { size: 5, presses: 13, label: "10" },
];

export default function LightsOut() {
  const [level, setLevel] = useState(0);
  const [puzzleData, setPuzzleData] = useState(() => generatePuzzle(LEVELS[0].size, LEVELS[0].presses));
  const [grid, setGrid] = useState(puzzleData.grid);
  const [solution, setSolution] = useState(puzzleData.solution);
  const [moves, setMoves] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [won, setWon] = useState(false);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});

  const size = LEVELS[level].size;

  const startLevel = useCallback((lvl: number) => {
    const conf = LEVELS[lvl];
    const p = generatePuzzle(conf.size, conf.presses);
    setPuzzleData(p);
    setGrid(p.grid);
    setSolution(p.solution);
    setMoves(0);
    setShowHint(false);
    setWon(false);
    setLevel(lvl);
  }, []);

  const handleClick = useCallback(
    (r: number, c: number) => {
      if (won) return;
      const newGrid = toggleAt(grid, r, c, size);
      setGrid(newGrid);
      setMoves((m) => m + 1);
      if (isSolved(newGrid)) {
        setWon(true);
        const newMoves = moves + 1;
        setBestMoves((prev) => {
          const best = prev[level];
          if (!best || newMoves < best) return { ...prev, [level]: newMoves };
          return prev;
        });
      }
    },
    [grid, size, won, moves, level]
  );

  const litCount = useMemo(() => grid.flat().filter(Boolean).length, [grid]);

  const cellSize = Math.min(64, 320 / size);
  const gap = 4;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ textAlign: "center", fontSize: 28, color: ACCENT, marginBottom: 4 }}>Lights Out</h1>
      <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
        Click a light to toggle it and its neighbors. Turn all lights off!
      </p>

      {/* Level selector */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {LEVELS.map((l, i) => (
          <button
            key={i}
            onClick={() => startLevel(i)}
            style={{
              background: i === level ? ACCENT : CARD,
              color: i === level ? "#0a0a1a" : "#94a3b8",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: i === level ? 700 : 400,
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
        <div style={{ background: CARD, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Moves</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>{moves}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Lights On</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: litCount === 0 ? "#22c55e" : "#f59e0b" }}>{litCount}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Best</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa" }}>{bestMoves[level] ?? "—"}</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
            gap,
            background: "#0f0f23",
            padding: 8,
            borderRadius: 12,
          }}
        >
          {grid.flatMap((row, r) =>
            row.map((on, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 8,
                  border: showHint && solution[r][c] ? `2px solid #f59e0b` : "2px solid transparent",
                  background: on ? ON_COLOR : OFF_COLOR,
                  boxShadow: on ? `0 0 16px ${ON_COLOR}80` : "none",
                  cursor: won ? "default" : "pointer",
                  transition: "all 0.15s",
                  opacity: on ? 1 : 0.6,
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => setShowHint((h) => !h)}
          style={{ background: "#1e1e3a", color: "#f59e0b", border: "1px solid #f59e0b", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14 }}
        >
          {showHint ? "Hide Hint" : "Show Hint"}
        </button>
        <button
          onClick={() => startLevel(level)}
          style={{ background: BTN, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14 }}
        >
          Reset
        </button>
      </div>

      {won && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #22c55e, #06b6d4)",
              borderRadius: 12,
              padding: "16px 32px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            Solved in {moves} moves!
          </div>
          {level < LEVELS.length - 1 && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => startLevel(level + 1)}
                style={{ background: ACCENT, color: "#0a0a1a", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 16, cursor: "pointer", fontWeight: 600 }}
              >
                Next Level
              </button>
            </div>
          )}
        </div>
      )}

      {/* How to play */}
      <div style={{ maxWidth: 400, margin: "0 auto", background: CARD, borderRadius: 12, padding: 16 }}>
        <h3 style={{ color: ACCENT, marginBottom: 8, fontSize: 14 }}>How to Play</h3>
        <ul style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>Click a cell to toggle it and its 4 neighbors</li>
          <li>Turn all lights off to win</li>
          <li>Hint outlines cells that are part of the solution</li>
          <li>Try to solve in the fewest moves</li>
        </ul>
      </div>
    </div>
  );
}
