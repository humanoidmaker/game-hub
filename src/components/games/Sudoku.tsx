"use client";
import { useState, useEffect, useCallback, useRef } from "react";

type Difficulty = "easy" | "medium" | "hard";
type Board = number[][];
type Notes = Set<number>[][];
type Move = { row: number; col: number; prevValue: number; prevNotes: Set<number> };

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSolution(): Board {
  const board: Board = Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(r: number, c: number, n: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[r][i] === n || board[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) {
      for (let j = bc; j < bc + 3; j++) {
        if (board[i][j] === n) return false;
      }
    }
    return true;
  }

  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValid(r, c, n)) {
            board[r][c] = n;
            if (solve()) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  solve();
  return board;
}

function makePuzzle(diff: Difficulty): { puzzle: Board; solution: Board } {
  const solution = generateSolution();
  const puzzle = solution.map((r) => [...r]);
  const remove = diff === "easy" ? 35 : diff === "medium" ? 45 : 55;
  const cells = shuffleArray(Array.from({ length: 81 }, (_, i) => i));
  for (let i = 0; i < remove; i++) {
    const r = Math.floor(cells[i] / 9);
    const c = cells[i] % 9;
    puzzle[r][c] = 0;
  }
  return { puzzle, solution };
}

function createEmptyNotes(): Notes {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>())
  );
}

function cloneNotes(notes: Notes): Notes {
  return notes.map((row) => row.map((cell) => new Set(cell)));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function hasConflict(board: Board, row: number, col: number): boolean {
  const val = board[row][col];
  if (val === 0) return false;
  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === val) return true;
  }
  // Check col
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === val) return true;
  }
  // Check box
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === val) return true;
    }
  }
  return false;
}

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [game, setGame] = useState(() => makePuzzle("easy"));
  const [board, setBoard] = useState<Board>(() => game.puzzle.map((r) => [...r]));
  const [fixed, setFixed] = useState<boolean[][]>(() =>
    game.puzzle.map((r) => r.map((v) => v !== 0))
  );
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notes, setNotes] = useState<Notes>(createEmptyNotes);
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState<Move[]>([]);
  const [timer, setTimer] = useState(0);
  const [won, setWon] = useState(false);
  const [running, setRunning] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (!running || won) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running, won]);

  // Win detection
  useEffect(() => {
    if (won) return;
    const isComplete = board.every((row, r) =>
      row.every((cell, c) => cell === game.solution[r][c])
    );
    if (isComplete) {
      setWon(true);
      setRunning(false);
    }
  }, [board, game.solution, won]);

  const startNewGame = useCallback((d: Difficulty) => {
    const g = makePuzzle(d);
    setDifficulty(d);
    setGame(g);
    setBoard(g.puzzle.map((r) => [...r]));
    setFixed(g.puzzle.map((r) => r.map((v) => v !== 0)));
    setSelected(null);
    setNotes(createEmptyNotes());
    setNotesMode(false);
    setHistory([]);
    setTimer(0);
    setWon(false);
    setRunning(true);
  }, []);

  const placeNumber = useCallback(
    (n: number) => {
      if (!selected || won) return;
      const [r, c] = selected;
      if (fixed[r][c]) return;

      const prevValue = board[r][c];
      const prevNotes = new Set(notes[r][c]);

      if (notesMode && n !== 0) {
        const newNotes = cloneNotes(notes);
        if (newNotes[r][c].has(n)) {
          newNotes[r][c].delete(n);
        } else {
          newNotes[r][c].add(n);
        }
        setHistory((h) => [...h.slice(-19), { row: r, col: c, prevValue, prevNotes }]);
        setNotes(newNotes);
        return;
      }

      const newBoard = board.map((row) => [...row]);
      newBoard[r][c] = n;
      const newNotes = cloneNotes(notes);
      if (n !== 0) {
        newNotes[r][c] = new Set();
      }
      setHistory((h) => [...h.slice(-19), { row: r, col: c, prevValue, prevNotes }]);
      setBoard(newBoard);
      setNotes(newNotes);
    },
    [selected, won, fixed, board, notes, notesMode]
  );

  const undo = useCallback(() => {
    if (history.length === 0 || won) return;
    const move = history[history.length - 1];
    const newBoard = board.map((row) => [...row]);
    newBoard[move.row][move.col] = move.prevValue;
    const newNotes = cloneNotes(notes);
    newNotes[move.row][move.col] = new Set(move.prevNotes);
    setBoard(newBoard);
    setNotes(newNotes);
    setHistory((h) => h.slice(0, -1));
    setSelected([move.row, move.col]);
  }, [history, won, board, notes]);

  const giveHint = useCallback(() => {
    if (won) return;
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== game.solution[r][c]) {
          emptyCells.push([r, c]);
        }
      }
    }
    if (emptyCells.length === 0) return;
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = game.solution[r][c];
    const newNotes = cloneNotes(notes);
    newNotes[r][c] = new Set();
    setBoard(newBoard);
    setNotes(newNotes);
    setSelected([r, c]);
  }, [won, board, game.solution, notes]);

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected || won) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        placeNumber(num);
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        placeNumber(0);
      } else if (e.key === "ArrowUp" && selected[0] > 0) {
        setSelected([selected[0] - 1, selected[1]]);
      } else if (e.key === "ArrowDown" && selected[0] < 8) {
        setSelected([selected[0] + 1, selected[1]]);
      } else if (e.key === "ArrowLeft" && selected[1] > 0) {
        setSelected([selected[0], selected[1] - 1]);
      } else if (e.key === "ArrowRight" && selected[1] < 8) {
        setSelected([selected[0], selected[1] + 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, won, placeNumber]);

  const selectedValue = selected ? board[selected[0]][selected[1]] : 0;

  const getCellStyle = (r: number, c: number): React.CSSProperties => {
    const val = board[r][c];
    const isSel = selected !== null && selected[0] === r && selected[1] === c;
    const isSameNumber = val !== 0 && selectedValue !== 0 && val === selectedValue && !isSel;
    const isInSameRow = selected !== null && selected[0] === r && !isSel;
    const isInSameCol = selected !== null && selected[1] === c && !isSel;
    const isInSameBox =
      selected !== null &&
      Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
      Math.floor(selected[1] / 3) === Math.floor(c / 3) &&
      !isSel;
    const isWrong = val !== 0 && val !== game.solution[r][c];
    const isConflict = val !== 0 && hasConflict(board, r, c);

    let bg = "#111118";
    if (isSel) bg = "#2a4a8a";
    else if (isSameNumber) bg = "#1e3a5f";
    else if (isInSameRow || isInSameCol || isInSameBox) bg = "#161625";

    let color = "#e0e0e0";
    if (isWrong || isConflict) {
      color = "#ef4444";
    } else if (fixed[r][c]) {
      color = "#ffffff";
    } else if (val !== 0) {
      color = "#60a5fa";
    }

    const borderRight =
      c === 8 ? "none" : c % 3 === 2 ? "2px solid #555" : "1px solid #2a2a3a";
    const borderBottom =
      r === 8 ? "none" : r % 3 === 2 ? "2px solid #555" : "1px solid #2a2a3a";

    return {
      width: 48,
      height: 48,
      minWidth: 44,
      minHeight: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      borderRight,
      borderBottom,
      borderLeft: c === 0 ? "none" : undefined,
      borderTop: r === 0 ? "none" : undefined,
      cursor: "pointer",
      fontSize: val !== 0 ? 18 : 10,
      fontWeight: fixed[r][c] ? 700 : 500,
      color,
      userSelect: "none" as const,
      position: "relative" as const,
      transition: "background 0.1s",
      lineHeight: 1,
    };
  };

  const renderCellContent = (r: number, c: number) => {
    const val = board[r][c];
    if (val !== 0) return val;
    const cellNotes = notes[r][c];
    if (cellNotes.size === 0) return "";
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          width: "100%",
          height: "100%",
          padding: 2,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            style={{
              fontSize: 9,
              color: cellNotes.has(n) ? "#8888cc" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {n}
          </span>
        ))}
      </div>
    );
  };

  const btnBase: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "background 0.15s, transform 0.1s",
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: "#0a0a1a",
        minHeight: "100%",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: "#e0e0e0",
        outline: "none",
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 4,
          color: "#ffffff",
          letterSpacing: 1,
        }}
      >
        Sudoku
      </h2>

      {/* Difficulty Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, marginTop: 8 }}>
        {(["easy", "medium", "hard"] as const).map((d) => (
          <button
            key={d}
            onClick={() => startNewGame(d)}
            style={{
              ...btnBase,
              background: difficulty === d ? "#10b981" : "#1e1e2e",
              color: difficulty === d ? "#000" : "#aaa",
              textTransform: "capitalize",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 16,
          color: "#94a3b8",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 2,
        }}
      >
        {formatTime(timer)}
      </div>

      {/* Win Banner */}
      {won && (
        <div
          style={{
            background: "linear-gradient(135deg, #065f46, #064e3b)",
            border: "1px solid #10b981",
            borderRadius: 10,
            padding: "12px 28px",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>
            Puzzle Solved!
          </div>
          <div style={{ fontSize: 14, color: "#6ee7b7", marginTop: 4 }}>
            Time: {formatTime(timer)}
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 48px)",
          gridTemplateRows: "repeat(9, 48px)",
          border: "2px solid #555",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => {
                setSelected([r, c]);
                containerRef.current?.focus();
              }}
              style={getCellStyle(r, c)}
            >
              {renderCellContent(r, c)}
            </div>
          ))
        )}
      </div>

      {/* Number Pad */}
      <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => placeNumber(n)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              border: "none",
              background:
                selectedValue === n ? "#2a4a8a" : "#1e1e2e",
              color: selectedValue === n ? "#60a5fa" : "#e0e0e0",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {/* Erase */}
        <button
          onClick={() => placeNumber(0)}
          style={{
            ...btnBase,
            background: "#2a1a1a",
            color: "#ef4444",
            padding: "8px 14px",
          }}
        >
          Erase
        </button>

        {/* Notes Toggle */}
        <button
          onClick={() => setNotesMode((m) => !m)}
          style={{
            ...btnBase,
            background: notesMode ? "#3b3080" : "#1e1e2e",
            color: notesMode ? "#a78bfa" : "#aaa",
            padding: "8px 14px",
          }}
        >
          Notes {notesMode ? "ON" : "OFF"}
        </button>

        {/* Undo */}
        <button
          onClick={undo}
          disabled={history.length === 0}
          style={{
            ...btnBase,
            background: "#1e1e2e",
            color: history.length === 0 ? "#444" : "#f59e0b",
            padding: "8px 14px",
            cursor: history.length === 0 ? "default" : "pointer",
          }}
        >
          Undo
        </button>

        {/* Hint */}
        <button
          onClick={giveHint}
          style={{
            ...btnBase,
            background: "#1a2a1a",
            color: "#10b981",
            padding: "8px 14px",
          }}
        >
          Hint
        </button>

        {/* New Game */}
        <button
          onClick={() => startNewGame(difficulty)}
          style={{
            ...btnBase,
            background: "#1e1e2e",
            color: "#60a5fa",
            padding: "8px 14px",
          }}
        >
          New Game
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          marginTop: 20,
          fontSize: 12,
          color: "#555",
          textAlign: "center",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Click a cell and use the number pad or keyboard (1-9) to fill.
        Arrow keys to navigate. Toggle Notes mode for pencil marks.
      </div>
    </div>
  );
}
