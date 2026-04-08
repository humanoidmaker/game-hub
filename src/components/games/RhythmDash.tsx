import { useRef, useEffect, useState } from "react";

export default function RhythmDash() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 600, H = 200;
    let anim = 0;

    const GROUND_Y = 160;
    const GRAVITY = 0.6;
    const JUMP_VEL = -10;

    let playerX = 80, playerY = GROUND_Y, vy = 0, onGround = true;
    let dead = false, sc = 0, bestSc = 0, speed = 4, distance = 0, jumpReq = false;

    interface Obstacle { x: number; type: "spike" | "block" | "platform"; w: number; h: number; py?: number; moving?: boolean; dy?: number; }
    let obstacles: Obstacle[] = [];
    let spawnTimer = 0;
    let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    let bgLines: { x: number; y: number }[] = Array.from({ length: 20 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 100 }));
    let beatTimer = 0, beatPulse = 0;

    const spawnObstacle = () => {
      const r = Math.random();
      if (r < 0.4) obstacles.push({ x: W + 20, type: "spike", w: 20, h: 25 });
      else if (r < 0.75) obstacles.push({ x: W + 20, type: "block", w: 30, h: 20 });
      else {
        const py = GROUND_Y - 40 - Math.random() * 30;
        obstacles.push({ x: W + 20, type: "platform", w: 60, h: 8, py, moving: Math.random() > 0.5, dy: 0.5 });
      }
    };

    const playBeep = () => {
      try {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = "square"; osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.05, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
        osc.start(); osc.stop(ac.currentTime + 0.1);
      } catch {}
    };

    const reset = () => {
      playerY = GROUND_Y; vy = 0; onGround = true; dead = false;
      sc = 0; speed = 4; distance = 0; obstacles = []; particles = []; spawnTimer = 0;
    };

    const addDeathParticles = () => {
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: playerX, y: playerY - 10,
          vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
          life: 40 + Math.random() * 20,
          color: ["#ef4444", "#f59e0b", "#fff"][Math.floor(Math.random() * 3)],
        });
      }
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      beatTimer++;
      if (beatTimer % 30 === 0) { beatPulse = 1; if (!dead) playBeep(); }
      if (beatPulse > 0) beatPulse -= 0.05;

      // Background dots
      ctx.fillStyle = `rgba(59,130,246,${0.05 + beatPulse * 0.1})`;
      for (const l of bgLines) {
        l.x -= speed * 0.3;
        if (l.x < -10) l.x = W + 10;
        ctx.fillRect(l.x, l.y, 2, 2);
      }

      // Ground
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.strokeStyle = `rgba(59,130,246,${0.3 + beatPulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();

      // Ground scroll
      ctx.strokeStyle = "rgba(59,130,246,0.1)"; ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const gx = ((i * 40) - (distance * speed) % 40 + 800) % 800 - 40;
        ctx.beginPath(); ctx.moveTo(gx, GROUND_Y + 5); ctx.lineTo(gx + 15, GROUND_Y + 5); ctx.stroke();
      }

      if (!dead) {
        if (jumpReq && onGround) {
          vy = JUMP_VEL; onGround = false; jumpReq = false;
          for (let i = 0; i < 5; i++) particles.push({ x: playerX, y: GROUND_Y, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2, life: 15, color: "#3b82f6" });
        }

        vy += GRAVITY; playerY += vy;
        if (playerY >= GROUND_Y) { playerY = GROUND_Y; vy = 0; onGround = true; }

        // Platform landing
        for (const o of obstacles) {
          if (o.type === "platform" && o.py !== undefined && vy > 0) {
            if (playerX >= o.x - 5 && playerX <= o.x + o.w + 5 && playerY >= o.py - 5 && playerY <= o.py + 10) {
              playerY = o.py; vy = 0; onGround = true;
            }
          }
        }

        distance++; sc = Math.floor(distance / 10); setScore(sc);
        speed = 4 + sc * 0.01;

        spawnTimer++;
        if (spawnTimer > Math.max(40, 80 - sc * 0.3)) { spawnTimer = 0; spawnObstacle(); }

        for (let i = obstacles.length - 1; i >= 0; i--) {
          const o = obstacles[i];
          o.x -= speed;
          if (o.type === "platform" && o.moving && o.py !== undefined && o.dy !== undefined) {
            o.py += o.dy;
            if (o.py < GROUND_Y - 70 || o.py > GROUND_Y - 15) o.dy = -o.dy;
          }
          if (o.x < -80) { obstacles.splice(i, 1); continue; }

          if (o.type === "spike" && playerX + 8 > o.x && playerX - 8 < o.x + o.w && playerY > GROUND_Y - o.h + 5) {
            dead = true; addDeathParticles(); if (sc > bestSc) { bestSc = sc; setBest(bestSc); }
          } else if (o.type === "block" && playerX + 8 > o.x && playerX - 8 < o.x + o.w && playerY > GROUND_Y - o.h + 3) {
            dead = true; addDeathParticles(); if (sc > bestSc) { bestSc = sc; setBest(bestSc); }
          }
        }

        // Run trail
        if (onGround && distance % 3 === 0) {
          particles.push({ x: playerX - 8, y: GROUND_Y, vx: -1 - Math.random(), vy: -Math.random() * 2, life: 12, color: "rgba(255,255,255,0.3)" });
        }
      }

      // Draw obstacles
      for (const o of obstacles) {
        if (o.type === "spike") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath(); ctx.moveTo(o.x, GROUND_Y); ctx.lineTo(o.x + o.w / 2, GROUND_Y - o.h); ctx.lineTo(o.x + o.w, GROUND_Y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#ff6666"; ctx.lineWidth = 1; ctx.stroke();
        } else if (o.type === "block") {
          ctx.fillStyle = "#f59e0b"; ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1; ctx.strokeRect(o.x, GROUND_Y - o.h, o.w, o.h);
        } else if (o.type === "platform" && o.py !== undefined) {
          ctx.fillStyle = "#22c55e"; ctx.fillRect(o.x, o.py, o.w, o.h);
          ctx.strokeStyle = "#4ade80"; ctx.lineWidth = 1; ctx.strokeRect(o.x, o.py, o.w, o.h);
        }
      }

      // Player
      const py = playerY;
      ctx.fillStyle = dead ? "#ef4444" : `hsl(${210 + beatPulse * 30}, 80%, 60%)`;
      ctx.fillRect(playerX - 8, py - 22, 16, 16);
      ctx.beginPath(); ctx.arc(playerX, py - 28, 7, 0, Math.PI * 2); ctx.fill();
      const legAnim = Math.sin(distance * 0.3) * 5;
      ctx.strokeStyle = dead ? "#ef4444" : `hsl(${210 + beatPulse * 30}, 80%, 60%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playerX - 3, py - 6); ctx.lineTo(playerX - 3 + legAnim, py);
      ctx.moveTo(playerX + 3, py - 6); ctx.lineTo(playerX + 3 - legAnim, py);
      ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillRect(playerX + 2, py - 30, 3, 3);

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 50; ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`${sc}`, 15, 25);
      ctx.fillStyle = "#888"; ctx.font = "11px system-ui"; ctx.fillText(`Best: ${bestSc}`, 15, 42);
      ctx.fillStyle = "#3b82f6"; ctx.font = "10px system-ui"; ctx.textAlign = "right";
      ctx.fillText(`Speed: ${speed.toFixed(1)}x`, W - 10, 20);

      if (dead) {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 24px system-ui"; ctx.textAlign = "center";
        ctx.fillText("CRASHED!", W / 2, H / 2 - 10);
        ctx.fillStyle = "#888"; ctx.font = "14px system-ui";
        ctx.fillText(`Score: ${sc}`, W / 2, H / 2 + 15);
        ctx.fillText("Press Space to restart", W / 2, H / 2 + 35);
      }

      anim = requestAnimationFrame(loop);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); if (dead) { reset(); return; } jumpReq = true; }
    };
    const onClick = () => { if (dead) { reset(); return; } jumpReq = true; };

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onClick);
    anim = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(anim); window.removeEventListener("keydown", onKey); canvas.removeEventListener("click", onClick); };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Rhythm Dash</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Space/Tap to jump - dodge obstacles</p>
      <canvas ref={canvasRef} width={600} height={200} style={{ borderRadius: 8, cursor: "pointer" }} />
    </div>
  );
}
