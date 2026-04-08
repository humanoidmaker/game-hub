import { useRef, useEffect, useState, useCallback } from "react";

const W = 400, H = 500;
const BALL_R = 10;
const GRAVITY = 0.3;
const BALL_START_X = 60;
const BALL_START_Y = H - 60;
const HOOP_X = 320;
const HOOP_Y = 160;
const RIM_LEFT = HOOP_X - 22;
const RIM_RIGHT = HOOP_X + 22;
const BACKBOARD_X = 360;
const BACKBOARD_TOP = 100;
const BACKBOARD_BOTTOM = 210;
const SHOTS_PER_ROUND = 10;
const MAX_TRAIL = 30;

function playSound(type: "swoosh" | "bounce" | "crowd") {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    if (type === "swoosh") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
      osc.start(); osc.stop(ac.currentTime + 0.3);
    } else if (type === "bounce") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.start(); osc.stop(ac.currentTime + 0.15);
    } else if (type === "crowd") {
      const buf = ac.createBuffer(1, ac.sampleRate * 0.8, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.08 * (1 - i / data.length);
      const noise = ac.createBufferSource();
      noise.buffer = buf;
      const filter = ac.createBiquadFilter();
      filter.type = "bandpass"; filter.frequency.value = 1200; filter.Q.value = 0.5;
      noise.connect(filter); filter.connect(ac.destination);
      noise.start(); noise.stop(ac.currentTime + 0.8);
      osc.frequency.value = 0; gain.gain.value = 0; osc.start(); osc.stop(ac.currentTime + 0.01);
    }
  } catch {}
}

function simulateTrajectory(
  x: number, y: number, vx: number, vy: number, steps: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let cx = x, cy = y, cvx = vx, cvy = vy;
  for (let i = 0; i < steps; i++) {
    cvy += GRAVITY;
    cx += cvx;
    cy += cvy;
    pts.push({ x: cx, y: cy });
    if (cy > H || cx < 0 || cx > W) break;
  }
  return pts;
}

export default function BasketballFreeThrow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ball: { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0 },
    shooting: false,
    dragging: false,
    dragStart: { x: 0, y: 0 },
    dragEnd: { x: 0, y: 0 },
    trail: [] as { x: number; y: number }[],
    score: 0,
    shots: 0,
    streak: 0,
    bestStreak: 0,
    highScore: 0,
    hitBackboard: false,
    scored: false,
    passedRimY: false,
    result: "" as string,
    resultTimer: 0,
    resultColor: "#fff",
    roundOver: false,
  });
  const [display, setDisplay] = useState({ score: 0, shots: 0, streak: 0, highScore: 0, result: "", roundOver: false });
  const animRef = useRef(0);

  const resetBall = useCallback(() => {
    const s = stateRef.current;
    s.ball = { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0 };
    s.shooting = false;
    s.trail = [];
    s.hitBackboard = false;
    s.scored = false;
    s.passedRimY = false;
    s.result = "";
    s.resultTimer = 0;
  }, []);

  const startNewRound = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.shots = 0;
    s.streak = 0;
    s.roundOver = false;
    resetBall();
    setDisplay({ score: 0, shots: 0, streak: 0, highScore: s.highScore, result: "", roundOver: false });
  }, [resetBall]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;

    try {
      s.highScore = parseInt(localStorage.getItem("bball_high") || "0") || 0;
    } catch { s.highScore = 0; }

    setDisplay(d => ({ ...d, highScore: s.highScore }));

    const drawBackboard = () => {
      // Pole
      ctx.fillStyle = "#555";
      ctx.fillRect(BACKBOARD_X + 8, BACKBOARD_TOP - 10, 6, H - BACKBOARD_TOP + 10);
      // Board
      ctx.fillStyle = "#ddd";
      ctx.fillRect(BACKBOARD_X - 2, BACKBOARD_TOP, 12, BACKBOARD_BOTTOM - BACKBOARD_TOP);
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 2;
      ctx.strokeRect(BACKBOARD_X - 2, BACKBOARD_TOP, 12, BACKBOARD_BOTTOM - BACKBOARD_TOP);
      // Square target on backboard
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(BACKBOARD_X - 2, HOOP_Y - 20, 10, 40);
    };

    const drawHoop = () => {
      // Rim bracket
      ctx.strokeStyle = "#b91c1c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(BACKBOARD_X - 2, HOOP_Y);
      ctx.lineTo(RIM_LEFT, HOOP_Y);
      ctx.stroke();
      // Rim
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(RIM_LEFT, HOOP_Y);
      ctx.lineTo(RIM_RIGHT, HOOP_Y);
      ctx.stroke();
      // Rim ends (circles)
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(RIM_LEFT, HOOP_Y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(RIM_RIGHT, HOOP_Y, 3, 0, Math.PI * 2); ctx.fill();
    };

    const drawNet = () => {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      const netDepth = 35;
      const netSegments = 5;
      for (let i = 0; i <= netSegments; i++) {
        const topX = RIM_LEFT + (i / netSegments) * (RIM_RIGHT - RIM_LEFT);
        const bottomX = RIM_LEFT + 6 + ((i / netSegments) * (RIM_RIGHT - RIM_LEFT - 12));
        ctx.beginPath();
        ctx.moveTo(topX, HOOP_Y + 2);
        ctx.quadraticCurveTo(
          (topX + bottomX) / 2 + Math.sin(Date.now() / 300 + i) * 1.5,
          HOOP_Y + netDepth * 0.6,
          bottomX, HOOP_Y + netDepth
        );
        ctx.stroke();
      }
      // Horizontal net lines
      for (let row = 1; row <= 3; row++) {
        const t = row / 4;
        const y = HOOP_Y + 2 + t * netDepth;
        const shrink = t * 6;
        ctx.beginPath();
        ctx.moveTo(RIM_LEFT + shrink, y);
        ctx.lineTo(RIM_RIGHT - shrink, y);
        ctx.stroke();
      }
    };

    const drawBall = (x: number, y: number) => {
      // Shadow
      ctx.beginPath();
      ctx.ellipse(x, H - 10, BALL_R * 0.8, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fill();
      // Ball
      const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, BALL_R);
      grad.addColorStop(0, "#fbbf24");
      grad.addColorStop(0.5, "#f97316");
      grad.addColorStop(1, "#c2410c");
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Lines on ball
      ctx.strokeStyle = "rgba(124,45,18,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - BALL_R, y); ctx.lineTo(x + BALL_R, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - BALL_R); ctx.lineTo(x, y + BALL_R); ctx.stroke();
    };

    const drawTrail = () => {
      if (s.trail.length < 2) return;
      for (let i = 1; i < s.trail.length; i++) {
        const alpha = (i / s.trail.length) * 0.5;
        ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
        ctx.lineWidth = (i / s.trail.length) * 3;
        ctx.beginPath();
        ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
        ctx.lineTo(s.trail[i].x, s.trail[i].y);
        ctx.stroke();
      }
    };

    const drawPreview = () => {
      if (s.shooting || !s.dragging) return;
      const dx = s.dragStart.x - s.dragEnd.x;
      const dy = s.dragStart.y - s.dragEnd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) return;
      const power = Math.min(dist * 0.14, 14);
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * power;
      const vy = Math.sin(angle) * power;
      const pts = simulateTrajectory(s.ball.x, s.ball.y, vx, vy, 60);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(s.ball.x, s.ball.y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Power indicator
      const pct = power / 14;
      const barW = 60;
      ctx.fillStyle = "#333";
      ctx.fillRect(s.ball.x - barW / 2, s.ball.y + 20, barW, 6);
      ctx.fillStyle = pct < 0.4 ? "#22c55e" : pct < 0.75 ? "#eab308" : "#ef4444";
      ctx.fillRect(s.ball.x - barW / 2, s.ball.y + 20, barW * pct, 6);
    };

    const drawCourt = () => {
      // Floor
      ctx.fillStyle = "#3d2b1f";
      ctx.fillRect(0, H - 20, W, 20);
      ctx.strokeStyle = "#5a3e2b";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H - 20); ctx.lineTo(W, H - 20); ctx.stroke();
      // Court lines
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, H - 20); ctx.lineTo(x, H); ctx.stroke();
      }
    };

    const drawHUD = () => {
      // Score panel
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${s.score}`, 12, 18);
      ctx.fillStyle = "#aaa";
      ctx.font = "12px system-ui";
      ctx.fillText(`Shots: ${s.shots}/${SHOTS_PER_ROUND}`, 12, 35);
      // Streak
      ctx.textAlign = "center";
      if (s.streak > 0) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 14px system-ui";
        ctx.fillText(`Streak: ${s.streak}`, W / 2, 28);
      }
      // High score
      ctx.textAlign = "right";
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 14px system-ui";
      ctx.fillText(`Best: ${s.highScore}`, W - 12, 18);
      ctx.fillStyle = "#aaa";
      ctx.font = "12px system-ui";
      ctx.fillText(`Best streak: ${s.bestStreak}`, W - 12, 35);
    };

    const drawResult = () => {
      if (!s.result || s.resultTimer <= 0) return;
      const alpha = Math.min(s.resultTimer / 30, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.resultColor;
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      const yOff = (1 - alpha) * -20;
      ctx.fillText(s.result, W / 2, H / 2 - 40 + yOff);
      ctx.globalAlpha = 1;
    };

    const drawRoundOver = () => {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Round Over!", W / 2, H / 2 - 60);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 24px system-ui";
      ctx.fillText(`Final Score: ${s.score}`, W / 2, H / 2 - 20);
      if (s.score >= s.highScore && s.score > 0) {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 18px system-ui";
        ctx.fillText("New High Score!", W / 2, H / 2 + 15);
      }
      ctx.fillStyle = "#aaa";
      ctx.font = "16px system-ui";
      ctx.fillText("Click to play again", W / 2, H / 2 + 55);
    };

    const update = () => {
      if (!s.shooting) return;
      s.ball.vy += GRAVITY;
      s.ball.x += s.ball.vx;
      s.ball.y += s.ball.vy;
      s.trail.push({ x: s.ball.x, y: s.ball.y });
      if (s.trail.length > MAX_TRAIL) s.trail.shift();

      // Backboard collision
      if (
        s.ball.x + BALL_R >= BACKBOARD_X - 2 &&
        s.ball.y >= BACKBOARD_TOP &&
        s.ball.y <= BACKBOARD_BOTTOM &&
        s.ball.vx > 0
      ) {
        s.ball.x = BACKBOARD_X - 2 - BALL_R;
        s.ball.vx *= -0.6;
        s.hitBackboard = true;
        playSound("bounce");
      }

      // Rim collision (left edge)
      const dlx = s.ball.x - RIM_LEFT;
      const dly = s.ball.y - HOOP_Y;
      const distL = Math.sqrt(dlx * dlx + dly * dly);
      if (distL < BALL_R + 3) {
        const nx = dlx / distL;
        const ny = dly / distL;
        const dot = s.ball.vx * nx + s.ball.vy * ny;
        s.ball.vx -= 1.5 * dot * nx;
        s.ball.vy -= 1.5 * dot * ny;
        s.ball.x = RIM_LEFT + nx * (BALL_R + 4);
        s.ball.y = HOOP_Y + ny * (BALL_R + 4);
        s.ball.vx *= 0.7;
        s.ball.vy *= 0.7;
        playSound("bounce");
      }

      // Rim collision (right edge)
      const drx = s.ball.x - RIM_RIGHT;
      const dry = s.ball.y - HOOP_Y;
      const distR = Math.sqrt(drx * drx + dry * dry);
      if (distR < BALL_R + 3) {
        const nx = drx / distR;
        const ny = dry / distR;
        const dot = s.ball.vx * nx + s.ball.vy * ny;
        s.ball.vx -= 1.5 * dot * nx;
        s.ball.vy -= 1.5 * dot * ny;
        s.ball.x = RIM_RIGHT + nx * (BALL_R + 4);
        s.ball.y = HOOP_Y + ny * (BALL_R + 4);
        s.ball.vx *= 0.7;
        s.ball.vy *= 0.7;
        playSound("bounce");
      }

      // Score detection: ball center passes through rim area going down
      if (
        !s.scored &&
        s.ball.vy > 0 &&
        s.ball.x > RIM_LEFT + 4 &&
        s.ball.x < RIM_RIGHT - 4 &&
        s.ball.y >= HOOP_Y - 2 &&
        s.ball.y <= HOOP_Y + 12 &&
        !s.passedRimY
      ) {
        s.passedRimY = true;
      }
      if (s.passedRimY && !s.scored && s.ball.y > HOOP_Y + 12) {
        if (s.ball.x > RIM_LEFT + 2 && s.ball.x < RIM_RIGHT - 2) {
          s.scored = true;
          if (s.hitBackboard) {
            s.score += 2;
            s.result = "Bank Shot! +2";
            s.resultColor = "#60a5fa";
          } else {
            s.score += 3;
            s.result = "Swish! +3";
            s.resultColor = "#10b981";
          }
          s.streak++;
          if (s.streak > s.bestStreak) s.bestStreak = s.streak;
          s.resultTimer = 90;
          playSound("swoosh");
          setTimeout(() => playSound("crowd"), 200);
          if (s.score > s.highScore) {
            s.highScore = s.score;
            try { localStorage.setItem("bball_high", String(s.highScore)); } catch {}
          }
          syncDisplay();
          setTimeout(() => {
            if (s.shots >= SHOTS_PER_ROUND) {
              s.roundOver = true;
              syncDisplay();
            } else {
              resetBall();
            }
          }, 1000);
        }
      }

      // Out of bounds
      if (s.ball.y > H + 30 || s.ball.x < -30 || s.ball.x > W + 30) {
        if (!s.scored) {
          s.result = "Miss!";
          s.resultColor = "#ef4444";
          s.resultTimer = 60;
          s.streak = 0;
          syncDisplay();
        }
        setTimeout(() => {
          if (s.shots >= SHOTS_PER_ROUND) {
            s.roundOver = true;
            syncDisplay();
          } else {
            resetBall();
          }
        }, 600);
        s.shooting = false;
      }
    };

    const syncDisplay = () => {
      setDisplay({
        score: s.score,
        shots: s.shots,
        streak: s.streak,
        highScore: s.highScore,
        result: s.result,
        roundOver: s.roundOver,
      });
    };

    const loop = () => {
      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#1e293b");
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      drawCourt();
      drawBackboard();
      drawNet();
      drawHoop();
      if (!s.roundOver) {
        update();
        drawTrail();
        drawPreview();
        drawBall(s.ball.x, s.ball.y);
        if (s.resultTimer > 0) s.resultTimer--;
        drawResult();
      }
      drawHUD();
      if (s.roundOver) drawRoundOver();

      animRef.current = requestAnimationFrame(loop);
    };

    const getPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const onDown = (e: MouseEvent) => {
      if (s.roundOver) { startNewRound(); return; }
      if (s.shooting) return;
      const pos = getPos(e);
      s.dragging = true;
      s.dragStart = { x: pos.x, y: pos.y };
      s.dragEnd = { x: pos.x, y: pos.y };
    };

    const onMove = (e: MouseEvent) => {
      if (!s.dragging || s.shooting) return;
      const pos = getPos(e);
      s.dragEnd = { x: pos.x, y: pos.y };
    };

    const onUp = () => {
      if (!s.dragging || s.shooting) return;
      s.dragging = false;
      const dx = s.dragStart.x - s.dragEnd.x;
      const dy = s.dragStart.y - s.dragEnd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) return;
      const power = Math.min(dist * 0.14, 14);
      const angle = Math.atan2(dy, dx);
      s.ball.vx = Math.cos(angle) * power;
      s.ball.vy = Math.sin(angle) * power;
      s.shooting = true;
      s.shots++;
      playSound("swoosh");
      syncDisplay();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (s.roundOver) { startNewRound(); return; }
      if (s.shooting) return;
      const pos = getPos(e.touches[0]);
      s.dragging = true;
      s.dragStart = { x: pos.x, y: pos.y };
      s.dragEnd = { x: pos.x, y: pos.y };
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!s.dragging || s.shooting) return;
      const pos = getPos(e.touches[0]);
      s.dragEnd = { x: pos.x, y: pos.y };
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      onUp();
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [resetBall, startNewRound]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, userSelect: "none" }}>
      <p style={{ color: "#94a3b8", marginBottom: 8, fontSize: 13, textAlign: "center" }}>
        Click &amp; drag away from ball to aim and set power. Release to shoot. Swish = 3pts, Bank shot = 2pts.
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 10,
          cursor: "crosshair",
          maxWidth: "100%",
          height: "auto",
          touchAction: "none",
        }}
      />
    </div>
  );
}
