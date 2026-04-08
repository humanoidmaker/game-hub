"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const SIZE = 8;
type Cell = null | "B" | "W";
type Board = Cell[][];

function initBoard(): Board {
  const b: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  b[3][3] = "W";
  b[3][4] = "B";
  b[4][3] = "B";
  b[4][4] = "W";
  return b;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function getFlips(board: Board, r: number, c: number, player: Cell): [number, number][] {
  if (!player || board[r][c] !== null) return [];
  const opp: Cell = player === "B" ? "W" : "B";
  const flips: [number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

function getValidMoves(board: Board, player: Cell): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (getFlips(board, r, c, player).length > 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

function countDiscs(board: Board): { B: number; W: number } {
  let B = 0;
  let W = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === "B") B++;
      else if (cell === "W") W++;
    }
  }
  return { B, W };
}

function applyMove(board: Board, r: number, c: number, player: Cell): Board {
  const flips = getFlips(board, r, c, player);
  if (flips.length === 0) return board;
  const nb = cloneBoard(board);
  nb[r][c] = player;
  for (const [fr, fc] of flips) nb[fr][fc] = player;
  return nb;
}

// Positional weight map for AI evaluation
const WEIGHT_MAP: number[][] = (() => {
  const w: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
  // Corners = 25
  w[0][0] = 25; w[0][7] = 25; w[7][0] = 25; w[7][7] = 25;
  // Edges = 5
  for (let i = 2; i <= 5; i++) {
    w[0][i] = 5; w[7][i] = 5; w[i][0] = 5; w[i][7] = 5;
  }
  // Edge cells next to corners
  w[0][1] = 5; w[0][6] = 5; w[1][0] = 5; w[1][7] = 5;
  w[6][0] = 5; w[6][7] = 5; w[7][1] = 5; w[7][6] = 5;
  // Adjacent-to-corner = -10
  w[0][1] = -10; w[1][0] = -10; w[1][1] = -10;
  w[0][6] = -10; w[1][7] = -10; w[1][6] = -10;
  w[6][0] = -10; w[7][1] = -10; w[6][1] = -10;
  w[6][7] = -10; w[7][6] = -10; w[6][6] = -10;
  return w;
})();

function evaluateBoard(board: Board, aiPlayer: Cell): number {
  const oppPlayer: Cell = aiPlayer === "W" ? "B" : "W";
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === aiPlayer) score += WEIGHT_MAP[r][c];
      else if (board[r][c] === oppPlayer) score -= WEIGHT_MAP[r][c];
    }
  }
  // Mobility bonus
  const aiMoves = getValidMoves(board, aiPlayer).length;
  const oppMoves = getValidMoves(board, oppPlayer).length;
  score += (aiMoves - oppMoves) * 2;
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Cell
): number {
  const oppPlayer: Cell = aiPlayer === "W" ? "B" : "W";
  const currentPlayer = maximizing ? aiPlayer : oppPlayer;
  const moves = getValidMoves(board, currentPlayer);

  if (depth === 0) return evaluateBoard(board, aiPlayer);

  // If current player has no moves
  if (moves.length === 0) {
    const otherMoves = getValidMoves(board, maximizing ? oppPlayer : aiPlayer);
    if (otherMoves.length === 0) {
      // Game over
      const cnt = countDiscs(board);
      const aiCount = aiPlayer === "W" ? cnt.W : cnt.B;
      const oppCount = aiPlayer === "W" ? cnt.B : cnt.W;
      if (aiCount > oppCount) return 10000;
      if (oppCount > aiCount) return -10000;
      return 0;
    }
    // Pass turn
    return minimax(board, depth - 1, alpha, beta, !maximizing, aiPlayer);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of moves) {
      const nb = applyMove(board, r, c, currentPlayer);
      const val = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [r, c] of moves) {
      const nb = applyMove(board, r, c, currentPlayer);
      const val = minimax(nb, depth - 1, alpha, beta, true, aiPlayer);
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function findBestMove(board: Board): [number, number] | null {
  const moves = getValidMoves(board, "W");
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const [r, c] of moves) {
    const nb = applyMove(board, r, c, "W");
    const score = minimax(nb, 2, -Infinity, Infinity, false, "W"); // depth 2 after this move = 3 total
    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

export default function Othello() {
  const [board, setBoard] = useState<Board>(initBoard);
  const [turn, setTurn] = useState<Cell>("B");
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Your turn (Black)");
  const [flippedCells, setFlippedCells] = useState<Set<string>>(new Set());
  const [lastPlaced, setLastPlaced] = useState<string | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const aiThinking = useRef(false);

  const cnt = countDiscs(board);

  const endGame = useCallback((b: Board) => {
    const c = countDiscs(b);
    setGameOver(true);
    if (c.B > c.W) {
      setMessage(`Black wins ${c.B}-${c.W}!`);
      setScores((s) => ({ ...s, player: s.player + 1 }));
    } else if (c.W > c.B) {
      setMessage(`White wins ${c.W}-${c.B}!`);
      setScores((s) => ({ ...s, ai: s.ai + 1 }));
    } else {
      setMessage("It's a draw!");
      setScores((s) => ({ ...s, draws: s.draws + 1 }));
    }
  }, []);

  const triggerFlipAnimation = useCallback((cells: [number, number][], placed: [number, number]) => {
    const key = `${placed[0]},${placed[1]}`;
    setLastPlaced(key);
    const keys = new Set(cells.map(([r, c]) => `${r},${c}`));
    setFlippedCells(keys);
    setTimeout(() => {
      setFlippedCells(new Set());
      setLastPlaced(null);
    }, 350);
  }, []);

  // AI turn effect
  useEffect(() => {
    if (turn !== "W" || gameOver || aiThinking.current) return;
    aiThinking.current = true;
    setMessage("White is thinking...");

    const timer = setTimeout(() => {
      const move = findBestMove(board);
      if (!move) {
        // AI has no moves
        if (getValidMoves(board, "B").length > 0) {
          setMessage("White passes. Your turn (Black).");
          setTurn("B");
        } else {
          endGame(board);
        }
        aiThinking.current = false;
        return;
      }

      const [r, c] = move;
      const flips = getFlips(board, r, c, "W");
      const nb = applyMove(board, r, c, "W");
      setBoard(nb);
      triggerFlipAnimation(flips, [r, c]);

      // Check next turn
      if (getValidMoves(nb, "B").length > 0) {
        setTurn("B");
        setMessage("Your turn (Black)");
      } else if (getValidMoves(nb, "W").length > 0) {
        setMessage("Black has no moves. White goes again...");
        // Stay as W turn, but reset ref so effect re-fires
        setTurn(null as unknown as Cell);
        setTimeout(() => setTurn("W"), 100);
      } else {
        endGame(nb);
      }
      aiThinking.current = false;
    }, 500);

    return () => {
      clearTimeout(timer);
      aiThinking.current = false;
    };
  }, [turn, board, gameOver, endGame, triggerFlipAnimation]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (gameOver || turn !== "B") return;
      const flips = getFlips(board, r, c, "B");
      if (flips.length === 0) return;

      const nb = applyMove(board, r, c, "B");
      setBoard(nb);
      triggerFlipAnimation(flips, [r, c]);

      // Check if AI has moves
      if (getValidMoves(nb, "W").length > 0) {
        setTurn("W");
      } else if (getValidMoves(nb, "B").length > 0) {
        setMessage("White has no moves. Your turn again (Black).");
      } else {
        endGame(nb);
      }
    },
    [board, turn, gameOver, endGame, triggerFlipAnimation]
  );

  const resetGame = useCallback(() => {
    setBoard(initBoard());
    setTurn("B");
    setGameOver(false);
    setMessage("Your turn (Black)");
    setFlippedCells(new Set());
    setLastPlaced(null);
    aiThinking.current = false;
  }, []);

  const validMoves = turn === "B" && !gameOver ? getValidMoves(board, "B") : [];
  const validSet = new Set(validMoves.map(([r, c]) => `${r},${c}`));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Title */}
      <h1
        style={{
          color: "#f1f5f9",
          fontSize: 32,
          fontWeight: 700,
          margin: "0 0 8px 0",
          letterSpacing: "-0.5px",
        }}
      >
        Othello
      </h1>
      <p
        style={{
          color: "#94a3b8",
          fontSize: 14,
          margin: "0 0 20px 0",
        }}
      >
        You are Black. Beat the AI!
      </p>

      {/* Score panel */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 16,
          padding: "10px 24px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>You</div>
          <div style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>{scores.player}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Draw</div>
          <div style={{ color: "#94a3b8", fontSize: 22, fontWeight: 700 }}>{scores.draws}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>AI</div>
          <div style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700 }}>{scores.ai}</div>
        </div>
      </div>

      {/* Disc counts */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #555, #111)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}
          />
          <span
            style={{
              color: "#f1f5f9",
              fontSize: 18,
              fontWeight: 600,
              minWidth: 24,
            }}
          >
            {cnt.B}
          </span>
        </div>
        <div
          style={{
            color: "#64748b",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          vs
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              color: "#f1f5f9",
              fontSize: 18,
              fontWeight: 600,
              minWidth: 24,
              textAlign: "right",
            }}
          >
            {cnt.W}
          </span>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #fff, #ccc)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>

      {/* Status message */}
      <div
        style={{
          color: gameOver ? "#22c55e" : "#e2e8f0",
          fontSize: 15,
          fontWeight: 500,
          marginBottom: 16,
          padding: "6px 16px",
          background: gameOver ? "rgba(34,197,94,0.1)" : "transparent",
          borderRadius: 8,
          transition: "all 0.3s ease",
        }}
      >
        {message}
      </div>

      {/* Board */}
      <div
        style={{
          background: "#15803d",
          padding: 3,
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {board.map((row, r) => (
          <div key={r} style={{ display: "flex" }}>
            {row.map((cell, c) => {
              const key = `${r},${c}`;
              const isValid = validSet.has(key);
              const isFlipping = flippedCells.has(key);
              const isPlaced = lastPlaced === key;

              return (
                <div
                  key={c}
                  onClick={() => handleCellClick(r, c)}
                  style={{
                    width: 52,
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(0,0,0,0.25)",
                    borderRight: c === SIZE - 1 ? "1px solid rgba(0,0,0,0.25)" : undefined,
                    borderBottom: r === SIZE - 1 ? "1px solid rgba(0,0,0,0.25)" : undefined,
                    cursor: isValid ? "pointer" : "default",
                    background: isValid
                      ? "rgba(34,197,94,0.15)"
                      : "transparent",
                    transition: "background 0.15s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (isValid) {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(34,197,94,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = isValid
                      ? "rgba(34,197,94,0.15)"
                      : "transparent";
                  }}
                >
                  {cell !== null && (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background:
                          cell === "B"
                            ? "radial-gradient(circle at 35% 35%, #555, #111)"
                            : "radial-gradient(circle at 35% 35%, #fff, #ccc)",
                        boxShadow:
                          cell === "B"
                            ? "0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)"
                            : "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)",
                        transform: isFlipping
                          ? "scale(0.7)"
                          : isPlaced
                          ? "scale(1.1)"
                          : "scale(1)",
                        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />
                  )}
                  {cell === null && isValid && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.25)",
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* New Game button */}
      <button
        onClick={resetGame}
        style={{
          marginTop: 24,
          padding: "12px 36px",
          borderRadius: 10,
          border: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
          transition: "all 0.2s ease",
          letterSpacing: "0.3px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(34,197,94,0.4)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(34,197,94,0.3)";
        }}
      >
        New Game
      </button>
    </div>
  );
}
