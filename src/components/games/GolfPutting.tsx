import { useRef, useEffect, useState, useCallback } from "react";

interface Obstacle {
  type: "sand" | "water";
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HoleLayout {
  holeX: number;
  holeY: number;
  ballX: number;
  ballY: number;
  par: number;
  obstacles: Obstacle[];
}

const HOLES: HoleLayout[] = [
  // Hole 1 – straight putt
  { holeX: 200, holeY: 80, ballX: 200, ballY: 420, par: 2, obstacles: [] },
  // Hole 2 – sand left
  { holeX: 280, holeY: 90, ballX: 120, ballY: 420, par: 3, obstacles: [
    { type: "sand", x: 150, y: 200, w: 80, h: 50 },
  ]},
  // Hole 3 – water middle
  { holeX: 120, holeY: 70, ballX: 300, ballY: 430, par: 3, obstacles: [
    { type: "water", x: 140, y: 220, w: 100, h: 40 },
  ]},
  // Hole 4 – sand corridor
  { holeX: 200, holeY: 60, ballX: 200, ballY: 440, par: 3, obstacles: [
    { type: "sand", x: 50, y: 150, w: 100, h: 60 },
    { type: "sand", x: 250, y: 150, w: 100, h: 60 },
  ]},
  // Hole 5 – water hazard right
  { holeX: 100, holeY: 80, ballX: 320, ballY: 400, par: 3, obstacles: [
    { type: "water", x: 200, y: 160, w: 70, h: 70 },
    { type: "sand", x: 60, y: 250, w: 80, h: 40 },
  ]},
  // Hole 6 – narrow gap
  { holeX: 300, holeY: 70, ballX: 100, ballY: 440, par: 4, obstacles: [
    { type: "sand", x: 100, y: 180, w: 120, h: 40 },
    { type: "water", x: 240, y: 260, w: 60, h: 60 },
  ]},
  // Hole 7 – lots of sand
  { holeX: 200, holeY: 60, ballX: 200, ballY: 440, par: 4, obstacles: [
    { type: "sand", x: 60, y: 120, w: 80, h: 50 },
    { type: "sand", x: 260, y: 120, w: 80, h: 50 },
    { type: "sand", x: 140, y: 280, w: 120, h: 40 },
  ]},
  // Hole 8 – water lake
  { holeX: 320, holeY: 80, ballX: 80, ballY: 430, par: 4, obstacles: [
    { type: "water", x: 130, y: 140, w: 140, h: 80 },
    { type: "sand", x: 300, y: 280, w: 70, h: 50 },
  ]},
  // Hole 9 – grand finale
  { holeX: 200, holeY: 55, ballX: 200, ballY: 445, par: 4, obstacles: [
    { type: "water", x: 80, y: 160, w: 90, h: 50 },
    { type: "water", x: 230, y: 160, w: 90, h: 50 },
    { type: "sand", x: 140, y: 300, w: 120, h: 40 },
    { type: "sand", x: 60, y: 360, w: 60, h: 40 },
  ]},
];

const W = 400;
const H = 500;
const BALL_R = 5;
const HOLE_R = 10;
const FRICTION = 0.982;
const SAND_FRICTION = 0.94;
const MAX_POWER = 9;
const SINK_SPEED = 3.5;

function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15) {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch {}
}

function soundPutt() {
  playTone(220, 0.12, "triangle", 0.2);
  setTimeout(() => playTone(330, 0.08, "triangle", 0.12), 40);
}

function soundHoleIn() {
  playTone(523, 0.15, "sine", 0.18);
  setTimeout(() => playTone(659, 0.15, "sine", 0.18), 120);
  setTimeout(() => playTone(784, 0.25, "sine", 0.22), 240);
}

function soundSplash() {
  try {
    const ac = new AudioContext();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.35, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.12));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filt = ac.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.2, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
    src.connect(filt);
    filt.connect(g);
    g.connect(ac.destination);
    src.start();
  } catch {}
}

export default function GolfPutting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const [holeNum, setHoleNum] = useState(1);
  const [strokes, setStrokes] = useState(0);
  const [scorecard, setScorecard] = useState<number[]>([]);
  const [showScorecard, setShowScorecard] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const resetGame = useCallback(() => {
    setHoleNum(1);
    setStrokes(0);
    setScorecard([]);
    setShowScorecard(false);
    setGameOver(false);
    if (stateRef.current) {
      const layout = HOLES[0];
      stateRef.current.ball = { x: layout.ballX, y: layout.ballY, vx: 0, vy: 0 };
      stateRef.current.sunk = false;
      stateRef.current.inWater = false;
      stateRef.current.strokes = 0;
      stateRef.current.holeIdx = 0;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;

    const layout = HOLES[0];
    const state = {
      ball: { x: layout.ballX, y: layout.ballY, vx: 0, vy: 0 },
      aiming: false,
      aimX: 0,
      aimY: 0,
      sunk: false,
      inWater: false,
      waterTimer: 0,
      strokes: 0,
      holeIdx: 0,
      sunkTimer: 0,
    };
    stateRef.current = state;

    function getLayout() {
      return HOLES[state.holeIdx];
    }

    function isInObstacle(x: number, y: number, type: "sand" | "water"): boolean {
      const lo = getLayout();
      for (const obs of lo.obstacles) {
        if (obs.type === type && x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
          return true;
        }
      }
      return false;
    }

    function drawGreen() {
      // Dark background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Green surface with border
      const margin = 20;
      const r = 12;
      ctx.fillStyle = "#2d7a3a";
      ctx.beginPath();
      ctx.moveTo(margin + r, margin);
      ctx.lineTo(W - margin - r, margin);
      ctx.quadraticCurveTo(W - margin, margin, W - margin, margin + r);
      ctx.lineTo(W - margin, H - margin - r);
      ctx.quadraticCurveTo(W - margin, H - margin, W - margin - r, H - margin);
      ctx.lineTo(margin + r, H - margin);
      ctx.quadraticCurveTo(margin, H - margin, margin, H - margin - r);
      ctx.lineTo(margin, margin + r);
      ctx.quadraticCurveTo(margin, margin, margin + r, margin);
      ctx.closePath();
      ctx.fill();

      // Subtle green texture stripes
      ctx.fillStyle = "rgba(50, 140, 60, 0.3)";
      for (let y = margin; y < H - margin; y += 16) {
        if (Math.floor(y / 16) % 2 === 0) {
          ctx.fillRect(margin, y, W - margin * 2, 8);
        }
      }

      // Green border line
      ctx.strokeStyle = "#1a5c28";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin + r, margin);
      ctx.lineTo(W - margin - r, margin);
      ctx.quadraticCurveTo(W - margin, margin, W - margin, margin + r);
      ctx.lineTo(W - margin, H - margin - r);
      ctx.quadraticCurveTo(W - margin, H - margin, W - margin - r, H - margin);
      ctx.lineTo(margin + r, H - margin);
      ctx.quadraticCurveTo(margin, H - margin, margin, H - margin - r);
      ctx.lineTo(margin, margin + r);
      ctx.quadraticCurveTo(margin, margin, margin + r, margin);
      ctx.closePath();
      ctx.stroke();
    }

    function drawObstacles() {
      const lo = getLayout();
      for (const obs of lo.obstacles) {
        if (obs.type === "sand") {
          ctx.fillStyle = "#d4b96a";
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          // Sand dots
          ctx.fillStyle = "#c4a85a";
          for (let i = 0; i < 12; i++) {
            const sx = obs.x + 4 + ((i * 37) % (obs.w - 8));
            const sy = obs.y + 4 + ((i * 23) % (obs.h - 8));
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = "#b89840";
          ctx.lineWidth = 1;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        } else {
          // Water
          ctx.fillStyle = "#2a6faa";
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          // Ripple lines
          ctx.strokeStyle = "rgba(100, 180, 255, 0.4)";
          ctx.lineWidth = 1;
          const t = Date.now() * 0.002;
          for (let i = 0; i < 3; i++) {
            const ry = obs.y + obs.h * (0.25 + i * 0.25);
            ctx.beginPath();
            for (let x = obs.x; x < obs.x + obs.w; x += 2) {
              const yy = ry + Math.sin(x * 0.08 + t + i) * 2;
              if (x === obs.x) ctx.moveTo(x, yy);
              else ctx.lineTo(x, yy);
            }
            ctx.stroke();
          }
          ctx.strokeStyle = "#1a4f80";
          ctx.lineWidth = 1;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        }
      }
    }

    function drawHole() {
      const lo = getLayout();
      // Shadow
      ctx.beginPath();
      ctx.arc(lo.holeX + 1, lo.holeY + 1, HOLE_R + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();
      // Hole
      ctx.beginPath();
      ctx.arc(lo.holeX, lo.holeY, HOLE_R, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
      // Rim
      ctx.beginPath();
      ctx.arc(lo.holeX, lo.holeY, HOLE_R + 1, 0, Math.PI * 2);
      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Flag pole
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lo.holeX, lo.holeY);
      ctx.lineTo(lo.holeX, lo.holeY - 35);
      ctx.stroke();
      // Flag
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(lo.holeX, lo.holeY - 35);
      ctx.lineTo(lo.holeX + 16, lo.holeY - 29);
      ctx.lineTo(lo.holeX, lo.holeY - 23);
      ctx.closePath();
      ctx.fill();
    }

    function drawBall() {
      if (state.sunk || state.inWater) return;
      const { x, y } = state.ball;
      // Shadow
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fill();
      // Ball
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      // Shine
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    function drawAimLine() {
      if (!state.aiming) return;
      const { ball, aimX, aimY } = state;
      const dx = ball.x - aimX;
      const dy = ball.y - aimY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(dist * 0.06, MAX_POWER);
      const angle = Math.atan2(dy, dx);
      const lineLen = power * 20;

      // Power indicator rubber band line (behind ball)
      ctx.strokeStyle = "rgba(255, 80, 80, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(aimX, aimY);
      ctx.stroke();

      // Dotted aim line (forward direction)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x + Math.cos(angle) * lineLen, ball.y + Math.sin(angle) * lineLen);
      ctx.stroke();
      ctx.setLineDash([]);

      // Power bar
      const barW = 60;
      const barH = 6;
      const barX = ball.x - barW / 2;
      const barY = ball.y + 16;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      const pct = power / MAX_POWER;
      const r = Math.floor(255 * pct);
      const g = Math.floor(255 * (1 - pct));
      ctx.fillStyle = `rgb(${r},${g},0)`;
      ctx.fillRect(barX, barY, barW * pct, barH);
    }

    function drawHUD() {
      const lo = getLayout();
      // Top bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Hole ${state.holeIdx + 1}/9`, 8, 13);
      ctx.textAlign = "center";
      ctx.fillText(`Par ${lo.par}`, W / 2, 13);
      ctx.textAlign = "right";
      ctx.fillText(`Strokes: ${state.strokes}`, W - 8, 13);
      ctx.textAlign = "left";
    }

    function drawSunkMessage() {
      if (!state.sunk) return;
      const lo = getLayout();
      const diff = state.strokes - lo.par;
      let label: string;
      if (state.strokes === 1) label = "Hole in One!!!";
      else if (diff <= -2) label = "Eagle!";
      else if (diff === -1) label = "Birdie!";
      else if (diff === 0) label = "Par";
      else if (diff === 1) label = "Bogey";
      else if (diff === 2) label = "Double Bogey";
      else label = `+${diff}`;

      // Background overlay
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W / 2 - 110, H / 2 - 40, 220, 80);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 110, H / 2 - 40, 220, 80);

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, W / 2, H / 2 - 8);
      ctx.fillStyle = "#ccc";
      ctx.font = "13px monospace";
      ctx.fillText(`${state.strokes} stroke${state.strokes !== 1 ? "s" : ""}  |  Par ${lo.par}`, W / 2, H / 2 + 14);
      ctx.fillStyle = "#888";
      ctx.font = "11px monospace";
      ctx.fillText("Click to continue", W / 2, H / 2 + 32);
      ctx.textAlign = "left";
    }

    function drawWaterMessage() {
      if (!state.inWater) return;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(W / 2 - 80, H / 2 - 20, 160, 40);
      ctx.fillStyle = "#60a5fa";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Splash! +1", W / 2, H / 2 + 6);
      ctx.textAlign = "left";
    }

    function updateBall() {
      if (state.sunk || state.inWater) return;
      const { ball } = state;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (speed < 0.08) {
        ball.vx = 0;
        ball.vy = 0;
        return;
      }

      ball.x += ball.vx;
      ball.y += ball.vy;

      // Friction
      const inSand = isInObstacle(ball.x, ball.y, "sand");
      const fric = inSand ? SAND_FRICTION : FRICTION;
      ball.vx *= fric;
      ball.vy *= fric;

      // Water check
      if (isInObstacle(ball.x, ball.y, "water")) {
        soundSplash();
        state.inWater = true;
        state.waterTimer = 60;
        state.strokes++;
        setStrokes(state.strokes);
        return;
      }

      // Wall bounces (within green margin)
      const m = 22;
      if (ball.x < m + BALL_R) { ball.x = m + BALL_R; ball.vx *= -0.5; }
      if (ball.x > W - m - BALL_R) { ball.x = W - m - BALL_R; ball.vx *= -0.5; }
      if (ball.y < m + BALL_R) { ball.y = m + BALL_R; ball.vy *= -0.5; }
      if (ball.y > H - m - BALL_R) { ball.y = H - m - BALL_R; ball.vy *= -0.5; }

      // Hole detection
      const lo = getLayout();
      const dx = ball.x - lo.holeX;
      const dy = ball.y - lo.holeY;
      const distToHole = Math.sqrt(dx * dx + dy * dy);
      const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (distToHole < HOLE_R && currentSpeed < SINK_SPEED) {
        state.sunk = true;
        state.sunkTimer = 0;
        ball.vx = 0;
        ball.vy = 0;
        ball.x = lo.holeX;
        ball.y = lo.holeY;
        soundHoleIn();
      }
    }

    function loop() {
      updateBall();

      // Water reset timer
      if (state.inWater) {
        state.waterTimer--;
        if (state.waterTimer <= 0) {
          state.inWater = false;
          const lo = getLayout();
          state.ball.x = lo.ballX;
          state.ball.y = lo.ballY;
          state.ball.vx = 0;
          state.ball.vy = 0;
        }
      }

      drawGreen();
      drawObstacles();
      drawHole();
      drawBall();
      drawAimLine();
      drawHUD();
      drawSunkMessage();
      drawWaterMessage();

      animId = requestAnimationFrame(loop);
    }

    function getCanvasPos(e: MouseEvent | TouchEvent) {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width;
      const sy = H / rect.height;
      if ("touches" in e) {
        const t = e.touches[0] || (e as any).changedTouches[0];
        return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
      }
      return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
    }

    function onDown(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      if (state.inWater) return;

      if (state.sunk) {
        // Advance to next hole
        const nextIdx = state.holeIdx + 1;
        setScorecard(prev => [...prev, state.strokes]);
        if (nextIdx >= 9) {
          setGameOver(true);
          setShowScorecard(true);
          return;
        }
        state.holeIdx = nextIdx;
        setHoleNum(nextIdx + 1);
        const lo = HOLES[nextIdx];
        state.ball = { x: lo.ballX, y: lo.ballY, vx: 0, vy: 0 };
        state.sunk = false;
        state.strokes = 0;
        setStrokes(0);
        return;
      }

      const { ball } = state;
      if (ball.vx !== 0 || ball.vy !== 0) return;

      const pos = getCanvasPos(e);
      const dx = pos.x - ball.x;
      const dy = pos.y - ball.y;
      if (Math.sqrt(dx * dx + dy * dy) > 80) return; // Must click near ball

      state.aiming = true;
      state.aimX = pos.x;
      state.aimY = pos.y;
    }

    function onMove(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      if (!state.aiming) return;
      const pos = getCanvasPos(e);
      state.aimX = pos.x;
      state.aimY = pos.y;
    }

    function onUp(e: MouseEvent | TouchEvent) {
      e.preventDefault();
      if (!state.aiming) return;
      state.aiming = false;
      const { ball, aimX, aimY } = state;
      const dx = ball.x - aimX;
      const dy = ball.y - aimY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) return; // Too small, ignore
      const power = Math.min(dist * 0.06, MAX_POWER);
      const angle = Math.atan2(dy, dx);
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power;
      state.strokes++;
      setStrokes(state.strokes);
      soundPutt();
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, []);

  const totalStrokes = scorecard.reduce((a, b) => a + b, 0) + (gameOver ? 0 : strokes);
  const totalPar = scorecard.reduce((sum, _, i) => sum + HOLES[i].par, 0)
    + (gameOver ? 0 : HOLES[Math.min(holeNum - 1, 8)].par);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, background: "#111", minHeight: "100vh" }}>
      <div style={{ color: "#aaa", fontSize: 13, marginBottom: 8, fontFamily: "monospace", textAlign: "center" }}>
        Drag backward from ball to aim and set power. Release to putt.
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 10,
          cursor: "crosshair",
          maxWidth: "100%",
          height: "auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      />

      {/* Mini scorecard below canvas */}
      {scorecard.length > 0 && !showScorecard && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowScorecard(true)}
            style={{
              background: "none",
              border: "1px solid #555",
              color: "#aaa",
              padding: "4px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            View Scorecard
          </button>
        </div>
      )}

      {/* Full scorecard overlay */}
      {showScorecard && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !gameOver && setShowScorecard(false)}
        >
          <div
            style={{
              background: "#1e1e2e",
              borderRadius: 12,
              padding: 24,
              minWidth: 340,
              maxWidth: "90vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#fff", fontFamily: "monospace", margin: "0 0 16px", textAlign: "center" }}>
              {gameOver ? "Final Scorecard" : "Scorecard"}
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ color: "#888", padding: "4px 8px", borderBottom: "1px solid #333", textAlign: "left" }}>Hole</th>
                  <th style={{ color: "#888", padding: "4px 8px", borderBottom: "1px solid #333", textAlign: "center" }}>Par</th>
                  <th style={{ color: "#888", padding: "4px 8px", borderBottom: "1px solid #333", textAlign: "center" }}>Score</th>
                  <th style={{ color: "#888", padding: "4px 8px", borderBottom: "1px solid #333", textAlign: "center" }}>+/-</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.map((s, i) => {
                  const diff = s - HOLES[i].par;
                  const diffColor = diff < 0 ? "#10b981" : diff === 0 ? "#eee" : "#ef4444";
                  const diffLabel = diff === 0 ? "E" : (diff > 0 ? "+" : "") + diff;
                  return (
                    <tr key={i}>
                      <td style={{ color: "#ccc", padding: "4px 8px", borderBottom: "1px solid #222" }}>{i + 1}</td>
                      <td style={{ color: "#999", padding: "4px 8px", borderBottom: "1px solid #222", textAlign: "center" }}>{HOLES[i].par}</td>
                      <td style={{ color: "#fff", padding: "4px 8px", borderBottom: "1px solid #222", textAlign: "center", fontWeight: "bold" }}>{s}</td>
                      <td style={{ color: diffColor, padding: "4px 8px", borderBottom: "1px solid #222", textAlign: "center", fontWeight: "bold" }}>{diffLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ color: "#fff", padding: "6px 8px", fontWeight: "bold", borderTop: "2px solid #444" }}>Total</td>
                  <td style={{ color: "#999", padding: "6px 8px", textAlign: "center", borderTop: "2px solid #444" }}>
                    {scorecard.reduce((sum, _, i) => sum + HOLES[i].par, 0)}
                  </td>
                  <td style={{ color: "#fff", padding: "6px 8px", textAlign: "center", fontWeight: "bold", borderTop: "2px solid #444" }}>
                    {scorecard.reduce((a, b) => a + b, 0)}
                  </td>
                  <td style={{
                    padding: "6px 8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "2px solid #444",
                    color: (() => {
                      const total = scorecard.reduce((a, b) => a + b, 0);
                      const parTotal = scorecard.reduce((sum, _, i) => sum + HOLES[i].par, 0);
                      const d = total - parTotal;
                      return d < 0 ? "#10b981" : d === 0 ? "#eee" : "#ef4444";
                    })(),
                  }}>
                    {(() => {
                      const total = scorecard.reduce((a, b) => a + b, 0);
                      const parTotal = scorecard.reduce((sum, _, i) => sum + HOLES[i].par, 0);
                      const d = total - parTotal;
                      return d === 0 ? "E" : (d > 0 ? "+" : "") + d;
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
            {gameOver ? (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button
                  onClick={resetGame}
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    padding: "8px 24px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  Play Again
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginTop: 12, color: "#666", fontSize: 11 }}>
                Click outside to close
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
