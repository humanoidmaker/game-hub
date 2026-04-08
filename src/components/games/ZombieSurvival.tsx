"use client";
import { useRef, useEffect, useState, useCallback } from "react";

export default function ZombieSurvival() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const startGame = useCallback(() => {
    setScore(0); setWave(1); setGameOver(false); setStarted(true);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 400;
    canvas.width = W; canvas.height = H;

    const keys: Record<string, boolean> = {};
    let mouseX = W / 2, mouseY = H / 2;
    let mouseDown = false;
    let dead = false, sc = 0, wv = 1;
    let animId = 0;

    // Player
    let px = W / 2, py = H / 2, hp = 100, maxHp = 100;
    let speed = 3, ammo = 30, maxAmmo = 30;
    let reloading = false, reloadTimer = 0;
    let shootCd = 0;
    let speedBoostTimer = 0;
    let invincibleTimer = 0;

    interface Bullet { x: number; y: number; vx: number; vy: number }
    interface Zombie { x: number; y: number; hp: number; maxHp: number; speed: number; size: number; type: "normal" | "fast" | "tank"; hitTimer: number }
    interface Powerup { x: number; y: number; type: "health" | "ammo" | "speed"; timer: number }
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
    interface Blood { x: number; y: number; r: number; alpha: number }

    let bullets: Bullet[] = [];
    let zombies: Zombie[] = [];
    let powerups: Powerup[] = [];
    let particles: Particle[] = [];
    let bloodStains: Blood[] = [];
    let zombiesKilledThisWave = 0;
    let zombiesPerWave = 5;
    let spawned = 0;
    let spawnTimer = 0;

    const spawnZombie = () => {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * W; y = -20; }
      else if (side === 1) { x = W + 20; y = Math.random() * H; }
      else if (side === 2) { x = Math.random() * W; y = H + 20; }
      else { x = -20; y = Math.random() * H; }

      const rng = Math.random();
      let type: "normal" | "fast" | "tank" = "normal";
      let zhp = 2 + Math.floor(wv * 0.5);
      let zspeed = 0.8 + wv * 0.05;
      let size = 12;
      if (rng < 0.15 && wv >= 3) { type = "fast"; zhp = 1 + Math.floor(wv * 0.3); zspeed = 1.5 + wv * 0.08; size = 9; }
      else if (rng < 0.25 && wv >= 5) { type = "tank"; zhp = 5 + wv; zspeed = 0.5 + wv * 0.02; size = 18; }

      zombies.push({ x, y, hp: zhp, maxHp: zhp, speed: zspeed, size, type, hitTimer: 0 });
    };

    const spawnPowerup = () => {
      const types: ("health" | "ammo" | "speed")[] = ["health", "ammo", "speed"];
      powerups.push({
        x: 30 + Math.random() * (W - 60),
        y: 30 + Math.random() * (H - 60),
        type: types[Math.floor(Math.random() * types.length)],
        timer: 600,
      });
    };

    const explode = (x: number, y: number, color: string, count = 6) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 2;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 15 + Math.random() * 10, color });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = e.type === "keydown";
      if (e.key.toLowerCase() === "r" && e.type === "keydown" && !reloading && ammo < maxAmmo) {
        reloading = true;
        reloadTimer = 60;
      }
    };
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onMouseDown = () => { mouseDown = true; };
    const onMouseUp = () => { mouseDown = false; };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);

    const shoot = () => {
      if (shootCd > 0 || ammo <= 0 || reloading) return;
      shootCd = 8;
      ammo--;
      const angle = Math.atan2(mouseY - py, mouseX - px);
      bullets.push({ x: px, y: py, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8 });
    };

    const loop = () => {
      if (dead) return;
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Ground grid
      ctx.strokeStyle = "#111122";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Blood stains
      bloodStains.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,0,0,${b.alpha})`;
        ctx.fill();
        b.alpha *= 0.999;
      });
      bloodStains = bloodStains.filter(b => b.alpha > 0.01);

      // Input
      const moveSpeed = speedBoostTimer > 0 ? speed * 1.5 : speed;
      if (keys["w"] || keys["arrowup"]) py -= moveSpeed;
      if (keys["s"] || keys["arrowdown"]) py += moveSpeed;
      if (keys["a"] || keys["arrowleft"]) px -= moveSpeed;
      if (keys["d"] || keys["arrowright"]) px += moveSpeed;
      px = Math.max(10, Math.min(W - 10, px));
      py = Math.max(10, Math.min(H - 10, py));

      if (mouseDown) shoot();
      if (shootCd > 0) shootCd--;
      if (speedBoostTimer > 0) speedBoostTimer--;
      if (invincibleTimer > 0) invincibleTimer--;

      // Reload
      if (reloading) {
        reloadTimer--;
        if (reloadTimer <= 0) { ammo = maxAmmo; reloading = false; }
      }

      // Spawn zombies
      spawnTimer--;
      if (spawnTimer <= 0 && spawned < zombiesPerWave) {
        spawnZombie();
        spawned++;
        spawnTimer = Math.max(15, 60 - wv * 3);
      }

      // Bullets
      bullets = bullets.filter(b => {
        b.x += b.vx; b.y += b.vy;
        if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H + 10) return false;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        // Trail
        ctx.fillStyle = "#ffd70044";
        ctx.beginPath(); ctx.arc(b.x - b.vx * 0.5, b.y - b.vy * 0.5, 2, 0, Math.PI * 2); ctx.fill();
        return true;
      });

      // Zombies
      zombies = zombies.filter(z => {
        if (z.hp <= 0) return false;
        // Move toward player
        const dx = px - z.x, dy = py - z.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) { z.x += (dx / dist) * z.speed; z.y += (dy / dist) * z.speed; }

        // Bullet collision
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          if (Math.abs(b.x - z.x) < z.size && Math.abs(b.y - z.y) < z.size) {
            z.hp--;
            z.hitTimer = 5;
            bullets.splice(i, 1);
            explode(z.x, z.y, "#44ff44", 3);
            if (z.hp <= 0) {
              sc += z.type === "tank" ? 30 : z.type === "fast" ? 15 : 10;
              setScore(sc);
              zombiesKilledThisWave++;
              explode(z.x, z.y, "#ff0000", 8);
              bloodStains.push({ x: z.x, y: z.y, r: z.size + 5, alpha: 0.4 });
              if (Math.random() < 0.1) spawnPowerup();
            }
            break;
          }
        }

        if (z.hp <= 0) return false;
        if (z.hitTimer > 0) z.hitTimer--;

        // Draw zombie
        const zColor = z.type === "fast" ? "#88ff44" : z.type === "tank" ? "#448844" : "#44cc44";
        ctx.fillStyle = z.hitTimer > 0 ? "#ffffff" : zColor;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.size, 0, Math.PI * 2); ctx.fill();
        // Eyes
        const ea = Math.atan2(py - z.y, px - z.x);
        ctx.fillStyle = "#ff0000";
        ctx.beginPath(); ctx.arc(z.x + Math.cos(ea - 0.3) * z.size * 0.4, z.y + Math.sin(ea - 0.3) * z.size * 0.4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(z.x + Math.cos(ea + 0.3) * z.size * 0.4, z.y + Math.sin(ea + 0.3) * z.size * 0.4, 2, 0, Math.PI * 2); ctx.fill();
        // HP bar for tanks
        if (z.type === "tank") {
          ctx.fillStyle = "#333"; ctx.fillRect(z.x - z.size, z.y - z.size - 6, z.size * 2, 3);
          ctx.fillStyle = "#ff0000"; ctx.fillRect(z.x - z.size, z.y - z.size - 6, z.size * 2 * (z.hp / z.maxHp), 3);
        }

        // Player collision
        if (dist < z.size + 8) {
          if (invincibleTimer <= 0) {
            hp -= z.type === "tank" ? 2 : 1;
            invincibleTimer = 15;
            explode(px, py, "#ff0000", 3);
          }
          if (hp <= 0) { dead = true; setGameOver(true); setScore(sc); setWave(wv); }
        }

        return true;
      });

      // Check wave complete
      if (zombiesKilledThisWave >= zombiesPerWave && spawned >= zombiesPerWave && zombies.length === 0) {
        wv++;
        setWave(wv);
        zombiesPerWave = 5 + wv * 2;
        spawned = 0;
        zombiesKilledThisWave = 0;
        spawnTimer = 60;
        // Wave bonus
        hp = Math.min(hp + 10, maxHp);
        spawnPowerup();
      }

      // Powerups
      powerups = powerups.filter(p => {
        p.timer--;
        if (p.timer <= 0) return false;
        const colors = { health: "#ff6b6b", ammo: "#ffd700", speed: "#4ecdc4" };
        const labels = { health: "+", ammo: "A", speed: "S" };
        const pulse = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
        ctx.fillStyle = colors[p.type];
        ctx.globalAlpha = p.timer < 100 ? p.timer / 100 : 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 10 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0a0a1a";
        ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
        ctx.fillText(labels[p.type], p.x, p.y + 3);

        if (Math.abs(p.x - px) < 16 && Math.abs(p.y - py) < 16) {
          if (p.type === "health") hp = Math.min(hp + 25, maxHp);
          else if (p.type === "ammo") { ammo = maxAmmo; reloading = false; }
          else speedBoostTimer = 300;
          explode(p.x, p.y, colors[p.type]);
          return false;
        }
        return true;
      });

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        const a = Math.max(0, p.life / 25);
        ctx.fillStyle = p.color + Math.floor(a * 255).toString(16).padStart(2, "0");
        ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Draw player
      const angle = Math.atan2(mouseY - py, mouseX - px);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      // Body
      ctx.fillStyle = invincibleTimer > 0 ? "#ffffff88" : "#4ecdc4";
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      // Gun
      ctx.fillStyle = "#888";
      ctx.fillRect(6, -2, 12, 4);
      ctx.restore();

      // Speed boost indicator
      if (speedBoostTimer > 0) {
        ctx.strokeStyle = "#4ecdc444";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2); ctx.stroke();
      }

      // HUD
      // Health bar
      ctx.fillStyle = "#333"; ctx.fillRect(10, 10, 100, 8);
      ctx.fillStyle = hp > 60 ? "#4ecdc4" : hp > 30 ? "#ffd700" : "#ff6b6b";
      ctx.fillRect(10, 10, 100 * (hp / maxHp), 8);
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1; ctx.strokeRect(10, 10, 100, 8);

      // Ammo
      ctx.fillStyle = "#ffd700"; ctx.font = "bold 12px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`${reloading ? "Reloading..." : `Ammo: ${ammo}/${maxAmmo}`}`, 10, 32);

      // Score & wave
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "right";
      ctx.fillText(`Score: ${sc}`, W - 10, 20);
      ctx.fillStyle = "#ff6b6b"; ctx.font = "12px system-ui";
      ctx.fillText(`Wave ${wv}`, W - 10, 36);

      // Crosshair
      ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mouseX - 8, mouseY); ctx.lineTo(mouseX + 8, mouseY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mouseX, mouseY - 8); ctx.lineTo(mouseX, mouseY + 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2); ctx.stroke();

      // Controls hint
      ctx.fillStyle = "#ffffff22"; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText("WASD move | Click shoot | R reload", W / 2, H - 8);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
    };
  }, [started, gameOver]);

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      {!started ? (
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#ff6b6b", fontSize: "32px", marginBottom: "8px" }}>Zombie Survival</h1>
          <p style={{ color: "#888", fontSize: "14px", marginBottom: "4px" }}>WASD to move, Mouse to aim, Click to shoot</p>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "20px" }}>R to reload. Survive the zombie waves!</p>
          <button onClick={startGame} style={{ padding: "12px 40px", background: "#ff6b6b", color: "#fff", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Survive</button>
        </div>
      ) : gameOver ? (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#ff6b6b", fontSize: "28px" }}>You Died</h2>
          <p style={{ color: "#ffd700", fontSize: "36px", fontWeight: 700, margin: "10px 0" }}>{score}</p>
          <p style={{ color: "#888", marginBottom: "5px" }}>Survived {wave} waves</p>
          <button onClick={startGame} style={{ padding: "12px 40px", background: "#ff6b6b", color: "#fff", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer", marginTop: "15px" }}>Retry</button>
        </div>
      ) : (
        <div>
          <canvas ref={canvasRef} width={400} height={400} style={{ borderRadius: "12px", border: "1px solid #1a1a3a", display: "block", cursor: "crosshair" }} />
        </div>
      )}
    </div>
  );
}
