"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// --- Utility functions ---

function countInversions(tiles: number[], size: number): number {
  let inversions = 0;
  const flat = tiles.filter((t) => t !== 0);
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  return inversions;
}

function isSolvable(tiles: number[], size: number): boolean {
  const inversions = countInversions(tiles, size);
  if (size % 2 === 1) {
    // Odd grid: solvable if inversions even
    return inversions % 2 === 0;
  } else {
    // Even grid: solvable if (inversions + row of blank from bottom) is odd
    const emptyIndex = tiles.indexOf(0);
    const emptyRowFromBottom = size - Math.floor(emptyIndex / size);
    return (inversions + emptyRowFromBottom) % 2 === 1;
  }
}

function generatePuzzle(size: number): number[] {
  const total = size * size;
  let tiles: number[];
  do {
    tiles = Array.from({ length: total }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
  } while (!isSolvable(tiles, size));
  return tiles;
}

function isSolved(tiles: number[]): boolean {
  for (let i = 0; i < tiles.length - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
}

// Rough optimal move reference (lower bounds based on Manhattan distance)
function manhattanDistance(tiles: number[], size: number): number {
  let dist = 0;
  for (let i = 0; i < tiles.length; i++) {
    const val = tiles[i];
    if (val === 0) continue;
    const goalRow = Math.floor((val - 1) / size);
    const goalCol = (val - 1) % size;
    const curRow = Math.floor(i / size);
    const curCol = i % size;
    dist += Math.abs(goalRow - curRow) + Math.abs(goalCol - curCol);
  }
  return dist;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Tile gradient: tile 1 = lightest, highest = darkest
function tileColor(value: number, max: number): string {
  const ratio = (value - 1) / (max - 1);
  // From light cyan/blue to deep indigo
  const r1 = 100, g1 = 210, b1 = 255;
  const r2 = 40, g2 = 30, b2 = 140;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `linear-gradient(135deg, rgb(${r},${g},${b}), rgb(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 20)}))`;
}

const TILE_SIZE = 70;
const GAP = 4;

export default function SlidingPuzzle() {
  const [gridSize, setGridSize] = useState(4);
  const [tiles, setTiles] = useState<number[]>(() => generatePuzzle(4));
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});
  const [optimalEstimate, setOptimalEstimate] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStarted = useRef(false);

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Update optimal estimate when tiles change
  useEffect(() => {
    setOptimalEstimate(manhattanDistance(tiles, gridSize));
  }, [tiles, gridSize]);

  // Win detection
  useEffect(() => {
    if (moves > 0 && isSolved(tiles)) {
      setWon(true);
      setTimerRunning(false);
      setBestMoves((prev) => {
        const current = prev[gridSize];
        if (current === undefined || moves < current) {
          return { ...prev, [gridSize]: moves };
        }
        return prev;
      });
    }
  }, [tiles, moves, gridSize]);

  const startNewGame = useCallback(
    (size: number) => {
      setGridSize(size);
      setTiles(generatePuzzle(size));
      setMoves(0);
      setTimer(0);
      setTimerRunning(false);
      setWon(false);
      hasStarted.current = false;
    },
    []
  );

  const shuffleBoard = useCallback(() => {
    setShuffling(true);
    setTiles(generatePuzzle(gridSize));
    setMoves(0);
    setTimer(0);
    setTimerRunning(false);
    setWon(false);
    hasStarted.current = false;
    setTimeout(() => setShuffling(false), 400);
  }, [gridSize]);

  const handleTileClick = useCallback(
    (index: number) => {
      if (won || shuffling) return;
      const emptyIndex = tiles.indexOf(0);
      const emptyRow = Math.floor(emptyIndex / gridSize);
      const emptyCol = emptyIndex % gridSize;
      const tileRow = Math.floor(index / gridSize);
      const tileCol = index % gridSize;
      const dist = Math.abs(emptyRow - tileRow) + Math.abs(emptyCol - tileCol);
      if (dist !== 1) return;

      // Start timer on first move
      if (!hasStarted.current) {
        hasStarted.current = true;
        setTimerRunning(true);
      }

      const newTiles = [...tiles];
      [newTiles[emptyIndex], newTiles[index]] = [
        newTiles[index],
        newTiles[emptyIndex],
      ];
      setTiles(newTiles);
      setMoves((m) => m + 1);
    },
    [tiles, gridSize, won, shuffling]
  );

  const total = gridSize * gridSize;
  const boardSize = gridSize * TILE_SIZE + (gridSize - 1) * GAP;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: 20,
        color: "#e0e0e0",
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          margin: 0,
          marginBottom: 6,
          background: "linear-gradient(90deg, #64d2ff, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 1,
        }}
      >
        Sliding Puzzle
      </h1>
      <p
        style={{
          margin: 0,
          marginBottom: 20,
          fontSize: 14,
          color: "#666",
        }}
      >
        Arrange tiles in order. Click a tile next to the empty space.
      </p>

      {/* Grid Size Selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {[3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => startNewGame(s)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "2px solid",
              borderColor: gridSize === s ? "#a78bfa" : "#333",
              background: gridSize === s ? "#a78bfa" : "transparent",
              color: gridSize === s ? "#0a0a1a" : "#888",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {s}x{s}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "flex",
          gap: 28,
          marginBottom: 18,
          fontSize: 15,
          color: "#aaa",
        }}
      >
        <div>
          <span style={{ color: "#666" }}>Moves: </span>
          <span style={{ color: "#e0e0e0", fontWeight: 700 }}>{moves}</span>
        </div>
        <div>
          <span style={{ color: "#666" }}>Time: </span>
          <span style={{ color: "#e0e0e0", fontWeight: 700 }}>
            {formatTime(timer)}
          </span>
        </div>
        <div>
          <span style={{ color: "#666" }}>Est. Optimal: </span>
          <span style={{ color: "#64d2ff", fontWeight: 700 }}>
            {optimalEstimate}
          </span>
        </div>
      </div>

      {/* Best Moves */}
      {bestMoves[gridSize] !== undefined && (
        <div
          style={{
            marginBottom: 14,
            fontSize: 13,
            color: "#a78bfa",
          }}
        >
          Best for {gridSize}x{gridSize}:{" "}
          <span style={{ fontWeight: 700 }}>{bestMoves[gridSize]} moves</span>
        </div>
      )}

      {/* Board */}
      <div
        style={{
          position: "relative",
          width: boardSize,
          height: boardSize,
          background: "#111125",
          borderRadius: 12,
          border: "2px solid #222244",
          overflow: "hidden",
          boxShadow: "0 0 40px rgba(100, 100, 255, 0.08)",
        }}
      >
        {tiles.map((value, index) => {
          if (value === 0) return null;
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          const x = col * (TILE_SIZE + GAP);
          const y = row * (TILE_SIZE + GAP);
          const maxVal = total - 1;

          return (
            <div
              key={value}
              onClick={() => handleTileClick(index)}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tileColor(value, maxVal),
                cursor: "pointer",
                fontSize: gridSize <= 3 ? 26 : gridSize <= 4 ? 22 : 18,
                fontWeight: 800,
                color: "#fff",
                textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                userSelect: "none",
                transition: shuffling
                  ? "left 0.3s ease, top 0.3s ease"
                  : "left 0.2s ease, top 0.2s ease",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {value}
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button
          onClick={shuffleBoard}
          disabled={shuffling}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: shuffling
              ? "#333"
              : "linear-gradient(135deg, #6366f1, #a78bfa)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: shuffling ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            opacity: shuffling ? 0.6 : 1,
          }}
        >
          {shuffling ? "Shuffling..." : "Shuffle"}
        </button>
        <button
          onClick={() => startNewGame(gridSize)}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "2px solid #444",
            background: "transparent",
            color: "#ccc",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          New Game
        </button>
      </div>

      {/* Win Celebration */}
      {won && (
        <div
          style={{
            marginTop: 24,
            padding: "20px 36px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))",
            border: "2px solid #a78bfa",
            textAlign: "center",
            animation: "fadeIn 0.4s ease",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#a78bfa",
              marginBottom: 8,
            }}
          >
            Puzzle Solved!
          </div>
          <div style={{ fontSize: 16, color: "#ccc", marginBottom: 4 }}>
            Completed in{" "}
            <span style={{ color: "#64d2ff", fontWeight: 700 }}>
              {moves} moves
            </span>{" "}
            and{" "}
            <span style={{ color: "#64d2ff", fontWeight: 700 }}>
              {formatTime(timer)}
            </span>
          </div>
          {bestMoves[gridSize] === moves && (
            <div
              style={{
                fontSize: 14,
                color: "#fbbf24",
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              New Best for {gridSize}x{gridSize}!
            </div>
          )}
          <button
            onClick={() => startNewGame(gridSize)}
            style={{
              marginTop: 14,
              padding: "10px 28px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #a78bfa, #6366f1)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
