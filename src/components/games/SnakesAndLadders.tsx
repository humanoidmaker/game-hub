"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ── constants ── */
const BOARD_SIZE = 10;
const TOTAL = 100;
const CELL_PX = 56; // each cell is 56×56
const BOARD_PX = CELL_PX * BOARD_SIZE; // 560

const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};
const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};

const PLAYER_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"];
const PLAYER_NAMES = ["You", "Bot 1", "Bot 2", "Bot 3"];
const LIGHT_SQ = "#e8dcc8";
const DARK_SQ = "#b8a88a";

/* ── helpers ── */

/** Convert 1-based board position → pixel center (x, y) using boustrophedon numbering */
function posToXY(pos: number): { x: number; y: number } {
  if (pos < 1) return { x: CELL_PX / 2, y: BOARD_PX - CELL_PX / 2 };
  const p = pos - 1;
  const rowFromBottom = Math.floor(p / BOARD_SIZE); // 0 = bottom row
  const colInRow = p % BOARD_SIZE;
  const col = rowFromBottom % 2 === 0 ? colInRow : BOARD_SIZE - 1 - colInRow;
  const row = BOARD_SIZE - 1 - rowFromBottom; // canvas row 0 = top
  return { x: col * CELL_PX + CELL_PX / 2, y: row * CELL_PX + CELL_PX / 2 };
}

/** Board number at canvas grid (row, col) where row 0 = top */
function numberAt(row: number, col: number): number {
  const rowFromBottom = BOARD_SIZE - 1 - row;
  if (rowFromBottom % 2 === 0) return rowFromBottom * BOARD_SIZE + col + 1;
  return rowFromBottom * BOARD_SIZE + (BOARD_SIZE - 1 - col) + 1;
}

/* ── dice dot positions (center offsets within a dice face of size s) ── */
function diceDots(value: number, s: number): { cx: number; cy: number }[] {
  const q = s / 4;
  const positions: Record<number, { cx: number; cy: number }[]> = {
    1: [{ cx: s / 2, cy: s / 2 }],
    2: [{ cx: q, cy: q }, { cx: s - q, cy: s - q }],
    3: [{ cx: q, cy: q }, { cx: s / 2, cy: s / 2 }, { cx: s - q, cy: s - q }],
    4: [{ cx: q, cy: q }, { cx: s - q, cy: q }, { cx: q, cy: s - q }, { cx: s - q, cy: s - q }],
    5: [{ cx: q, cy: q }, { cx: s - q, cy: q }, { cx: s / 2, cy: s / 2 }, { cx: q, cy: s - q }, { cx: s - q, cy: s - q }],
    6: [{ cx: q, cy: q }, { cx: s - q, cy: q }, { cx: q, cy: s / 2 }, { cx: s - q, cy: s / 2 }, { cx: q, cy: s - q }, { cx: s - q, cy: s - q }],
  };
  return positions[value] || [];
}

/* ── draw helpers ── */

function drawBoard(ctx: CanvasRenderingContext2D) {
  // Squares
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const x = c * CELL_PX;
      const y = r * CELL_PX;
      ctx.fillStyle = (r + c) % 2 === 0 ? LIGHT_SQ : DARK_SQ;
      ctx.fillRect(x, y, CELL_PX, CELL_PX);
      // number
      const num = numberAt(r, c);
      ctx.fillStyle = "#555";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(String(num), x + 3, y + 2);
    }
  }
  // Grid lines
  ctx.strokeStyle = "#9a8a6a";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= BOARD_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_PX, 0);
    ctx.lineTo(i * CELL_PX, BOARD_PX);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_PX);
    ctx.lineTo(BOARD_PX, i * CELL_PX);
    ctx.stroke();
  }
}

function drawLadder(ctx: CanvasRenderingContext2D, from: number, to: number) {
  const a = posToXY(from);
  const b = posToXY(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // perpendicular offset for rails
  const px = (-dy / len) * 10;
  const py = (dx / len) * 10;

  // rails
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x + px, a.y + py);
  ctx.lineTo(b.x + px, b.y + py);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(a.x - px, a.y - py);
  ctx.lineTo(b.x - px, b.y - py);
  ctx.stroke();

  // rungs
  const rungCount = Math.max(3, Math.round(len / 30));
  ctx.strokeStyle = "#DAA520";
  ctx.lineWidth = 2;
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const rx = a.x + dx * t;
    const ry = a.y + dy * t;
    ctx.beginPath();
    ctx.moveTo(rx + px, ry + py);
    ctx.lineTo(rx - px, ry - py);
    ctx.stroke();
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, head: number, tail: number) {
  const h = posToXY(head);
  const t = posToXY(tail);
  const dx = t.x - h.x;
  const dy = t.y - h.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Draw wavy body
  const segments = 40;
  const amplitude = 12;
  const freq = 3;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const frac = i / segments;
    const bx = h.x + dx * frac;
    const by = h.y + dy * frac;
    const wave = Math.sin(frac * Math.PI * 2 * freq) * amplitude * (1 - 0.3 * frac);
    const px = bx + nx * wave;
    const py = by + ny * wave;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Green accent line (thinner)
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const frac = i / segments;
    const bx = h.x + dx * frac;
    const by = h.y + dy * frac;
    const wave = Math.sin(frac * Math.PI * 2 * freq) * amplitude * (1 - 0.3 * frac);
    const px = bx + nx * wave;
    const py = by + ny * wave;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Head circle with eyes
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Eyes
  const eyeOff = 3;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(h.x - eyeOff, h.y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(h.x + eyeOff, h.y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(h.x - eyeOff, h.y - 2, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(h.x + eyeOff, h.y - 2, 1, 0, Math.PI * 2);
  ctx.fill();

  // Tail (small tapered point)
  ctx.fillStyle = "#dc2626";
  const lastWave = Math.sin(Math.PI * 2 * freq) * amplitude * 0.7;
  const tx = t.x + nx * lastWave;
  const ty = t.y + ny * lastWave;
  ctx.beginPath();
  ctx.arc(tx, ty, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawTokens(
  ctx: CanvasRenderingContext2D,
  positions: number[],
  numPlayers: number,
  animatingPlayer: number | null,
  animPos: { x: number; y: number } | null
) {
  // Group tokens by position to stack them
  const atPos: Record<number, number[]> = {};
  for (let i = 0; i < numPlayers; i++) {
    if (positions[i] < 1) continue;
    const p = positions[i];
    if (!atPos[p]) atPos[p] = [];
    atPos[p].push(i);
  }

  // Draw non-animating tokens
  for (const [posStr, players] of Object.entries(atPos)) {
    const pos = Number(posStr);
    const { x, y } = posToXY(pos);
    const count = players.length;
    players.forEach((pi, idx) => {
      if (pi === animatingPlayer && animPos) return; // skip animating one
      const offX = count > 1 ? (idx - (count - 1) / 2) * 12 : 0;
      const offY = count > 2 ? (idx >= 2 ? 8 : -4) : 0;
      drawToken(ctx, x + offX, y + offY, PLAYER_COLORS[pi], pi);
    });
  }

  // Draw animating token on top
  if (animatingPlayer !== null && animPos) {
    drawToken(ctx, animPos.x, animPos.y, PLAYER_COLORS[animatingPlayer], animatingPlayer);
  }
}

function drawToken(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, idx: number) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.arc(x + 1, y + 2, 11, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Label
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`P${idx + 1}`, x, y + 1);
}

/* ── component ── */

interface GameState {
  positions: number[];
  currentPlayer: number;
  numPlayers: number;
  diceValue: number;
  gameOver: boolean;
  winner: number | null;
  message: string;
  rolling: boolean;
}

export default function SnakesAndLadders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [numPlayersChoice, setNumPlayersChoice] = useState(2);
  const [game, setGame] = useState<GameState>(() => initGame(2));
  const [animating, setAnimating] = useState(false);
  const [animPlayer, setAnimPlayer] = useState<number | null>(null);
  const [animXY, setAnimXY] = useState<{ x: number; y: number } | null>(null);

  function initGame(n: number): GameState {
    return {
      positions: [0, 0, 0, 0],
      currentPlayer: 0,
      numPlayers: n,
      diceValue: 0,
      gameOver: false,
      winner: null,
      message: "Roll the dice to start!",
      rolling: false,
    };
  }

  /* ── draw ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);
    drawBoard(ctx);
    // Draw ladders first (behind snakes)
    for (const [from, to] of Object.entries(LADDERS)) {
      drawLadder(ctx, Number(from), to);
    }
    for (const [head, tail] of Object.entries(SNAKES)) {
      drawSnake(ctx, Number(head), tail);
    }
    drawTokens(ctx, game.positions, game.numPlayers, animPlayer, animXY);
  }, [game.positions, game.numPlayers, animPlayer, animXY]);

  useEffect(() => {
    draw();
  }, [draw]);

  /* ── animate token movement step-by-step ── */
  function animateMove(
    playerIdx: number,
    fromPos: number,
    toPos: number,
    finalPos: number, // after snake/ladder
    onDone: (landed: number) => void
  ) {
    setAnimating(true);
    setAnimPlayer(playerIdx);

    const steps: number[] = [];
    // Walk forward step by step
    if (toPos > fromPos) {
      for (let i = fromPos + 1; i <= toPos; i++) steps.push(i);
    } else {
      // Bounce back
      for (let i = fromPos + 1; i <= fromPos + (fromPos + 6 - toPos); i++) {
        if (i <= 100) steps.push(i);
      }
      for (let i = 100; i >= toPos; i--) steps.push(i);
    }

    let idx = 0;
    function tick() {
      if (idx < steps.length) {
        const xy = posToXY(steps[idx]);
        setAnimXY(xy);
        idx++;
        animFrameRef.current = window.setTimeout(tick, 120) as unknown as number;
      } else if (toPos !== finalPos) {
        // Snake or ladder animation
        const start = posToXY(toPos);
        const end = posToXY(finalPos);
        let t = 0;
        const slideTotalFrames = 15;
        function slide() {
          t++;
          const frac = t / slideTotalFrames;
          setAnimXY({
            x: start.x + (end.x - start.x) * frac,
            y: start.y + (end.y - start.y) * frac,
          });
          if (t < slideTotalFrames) {
            animFrameRef.current = window.setTimeout(slide, 40) as unknown as number;
          } else {
            setAnimPlayer(null);
            setAnimXY(null);
            setAnimating(false);
            onDone(finalPos);
          }
        }
        animFrameRef.current = window.setTimeout(slide, 300) as unknown as number;
      } else {
        setAnimPlayer(null);
        setAnimXY(null);
        setAnimating(false);
        onDone(finalPos);
      }
    }
    tick();
  }

  /* ── dice roll animation ── */
  function animateDiceRoll(finalValue: number, onDone: () => void) {
    let count = 0;
    const total = 8;
    function tick() {
      setGame((g) => ({ ...g, diceValue: Math.floor(Math.random() * 6) + 1 }));
      count++;
      if (count < total) {
        setTimeout(tick, 80);
      } else {
        setGame((g) => ({ ...g, diceValue: finalValue }));
        setTimeout(onDone, 200);
      }
    }
    tick();
  }

  /* ── process a single turn ── */
  function processTurn(g: GameState): void {
    if (g.gameOver || animating) return;

    const dice = Math.floor(Math.random() * 6) + 1;
    const cp = g.currentPlayer;
    const curPos = g.positions[cp];

    setGame((prev) => ({ ...prev, rolling: true, message: `${PLAYER_NAMES[cp]} rolling...` }));

    animateDiceRoll(dice, () => {
      let newPos = curPos + dice;
      let finalPos = newPos;

      // Overshoot bounce back
      if (newPos > TOTAL) {
        const overshoot = newPos - TOTAL;
        newPos = TOTAL - overshoot;
        finalPos = newPos;
      }

      // Check snake or ladder at landing
      if (SNAKES[newPos]) finalPos = SNAKES[newPos];
      else if (LADDERS[newPos]) finalPos = LADDERS[newPos];

      const displayPos = newPos; // where we walk to before snake/ladder

      animateMove(cp, curPos, displayPos, finalPos, (landed) => {
        setGame((prev) => {
          const newPositions = [...prev.positions];
          newPositions[cp] = landed;
          const won = landed === 100;
          const nextPlayer = won ? cp : (cp + 1) % prev.numPlayers;
          let msg = `${PLAYER_NAMES[cp]} rolled ${dice}`;
          if (curPos + dice > TOTAL) msg += " (bounced back)";
          if (SNAKES[displayPos]) msg += " — bitten by a snake!";
          else if (LADDERS[displayPos]) msg += " — climbed a ladder!";
          if (won) msg = `${PLAYER_NAMES[cp]} wins! 🎉`;
          else msg += `. ${PLAYER_NAMES[nextPlayer]}'s turn.`;

          return {
            ...prev,
            positions: newPositions,
            currentPlayer: nextPlayer,
            gameOver: won,
            winner: won ? cp : null,
            message: msg,
            rolling: false,
          };
        });
      });
    });
  }

  /* ── bot auto-play ── */
  useEffect(() => {
    if (game.gameOver || animating || game.rolling) return;
    if (game.currentPlayer === 0) return; // human
    const timer = setTimeout(() => {
      processTurn(game);
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.currentPlayer, game.gameOver, animating, game.rolling]);

  /* ── cleanup animation timers ── */
  useEffect(() => {
    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
    };
  }, []);

  /* ── handlers ── */
  function handleRoll() {
    if (game.currentPlayer !== 0 || game.gameOver || animating || game.rolling) return;
    processTurn(game);
  }

  function handleNewGame() {
    if (animFrameRef.current) clearTimeout(animFrameRef.current);
    setAnimating(false);
    setAnimPlayer(null);
    setAnimXY(null);
    setGame(initGame(numPlayersChoice));
  }

  /* ── dice face SVG ── */
  const diceSize = 64;
  const dotR = 5;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: "#0a0a1a",
        minHeight: "100vh",
        color: "#e0e0e0",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ margin: "0 0 8px", color: "#f5f5f5", fontSize: 24 }}>
        Snakes & Ladders
      </h2>

      {/* Message */}
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 16,
          color: game.gameOver ? "#10b981" : "#ccc",
          minHeight: 24,
          fontWeight: game.gameOver ? 700 : 400,
        }}
      >
        {game.message}
      </p>

      {/* Player scores */}
      <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 14 }}>
        {Array.from({ length: game.numPlayers }, (_, i) => (
          <span
            key={i}
            style={{
              color: PLAYER_COLORS[i],
              fontWeight: game.currentPlayer === i && !game.gameOver ? 700 : 400,
              textDecoration: game.currentPlayer === i && !game.gameOver ? "underline" : "none",
            }}
          >
            {PLAYER_NAMES[i]}: {game.positions[i]}
          </span>
        ))}
      </div>

      {/* Board */}
      <canvas
        ref={canvasRef}
        width={BOARD_PX}
        height={BOARD_PX}
        style={{
          border: "3px solid #444",
          borderRadius: 6,
          cursor: game.currentPlayer === 0 && !game.gameOver && !animating ? "pointer" : "default",
          maxWidth: "90vw",
          maxHeight: "90vw",
        }}
        onClick={handleRoll}
      />

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
        {/* Dice */}
        <div
          onClick={handleRoll}
          style={{
            cursor:
              game.currentPlayer === 0 && !game.gameOver && !animating && !game.rolling
                ? "pointer"
                : "default",
            opacity: game.currentPlayer === 0 && !game.gameOver ? 1 : 0.5,
          }}
          title="Click to roll"
        >
          <svg width={diceSize} height={diceSize} viewBox={`0 0 ${diceSize} ${diceSize}`}>
            <rect
              x={2}
              y={2}
              width={diceSize - 4}
              height={diceSize - 4}
              rx={8}
              fill="#1e1e2e"
              stroke="#555"
              strokeWidth={2}
            />
            {game.diceValue > 0 &&
              diceDots(game.diceValue, diceSize - 8).map((d, i) => (
                <circle key={i} cx={d.cx + 4} cy={d.cy + 4} r={dotR} fill="#fff" />
              ))}
            {game.diceValue === 0 && (
              <text
                x={diceSize / 2}
                y={diceSize / 2 + 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#888"
                fontSize={22}
                fontWeight={700}
              >
                ?
              </text>
            )}
          </svg>
        </div>

        {/* Player count */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#888" }}>Players</span>
          <select
            value={numPlayersChoice}
            onChange={(e) => setNumPlayersChoice(Number(e.target.value))}
            style={{
              background: "#1e1e2e",
              color: "#ccc",
              border: "1px solid #555",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>

        {/* New Game */}
        <button
          onClick={handleNewGame}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: "#10b981",
            color: "#000",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          New Game
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 20,
          fontSize: 12,
          color: "#888",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span>
          <span style={{ color: "#dc2626" }}>&#9679;</span> Snakes (go down)
        </span>
        <span>
          <span style={{ color: "#8B4513" }}>&#9650;</span> Ladders (go up)
        </span>
        <span>Click dice or board to roll (your turn)</span>
      </div>
    </div>
  );
}
