import { useRef, useEffect, useState } from "react";

const COLORS = ["#ef4444", "#eab308", "#22c55e", "#3b82f6"];
const COLOR_NAMES = ["Red", "Yellow", "Green", "Blue"];

export default function ColorSwitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 300, H = 500;
    let anim = 0;

    interface Obstacle {
      y: number;
      type: "ring" | "bar" | "cross";
      speed: number;
      angle: number;
    }
    interface Star { y: number; collected: boolean; }
    interface ColorChanger { y: number; collected: boolean; newColor: number; }

    const s = {
      y: 380,
      vy: 0,
      color: 0,
      score: 0,
      dead: false,
      started: false,
      obstacles: [] as Obstacle[],
      stars: [] as Star[],
      changers: [] as ColorChanger[],
      particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    };

    const spawnObstacle = (y: number) => {
      const types: Obstacle["type"][] = ["ring", "bar", "cross"];
      const type = types[Math.floor(Math.random() * types.length)];
      s.obstacles.push({ y, type, speed: 0.6 + Math.random() * 0.8, angle: 0 });
      s.stars.push({ y: y - 50, collected: false });
      if (Math.random() < 0.5) {
        s.changers.push({
          y: y - 100,
          collected: false,
          newColor: Math.floor(Math.random() * 4),
        });
      }
    };

    const spawnParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        s.particles.push({
          x, y,
          vx: Math.cos(angle) * (2 + Math.random() * 3),
          vy: Math.sin(angle) * (2 + Math.random() * 3),
          life: 30,
          color,
        });
      }
    };

    const reset = () => {
      s.y = 380; s.vy = 0; s.color = 0; s.score = 0;
      s.dead = false; s.obstacles = []; s.stars = []; s.changers = []; s.particles = [];
      setScore(0);
      for (let i = 0; i < 5; i++) spawnObstacle(200 - i * 160);
    };

    reset();
    s.started = false;

    const drawRing = (cx: number, cy: number, r: number, angle: number, lineW: number) => {
      for (let i = 0; i < 4; i++) {
        const a1 = angle + (i * Math.PI) / 2;
        const a2 = a1 + Math.PI / 2 - 0.08;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a1, a2);
        ctx.strokeStyle = COLORS[i];
        ctx.lineWidth = lineW;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    };

    const drawBar = (cx: number, cy: number, angle: number) => {
      const barW = 240;
      const segW = barW / 4;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle * 0.3);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = COLORS[i];
        const rx = -barW / 2 + i * segW;
        ctx.fillRect(rx, -5, segW - 2, 10);
      }
      ctx.restore();
    };

    const drawCross = (cx: number, cy: number, angle: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const armLen = 50, armW = 10;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = COLORS[i];
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        ctx.fillRect(-armW / 2, 5, armW, armLen);
        ctx.restore();
      }
      ctx.restore();
    };

    const getSegmentAtAngle = (angle: number, rotAngle: number): number => {
      let norm = angle - rotAngle;
      norm = ((norm % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(norm / (Math.PI / 2)) % 4;
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      if (!s.started) {
        // Title screen
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Color Switch", W / 2, H / 2 - 60);

        // Draw mini ring
        const t = Date.now() / 1000;
        drawRing(W / 2, H / 2, 35, t, 6);

        ctx.fillStyle = "#888";
        ctx.font = "15px system-ui";
        ctx.fillText("Click / Tap to Jump", W / 2, H / 2 + 60);
        ctx.fillText("Pass through your color only!", W / 2, H / 2 + 85);

        // Draw color indicator
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 + 120, 12, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[0];
        ctx.fill();
        ctx.fillStyle = "#aaa";
        ctx.font = "12px system-ui";
        ctx.fillText("Your color: " + COLOR_NAMES[0], W / 2, H / 2 + 150);

        anim = requestAnimationFrame(loop);
        return;
      }

      if (s.dead) {
        // Death particles
        for (const p of s.particles) {
          p.x += p.vx; p.y += p.vy; p.life--;
          p.vy += 0.1;
          ctx.globalAlpha = Math.max(0, p.life / 30);
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", W / 2, H / 2 - 30);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 40px system-ui";
        ctx.fillText(String(s.score), W / 2, H / 2 + 20);

        ctx.font = "14px system-ui";
        ctx.fillStyle = "#888";
        ctx.fillText("Best: " + Math.max(s.score, best), W / 2, H / 2 + 50);
        ctx.fillText("Click to restart", W / 2, H / 2 + 80);

        anim = requestAnimationFrame(loop);
        return;
      }

      // Physics
      s.vy += 0.35;
      s.y += s.vy;

      // Camera
      const camY = Math.min(0, 250 - s.y);
      const time = Date.now() / 1000;

      // Update and draw obstacles
      for (const obs of s.obstacles) {
        const oy = obs.y + camY;
        if (oy > H + 100 || oy < -100) continue;
        obs.angle += obs.speed * 0.03;

        if (obs.type === "ring") {
          const ringR = 55;
          drawRing(W / 2, oy, ringR, obs.angle, 9);

          // Collision with ring
          const dist = Math.abs(s.y - obs.y);
          if (Math.abs(dist - ringR) < 14) {
            const playerAngle = Math.atan2(s.y - obs.y, 0.001);
            const seg = getSegmentAtAngle(playerAngle, obs.angle);
            if (seg !== s.color) {
              s.dead = true;
              spawnParticles(W / 2, s.y + camY, COLORS[s.color]);
              setBest(b => Math.max(b, s.score));
            }
          }
        } else if (obs.type === "bar") {
          drawBar(W / 2, oy, time * obs.speed);

          // Collision with bar
          if (Math.abs(s.y - obs.y) < 10) {
            const barW = 240;
            const localX = 0;
            const rotatedAngle = time * obs.speed * 0.3;
            const cos = Math.cos(-rotatedAngle);
            const sin = Math.sin(-rotatedAngle);
            const rx = localX * cos - 0 * sin;
            const segW = barW / 4;
            const idx = Math.floor((rx + barW / 2) / segW);
            const colorIdx = Math.max(0, Math.min(3, idx));
            if (colorIdx !== s.color) {
              s.dead = true;
              spawnParticles(W / 2, s.y + camY, COLORS[s.color]);
              setBest(b => Math.max(b, s.score));
            }
          }
        } else {
          drawCross(W / 2, oy, obs.angle);

          // Collision with cross arms
          const dist = Math.sqrt((s.y - obs.y) ** 2);
          if (dist < 55 && dist > 5) {
            const playerAngle = Math.atan2(s.y - obs.y, 0.001);
            const relAngle = playerAngle - obs.angle;
            const norm = ((relAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const armIdx = Math.floor(norm / (Math.PI / 2)) % 4;
            const armAngle = norm % (Math.PI / 2);
            if (Math.abs(armAngle - Math.PI / 4) < 0.3) {
              if (armIdx !== s.color) {
                s.dead = true;
                spawnParticles(W / 2, s.y + camY, COLORS[s.color]);
                setBest(b => Math.max(b, s.score));
              }
            }
          }
        }
      }

      // Stars
      for (const star of s.stars) {
        if (star.collected) continue;
        const sy = star.y + camY;
        if (sy < -30 || sy > H + 30) continue;

        if (Math.abs(s.y - star.y) < 18 && !star.collected) {
          star.collected = true;
          s.score++;
          setScore(s.score);
          spawnParticles(W / 2, sy, "#eab308");
        }

        // Draw star
        ctx.save();
        ctx.translate(W / 2, sy);
        ctx.rotate(time * 2);
        ctx.fillStyle = "#eab308";
        ctx.shadowColor = "#eab308";
        ctx.shadowBlur = 10;
        ctx.font = "22px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u2605", 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Color changers
      for (const ch of s.changers) {
        if (ch.collected) continue;
        const cy = ch.y + camY;
        if (cy < -30 || cy > H + 30) continue;

        if (Math.abs(s.y - ch.y) < 18) {
          ch.collected = true;
          s.color = ch.newColor;
          spawnParticles(W / 2, cy, COLORS[ch.newColor]);
        }

        // Draw color changer (rainbow circle)
        ctx.save();
        ctx.translate(W / 2, cy);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, 10, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
          ctx.lineTo(0, 0);
          ctx.fillStyle = COLORS[i];
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#0a0a1a";
        ctx.fill();
        ctx.restore();
      }

      // Spawn more obstacles
      const topObs = s.obstacles.length > 0
        ? Math.min(...s.obstacles.map(o => o.y))
        : s.y;
      if (topObs > s.y - 500) spawnObstacle(topObs - 160);

      // Clean up off-screen
      s.obstacles = s.obstacles.filter(o => o.y + camY < H + 200);
      s.stars = s.stars.filter(st => st.y + camY < H + 200);
      s.changers = s.changers.filter(ch => ch.y + camY < H + 200);

      // Draw ball
      ctx.save();
      ctx.shadowColor = COLORS[s.color];
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(W / 2, s.y + camY, 12, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[s.color];
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Ball trail
      ctx.beginPath();
      ctx.arc(W / 2, s.y + camY + 5, 8, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[s.color] + "33";
      ctx.fill();

      // Death check - fell off bottom
      if (s.y + camY > H + 80) {
        s.dead = true;
        setBest(b => Math.max(b, s.score));
      }

      // Particles
      s.particles = s.particles.filter(p => p.life > 0);
      for (const p of s.particles) {
        p.x += p.vx; p.y += p.vy; p.life--;
        p.vy += 0.05;
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(s.score), W / 2, 40);

      // Current color indicator
      ctx.beginPath();
      ctx.arc(W - 25, 30, 8, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[s.color];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      anim = requestAnimationFrame(loop);
    };

    const onClick = () => {
      if (s.dead) {
        reset();
        s.started = true;
        return;
      }
      if (!s.started) {
        s.started = true;
      }
      s.vy = -8;
    };

    canvas.addEventListener("click", onClick);
    anim = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(anim);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Best: {best} | Score: {score}</p>
      <canvas ref={canvasRef} width={300} height={500} style={{ borderRadius: 12, cursor: "pointer", border: "1px solid #222" }} />
      <p style={{ color: "#555", marginTop: 8, fontSize: 11 }}>Click or tap to jump through matching colors</p>
    </div>
  );
}
