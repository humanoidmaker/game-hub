"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const ROWS = 6;
const COLS = 7;
type Disc = "R" | "Y";
type Cell = Disc | null;
type Board = Cell[][];
type WinCells = [number, number][] | null;

const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));

function cloneBoard(b: Board): Board {
  return b.map((r) => [...r]);
}

function dropRow(b: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!b[r][col]) return r;
  }
  return -1;
}

function applyDrop(b: Board, col: number, disc: Disc): Board | null {
  const r = dropRow(b, col);
  if (r === -1) return null;
  const nb = cloneBoard(b);
  nb[r][col] = disc;
  return nb;
}

function findWin(b: Board): { winner: Disc; cells: [number, number][] } | null {
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) {
            cells.push([nr, nc]);
          } else {
            break;
          }
        }
        if (cells.length === 4) return { winner: p, cells };
      }
    }
  }
  return null;
}

function isBoardFull(b: Board): boolean {
  return b[0].every((c) => c !== null);
}

function getValidCols(b: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (b[0][c] === null) cols.push(c);
  }
  return cols;
}

// ---------- Minimax AI ----------

function scorePosition(b: Board, disc: Disc): number {
  let score = 0;
  const opp: Disc = disc === "Y" ? "R" : "Y";

  // Center column preference
  const centerCol = 3;
  let centerCount = 0;
  for (let r = 0; r < ROWS; r++) {
    if (b[r][centerCol] === disc) centerCount++;
  }
  score += centerCount * 3;

  // Evaluate all windows of 4
  const evaluate = (window: Cell[]) => {
    const mine = window.filter((c) => c === disc).length;
    const theirs = window.filter((c) => c === opp).length;
    const empty = window.filter((c) => c === null).length;
    if (mine === 4) return 100;
    if (mine === 3 && empty === 1) return 5;
    if (mine === 2 && empty === 2) return 2;
    if (theirs === 3 && empty === 1) return -4;
    return 0;
  };

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluate([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]]);
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      score += evaluate([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]]);
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluate([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]]);
    }
  }
  // Diagonal down-left
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      score += evaluate([b[r][c], b[r + 1][c - 1], b[r + 2][c - 2], b[r + 3][c - 3]]);
    }
  }
  return score;
}

function minimax(
  b: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  const win = findWin(b);
  if (win) return win.winner === "Y" ? 100000 + depth : -100000 - depth;
  if (isBoardFull(b)) return 0;
  if (depth === 0) return scorePosition(b, "Y");

  const valid = getValidCols(b);
  if (maximizing) {
    let value = -Infinity;
    for (const col of valid) {
      const nb = applyDrop(b, col, "Y")!;
      value = Math.max(value, minimax(nb, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const col of valid) {
      const nb = applyDrop(b, col, "R")!;
      value = Math.min(value, minimax(nb, depth - 1, alpha, beta, true));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function bestAIMove(b: Board): number {
  // Immediate win
  for (let c = 0; c < COLS; c++) {
    const nb = applyDrop(b, c, "Y");
    if (nb && findWin(nb)?.winner === "Y") return c;
  }
  // Block opponent win
  for (let c = 0; c < COLS; c++) {
    const nb = applyDrop(b, c, "R");
    if (nb && findWin(nb)?.winner === "R") return c;
  }
  // Minimax depth 4
  const valid = getValidCols(b);
  let bestScore = -Infinity;
  let bestCol = valid[0];
  // Prefer center columns in tie
  const ordered = [...valid].sort((a, b2) => Math.abs(a - 3) - Math.abs(b2 - 3));
  for (const col of ordered) {
    const nb = applyDrop(b, col, "Y")!;
    const score = minimax(nb, 4, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}

// ---------- Animation keyframes injected once ----------

const ANIM_DURATION = 400; // ms

function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("cf-keyframes")) return;
  const style = document.createElement("style");
  style.id = "cf-keyframes";
  style.textContent = `
    @keyframes cf-drop {
      0% { transform: translateY(-340px); }
      70% { transform: translateY(6px); }
      85% { transform: translateY(-3px); }
      100% { transform: translateY(0); }
    }
    @keyframes cf-glow-pulse {
      0%, 100% { box-shadow: 0 0 8px 3px rgba(255,255,255,0.7); }
      50% { box-shadow: 0 0 18px 6px rgba(255,255,255,0.95); }
    }
    @keyframes cf-hover-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `;
  document.head.appendChild(style);
}

// ---------- Component ----------

export default function ConnectFour() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<Disc>("R");
  const [winInfo, setWinInfo] = useState<WinCells>(null);
  const [winner, setWinner] = useState<Disc | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [scores, setScores] = useState({ R: 0, Y: 0 });
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastDrop, setLastDrop] = useState<{ row: number; col: number } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const gameOverRef = useRef(false);

  useEffect(() => {
    injectKeyframes();
  }, []);

  const gameOver = !!winner || isDraw;
  gameOverRef.current = gameOver;

  const resetGame = useCallback(() => {
    setBoard(emptyBoard());
    setTurn("R");
    setWinInfo(null);
    setWinner(null);
    setIsDraw(false);
    setLastDrop(null);
    setAiThinking(false);
    gameOverRef.current = false;
  }, []);

  const processMove = useCallback(
    (b: Board, col: number, disc: Disc): Board | null => {
      const nb = applyDrop(b, col, disc);
      if (!nb) return null;
      const row = dropRow(b, col);
      setBoard(nb);
      setLastDrop({ row, col });

      const result = findWin(nb);
      if (result) {
        setWinner(result.winner);
        setWinInfo(result.cells);
        setScores((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
        return nb;
      }
      if (isBoardFull(nb)) {
        setIsDraw(true);
        return nb;
      }
      return nb;
    },
    []
  );

  // AI auto-play
  useEffect(() => {
    if (turn !== "Y" || gameOver || aiThinking) return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      if (gameOverRef.current) {
        setAiThinking(false);
        return;
      }
      setBoard((currentBoard) => {
        const col = bestAIMove(currentBoard);
        const nb = applyDrop(currentBoard, col, "Y");
        if (!nb) {
          setAiThinking(false);
          return currentBoard;
        }
        const row = dropRow(currentBoard, col);
        setLastDrop({ row, col });

        const result = findWin(nb);
        if (result) {
          setWinner(result.winner);
          setWinInfo(result.cells);
          setScores((s) => ({ ...s, [result.winner]: s[result.winner] + 1 }));
        } else if (isBoardFull(nb)) {
          setIsDraw(true);
        } else {
          setTurn("R");
        }
        setAiThinking(false);
        return nb;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [turn, gameOver, aiThinking]);

  const handleColumnClick = useCallback(
    (col: number) => {
      if (gameOverRef.current || turn !== "R" || aiThinking) return;
      if (board[0][col] !== null) return;
      const nb = processMove(board, col, "R");
      if (!nb) return;
      const result = findWin(nb);
      if (!result && !isBoardFull(nb)) {
        setTurn("Y");
      }
    },
    [board, turn, aiThinking, processMove]
  );

  const isWinCell = (r: number, c: number): boolean => {
    if (!winInfo) return false;
    return winInfo.some(([wr, wc]) => wr === r && wc === c);
  };

  const canDropInCol = (col: number) => !gameOver && turn === "R" && !aiThinking && board[0][col] === null;

  // Styles
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    background: "#0a0a1a",
    padding: "24px 12px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    userSelect: "none",
  };

  const headerStyle: React.CSSProperties = {
    color: "#e2e8f0",
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 8,
    letterSpacing: "-0.5px",
  };

  const scoreBoardStyle: React.CSSProperties = {
    display: "flex",
    gap: 32,
    marginBottom: 16,
    alignItems: "center",
  };

  const scoreItemStyle = (color: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 18,
    fontWeight: 700,
    color,
  });

  const miniDiscStyle = (color: string): React.CSSProperties => ({
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: color,
    boxShadow: `0 0 6px ${color}88`,
  });

  const statusBarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    padding: "8px 20px",
    borderRadius: 12,
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    fontSize: 16,
    fontWeight: 600,
    color: "#e2e8f0",
    minHeight: 42,
  };

  const boardFrameStyle: React.CSSProperties = {
    background: "#1e40af",
    borderRadius: 16,
    padding: "8px 10px 12px 10px",
    boxShadow: "0 8px 32px rgba(30, 64, 175, 0.4), inset 0 2px 4px rgba(255,255,255,0.1)",
    position: "relative",
    overflow: "hidden",
  };

  const cellSize = 60;
  const cellGap = 6;

  const hoverRowStyle: React.CSSProperties = {
    display: "flex",
    gap: cellGap,
    padding: "0 2px",
    marginBottom: 4,
    height: cellSize,
    alignItems: "center",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: cellGap,
    padding: "0 2px",
  };

  const cellOuterStyle = (col: number): React.CSSProperties => ({
    width: cellSize,
    height: cellSize,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: canDropInCol(col) ? "pointer" : "default",
    position: "relative",
  });

  const cellHoleStyle = (
    cell: Cell,
    r: number,
    c: number,
    isDropping: boolean,
    isWin: boolean
  ): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: cellSize - 8,
      height: cellSize - 8,
      borderRadius: "50%",
      transition: "background 0.15s ease",
      position: "relative",
    };

    if (cell === "R") {
      base.background = "radial-gradient(circle at 35% 35%, #ff6b6b, #ef4444 40%, #b91c1c)";
      base.boxShadow = "inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)";
    } else if (cell === "Y") {
      base.background = "radial-gradient(circle at 35% 35%, #fde047, #eab308 40%, #a16207)";
      base.boxShadow = "inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)";
    } else {
      base.background = "radial-gradient(circle at 45% 45%, #12122a, #0a0a1a)";
      base.boxShadow = "inset 0 3px 8px rgba(0,0,0,0.6)";
    }

    if (isDropping && cell) {
      base.animation = `cf-drop ${ANIM_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
    }

    if (isWin) {
      base.animation = "cf-glow-pulse 1s ease-in-out infinite";
      base.border = "3px solid #fff";
      base.width = cellSize - 14;
      base.height = cellSize - 14;
    }

    return base;
  };

  const hoverIndicatorStyle = (col: number): React.CSSProperties => {
    const isActive = hoverCol === col && canDropInCol(col);
    const color = turn === "R" ? "#ef4444" : "#eab308";
    return {
      width: cellSize - 8,
      height: cellSize - 8,
      borderRadius: "50%",
      background: isActive ? color : "transparent",
      opacity: isActive ? 0.6 : 0,
      transition: "opacity 0.15s ease",
      animation: isActive ? "cf-hover-bounce 0.8s ease-in-out infinite" : "none",
      margin: "0 auto",
    };
  };

  const btnStyle: React.CSSProperties = {
    marginTop: 20,
    padding: "12px 36px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
    transition: "transform 0.1s, box-shadow 0.1s",
  };

  const statusText = winner
    ? `${winner === "R" ? "Red" : "Yellow"} wins!`
    : isDraw
    ? "It's a draw!"
    : turn === "R"
    ? "Your turn"
    : "AI is thinking...";

  const statusDiscColor = winner
    ? winner === "R"
      ? "#ef4444"
      : "#eab308"
    : isDraw
    ? "#64748b"
    : turn === "R"
    ? "#ef4444"
    : "#eab308";

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Connect Four</div>

      <div style={scoreBoardStyle}>
        <div style={scoreItemStyle("#ef4444")}>
          <div style={miniDiscStyle("#ef4444")} />
          Red: {scores.R}
        </div>
        <div style={{ color: "#475569", fontSize: 20, fontWeight: 300 }}>|</div>
        <div style={scoreItemStyle("#eab308")}>
          <div style={miniDiscStyle("#eab308")} />
          Yellow: {scores.Y}
        </div>
      </div>

      <div style={statusBarStyle}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: statusDiscColor,
            boxShadow: `0 0 8px ${statusDiscColor}88`,
          }}
        />
        {statusText}
      </div>

      <div style={boardFrameStyle}>
        {/* Hover indicators row */}
        <div style={hoverRowStyle}>
          {Array.from({ length: COLS }, (_, c) => (
            <div
              key={`hover-${c}`}
              style={cellOuterStyle(c)}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => handleColumnClick(c)}
            >
              <div style={hoverIndicatorStyle(c)} />
            </div>
          ))}
        </div>

        {/* Board rows */}
        {board.map((row, ri) => (
          <div key={ri} style={{ ...rowStyle, marginBottom: ri < ROWS - 1 ? cellGap : 0 }}>
            {row.map((cell, ci) => {
              const isDropping =
                lastDrop !== null && lastDrop.row === ri && lastDrop.col === ci;
              const isWin = isWinCell(ri, ci);
              return (
                <div
                  key={`${ri}-${ci}`}
                  style={cellOuterStyle(ci)}
                  onMouseEnter={() => setHoverCol(ci)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => handleColumnClick(ci)}
                >
                  <div style={cellHoleStyle(cell, ri, ci, isDropping, isWin)} />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <button
        style={btnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(16,185,129,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(16,185,129,0.35)";
        }}
        onClick={resetGame}
      >
        New Game
      </button>
    </div>
  );
}
