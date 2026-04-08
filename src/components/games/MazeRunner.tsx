"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Maze Generator (DFS backtracker) ─── */
interface Cell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
  coin: boolean;
}

function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
      visited: false,
      coin: false,
    }))
  );

  const stack: [number, number][] = [];
  grid[0][0].visited = true;
  stack.push([0, 0]);

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const neighbors: [number, number, string, string][] = [];
    if (r > 0 && !grid[r - 1][c].visited) neighbors.push([r - 1, c, "top", "bottom"]);
    if (r < rows - 1 && !grid[r + 1][c].visited) neighbors.push([r + 1, c, "bottom", "top"]);
    if (c > 0 && !grid[r][c - 1].visited) neighbors.push([r, c - 1, "left", "right"]);
    if (c < cols - 1 && !grid[r][c + 1].visited) neighbors.push([r, c + 1, "right", "left"]);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nr, nc, wall1, wall2] = neighbors[Math.floor(Math.random() * neighbors.length)];
      (grid[r][c] as any)[wall1] = false;
      (grid[nr][nc] as any)[wall2] = false;
      grid[nr][nc].visited = true;
      stack.push([nr, nc]);
    }
  }

  // Place coins in dead ends
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const wallCount = [cell.top, cell.right, cell.bottom, cell.left].filter(Boolean).length;
      if (wallCount >= 3 && !(r === 0 && c === 0) && !(r === rows - 1 && c === cols - 1)) {
        cell.coin = true;
      }
    }
  }
  return grid;
}

/* ─── Constants ─── */
const SIZES = [
  { label: "Small 10\u00d710", rows: 10, cols: 10 },
  { label: "Medium 15\u00d715", rows: 15, cols: 15 },
  { label: "Large 20\u00d720", rows: 20, cols: 20 },
];
const CANVAS_SIZE = 400;
const FOG_RADIUS = 3;
const BG = "#0a0a1a";
const ACCENT = "#f59e0b";
const CARD = "#141428";
const BTN = "#7c3aed";

export default function MazeRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [sizeIdx, setSizeIdx] = useState(0);
  const mazeRef = useRef<Cell[][]>([]);
  const posRef = useRef<[number, number]>([0, 0]);
  const [coins, setCoins] = useState(0);
  const [timer, setTimer] = useState(0);
  const [won, setWon] = useState(false);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tick, setTick] = useState(0);

  const { rows, cols } = SIZES[sizeIdx];
  const cellW = CANVAS_SIZE / cols;
  const cellH = CANVAS_SIZE / rows;

  const initMaze = useCallback(() => {
    mazeRef.current = generateMaze(rows, cols);
    posRef.current = [0, 0];
    setCoins(0);
    setTimer(0);
    setWon(false);
    if (timerIdRef.current) clearInterval(timerIdRef.current);
    timerIdRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    setTick((n) => n + 1);
  }, [rows, cols]);

  useEffect(() => {
    initMaze();
    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeIdx]);

  /* ─── Draw main canvas ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const maze = mazeRef.current;
    const [pr, pc] = posRef.current;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.abs(r - pr) + Math.abs(c - pc);
        if (dist > FOG_RADIUS) continue;
        const cell = maze[r]?.[c];
        if (!cell) continue;

        const x = c * cellW;
        const y = r * cellH;
        const alpha = 1 - dist / (FOG_RADIUS + 1);

        ctx.fillStyle = `rgba(20,20,40,${alpha})`;
        ctx.fillRect(x, y, cellW, cellH);

        ctx.strokeStyle = `rgba(100,150,255,${alpha * 0.7})`;
        ctx.lineWidth = 2;
        if (cell.top) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellW, y);
          ctx.stroke();
        }
        if (cell.right) {
          ctx.beginPath();
          ctx.moveTo(x + cellW, y);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.stroke();
        }
        if (cell.bottom) {
          ctx.beginPath();
          ctx.moveTo(x, y + cellH);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.stroke();
        }
        if (cell.left) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellH);
          ctx.stroke();
        }

        if (cell.coin) {
          ctx.fillStyle = `rgba(245,158,11,${alpha})`;
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, cellW / 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Exit marker
    const exDist = Math.abs(rows - 1 - pr) + Math.abs(cols - 1 - pc);
    if (exDist <= FOG_RADIUS) {
      const a = 1 - exDist / (FOG_RADIUS + 1);
      ctx.fillStyle = `rgba(34,197,94,${a})`;
      ctx.fillRect((cols - 1) * cellW + 2, (rows - 1) * cellH + 2, cellW - 4, cellH - 4);
    }

    // Player
    ctx.fillStyle = "#06b6d4";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(pc * cellW + cellW / 2, pr * cellH + cellH / 2, cellW / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, rows, cols, cellW, cellH]);

  /* ─── Draw minimap ─── */
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const maze = mazeRef.current;
    const [pr, pc] = posRef.current;
    const mSize = 100;
    const mCW = mSize / cols;
    const mCH = mSize / rows;

    ctx.fillStyle = "#0f0f23";
    ctx.fillRect(0, 0, mSize, mSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = maze[r]?.[c];
        if (!cell) continue;
        const x = c * mCW;
        const y = r * mCH;
        ctx.strokeStyle = "rgba(100,150,255,0.3)";
        ctx.lineWidth = 0.5;
        if (cell.top) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + mCW, y);
          ctx.stroke();
        }
        if (cell.right) {
          ctx.beginPath();
          ctx.moveTo(x + mCW, y);
          ctx.lineTo(x + mCW, y + mCH);
          ctx.stroke();
        }
        if (cell.bottom) {
          ctx.beginPath();
          ctx.moveTo(x, y + mCH);
          ctx.lineTo(x + mCW, y + mCH);
          ctx.stroke();
        }
        if (cell.left) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + mCH);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = "#22c55e";
    ctx.fillRect((cols - 1) * mCW, (rows - 1) * mCH, mCW, mCH);

    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(pc * mCW + mCW / 2, pr * mCH + mCH / 2, Math.max(mCW / 2, 2), 0, Math.PI * 2);
    ctx.fill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, rows, cols]);

  /* ─── Keyboard input ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (won) return;
      const maze = mazeRef.current;
      let [r, c] = posRef.current;
      const cell = maze[r]?.[c];
      if (!cell) return;

      let moved = false;
      if ((e.key === "ArrowUp" || e.key === "w") && !cell.top) {
        r--;
        moved = true;
      }
      if ((e.key === "ArrowDown" || e.key === "s") && !cell.bottom) {
        r++;
        moved = true;
      }
      if ((e.key === "ArrowLeft" || e.key === "a") && !cell.left) {
        c--;
        moved = true;
      }
      if ((e.key === "ArrowRight" || e.key === "d") && !cell.right) {
        c++;
        moved = true;
      }

      if (moved) {
        e.preventDefault();
        posRef.current = [r, c];
        if (maze[r][c].coin) {
          maze[r][c].coin = false;
          setCoins((co) => co + 1);
        }
        if (r === rows - 1 && c === cols - 1) {
          setWon(true);
          if (timerIdRef.current) clearInterval(timerIdRef.current);
        }
        setTick((n) => n + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [won, rows, cols]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ textAlign: "center", fontSize: 28, color: ACCENT, marginBottom: 4 }}>Maze Runner</h1>
      <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
        Navigate through the fog. Collect coins. Reach the green exit!
      </p>

      {/* Size selector */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
        {SIZES.map((s, i) => (
          <button
            key={i}
            onClick={() => setSizeIdx(i)}
            style={{
              background: i === sizeIdx ? ACCENT : CARD,
              color: i === sizeIdx ? "#0a0a1a" : "#94a3b8",
              border: "none",
              borderRadius: 8,
              padding: "6px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: i === sizeIdx ? 700 : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
        <div style={{ background: CARD, borderRadius: 8, padding: "6px 16px", textAlign: "center" }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>Time </span>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{formatTime(timer)}</span>
        </div>
        <div style={{ background: CARD, borderRadius: 8, padding: "6px 16px", textAlign: "center" }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>Coins </span>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{coins}</span>
        </div>
      </div>

      {/* Canvas + Minimap */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 16 }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ borderRadius: 12, border: "2px solid #1e1e3a" }}
          tabIndex={0}
        />
        <div>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4, textAlign: "center" }}>
            Minimap
          </div>
          <canvas
            ref={minimapRef}
            width={100}
            height={100}
            style={{ borderRadius: 8, border: "1px solid #1e1e3a" }}
          />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={initMaze}
              style={{
                background: BTN,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                cursor: "pointer",
                width: "100%",
              }}
            >
              New Maze
            </button>
          </div>
        </div>
      </div>

      {won && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg,#22c55e,#06b6d4)",
              borderRadius: 12,
              padding: "16px 32px",
              color: "#fff",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            Maze Complete! Time: {formatTime(timer)} | Coins: {coins}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 12, color: "#64748b", fontSize: 13 }}>
        Use Arrow Keys or WASD to move
      </div>
    </div>
  );
}
