"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// --- Types ---
type Cell = null | "r" | "b" | "R" | "B"; // r=red, b=black, R=red king, B=black king
type Board = Cell[][];
type Pos = [number, number];
interface Move {
  from: Pos;
  to: Pos;
  captures: Pos[];
}

// --- Helpers ---
const clone = (b: Board): Board => b.map((r) => [...r]);
const isRed = (c: Cell): boolean => c === "r" || c === "R";
const isBlack = (c: Cell): boolean => c === "b" || c === "B";
const isKing = (c: Cell): boolean => c === "R" || c === "B";
const posEq = (a: Pos, b: Pos) => a[0] === b[0] && a[1] === b[1];

function initBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = "b";
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = "r";
  return b;
}

// --- Single-step jumps from a position ---
function getJumpsFrom(
  board: Board,
  r: number,
  c: number,
  red: boolean
): { to: Pos; captured: Pos }[] {
  const p = board[r][c];
  if (!p || isRed(p) !== red) return [];
  const dirs: Pos[] = isKing(p)
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : red
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
  const jumps: { to: Pos; captured: Pos }[] = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr,
      mc = c + dc;
    const jr = r + 2 * dr,
      jc = c + 2 * dc;
    if (jr < 0 || jr > 7 || jc < 0 || jc > 7) continue;
    const mid = board[mr][mc];
    if (mid && isRed(mid) !== red && !board[jr][jc]) {
      jumps.push({ to: [jr, jc], captured: [mr, mc] });
    }
  }
  return jumps;
}

// --- Multi-jump sequences (DFS) ---
function getMultiJumps(
  board: Board,
  r: number,
  c: number,
  red: boolean
): { path: Pos[]; captures: Pos[] }[] {
  const results: { path: Pos[]; captures: Pos[] }[] = [];

  function dfs(
    b: Board,
    row: number,
    col: number,
    path: Pos[],
    caps: Pos[]
  ) {
    const jumps = getJumpsFrom(b, row, col, red);
    // Filter out already-captured squares
    const validJumps = jumps.filter(
      (j) => !caps.some((cp) => posEq(cp, j.captured))
    );
    if (validJumps.length === 0) {
      if (caps.length > 0) results.push({ path: [...path], captures: [...caps] });
      return;
    }
    for (const j of validJumps) {
      const nb = clone(b);
      nb[j.to[0]][j.to[1]] = nb[row][col];
      nb[row][col] = null;
      nb[j.captured[0]][j.captured[1]] = null;
      // Promote mid-jump if reaching end
      if (j.to[0] === 0 && nb[j.to[0]][j.to[1]] === "r")
        nb[j.to[0]][j.to[1]] = "R";
      if (j.to[0] === 7 && nb[j.to[0]][j.to[1]] === "b")
        nb[j.to[0]][j.to[1]] = "B";
      dfs(nb, j.to[0], j.to[1], [...path, j.to], [...caps, j.captured]);
    }
  }

  dfs(board, r, c, [[r, c]], []);
  return results;
}

// --- Simple (non-jump) moves ---
function getSimpleMoves(
  board: Board,
  r: number,
  c: number,
  red: boolean
): Pos[] {
  const p = board[r][c];
  if (!p || isRed(p) !== red) return [];
  const dirs: Pos[] = isKing(p)
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : red
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
  const moves: Pos[] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr,
      nc = c + dc;
    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 && !board[nr][nc]) {
      moves.push([nr, nc]);
    }
  }
  return moves;
}

// --- All legal moves for a side (mandatory jumps enforced) ---
function getAllMoves(board: Board, red: boolean): Move[] {
  const allJumps: Move[] = [];
  const allSimple: Move[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || isRed(p) !== red) continue;

      // Multi-jump sequences
      const mj = getMultiJumps(board, r, c, red);
      for (const seq of mj) {
        const lastPos = seq.path[seq.path.length - 1];
        allJumps.push({ from: [r, c], to: lastPos, captures: seq.captures });
      }

      // Simple moves
      const sm = getSimpleMoves(board, r, c, red);
      for (const to of sm) {
        allSimple.push({ from: [r, c], to, captures: [] });
      }
    }
  }

  // Mandatory capture: if any jumps exist, only jumps are legal
  if (allJumps.length > 0) return allJumps;
  return allSimple;
}

// --- Get valid moves for a single piece (respecting mandatory jumps globally) ---
function getMovesForPiece(
  board: Board,
  r: number,
  c: number,
  red: boolean
): Move[] {
  const all = getAllMoves(board, red);
  return all.filter((m) => m.from[0] === r && m.from[1] === c);
}

// --- Apply a move ---
function applyMove(board: Board, move: Move): Board {
  const b = clone(board);
  b[move.to[0]][move.to[1]] = b[move.from[0]][move.from[1]];
  b[move.from[0]][move.from[1]] = null;
  for (const [cr, cc] of move.captures) b[cr][cc] = null;
  // King promotion
  if (move.to[0] === 0 && b[move.to[0]][move.to[1]] === "r")
    b[move.to[0]][move.to[1]] = "R";
  if (move.to[0] === 7 && b[move.to[0]][move.to[1]] === "b")
    b[move.to[0]][move.to[1]] = "B";
  return b;
}

// --- Count pieces ---
function countPieces(board: Board) {
  let red = 0,
    black = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (isRed(board[r][c])) red++;
      if (isBlack(board[r][c])) black++;
    }
  return { red, black };
}

// --- AI (Black) ---
function evaluateBoard(board: Board): number {
  // Higher is better for black
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p === "b") score += 10 + r; // advance bonus
      else if (p === "B") score += 25;
      else if (p === "r") score -= 10 + (7 - r);
      else if (p === "R") score -= 25;
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  isBlackTurn: boolean,
  alpha: number,
  beta: number
): number {
  const moves = getAllMoves(board, !isBlackTurn ? true : false);
  // Actually: isBlackTurn means black is moving => red=false
  const actualMoves = getAllMoves(board, !isBlackTurn);

  if (depth === 0 || actualMoves.length === 0) {
    return evaluateBoard(board);
  }

  if (isBlackTurn) {
    let maxEval = -Infinity;
    for (const m of actualMoves) {
      const nb = applyMove(board, m);
      const ev = minimax(nb, depth - 1, false, alpha, beta);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of actualMoves) {
      const nb = applyMove(board, m);
      const ev = minimax(nb, depth - 1, true, alpha, beta);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function aiChooseMove(board: Board): Move | null {
  const moves = getAllMoves(board, false); // black = not red
  if (moves.length === 0) return null;

  // Depth 3 with alpha-beta pruning
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const m of moves) {
    const nb = applyMove(board, m);
    const score = minimax(nb, 2, false, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }

  // Among equal best, prefer captures > king moves > regular
  if (bestMoves.length > 1) {
    const withCaptures = bestMoves.filter((m) => m.captures.length > 0);
    if (withCaptures.length > 0) {
      // Prefer most captures
      withCaptures.sort((a, b) => b.captures.length - a.captures.length);
      return withCaptures[0];
    }
    const kingMoves = bestMoves.filter((m) => {
      const p = board[m.from[0]][m.from[1]];
      return isKing(p);
    });
    if (kingMoves.length > 0)
      return kingMoves[Math.floor(Math.random() * kingMoves.length)];
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// --- Styles ---
const BOARD_SIZE = 440;
const CELL_SIZE = BOARD_SIZE / 8; // 55px

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: "100vh",
    background: "#0a0a1a",
    padding: 24,
    fontFamily: "'Segoe UI', sans-serif",
    color: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
  },
  scoreBar: {
    display: "flex",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    width: BOARD_SIZE + 4,
    marginBottom: 12,
    padding: "8px 16px",
    borderRadius: 8,
    background: "#14142a",
    border: "1px solid #2a2a4a",
  },
  scoreItem: {
    display: "flex",
    alignItems: "center" as const,
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
  },
  turnText: {
    fontSize: 14,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 12,
  },
  boardFrame: {
    border: "3px solid #3a3a5a",
    borderRadius: 4,
    boxShadow: "0 0 30px rgba(100, 100, 255, 0.08)",
    overflow: "hidden" as const,
  },
  row: {
    display: "flex",
  },
  newGameBtn: {
    marginTop: 20,
    padding: "10px 32px",
    borderRadius: 8,
    border: "none",
    background: "#10b981",
    color: "#000",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    letterSpacing: 0.5,
    transition: "background 0.2s",
  },
  gameOverBanner: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: 700,
    padding: "8px 24px",
    borderRadius: 8,
  },
};

export default function Checkers() {
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [isRedTurn, setIsRedTurn] = useState(true);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [redCaptured, setRedCaptured] = useState(0); // pieces red has captured
  const [blackCaptured, setBlackCaptured] = useState(0); // pieces black has captured
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // AI auto-play
  useEffect(() => {
    if (!isRedTurn && !gameOver) {
      setAiThinking(true);
      aiTimerRef.current = setTimeout(() => {
        setBoard((prev) => {
          const move = aiChooseMove(prev);
          if (!move) {
            setGameOver("Red Wins!");
            setAiThinking(false);
            return prev;
          }
          const nb = applyMove(prev, move);
          setBlackCaptured((c) => c + move.captures.length);

          // Check if red has moves after AI plays
          const redMoves = getAllMoves(nb, true);
          if (redMoves.length === 0) {
            const counts = countPieces(nb);
            if (counts.red === 0) {
              setGameOver("Black Wins!");
            } else {
              setGameOver("Black Wins! Red has no moves.");
            }
          }

          setIsRedTurn(true);
          setAiThinking(false);
          return nb;
        });
      }, 500);
    }
  }, [isRedTurn, gameOver]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (gameOver || !isRedTurn || aiThinking) return;

      // If clicking a highlighted move target
      if (selected) {
        const move = validMoves.find((m) => posEq(m.to, [r, c]));
        if (move) {
          const nb = applyMove(board, move);
          setRedCaptured((prev) => prev + move.captures.length);
          setSelected(null);
          setValidMoves([]);

          // Check if black has moves
          const blackMoves = getAllMoves(nb, false);
          if (blackMoves.length === 0) {
            const counts = countPieces(nb);
            if (counts.black === 0) {
              setGameOver("Red Wins!");
            } else {
              setGameOver("Red Wins! Black has no moves.");
            }
            setBoard(nb);
            return;
          }

          setBoard(nb);
          setIsRedTurn(false);
          return;
        }
      }

      // Select a red piece
      const p = board[r][c];
      if (p && isRed(p)) {
        const moves = getMovesForPiece(board, r, c, true);
        if (moves.length > 0) {
          setSelected([r, c]);
          setValidMoves(moves);
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    },
    [board, selected, validMoves, gameOver, isRedTurn, aiThinking]
  );

  const handleNewGame = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setBoard(initBoard());
    setSelected(null);
    setValidMoves([]);
    setIsRedTurn(true);
    setGameOver(null);
    setRedCaptured(0);
    setBlackCaptured(0);
    setAiThinking(false);
  };

  const counts = countPieces(board);

  // Find which pieces can move (for mandatory jump highlighting)
  const movablePieces: Pos[] = [];
  if (isRedTurn && !gameOver) {
    const all = getAllMoves(board, true);
    const froms = new Set(all.map((m) => `${m.from[0]},${m.from[1]}`));
    froms.forEach((key) => {
      const [rr, cc] = key.split(",").map(Number);
      movablePieces.push([rr, cc]);
    });
  }

  const mustCapture =
    isRedTurn &&
    !gameOver &&
    getAllMoves(board, true).some((m) => m.captures.length > 0);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Checkers</div>
      <div style={styles.subtitle}>
        You play Red. Captures are mandatory.
      </div>

      {/* Score Bar */}
      <div style={styles.scoreBar}>
        <div style={styles.scoreItem}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#e53e3e",
              border: "2px solid #fff3",
            }}
          />
          <span style={{ color: "#e53e3e" }}>Red: {counts.red}</span>
          <span style={{ color: "#777", fontSize: 12 }}>
            (captured {redCaptured})
          </span>
        </div>

        <div
          style={{
            ...styles.turnText,
            background: gameOver
              ? "#10b98133"
              : isRedTurn
              ? "#e53e3e22"
              : "#55555522",
            color: gameOver ? "#10b981" : isRedTurn ? "#e53e3e" : "#999",
          }}
        >
          {gameOver
            ? "Game Over"
            : aiThinking
            ? "AI thinking..."
            : isRedTurn
            ? "Your turn"
            : "..."}
        </div>

        <div style={styles.scoreItem}>
          <span style={{ color: "#777", fontSize: 12 }}>
            (captured {blackCaptured})
          </span>
          <span style={{ color: "#ccc" }}>Black: {counts.black}</span>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#222",
              border: "2px solid #fff3",
            }}
          />
        </div>
      </div>

      {mustCapture && (
        <div
          style={{
            fontSize: 12,
            color: "#f59e0b",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          You must capture!
        </div>
      )}

      {/* Board */}
      <div style={styles.boardFrame}>
        {board.map((row, ri) => (
          <div key={ri} style={styles.row}>
            {row.map((cell, ci) => {
              const dark = (ri + ci) % 2 === 1;
              const isSel =
                selected && selected[0] === ri && selected[1] === ci;
              const isTarget = validMoves.some((m) =>
                posEq(m.to, [ri, ci])
              );
              const isCapTarget = validMoves.some(
                (m) =>
                  posEq(m.to, [ri, ci]) && m.captures.length > 0
              );
              const isMovable =
                !selected &&
                movablePieces.some((p) => posEq(p, [ri, ci]));

              let bg: string;
              if (!dark) {
                bg = "#2a2a3a";
              } else if (isSel) {
                bg = "#3b82f6";
              } else if (isCapTarget) {
                bg = "#dc262644";
              } else if (isTarget) {
                bg = "#22c55e33";
              } else {
                bg = "#4a6741";
              }

              return (
                <div
                  key={ci}
                  onClick={() => dark && handleCellClick(ri, ci)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    cursor: dark ? "pointer" : "default",
                    position: "relative",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Piece */}
                  {cell && (
                    <div
                      style={{
                        width: CELL_SIZE * 0.72,
                        height: CELL_SIZE * 0.72,
                        borderRadius: "50%",
                        background: isRed(cell)
                          ? "radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b)"
                          : "radial-gradient(circle at 35% 35%, #555, #1a1a1a)",
                        border: isRed(cell)
                          ? "3px solid #ff9a9a"
                          : "3px solid #666",
                        boxShadow: isSel
                          ? "0 0 12px rgba(59,130,246,0.7)"
                          : isMovable && isRed(cell)
                          ? "0 0 8px rgba(255,255,100,0.4)"
                          : "0 3px 6px rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "box-shadow 0.15s",
                        position: "relative",
                      }}
                    >
                      {/* King crown */}
                      {isKing(cell) && (
                        <span
                          style={{
                            fontSize: CELL_SIZE * 0.36,
                            lineHeight: 1,
                            color: "#ffd700",
                            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                            fontWeight: 700,
                            userSelect: "none",
                          }}
                        >
                          &#9733;
                        </span>
                      )}
                    </div>
                  )}

                  {/* Move target dot */}
                  {!cell && isTarget && (
                    <div
                      style={{
                        width: CELL_SIZE * 0.28,
                        height: CELL_SIZE * 0.28,
                        borderRadius: "50%",
                        background: isCapTarget
                          ? "rgba(220, 38, 38, 0.6)"
                          : "rgba(34, 197, 94, 0.5)",
                        boxShadow: isCapTarget
                          ? "0 0 8px rgba(220, 38, 38, 0.4)"
                          : "0 0 8px rgba(34, 197, 94, 0.3)",
                      }}
                    />
                  )}

                  {/* Capture target ring (when landing on occupied square is not possible,
                      but show ring on pieces that will be captured) */}
                  {cell &&
                    isTarget &&
                    (() => {
                      // This shouldn't happen in checkers (can't land on occupied)
                      return null;
                    })()}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Game Over Banner */}
      {gameOver && (
        <div
          style={{
            ...styles.gameOverBanner,
            background: gameOver.startsWith("Red")
              ? "#e53e3e22"
              : "#55555522",
            color: gameOver.startsWith("Red") ? "#e53e3e" : "#ccc",
            border: gameOver.startsWith("Red")
              ? "2px solid #e53e3e55"
              : "2px solid #55555555",
          }}
        >
          {gameOver}
        </div>
      )}

      {/* New Game Button */}
      <button
        onClick={handleNewGame}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "#059669")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "#10b981")
        }
        style={styles.newGameBtn}
      >
        New Game
      </button>
    </div>
  );
}
