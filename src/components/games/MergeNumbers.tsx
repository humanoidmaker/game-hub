"use client";
import { useState, useCallback, useEffect } from "react";

/* ─── Constants ─── */
const SIZE = 5;
const BG = "#0a0a1a";
const ACCENT = "#f59e0b";
const CARD = "#141428";
const BTN = "#7c3aed";

const TILE_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#06b6d4",
  3: "#22c55e",
  4: "#f59e0b",
  5: "#ef4444",
  6: "#a855f7",
  7: "#ec4899",
  8: "#f97316",
  9: "#14b8a6",
  10: "#6366f1",
};

type Grid = (number | null)[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneGrid(g: Grid): Grid {
  return g.map((r) => [...r]);
}

function hasMerges(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = g[r][c];
      if (v === null) return true;
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && g[nr][nc] === v) return true;
      }
    }
  }
  return false;
}

function processChainMerges(g: Grid): { grid: Grid; points: number } {
  let totalPoints = 0;
  let merged = true;

  while (merged) {
    merged = false;
    const used = new Set<string>();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (g[r][c] === null || used.has(`${r},${c}`)) continue;
        const val = g[r][c]!;
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < SIZE &&
            nc >= 0 &&
            nc < SIZE &&
            g[nr][nc] === val &&
            !used.has(`${nr},${nc}`)
          ) {
            g[r][c] = val + 1;
            g[nr][nc] = null;
            used.add(`${r},${c}`);
            used.add(`${nr},${nc}`);
            totalPoints += (val + 1) * 10;
            merged = true;
            break;
          }
        }
      }
    }

    // Gravity: drop tiles down
    for (let c = 0; c < SIZE; c++) {
      let write = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        if (g[r][c] !== null) {
          if (r !== write) {
            g[write][c] = g[r][c];
            g[r][c] = null;
          }
          write--;
        }
      }
    }
  }

  return { grid: g, points: totalPoints };
}

export default function MergeNumbers() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [nextTile, setNextTile] = useState(Math.ceil(Math.random() * 5));
  const [lastPlaced, setLastPlaced] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mergenumbers_high");
      if (saved) setHighScore(Number(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const dropTile = useCallback(
    (col: number) => {
      if (gameOver) return;
      const g = cloneGrid(grid);

      // Find lowest empty row
      let targetRow = -1;
      for (let r = SIZE - 1; r >= 0; r--) {
        if (g[r][col] === null) {
          targetRow = r;
          break;
        }
      }
      if (targetRow === -1) return;

      g[targetRow][col] = nextTile;
      setLastPlaced(`${targetRow}-${col}`);

      const { grid: merged, points } = processChainMerges(g);
      const newScore = score + points + 5;
      setGrid(merged);
      setScore(newScore);

      if (newScore > highScore) {
        setHighScore(newScore);
        try {
          localStorage.setItem("mergenumbers_high", String(newScore));
        } catch {
          /* ignore */
        }
      }

      setNextTile(Math.ceil(Math.random() * 5));

      if (!hasMerges(merged)) {
        setGameOver(true);
      }
    },
    [grid, nextTile, score, highScore, gameOver]
  );

  const resetGame = () => {
    setGrid(emptyGrid());
    setScore(0);
    setGameOver(false);
    setNextTile(Math.ceil(Math.random() * 5));
    setLastPlaced(null);
  };

  const cellSize = 64;
  const gap = 6;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ textAlign: "center", fontSize: 28, color: ACCENT, marginBottom: 4 }}>Merge Numbers</h1>
      <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
        Drop tiles. Match adjacent numbers to merge them up!
      </p>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
        <div style={{ background: CARD, borderRadius: 10, padding: "8px 20px", textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>Score</div>
          <div style={{ color: ACCENT, fontSize: 24, fontWeight: 700 }}>{score}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 10, padding: "8px 20px", textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>High Score</div>
          <div style={{ color: "#a78bfa", fontSize: 24, fontWeight: 700 }}>{highScore}</div>
        </div>
        <div style={{ background: CARD, borderRadius: 10, padding: "8px 20px", textAlign: "center" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>Next</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: TILE_COLORS[nextTile] || "#fff" }}>
            {nextTile}
          </div>
        </div>
      </div>

      {/* Column drop buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap, marginBottom: 4 }}>
        {Array.from({ length: SIZE }, (_, c) => (
          <button
            key={c}
            onClick={() => dropTile(c)}
            style={{
              width: cellSize,
              height: 32,
              background: "transparent",
              border: `2px solid ${ACCENT}40`,
              borderRadius: 6,
              color: ACCENT,
              cursor: gameOver ? "default" : "pointer",
              fontSize: 18,
              transition: "all 0.15s",
            }}
          >
            {"\u25BC"}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, ${cellSize}px)`,
            gap,
            background: "#0f0f23",
            padding: 8,
            borderRadius: 12,
          }}
        >
          {grid.flatMap((row, r) =>
            row.map((val, c) => {
              const isLast = lastPlaced === `${r}-${c}`;
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => dropTile(c)}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 10,
                    background: val !== null ? TILE_COLORS[val] || "#6366f1" : "#1a1a2e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: val !== null ? 28 : 0,
                    fontWeight: 800,
                    color: "#fff",
                    cursor: gameOver ? "default" : "pointer",
                    transition: "all 0.2s",
                    transform: isLast ? "scale(1.08)" : "scale(1)",
                    boxShadow:
                      val !== null ? `0 0 12px ${TILE_COLORS[val] || "#6366f1"}50` : "none",
                  }}
                >
                  {val}
                </div>
              );
            })
          )}
        </div>
      </div>

      {gameOver && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              display: "inline-block",
              background: "#1e1e3a",
              borderRadius: 12,
              padding: "16px 32px",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
              Game Over!
            </div>
            <div style={{ color: "#94a3b8" }}>
              Final Score: <span style={{ color: ACCENT, fontWeight: 700 }}>{score}</span>
            </div>
          </div>
          <br />
          <button
            onClick={resetGame}
            style={{
              background: BTN,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Play Again
          </button>
        </div>
      )}

      <div style={{ maxWidth: 380, margin: "0 auto", background: CARD, borderRadius: 12, padding: 16 }}>
        <h3 style={{ color: ACCENT, marginBottom: 8, fontSize: 14 }}>How to Play</h3>
        <ul style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8, paddingLeft: 16 }}>
          <li>Click a column arrow to drop the next tile</li>
          <li>Adjacent matching numbers merge into the next number</li>
          <li>Chain merges score more points</li>
          <li>Game ends when the grid is full with no merges</li>
        </ul>
      </div>
    </div>
  );
}
