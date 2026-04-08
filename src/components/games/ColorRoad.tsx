"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const W = 300, H = 500;
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow"];
const ROAD_W = 120;
const BALL_R = 12;
const ROAD_X = W / 2;

interface RoadSection {
  y: number;
  height: number;
  colorIdx: number;
}

export default function ColorRoad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [ballColor, setBallColor] = useState(0);

  const gameRef = useRef<{
    ballColorIdx: number;
    sections: RoadSection[];
    scrollY: number;
    speed: number;
    score: number;
    running: boolean;
    frame: number;
    ballX: number;
    ballPulse: number;
    particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[];
    nextSectionY: number;
  }>({
    ballColorIdx: 0,
    sections: [],
    scrollY: 0,
    speed: 2,
    score: 0,
    running: false,
    frame: 0,
    ballX: W / 2,
    ballPulse: 0,
    particles: [],
    nextSectionY: 0,
  });

  const generateSections = (startY: number, count: number): RoadSection[] => {
    const sections: RoadSection[] = [];
    let y = startY;
    for (let i = 0; i < count; i++) {
      const height = 60 + Math.random() * 80;
      sections.push({
        y,
        height,
        colorIdx: Math.floor(Math.random() * COLORS.length),
      });
      y -= height;
    }
    return sections;
  };

  const startGame = () => {
    const sections = generateSections(H + 100, 30);
    const g = gameRef.current;
    g.ballColorIdx = 0;
    g.sections = sections;
    g.scrollY = 0;
    g.speed = 2;
    g.score = 0;
    g.running = true;
    g.frame = 0;
    g.ballX = W / 2;
    g.ballPulse = 0;
    g.particles = [];
    g.nextSectionY = sections[sections.length - 1].y - sections[sections.length - 1].height;
    setScore(0);
    setBallColor(0);
    setScreen("play");
  };

  const changeBallColor = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.ballColorIdx = (g.ballColorIdx + 1) % COLORS.length;
    g.ballPulse = 8;
    setBallColor(g.ballColorIdx);
    // Color change particles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      g.particles.push({
        x: g.ballX,
        y: H - 60,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 1,
        color: COLORS[g.ballColorIdx],
      });
    }
  }, []);

  useEffect(() => {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const g = gameRef.current;
    let animId: number;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        changeBallColor();
      }
    };
    const handleClick = () => changeBallColor();
    const handleTouch = (e: TouchEvent) => { e.preventDefault(); changeBallColor(); };

    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch);

    const loop = () => {
      if (!g.running) return;
      g.frame++;

      // Scroll
      g.scrollY += g.speed;
      g.score = Math.floor(g.scrollY / 10);
      setScore(g.score);

      // Speed increase
      g.speed = 2 + g.score * 0.005;

      // Generate more sections
      if (g.scrollY > -g.nextSectionY - H) {
        const newSections = generateSections(g.nextSectionY, 15);
        g.sections.push(...newSections);
        g.nextSectionY = newSections[newSections.length - 1].y - newSections[newSections.length - 1].height;
      }

      // Cleanup old sections
      g.sections = g.sections.filter((s) => s.y + g.scrollY - s.height < H + 200);

      // Check collision - which section is the ball on
      const ballWorldY = H - 60 - g.scrollY;
      let onSection: RoadSection | null = null;
      for (const s of g.sections) {
        const sTop = s.y - s.height;
        if (ballWorldY <= s.y && ballWorldY >= sTop) {
          onSection = s;
          break;
        }
      }

      if (onSection && onSection.colorIdx !== g.ballColorIdx) {
        g.running = false;
        // Death particles
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20;
          g.particles.push({
            x: g.ballX,
            y: H - 60,
            vx: Math.cos(angle) * (3 + Math.random() * 4),
            vy: Math.sin(angle) * (3 + Math.random() * 4),
            life: 1,
            color: COLORS[g.ballColorIdx],
          });
        }
        setHighScore((h) => Math.max(h, g.score));
        setTimeout(() => setScreen("over"), 500);
      }

      // Ball pulse
      if (g.ballPulse > 0) g.ballPulse -= 0.5;

      // Particles
      for (const p of g.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
      }
      g.particles = g.particles.filter((p) => p.life > 0);

      // Draw
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Side decorations
      ctx.fillStyle = "#0d0d28";
      ctx.fillRect(0, 0, (W - ROAD_W) / 2 - 4, H);
      ctx.fillRect((W + ROAD_W) / 2 + 4, 0, (W - ROAD_W) / 2 - 4, H);

      // Road edges
      ctx.strokeStyle = "#2a2a5a";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      const dashOffset = (g.scrollY * 2) % 16;
      ctx.lineDashOffset = dashOffset;
      ctx.beginPath();
      ctx.moveTo((W - ROAD_W) / 2, 0);
      ctx.lineTo((W - ROAD_W) / 2, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((W + ROAD_W) / 2, 0);
      ctx.lineTo((W + ROAD_W) / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Road sections
      for (const s of g.sections) {
        const screenY = s.y + g.scrollY;
        const screenTop = screenY - s.height;
        if (screenTop > H || screenY < 0) continue;

        const drawY = Math.max(0, screenTop);
        const drawH = Math.min(H, screenY) - drawY;

        ctx.fillStyle = COLORS[s.colorIdx] + "33";
        ctx.fillRect((W - ROAD_W) / 2, drawY, ROAD_W, drawH);

        // Section border
        ctx.fillStyle = COLORS[s.colorIdx] + "66";
        ctx.fillRect((W - ROAD_W) / 2, drawY, ROAD_W, 3);

        // Color indicator on side
        ctx.fillStyle = COLORS[s.colorIdx];
        ctx.fillRect((W - ROAD_W) / 2 - 4, drawY, 4, drawH);
        ctx.fillRect((W + ROAD_W) / 2, drawY, 4, drawH);
      }

      // Upcoming color indicator
      let nextSection: RoadSection | null = null;
      for (const s of g.sections) {
        const screenY = s.y + g.scrollY;
        const screenTop = screenY - s.height;
        if (screenTop < H - 80 && screenY > H - 80) {
          nextSection = s;
          break;
        }
      }

      // Score particles / trail
      if (g.frame % 3 === 0) {
        g.particles.push({
          x: g.ballX + (Math.random() - 0.5) * 6,
          y: H - 55,
          vx: 0,
          vy: 1,
          life: 0.5,
          color: COLORS[g.ballColorIdx] + "88",
        });
      }

      // Particles
      for (const p of g.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ball
      const pulseR = BALL_R + g.ballPulse;
      const ballGrad = ctx.createRadialGradient(g.ballX - 3, H - 63, pulseR * 0.2, g.ballX, H - 60, pulseR);
      ballGrad.addColorStop(0, "#fff");
      ballGrad.addColorStop(0.4, COLORS[g.ballColorIdx]);
      ballGrad.addColorStop(1, COLORS[g.ballColorIdx] + "88");
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(g.ballX, H - 60, pulseR, 0, Math.PI * 2);
      ctx.fill();

      // Ball glow
      ctx.shadowColor = COLORS[g.ballColorIdx];
      ctx.shadowBlur = 15;
      ctx.fillStyle = "transparent";
      ctx.beginPath();
      ctx.arc(g.ballX, H - 60, pulseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Color cycle indicator
      const indicatorY = H - 20;
      for (let i = 0; i < COLORS.length; i++) {
        const ix = W / 2 + (i - 1.5) * 24;
        const isCurrent = i === g.ballColorIdx;
        ctx.fillStyle = isCurrent ? COLORS[i] : COLORS[i] + "44";
        ctx.beginPath();
        ctx.arc(ix, indicatorY, isCurrent ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        if (isCurrent) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Score on canvas
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${g.score}m`, W / 2, 24);

      // Speed indicator
      ctx.fillStyle = "#555";
      ctx.font = "11px sans-serif";
      ctx.fillText(`Speed: ${g.speed.toFixed(1)}x`, W / 2, 42);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleTouch);
    };
  }, [screen, changeBallColor]);

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 8 }}>Color Road</h1>
        <p style={{ color: "#888", marginBottom: 8 }}>Match your ball color to the road!</p>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>Tap / Space / Up to change color</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {COLORS.map((c, i) => (
            <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: c }} />
          ))}
        </div>
        {highScore > 0 && <p style={{ color: "#f59e0b", marginBottom: 16 }}>Best: {highScore}m</p>}
        <button onClick={startGame} style={{ padding: "14px 48px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
          Play
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 38, color: "#ef4444", marginBottom: 10 }}>Wrong Color!</h1>
        <div style={{ background: card, borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 42, fontWeight: 800, color: accent, margin: 0 }}>{score}m</p>
          <p style={{ color: "#888", margin: "4px 0" }}>DISTANCE</p>
          {score >= highScore && score > 0 && <p style={{ color: "#f59e0b", fontWeight: 600, marginTop: 8 }}>New Record!</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>
            Play Again
          </button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>
            Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: W, marginBottom: 8 }}>
        <div style={{ background: card, borderRadius: 8, padding: "4px 12px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>SCORE </span>
          <span style={{ color: accent, fontWeight: 700 }}>{score}m</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#888", fontSize: 11 }}>COLOR: </span>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: COLORS[ballColor], border: "2px solid #fff" }} />
        </div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, border: "2px solid #222", cursor: "pointer" }} />
      <p style={{ color: "#555", fontSize: 12, marginTop: 8 }}>Tap or press Space to change color</p>
    </div>
  );
}
