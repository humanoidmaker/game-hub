"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const SIZE = 4;
const CELL_SIZE = 80;
const GAP = 8;
const BOARD_PAD = 10;
const BOARD_SIZE = SIZE * CELL_SIZE + (SIZE + 1) * GAP + BOARD_PAD * 2 - GAP + GAP;
// simplified: SIZE * (CELL_SIZE + GAP) + GAP + 2 * BOARD_PAD - GAP ... let's just compute inline

const TILE_COLORS: Record<number, string> = {
  2: "#eee4da",
  4: "#ede0c8",
  8: "#f2b179",
  16: "#f59563",
  32: "#f67c5f",
  64: "#f65e3b",
  128: "#edcf72",
  256: "#edcc61",
  512: "#edc850",
  1024: "#edc53f",
  2048: "#edc22e",
  4096: "#b784db",
  8192: "#9b59b6",
  16384: "#8e44ad",
  32768: "#6c3483",
  65536: "#4a235a",
};

const TEXT_COLORS: Record<number, string> = {
  2: "#776e65",
  4: "#776e65",
};

function getTileColor(v: number): string {
  if (v === 0) return "transparent";
  return TILE_COLORS[v] || "#5b2c8e";
}

function getTextColor(v: number): string {
  return TEXT_COLORS[v] || "#f9f6f2";
}

function getFontSize(v: number): number {
  if (v < 100) return 32;
  if (v < 1000) return 26;
  if (v < 10000) return 20;
  return 16;
}

// ---- Tile ID tracking for animations ----
interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  prevRow?: number;
  prevCol?: number;
  mergedFrom?: boolean;
  isNew?: boolean;
}

let nextTileId = 1;
function genId() {
  return nextTileId++;
}

// ---- Grid helpers ----
type Grid = (Tile | null)[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneGrid(g: Grid): Grid {
  return g.map((r) => r.map((t) => (t ? { ...t } : null)));
}

function getEmptyCells(g: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (!g[r][c]) cells.push([r, c]);
  return cells;
}

function addRandomTile(g: Grid): Grid {
  const empty = getEmptyCells(g);
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const ng = cloneGrid(g);
  ng[r][c] = {
    id: genId(),
    value: Math.random() < 0.9 ? 2 : 4,
    row: r,
    col: c,
    isNew: true,
  };
  return ng;
}

function initGrid(): Grid {
  let g = emptyGrid();
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
}

function gridValues(g: Grid): number[][] {
  return g.map((r) => r.map((t) => (t ? t.value : 0)));
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const av = a[r][c]?.value || 0;
      const bv = b[r][c]?.value || 0;
      if (av !== bv) return false;
    }
  return true;
}

// ---- Slide logic with tile tracking ----
interface SlideResult {
  grid: Grid;
  score: number;
  moved: boolean;
  tiles: Tile[]; // all tiles with position info for animation
}

function slideRow(tiles: (Tile | null)[]): {
  row: (Tile | null)[];
  score: number;
  resultTiles: Tile[];
} {
  const filtered = tiles.filter((t) => t !== null) as Tile[];
  const result: (Tile | null)[] = Array(SIZE).fill(null);
  const resultTiles: Tile[] = [];
  let score = 0;
  let pos = 0;
  let i = 0;

  while (i < filtered.length) {
    if (
      i + 1 < filtered.length &&
      filtered[i].value === filtered[i + 1].value
    ) {
      const newVal = filtered[i].value * 2;
      score += newVal;
      const merged: Tile = {
        id: genId(),
        value: newVal,
        row: 0,
        col: pos,
        mergedFrom: true,
      };
      // Track old positions for the two merging tiles
      const moving1: Tile = { ...filtered[i] };
      const moving2: Tile = { ...filtered[i + 1] };
      resultTiles.push(moving1, moving2);
      result[pos] = merged;
      resultTiles.push(merged);
      pos++;
      i += 2;
    } else {
      const t: Tile = { ...filtered[i], col: pos };
      result[pos] = t;
      resultTiles.push(t);
      pos++;
      i++;
    }
  }

  return { row: result, score, resultTiles };
}

function moveGrid(
  grid: Grid,
  dir: "left" | "right" | "up" | "down"
): SlideResult {
  const ng = emptyGrid();
  let totalScore = 0;
  const allTiles: Tile[] = [];

  if (dir === "left" || dir === "right") {
    for (let r = 0; r < SIZE; r++) {
      let row = grid[r].map((t) =>
        t ? { ...t, prevRow: t.row, prevCol: t.col } : null
      );
      if (dir === "right") row = [...row].reverse();
      const res = slideRow(row);
      let resultRow = res.row;
      if (dir === "right") resultRow = [...resultRow].reverse();
      for (let c = 0; c < SIZE; c++) {
        if (resultRow[c]) {
          const finalCol = c;
          resultRow[c]!.row = r;
          resultRow[c]!.col = finalCol;
        }
        ng[r][c] = resultRow[c];
      }
      totalScore += res.score;
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      let col = Array.from({ length: SIZE }, (_, r) =>
        grid[r][c] ? { ...grid[r][c]!, prevRow: grid[r][c]!.row, prevCol: grid[r][c]!.col } : null
      );
      if (dir === "down") col = [...col].reverse();
      const res = slideRow(col);
      let resultCol = res.row;
      if (dir === "down") resultCol = [...resultCol].reverse();
      for (let r = 0; r < SIZE; r++) {
        if (resultCol[r]) {
          resultCol[r]!.row = r;
          resultCol[r]!.col = c;
        }
        ng[r][c] = resultCol[r];
      }
      totalScore += res.score;
    }
  }

  const moved = !gridsEqual(grid, ng);
  return { grid: ng, score: totalScore, moved, tiles: allTiles };
}

function canMove(g: Grid): boolean {
  for (const d of ["left", "right", "up", "down"] as const) {
    if (moveGrid(g, d).moved) return true;
  }
  return false;
}

function hasWon(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) if (g[r][c] && g[r][c]!.value >= 2048) return true;
  return false;
}

// ---- Snapshot for undo ----
interface Snapshot {
  grid: Grid;
  score: number;
}

function takeSnapshot(grid: Grid, score: number): Snapshot {
  return {
    grid: cloneGrid(grid),
    score,
  };
}

// ---- Component ----
export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => initGrid());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [prevState, setPrevState] = useState<Snapshot | null>(null);
  const [animKey, setAnimKey] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Load best score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("game2048_best");
      if (saved) setBest(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // Save best score
  useEffect(() => {
    try {
      localStorage.setItem("game2048_best", String(best));
    } catch {}
  }, [best]);

  const doMove = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      if (gameOver) return;
      if (won && !keepPlaying) return;

      const result = moveGrid(grid, dir);
      if (!result.moved) return;

      // Save undo state
      setPrevState(takeSnapshot(grid, score));

      const newGrid = addRandomTile(result.grid);
      const newScore = score + result.score;

      // Clear isNew and mergedFrom flags from old tiles, set on new
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          const t = newGrid[r][c];
          if (t && !t.isNew && !t.mergedFrom) {
            t.isNew = false;
            t.mergedFrom = false;
          }
        }

      setGrid(newGrid);
      setScore(newScore);
      setBest((b) => Math.max(b, newScore));
      setAnimKey((k) => k + 1);

      if (!canMove(newGrid)) {
        setGameOver(true);
      }

      if (!won && !keepPlaying && hasWon(newGrid)) {
        setWon(true);
      }
    },
    [grid, score, gameOver, won, keepPlaying]
  );

  // Keyboard handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  // Touch / swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const minSwipe = 30;

      if (Math.max(absDx, absDy) < minSwipe) return;

      if (absDx > absDy) {
        doMove(dx > 0 ? "right" : "left");
      } else {
        doMove(dy > 0 ? "down" : "up");
      }
      touchStart.current = null;
    },
    [doMove]
  );

  const handleNewGame = () => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    setPrevState(null);
    setAnimKey((k) => k + 1);
  };

  const handleUndo = () => {
    if (!prevState) return;
    setGrid(prevState.grid);
    setScore(prevState.score);
    setGameOver(false);
    if (won && !hasWon(prevState.grid)) {
      setWon(false);
    }
    setPrevState(null);
    setAnimKey((k) => k + 1);
  };

  const handleContinue = () => {
    setKeepPlaying(true);
  };

  // Flatten tiles for rendering
  const tiles: Tile[] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const t = grid[r][c];
      if (t) tiles.push(t);
    }

  const boardPixels = BOARD_PAD * 2 + SIZE * CELL_SIZE + (SIZE - 1) * GAP;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Segoe UI', Arial, sans-serif",
        userSelect: "none",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: boardPixels,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#edc22e",
            letterSpacing: -1,
          }}
        >
          2048
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              background: "#1e1e3a",
              borderRadius: 8,
              padding: "8px 16px",
              textAlign: "center",
              minWidth: 70,
            }}
          >
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>
              Score
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{score}</div>
          </div>
          <div
            style={{
              background: "#1e1e3a",
              borderRadius: 8,
              padding: "8px 16px",
              textAlign: "center",
              minWidth: 70,
            }}
          >
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>
              Best
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#eab308" }}>{best}</div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          width: boardPixels,
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={handleUndo}
          disabled={!prevState}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: prevState ? "#6366f1" : "#2a2a4a",
            color: prevState ? "#fff" : "#555",
            fontWeight: 600,
            fontSize: 14,
            cursor: prevState ? "pointer" : "default",
            transition: "background 0.2s",
          }}
        >
          Undo
        </button>
        <button
          onClick={handleNewGame}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: "#10b981",
            color: "#000",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          New Game
        </button>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "relative",
          width: boardPixels,
          height: boardPixels,
          background: "#1a1a2e",
          borderRadius: 12,
          padding: BOARD_PAD,
          boxSizing: "border-box",
          touchAction: "none",
        }}
      >
        {/* Background cells */}
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          return (
            <div
              key={`cell-${r}-${c}`}
              style={{
                position: "absolute",
                left: BOARD_PAD + c * (CELL_SIZE + GAP),
                top: BOARD_PAD + r * (CELL_SIZE + GAP),
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: 8,
                background: "#2a2a40",
              }}
            />
          );
        })}

        {/* Tiles */}
        {tiles.map((tile) => {
          const left = BOARD_PAD + tile.col * (CELL_SIZE + GAP);
          const top = BOARD_PAD + tile.row * (CELL_SIZE + GAP);

          const animName = tile.isNew
            ? "tile-appear"
            : tile.mergedFrom
            ? "tile-merge"
            : undefined;

          return (
            <div
              key={tile.id}
              style={{
                position: "absolute",
                left,
                top,
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: getTileColor(tile.value),
                color: getTextColor(tile.value),
                fontSize: getFontSize(tile.value),
                fontWeight: 700,
                transition: "left 0.12s ease, top 0.12s ease",
                animation: animName
                  ? `${animName} 0.2s ease forwards`
                  : undefined,
                zIndex: tile.mergedFrom ? 2 : 1,
                boxShadow:
                  tile.value >= 128
                    ? `0 0 20px 4px ${getTileColor(tile.value)}55`
                    : undefined,
              }}
            >
              {tile.value}
            </div>
          );
        })}

        {/* Game Over overlay */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              background: "rgba(10, 10, 26, 0.75)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: "#ef4444", marginBottom: 12 }}>
              Game Over!
            </div>
            <div style={{ fontSize: 16, color: "#aaa", marginBottom: 16 }}>
              Final score: {score}
            </div>
            <button
              onClick={handleNewGame}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "#10b981",
                color: "#000",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Win overlay */}
        {won && !keepPlaying && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              background: "rgba(10, 10, 26, 0.75)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 32, fontWeight: 800, color: "#edc22e", marginBottom: 12 }}>
              You Win!
            </div>
            <div style={{ fontSize: 16, color: "#aaa", marginBottom: 16 }}>
              You reached 2048!
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleContinue}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "#6366f1",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Keep Playing
              </button>
              <button
                onClick={handleNewGame}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "#10b981",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                New Game
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: 16, color: "#555", fontSize: 13, textAlign: "center" }}>
        Use arrow keys or swipe to move tiles. Combine matching tiles to reach 2048!
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes tile-appear {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tile-merge {
          0% { transform: scale(1); }
          40% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
