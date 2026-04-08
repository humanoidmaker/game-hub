"use client";
import { useRef, useEffect, useState, useCallback } from "react";

/* ─── helpers ─── */
const W = 400, H = 400;
const TAU = Math.PI * 2;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

/* ─── types ─── */
interface Vec2 { x: number; y: number }
interface Ship extends Vec2 { angle: number; vx: number; vy: number }
interface Bullet extends Vec2 { vx: number; vy: number; life: number }
interface Asteroid extends Vec2 {
  vx: number; vy: number; r: number;
  size: "large" | "medium" | "small";
  shape: number[]; // offsets per vertex for irregular polygon
  rot: number; rotSpeed: number;
}
interface Particle extends Vec2 {
  vx: number; vy: number; life: number; maxLife: number;
  color: string; radius: number;
}
interface UFO extends Vec2 { vx: number; vy: number; timer: number; shootTimer: number }
interface Star { x: number; y: number; brightness: number; twinkleSpeed: number; phase: number }

const ASTEROID_SIZES: Record<string, { r: number; score: number; next: string | null }> = {
  large:  { r: 35, score: 20,  next: "medium" },
  medium: { r: 18, score: 50,  next: "small" },
  small:  { r: 9,  score: 100, next: null },
};

/* ─── sound via AudioContext ─── */
function createSoundEngine() {
  let ctx: AudioContext | null = null;
  const getCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  };
  return {
    shoot() {
      const c = getCtx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = "square"; o.frequency.setValueAtTime(600, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.1);
    },
    explosion() {
      const c = getCtx(); const buf = c.createBufferSource();
      const buffer = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      buf.buffer = buffer; const g = c.createGain();
      g.gain.setValueAtTime(0.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      buf.connect(g).connect(c.destination); buf.start();
    },
    thrust() {
      const c = getCtx(); const buf = c.createBufferSource();
      const buffer = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3 * (1 - i / data.length);
      buf.buffer = buffer; const g = c.createGain();
      g.gain.setValueAtTime(0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
      buf.connect(g).connect(c.destination); buf.start();
    },
    dispose() { if (ctx) { ctx.close(); ctx = null; } },
  };
}

/* ─── factory helpers ─── */
function makeAsteroidShape(vertices: number): number[] {
  const offsets: number[] = [];
  for (let i = 0; i < vertices; i++) offsets.push(rand(0.7, 1.3));
  return offsets;
}

function spawnAsteroid(
  size: "large" | "medium" | "small",
  x?: number, y?: number, targetCenter = true,
): Asteroid {
  const info = ASTEROID_SIZES[size];
  const ax = x ?? (Math.random() < 0.5 ? rand(-info.r, 0) : rand(W, W + info.r));
  const ay = y ?? rand(0, H);
  const speed = size === "large" ? rand(0.4, 1.0) : size === "medium" ? rand(0.6, 1.4) : rand(0.8, 1.8);
  let angle: number;
  if (targetCenter && x === undefined) {
    angle = Math.atan2(H / 2 - ay, W / 2 - ax) + rand(-0.6, 0.6);
  } else {
    angle = rand(0, TAU);
  }
  return {
    x: ax, y: ay,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: info.r + rand(-3, 3),
    size,
    shape: makeAsteroidShape(size === "large" ? 10 : size === "medium" ? 8 : 6),
    rot: rand(0, TAU),
    rotSpeed: rand(-0.02, 0.02),
  };
}

function spawnParticles(
  arr: Particle[], x: number, y: number, count: number,
  color: string, speed: number, life: number, radius = 2,
) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const s = rand(speed * 0.3, speed);
    arr.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life, maxLife: life, color, radius: rand(radius * 0.5, radius),
    });
  }
}

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: rand(0, W), y: rand(0, H),
    brightness: rand(0.3, 1),
    twinkleSpeed: rand(0.005, 0.03),
    phase: rand(0, TAU),
  }));
}

/* ─── component ─── */
export default function AsteroidShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameState, setGameState] = useState<"title" | "playing" | "over">("title");

  // load high score once
  useEffect(() => {
    const saved = localStorage.getItem("asteroidShooterHigh");
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const startGame = useCallback(() => {
    setScore(0); setLives(3); setWave(1);
    setGameState("playing");
  }, []);

  /* ─── main game loop effect ─── */
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const sound = createSoundEngine();
    const keys: Record<string, boolean> = {};
    let animId = 0;
    let thrustSoundCooldown = 0;

    // state
    let ship: Ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
    let bullets: Bullet[] = [];
    let asteroids: Asteroid[] = [];
    let particles: Particle[] = [];
    let ufo: UFO | null = null;
    let ufoBullets: Bullet[] = [];
    const stars = makeStars(80);

    let sc = 0;
    let livesLeft = 3;
    let currentWave = 1;
    let invincibleTimer = 120; // start with brief invincibility
    let shootCooldown = 0;
    let ufoSpawnTimer = rand(600, 1200);
    let waveCleared = false;
    let frameTick = 0;

    // spawn initial wave
    const spawnWave = (n: number) => {
      for (let i = 0; i < n; i++) asteroids.push(spawnAsteroid("large"));
    };
    spawnWave(4);

    /* ─── input ─── */
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      keys[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ─── drawing helpers ─── */
    const drawShip = (s: Ship, alpha: number) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const drawAsteroid = (a: Asteroid) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const verts = a.shape.length;
      for (let i = 0; i <= verts; i++) {
        const idx = i % verts;
        const ang = (TAU / verts) * idx;
        const rr = a.r * a.shape[idx];
        const px = Math.cos(ang) * rr;
        const py = Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const drawUFO = (u: UFO) => {
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.strokeStyle = "#ff44ff";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ff44ff";
      ctx.shadowBlur = 5;
      // body ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 7, 0, 0, TAU);
      ctx.stroke();
      // dome
      ctx.beginPath();
      ctx.ellipse(0, -4, 8, 6, 0, Math.PI, 0);
      ctx.stroke();
      // bottom line
      ctx.beginPath();
      ctx.moveTo(-10, 4); ctx.lineTo(10, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawStars = () => {
      for (const s of stars) {
        const b = s.brightness * (0.5 + 0.5 * Math.sin(frameTick * s.twinkleSpeed + s.phase));
        ctx.fillStyle = `rgba(255,255,255,${b})`;
        ctx.fillRect(s.x, s.y, 1.2, 1.2);
      }
    };

    /* ─── main loop ─── */
    const loop = () => {
      frameTick++;

      // --- background ---
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, W, H);
      drawStars();

      // --- timers ---
      if (invincibleTimer > 0) invincibleTimer--;
      if (shootCooldown > 0) shootCooldown--;
      if (thrustSoundCooldown > 0) thrustSoundCooldown--;

      // --- ship controls ---
      if (keys["ArrowLeft"]) ship.angle -= 0.065;
      if (keys["ArrowRight"]) ship.angle += 0.065;
      if (keys["ArrowUp"]) {
        ship.vx += Math.cos(ship.angle) * 0.12;
        ship.vy += Math.sin(ship.angle) * 0.12;
        // thrust particles
        const backAngle = ship.angle + Math.PI;
        for (let i = 0; i < 2; i++) {
          const spread = rand(-0.3, 0.3);
          particles.push({
            x: ship.x + Math.cos(backAngle) * 8,
            y: ship.y + Math.sin(backAngle) * 8,
            vx: Math.cos(backAngle + spread) * rand(1, 3),
            vy: Math.sin(backAngle + spread) * rand(1, 3),
            life: 15, maxLife: 15,
            color: Math.random() > 0.5 ? "#ff8800" : "#ffcc00",
            radius: rand(1, 2.5),
          });
        }
        if (thrustSoundCooldown <= 0) {
          sound.thrust();
          thrustSoundCooldown = 4;
        }
      }
      // speed cap
      const spd = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
      if (spd > 5) { ship.vx = (ship.vx / spd) * 5; ship.vy = (ship.vy / spd) * 5; }
      ship.vx *= 0.992; ship.vy *= 0.992;
      ship.x = wrap(ship.x + ship.vx, W);
      ship.y = wrap(ship.y + ship.vy, H);

      // shoot
      if (keys["Space"] && shootCooldown <= 0) {
        const bx = ship.x + Math.cos(ship.angle) * 14;
        const by = ship.y + Math.sin(ship.angle) * 14;
        bullets.push({
          x: bx, y: by,
          vx: Math.cos(ship.angle) * 7 + ship.vx * 0.3,
          vy: Math.sin(ship.angle) * 7 + ship.vy * 0.3,
          life: 55,
        });
        sound.shoot();
        shootCooldown = 8;
      }

      // --- update & draw bullets ---
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x = wrap(b.x + b.vx, W);
        b.y = wrap(b.y + b.vy, H);
        b.life--;
        if (b.life <= 0) { bullets.splice(i, 1); continue; }
        ctx.fillStyle = "#ffee55";
        ctx.shadowColor = "#ffee55";
        ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // --- update & draw asteroids ---
      for (const a of asteroids) {
        a.x = wrap(a.x + a.vx, W);
        a.y = wrap(a.y + a.vy, H);
        a.rot += a.rotSpeed;
        drawAsteroid(a);
      }

      // --- bullet-asteroid collision ---
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        let hit = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          if (dist(bullets[j].x, bullets[j].y, a.x, a.y) < a.r) {
            bullets.splice(j, 1);
            hit = true;
            break;
          }
        }
        if (hit) {
          const info = ASTEROID_SIZES[a.size];
          sc += info.score;
          setScore(sc);
          sound.explosion();
          spawnParticles(particles, a.x, a.y, a.size === "large" ? 18 : a.size === "medium" ? 12 : 8, "#aaa", 2.5, 25, 2);
          if (info.next) {
            asteroids.push(spawnAsteroid(info.next as any, a.x + rand(-5, 5), a.y + rand(-5, 5), false));
            asteroids.push(spawnAsteroid(info.next as any, a.x + rand(-5, 5), a.y + rand(-5, 5), false));
          }
          asteroids.splice(i, 1);
        }
      }

      // --- ship-asteroid collision ---
      if (invincibleTimer <= 0) {
        for (const a of asteroids) {
          if (dist(ship.x, ship.y, a.x, a.y) < a.r + 8) {
            livesLeft--;
            setLives(livesLeft);
            sound.explosion();
            spawnParticles(particles, ship.x, ship.y, 25, "#00ffcc", 3, 30, 2.5);
            if (livesLeft <= 0) {
              // game over
              const saved = localStorage.getItem("asteroidShooterHigh");
              const best = saved ? parseInt(saved, 10) : 0;
              if (sc > best) {
                localStorage.setItem("asteroidShooterHigh", String(sc));
                setHighScore(sc);
              }
              setGameState("over");
              sound.dispose();
              cancelAnimationFrame(animId);
              return;
            }
            // respawn ship
            ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
            invincibleTimer = 120; // ~2 seconds at 60fps
            break;
          }
        }
      }

      // --- UFO ---
      ufoSpawnTimer--;
      if (ufoSpawnTimer <= 0 && !ufo) {
        const fromLeft = Math.random() > 0.5;
        ufo = {
          x: fromLeft ? -20 : W + 20,
          y: rand(40, H - 40),
          vx: fromLeft ? 1.5 : -1.5,
          vy: rand(-0.5, 0.5),
          timer: 400,
          shootTimer: 80,
        };
        ufoSpawnTimer = rand(800, 1500);
      }
      if (ufo) {
        ufo.x += ufo.vx;
        ufo.y += ufo.vy;
        ufo.timer--;
        ufo.shootTimer--;
        if (ufo.timer <= 0 || ufo.x < -30 || ufo.x > W + 30) {
          ufo = null;
        } else {
          // UFO shoots at ship
          if (ufo.shootTimer <= 0) {
            const angle = Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + rand(-0.3, 0.3);
            ufoBullets.push({
              x: ufo.x, y: ufo.y,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              life: 90,
            });
            ufo.shootTimer = rand(50, 90);
          }
          drawUFO(ufo);

          // bullet hits UFO
          for (let j = bullets.length - 1; j >= 0; j--) {
            if (dist(bullets[j].x, bullets[j].y, ufo.x, ufo.y) < 18) {
              bullets.splice(j, 1);
              sc += 200;
              setScore(sc);
              sound.explosion();
              spawnParticles(particles, ufo.x, ufo.y, 20, "#ff44ff", 3, 25, 2);
              ufo = null;
              break;
            }
          }

          // ship-UFO collision
          if (ufo && invincibleTimer <= 0 && dist(ship.x, ship.y, ufo.x, ufo.y) < 22) {
            livesLeft--;
            setLives(livesLeft);
            sound.explosion();
            spawnParticles(particles, ship.x, ship.y, 25, "#00ffcc", 3, 30, 2.5);
            if (livesLeft <= 0) {
              const saved = localStorage.getItem("asteroidShooterHigh");
              const best = saved ? parseInt(saved, 10) : 0;
              if (sc > best) { localStorage.setItem("asteroidShooterHigh", String(sc)); setHighScore(sc); }
              setGameState("over");
              sound.dispose();
              cancelAnimationFrame(animId);
              return;
            }
            ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
            invincibleTimer = 120;
          }
        }
      }

      // --- UFO bullets ---
      for (let i = ufoBullets.length - 1; i >= 0; i--) {
        const b = ufoBullets[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.life <= 0 || b.x < -5 || b.x > W + 5 || b.y < -5 || b.y > H + 5) {
          ufoBullets.splice(i, 1); continue;
        }
        ctx.fillStyle = "#ff44ff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, TAU); ctx.fill();
        // hit ship?
        if (invincibleTimer <= 0 && dist(b.x, b.y, ship.x, ship.y) < 10) {
          ufoBullets.splice(i, 1);
          livesLeft--;
          setLives(livesLeft);
          sound.explosion();
          spawnParticles(particles, ship.x, ship.y, 25, "#00ffcc", 3, 30, 2.5);
          if (livesLeft <= 0) {
            const saved = localStorage.getItem("asteroidShooterHigh");
            const best = saved ? parseInt(saved, 10) : 0;
            if (sc > best) { localStorage.setItem("asteroidShooterHigh", String(sc)); setHighScore(sc); }
            setGameState("over");
            sound.dispose();
            cancelAnimationFrame(animId);
            return;
          }
          ship = { x: W / 2, y: H / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };
          invincibleTimer = 120;
          break;
        }
      }

      // --- particles ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * alpha, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // --- wave system ---
      if (asteroids.length === 0 && !waveCleared) {
        waveCleared = true;
      }
      if (waveCleared) {
        // brief pause then next wave
        currentWave++;
        setWave(currentWave);
        spawnWave(2 + currentWave * 2); // wave 1=4, wave 2=6, wave 3=8...
        waveCleared = false;
      }

      // --- draw ship (blinking when invincible) ---
      if (invincibleTimer <= 0 || Math.floor(frameTick / 4) % 2 === 0) {
        drawShip(ship, invincibleTimer > 0 ? 0.5 : 1);
        // thrust flame visual on ship
        if (keys["ArrowUp"]) {
          ctx.save();
          ctx.translate(ship.x, ship.y);
          ctx.rotate(ship.angle);
          ctx.globalAlpha = invincibleTimer > 0 ? 0.4 : 0.8;
          ctx.strokeStyle = "#ff8800";
          ctx.lineWidth = 1.5;
          const flicker = rand(3, 8);
          ctx.beginPath();
          ctx.moveTo(-8, -4);
          ctx.lineTo(-8 - flicker, 0);
          ctx.lineTo(-8, 4);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // --- HUD ---
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE ${String(sc).padStart(6, "0")}`, 10, 22);
      ctx.textAlign = "right";
      ctx.fillText(`WAVE ${currentWave}`, W - 10, 22);
      // lives as small ship icons
      ctx.textAlign = "left";
      for (let i = 0; i < livesLeft; i++) {
        ctx.save();
        ctx.translate(15 + i * 20, 38);
        ctx.rotate(-Math.PI / 2);
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 5);
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      }
      // high score
      ctx.fillStyle = "#666";
      ctx.font = "11px 'Courier New', monospace";
      ctx.textAlign = "center";
      const savedHigh = localStorage.getItem("asteroidShooterHigh");
      const hi = savedHigh ? parseInt(savedHigh, 10) : 0;
      ctx.fillText(`HI ${String(Math.max(sc, hi)).padStart(6, "0")}`, W / 2, 22);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      sound.dispose();
    };
  }, [gameState]);

  /* ─── render ─── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            borderRadius: 8,
            border: "1px solid #222",
            background: "#050510",
            display: "block",
          }}
        />

        {/* title screen overlay */}
        {gameState === "title" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(5,5,16,0.92)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: "bold",
                color: "#00ffcc",
                textShadow: "0 0 20px #00ffcc66",
                marginBottom: 8,
                letterSpacing: 3,
              }}
            >
              ASTEROIDS
            </div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 24 }}>
              A classic arcade shooter
            </div>
            {highScore > 0 && (
              <div style={{ color: "#ffcc00", fontSize: 13, marginBottom: 16 }}>
                HIGH SCORE: {highScore}
              </div>
            )}
            <button
              onClick={startGame}
              style={{
                background: "transparent",
                border: "2px solid #00ffcc",
                color: "#00ffcc",
                padding: "10px 32px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 15,
                fontFamily: "'Courier New', monospace",
                fontWeight: "bold",
                letterSpacing: 2,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#00ffcc22";
                (e.target as HTMLButtonElement).style.boxShadow = "0 0 15px #00ffcc44";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              START GAME
            </button>
          </div>
        )}

        {/* game over overlay */}
        {gameState === "over" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(5,5,16,0.88)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#ff4444",
                textShadow: "0 0 15px #ff444466",
                marginBottom: 12,
              }}
            >
              GAME OVER
            </div>
            <div style={{ color: "#fff", fontSize: 16, marginBottom: 6 }}>
              SCORE: {score}
            </div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>
              WAVE: {wave}
            </div>
            {score >= highScore && score > 0 && (
              <div
                style={{
                  color: "#ffcc00",
                  fontSize: 13,
                  marginBottom: 8,
                  textShadow: "0 0 8px #ffcc0044",
                }}
              >
                NEW HIGH SCORE!
              </div>
            )}
            <div style={{ color: "#666", fontSize: 12, marginBottom: 20 }}>
              HIGH SCORE: {Math.max(score, highScore)}
            </div>
            <button
              onClick={startGame}
              style={{
                background: "transparent",
                border: "2px solid #00ffcc",
                color: "#00ffcc",
                padding: "10px 32px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 15,
                fontFamily: "'Courier New', monospace",
                fontWeight: "bold",
                letterSpacing: 2,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#00ffcc22";
                (e.target as HTMLButtonElement).style.boxShadow = "0 0 15px #00ffcc44";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 12,
          color: "#666",
          fontSize: 12,
        }}
      >
        <span>
          <span style={{ color: "#888" }}>ARROWS</span> rotate/thrust
        </span>
        <span>
          <span style={{ color: "#888" }}>SPACE</span> shoot
        </span>
      </div>
    </div>
  );
}
