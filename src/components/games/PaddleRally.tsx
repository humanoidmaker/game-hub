"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const W = 400;
const H = 500;
const PADDLE_W = 70;
const PADDLE_H = 10;
const BALL_R = 6;
const PADDLE_MARGIN = 20;
const WIN_SCORE = 11;
const TRAIL_LENGTH = 8;
const INITIAL_SPEED = 4;

type Mode = "1p" | "2p";
type Screen = "menu" | "playing" | "gameover";

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

interface Trail {
  x: number;
  y: number;
  alpha: number;
}

/* ── Web Audio helpers ── */
function createAudioCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext | null,
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  vol = 0.12
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function soundPaddleHit(ctx: AudioContext | null) {
  playTone(ctx, 440, 0.08, "square", 0.15);
}
function soundWallBounce(ctx: AudioContext | null) {
  playTone(ctx, 300, 0.06, "triangle", 0.08);
}
function soundScore(ctx: AudioContext | null) {
  playTone(ctx, 220, 0.3, "sawtooth", 0.1);
}

export default function PaddleRally() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<Mode>("1p");
  const [scoreTop, setScoreTop] = useState(0);
  const [scoreBot, setScoreBot] = useState(0);
  const [winner, setWinner] = useState("");

  /* mutable game state kept in ref so the loop doesn't depend on React state */
  const gs = useRef({
    playerX: W / 2,
    topX: W / 2,
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: INITIAL_SPEED } as Ball,
    trail: [] as Trail[],
    sTop: 0,
    sBot: 0,
    running: false,
    mode: "1p" as Mode,
    keys: {} as Record<string, boolean>,
    mouseX: W / 2,
    paused: false,
  });

  /* ── reset ball to center with random angle ── */
  const resetBall = useCallback((towardTop: boolean) => {
    const g = gs.current;
    const angle = (Math.random() * 0.8 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
    const dir = towardTop ? -1 : 1;
    g.ball = {
      x: W / 2,
      y: H / 2,
      vx: Math.sin(angle) * INITIAL_SPEED,
      vy: Math.cos(angle) * INITIAL_SPEED * dir,
      speed: INITIAL_SPEED,
    };
    g.trail = [];
  }, []);

  /* ── start game ── */
  const startGame = useCallback(
    (m: Mode) => {
      if (!audioRef.current) audioRef.current = createAudioCtx();
      const g = gs.current;
      g.sTop = 0;
      g.sBot = 0;
      g.playerX = W / 2;
      g.topX = W / 2;
      g.mode = m;
      g.running = true;
      g.keys = {};
      g.trail = [];
      setScoreTop(0);
      setScoreBot(0);
      setWinner("");
      setMode(m);
      setScreen("playing");
      resetBall(Math.random() > 0.5);
    },
    [resetBall]
  );

  /* ── main game loop ── */
  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const g = gs.current;

    /* input handlers */
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      g.mouseX = Math.max(
        PADDLE_W / 2,
        Math.min(W - PADDLE_W / 2, ((e.clientX - rect.left) / rect.width) * W)
      );
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      g.mouseX = Math.max(
        PADDLE_W / 2,
        Math.min(W - PADDLE_W / 2, ((t.clientX - rect.left) / rect.width) * W)
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      g.keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      g.keys[e.code] = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const loop = () => {
      if (!g.running) return;

      /* ── update player paddle (bottom) ── */
      g.playerX = g.mouseX;

      /* ── update top paddle ── */
      if (g.mode === "1p") {
        /* bot AI: track ball with slight imperfection */
        const targetX = g.ball.x + g.ball.vx * 4;
        const diff = targetX - g.topX;
        const botSpeed = 4.2;
        if (Math.abs(diff) > 8) {
          g.topX += Math.sign(diff) * Math.min(botSpeed, Math.abs(diff));
        }
      } else {
        /* 2-player: WASD for top paddle */
        const speed2 = 6;
        if (g.keys["KeyA"]) g.topX -= speed2;
        if (g.keys["KeyD"]) g.topX += speed2;
      }
      g.topX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, g.topX));

      /* ── update ball ── */
      const b = g.ball;

      /* push trail */
      g.trail.push({ x: b.x, y: b.y, alpha: 1 });
      if (g.trail.length > TRAIL_LENGTH) g.trail.shift();

      b.x += b.vx;
      b.y += b.vy;

      /* wall bounce (left/right) */
      if (b.x - BALL_R <= 0) {
        b.x = BALL_R;
        b.vx = Math.abs(b.vx);
        soundWallBounce(audioRef.current);
      } else if (b.x + BALL_R >= W) {
        b.x = W - BALL_R;
        b.vx = -Math.abs(b.vx);
        soundWallBounce(audioRef.current);
      }

      /* bottom paddle collision (player) */
      const botPaddleY = H - PADDLE_MARGIN - PADDLE_H;
      if (
        b.vy > 0 &&
        b.y + BALL_R >= botPaddleY &&
        b.y + BALL_R <= botPaddleY + PADDLE_H + b.speed &&
        b.x >= g.playerX - PADDLE_W / 2 - BALL_R &&
        b.x <= g.playerX + PADDLE_W / 2 + BALL_R
      ) {
        const hitPos = (b.x - g.playerX) / (PADDLE_W / 2); // -1 to 1
        b.speed = Math.min(b.speed * 1.06, 12);
        const angle = hitPos * 1.1;
        b.vx = Math.sin(angle) * b.speed;
        b.vy = -Math.cos(angle) * b.speed;
        b.y = botPaddleY - BALL_R;
        soundPaddleHit(audioRef.current);
      }

      /* top paddle collision (bot / player 2) */
      const topPaddleY = PADDLE_MARGIN;
      if (
        b.vy < 0 &&
        b.y - BALL_R <= topPaddleY + PADDLE_H &&
        b.y - BALL_R >= topPaddleY - b.speed &&
        b.x >= g.topX - PADDLE_W / 2 - BALL_R &&
        b.x <= g.topX + PADDLE_W / 2 + BALL_R
      ) {
        const hitPos = (b.x - g.topX) / (PADDLE_W / 2);
        b.speed = Math.min(b.speed * 1.06, 12);
        const angle = hitPos * 1.1;
        b.vx = Math.sin(angle) * b.speed;
        b.vy = Math.cos(angle) * b.speed;
        b.y = topPaddleY + PADDLE_H + BALL_R;
        soundPaddleHit(audioRef.current);
      }

      /* scoring */
      if (b.y - BALL_R > H) {
        g.sTop++;
        setScoreTop(g.sTop);
        soundScore(audioRef.current);
        if (g.sTop >= WIN_SCORE) {
          g.running = false;
          const w = g.mode === "1p" ? "Bot" : "Player 1 (WASD)";
          setWinner(w);
          setScreen("gameover");
          return;
        }
        resetBall(false);
      }
      if (b.y + BALL_R < 0) {
        g.sBot++;
        setScoreBot(g.sBot);
        soundScore(audioRef.current);
        if (g.sBot >= WIN_SCORE) {
          g.running = false;
          const w = g.mode === "1p" ? "You" : "Player 2 (Mouse)";
          setWinner(w);
          setScreen("gameover");
          return;
        }
        resetBall(true);
      }

      /* ── draw ── */
      /* dark background */
      ctx.fillStyle = "#111118";
      ctx.fillRect(0, 0, W, H);

      /* center dashed line */
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#2a2a35";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      ctx.restore();

      /* ball trail */
      for (let i = 0; i < g.trail.length; i++) {
        const t = g.trail[i];
        const a = ((i + 1) / g.trail.length) * 0.35;
        ctx.beginPath();
        ctx.arc(t.x, t.y, BALL_R * ((i + 1) / g.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      }

      /* ball */
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      /* top paddle */
      const topLeft = g.topX - PADDLE_W / 2;
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      roundRect(ctx, topLeft, topPaddleY, PADDLE_W, PADDLE_H, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      /* bottom paddle */
      const botLeft = g.playerX - PADDLE_W / 2;
      ctx.fillStyle = "#3b82f6";
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 8;
      roundRect(ctx, botLeft, botPaddleY, PADDLE_W, PADDLE_H, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      /* scores */
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ef4444aa";
      ctx.fillText(String(g.sTop), W / 2, H / 2 - 16);
      ctx.fillStyle = "#3b82f6aa";
      ctx.fillText(String(g.sBot), W / 2, H / 2 + 34);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [screen, resetBall]);

  /* helper: rounded rectangle */
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ── menu screen ── */
  if (screen === "menu") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: W,
          height: H,
          background: "#111118",
          borderRadius: 12,
          margin: "0 auto",
          fontFamily: "monospace",
          gap: 20,
        }}
      >
        <h2
          style={{
            color: "#fff",
            fontSize: 30,
            margin: 0,
            letterSpacing: 2,
          }}
        >
          Paddle Rally
        </h2>
        <p style={{ color: "#888", fontSize: 13, margin: 0, textAlign: "center" }}>
          Table Tennis &middot; First to {WIN_SCORE} wins
        </p>
        <button
          onClick={() => startGame("1p")}
          style={menuBtnStyle("#3b82f6")}
        >
          1 Player vs Bot
        </button>
        <button
          onClick={() => startGame("2p")}
          style={menuBtnStyle("#8b5cf6")}
        >
          2 Player (Mouse vs WASD)
        </button>
        <p style={{ color: "#555", fontSize: 11, margin: 0, maxWidth: 260, textAlign: "center", lineHeight: 1.5 }}>
          Bottom paddle: mouse / touch<br />
          Top paddle (2P): A / D keys
        </p>
      </div>
    );
  }

  /* ── game over screen ── */
  if (screen === "gameover") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: W,
          height: H,
          background: "#111118",
          borderRadius: 12,
          margin: "0 auto",
          fontFamily: "monospace",
          gap: 16,
        }}
      >
        <h2 style={{ color: "#fff", fontSize: 26, margin: 0 }}>Game Over</h2>
        <p style={{ color: "#22c55e", fontSize: 22, margin: 0, fontWeight: "bold" }}>
          {winner} wins!
        </p>
        <p style={{ color: "#aaa", fontSize: 16, margin: 0 }}>
          <span style={{ color: "#ef4444" }}>{scoreTop}</span>
          {" "}—{" "}
          <span style={{ color: "#3b82f6" }}>{scoreBot}</span>
        </p>
        <button
          onClick={() => setScreen("menu")}
          style={menuBtnStyle("#22c55e")}
        >
          New Game
        </button>
      </div>
    );
  }

  /* ── playing screen ── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "0 auto",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: W,
          padding: "6px 12px",
          boxSizing: "border-box",
          color: "#888",
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span style={{ color: "#ef4444" }}>
          {mode === "1p" ? "Bot" : "P1 (WASD)"}: {scoreTop}
        </span>
        <span style={{ color: "#3b82f6" }}>
          {mode === "1p" ? "You" : "P2 (Mouse)"}: {scoreBot}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 12, cursor: "none", display: "block", touchAction: "none" }}
      />
      <button
        onClick={() => {
          gs.current.running = false;
          cancelAnimationFrame(animRef.current);
          setScreen("menu");
        }}
        style={{
          marginTop: 10,
          padding: "6px 18px",
          background: "transparent",
          border: "1px solid #444",
          color: "#888",
          borderRadius: 6,
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        Back to Menu
      </button>
    </div>
  );
}

function menuBtnStyle(color: string): React.CSSProperties {
  return {
    padding: "12px 32px",
    background: "transparent",
    border: `2px solid ${color}`,
    color,
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 1,
    transition: "background 0.2s",
  };
}
