"use client";
import { useRef, useEffect, useState, useCallback } from "react";

/* ─── Audio helpers (Web Audio API) ─── */
function createAudioCtx() {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function playShoot(ctx: AudioContext) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(880, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.08);
}

function playExplosion(ctx: AudioContext) {
  const bufSize = ctx.sampleRate * 0.15;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  src.connect(g).connect(ctx.destination);
  src.start();
}

function playPlayerHit(ctx: AudioContext) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(120, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.3);
}

/* ─── Types ─── */
interface Alien {
  x: number; y: number; alive: boolean; row: number;
}
interface Bullet { x: number; y: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

/* ─── Constants ─── */
const W = 400;
const H = 500;
const PLAYER_SPEED = 4;
const PLAYER_BULLET_SPEED = 7;
const ALIEN_BULLET_SPEED = 3;
const ALIEN_COLS = 8;
const ALIEN_ROWS = 5;
const ALIEN_GAP_X = 42;
const ALIEN_GAP_Y = 34;
const ALIEN_START_X = 30;
const ALIEN_START_Y = 50;
const ROW_POINTS = [50, 40, 30, 20, 10]; // top row worth most
const MAX_ALIEN_BULLETS = 2;

export default function GalaxyDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<any>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [hud, setHud] = useState({ score: 0, highScore: 0, level: 1, lives: 3, gameOver: false, started: false });

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = createAudioCtx();
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }, []);

  /* ─── Mobile button handlers ─── */
  const mobileKeys = useRef<Record<string, boolean>>({});
  const onMobileDown = useCallback((key: string) => { mobileKeys.current[key] = true; }, []);
  const onMobileUp = useCallback((key: string) => { mobileKeys.current[key] = false; }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const keys: Record<string, boolean> = {};
    let animId = 0;
    let highScore = 0;
    try { highScore = parseInt(localStorage.getItem("galaxyDefenseHigh") || "0", 10) || 0; } catch {}

    /* ─── Game state ─── */
    const g = {
      px: W / 2,
      bullets: [] as Bullet[],
      aliens: [] as Alien[],
      alienBullets: [] as Bullet[],
      particles: [] as Particle[],
      dir: 1,
      baseSpeed: 0.4,
      moveTimer: 0,
      moveInterval: 40, // frames between moves
      lives: 3,
      score: 0,
      level: 1,
      gameOver: false,
      started: false,
      shootCooldown: 0,
      invincible: 0,
    };
    gameRef.current = g;

    function initAliens() {
      g.aliens = [];
      for (let r = 0; r < ALIEN_ROWS; r++) {
        for (let c = 0; c < ALIEN_COLS; c++) {
          g.aliens.push({
            x: ALIEN_START_X + c * ALIEN_GAP_X,
            y: ALIEN_START_Y + r * ALIEN_GAP_Y,
            alive: true,
            row: r,
          });
        }
      }
      g.alienBullets = [];
      g.dir = 1;
      g.moveTimer = 0;
      // Speed up each level
      g.moveInterval = Math.max(8, 40 - (g.level - 1) * 4);
    }

    function spawnParticles(x: number, y: number, color: string) {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        g.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 18 + Math.random() * 10,
          color,
        });
      }
    }

    function startGame() {
      g.px = W / 2;
      g.bullets = [];
      g.alienBullets = [];
      g.particles = [];
      g.lives = 3;
      g.score = 0;
      g.level = 1;
      g.gameOver = false;
      g.started = true;
      g.shootCooldown = 0;
      g.invincible = 0;
      initAliens();
      setHud({ score: 0, highScore, level: 1, lives: 3, gameOver: false, started: true });
    }

    /* ─── Draw helpers ─── */
    function drawPlayer() {
      const px = g.px;
      const py = H - 30;
      const blink = g.invincible > 0 && Math.floor(g.invincible / 4) % 2 === 0;
      if (blink) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(px, py - 16);
      ctx.lineTo(px - 14, py + 8);
      ctx.lineTo(px - 6, py + 4);
      ctx.lineTo(px, py + 10);
      ctx.lineTo(px + 6, py + 4);
      ctx.lineTo(px + 14, py + 8);
      ctx.closePath();
      ctx.fillStyle = "#00e5ff";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Engine glow
      ctx.beginPath();
      ctx.moveTo(px - 4, py + 10);
      ctx.lineTo(px, py + 16);
      ctx.lineTo(px + 4, py + 10);
      ctx.fillStyle = "#ff6600";
      ctx.fill();
      ctx.restore();
    }

    function drawAlien(a: Alien) {
      const { x, y, row } = a;
      const colors = ["#ff2266", "#ff4488", "#cc44ff", "#44aaff", "#44ff88"];
      const c = colors[row % colors.length];
      ctx.save();
      // Body
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x - 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Antennae
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 11);
      ctx.lineTo(x - 8, y - 18);
      ctx.moveTo(x + 5, y - 11);
      ctx.lineTo(x + 8, y - 18);
      ctx.stroke();
      // Antenna tips
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x - 8, y - 18, 2, 0, Math.PI * 2);
      ctx.arc(x + 8, y - 18, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawStars() {
      // Seeded pseudo-random stars
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 7919 + 1) % W);
        const sy = ((i * 6271 + 3) % H);
        const sz = ((i * 3571) % 3) * 0.4 + 0.5;
        ctx.fillRect(sx, sy, sz, sz);
      }
    }

    /* ─── Main loop ─── */
    function loop() {
      ctx.fillStyle = "#05050f";
      ctx.fillRect(0, 0, W, H);
      drawStars();

      if (!g.started) {
        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Galaxy Defense", W / 2, H / 2 - 40);
        ctx.fillStyle = "#aaa";
        ctx.font = "15px system-ui, sans-serif";
        ctx.fillText("Arrow keys to move, Space to shoot", W / 2, H / 2);
        ctx.fillText("Press Space or tap Fire to start", W / 2, H / 2 + 28);
        animId = requestAnimationFrame(loop);
        return;
      }

      if (g.gameOver) {
        ctx.fillStyle = "#ff2244";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.fillStyle = "#ccc";
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText(`Score: ${g.score}`, W / 2, H / 2 + 14);
        ctx.fillText("Press Space to play again", W / 2, H / 2 + 44);
        // Still update particles
        updateParticles();
        drawParticles();
        animId = requestAnimationFrame(loop);
        return;
      }

      /* ─ Input ─ */
      const left = keys["ArrowLeft"] || mobileKeys.current["left"];
      const right = keys["ArrowRight"] || mobileKeys.current["right"];
      const fire = keys["Space"] || mobileKeys.current["fire"];

      if (left) g.px = Math.max(16, g.px - PLAYER_SPEED);
      if (right) g.px = Math.min(W - 16, g.px + PLAYER_SPEED);

      if (g.shootCooldown > 0) g.shootCooldown--;
      if (fire && g.shootCooldown <= 0) {
        g.bullets.push({ x: g.px, y: H - 46 });
        g.shootCooldown = 12;
        try { playShoot(ensureAudio()); } catch {}
      }

      if (g.invincible > 0) g.invincible--;

      /* ─ Player bullets ─ */
      for (let i = g.bullets.length - 1; i >= 0; i--) {
        g.bullets[i].y -= PLAYER_BULLET_SPEED;
        if (g.bullets[i].y < -10) g.bullets.splice(i, 1);
      }

      /* ─ Alien movement (step-based like classic Space Invaders) ─ */
      g.moveTimer++;
      if (g.moveTimer >= g.moveInterval) {
        g.moveTimer = 0;
        let needDrop = false;
        const aliveAliens = g.aliens.filter(a => a.alive);
        // check boundaries
        for (const a of aliveAliens) {
          const nx = a.x + g.dir * (6 + g.level * 0.5);
          if (nx > W - 18 || nx < 18) { needDrop = true; break; }
        }
        if (needDrop) {
          g.dir *= -1;
          for (const a of aliveAliens) a.y += 14;
        } else {
          for (const a of aliveAliens) a.x += g.dir * (6 + g.level * 0.5);
        }

        // Speed up as fewer aliens remain
        const aliveCount = aliveAliens.length;
        if (aliveCount <= 5) g.moveInterval = Math.max(2, 8 - (g.level - 1));
        else if (aliveCount <= 15) g.moveInterval = Math.max(4, 18 - (g.level - 1) * 2);
        else g.moveInterval = Math.max(8, 40 - (g.level - 1) * 4);
      }

      /* ─ Alien shooting ─ */
      const aliveAliens = g.aliens.filter(a => a.alive);
      if (g.alienBullets.length < MAX_ALIEN_BULLETS && aliveAliens.length > 0) {
        const shootChance = 0.015 + g.level * 0.003;
        if (Math.random() < shootChance) {
          const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
          g.alienBullets.push({ x: shooter.x, y: shooter.y + 14 });
        }
      }

      /* ─ Alien bullets ─ */
      for (let i = g.alienBullets.length - 1; i >= 0; i--) {
        g.alienBullets[i].y += ALIEN_BULLET_SPEED + g.level * 0.2;
        if (g.alienBullets[i].y > H + 10) g.alienBullets.splice(i, 1);
      }

      /* ─ Collision: player bullets vs aliens ─ */
      for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
        const b = g.bullets[bi];
        for (let ai = 0; ai < g.aliens.length; ai++) {
          const a = g.aliens[ai];
          if (!a.alive) continue;
          if (Math.abs(b.x - a.x) < 14 && Math.abs(b.y - a.y) < 14) {
            a.alive = false;
            g.bullets.splice(bi, 1);
            const pts = ROW_POINTS[a.row] || 10;
            g.score += pts;
            if (g.score > highScore) {
              highScore = g.score;
              try { localStorage.setItem("galaxyDefenseHigh", String(highScore)); } catch {}
            }
            const colors = ["#ff2266", "#ff4488", "#cc44ff", "#44aaff", "#44ff88"];
            spawnParticles(a.x, a.y, colors[a.row % colors.length]);
            try { playExplosion(ensureAudio()); } catch {}
            setHud(h => ({ ...h, score: g.score, highScore }));
            break;
          }
        }
      }

      /* ─ Collision: alien bullets vs player ─ */
      if (g.invincible <= 0) {
        for (let i = g.alienBullets.length - 1; i >= 0; i--) {
          const b = g.alienBullets[i];
          if (Math.abs(b.x - g.px) < 14 && b.y > H - 46 && b.y < H - 14) {
            g.alienBullets.splice(i, 1);
            g.lives--;
            g.invincible = 90; // 1.5s invincibility
            try { playPlayerHit(ensureAudio()); } catch {}
            spawnParticles(g.px, H - 30, "#00e5ff");
            if (g.lives <= 0) {
              g.gameOver = true;
              setHud(h => ({ ...h, lives: 0, gameOver: true }));
            } else {
              setHud(h => ({ ...h, lives: g.lives }));
            }
            break;
          }
        }
      }

      /* ─ Aliens reach bottom ─ */
      for (const a of g.aliens) {
        if (a.alive && a.y + 14 >= H - 46) {
          g.gameOver = true;
          g.lives = 0;
          setHud(h => ({ ...h, lives: 0, gameOver: true }));
          break;
        }
      }

      /* ─ Level complete ─ */
      if (!g.gameOver && g.aliens.every(a => !a.alive)) {
        g.level++;
        initAliens();
        setHud(h => ({ ...h, level: g.level }));
      }

      /* ─ Update & draw particles ─ */
      updateParticles();

      /* ─── DRAW ─── */
      // Player bullets
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      for (const b of g.bullets) {
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y + 8);
        ctx.stroke();
      }

      // Alien bullets
      for (const b of g.alienBullets) {
        ctx.fillStyle = "#ff3333";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Aliens
      for (const a of g.aliens) {
        if (a.alive) drawAlien(a);
      }

      // Particles
      drawParticles();

      // Player
      drawPlayer();

      // HUD on canvas
      ctx.fillStyle = "#aaa";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${g.score}`, 8, 16);
      ctx.fillText(`Level: ${g.level}`, 8, 32);
      ctx.textAlign = "right";
      ctx.fillText(`High: ${highScore}`, W - 8, 16);
      // Lives as ship icons
      ctx.textAlign = "right";
      ctx.fillStyle = "#00e5ff";
      for (let i = 0; i < g.lives; i++) {
        const lx = W - 12 - i * 22;
        const ly = 30;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 6);
        ctx.lineTo(lx - 6, ly + 4);
        ctx.lineTo(lx + 6, ly + 4);
        ctx.closePath();
        ctx.fill();
      }

      animId = requestAnimationFrame(loop);
    }

    function updateParticles() {
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    }

    function drawParticles() {
      for (const p of g.particles) {
        const alpha = Math.max(0, p.life / 28);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }

    /* ─── Keyboard ─── */
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
        e.preventDefault();
      }
      keys[e.code] = true;
      if (e.code === "Space") {
        ensureAudio();
        if (!g.started) startGame();
        else if (g.gameOver) startGame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Mobile fire trigger (tap = single shot) ─── */
  const handleFireStart = useCallback(() => {
    ensureAudio();
    const g = gameRef.current;
    if (!g) return;
    if (!g.started || g.gameOver) {
      // Start / restart via fire button
      // Dispatch a space key to trigger start logic
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" })), 100);
      return;
    }
    onMobileDown("fire");
  }, [ensureAudio, onMobileDown]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12, userSelect: "none" }}>
      {/* HUD bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", width: W, fontSize: 13,
        color: "#aaa", fontFamily: "system-ui, sans-serif", padding: "0 4px"
      }}>
        <span>Score: <b style={{ color: "#fff" }}>{hud.score}</b></span>
        <span>Level: <b style={{ color: "#44aaff" }}>{hud.level}</b></span>
        <span>Lives: <b style={{ color: "#00e5ff" }}>{hud.lives}</b></span>
        <span>High: <b style={{ color: "#ffd700" }}>{hud.highScore}</b></span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 8, background: "#05050f", display: "block", maxWidth: "100%", touchAction: "none" }}
      />

      {/* Mobile controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        <button
          onPointerDown={() => onMobileDown("left")}
          onPointerUp={() => onMobileUp("left")}
          onPointerLeave={() => onMobileUp("left")}
          onContextMenu={e => e.preventDefault()}
          style={mobileBtn}
          aria-label="Move left"
        >
          &#9664; Left
        </button>
        <button
          onPointerDown={handleFireStart}
          onPointerUp={() => onMobileUp("fire")}
          onPointerLeave={() => onMobileUp("fire")}
          onContextMenu={e => e.preventDefault()}
          style={{ ...mobileBtn, background: "#ff2244", minWidth: 80 }}
          aria-label="Fire"
        >
          Fire
        </button>
        <button
          onPointerDown={() => onMobileDown("right")}
          onPointerUp={() => onMobileUp("right")}
          onPointerLeave={() => onMobileUp("right")}
          onContextMenu={e => e.preventDefault()}
          style={mobileBtn}
          aria-label="Move right"
        >
          Right &#9654;
        </button>
      </div>

      <p style={{ color: "#555", fontSize: 12, margin: 0 }}>
        Arrow keys + Space &nbsp;|&nbsp; Tap buttons on mobile
      </p>
    </div>
  );
}

const mobileBtn: React.CSSProperties = {
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 600,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#1a1a2e",
  color: "#ccc",
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minWidth: 70,
  textAlign: "center",
};
