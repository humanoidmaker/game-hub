import { useRef, useEffect, useState, useCallback } from "react";

const W = 400, H = 500;
const COLS = 8, ROWS = 5;
const BRICK_W = (W - (COLS + 1) * 4) / COLS;
const BRICK_H = 18;
const BRICK_PAD = 4;
const BRICK_TOP = 50;
const BALL_R = 5;
const PADDLE_H = 12;
const PADDLE_BASE_W = 70;
const INIT_SPEED = 3.5;
const ROW_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];
const ROW_POINTS = [60, 50, 40, 30, 20, 10];
const POWERUP_CHANCE = 0.15;
const POWERUP_SPEED = 1.8;
const POWERUP_SIZE = 14;
const POWERUP_DURATION = 8000;

type Brick = { x: number; y: number; w: number; h: number; color: string; alive: boolean; row: number };
type Ball = { x: number; y: number; vx: number; vy: number; active: boolean };
type PowerUp = { x: number; y: number; type: "W" | "M" | "S"; active: boolean };

function playTone(freq: number, dur: number, vol = 0.08, type: OscillatorType = "square") {
  try {
    const ac = new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {}
}

function sndBounce() { playTone(440, 0.06); }
function sndBreak() { playTone(660, 0.08, 0.07, "triangle"); }
function sndPowerUp() { playTone(880, 0.15, 0.06, "sine"); }
function sndLoseLife() { playTone(180, 0.3, 0.1, "sawtooth"); }

export default function BlockBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const animRef = useRef(0);
  const [display, setDisplay] = useState({ score: 0, highScore: 0, level: 1, lives: 3, phase: "ready" as "ready" | "playing" | "levelComplete" | "gameOver" });

  const makeBricks = useCallback((level: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = Math.min(ROWS + Math.floor(level / 3), 7);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = BRICK_PAD + c * (BRICK_W + BRICK_PAD);
        const y = BRICK_TOP + r * (BRICK_H + BRICK_PAD);
        bricks.push({ x, y, w: BRICK_W, h: BRICK_H, color: ROW_COLORS[r % ROW_COLORS.length], alive: true, row: r });
      }
    }
    return bricks;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mx = W / 2;
    let highScore = 0;
    try { highScore = parseInt(localStorage.getItem("blockbreaker_hs") || "0") || 0; } catch {}

    const s = {
      balls: [{ x: W / 2, y: H - 40, vx: 0, vy: 0, active: true }] as Ball[],
      paddleW: PADDLE_BASE_W,
      bricks: makeBricks(1),
      powerups: [] as PowerUp[],
      score: 0,
      level: 1,
      lives: 3,
      phase: "ready" as "ready" | "playing" | "levelComplete" | "gameOver",
      speedMul: 1,
      wideTimer: 0,
      slowTimer: 0,
      launched: false,
    };
    stateRef.current = s;

    const syncDisplay = () => {
      setDisplay({ score: s.score, highScore: Math.max(highScore, s.score), level: s.level, lives: s.lives, phase: s.phase });
    };
    syncDisplay();

    const resetBall = () => {
      s.balls = [{ x: W / 2, y: H - PADDLE_H - BALL_R - 10, vx: 0, vy: 0, active: true }];
      s.launched = false;
      s.paddleW = PADDLE_BASE_W;
      s.wideTimer = 0;
      s.slowTimer = 0;
      s.powerups = [];
    };

    const launchBall = () => {
      if (s.launched || s.phase !== "ready" && s.phase !== "playing") return;
      s.phase = "playing";
      s.launched = true;
      const speed = INIT_SPEED + (s.level - 1) * 0.3;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      s.balls[0].vx = Math.cos(angle) * speed;
      s.balls[0].vy = Math.sin(angle) * speed;
      syncDisplay();
    };

    const startLevel = (lvl: number) => {
      s.level = lvl;
      s.bricks = makeBricks(lvl);
      s.speedMul = 1 + (lvl - 1) * 0.08;
      resetBall();
      s.phase = "ready";
      syncDisplay();
    };

    const startGame = () => {
      s.score = 0;
      s.lives = 3;
      startLevel(1);
    };

    const spawnPowerUp = (x: number, y: number) => {
      if (Math.random() > POWERUP_CHANCE) return;
      const types: ("W" | "M" | "S")[] = ["W", "M", "S"];
      s.powerups.push({ x, y, type: types[Math.floor(Math.random() * 3)], active: true });
    };

    const applyPowerUp = (type: "W" | "M" | "S") => {
      sndPowerUp();
      if (type === "W") {
        s.paddleW = PADDLE_BASE_W * 1.6;
        s.wideTimer = Date.now() + POWERUP_DURATION;
      } else if (type === "S") {
        for (const b of s.balls) { b.vx *= 0.6; b.vy *= 0.6; }
        s.slowTimer = Date.now() + POWERUP_DURATION;
      } else if (type === "M") {
        const extra: Ball[] = [];
        for (const b of s.balls) {
          if (!b.active) continue;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          for (let i = 0; i < 2; i++) {
            const angle = Math.atan2(b.vy, b.vx) + (i === 0 ? 0.5 : -0.5);
            extra.push({ x: b.x, y: b.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, active: true });
          }
          break;
        }
        s.balls.push(...extra);
      }
    };

    const clampPaddle = () => Math.max(s.paddleW / 2, Math.min(W - s.paddleW / 2, mx));

    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
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
    };

    const loop = () => {
      const now = Date.now();

      // Timer expirations
      if (s.wideTimer && now > s.wideTimer) { s.paddleW = PADDLE_BASE_W; s.wideTimer = 0; }
      if (s.slowTimer && now > s.slowTimer) {
        for (const b of s.balls) {
          const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (sp > 0) { const target = INIT_SPEED * s.speedMul; const scale = target / sp; b.vx *= scale; b.vy *= scale; }
        }
        s.slowTimer = 0;
      }

      // Clear
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, W, H);

      // Bricks
      for (const br of s.bricks) {
        if (!br.alive) continue;
        ctx.fillStyle = br.color;
        drawRoundRect(br.x, br.y, br.w, br.h, 3);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 4);
      }

      // Paddle
      const px = clampPaddle();
      const paddleY = H - 24;
      const grad = ctx.createLinearGradient(px - s.paddleW / 2, paddleY, px + s.paddleW / 2, paddleY);
      grad.addColorStop(0, "#60a5fa");
      grad.addColorStop(1, "#a78bfa");
      ctx.fillStyle = grad;
      drawRoundRect(px - s.paddleW / 2, paddleY, s.paddleW, PADDLE_H, 5);
      ctx.fill();

      // Physics
      if (s.phase === "playing" && s.launched) {
        for (const ball of s.balls) {
          if (!ball.active) continue;
          ball.x += ball.vx * s.speedMul;
          ball.y += ball.vy * s.speedMul;

          // Wall bounce
          if (ball.x <= BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); sndBounce(); }
          if (ball.x >= W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); sndBounce(); }
          if (ball.y <= BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); sndBounce(); }

          // Paddle bounce
          if (ball.vy > 0 && ball.y + BALL_R >= paddleY && ball.y + BALL_R <= paddleY + PADDLE_H + 4 && ball.x >= px - s.paddleW / 2 - BALL_R && ball.x <= px + s.paddleW / 2 + BALL_R) {
            const hitPos = (ball.x - px) / (s.paddleW / 2); // -1 to 1
            const angle = hitPos * (Math.PI / 3); // max 60 degrees from vertical
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.abs(Math.cos(angle) * speed);
            ball.y = paddleY - BALL_R;
            sndBounce();
          }

          // Brick collision
          for (const br of s.bricks) {
            if (!br.alive) continue;
            if (ball.x + BALL_R > br.x && ball.x - BALL_R < br.x + br.w && ball.y + BALL_R > br.y && ball.y - BALL_R < br.y + br.h) {
              br.alive = false;
              const pts = ROW_POINTS[Math.min(br.row, ROW_POINTS.length - 1)];
              s.score += pts;

              // Determine bounce direction
              const overlapLeft = (ball.x + BALL_R) - br.x;
              const overlapRight = (br.x + br.w) - (ball.x - BALL_R);
              const overlapTop = (ball.y + BALL_R) - br.y;
              const overlapBottom = (br.y + br.h) - (ball.y - BALL_R);
              const minX = Math.min(overlapLeft, overlapRight);
              const minY = Math.min(overlapTop, overlapBottom);
              if (minX < minY) { ball.vx *= -1; } else { ball.vy *= -1; }

              sndBreak();
              spawnPowerUp(br.x + br.w / 2, br.y + br.h / 2);
              syncDisplay();
              break;
            }
          }

          // Ball lost
          if (ball.y > H + BALL_R) {
            ball.active = false;
          }
        }

        // Power-ups fall
        for (const pu of s.powerups) {
          if (!pu.active) continue;
          pu.y += POWERUP_SPEED;
          if (pu.y > H) { pu.active = false; continue; }
          if (pu.y + POWERUP_SIZE >= paddleY && pu.y <= paddleY + PADDLE_H && pu.x >= px - s.paddleW / 2 && pu.x <= px + s.paddleW / 2) {
            pu.active = false;
            applyPowerUp(pu.type);
          }
        }

        // Check if all balls lost
        if (s.balls.every(b => !b.active)) {
          s.lives--;
          syncDisplay();
          if (s.lives <= 0) {
            s.phase = "gameOver";
            if (s.score > highScore) {
              highScore = s.score;
              try { localStorage.setItem("blockbreaker_hs", String(highScore)); } catch {}
            }
            sndLoseLife();
            syncDisplay();
          } else {
            sndLoseLife();
            resetBall();
            s.phase = "playing";
          }
        }

        // Check level complete
        if (s.bricks.every(b => !b.alive) && s.phase === "playing") {
          s.phase = "levelComplete";
          syncDisplay();
        }
      }

      // Draw balls
      for (const ball of s.balls) {
        if (!ball.active) continue;
        ctx.fillStyle = "#f0f0f0";
        ctx.shadowColor = "#60a5fa";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Ball on paddle before launch
      if (!s.launched && (s.phase === "ready" || s.phase === "playing")) {
        const bx = px;
        const by = paddleY - BALL_R - 2;
        s.balls[0].x = bx;
        s.balls[0].y = by;
        ctx.fillStyle = "#f0f0f0";
        ctx.shadowColor = "#60a5fa";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw power-ups
      for (const pu of s.powerups) {
        if (!pu.active) continue;
        const colors = { W: "#22d3ee", M: "#f472b6", S: "#a3e635" };
        ctx.fillStyle = colors[pu.type];
        ctx.shadowColor = colors[pu.type];
        ctx.shadowBlur = 6;
        drawRoundRect(pu.x - POWERUP_SIZE / 2, pu.y - POWERUP_SIZE / 2, POWERUP_SIZE, POWERUP_SIZE, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pu.type, pu.x, pu.y);
      }

      // HUD top bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 36);
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "#60a5fa";
      ctx.fillText(`Score: ${s.score}`, 10, 18);
      ctx.textAlign = "center";
      ctx.fillStyle = "#a78bfa";
      ctx.fillText(`Level ${s.level}`, W / 2, 18);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f87171";
      let heartsStr = "";
      for (let i = 0; i < s.lives; i++) heartsStr += "\u2665 ";
      ctx.fillText(heartsStr.trim(), W - 10, 18);

      // Overlays
      if (s.phase === "ready" && !s.launched) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, H / 2 - 30, W, 60);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Click to Launch", W / 2, H / 2);
      }

      if (s.phase === "gameOver") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 30);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 10);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(`High Score: ${Math.max(highScore, s.score)}`, W / 2, H / 2 + 36);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("Click to Play Again", W / 2, H / 2 + 64);
      }

      if (s.phase === "levelComplete") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Level ${s.level} Complete!`, W / 2, H / 2 - 20);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 14);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("Click for Next Level", W / 2, H / 2 + 44);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) * (W / r.width);
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      mx = (e.touches[0].clientX - r.left) * (W / r.width);
    };
    const onClick = () => {
      if (s.phase === "gameOver") {
        startGame();
      } else if (s.phase === "levelComplete") {
        startLevel(s.level + 1);
      } else if (!s.launched) {
        launchBall();
      }
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    canvas.addEventListener("click", onClick);
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
      canvas.removeEventListener("click", onClick);
    };
  }, [makeBricks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 16, background: "#0d1117", minHeight: "100%", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: W, maxWidth: "100%", fontSize: 12, color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
        <span>High Score: {display.highScore}</span>
        <span>Lives: {display.lives}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 8, cursor: "pointer", maxWidth: "100%", border: "1px solid #1e293b" }}
      />
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#475569", fontFamily: "monospace", marginTop: 4 }}>
        <span style={{ color: "#22d3ee" }}>W = Wide Paddle</span>
        <span style={{ color: "#f472b6" }}>M = Multi-Ball</span>
        <span style={{ color: "#a3e635" }}>S = Slow Ball</span>
      </div>
    </div>
  );
}
