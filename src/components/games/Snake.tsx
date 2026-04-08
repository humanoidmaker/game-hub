"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_SIZE = 400;
const CELL_SIZE = 20;
const GRID = CANVAS_SIZE / CELL_SIZE; // 20
const BG_COLOR = "#0a0a1a";
const GRID_COLOR = "rgba(255,255,255,0.04)";
const INITIAL_SPEED = 8; // move every N frames (lower = faster)
const MIN_SPEED = 3;
const SPEED_INCREASE_INTERVAL = 5;
const LS_KEY = "snake_high_score";

type Vec = { x: number; y: number };
type GameState = "idle" | "playing" | "dead";

function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playEatSound(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587, ctx.currentTime);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function playDeathSound(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

function getInitialSnake(): Vec[] {
  return [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
}

function spawnFood(snake: Vec[]): Vec {
  let x: number, y: number;
  do {
    x = Math.floor(Math.random() * GRID);
    y = Math.floor(Math.random() * GRID);
  } while (snake.some((s) => s.x === x && s.y === y));
  return { x, y };
}

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("idle");

  // Mutable game state lives in a ref so the animation loop always has current values
  const gs = useRef({
    snake: getInitialSnake(),
    dir: { x: 1, y: 0 } as Vec,
    nextDir: { x: 1, y: 0 } as Vec,
    food: { x: 15, y: 10 } as Vec,
    score: 0,
    speed: INITIAL_SPEED,
    state: "idle" as GameState,
    frame: 0,
  });

  // Load high score from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setHighScore(parseInt(stored, 10) || 0);
    } catch {}
  }, []);

  const saveHighScore = useCallback((val: number) => {
    setHighScore((prev) => {
      const next = Math.max(prev, val);
      try {
        localStorage.setItem(LS_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    const g = gs.current;
    g.snake = getInitialSnake();
    g.dir = { x: 1, y: 0 };
    g.nextDir = { x: 1, y: 0 };
    g.food = spawnFood(g.snake);
    g.score = 0;
    g.speed = INITIAL_SPEED;
    g.state = "playing";
    g.frame = 0;
    setScore(0);
    setGameState("playing");
  }, []);

  const startGame = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = createAudioContext();
    }
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    resetGame();
  }, [resetGame]);

  const changeDirection = useCallback((dir: Vec) => {
    const g = gs.current;
    // Prevent reversing into yourself
    if (dir.x === -g.dir.x && dir.y === -g.dir.y) return;
    g.nextDir = dir;
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gs.current;

      const dirMap: Record<string, Vec> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        KeyW: { x: 0, y: -1 },
        KeyS: { x: 0, y: 1 },
        KeyA: { x: -1, y: 0 },
        KeyD: { x: 1, y: 0 },
      };

      if (g.state === "idle") {
        startGame();
        const nd = dirMap[e.code];
        if (nd) changeDirection(nd);
        e.preventDefault();
        return;
      }

      if (g.state === "dead") {
        startGame();
        e.preventDefault();
        return;
      }

      const nd = dirMap[e.code];
      if (nd) {
        changeDirection(nd);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame, changeDirection]);

  // Main game / render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;

    const drawGrid = () => {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_SIZE; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_SIZE; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
      }
    };

    const drawSnake = (snake: Vec[], dir: Vec) => {
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const px = seg.x * CELL_SIZE;
        const py = seg.y * CELL_SIZE;
        const isHead = i === 0;

        if (isHead) {
          // Darker green head with gradient
          const grad = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
          grad.addColorStop(0, "#15803d");
          grad.addColorStop(1, "#166534");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          ctx.fill();

          // Eyes
          const cx = px + CELL_SIZE / 2;
          const cy = py + CELL_SIZE / 2;
          let e1x: number, e1y: number, e2x: number, e2y: number;

          if (dir.x === 1) {
            // right
            e1x = cx + 3; e1y = cy - 4;
            e2x = cx + 3; e2y = cy + 4;
          } else if (dir.x === -1) {
            // left
            e1x = cx - 3; e1y = cy - 4;
            e2x = cx - 3; e2y = cy + 4;
          } else if (dir.y === -1) {
            // up
            e1x = cx - 4; e1y = cy - 3;
            e2x = cx + 4; e2y = cy - 3;
          } else {
            // down
            e1x = cx - 4; e1y = cy + 3;
            e2x = cx + 4; e2y = cy + 3;
          }

          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(e1x, e1y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e2x, e2y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Pupils
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(e1x + dir.x * 0.8, e1y + dir.y * 0.8, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e2x + dir.x * 0.8, e2y + dir.y * 0.8, 1.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Body with gradient getting lighter toward tail
          const t = i / Math.max(snake.length - 1, 1);
          const r = Math.round(22 + t * 10);
          const g = Math.round(163 + t * 30);
          const b = Math.round(74 + t * 10);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.roundRect(px + 1.5, py + 1.5, CELL_SIZE - 3, CELL_SIZE - 3, 3);
          ctx.fill();
        }
      }
    };

    const drawFood = (food: Vec) => {
      const px = food.x * CELL_SIZE + CELL_SIZE / 2;
      const py = food.y * CELL_SIZE + CELL_SIZE / 2;
      const r = CELL_SIZE / 2 - 2;

      // Red circle with radial gradient
      const grad = ctx.createRadialGradient(px - 2, py - 2, 1, px, py, r);
      grad.addColorStop(0, "#ff6b6b");
      grad.addColorStop(1, "#dc2626");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      // Small highlight
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(px - 2, py - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Tiny stem
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py - r + 1);
      ctx.lineTo(px + 1, py - r - 2);
      ctx.stroke();
    };

    const drawHUD = (sc: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 13px 'Inter', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Score: ${sc}`, 8, 6);
    };

    const drawOverlay = (text: string, subtext: string, color: string) => {
      // Dim background
      ctx.fillStyle = "rgba(10,10,26,0.75)";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = color;
      ctx.font = "bold 26px 'Inter', system-ui, sans-serif";
      ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 16);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "15px 'Inter', system-ui, sans-serif";
      ctx.fillText(subtext, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 16);
    };

    const loop = () => {
      const g = gs.current;
      g.frame++;

      // --- Update ---
      if (g.state === "playing" && g.frame % g.speed === 0) {
        g.dir = { ...g.nextDir };
        const head: Vec = {
          x: g.snake[0].x + g.dir.x,
          y: g.snake[0].y + g.dir.y,
        };

        // Wall wrapping
        if (head.x < 0) head.x = GRID - 1;
        if (head.x >= GRID) head.x = 0;
        if (head.y < 0) head.y = GRID - 1;
        if (head.y >= GRID) head.y = 0;

        // Self-collision
        if (g.snake.some((s) => s.x === head.x && s.y === head.y)) {
          g.state = "dead";
          setGameState("dead");
          saveHighScore(g.score);
          playDeathSound(audioCtxRef.current);
        } else {
          g.snake.unshift(head);

          if (head.x === g.food.x && head.y === g.food.y) {
            g.score++;
            setScore(g.score);
            g.food = spawnFood(g.snake);
            playEatSound(audioCtxRef.current);

            // Increase speed every N items
            if (g.score % SPEED_INCREASE_INTERVAL === 0 && g.speed > MIN_SPEED) {
              g.speed--;
            }
          } else {
            g.snake.pop();
          }
        }
      }

      // --- Render ---
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      drawGrid();
      drawFood(g.food);
      drawSnake(g.snake, g.dir);
      drawHUD(g.score);

      if (g.state === "idle") {
        drawOverlay(
          "Snake",
          "Press any key or tap to start",
          "#22c55e"
        );
      } else if (g.state === "dead") {
        drawOverlay(
          `Game Over! Score: ${g.score}`,
          "Press any key or tap to play again",
          "#ef4444"
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [saveHighScore]);

  // Touch / click handler for start & restart (canvas)
  const handleCanvasTap = useCallback(() => {
    const g = gs.current;
    if (g.state === "idle" || g.state === "dead") {
      startGame();
    }
  }, [startGame]);

  // D-pad button handler
  const handleDPad = useCallback(
    (dir: Vec) => {
      const g = gs.current;
      if (g.state === "idle" || g.state === "dead") {
        startGame();
      }
      changeDirection(dir);
    },
    [startGame, changeDirection]
  );

  const btnBase: React.CSSProperties = {
    width: 52,
    height: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "rgba(255,255,255,0.7)",
    fontSize: 22,
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 16,
        background: BG_COLOR,
        borderRadius: 12,
        width: "fit-content",
        margin: "0 auto",
      }}
    >
      {/* Score bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: CANVAS_SIZE,
          color: "rgba(255,255,255,0.6)",
          fontSize: 14,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 600,
        }}
      >
        <span>Score: {score}</span>
        <span>High Score: {highScore}</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleCanvasTap}
        style={{
          borderRadius: 8,
          display: "block",
          maxWidth: "100%",
          cursor: gameState !== "playing" ? "pointer" : "default",
        }}
      />

      {/* Mobile D-pad */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px 52px 52px",
          gridTemplateRows: "52px 52px 52px",
          gap: 4,
          marginTop: 4,
        }}
      >
        <div />
        <button
          style={btnBase}
          onClick={() => handleDPad({ x: 0, y: -1 })}
          aria-label="Up"
        >
          ▲
        </button>
        <div />
        <button
          style={btnBase}
          onClick={() => handleDPad({ x: -1, y: 0 })}
          aria-label="Left"
        >
          ◀
        </button>
        <div />
        <button
          style={btnBase}
          onClick={() => handleDPad({ x: 1, y: 0 })}
          aria-label="Right"
        >
          ▶
        </button>
        <div />
        <button
          style={btnBase}
          onClick={() => handleDPad({ x: 0, y: 1 })}
          aria-label="Down"
        >
          ▼
        </button>
        <div />
      </div>

      <p
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          margin: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        Arrow keys or WASD to move
      </p>
    </div>
  );
}
