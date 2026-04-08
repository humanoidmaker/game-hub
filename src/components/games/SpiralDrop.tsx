"use client";
import { useRef, useEffect, useState, useCallback } from "react";

export default function SpiralDrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const startGame = useCallback(() => {
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 300, H = 500;
    canvas.width = W;
    canvas.height = H;

    const COLORS = ["#ff6b6b", "#4ecdc4", "#ffd700", "#a855f7"];
    let ballX = W / 2, ballY = 60, ballR = 10;
    let ballColor = 0;
    let ballVy = 0;
    const gravity = 0.12;
    let level = 0;
    let speed = 1;
    let sc = 0;
    let dead = false;
    let animId = 0;

    interface Seg { startAngle: number; endAngle: number; color: number; isGap: boolean }
    interface Ring { y: number; segments: Seg[]; radius: number; rotation: number; rotSpeed: number; passed: boolean }

    const rings: Ring[] = [];
    const ringGap = 85;

    const createRing = (y: number): Ring => {
      const numSeg = 6 + Math.floor(Math.random() * 3);
      const gapCount = 1 + Math.floor(Math.random() * 2);
      const segAngle = (Math.PI * 2) / numSeg;
      const gapIdx = new Set<number>();
      while (gapIdx.size < gapCount) gapIdx.add(Math.floor(Math.random() * numSeg));
      const segments: Seg[] = [];
      for (let i = 0; i < numSeg; i++) {
        segments.push({
          startAngle: segAngle * i,
          endAngle: segAngle * (i + 1) - 0.06,
          color: Math.floor(Math.random() * COLORS.length),
          isGap: gapIdx.has(i),
        });
      }
      return { y, segments, radius: 70 + Math.random() * 30, rotation: 0, rotSpeed: (0.006 + Math.random() * 0.012) * (Math.random() < 0.5 ? 1 : -1) * speed, passed: false };
    };

    for (let i = 0; i < 8; i++) rings.push(createRing(180 + i * ringGap));

    const handleTap = () => { if (!dead) ballColor = (ballColor + 1) % COLORS.length; };
    canvas.addEventListener("click", handleTap);
    const handleTouch = (e: TouchEvent) => { e.preventDefault(); handleTap(); };
    canvas.addEventListener("touchstart", handleTouch);

    // Particles
    const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    const spawnParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 30, color });
      }
    };

    const loop = () => {
      if (dead) return;
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Background stars
      ctx.fillStyle = "#ffffff11";
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 97 + Date.now() * 0.01) % W);
        const sy = ((i * 53 + Date.now() * 0.005) % H);
        ctx.fillRect(sx, sy, 1, 1);
      }

      ballVy += gravity;
      ballY += ballVy;

      // Scroll
      if (ballY > 180) {
        const diff = ballY - 180;
        ballY -= diff;
        rings.forEach(r => r.y -= diff);
      }

      // Remove/add rings
      while (rings.length > 0 && rings[0].y < -60) {
        if (!rings[0].passed) { sc++; level++; }
        rings.shift();
        if (level % 5 === 0) speed = Math.min(speed + 0.15, 2.5);
        setScore(sc);
      }
      while (rings.length < 8) {
        const lastY = rings.length > 0 ? rings[rings.length - 1].y : 200;
        rings.push(createRing(lastY + ringGap));
      }

      // Draw & collide rings
      const cx = W / 2;
      rings.forEach(ring => {
        ring.rotation += ring.rotSpeed;
        ring.segments.forEach(seg => {
          const s = seg.startAngle + ring.rotation;
          const e = seg.endAngle + ring.rotation;
          if (!seg.isGap) {
            ctx.beginPath();
            ctx.arc(cx, ring.y, ring.radius, s, e);
            ctx.lineWidth = 14;
            ctx.strokeStyle = COLORS[seg.color];
            ctx.globalAlpha = 0.9;
            ctx.stroke();
            ctx.globalAlpha = 1;
            // inner glow
            ctx.beginPath();
            ctx.arc(cx, ring.y, ring.radius, s, e);
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#ffffff33";
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(cx, ring.y, ring.radius, s, e);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff0d";
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // Collision
        const dy = ballY - ring.y;
        const dx = ballX - cx;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - ring.radius) < ballR + 7 && Math.abs(dy) < 14) {
          let angle = Math.atan2(dy, dx) - ring.rotation;
          angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          let hitSeg: Seg | null = null;
          for (const seg of ring.segments) {
            let sa = ((seg.startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            let ea = ((seg.endAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (sa < ea ? (angle >= sa && angle <= ea) : (angle >= sa || angle <= ea)) {
              hitSeg = seg; break;
            }
          }
          if (hitSeg && !hitSeg.isGap) {
            if (hitSeg.color === ballColor) {
              ballVy = 2;
              sc += 2;
              ring.passed = true;
              spawnParticles(ballX, ballY, COLORS[ballColor]);
              setScore(sc);
            } else {
              dead = true;
              setGameOver(true);
              setScore(sc);
              return;
            }
          } else if (hitSeg && hitSeg.isGap) {
            ring.passed = true;
          }
        }
      });

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor((p.life / 30) * 255).toString(16).padStart(2, "0");
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Wobble
      ballX += Math.sin(Date.now() * 0.003) * 0.3;
      ballX = Math.max(ballR, Math.min(W - ballR, ballX));

      if (ballY > H + 50) { dead = true; setGameOver(true); setScore(sc); return; }

      // Draw ball
      const gradient = ctx.createRadialGradient(ballX - 3, ballY - 3, 0, ballX, ballY, ballR);
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.3, COLORS[ballColor]);
      gradient.addColorStop(1, COLORS[ballColor] + "88");
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Trail
      ctx.beginPath();
      ctx.arc(ballX, ballY + ballR + 3, ballR * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[ballColor] + "22";
      ctx.fill();

      // Color palette
      COLORS.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(20 + i * 24, 28, 8, 0, Math.PI * 2);
        ctx.fillStyle = i === ballColor ? c : c + "33";
        ctx.fill();
        if (i === ballColor) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
      });

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(`${sc}`, W - 15, 30);
      ctx.fillStyle = "#888";
      ctx.font = "11px system-ui";
      ctx.fillText(`Level ${Math.floor(level / 5) + 1}`, W - 15, 46);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff22";
      ctx.font = "11px system-ui";
      ctx.fillText("Tap to change color", W / 2, H - 12);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animId); canvas.removeEventListener("click", handleTap); canvas.removeEventListener("touchstart", handleTouch); };
  }, [started, gameOver]);

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      {!started ? (
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#ffd700", fontSize: "32px", marginBottom: "8px" }}>Spiral Drop</h1>
          <p style={{ color: "#888", marginBottom: "4px", fontSize: "14px" }}>Drop through spiral rings by matching colors</p>
          <p style={{ color: "#666", marginBottom: "20px", fontSize: "12px" }}>Tap to cycle ball color. Match the segment color or fall through gaps.</p>
          <button onClick={startGame} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Play</button>
        </div>
      ) : gameOver ? (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#ff6b6b", fontSize: "28px" }}>Game Over</h2>
          <p style={{ color: "#ffd700", fontSize: "36px", fontWeight: 700, margin: "10px 0" }}>{score}</p>
          <p style={{ color: "#888", marginBottom: "20px" }}>points</p>
          <button onClick={startGame} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Retry</button>
        </div>
      ) : (
        <canvas ref={canvasRef} width={300} height={500} style={{ borderRadius: "12px", border: "1px solid #1a1a3a" }} />
      )}
    </div>
  );
}
