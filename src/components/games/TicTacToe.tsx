"use client";
import { useState, useEffect, useCallback, useRef } from "react";

type Cell = "X" | "O" | null;
type Difficulty = "easy" | "medium" | "hard";

const LINES: [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: Cell; line: number[] | null } {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

function isBoardFull(board: Cell[]): boolean {
  return board.every((c) => c !== null);
}

function getEmptyCells(board: Cell[]): number[] {
  return board.reduce<number[]>((acc, c, i) => (c === null ? [...acc, i] : acc), []);
}

function minimax(board: Cell[], depth: number, isMaximizing: boolean): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of getEmptyCells(board)) {
      board[i] = "O";
      best = Math.max(best, minimax(board, depth + 1, false));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of getEmptyCells(board)) {
      board[i] = "X";
      best = Math.min(best, minimax(board, depth + 1, true));
      board[i] = null;
    }
    return best;
  }
}

function getBestMove(board: Cell[]): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (const i of getEmptyCells(board)) {
    board[i] = "O";
    const score = minimax(board, 0, false);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function findBlockOrWin(board: Cell[], mark: Cell): number | null {
  for (const i of getEmptyCells(board)) {
    board[i] = mark;
    const { winner } = checkWinner(board);
    board[i] = null;
    if (winner === mark) return i;
  }
  return null;
}

function getAIMove(board: Cell[], difficulty: Difficulty): number {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return -1;

  if (difficulty === "easy") {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  if (difficulty === "medium") {
    // Try to win first
    const winMove = findBlockOrWin(board, "O");
    if (winMove !== null) return winMove;
    // Block player win
    const blockMove = findBlockOrWin(board, "X");
    if (blockMove !== null) return blockMove;
    // Take center if available
    if (board[4] === null) return 4;
    // Otherwise random
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Hard: minimax (unbeatable)
  return getBestMove(board);
}

// Line geometry for strike-through overlay
function getLineCoords(line: number[]): { x1: string; y1: string; x2: string; y2: string } {
  const getCenter = (idx: number) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const x = col * 33.33 + 16.67;
    const y = row * 33.33 + 16.67;
    return { x, y };
  };
  const start = getCenter(line[0]);
  const end = getCenter(line[2]);
  return {
    x1: `${start.x}%`,
    y1: `${start.y}%`,
    x2: `${end.x}%`,
    y2: `${end.y}%`,
  };
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [statusText, setStatusText] = useState("Your turn");
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [placedIndex, setPlacedIndex] = useState<number | null>(null);
  const [lineAnimating, setLineAnimating] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetGame = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameOver(false);
    setWinLine(null);
    setStatusText("Your turn");
    setPlacedIndex(null);
    setLineAnimating(false);
  }, []);

  // AI move effect
  useEffect(() => {
    if (isPlayerTurn || gameOver) return;

    aiTimerRef.current = setTimeout(() => {
      setBoard((prev) => {
        const newBoard = [...prev];
        const move = getAIMove(newBoard, difficulty);
        if (move === -1) return prev;
        newBoard[move] = "O";
        setPlacedIndex(move);

        const { winner, line } = checkWinner(newBoard);
        if (winner === "O") {
          setWinLine(line);
          setLineAnimating(true);
          setGameOver(true);
          setStatusText("AI wins!");
          setScores((s) => ({ ...s, ai: s.ai + 1 }));
        } else if (isBoardFull(newBoard)) {
          setGameOver(true);
          setStatusText("It's a draw!");
          setScores((s) => ({ ...s, draws: s.draws + 1 }));
        } else {
          setIsPlayerTurn(true);
          setStatusText("Your turn");
        }

        return newBoard;
      });
    }, 300);

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [isPlayerTurn, gameOver, difficulty]);

  const handleCellClick = (index: number) => {
    if (!isPlayerTurn || gameOver || board[index] !== null) return;

    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);
    setPlacedIndex(index);

    const { winner, line } = checkWinner(newBoard);
    if (winner === "X") {
      setWinLine(line);
      setLineAnimating(true);
      setGameOver(true);
      setStatusText("You win!");
      setScores((s) => ({ ...s, player: s.player + 1 }));
      return;
    }
    if (isBoardFull(newBoard)) {
      setGameOver(true);
      setStatusText("It's a draw!");
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
      return;
    }

    setIsPlayerTurn(false);
    setStatusText("AI is thinking...");
  };

  const changeDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    resetGame();
  };

  const isWinCell = (index: number) => winLine?.includes(index) ?? false;

  const cellSize = 110;
  const gap = 6;
  const gridSize = cellSize * 3 + gap * 2;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: "#e0e0e0",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawLine {
          0% { stroke-dashoffset: 500; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes cellGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.8); }
        }
      `}</style>

      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          margin: "0 0 8px",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 1,
        }}
      >
        Tic Tac Toe
      </h1>

      {/* Difficulty Selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, marginTop: 8 }}>
        {(["easy", "medium", "hard"] as const).map((d) => {
          const active = difficulty === d;
          const colors: Record<Difficulty, string> = {
            easy: "#22c55e",
            medium: "#f59e0b",
            hard: "#ef4444",
          };
          return (
            <button
              key={d}
              onClick={() => changeDifficulty(d)}
              style={{
                padding: "8px 22px",
                borderRadius: 10,
                border: `2px solid ${active ? colors[d] : "#333"}`,
                background: active ? colors[d] + "22" : "transparent",
                color: active ? colors[d] : "#666",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                transition: "all 0.2s ease",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Scoreboard */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginBottom: 20,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#3b82f6", fontSize: 28, fontWeight: 800 }}>{scores.player}</div>
          <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>YOU (X)</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#888", fontSize: 28, fontWeight: 800 }}>{scores.draws}</div>
          <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>DRAWS</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#ef4444", fontSize: 28, fontWeight: 800 }}>{scores.ai}</div>
          <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>AI (O)</div>
        </div>
      </div>

      {/* Status */}
      <div
        style={{
          marginBottom: 20,
          fontSize: 18,
          fontWeight: 700,
          color: gameOver
            ? statusText === "You win!"
              ? "#10b981"
              : statusText === "AI wins!"
              ? "#ef4444"
              : "#f59e0b"
            : !isPlayerTurn
            ? "#888"
            : "#e0e0e0",
          animation: !isPlayerTurn && !gameOver ? "pulse 1s ease-in-out infinite" : "none",
          minHeight: 28,
        }}
      >
        {statusText}
      </div>

      {/* Game Board */}
      <div
        style={{
          position: "relative",
          width: gridSize,
          height: gridSize,
        }}
      >
        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(3, ${cellSize}px)`,
            gridTemplateRows: `repeat(3, ${cellSize}px)`,
            gap: gap,
          }}
        >
          {board.map((cell, i) => {
            const isWin = isWinCell(i);
            const justPlaced = placedIndex === i;
            return (
              <div
                key={i}
                onClick={() => handleCellClick(i)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isWin ? "#10b98115" : "#12122a",
                  borderRadius: 12,
                  cursor: !isPlayerTurn || gameOver || cell ? "default" : "pointer",
                  border: `2px solid ${isWin ? "#10b981" : "#1e1e3a"}`,
                  transition: "background 0.2s, border-color 0.3s, box-shadow 0.3s",
                  animation: isWin ? "cellGlow 1.5s ease-in-out infinite" : "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (!cell && isPlayerTurn && !gameOver) {
                    (e.currentTarget as HTMLDivElement).style.background = "#1a1a40";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#3b82f640";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isWin) {
                    (e.currentTarget as HTMLDivElement).style.background = isWin ? "#10b98115" : "#12122a";
                    (e.currentTarget as HTMLDivElement).style.borderColor = isWin ? "#10b981" : "#1e1e3a";
                  }
                }}
              >
                {cell && (
                  <span
                    style={{
                      fontSize: 56,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: cell === "X" ? "#3b82f6" : "#ef4444",
                      textShadow:
                        cell === "X"
                          ? "0 0 20px rgba(59, 130, 246, 0.5)"
                          : "0 0 20px rgba(239, 68, 68, 0.5)",
                      animation: justPlaced ? "popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cell}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Winning Line SVG Overlay */}
        {winLine && lineAnimating && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            {(() => {
              const coords = getLineCoords(winLine);
              return (
                <line
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="500"
                  strokeDashoffset="0"
                  style={{
                    animation: "drawLine 0.5s ease-out forwards",
                    filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))",
                  }}
                />
              );
            })()}
          </svg>
        )}
      </div>

      {/* New Game Button */}
      <button
        onClick={resetGame}
        style={{
          marginTop: 28,
          padding: "12px 36px",
          borderRadius: 12,
          border: "2px solid #333",
          background: "transparent",
          color: "#e0e0e0",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          letterSpacing: 0.5,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#10b981";
          (e.currentTarget as HTMLButtonElement).style.color = "#10b981";
          (e.currentTarget as HTMLButtonElement).style.background = "#10b98115";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
          (e.currentTarget as HTMLButtonElement).style.color = "#e0e0e0";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        New Game
      </button>

      {/* Difficulty Description */}
      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "#555",
          textAlign: "center",
          maxWidth: 300,
        }}
      >
        {difficulty === "easy" && "Easy: AI picks random moves"}
        {difficulty === "medium" && "Medium: AI blocks your wins and takes opportunities"}
        {difficulty === "hard" && "Hard: Unbeatable AI using minimax algorithm"}
      </div>
    </div>
  );
}
