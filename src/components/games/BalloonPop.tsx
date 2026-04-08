"use client";
import { useRef, useEffect, useState, useCallback } from "react";

interface Balloon {
  x: number;
  y: number;
  r: number;
  color: string;
  speed: number;
  golden: boolean;
  popped: boolean;
  wobble: number;
  wobbleSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

const BALLOON_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4"];

function playPop() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export default function BalloonPop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const gameRef = useRef<{
    balloons: Balloon[];
    particles: Particle[];
    score: number;
    lives: number;
    timeLeft: number;
    combo: number;
    frame: number;
    running: boolean;
  }>({
    balloons: [],
    particles: [],
    score: 0,
    lives: 3,
    timeLeft: 60,
    combo: 0,
    frame: 0,
    running: false,
  });

  const spawnBalloon = useCallback(() => {
    const golden = Math.random() < 0.08;
    const r = 20 + Math.random() * 15;
    const b: Balloon = {
      x: 30 + Math.random() * 340,
      y: 520 + r,
      r,
      color: golden ? "#ffd700" : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
      speed: 0.8 + Math.random() * 1.5,
      golden,
      popped: false,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
    };
    return b;
  }, []);

  const startGame = () => {
    const g = gameRef.current;
    g.balloons = [];
    g.particles = [];
    g.score = 0;
    g.lives = 3;
    g.timeLeft = 60;
    g.combo = 0;
    g.frame = 0;
    g.running = true;
    setScore(0);
    setLives(3);
    setTimeLeft(60);
    setCombo(0);
    setScreen("play");
  };

  useEffect(() => {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const g = gameRef.current;
    let animId: number;
    let lastTimer = Date.now();

    const gameLoop = () => {
      if (!g.running) return;
      const now = Date.now();
      if (now - lastTimer >= 1000) {
        lastTimer = now;
        g.timeLeft--;
        setTimeLeft(g.timeLeft);
        if (g.timeLeft <= 0) {
          g.running = false;
          setHighScore((h) => Math.max(h, g.score));
          setScreen("over");
          return;
        }
      }

      g.frame++;
      if (g.frame % 40 === 0 || (g.frame % 25 === 0 && g.timeLeft < 30)) {
        g.balloons.push(spawnBalloon());
      }

      for (const b of g.balloons) {
        if (b.popped) continue;
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        b.x += Math.sin(b.wobble) * 0.5;
        if (b.y + b.r < 0) {
          b.popped = true;
          g.lives--;
          g.combo = 0;
          setLives(g.lives);
          setCombo(0);
          if (g.lives <= 0) {
            g.running = false;
            setHighScore((h) => Math.max(h, g.score));
            setScreen("over");
            return;
          }
        }
      }

      for (const p of g.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
      }
      g.particles = g.particles.filter((p) => p.life > 0);
      g.balloons = g.balloons.filter((b) => !b.popped);

      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, 400, 500);

      // Stars background
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5) % 400;
        const sy = (i * 97.3 + g.frame * 0.1) % 500;
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(g.frame * 0.02 + i) * 0.15})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Balloons
      for (const b of g.balloons) {
        if (b.popped) continue;
        ctx.save();
        ctx.translate(b.x, b.y);
        // String
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, b.r);
        ctx.quadraticCurveTo(Math.sin(b.wobble) * 5, b.r + 15, 0, b.r + 30);
        ctx.stroke();
        // Balloon body
        const grad = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, b.r * 0.1, 0, 0, b.r);
        if (b.golden) {
          grad.addColorStop(0, "#fff7a0");
          grad.addColorStop(0.5, "#ffd700");
          grad.addColorStop(1, "#b8860b");
        } else {
          grad.addColorStop(0, b.color + "cc");
          grad.addColorStop(1, b.color);
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.r * 0.85, b.r, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.ellipse(-b.r * 0.25, -b.r * 0.3, b.r * 0.2, b.r * 0.15, -0.5, 0, Math.PI * 2);
        ctx.fill();
        // Knot
        ctx.fillStyle = b.golden ? "#b8860b" : b.color;
        ctx.beginPath();
        ctx.moveTo(-3, b.r);
        ctx.lineTo(3, b.r);
        ctx.lineTo(0, b.r + 5);
        ctx.fill();
        if (b.golden) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("3x", 0, 5);
        }
        ctx.restore();
      }

      // Particles
      for (const p of g.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [screen, spawnBalloon]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (400 / rect.width);
    const my = (e.clientY - rect.top) * (500 / rect.height);
    const g = gameRef.current;

    for (let i = g.balloons.length - 1; i >= 0; i--) {
      const b = g.balloons[i];
      if (b.popped) continue;
      const dx = mx - b.x;
      const dy = my - b.y;
      if (dx * dx + dy * dy < b.r * b.r * 1.2) {
        b.popped = true;
        playPop();
        for (let j = 0; j < 12; j++) {
          const angle = (Math.PI * 2 * j) / 12;
          g.particles.push({
            x: b.x, y: b.y,
            vx: Math.cos(angle) * (2 + Math.random() * 3),
            vy: Math.sin(angle) * (2 + Math.random() * 3),
            color: b.golden ? "#ffd700" : b.color,
            life: 1, size: 3 + Math.random() * 3,
          });
        }
        g.combo++;
        const comboBonus = g.combo >= 5 ? 3 : g.combo >= 3 ? 2 : 1;
        const points = (b.golden ? 30 : 10) * comboBonus;
        g.score += points;
        setScore(g.score);
        setCombo(g.combo);
        break;
      }
    }
  };

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 42, color: accent, marginBottom: 8, textShadow: "0 0 20px rgba(0,229,255,0.4)" }}>Balloon Pop</h1>
        <p style={{ color: "#888", marginBottom: 24 }}>Pop balloons before they escape! Golden = 3x points</p>
        {highScore > 0 && <p style={{ color: "#f59e0b", marginBottom: 16 }}>High Score: {highScore}</p>}
        <button onClick={startGame} style={{ padding: "14px 48px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,229,255,0.3)" }}>
          Play
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 38, color: "#ef4444", marginBottom: 10 }}>Game Over</h1>
        <div style={{ background: card, borderRadius: 16, padding: 30, textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 48, fontWeight: 800, color: accent, margin: 0 }}>{score}</p>
          <p style={{ color: "#888", margin: "4px 0 0" }}>SCORE</p>
          {score >= highScore && score > 0 && <p style={{ color: "#f59e0b", fontWeight: 600, marginTop: 8 }}>New High Score!</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>Play Again</button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>Menu</button>
        </div>
      </div>
    );
  }

  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : accent;

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: 400, marginBottom: 10 }}>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>SCORE </span>
          <span style={{ color: accent, fontWeight: 700 }}>{score}</span>
        </div>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>TIME </span>
          <span style={{ color: timerColor, fontWeight: 700 }}>{timeLeft}s</span>
        </div>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>LIVES </span>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>{"♥".repeat(lives)}</span>
        </div>
        {combo >= 2 && (
          <div style={{ background: "rgba(249,115,22,0.2)", borderRadius: 8, padding: "6px 14px" }}>
            <span style={{ color: "#f97316", fontWeight: 700 }}>x{combo} COMBO</span>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} width={400} height={500} onClick={handleCanvasClick} style={{ borderRadius: 12, cursor: "crosshair", border: "2px solid #222" }} />
    </div>
  );
}
