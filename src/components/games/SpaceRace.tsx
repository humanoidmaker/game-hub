import { useRef, useEffect, useState } from "react";

export default function SpaceRace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 400;
    let anim = 0;
    const keys: Record<string, boolean> = {};

    let px = W / 2, py = H - 60;
    let speed = 2, sc = 0, bestSc = 0, livesLeft = 3, dead = false;
    let shieldTimer = 0, rapidTimer = 0, magnetTimer = 0;
    let shootCooldown = 0;

    interface Asteroid { x: number; y: number; r: number; vx: number; vy: number; hp: number; }
    interface Bullet { x: number; y: number; vy: number; }
    interface PowerUp { x: number; y: number; type: "shield" | "rapid" | "magnet"; }
    interface Coin { x: number; y: number; }
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

    let asteroids: Asteroid[] = [];
    let bullets: Bullet[] = [];
    let powerups: PowerUp[] = [];
    let coins: Coin[] = [];
    let particles: Particle[] = [];
    let stars: { x: number; y: number; s: number }[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 2
    }));

    let spawnTimer = 0, coinTimer = 0, puTimer = 0, distance = 0;

    const addParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 20 + Math.random() * 15, color });
      }
    };

    const reset = () => {
      px = W / 2; py = H - 60; speed = 2; sc = 0; livesLeft = 3; dead = false;
      shieldTimer = 0; rapidTimer = 0; magnetTimer = 0;
      asteroids = []; bullets = []; powerups = []; coins = []; particles = [];
      spawnTimer = 0; coinTimer = 0; puTimer = 0; distance = 0;
    };

    const shoot = () => {
      if (dead) return;
      const cooldown = rapidTimer > 0 ? 5 : 12;
      if (shootCooldown > 0) return;
      shootCooldown = cooldown;
      bullets.push({ x: px, y: py - 15, vy: -8 });
      if (rapidTimer > 0) {
        bullets.push({ x: px - 8, y: py - 10, vy: -8 });
        bullets.push({ x: px + 8, y: py - 10, vy: -8 });
      }
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of stars) {
        s.y += s.s * 0.5;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        ctx.fillStyle = `rgba(255,255,255,${s.s / 3})`;
        ctx.fillRect(s.x, s.y, s.s > 1 ? 2 : 1, s.s > 1 ? 2 : 1);
      }

      if (!dead) {
        // Movement
        if (keys["ArrowLeft"] || keys["KeyA"]) px = Math.max(15, px - 4);
        if (keys["ArrowRight"] || keys["KeyD"]) px = Math.min(W - 15, px + 4);
        if (keys["ArrowUp"] || keys["KeyW"]) py = Math.max(15, py - 3);
        if (keys["ArrowDown"] || keys["KeyS"]) py = Math.min(H - 15, py + 3);
        if (keys["Space"]) shoot();
        if (shootCooldown > 0) shootCooldown--;

        distance++;
        sc = Math.floor(distance / 10);
        setScore(sc);
        speed = 2 + sc * 0.005;

        // Timers
        if (shieldTimer > 0) shieldTimer--;
        if (rapidTimer > 0) rapidTimer--;
        if (magnetTimer > 0) magnetTimer--;

        // Spawn asteroids
        spawnTimer++;
        if (spawnTimer > Math.max(15, 40 - sc * 0.1)) {
          spawnTimer = 0;
          const r = 10 + Math.random() * 15;
          asteroids.push({
            x: Math.random() * W,
            y: -r - 10,
            r,
            vx: (Math.random() - 0.5) * 2,
            vy: speed + Math.random() * 2,
            hp: r > 18 ? 2 : 1,
          });
        }

        // Spawn coins
        coinTimer++;
        if (coinTimer > 40) {
          coinTimer = 0;
          coins.push({ x: 20 + Math.random() * (W - 40), y: -10 });
        }

        // Spawn powerups
        puTimer++;
        if (puTimer > 300 + Math.random() * 200) {
          puTimer = 0;
          const types: ("shield" | "rapid" | "magnet")[] = ["shield", "rapid", "magnet"];
          powerups.push({ x: 20 + Math.random() * (W - 40), y: -15, type: types[Math.floor(Math.random() * 3)] });
        }

        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.y += b.vy;
          if (b.y < -10) { bullets.splice(i, 1); continue; }

          // Hit asteroids
          for (let j = asteroids.length - 1; j >= 0; j--) {
            const a = asteroids[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            if (Math.sqrt(dx * dx + dy * dy) < a.r + 3) {
              a.hp--;
              bullets.splice(i, 1);
              if (a.hp <= 0) {
                addParticles(a.x, a.y, "#f59e0b", 10);
                sc += 5;
                asteroids.splice(j, 1);
              } else {
                addParticles(a.x, a.y, "#888", 4);
              }
              break;
            }
          }
        }

        // Update asteroids
        for (let i = asteroids.length - 1; i >= 0; i--) {
          const a = asteroids[i];
          a.x += a.vx; a.y += a.vy;
          if (a.y > H + 30) { asteroids.splice(i, 1); continue; }

          // Player collision
          const dx = px - a.x, dy = py - a.y;
          if (Math.sqrt(dx * dx + dy * dy) < a.r + 12) {
            if (shieldTimer > 0) {
              addParticles(a.x, a.y, "#3b82f6", 8);
              asteroids.splice(i, 1);
              shieldTimer = 0;
            } else {
              livesLeft--;
              setScore(sc);
              addParticles(px, py, "#ef4444", 15);
              asteroids.splice(i, 1);
              if (livesLeft <= 0) {
                dead = true;
                if (sc > bestSc) { bestSc = sc; setBest(bestSc); }
              }
            }
          }
        }

        // Update coins
        for (let i = coins.length - 1; i >= 0; i--) {
          const c = coins[i];
          c.y += speed;
          if (magnetTimer > 0) {
            const dx = px - c.x, dy = py - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) { c.x += dx / dist * 3; c.y += dy / dist * 3; }
          }
          if (c.y > H + 10) { coins.splice(i, 1); continue; }
          const dx = px - c.x, dy = py - c.y;
          if (Math.sqrt(dx * dx + dy * dy) < 18) {
            sc += 10;
            addParticles(c.x, c.y, "#f59e0b", 5);
            coins.splice(i, 1);
          }
        }

        // Update powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
          const p = powerups[i];
          p.y += speed * 0.7;
          if (p.y > H + 15) { powerups.splice(i, 1); continue; }
          const dx = px - p.x, dy = py - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            if (p.type === "shield") shieldTimer = 300;
            else if (p.type === "rapid") rapidTimer = 300;
            else magnetTimer = 300;
            addParticles(p.x, p.y, p.type === "shield" ? "#3b82f6" : p.type === "rapid" ? "#ef4444" : "#a855f7", 8);
            powerups.splice(i, 1);
          }
        }
      }

      // Draw asteroids
      for (const a of asteroids) {
        ctx.fillStyle = a.hp > 1 ? "#8a7a6a" : "#666";
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#555";
        ctx.beginPath(); ctx.arc(a.x - a.r * 0.3, a.y - a.r * 0.2, a.r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath(); ctx.arc(a.x + a.r * 0.2, a.y + a.r * 0.3, a.r * 0.2, 0, Math.PI * 2); ctx.fill();
      }

      // Draw coins
      for (const c of coins) {
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#d97706";
        ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
        ctx.fillText("$", c.x, c.y + 3);
      }

      // Draw powerups
      for (const p of powerups) {
        const colors = { shield: "#3b82f6", rapid: "#ef4444", magnet: "#a855f7" };
        const icons = { shield: "S", rapid: "R", magnet: "M" };
        ctx.fillStyle = colors[p.type];
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
        ctx.fillText(icons[p.type], p.x, p.y + 4);
      }

      // Draw bullets
      for (const b of bullets) {
        ctx.fillStyle = rapidTimer > 0 ? "#ef4444" : "#22c55e";
        ctx.fillRect(b.x - 1.5, b.y, 3, 8);
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4;
        ctx.fillRect(b.x - 1, b.y + 1, 2, 6);
        ctx.shadowBlur = 0;
      }

      // Ship
      if (!dead) {
        // Shield aura
        if (shieldTimer > 0) {
          ctx.strokeStyle = `rgba(59,130,246,${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(px, py - 15);
        ctx.lineTo(px - 12, py + 8);
        ctx.lineTo(px - 5, py + 5);
        ctx.lineTo(px, py + 12);
        ctx.lineTo(px + 5, py + 5);
        ctx.lineTo(px + 12, py + 8);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath(); ctx.arc(px, py - 4, 4, 0, Math.PI * 2); ctx.fill();

        // Engine
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(px - 4, py + 12);
        ctx.lineTo(px, py + 18 + Math.random() * 4);
        ctx.lineTo(px + 4, py + 12);
        ctx.fill();
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 35;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`${sc}`, 10, 25);
      ctx.fillStyle = "#ef4444"; ctx.font = "13px system-ui";
      ctx.fillText("❤".repeat(Math.max(0, livesLeft)), 10, 42);
      ctx.fillStyle = "#888"; ctx.font = "11px system-ui"; ctx.textAlign = "right";
      ctx.fillText(`Best: ${bestSc}`, W - 10, 20);
      ctx.fillText(`Speed: ${speed.toFixed(1)}x`, W - 10, 36);

      // Active powerups
      let puY = 55;
      if (shieldTimer > 0) { ctx.fillStyle = "#3b82f6"; ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.fillText(`Shield: ${Math.ceil(shieldTimer / 60)}s`, W - 10, puY); puY += 14; }
      if (rapidTimer > 0) { ctx.fillStyle = "#ef4444"; ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.fillText(`Rapid: ${Math.ceil(rapidTimer / 60)}s`, W - 10, puY); puY += 14; }
      if (magnetTimer > 0) { ctx.fillStyle = "#a855f7"; ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.fillText(`Magnet: ${Math.ceil(magnetTimer / 60)}s`, W - 10, puY); }

      if (dead) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 24px system-ui"; ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 15);
        ctx.fillStyle = "#fff"; ctx.font = "16px system-ui";
        ctx.fillText(`Score: ${sc}`, W / 2, H / 2 + 12);
        ctx.fillStyle = "#888"; ctx.font = "13px system-ui";
        ctx.fillText("Press Space to restart", W / 2, H / 2 + 35);
      }

      anim = requestAnimationFrame(loop);
    };

    const onKey = (e: KeyboardEvent) => {
      keys[e.code] = true;
      e.preventDefault();
      if (e.code === "Space" && dead) reset();
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    anim = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(anim); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Space Race</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Arrow keys to move, Space to shoot - dodge asteroids, collect power-ups</p>
      <canvas ref={canvasRef} width={400} height={400} style={{ borderRadius: 8 }} />
    </div>
  );
}
