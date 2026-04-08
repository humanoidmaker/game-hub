"use client";
import { useRef, useEffect, useState, useCallback } from "react";

export default function StarStriker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);

  const startGame = useCallback(() => {
    setScore(0); setGameOver(false); setStarted(true); setLives(3); setWave(1);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 400;
    canvas.width = W; canvas.height = H;

    const keys: Record<string, boolean> = {};
    let px = W / 2, sc = 0, lv = 3, wv = 1, dead = false;
    let spreadShot = 0, shieldTime = 0;
    let animId = 0;

    interface Bullet { x: number; y: number; vx: number; vy: number }
    interface Enemy { x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; type: "normal" | "fast" | "boss"; diving: boolean; diveTimer: number; w: number; h: number }
    interface Powerup { x: number; y: number; vy: number; type: "spread" | "shield" }
    interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
    interface Star { x: number; y: number; speed: number; brightness: number }

    let bullets: Bullet[] = [];
    let eBullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let powerups: Powerup[] = [];
    let particles: Particle[] = [];
    const stars: Star[] = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, speed: 0.5 + Math.random() * 2, brightness: 0.2 + Math.random() * 0.8 }));

    let shootCd = 0;
    let waveDelay = 0;

    const spawnWave = () => {
      const isBoss = wv % 5 === 0;
      if (isBoss) {
        enemies.push({ x: W / 2 - 30, y: -60, vx: 1, vy: 0.3, hp: 20 + wv * 2, maxHp: 20 + wv * 2, type: "boss", diving: false, diveTimer: 0, w: 60, h: 40 });
      } else {
        const rows = Math.min(2 + Math.floor(wv / 3), 5);
        const cols = Math.min(4 + Math.floor(wv / 2), 8);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isFast = Math.random() < 0.2 * (wv / 10);
            enemies.push({
              x: 30 + c * ((W - 60) / cols), y: -30 - r * 35,
              vx: 0.8 + wv * 0.1, vy: 0.3,
              hp: isFast ? 1 : 2, maxHp: isFast ? 1 : 2,
              type: isFast ? "fast" : "normal",
              diving: false, diveTimer: 100 + Math.random() * 200,
              w: isFast ? 16 : 22, h: isFast ? 16 : 18,
            });
          }
        }
      }
    };
    spawnWave();

    const explode = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 3;
        particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 20 + Math.random() * 15, color });
      }
    };

    const onKey = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = e.type === "keydown"; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const shoot = () => {
      if (shootCd > 0) return;
      shootCd = spreadShot > 0 ? 6 : 8;
      bullets.push({ x: px, y: H - 40, vx: 0, vy: -6 });
      if (spreadShot > 0) {
        bullets.push({ x: px - 8, y: H - 38, vx: -1.5, vy: -5.5 });
        bullets.push({ x: px + 8, y: H - 38, vx: 1.5, vy: -5.5 });
        spreadShot--;
      }
    };

    const loop = () => {
      if (dead) return;
      ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        s.y += s.speed;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        ctx.fillStyle = `rgba(255,255,255,${s.brightness * 0.5})`;
        ctx.fillRect(s.x, s.y, 1, 1);
      });

      // Input
      if (keys["arrowleft"] || keys["a"]) px -= 4;
      if (keys["arrowright"] || keys["d"]) px += 4;
      px = Math.max(15, Math.min(W - 15, px));
      if (keys[" "] || keys["arrowup"] || keys["w"]) shoot();
      if (shootCd > 0) shootCd--;
      if (shieldTime > 0) shieldTime--;

      // Player ship
      ctx.save();
      ctx.translate(px, H - 30);
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(-12, 10); ctx.lineTo(-4, 6); ctx.lineTo(0, 12); ctx.lineTo(4, 6); ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.fillStyle = "#4ecdc4";
      ctx.fill();
      ctx.strokeStyle = "#7fffff";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Engine flame
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(-3, 12); ctx.lineTo(0, 18 + Math.random() * 5); ctx.lineTo(3, 12);
      ctx.fill();
      // Shield
      if (shieldTime > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(78,205,196,${0.3 + Math.sin(Date.now() * 0.01) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Bullets
      bullets = bullets.filter(b => {
        b.x += b.vx; b.y += b.vy;
        if (b.y < -5 || b.x < -5 || b.x > W + 5) return false;
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(b.x - 1.5, b.y, 3, 8);
        ctx.fillStyle = "#ffd70066";
        ctx.fillRect(b.x - 1, b.y + 8, 2, 4);
        return true;
      });

      // Enemy bullets
      eBullets = eBullets.filter(b => {
        b.x += b.vx; b.y += b.vy;
        if (b.y > H + 5) return false;
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        // Hit player
        if (Math.abs(b.x - px) < 12 && Math.abs(b.y - (H - 30)) < 15) {
          if (shieldTime > 0) { shieldTime = 0; return false; }
          lv--; setLives(lv);
          explode(px, H - 30, "#ff6b6b");
          if (lv <= 0) { dead = true; setGameOver(true); setScore(sc); }
          return false;
        }
        return true;
      });

      // Enemies
      let allDead = true;
      enemies.forEach(e => {
        if (e.hp <= 0) return;
        allDead = false;
        // Movement
        if (e.type === "boss") {
          e.x += e.vx;
          if (e.x < 30 || e.x > W - 30 - e.w) e.vx *= -1;
          if (e.y < 50) e.y += e.vy;
          // Boss shoots
          if (Math.random() < 0.03) {
            eBullets.push({ x: e.x + e.w / 2, y: e.y + e.h, vx: (px - e.x) * 0.01, vy: 3 });
          }
        } else {
          e.x += e.vx;
          if (e.y < 30 + (e.diving ? 0 : 0)) e.y += 0.5;
          e.diveTimer--;
          if (e.diveTimer <= 0 && !e.diving) {
            e.diving = true;
            e.vy = 2 + Math.random() * 2;
            e.vx = (px - e.x) * 0.01;
          }
          if (e.diving) { e.y += e.vy; e.x += e.vx; }
          if (e.x < 5 || e.x > W - 5) e.vx *= -1;
          // Random shoot
          if (Math.random() < 0.005 && !e.diving) {
            eBullets.push({ x: e.x, y: e.y + 10, vx: 0, vy: 2.5 });
          }
        }

        // Draw enemy
        if (e.type === "boss") {
          ctx.fillStyle = "#ff6b6b";
          ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = "#ff4444";
          ctx.fillRect(e.x + 5, e.y + 5, e.w - 10, e.h - 10);
          // HP bar
          ctx.fillStyle = "#333";
          ctx.fillRect(e.x, e.y - 8, e.w, 4);
          ctx.fillStyle = "#ff6b6b";
          ctx.fillRect(e.x, e.y - 8, e.w * (e.hp / e.maxHp), 4);
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.fillRect(e.x + 15, e.y + 12, 8, 8);
          ctx.fillRect(e.x + e.w - 23, e.y + 12, 8, 8);
          ctx.fillStyle = "#ff0000";
          ctx.fillRect(e.x + 18, e.y + 14, 3, 4);
          ctx.fillRect(e.x + e.w - 20, e.y + 14, 3, 4);
        } else {
          const color = e.type === "fast" ? "#a855f7" : "#ff6b6b";
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(e.x, e.y - e.h / 2);
          ctx.lineTo(e.x - e.w / 2, e.y + e.h / 2);
          ctx.lineTo(e.x + e.w / 2, e.y + e.h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect(e.x - 3, e.y, 2, 2);
          ctx.fillRect(e.x + 1, e.y, 2, 2);
        }

        // Hit player collision
        if (Math.abs(e.x - px) < e.w / 2 + 10 && Math.abs(e.y - (H - 30)) < e.h / 2 + 12) {
          if (shieldTime > 0) { shieldTime = 0; e.hp = 0; sc += 10; explode(e.x, e.y, "#4ecdc4"); }
          else { lv--; setLives(lv); e.hp = 0; explode(px, H - 30, "#ff6b6b"); if (lv <= 0) { dead = true; setGameOver(true); setScore(sc); } }
        }

        // Remove if off screen
        if (e.y > H + 30) e.hp = 0;

        // Bullet collision
        bullets.forEach((b, bi) => {
          if (e.hp <= 0) return;
          const hitX = e.type === "boss" ? (b.x > e.x && b.x < e.x + e.w) : Math.abs(b.x - e.x) < e.w / 2 + 3;
          const hitY = e.type === "boss" ? (b.y > e.y && b.y < e.y + e.h) : Math.abs(b.y - e.y) < e.h / 2 + 4;
          if (hitX && hitY) {
            e.hp--;
            bullets[bi] = { x: -99, y: -99, vx: 0, vy: 0 };
            if (e.hp <= 0) {
              const pts = e.type === "boss" ? 50 : e.type === "fast" ? 15 : 10;
              sc += pts;
              setScore(sc);
              explode(e.x, e.y, e.type === "boss" ? "#ff6b6b" : e.type === "fast" ? "#a855f7" : "#ff8844", e.type === "boss" ? 25 : 10);
              // Powerup drop
              if (Math.random() < (e.type === "boss" ? 1 : 0.08)) {
                powerups.push({ x: e.x, y: e.y, vy: 1.5, type: Math.random() < 0.5 ? "spread" : "shield" });
              }
            }
          }
        });
        bullets = bullets.filter(b => b.x > -50);
      });

      // Powerups
      powerups = powerups.filter(p => {
        p.y += p.vy;
        if (p.y > H) return false;
        const color = p.type === "spread" ? "#ffd700" : "#4ecdc4";
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0a1a";
        ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
        ctx.fillText(p.type === "spread" ? "S" : "D", p.x, p.y + 3);
        if (Math.abs(p.x - px) < 18 && Math.abs(p.y - (H - 30)) < 18) {
          if (p.type === "spread") spreadShot = 60;
          else shieldTime = 300;
          return false;
        }
        return true;
      });

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        const alpha = Math.floor((p.life / 35) * 255).toString(16).padStart(2, "0");
        ctx.fillStyle = p.color + alpha;
        ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Next wave
      if (allDead && enemies.length > 0) {
        waveDelay++;
        if (waveDelay > 60) {
          wv++; setWave(wv);
          spawnWave();
          waveDelay = 0;
        }
      }

      // HUD
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`Score: ${sc}`, 10, 20);
      ctx.fillStyle = "#888"; ctx.font = "12px system-ui";
      ctx.fillText(`Wave ${wv}`, 10, 36);
      // Lives
      for (let i = 0; i < lv; i++) {
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath(); ctx.arc(W - 20 - i * 20, 18, 6, 0, Math.PI * 2); ctx.fill();
      }
      // Status
      if (spreadShot > 0) { ctx.fillStyle = "#ffd700"; ctx.font = "10px system-ui"; ctx.textAlign = "left"; ctx.fillText("SPREAD", 10, 52); }
      if (shieldTime > 0) { ctx.fillStyle = "#4ecdc4"; ctx.font = "10px system-ui"; ctx.textAlign = "left"; ctx.fillText("SHIELD", 60, 52); }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [started, gameOver]);

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      {!started ? (
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "#ffd700", fontSize: "32px", marginBottom: "8px" }}>Star Striker</h1>
          <p style={{ color: "#888", fontSize: "14px", marginBottom: "4px" }}>Arrow keys / WASD to move, Space to shoot</p>
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "20px" }}>Destroy waves of enemies. Boss every 5 waves. Collect power-ups!</p>
          <button onClick={startGame} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Play</button>
        </div>
      ) : gameOver ? (
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#ff6b6b", fontSize: "28px" }}>Game Over</h2>
          <p style={{ color: "#ffd700", fontSize: "36px", fontWeight: 700, margin: "10px 0" }}>{score}</p>
          <p style={{ color: "#888", marginBottom: "5px" }}>Wave {wave}</p>
          <button onClick={startGame} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer", marginTop: "15px" }}>Retry</button>
        </div>
      ) : (
        <div>
          <canvas ref={canvasRef} width={400} height={400} style={{ borderRadius: "12px", border: "1px solid #1a1a3a", display: "block" }} />
          <p style={{ color: "#555", fontSize: "11px", textAlign: "center", marginTop: "6px" }}>Arrow keys to move, Space to shoot</p>
        </div>
      )}
    </div>
  );
}
