import { useRef, useEffect, useState, useCallback } from "react";

const W = 300;
const H = 500;
const BH = 22;
const BASE_SPEED = 1.8;
const MAX_SPEED = 7;
const PERFECT_THRESHOLD = 3;
const COLORS = [
  "#ef4444","#f97316","#facc15","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899",
];
const LS_KEY = "stack_tower_hi";

function playSound(type: "thud" | "perfect" | "fall") {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    if (type === "thud") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.2);
    } else if (type === "perfect") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ac.currentTime);
      osc.frequency.setValueAtTime(1100, ac.currentTime + 0.08);
      osc.frequency.setValueAtTime(1320, ac.currentTime + 0.16);
      gain.gain.setValueAtTime(0.25, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.35);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.6);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.6);
    }
  } catch {}
}

interface Block {
  x: number;
  w: number;
  y: number;
  color: string;
}

interface FallingPiece {
  x: number;
  w: number;
  y: number;
  vy: number;
  color: string;
}

interface PerfectFX {
  y: number;
  t: number;
  x: number;
}

export default function StackTower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    stack: Block[];
    moving: { x: number; w: number; dir: number; speed: number };
    score: number;
    dead: boolean;
    camOffset: number;
    perfectStreak: number;
    fallingPieces: FallingPiece[];
    perfectFX: PerfectFX[];
    highScore: number;
    started: boolean;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [perfectStreak, setPerfectStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initState = useCallback(() => {
    let hi = 0;
    try { hi = parseInt(localStorage.getItem(LS_KEY) || "0", 10) || 0; } catch {}
    const state = {
      stack: [{ x: W / 2 - 50, w: 100, y: H - BH, color: COLORS[0] }] as Block[],
      moving: { x: 0, w: 100, dir: 1, speed: BASE_SPEED },
      score: 0,
      dead: false,
      camOffset: 0,
      perfectStreak: 0,
      fallingPieces: [] as FallingPiece[],
      perfectFX: [] as PerfectFX[],
      highScore: hi,
      started: false,
    };
    stateRef.current = state;
    setScore(0);
    setHighScore(hi);
    setPerfectStreak(0);
    setGameOver(false);
    return state;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let anim = 0;
    const s = initState();

    function blockColor(i: number): string {
      return COLORS[i % COLORS.length];
    }

    function draw3DBlock(
      ctx: CanvasRenderingContext2D,
      x: number, y: number, w: number, h: number,
      color: string, depth: number
    ) {
      const perspective = 0.06;
      const frontW = w * (1 + perspective);
      const frontX = x - (frontW - w) / 2;
      const d = Math.min(depth, 6);

      // Top face
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(frontX + frontW, y + d);
      ctx.lineTo(frontX, y + d);
      ctx.closePath();
      ctx.fillStyle = lighten(color, 30);
      ctx.fill();

      // Front face
      ctx.fillStyle = color;
      ctx.fillRect(frontX, y + d, frontW, h - d);

      // Side highlight
      ctx.fillStyle = lighten(color, -20);
      ctx.fillRect(frontX, y + d, 2, h - d);
      ctx.fillStyle = lighten(color, -30);
      ctx.fillRect(frontX + frontW - 2, y + d, 2, h - d);

      // Bottom edge
      ctx.fillStyle = lighten(color, -40);
      ctx.fillRect(frontX, y + h - 1, frontW, 1);
    }

    function lighten(hex: string, amount: number): string {
      const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
      const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
      const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
      return `rgb(${r},${g},${b})`;
    }

    function loop() {
      const st = stateRef.current!;
      ctx.fillStyle = "#0d0d14";
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1;
      for (let gy = 0; gy < H; gy += BH) {
        const oy = (gy + st.camOffset * 0.5) % H;
        ctx.beginPath();
        ctx.moveTo(0, oy);
        ctx.lineTo(W, oy);
        ctx.stroke();
      }

      // Camera
      const targetCam = Math.max(0, (st.stack.length - 16) * BH);
      st.camOffset += (targetCam - st.camOffset) * 0.08;

      // Draw stack
      for (let i = 0; i < st.stack.length; i++) {
        const b = st.stack[i];
        const dy = b.y + st.camOffset;
        if (dy > H + BH || dy < -BH) continue;
        draw3DBlock(ctx, b.x, dy, b.w, BH - 1, b.color, 5);
      }

      // Falling pieces
      for (let i = st.fallingPieces.length - 1; i >= 0; i--) {
        const fp = st.fallingPieces[i];
        fp.y += fp.vy;
        fp.vy += 0.5;
        const dy = fp.y + st.camOffset;
        if (dy > H + 50) {
          st.fallingPieces.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, 1 - (dy - H * 0.5) / (H * 0.5));
        draw3DBlock(ctx, fp.x, dy, fp.w, BH - 1, fp.color, 5);
        ctx.globalAlpha = 1;
      }

      // Perfect FX
      for (let i = st.perfectFX.length - 1; i >= 0; i--) {
        const fx = st.perfectFX[i];
        fx.t -= 0.02;
        if (fx.t <= 0) { st.perfectFX.splice(i, 1); continue; }
        const spread = (1 - fx.t) * 40;
        ctx.globalAlpha = fx.t * 0.7;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(fx.x - spread, fx.y + st.camOffset - spread / 4, W * 0.3 + spread * 2, BH + spread / 2);
        ctx.globalAlpha = 1;
      }

      if (!st.dead) {
        if (!st.started) {
          // Pre-game: show moving block + tap prompt
          const my = H - (st.stack.length + 1) * BH + st.camOffset;
          st.moving.x += st.moving.dir * st.moving.speed;
          if (st.moving.x <= 0 || st.moving.x + st.moving.w >= W) st.moving.dir *= -1;
          const col = blockColor(st.stack.length);
          draw3DBlock(ctx, st.moving.x, my, st.moving.w, BH - 1, col, 5);

          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = "bold 18px system-ui";
          ctx.textAlign = "center";
          ctx.fillText("Tap to Stack!", W / 2, H / 2 - 30);
          ctx.font = "13px system-ui";
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText("Drop blocks & build the tower", W / 2, H / 2);
        } else {
          // Moving block
          const my = H - (st.stack.length + 1) * BH + st.camOffset;
          st.moving.x += st.moving.dir * st.moving.speed;
          if (st.moving.x <= 0 || st.moving.x + st.moving.w >= W) st.moving.dir *= -1;
          const col = blockColor(st.stack.length);
          draw3DBlock(ctx, st.moving.x, my, st.moving.w, BH - 1, col, 5);

          // Guide line from previous block
          const top = st.stack[st.stack.length - 1];
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(top.x, top.y + st.camOffset);
          ctx.lineTo(top.x, my);
          ctx.moveTo(top.x + top.w, top.y + st.camOffset);
          ctx.lineTo(top.x + top.w, my);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Game over overlay
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 26px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", W / 2, H / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px system-ui";
        ctx.fillText(String(st.score), W / 2, H / 2 + 5);
        ctx.font = "13px system-ui";
        ctx.fillStyle = "#aaa";
        ctx.fillText("blocks stacked", W / 2, H / 2 + 25);

        if (st.score >= st.highScore && st.score > 0) {
          ctx.fillStyle = "#facc15";
          ctx.font = "bold 14px system-ui";
          ctx.fillText("New High Score!", W / 2, H / 2 + 50);
        }

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "13px system-ui";
        ctx.fillText("Tap to play again", W / 2, H / 2 + 75);
      }

      // HUD - Score
      if (st.started && !st.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(0, 0, W, 52);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(String(st.score), W / 2, 36);

        // Perfect streak
        if (st.perfectStreak >= 2) {
          ctx.fillStyle = "#facc15";
          ctx.font = "bold 12px system-ui";
          ctx.fillText("PERFECT x" + st.perfectStreak, W / 2, 50);
        }
      }

      // High score badge
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("BEST: " + st.highScore, W - 10, 16);

      anim = requestAnimationFrame(loop);
    }

    function handleClick() {
      const st = stateRef.current!;

      if (st.dead) {
        // Restart
        const hi = st.highScore;
        const ns = initState();
        ns.highScore = hi;
        ns.started = true;
        stateRef.current = ns;
        setHighScore(hi);
        return;
      }

      if (!st.started) {
        st.started = true;
      }

      const top = st.stack[st.stack.length - 1];
      const overlapStart = Math.max(st.moving.x, top.x);
      const overlapEnd = Math.min(st.moving.x + st.moving.w, top.x + top.w);
      const overlap = overlapEnd - overlapStart;

      if (overlap <= 0) {
        // Complete miss - game over
        st.dead = true;
        playSound("fall");

        // Turn current moving block into falling piece
        const my = H - (st.stack.length + 1) * BH;
        st.fallingPieces.push({
          x: st.moving.x, w: st.moving.w, y: my, vy: 0,
          color: blockColor(st.stack.length),
        });

        // Save high score
        if (st.score > st.highScore) {
          st.highScore = st.score;
          try { localStorage.setItem(LS_KEY, String(st.score)); } catch {}
        }
        setHighScore(st.highScore);
        setGameOver(true);
        return;
      }

      const isPerfect = Math.abs(st.moving.x - top.x) <= PERFECT_THRESHOLD &&
                        Math.abs(st.moving.w - top.w) <= PERFECT_THRESHOLD;

      const newY = H - (st.stack.length + 1) * BH;

      if (isPerfect) {
        // Perfect placement - use previous block dimensions exactly
        const newBlock: Block = {
          x: top.x,
          w: top.w,
          y: newY,
          color: blockColor(st.stack.length),
        };
        st.stack.push(newBlock);
        st.perfectStreak++;
        setPerfectStreak(st.perfectStreak);
        playSound("perfect");

        // Perfect FX
        st.perfectFX.push({ y: newY, t: 1, x: top.x });
      } else {
        // Trimmed placement
        const newX = overlapStart;
        const newBlock: Block = {
          x: newX,
          w: overlap,
          y: newY,
          color: blockColor(st.stack.length),
        };
        st.stack.push(newBlock);
        st.perfectStreak = 0;
        setPerfectStreak(0);
        playSound("thud");

        // Trimmed-off piece falls
        const trimColor = blockColor(st.stack.length - 1);
        if (st.moving.x < top.x) {
          // Fell off left
          st.fallingPieces.push({
            x: st.moving.x, w: top.x - st.moving.x, y: newY, vy: 0, color: trimColor,
          });
        }
        if (st.moving.x + st.moving.w > top.x + top.w) {
          // Fell off right
          const rx = Math.max(top.x + top.w, st.moving.x);
          st.fallingPieces.push({
            x: rx, w: st.moving.x + st.moving.w - rx, y: newY, vy: 0, color: trimColor,
          });
        }
      }

      st.score++;
      setScore(st.score);

      // Update high score live
      if (st.score > st.highScore) {
        st.highScore = st.score;
        try { localStorage.setItem(LS_KEY, String(st.score)); } catch {}
        setHighScore(st.highScore);
      }

      // Next moving block
      const lastBlock = st.stack[st.stack.length - 1];
      const newSpeed = Math.min(BASE_SPEED + st.score * 0.12, MAX_SPEED);
      st.moving = {
        x: st.moving.dir > 0 ? 0 : W - lastBlock.w,
        w: lastBlock.w,
        dir: st.moving.dir,
        speed: newSpeed,
      };
    }

    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleClick();
      }
    }

    canvas.addEventListener("pointerdown", handleClick);
    window.addEventListener("keydown", handleKey);
    anim = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(anim);
      canvas.removeEventListener("pointerdown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [initState]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 120px rgba(59,130,246,0.1)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            display: "block",
            cursor: "pointer",
            borderRadius: 12,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 16,
          alignItems: "center",
          color: "#888",
          fontSize: 12,
        }}
      >
        <span>Score: <strong style={{ color: "#fff" }}>{score}</strong></span>
        {perfectStreak >= 2 && (
          <span style={{ color: "#facc15", fontWeight: "bold" }}>
            PERFECT x{perfectStreak}
          </span>
        )}
        <span>Best: <strong style={{ color: "#fff" }}>{highScore}</strong></span>
      </div>
      <p style={{ color: "#555", fontSize: 11, marginTop: 6 }}>
        Click / Tap / Space to drop
      </p>
    </div>
  );
}
