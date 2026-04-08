"use client";
import { useRef, useEffect, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────────────────
const W = 320;
const H = 480;
const BIRD_X = 60;
const BIRD_R = 14;
const GAP_SIZE = 120;
const PIPE_W = 48;
const PIPE_CAP_H = 20;
const PIPE_CAP_OVR = 4;
const PIPE_SPACING = 180;
const GROUND_H = 40;
const GRAVITY = 0.38;
const FLAP_VEL = -6.2;
const BASE_SPEED = 2.2;
const SPEED_INC = 0.0004; // per frame
const GROUND_TEX = 12; // stripe width
const LS_KEY = "tapfly_best";

// ── Sound helpers (Web Audio) ──────────────────────────────────────────
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  return new AC();
}

function playFlap(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 480;
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

function playScore(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.1);
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function playCrash(ctx: AudioContext) {
  const bufLen = ctx.sampleRate * 0.2;
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  src.connect(g).connect(ctx.destination);
  src.start();
}

// ── Types ──────────────────────────────────────────────────────────────
interface Pipe {
  x: number;
  gapY: number; // top of the gap
  scored: boolean;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

type Phase = "start" | "play" | "dead";

// ── Component ──────────────────────────────────────────────────────────
export default function TapFly() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    phase: Phase;
    birdY: number;
    birdVy: number;
    pipes: Pipe[];
    clouds: Cloud[];
    score: number;
    best: number;
    frame: number;
    groundOff: number;
    audioCtx: AudioContext | null;
    flash: number; // white flash on death
  } | null>(null);
  const animRef = useRef(0);

  // Initialise state
  const initState = useCallback(() => {
    let best = 0;
    try {
      best = parseInt(localStorage.getItem(LS_KEY) || "0", 10) || 0;
    } catch {}
    const clouds: Cloud[] = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 20 + Math.random() * 140,
        w: 30 + Math.random() * 50,
        speed: 0.2 + Math.random() * 0.3,
      });
    }
    return {
      phase: "start" as Phase,
      birdY: H / 2 - 20,
      birdVy: 0,
      pipes: [] as Pipe[],
      clouds,
      score: 0,
      best,
      frame: 0,
      groundOff: 0,
      audioCtx: null as AudioContext | null,
      flash: 0,
    };
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current!;
    s.phase = "play";
    s.birdY = H / 2 - 20;
    s.birdVy = 0;
    s.pipes = [];
    s.score = 0;
    s.frame = 0;
    s.flash = 0;
  }, []);

  // Flap action
  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    // Ensure audio context
    if (!s.audioCtx) {
      s.audioCtx = getAudioCtx();
    }
    if (s.audioCtx && s.audioCtx.state === "suspended") {
      s.audioCtx.resume();
    }
    if (s.phase === "start") {
      resetGame();
      s.birdVy = FLAP_VEL;
      if (s.audioCtx) playFlap(s.audioCtx);
      return;
    }
    if (s.phase === "dead") {
      resetGame();
      s.birdVy = FLAP_VEL;
      if (s.audioCtx) playFlap(s.audioCtx);
      return;
    }
    // playing
    s.birdVy = FLAP_VEL;
    if (s.audioCtx) playFlap(s.audioCtx);
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    stateRef.current = initState();
    const s = stateRef.current;

    // ── Draw helpers ─────────────────────────────────────────────────
    function drawSky() {
      const grad = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      grad.addColorStop(0, "#4dc9f6");
      grad.addColorStop(1, "#a0e4ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H - GROUND_H);
    }

    function drawClouds() {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (const c of s.clouds) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w * 0.5, c.w * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x - c.w * 0.22, c.y + 4, c.w * 0.3, c.w * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.28, c.w * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function updateClouds() {
      for (const c of s.clouds) {
        c.x -= c.speed;
        if (c.x + c.w < 0) {
          c.x = W + c.w;
          c.y = 20 + Math.random() * 140;
          c.w = 30 + Math.random() * 50;
        }
      }
    }

    function drawGround() {
      // brown ground
      ctx.fillStyle = "#8B5E3C";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      // texture stripes
      ctx.fillStyle = "#6B4226";
      const off = s.groundOff % (GROUND_TEX * 2);
      for (let x = -off; x < W + GROUND_TEX * 2; x += GROUND_TEX * 2) {
        ctx.fillRect(x, H - GROUND_H, GROUND_TEX, 6);
        ctx.fillRect(x + GROUND_TEX, H - GROUND_H + 6, GROUND_TEX, 6);
      }
      // green grass line
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(0, H - GROUND_H, W, 4);
    }

    function drawPipe(p: Pipe) {
      const speed = BASE_SPEED + s.frame * SPEED_INC;
      // top pipe body
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      // top pipe cap
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(p.x - PIPE_CAP_OVR, p.gapY - PIPE_CAP_H, PIPE_W + PIPE_CAP_OVR * 2, PIPE_CAP_H);
      // top pipe highlight
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(p.x + 4, 0, 6, p.gapY - PIPE_CAP_H);

      // bottom pipe body
      const bottomY = p.gapY + GAP_SIZE;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(p.x, bottomY + PIPE_CAP_H, PIPE_W, H - GROUND_H - bottomY - PIPE_CAP_H);
      // bottom pipe cap
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(p.x - PIPE_CAP_OVR, bottomY, PIPE_W + PIPE_CAP_OVR * 2, PIPE_CAP_H);
      // bottom pipe highlight
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(p.x + 4, bottomY + PIPE_CAP_H, 6, H - GROUND_H - bottomY - PIPE_CAP_H);
    }

    function drawBird() {
      const by = s.birdY;
      const vy = s.birdVy;
      // rotation based on velocity
      const angle = Math.max(-0.4, Math.min(vy * 0.06, 1.2));

      ctx.save();
      ctx.translate(BIRD_X, by);
      ctx.rotate(angle);

      // body
      ctx.fillStyle = s.phase === "dead" ? "#ef4444" : "#facc15";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.fill();

      // wing
      ctx.fillStyle = s.phase === "dead" ? "#dc2626" : "#f59e0b";
      ctx.beginPath();
      const wingFlutter = Math.sin(s.frame * 0.4) * 3;
      ctx.ellipse(-4, 4 + wingFlutter, 10, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // eye white
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(7, -4, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // pupil
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // beak (triangle)
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(BIRD_R - 2, -2);
      ctx.lineTo(BIRD_R + 8, 2);
      ctx.lineTo(BIRD_R - 2, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function drawScore() {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(String(s.score), W / 2, 48);
      ctx.fillText(String(s.score), W / 2, 48);
      ctx.restore();
    }

    function drawStartScreen() {
      // bobbing bird idle animation
      s.birdY = H / 2 - 20 + Math.sin(s.frame * 0.05) * 8;

      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.textAlign = "center";

      // Title
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.strokeText("Tap Fly", W / 2, 100);
      ctx.fillText("Tap Fly", W / 2, 100);

      // Instruction
      ctx.font = "18px system-ui, sans-serif";
      ctx.lineWidth = 1.5;
      const alpha = 0.5 + 0.5 * Math.sin(s.frame * 0.06);
      ctx.globalAlpha = alpha;
      ctx.strokeText("Tap to Start", W / 2, H / 2 + 60);
      ctx.fillText("Tap to Start", W / 2, H / 2 + 60);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawGameOver() {
      // dim overlay
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.textAlign = "center";

      // Panel
      const px = W / 2 - 90;
      const py = H / 2 - 80;
      const pw = 180;
      const ph = 160;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 12);
      ctx.fill();
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 12);
      ctx.stroke();

      // Game Over text
      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText("Game Over", W / 2, py + 32);

      // Score
      ctx.fillStyle = "#333";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("Score", W / 2, py + 58);
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillStyle = "#111";
      ctx.fillText(String(s.score), W / 2, py + 86);

      // Best
      ctx.fillStyle = "#666";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(`Best: ${s.best}`, W / 2, py + 110);

      // Retry
      const alpha = 0.5 + 0.5 * Math.sin(s.frame * 0.07);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#2563eb";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Tap to Retry", W / 2, py + 140);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    // ── Game loop ────────────────────────────────────────────────────
    function update() {
      if (s.phase !== "play") {
        s.frame++;
        updateClouds();
        // scroll ground on start screen too
        s.groundOff += 1;
        return;
      }

      const speed = BASE_SPEED + s.frame * SPEED_INC;
      s.frame++;

      // Bird physics
      s.birdVy += GRAVITY;
      s.birdY += s.birdVy;

      // Scroll ground
      s.groundOff += speed;

      // Move clouds
      updateClouds();

      // Spawn pipes
      const lastPipe = s.pipes[s.pipes.length - 1];
      if (!lastPipe || lastPipe.x < W - PIPE_SPACING) {
        const minGapY = 60;
        const maxGapY = H - GROUND_H - GAP_SIZE - 60;
        const gapY = minGapY + Math.random() * (maxGapY - minGapY);
        s.pipes.push({ x: W + 10, gapY, scored: false });
      }

      // Move and check pipes
      for (const p of s.pipes) {
        p.x -= speed;

        // Score
        if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
          p.scored = true;
          s.score++;
          if (s.audioCtx) playScore(s.audioCtx);
        }

        // Collision with pipe
        // Bird bounding box
        const bLeft = BIRD_X - BIRD_R;
        const bRight = BIRD_X + BIRD_R;
        const bTop = s.birdY - BIRD_R;
        const bBottom = s.birdY + BIRD_R;

        const pLeft = p.x;
        const pRight = p.x + PIPE_W;

        if (bRight > pLeft && bLeft < pRight) {
          // Overlaps horizontally with pipe column
          if (bTop < p.gapY || bBottom > p.gapY + GAP_SIZE) {
            die();
            return;
          }
        }
      }

      // Remove off-screen pipes
      s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -10);

      // Ground / ceiling collision
      if (s.birdY + BIRD_R > H - GROUND_H) {
        s.birdY = H - GROUND_H - BIRD_R;
        die();
        return;
      }
      if (s.birdY - BIRD_R < 0) {
        s.birdY = BIRD_R;
        die();
        return;
      }
    }

    function die() {
      s.phase = "dead";
      s.flash = 6;
      if (s.score > s.best) {
        s.best = s.score;
        try {
          localStorage.setItem(LS_KEY, String(s.best));
        } catch {}
      }
      if (s.audioCtx) playCrash(s.audioCtx);
    }

    function render() {
      drawSky();
      drawClouds();

      // Pipes
      for (const p of s.pipes) drawPipe(p);

      drawGround();
      drawBird();
      drawScore();

      if (s.phase === "start") drawStartScreen();
      if (s.phase === "dead") drawGameOver();

      // White flash on death
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.flash / 6})`;
        ctx.fillRect(0, 0, W, H);
        s.flash--;
      }
    }

    function loop() {
      update();
      render();
      animRef.current = requestAnimationFrame(loop);
    }

    // ── Input ────────────────────────────────────────────────────────
    const handleTap = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      flap();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };

    canvas.addEventListener("mousedown", handleTap);
    canvas.addEventListener("touchstart", handleTap, { passive: false });
    window.addEventListener("keydown", handleKey);

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown", handleTap);
      canvas.removeEventListener("touchstart", handleTap);
      window.removeEventListener("keydown", handleKey);
      if (s.audioCtx) {
        s.audioCtx.close().catch(() => {});
      }
    };
  }, [initState, flap]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 10,
          cursor: "pointer",
          maxWidth: "100%",
          touchAction: "none",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        }}
      />
    </div>
  );
}
