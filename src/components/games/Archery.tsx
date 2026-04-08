import { useRef, useEffect, useState, useCallback } from "react";

const W = 400;
const H = 400;
const CX = W / 2;
const CY = H / 2;
const MAX_RING = 120;
const ARROWS_PER_ROUND = 10;

const RINGS = [
  { radius: 1.0, color: "#ffffff", score: 2, label: "White" },
  { radius: 0.8, color: "#222222", score: 4, label: "Black" },
  { radius: 0.6, color: "#2563eb", score: 6, label: "Blue" },
  { radius: 0.4, color: "#dc2626", score: 8, label: "Red" },
  { radius: 0.2, color: "#eab308", score: 10, label: "Gold" },
];

interface ArrowMark {
  x: number;
  y: number;
  score: number;
}

interface GameState {
  round: number;
  arrowsLeft: number;
  roundScore: number;
  totalScore: number;
  arrowScores: number[];
  arrowMarks: ArrowMark[];
  bestScore: number;
  gameOver: boolean;
  wind: { speed: number; angle: number };
}

function playBowRelease() {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.2);
    // Twang
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(600, ac.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.25);
    gain2.gain.setValueAtTime(0.15, ac.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc2.start(ac.currentTime);
    osc2.stop(ac.currentTime + 0.25);
  } catch {}
}

function playArrowThud() {
  try {
    const ac = new AudioContext();
    const bufSize = ac.sampleRate * 0.1;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.5, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch {}
}

function generateWind(round: number): { speed: number; angle: number } {
  const maxSpeed = Math.min(2 + round * 1.2, 10);
  const speed = Math.random() * maxSpeed;
  const angle = Math.random() * Math.PI * 2;
  return { speed, angle };
}

function scoreForDistance(dist: number): number {
  const ratio = dist / MAX_RING;
  if (ratio > 1) return 0;
  for (let i = RINGS.length - 1; i >= 0; i--) {
    if (ratio <= RINGS[i].radius) return RINGS[i].score;
  }
  return 0;
}

export default function Archery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    round: 1,
    arrowsLeft: ARROWS_PER_ROUND,
    roundScore: 0,
    totalScore: 0,
    arrowScores: [],
    arrowMarks: [],
    bestScore: 0,
    gameOver: false,
    wind: generateWind(1),
  });
  const crosshairRef = useRef({ x: CX, y: CY });
  const animRef = useRef(0);
  const flyingRef = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    progress: number;
    landed: boolean;
  } | null>(null);
  const wobbleTimeRef = useRef(0);
  const lastScorePopRef = useRef<{ score: number; x: number; y: number; time: number } | null>(null);

  const [, forceUpdate] = useState(0);

  const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    const saved = localStorage.getItem("archery_best_score");
    if (saved) stateRef.current.bestScore = parseInt(saved, 10) || 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let running = true;

    const draw = (time: number) => {
      if (!running) return;
      const s = stateRef.current;
      const ch = crosshairRef.current;
      const dt = 16;
      wobbleTimeRef.current += dt;

      // Crosshair wobble
      if (!flyingRef.current && !s.gameOver) {
        const t = wobbleTimeRef.current / 1000;
        const wobbleAmount = 12 + s.wind.speed * 3;
        ch.x = CX + Math.sin(t * 1.7) * wobbleAmount + Math.sin(t * 3.1) * (wobbleAmount * 0.4);
        ch.y = CY + Math.cos(t * 2.3) * wobbleAmount + Math.cos(t * 1.1) * (wobbleAmount * 0.4);
      }

      // Update flying arrow
      const fl = flyingRef.current;
      if (fl && !fl.landed) {
        fl.progress += 0.04;
        if (fl.progress >= 1) {
          fl.progress = 1;
          fl.landed = true;
          fl.x = fl.tx;
          fl.y = fl.ty;
          const dist = Math.sqrt((fl.tx - CX) ** 2 + (fl.ty - CY) ** 2);
          const pts = scoreForDistance(dist);
          s.arrowScores.push(pts);
          s.roundScore += pts;
          s.totalScore += pts;
          s.arrowMarks.push({ x: fl.tx, y: fl.ty, score: pts });
          lastScorePopRef.current = { score: pts, x: fl.tx, y: fl.ty, time: wobbleTimeRef.current };
          playArrowThud();
          rerender();

          setTimeout(() => {
            flyingRef.current = null;
            if (s.arrowsLeft <= 0) {
              if (s.totalScore > s.bestScore) {
                s.bestScore = s.totalScore;
                localStorage.setItem("archery_best_score", String(s.bestScore));
              }
              s.gameOver = true;
              rerender();
            }
          }, 400);
        } else {
          const p = fl.progress;
          const startX = CX - 180;
          const startY = CY + 60;
          fl.x = startX + (fl.tx - startX) * p;
          fl.y = startY + (fl.ty - startY) * p - Math.sin(p * Math.PI) * 30;
        }
      }

      // Clear
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Subtle ground
      ctx.fillStyle = "#16213e";
      ctx.fillRect(0, H - 40, W, 40);

      // Target board (slight 3D effect)
      ctx.fillStyle = "#2a2a3e";
      ctx.beginPath();
      ctx.arc(CX, CY, MAX_RING + 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3a3a5e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw rings from outer to inner
      for (const ring of RINGS) {
        const r = ring.radius * MAX_RING;
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
        ctx.fillStyle = ring.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Bullseye dot
      ctx.beginPath();
      ctx.arc(CX, CY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#b91c1c";
      ctx.fill();

      // Arrow marks on target
      for (const mark of s.arrowMarks) {
        // Arrow shaft sticking out
        ctx.strokeStyle = "#8B6914";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mark.x, mark.y);
        ctx.lineTo(mark.x - 6, mark.y - 10);
        ctx.stroke();
        // Fletching
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(mark.x - 6, mark.y - 10);
        ctx.lineTo(mark.x - 10, mark.y - 16);
        ctx.lineTo(mark.x - 2, mark.y - 13);
        ctx.fill();
        // Impact point
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flying arrow
      if (fl && !fl.landed) {
        const angle = Math.atan2(fl.ty - (CY + 60), fl.tx - (CX - 180));
        const len = 30;
        ctx.save();
        ctx.translate(fl.x, fl.y);
        ctx.rotate(angle);
        // Shaft
        ctx.strokeStyle = "#8B6914";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        // Tip
        ctx.fillStyle = "#aaa";
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-2, -3);
        ctx.lineTo(-2, 3);
        ctx.closePath();
        ctx.fill();
        // Fletching
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(-len - 6, -5);
        ctx.lineTo(-len + 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(-len - 6, 5);
        ctx.lineTo(-len + 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Crosshair (when not flying and not game over)
      if (!flyingRef.current && !s.gameOver && s.arrowsLeft > 0) {
        ctx.strokeStyle = "rgba(255,50,50,0.8)";
        ctx.lineWidth = 1.5;
        const size = 14;
        ctx.beginPath();
        ctx.moveTo(ch.x - size, ch.y);
        ctx.lineTo(ch.x + size, ch.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ch.x, ch.y - size);
        ctx.lineTo(ch.x, ch.y + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ch.x, ch.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Score popup
      const pop = lastScorePopRef.current;
      if (pop) {
        const elapsed = (wobbleTimeRef.current - pop.time) / 1000;
        if (elapsed < 1.2) {
          const alpha = Math.max(0, 1 - elapsed / 1.2);
          const yOff = elapsed * 25;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = "bold 18px 'Segoe UI', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = pop.score >= 10 ? "#fbbf24" : pop.score >= 6 ? "#60a5fa" : pop.score > 0 ? "#e5e7eb" : "#ef4444";
          ctx.fillText(pop.score > 0 ? `+${pop.score}` : "Miss!", pop.x, pop.y - 20 - yOff);
          ctx.restore();
        }
      }

      // Wind indicator (top-right)
      const windX = W - 55;
      const windY = 50;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(windX, windY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = "9px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText("WIND", windX, windY - 20);
      // Wind arrow
      if (s.wind.speed > 0.3) {
        const arrowLen = Math.min(s.wind.speed * 3, 22);
        const wx = Math.cos(s.wind.angle) * arrowLen;
        const wy = Math.sin(s.wind.angle) * arrowLen;
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(windX, windY);
        ctx.lineTo(windX + wx, windY + wy);
        ctx.stroke();
        // Arrowhead
        const headLen = 6;
        const a = s.wind.angle;
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.moveTo(windX + wx, windY + wy);
        ctx.lineTo(
          windX + wx - headLen * Math.cos(a - 0.5),
          windY + wy - headLen * Math.sin(a - 0.5)
        );
        ctx.lineTo(
          windX + wx - headLen * Math.cos(a + 0.5),
          windY + wy - headLen * Math.sin(a + 0.5)
        );
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(windX, windY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#60a5fa";
      ctx.fillText(`${s.wind.speed.toFixed(1)} m/s`, windX, windY + 28);
      ctx.restore();

      // HUD top-left: Round, Arrows, Score
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      roundedRect(ctx, 8, 8, 160, 58, 6);
      ctx.fill();
      ctx.font = "bold 12px 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "left";
      ctx.fillText(`Round ${s.round}`, 16, 26);
      ctx.fillStyle = "#e5e7eb";
      ctx.fillText(`Arrows: ${s.arrowsLeft} / ${ARROWS_PER_ROUND}`, 16, 42);
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`Score: ${s.totalScore}`, 16, 58);
      ctx.restore();

      // HUD bottom: arrow scores
      if (s.arrowScores.length > 0) {
        const barH = 24;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        roundedRect(ctx, 8, H - barH - 8, W - 16, barH, 4);
        ctx.fill();
        ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "center";
        const startRoundIdx = s.arrowScores.length - (ARROWS_PER_ROUND - s.arrowsLeft);
        const roundScores = s.arrowScores.slice(Math.max(0, startRoundIdx));
        for (let i = 0; i < roundScores.length; i++) {
          const sx = 30 + i * 36;
          const val = roundScores[i];
          ctx.fillStyle =
            val >= 10 ? "#fbbf24" : val >= 6 ? "#60a5fa" : val > 0 ? "#e5e7eb" : "#ef4444";
          ctx.fillText(String(val), sx, H - 13);
        }
        ctx.restore();
      }

      // Best score
      if (s.bestScore > 0) {
        ctx.save();
        ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "right";
        ctx.fillText(`Best: ${s.bestScore}`, W - 12, H - 14);
        ctx.restore();
      }

      // Game over overlay
      if (s.gameOver) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 28px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText("Round Complete!", CX, CY - 50);
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "20px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(`Round ${s.round} Score: ${s.roundScore}`, CX, CY - 15);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(`Total: ${s.totalScore}`, CX, CY + 20);
        if (s.totalScore >= s.bestScore) {
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
          ctx.fillText("New Best Score!", CX, CY + 45);
        }
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText("Click to start next round", CX, CY + 75);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [rerender]);

  const handleClick = useCallback(() => {
    const s = stateRef.current;

    if (s.gameOver) {
      // Start next round
      s.round += 1;
      s.arrowsLeft = ARROWS_PER_ROUND;
      s.roundScore = 0;
      s.arrowMarks = [];
      s.gameOver = false;
      s.wind = generateWind(s.round);
      lastScorePopRef.current = null;
      rerender();
      return;
    }

    if (s.arrowsLeft <= 0 || flyingRef.current) return;

    const ch = crosshairRef.current;
    // Apply wind offset + slight random scatter
    const windOffsetX = Math.cos(s.wind.angle) * s.wind.speed * 6;
    const windOffsetY = Math.sin(s.wind.angle) * s.wind.speed * 6;
    const randomX = (Math.random() - 0.5) * 14;
    const randomY = (Math.random() - 0.5) * 14;
    const targetX = ch.x + windOffsetX + randomX;
    const targetY = ch.y + windOffsetY + randomY;

    s.arrowsLeft -= 1;
    playBowRelease();

    flyingRef.current = {
      x: CX - 180,
      y: CY + 60,
      tx: targetX,
      ty: targetY,
      progress: 0,
      landed: false,
    };
    rerender();
  }, [rerender]);

  const handleReset = useCallback(() => {
    const s = stateRef.current;
    s.round = 1;
    s.arrowsLeft = ARROWS_PER_ROUND;
    s.roundScore = 0;
    s.totalScore = 0;
    s.arrowScores = [];
    s.arrowMarks = [];
    s.gameOver = false;
    s.wind = generateWind(1);
    flyingRef.current = null;
    lastScorePopRef.current = null;
    rerender();
  }, [rerender]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 20,
        background: "#0f0f1a",
        borderRadius: 12,
        gap: 10,
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: W,
        }}
      >
        <p
          style={{
            color: "#94a3b8",
            margin: 0,
            fontSize: 13,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
        >
          Click to shoot when crosshair aligns. Wind affects trajectory!
        </p>
        <button
          onClick={handleReset}
          style={{
            background: "none",
            border: "1px solid #334155",
            color: "#94a3b8",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
        >
          Reset
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleClick}
        style={{
          borderRadius: 8,
          cursor: "crosshair",
          display: "block",
        }}
      />
    </div>
  );
}

function roundedRect(
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
