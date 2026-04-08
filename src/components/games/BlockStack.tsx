import { useRef, useEffect, useState, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const CS = 30; // cell size in px
const BOARD_W = COLS * CS; // 300
const BOARD_H = ROWS * CS; // 600

// Canvas total: board + sidebar for next-piece / stats
const SIDEBAR_W = 140;
const CANVAS_W = BOARD_W + SIDEBAR_W;
const CANVAS_H = BOARD_H;

// ── Piece definitions (I, O, T, L, J, S, Z) ───────────────────────────────────
const PIECE_DEFS: { shape: number[][]; color: string; highlight: string; shadow: string }[] = [
  { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: "#06b6d4", highlight: "#67e8f9", shadow: "#0891b2" }, // I – cyan
  { shape: [[1,1],[1,1]],                               color: "#eab308", highlight: "#fde047", shadow: "#a16207" }, // O – yellow
  { shape: [[0,1,0],[1,1,1],[0,0,0]],                   color: "#8b5cf6", highlight: "#c4b5fd", shadow: "#6d28d9" }, // T – purple
  { shape: [[0,0,1],[1,1,1],[0,0,0]],                   color: "#f97316", highlight: "#fdba74", shadow: "#c2410c" }, // L – orange
  { shape: [[1,0,0],[1,1,1],[0,0,0]],                   color: "#3b82f6", highlight: "#93c5fd", shadow: "#1d4ed8" }, // J – blue
  { shape: [[0,1,1],[1,1,0],[0,0,0]],                   color: "#22c55e", highlight: "#86efac", shadow: "#15803d" }, // S – green
  { shape: [[1,1,0],[0,1,1],[0,0,0]],                   color: "#ef4444", highlight: "#fca5a5", shadow: "#b91c1c" }, // Z – red
];

// ── Rotation helpers ───────────────────────────────────────────────────────────
function rotateCW(m: number[][]): number[][] {
  const R = m.length, C = m[0].length;
  return Array.from({ length: C }, (_, c) =>
    Array.from({ length: R }, (_, r) => m[R - 1 - r][c])
  );
}

// Wall kick offsets tried in order (standard SRS-like)
const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [0, -2],
];

// ── Sound helpers (Web Audio API) ──────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "square", volume = 0.12) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // audio not available
  }
}

function soundDrop() {
  playTone(100, 0.15, "triangle", 0.18);
}

function soundLineClear(count: number) {
  const base = count >= 4 ? 600 : 440;
  playTone(base, 0.1, "square", 0.14);
  setTimeout(() => playTone(base * 1.25, 0.1, "square", 0.14), 80);
  if (count >= 2) setTimeout(() => playTone(base * 1.5, 0.12, "square", 0.14), 160);
  if (count >= 4) setTimeout(() => playTone(base * 2, 0.18, "square", 0.16), 240);
}

function soundGameOver() {
  playTone(200, 0.2, "sawtooth", 0.12);
  setTimeout(() => playTone(150, 0.25, "sawtooth", 0.12), 180);
  setTimeout(() => playTone(100, 0.4, "sawtooth", 0.15), 380);
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Piece {
  shape: number[][];
  color: string;
  highlight: string;
  shadow: string;
  row: number;
  col: number;
  defIndex: number;
}

type GameState = "start" | "playing" | "over";

// ── Helper: random bag (standard 7-bag randomizer) ────────────────────────────
function createBag(): number[] {
  const bag = [0, 1, 2, 3, 4, 5, 6];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BlockStack() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    state: GameState;
    grid: (null | { color: string; highlight: string; shadow: string })[][];
    piece: Piece;
    nextPiece: Piece;
    bag: number[];
    bagIndex: number;
    score: number;
    lines: number;
    level: number;
    dropInterval: number;
    dropAccum: number;
    lastTime: number;
    animId: number;
    highScore: number;
    flashRows: number[];
    flashTimer: number;
    softDrop: boolean;
    stats: { piecesPlaced: number; startTime: number };
  } | null>(null);

  const [overlay, setOverlay] = useState<{ state: GameState; score: number; lines: number; level: number; highScore: number }>({
    state: "start",
    score: 0,
    lines: 0,
    level: 1,
    highScore: 0,
  });

  // ── Initialize high score from localStorage ─────────────────────────────────
  useEffect(() => {
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem("blockstack_highscore") || "0", 10) || 0;
    } catch { /* ignore */ }
    setOverlay((o) => ({ ...o, highScore: hs }));
  }, []);

  // ── Piece factory ────────────────────────────────────────────────────────────
  const makePiece = useCallback((defIndex: number): Piece => {
    const d = PIECE_DEFS[defIndex];
    return {
      shape: d.shape.map((r) => [...r]),
      color: d.color,
      highlight: d.highlight,
      shadow: d.shadow,
      row: defIndex === 0 ? -1 : 0, // I-piece spawns a row higher
      col: Math.floor((COLS - d.shape[0].length) / 2),
      defIndex,
    };
  }, []);

  const nextFromBag = useCallback(
    (bag: number[], bagIndex: number): { piece: Piece; bag: number[]; bagIndex: number } => {
      if (bagIndex >= bag.length) {
        bag = createBag();
        bagIndex = 0;
      }
      const piece = makePiece(bag[bagIndex]);
      return { piece, bag, bagIndex: bagIndex + 1 };
    },
    [makePiece]
  );

  // ── Collision detection ──────────────────────────────────────────────────────
  const fits = useCallback(
    (
      grid: (null | { color: string; highlight: string; shadow: string })[][],
      shape: number[][],
      row: number,
      col: number
    ): boolean => {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
          if (!shape[r][c]) continue;
          const nr = row + r;
          const nc = col + c;
          if (nc < 0 || nc >= COLS || nr >= ROWS) return false;
          if (nr < 0) continue; // above top is ok
          if (grid[nr][nc]) return false;
        }
      }
      return true;
    },
    []
  );

  // ── Ghost row ────────────────────────────────────────────────────────────────
  const ghostRow = useCallback(
    (
      grid: (null | { color: string; highlight: string; shadow: string })[][],
      piece: Piece
    ): number => {
      let r = piece.row;
      while (fits(grid, piece.shape, r + 1, piece.col)) r++;
      return r;
    },
    [fits]
  );

  // ── Drawing helpers ──────────────────────────────────────────────────────────
  const drawCell = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      px: number,
      py: number,
      size: number,
      color: string,
      highlight: string,
      shadow: string,
      alpha = 1
    ) => {
      ctx.globalAlpha = alpha;
      // main fill
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      // top-left highlight
      ctx.fillStyle = highlight;
      ctx.fillRect(px + 1, py + 1, size - 2, 3);
      ctx.fillRect(px + 1, py + 1, 3, size - 2);
      // bottom-right shadow
      ctx.fillStyle = shadow;
      ctx.fillRect(px + 1, py + size - 4, size - 2, 3);
      ctx.fillRect(px + size - 4, py + 1, 3, size - 2);
      // inner shine
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(px + 4, py + 4, size - 8, size - 8);
      ctx.globalAlpha = 1;
    },
    []
  );

  // ── Start / Restart ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ensure audio context is created on user gesture
    try { getAudioCtx(); } catch { /* */ }

    let hs = 0;
    try { hs = parseInt(localStorage.getItem("blockstack_highscore") || "0", 10) || 0; } catch { /* */ }

    const grid: (null | { color: string; highlight: string; shadow: string })[][] = Array.from(
      { length: ROWS },
      () => Array(COLS).fill(null)
    );

    let bag = createBag();
    let bagIndex = 0;

    const r1 = nextFromBag(bag, bagIndex);
    const piece = r1.piece;
    bag = r1.bag;
    bagIndex = r1.bagIndex;

    const r2 = nextFromBag(bag, bagIndex);
    const nextPiece = r2.piece;
    bag = r2.bag;
    bagIndex = r2.bagIndex;

    const g = {
      state: "playing" as GameState,
      grid,
      piece,
      nextPiece,
      bag,
      bagIndex,
      score: 0,
      lines: 0,
      level: 1,
      dropInterval: 1000,
      dropAccum: 0,
      lastTime: performance.now(),
      animId: 0,
      highScore: hs,
      flashRows: [] as number[],
      flashTimer: 0,
      softDrop: false,
      stats: { piecesPlaced: 0, startTime: Date.now() },
    };
    gameRef.current = g;

    setOverlay({ state: "playing", score: 0, lines: 0, level: 1, highScore: hs });

    // ── Lock piece ──────────────────────────────────────────────────────────
    const lockPiece = () => {
      const p = g.piece;
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[0].length; c++) {
          if (!p.shape[r][c]) continue;
          const nr = p.row + r;
          const nc = p.col + c;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            g.grid[nr][nc] = { color: p.color, highlight: p.highlight, shadow: p.shadow };
          }
        }
      }
      g.stats.piecesPlaced++;
      soundDrop();

      // Check for line clears
      const cleared: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        if (g.grid[r].every((cell) => cell !== null)) {
          cleared.push(r);
        }
      }

      if (cleared.length > 0) {
        soundLineClear(cleared.length);
        g.flashRows = cleared;
        g.flashTimer = 18; // frames of flash animation
        const pts = [0, 100, 300, 500, 800];
        g.score += (pts[cleared.length] || 800) * g.level;
        g.lines += cleared.length;
        g.level = Math.floor(g.lines / 10) + 1;
        g.dropInterval = Math.max(50, 1000 - (g.level - 1) * 80);
      }

      // Spawn next piece
      g.piece = g.nextPiece;
      const r3 = nextFromBag(g.bag, g.bagIndex);
      g.nextPiece = r3.piece;
      g.bag = r3.bag;
      g.bagIndex = r3.bagIndex;

      if (!fits(g.grid, g.piece.shape, g.piece.row, g.piece.col)) {
        // game over
        g.state = "over";
        soundGameOver();
        if (g.score > g.highScore) {
          g.highScore = g.score;
          try { localStorage.setItem("blockstack_highscore", String(g.score)); } catch { /* */ }
        }
        setOverlay({ state: "over", score: g.score, lines: g.lines, level: g.level, highScore: g.highScore });
      }

      g.dropAccum = 0;
    };

    // ── Remove cleared rows after flash ─────────────────────────────────────
    const removeClearedRows = () => {
      // Remove rows from bottom up
      const rows = [...g.flashRows].sort((a, b) => b - a);
      for (const r of rows) {
        g.grid.splice(r, 1);
        g.grid.unshift(Array(COLS).fill(null));
      }
      g.flashRows = [];
    };

    // ── Rotate with wall kicks ──────────────────────────────────────────────
    const tryRotate = () => {
      const rotated = rotateCW(g.piece.shape);
      for (const [dc, dr] of KICKS) {
        if (fits(g.grid, rotated, g.piece.row + dr, g.piece.col + dc)) {
          g.piece.shape = rotated;
          g.piece.row += dr;
          g.piece.col += dc;
          return;
        }
      }
    };

    // ── Hard drop ───────────────────────────────────────────────────────────
    const hardDrop = () => {
      const gr = ghostRow(g.grid, g.piece);
      g.score += (gr - g.piece.row) * 2;
      g.piece.row = gr;
      lockPiece();
    };

    // ── Input handling ──────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (g.state !== "playing") return;
      if (g.flashTimer > 0) return; // no input during flash
      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          if (fits(g.grid, g.piece.shape, g.piece.row, g.piece.col - 1)) g.piece.col--;
          break;
        case "ArrowRight":
          e.preventDefault();
          if (fits(g.grid, g.piece.shape, g.piece.row, g.piece.col + 1)) g.piece.col++;
          break;
        case "ArrowDown":
          e.preventDefault();
          g.softDrop = true;
          if (fits(g.grid, g.piece.shape, g.piece.row + 1, g.piece.col)) {
            g.piece.row++;
            g.score += 1;
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          tryRotate();
          break;
        case "Space":
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") g.softDrop = false;
    };

    // Expose actions for mobile buttons
    (g as any).actions = { tryRotate, hardDrop, lockPiece };
    (g as any).tryMoveLeft = () => {
      if (g.state !== "playing" || g.flashTimer > 0) return;
      if (fits(g.grid, g.piece.shape, g.piece.row, g.piece.col - 1)) g.piece.col--;
    };
    (g as any).tryMoveRight = () => {
      if (g.state !== "playing" || g.flashTimer > 0) return;
      if (fits(g.grid, g.piece.shape, g.piece.row, g.piece.col + 1)) g.piece.col++;
    };
    (g as any).tryRotate = () => {
      if (g.state !== "playing" || g.flashTimer > 0) return;
      tryRotate();
    };
    (g as any).trySoftDrop = () => {
      if (g.state !== "playing" || g.flashTimer > 0) return;
      if (fits(g.grid, g.piece.shape, g.piece.row + 1, g.piece.col)) {
        g.piece.row++;
        g.score += 1;
      }
    };
    (g as any).tryHardDrop = () => {
      if (g.state !== "playing" || g.flashTimer > 0) return;
      hardDrop();
    };

    // ── Game loop ───────────────────────────────────────────────────────────
    const loop = (now: number) => {
      const dt = now - g.lastTime;
      g.lastTime = now;

      // ── Update ──────────────────────────────────────────────────────────
      if (g.state === "playing") {
        // Flash animation
        if (g.flashTimer > 0) {
          g.flashTimer--;
          if (g.flashTimer === 0) {
            removeClearedRows();
            setOverlay({ state: "playing", score: g.score, lines: g.lines, level: g.level, highScore: g.highScore });
          }
        } else {
          // Gravity
          const interval = g.softDrop ? Math.min(g.dropInterval, 50) : g.dropInterval;
          g.dropAccum += dt;
          if (g.dropAccum >= interval) {
            g.dropAccum -= interval;
            if (fits(g.grid, g.piece.shape, g.piece.row + 1, g.piece.col)) {
              g.piece.row++;
              if (g.softDrop) g.score += 1;
            } else {
              lockPiece();
            }
          }
        }
      }

      // Update overlay score periodically
      if (g.state === "playing") {
        setOverlay({ state: "playing", score: g.score, lines: g.lines, level: g.level, highScore: g.highScore });
      }

      // ── Draw ────────────────────────────────────────────────────────────
      ctx.fillStyle = "#0f0f13";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Board background
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);

      // Grid lines
      ctx.strokeStyle = "#1a1a24";
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CS);
        ctx.lineTo(BOARD_W, r * CS);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CS, 0);
        ctx.lineTo(c * CS, BOARD_H);
        ctx.stroke();
      }

      // Board border
      ctx.strokeStyle = "#2a2a3a";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, BOARD_W, BOARD_H);

      // Locked cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = g.grid[r][c];
          if (cell) {
            // Flash animation
            if (g.flashTimer > 0 && g.flashRows.includes(r)) {
              const flash = Math.sin(g.flashTimer * 0.8) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(255,255,255,${flash * 0.7})`;
              ctx.fillRect(c * CS + 1, r * CS + 1, CS - 2, CS - 2);
            } else {
              drawCell(ctx, c * CS, r * CS, CS, cell.color, cell.highlight, cell.shadow);
            }
          }
        }
      }

      // Ghost piece
      if (g.state === "playing" && g.flashTimer === 0) {
        const gr = ghostRow(g.grid, g.piece);
        if (gr !== g.piece.row) {
          for (let r = 0; r < g.piece.shape.length; r++) {
            for (let c = 0; c < g.piece.shape[0].length; c++) {
              if (!g.piece.shape[r][c]) continue;
              const px = (g.piece.col + c) * CS;
              const py = (gr + r) * CS;
              ctx.strokeStyle = g.piece.color;
              ctx.globalAlpha = 0.3;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(px + 2, py + 2, CS - 4, CS - 4);
              ctx.fillStyle = g.piece.color;
              ctx.globalAlpha = 0.08;
              ctx.fillRect(px + 2, py + 2, CS - 4, CS - 4);
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      // Active piece
      if (g.state === "playing" && g.flashTimer === 0) {
        for (let r = 0; r < g.piece.shape.length; r++) {
          for (let c = 0; c < g.piece.shape[0].length; c++) {
            if (!g.piece.shape[r][c]) continue;
            const pr = g.piece.row + r;
            if (pr < 0) continue;
            drawCell(ctx, (g.piece.col + c) * CS, pr * CS, CS, g.piece.color, g.piece.highlight, g.piece.shadow);
          }
        }
      }

      // ── Sidebar ─────────────────────────────────────────────────────────
      const sx = BOARD_W + 12;
      ctx.fillStyle = "#c8c8d8";
      ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "left";

      // Next piece
      ctx.fillStyle = "#888898";
      ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("NEXT", sx, 20);

      ctx.strokeStyle = "#2a2a3a";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - 2, 28, 110, 70);

      if (g.nextPiece) {
        const ns = g.nextPiece.shape;
        const nRows = ns.length;
        const nCols = ns[0].length;
        const cellSize = 22;
        const offsetX = sx + (110 - nCols * cellSize) / 2;
        const offsetY = 28 + (70 - nRows * cellSize) / 2;
        for (let r = 0; r < nRows; r++) {
          for (let c = 0; c < nCols; c++) {
            if (ns[r][c]) {
              drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, g.nextPiece.color, g.nextPiece.highlight, g.nextPiece.shadow);
            }
          }
        }
      }

      // Score
      ctx.fillStyle = "#888898";
      ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("SCORE", sx, 125);
      ctx.fillStyle = "#e8e8f0";
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(String(g.score), sx, 148);

      // Lines
      ctx.fillStyle = "#888898";
      ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("LINES", sx, 178);
      ctx.fillStyle = "#e8e8f0";
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(String(g.lines), sx, 201);

      // Level
      ctx.fillStyle = "#888898";
      ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("LEVEL", sx, 231);
      ctx.fillStyle = "#e8e8f0";
      ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(String(g.level), sx, 254);

      // High score
      ctx.fillStyle = "#888898";
      ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("HIGH SCORE", sx, 290);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(String(g.highScore), sx, 312);

      // Controls hint
      ctx.fillStyle = "#555568";
      ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("\u2190\u2192 Move", sx, 370);
      ctx.fillText("\u2191  Rotate", sx, 386);
      ctx.fillText("\u2193  Soft drop", sx, 402);
      ctx.fillText("Space Hard drop", sx, 418);

      g.animId = requestAnimationFrame(loop);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    g.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(g.animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fits, ghostRow, drawCell, makePiece, nextFromBag]);

  // ── Effect to run / cleanup the game ─────────────────────────────────────
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleStart = useCallback(() => {
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = startGame() || null;
  }, [startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  // ── Mobile button handler ────────────────────────────────────────────────
  const mobileAction = useCallback((action: string) => {
    const g = gameRef.current as any;
    if (!g) return;
    switch (action) {
      case "left": g.tryMoveLeft?.(); break;
      case "right": g.tryMoveRight?.(); break;
      case "rotate": g.tryRotate?.(); break;
      case "softdrop": g.trySoftDrop?.(); break;
      case "harddrop": g.tryHardDrop?.(); break;
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const btnStyle: React.CSSProperties = {
    width: 54,
    height: 54,
    borderRadius: 12,
    border: "1px solid #333",
    background: "#1a1a24",
    color: "#ccc",
    fontSize: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  };

  const overlayBase: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: BOARD_W,
    height: BOARD_H,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,15,0.92)",
    zIndex: 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, gap: 12 }}>
      {/* Canvas + overlays */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ borderRadius: 8, display: "block", background: "#0f0f13" }}
        />

        {/* Start screen overlay */}
        {overlay.state === "start" && (
          <div style={overlayBase}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#e8e8f0", marginBottom: 4, letterSpacing: 1 }}>
              BLOCK STACK
            </div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 24 }}>Falling blocks puzzle</div>
            {overlay.highScore > 0 && (
              <div style={{ fontSize: 13, color: "#fbbf24", marginBottom: 16 }}>
                High Score: {overlay.highScore}
              </div>
            )}
            <button
              onClick={handleStart}
              style={{
                padding: "12px 36px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                color: "#fff",
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              START
            </button>
            <div style={{ fontSize: 11, color: "#555", marginTop: 20, textAlign: "center", lineHeight: 1.7 }}>
              Arrow keys to move / rotate
              <br />
              Space to hard drop
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {overlay.state === "over" && (
          <div style={overlayBase}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#ef4444", marginBottom: 16, letterSpacing: 1 }}>
              GAME OVER
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, alignItems: "center" }}>
              <div style={{ fontSize: 14, color: "#ccc" }}>
                Score: <span style={{ color: "#e8e8f0", fontWeight: 700 }}>{overlay.score}</span>
              </div>
              <div style={{ fontSize: 14, color: "#ccc" }}>
                Lines: <span style={{ color: "#e8e8f0", fontWeight: 700 }}>{overlay.lines}</span>
              </div>
              <div style={{ fontSize: 14, color: "#ccc" }}>
                Level: <span style={{ color: "#e8e8f0", fontWeight: 700 }}>{overlay.level}</span>
              </div>
              {overlay.score >= overlay.highScore && overlay.score > 0 && (
                <div style={{ fontSize: 14, color: "#fbbf24", fontWeight: 700, marginTop: 4 }}>
                  NEW HIGH SCORE!
                </div>
              )}
            </div>
            <button
              onClick={handleStart}
              style={{
                padding: "12px 36px",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                color: "#fff",
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          maxWidth: CANVAS_W,
        }}
      >
        <button
          style={btnStyle}
          onPointerDown={(e) => { e.preventDefault(); mobileAction("left"); }}
          aria-label="Move left"
        >
          &#x25C0;
        </button>
        <button
          style={btnStyle}
          onPointerDown={(e) => { e.preventDefault(); mobileAction("rotate"); }}
          aria-label="Rotate"
        >
          &#x21BB;
        </button>
        <button
          style={btnStyle}
          onPointerDown={(e) => { e.preventDefault(); mobileAction("softdrop"); }}
          aria-label="Soft drop"
        >
          &#x25BC;
        </button>
        <button
          style={{ ...btnStyle, width: 80, fontSize: 13, fontWeight: 700 }}
          onPointerDown={(e) => { e.preventDefault(); mobileAction("harddrop"); }}
          aria-label="Hard drop"
        >
          DROP
        </button>
        <button
          style={btnStyle}
          onPointerDown={(e) => { e.preventDefault(); mobileAction("right"); }}
          aria-label="Move right"
        >
          &#x25B6;
        </button>
      </div>
    </div>
  );
}
