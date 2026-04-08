"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const SIZE = 12;
const WORDS = [
  "REACT",
  "PYTHON",
  "JAVASCRIPT",
  "DATABASE",
  "SERVER",
  "BROWSER",
  "CODING",
  "GITHUB",
  "DEPLOY",
  "DOCKER",
];

type Direction = [number, number];
const DIRECTIONS: Direction[] = [
  [0, 1],   // horizontal right
  [1, 0],   // vertical down
  [0, -1],  // horizontal left
  [-1, 0],  // vertical up
  [1, 1],   // diagonal down-right
  [-1, -1], // diagonal up-left
  [1, -1],  // diagonal down-left
  [-1, 1],  // diagonal up-right
];

interface PlacedWord {
  word: string;
  cells: [number, number][];
}

interface GridData {
  grid: string[][];
  placed: PlacedWord[];
}

function generateGrid(): GridData {
  const grid: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
  const placed: PlacedWord[] = [];

  const shuffledWords = [...WORDS].sort(() => Math.random() - 0.5);

  for (const word of shuffledWords) {
    let ok = false;
    for (let attempt = 0; attempt < 200 && !ok; attempt++) {
      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const [dr, dc] = dir;

      const maxR = dr === 0 ? SIZE - 1 : dr > 0 ? SIZE - word.length : word.length - 1;
      const minR = dr === 0 ? 0 : dr > 0 ? 0 : word.length - 1;
      const maxC = dc === 0 ? SIZE - 1 : dc > 0 ? SIZE - word.length : word.length - 1;
      const minC = dc === 0 ? 0 : dc > 0 ? 0 : word.length - 1;

      if (minR > maxR || minC > maxC) continue;

      const r = minR + Math.floor(Math.random() * (maxR - minR + 1));
      const c = minC + Math.floor(Math.random() * (maxC - minC + 1));

      const cells: [number, number][] = [];
      let canPlace = true;

      for (let i = 0; i < word.length; i++) {
        const cr = r + dr * i;
        const cc = c + dc * i;
        if (cr < 0 || cr >= SIZE || cc < 0 || cc >= SIZE) { canPlace = false; break; }
        if (grid[cr][cc] !== "" && grid[cr][cc] !== word[i]) { canPlace = false; break; }
        cells.push([cr, cc]);
      }

      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          grid[cells[i][0]][cells[i][1]] = word[i];
        }
        placed.push({ word, cells });
        ok = true;
      }
    }
  }

  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = alpha[Math.floor(Math.random() * 26)];
    }
  }

  return { grid, placed };
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function getCellsBetween(
  startR: number,
  startC: number,
  endR: number,
  endC: number
): [number, number][] | null {
  const dr = endR - startR;
  const dc = endC - startC;

  if (dr === 0 && dc === 0) return [[startR, startC]];

  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  // Must be horizontal, vertical, or diagonal (45 degrees)
  if (dr !== 0 && dc !== 0 && absDr !== absDc) return null;

  const steps = Math.max(absDr, absDc);
  const stepR = dr === 0 ? 0 : dr / absDr;
  const stepC = dc === 0 ? 0 : dc / absDc;

  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push([startR + stepR * i, startC + stepC * i]);
  }
  return cells;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function Crossword() {
  const [gameData, setGameData] = useState<GridData | null>(null);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [dragEnd, setDragEnd] = useState<[number, number] | null>(null);
  const [timer, setTimer] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [hintCell, setHintCell] = useState<string | null>(null);
  const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize game on mount
  useEffect(() => {
    setGameData(generateGrid());
  }, []);

  // Timer
  useEffect(() => {
    if (gameWon || !gameData) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameWon, gameData]);

  const newGame = useCallback(() => {
    setGameData(generateGrid());
    setFound(new Set());
    setDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setTimer(0);
    setGameWon(false);
    setHintCell(null);
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
  }, []);

  const selectedCells = useCallback((): Set<string> => {
    if (!dragStart || !dragEnd) return new Set();
    const cells = getCellsBetween(dragStart[0], dragStart[1], dragEnd[0], dragEnd[1]);
    if (!cells) return new Set();
    return new Set(cells.map(([r, c]) => cellKey(r, c)));
  }, [dragStart, dragEnd]);

  const handleMouseDown = (r: number, c: number) => {
    if (gameWon) return;
    setDragging(true);
    setDragStart([r, c]);
    setDragEnd([r, c]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!dragging || gameWon) return;
    setDragEnd([r, c]);
  };

  const handleMouseUp = useCallback(() => {
    if (!dragging || !dragStart || !dragEnd || !gameData) {
      setDragging(false);
      return;
    }

    const cells = getCellsBetween(dragStart[0], dragStart[1], dragEnd[0], dragEnd[1]);
    if (cells && cells.length > 1) {
      const selectedWord = cells.map(([r, c]) => gameData.grid[r][c]).join("");
      const reversedWord = [...selectedWord].reverse().join("");

      for (const p of gameData.placed) {
        if (found.has(p.word)) continue;
        if (selectedWord === p.word || reversedWord === p.word) {
          const newFound = new Set(found);
          newFound.add(p.word);
          setFound(newFound);
          if (newFound.size === gameData.placed.length) {
            setGameWon(true);
          }
          break;
        }
      }
    }

    setDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [dragging, dragStart, dragEnd, gameData, found]);

  const handleHint = () => {
    if (!gameData || gameWon) return;
    const unfound = gameData.placed.filter((p) => !found.has(p.word));
    if (unfound.length === 0) return;
    const pick = unfound[Math.floor(Math.random() * unfound.length)];
    const [r, c] = pick.cells[0];
    const key = cellKey(r, c);
    setHintCell(key);
    if (hintTimeout.current) clearTimeout(hintTimeout.current);
    hintTimeout.current = setTimeout(() => setHintCell(null), 1500);
  };

  // Build found cells set
  const foundCells = new Set<string>();
  if (gameData) {
    for (const p of gameData.placed) {
      if (found.has(p.word)) {
        for (const [r, c] of p.cells) foundCells.add(cellKey(r, c));
      }
    }
  }

  const currentSelection = selectedCells();

  if (!gameData) return null;

  const { grid, placed } = gameData;

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (dragging) {
          setDragging(false);
          setDragStart(null);
          setDragEnd(null);
        }
      }}
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        userSelect: "none",
        color: "#fff",
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 4,
          background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 1,
        }}
      >
        Word Search
      </h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, marginTop: 0 }}>
        Find all {placed.length} hidden tech words in the grid
      </p>

      {/* Stats Bar */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#111127",
            border: "1px solid #1e1e3a",
            borderRadius: 10,
            padding: "8px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
            Found
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>
            {found.size}
            <span style={{ color: "#475569", fontSize: 16 }}>/{placed.length}</span>
          </div>
        </div>

        <div
          style={{
            background: "#111127",
            border: "1px solid #1e1e3a",
            borderRadius: 10,
            padding: "8px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
            Time
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", fontVariantNumeric: "tabular-nums" }}>
            {formatTime(timer)}
          </div>
        </div>

        <button
          onClick={handleHint}
          disabled={gameWon}
          style={{
            background: gameWon ? "#1a1a2e" : "linear-gradient(135deg, #f59e0b, #d97706)",
            color: gameWon ? "#555" : "#000",
            border: "none",
            borderRadius: 10,
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 700,
            cursor: gameWon ? "default" : "pointer",
            opacity: gameWon ? 0.4 : 1,
            transition: "transform 0.15s, opacity 0.15s",
          }}
        >
          Hint
        </button>

        <button
          onClick={newGame}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            transition: "transform 0.15s",
          }}
        >
          New Game
        </button>
      </div>

      {/* Win Message */}
      {gameWon && (
        <div
          style={{
            background: "linear-gradient(135deg, #14532d, #052e16)",
            border: "1px solid #22c55e",
            borderRadius: 12,
            padding: "14px 32px",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>
            All Words Found!
          </div>
          <div style={{ fontSize: 14, color: "#86efac", marginTop: 4 }}>
            Completed in {formatTime(timer)}
          </div>
        </div>
      )}

      {/* Main Content: Grid + Word List */}
      <div
        style={{
          display: "flex",
          gap: 32,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Grid */}
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 36px)`,
            gridTemplateRows: `repeat(${SIZE}, 36px)`,
            gap: 2,
            background: "#0d0d24",
            border: "2px solid #1e1e3a",
            borderRadius: 12,
            padding: 8,
          }}
        >
          {grid.map((row, r) =>
            row.map((ch, c) => {
              const key = cellKey(r, c);
              const isFound = foundCells.has(key);
              const isSelected = currentSelection.has(key);
              const isHint = hintCell === key;

              let bg = "#131328";
              let borderColor = "#1e1e3a";
              let textColor = "#94a3b8";

              if (isFound) {
                bg = "#14532d";
                borderColor = "#22c55e";
                textColor = "#4ade80";
              } else if (isSelected) {
                bg = "#1e3a5f";
                borderColor = "#3b82f6";
                textColor = "#93c5fd";
              } else if (isHint) {
                bg = "#713f12";
                borderColor = "#f59e0b";
                textColor = "#fbbf24";
              }

              return (
                <div
                  key={key}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 4,
                    cursor: gameWon ? "default" : "crosshair",
                    fontSize: 15,
                    fontWeight: 700,
                    color: textColor,
                    transition: "background 0.15s, border-color 0.15s, color 0.15s",
                    letterSpacing: 0.5,
                  }}
                >
                  {ch}
                </div>
              );
            })
          )}
        </div>

        {/* Word List */}
        <div
          style={{
            background: "#111127",
            border: "1px solid #1e1e3a",
            borderRadius: 12,
            padding: "20px 24px",
            minWidth: 180,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 14,
            }}
          >
            Words to Find
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {placed.map((p) => {
              const isFound = found.has(p.word);
              return (
                <div
                  key={p.word}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: isFound ? "2px solid #22c55e" : "2px solid #334155",
                      background: isFound ? "#14532d" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#22c55e",
                      flexShrink: 0,
                    }}
                  >
                    {isFound ? "\u2713" : ""}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isFound ? "#22c55e" : "#94a3b8",
                      textDecoration: isFound ? "line-through" : "none",
                      opacity: isFound ? 0.7 : 1,
                      letterSpacing: 1,
                    }}
                  >
                    {p.word}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p
        style={{
          color: "#475569",
          fontSize: 12,
          marginTop: 28,
          textAlign: "center",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Click and drag across letters to select a word. Words can be placed horizontally,
        vertically, or diagonally in any direction.
      </p>
    </div>
  );
}
