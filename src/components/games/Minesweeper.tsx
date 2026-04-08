"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Difficulty = "easy" | "medium" | "hard";
type GameState = "idle" | "playing" | "won" | "lost";

const DIFFS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

const NUM_COLORS: Record<number, string> = {
  1: "#0000ff",   // blue
  2: "#008000",   // green
  3: "#ff0000",   // red
  4: "#00008b",   // dark blue
  5: "#8b0000",   // dark red
  6: "#008080",   // teal
  7: "#000000",   // black
  8: "#808080",   // gray
};

const CELL_SIZE = 30;

/* ------------------------------------------------------------------ */
/*  Board helpers                                                      */
/* ------------------------------------------------------------------ */

function emptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function placeMines(
  board: Cell[][],
  rows: number,
  cols: number,
  mines: number,
  safeR: number,
  safeC: number
): Cell[][] {
  const b = board.map((row) => row.map((c) => ({ ...c })));
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (b[r][c].mine) continue;
    // keep a 3x3 safe zone around first click
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    b[r][c].mine = true;
    placed++;
  }
  // compute adjacency counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (b[r][c].mine) continue;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && b[nr][nc].mine) {
            cnt++;
          }
        }
      }
      b[r][c].adjacent = cnt;
    }
  }
  return b;
}

function floodReveal(board: Cell[][], r: number, c: number): Cell[][] {
  const b = board.map((row) => row.map((cell) => ({ ...cell })));
  const rows = b.length;
  const cols = b[0].length;
  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    if (b[cr][cc].revealed || b[cr][cc].flagged || b[cr][cc].mine) continue;
    b[cr][cc].revealed = true;
    if (b[cr][cc].adjacent === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          stack.push([cr + dr, cc + dc]);
        }
      }
    }
  }
  return b;
}

function checkWin(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.mine && !cell.revealed) return false;
    }
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Minesweeper() {
  const [diff, setDiff] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Cell[][]>(() => emptyBoard(9, 9));
  const [gameState, setGameState] = useState<GameState>("idle");
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const cfg = DIFFS[diff];

  // Timer effect
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const flagCount = board.flat().filter((c) => c.flagged).length;
  const mineCounter = cfg.mines - flagCount;

  /* -- reset -------------------------------------------------------- */
  const reset = useCallback(
    (newDiff?: Difficulty) => {
      const d = newDiff ?? diff;
      if (newDiff) setDiff(d);
      const { rows, cols } = DIFFS[d];
      setBoard(emptyBoard(rows, cols));
      setGameState("idle");
      setTime(0);
    },
    [diff]
  );

  /* -- left click --------------------------------------------------- */
  const handleClick = useCallback(
    (r: number, c: number) => {
      if (gameState === "won" || gameState === "lost") return;

      let b = board;

      // first click — place mines, guarantee safe
      if (gameState === "idle") {
        b = placeMines(emptyBoard(cfg.rows, cfg.cols), cfg.rows, cfg.cols, cfg.mines, r, c);
        setGameState("playing");
      }

      const cell = b[r][c];
      if (cell.flagged || cell.revealed) return;

      // hit a mine
      if (cell.mine) {
        const lost = b.map((row) =>
          row.map((cl) => ({
            ...cl,
            revealed: cl.mine ? true : cl.revealed,
          }))
        );
        setBoard(lost);
        setGameState("lost");
        return;
      }

      const nb = floodReveal(b, r, c);
      setBoard(nb);
      if (checkWin(nb)) {
        // auto-flag remaining mines on win
        const won = nb.map((row) =>
          row.map((cl) => ({
            ...cl,
            flagged: cl.mine ? true : cl.flagged,
          }))
        );
        setBoard(won);
        setGameState("won");
      }
    },
    [board, gameState, cfg]
  );

  /* -- right click / long press ------------------------------------- */
  const handleFlag = useCallback(
    (r: number, c: number) => {
      if (gameState === "won" || gameState === "lost" || gameState === "idle") return;
      const cell = board[r][c];
      if (cell.revealed) return;
      const nb = board.map((row) => row.map((cl) => ({ ...cl })));
      nb[r][c].flagged = !nb[r][c].flagged;
      setBoard(nb);
    },
    [board, gameState]
  );

  const onContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    handleFlag(r, c);
  };

  // long press handlers for mobile
  const onTouchStart = (r: number, c: number) => {
    longPressFired.current = false;
    longPressRef.current = setTimeout(() => {
      longPressFired.current = true;
      handleFlag(r, c);
    }, 400);
  };

  const onTouchEnd = (r: number, c: number) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (!longPressFired.current) {
      handleClick(r, c);
    }
  };

  /* -- smiley ------------------------------------------------------- */
  const smiley = gameState === "won" ? "😎" : gameState === "lost" ? "😵" : "😊";

  /* -- render cell -------------------------------------------------- */
  const renderCell = (r: number, c: number) => {
    const cell = board[r]?.[c];
    if (!cell) return null;

    const { revealed, flagged, mine, adjacent } = cell;
    const isLost = gameState === "lost";

    // unrevealed cell style (raised 3D)
    const unrevealed: React.CSSProperties = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      userSelect: "none",
      background: "#c0c0c0",
      borderTop: "3px solid #fff",
      borderLeft: "3px solid #fff",
      borderBottom: "3px solid #808080",
      borderRight: "3px solid #808080",
      boxSizing: "border-box",
    };

    // revealed cell style (sunken)
    const revealedStyle: React.CSSProperties = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: mine ? 16 : 14,
      fontWeight: 700,
      cursor: "default",
      userSelect: "none",
      background: mine ? "#ff4444" : "#c0c0c0",
      border: "1px solid #808080",
      boxSizing: "border-box",
    };

    // wrong flag on game over
    const wrongFlag = isLost && flagged && !mine;

    // unrevealed mine on game over (unflagged) — already shown via revealed
    // flagged cell (not revealed)
    if (!revealed && flagged) {
      return (
        <div
          key={`${r}-${c}`}
          style={unrevealed}
          onContextMenu={(e) => onContextMenu(e, r, c)}
          onTouchStart={() => onTouchStart(r, c)}
          onTouchEnd={() => onTouchEnd(r, c)}
          onClick={() => {}}
        >
          {wrongFlag ? (
            <span style={{ position: "relative" }}>
              🚩
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  left: 0,
                  right: 0,
                  fontSize: 20,
                  color: "red",
                  textAlign: "center",
                  lineHeight: "20px",
                }}
              >
                ✕
              </span>
            </span>
          ) : (
            "🚩"
          )}
        </div>
      );
    }

    // revealed cell
    if (revealed) {
      let content: React.ReactNode = "";
      if (mine) {
        content = "💣";
      } else if (adjacent > 0) {
        content = (
          <span style={{ color: NUM_COLORS[adjacent] || "#000" }}>{adjacent}</span>
        );
      }
      return (
        <div key={`${r}-${c}`} style={revealedStyle}>
          {content}
        </div>
      );
    }

    // unrevealed, unflagged
    return (
      <div
        key={`${r}-${c}`}
        style={unrevealed}
        onClick={() => handleClick(r, c)}
        onContextMenu={(e) => onContextMenu(e, r, c)}
        onTouchStart={() => onTouchStart(r, c)}
        onTouchEnd={() => onTouchEnd(r, c)}
      />
    );
  };

  /* -- format counter/timer as 3 digits ----------------------------- */
  const fmt = (n: number) => {
    const s = Math.max(-99, Math.min(999, n));
    return String(s).padStart(3, "0").replace("-", "-");
  };

  const counterStyle: React.CSSProperties = {
    background: "#300",
    color: "#f00",
    fontFamily: "'Courier New', monospace",
    fontSize: 22,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 3,
    border: "2px inset #555",
    minWidth: 50,
    textAlign: "center",
    letterSpacing: 2,
  };

  /* -- main render -------------------------------------------------- */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: "#0a0a1a",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ margin: "0 0 16px", fontSize: 24, fontWeight: 700 }}>
        Minesweeper
      </h2>

      {/* Difficulty buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            onClick={() => reset(d)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: diff === d ? "2px solid #10b981" : "2px solid #444",
              background: diff === d ? "#10b981" : "#1a1a2e",
              color: diff === d ? "#000" : "#aaa",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              textTransform: "capitalize",
              transition: "all 0.15s",
            }}
          >
            {d} ({DIFFS[d].rows}×{DIFFS[d].cols})
          </button>
        ))}
      </div>

      {/* Top bar: mine counter, smiley, timer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: Math.min(cfg.cols * CELL_SIZE + 12, 920),
          background: "#c0c0c0",
          borderTop: "3px solid #fff",
          borderLeft: "3px solid #fff",
          borderBottom: "3px solid #808080",
          borderRight: "3px solid #808080",
          padding: "6px 8px",
          marginBottom: 0,
          boxSizing: "border-box",
        }}
      >
        {/* mine counter */}
        <div style={counterStyle}>{fmt(mineCounter)}</div>

        {/* smiley reset button */}
        <button
          onClick={() => reset()}
          style={{
            fontSize: 26,
            cursor: "pointer",
            background: "#c0c0c0",
            borderTop: "3px solid #fff",
            borderLeft: "3px solid #fff",
            borderBottom: "3px solid #808080",
            borderRight: "3px solid #808080",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            lineHeight: 1,
          }}
          title="New Game"
        >
          {smiley}
        </button>

        {/* timer */}
        <div style={counterStyle}>{fmt(time)}</div>
      </div>

      {/* Board */}
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${cfg.cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${cfg.rows}, ${CELL_SIZE}px)`,
          background: "#c0c0c0",
          border: "3px solid #808080",
          borderTopColor: "#808080",
          borderLeftColor: "#808080",
          borderBottomColor: "#fff",
          borderRightColor: "#fff",
          overflow: "auto",
          maxWidth: "95vw",
        }}
      >
        {Array.from({ length: cfg.rows }, (_, r) =>
          Array.from({ length: cfg.cols }, (_, c) => renderCell(r, c))
        )}
      </div>

      {/* Status message */}
      {gameState === "won" && (
        <p
          style={{
            color: "#10b981",
            fontSize: 20,
            fontWeight: 700,
            marginTop: 16,
          }}
        >
          You Win! 🎉
        </p>
      )}
      {gameState === "lost" && (
        <p
          style={{
            color: "#ef4444",
            fontSize: 20,
            fontWeight: 700,
            marginTop: 16,
          }}
        >
          Game Over!
        </p>
      )}

      {/* Instructions */}
      <p
        style={{
          color: "#666",
          fontSize: 12,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Left click to reveal · Right click to flag · Long press on mobile to flag
      </p>
    </div>
  );
}
