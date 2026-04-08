"use client";
import { useRef, useEffect, useState } from "react";

const W = 400, H = 500;
const CELL = 20;
const COLS = W / CELL;
const ROWS = H / CELL;

interface Segment { x: number; y: number; }
interface Bullet { x: number; y: number; }
interface Mushroom { x: number; y: number; hp: number; }
interface Spider { x: number; y: number; vx: number; vy: number; }
interface Flea { x: number; y: number; }

export default function BugBlaster() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const keysRef = useRef<Set<string>>(new Set());

  const gameRef = useRef<{
    player: { x: number; y: number; };
    bullets: Bullet[];
    centipede: Segment[];
    centipedeDir: number;
    centipedeDown: boolean;
    mushrooms: Mushroom[];
    spider: Spider | null;
    fleas: Flea[];
    score: number;
    lives: number;
    level: number;
    frame: number;
    running: boolean;
    shootCooldown: number;
    spiderTimer: number;
    fleaTimer: number;
    moveCounter: number;
  } | null>(null);

  const createMushrooms = (): Mushroom[] => {
    const ms: Mushroom[] = [];
    for (let i = 0; i < 25; i++) {
      const x = Math.floor(Math.random() * COLS) * CELL;
      const y = (3 + Math.floor(Math.random() * (ROWS - 6))) * CELL;
      if (!ms.some((m) => m.x === x && m.y === y)) {
        ms.push({ x, y, hp: 4 });
      }
    }
    return ms;
  };

  const createCentipede = (len: number): Segment[] => {
    const segs: Segment[] = [];
    for (let i = 0; i < len; i++) {
      segs.push({ x: (COLS - 1 - i) * CELL, y: 0 });
    }
    return segs;
  };

  const startGame = () => {
    gameRef.current = {
      player: { x: W / 2 - CELL / 2, y: H - CELL * 2 },
      bullets: [],
      centipede: createCentipede(12),
      centipedeDir: -1,
      centipedeDown: false,
      mushrooms: createMushrooms(),
      spider: null,
      fleas: [],
      score: 0,
      lives: 3,
      level: 1,
      frame: 0,
      running: true,
      shootCooldown: 0,
      spiderTimer: 200,
      fleaTimer: 500,
      moveCounter: 0,
    };
    setScore(0);
    setLives(3);
    setLevel(1);
    setScreen("play");
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault(); };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const loop = () => {
      const g = gameRef.current;
      if (!g || !g.running) return;
      const keys = keysRef.current;
      g.frame++;

      // Player movement
      const spd = 4;
      if (keys.has("ArrowLeft") || keys.has("a")) g.player.x = Math.max(0, g.player.x - spd);
      if (keys.has("ArrowRight") || keys.has("d")) g.player.x = Math.min(W - CELL, g.player.x + spd);
      if (keys.has("ArrowUp") || keys.has("w")) g.player.y = Math.max(H - CELL * 5, g.player.y - spd);
      if (keys.has("ArrowDown") || keys.has("s")) g.player.y = Math.min(H - CELL, g.player.y + spd);

      // Shooting
      g.shootCooldown--;
      if ((keys.has(" ") || keys.has("z")) && g.shootCooldown <= 0 && g.bullets.length < 3) {
        g.bullets.push({ x: g.player.x + CELL / 2 - 2, y: g.player.y });
        g.shootCooldown = 8;
      }

      // Move bullets
      g.bullets = g.bullets.filter((b) => {
        b.y -= 8;
        return b.y > -10;
      });

      // Centipede movement
      const moveSpeed = Math.max(2, 6 - g.level);
      g.moveCounter++;
      if (g.moveCounter >= moveSpeed) {
        g.moveCounter = 0;
        let needDown = false;
        for (const seg of g.centipede) {
          seg.x += g.centipedeDir * CELL;
          // Check wall or mushroom
          if (seg.x < 0 || seg.x >= W) needDown = true;
          if (g.mushrooms.some((m) => m.x === seg.x && m.y === seg.y)) {
            seg.x -= g.centipedeDir * CELL;
            needDown = true;
          }
        }
        if (needDown) {
          g.centipedeDir = -g.centipedeDir;
          for (const seg of g.centipede) {
            seg.y += CELL;
            seg.x = Math.max(0, Math.min(W - CELL, seg.x));
          }
        }
      }

      // Bullet-centipede collision
      for (const bullet of g.bullets) {
        for (let i = g.centipede.length - 1; i >= 0; i--) {
          const seg = g.centipede[i];
          if (Math.abs(bullet.x - seg.x) < CELL && Math.abs(bullet.y - seg.y) < CELL) {
            // Leave mushroom
            g.mushrooms.push({ x: seg.x, y: seg.y, hp: 4 });
            g.centipede.splice(i, 1);
            bullet.y = -20;
            g.score += 10;
            setScore(g.score);
            break;
          }
        }
      }

      // Bullet-mushroom collision
      for (const bullet of g.bullets) {
        for (let i = g.mushrooms.length - 1; i >= 0; i--) {
          const m = g.mushrooms[i];
          if (Math.abs(bullet.x - m.x) < CELL && Math.abs(bullet.y - m.y) < CELL) {
            m.hp--;
            bullet.y = -20;
            if (m.hp <= 0) {
              g.mushrooms.splice(i, 1);
              g.score += 1;
              setScore(g.score);
            }
            break;
          }
        }
      }

      // Spider
      g.spiderTimer--;
      if (g.spiderTimer <= 0 && !g.spider) {
        g.spider = {
          x: Math.random() > 0.5 ? 0 : W - CELL,
          y: H - CELL * 4,
          vx: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random()),
          vy: (Math.random() - 0.5) * 3,
        };
        g.spiderTimer = 300 + Math.random() * 200;
      }
      if (g.spider) {
        g.spider.x += g.spider.vx;
        g.spider.y += g.spider.vy;
        if (g.spider.y < H - CELL * 6 || g.spider.y > H - CELL) g.spider.vy = -g.spider.vy;
        if (g.spider.x < -CELL || g.spider.x > W + CELL) g.spider = null;
        // Eat mushrooms
        if (g.spider) {
          g.mushrooms = g.mushrooms.filter((m) => !(Math.abs(m.x - g.spider!.x) < CELL && Math.abs(m.y - g.spider!.y) < CELL));
        }
      }

      // Bullet-spider collision
      if (g.spider) {
        for (const bullet of g.bullets) {
          if (Math.abs(bullet.x - g.spider.x) < CELL && Math.abs(bullet.y - g.spider.y) < CELL) {
            g.score += 50;
            setScore(g.score);
            g.spider = null;
            bullet.y = -20;
            break;
          }
        }
      }

      // Flea
      g.fleaTimer--;
      if (g.fleaTimer <= 0) {
        g.fleas.push({ x: Math.floor(Math.random() * COLS) * CELL, y: -CELL });
        g.fleaTimer = 400 + Math.random() * 300;
      }
      g.fleas = g.fleas.filter((f) => {
        f.y += 3;
        // Drop mushrooms
        if (Math.random() < 0.02 && f.y > CELL * 3 && f.y < H - CELL * 5) {
          if (!g.mushrooms.some((m) => Math.abs(m.x - f.x) < CELL && Math.abs(m.y - f.y) < CELL)) {
            g.mushrooms.push({ x: f.x, y: Math.round(f.y / CELL) * CELL, hp: 4 });
          }
        }
        return f.y < H + CELL;
      });

      // Bullet-flea collision
      for (const bullet of g.bullets) {
        for (let i = g.fleas.length - 1; i >= 0; i--) {
          if (Math.abs(bullet.x - g.fleas[i].x) < CELL && Math.abs(bullet.y - g.fleas[i].y) < CELL) {
            g.fleas.splice(i, 1);
            g.score += 20;
            setScore(g.score);
            bullet.y = -20;
          }
        }
      }

      // Player-enemy collision
      const px = g.player.x, py = g.player.y;
      let hit = false;
      for (const seg of g.centipede) {
        if (Math.abs(px - seg.x) < CELL * 0.8 && Math.abs(py - seg.y) < CELL * 0.8) { hit = true; break; }
      }
      if (g.spider && Math.abs(px - g.spider.x) < CELL && Math.abs(py - g.spider.y) < CELL) hit = true;
      for (const f of g.fleas) {
        if (Math.abs(px - f.x) < CELL * 0.8 && Math.abs(py - f.y) < CELL * 0.8) hit = true;
      }
      if (hit) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) {
          g.running = false;
          setHighScore((h) => Math.max(h, g.score));
          setScreen("over");
          return;
        }
        g.player.x = W / 2 - CELL / 2;
        g.player.y = H - CELL * 2;
        g.spider = null;
      }

      // Centipede reaches bottom
      if (g.centipede.some((s) => s.y >= H - CELL)) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) {
          g.running = false;
          setHighScore((h) => Math.max(h, g.score));
          setScreen("over");
          return;
        }
        g.centipede = createCentipede(12 + g.level * 2);
      }

      // Level complete
      if (g.centipede.length === 0) {
        g.level++;
        g.centipede = createCentipede(12 + g.level * 2);
        setLevel(g.level);
      }

      // Draw
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Grid lines (subtle)
      ctx.strokeStyle = "#111128";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Mushrooms
      for (const m of g.mushrooms) {
        const alpha = m.hp / 4;
        ctx.fillStyle = `rgba(34, 197, 94, ${0.3 + alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(m.x + CELL / 2, m.y + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(22, 163, 74, ${alpha})`;
        ctx.beginPath();
        ctx.arc(m.x + CELL / 2, m.y + CELL / 2 - 2, CELL / 2 - 3, Math.PI, 0);
        ctx.fill();
      }

      // Centipede
      for (let i = 0; i < g.centipede.length; i++) {
        const seg = g.centipede[i];
        const isHead = i === 0;
        const grad = ctx.createRadialGradient(seg.x + CELL / 2, seg.y + CELL / 2, 2, seg.x + CELL / 2, seg.y + CELL / 2, CELL / 2);
        if (isHead) {
          grad.addColorStop(0, "#ff6b6b");
          grad.addColorStop(1, "#ef4444");
        } else {
          grad.addColorStop(0, "#fb923c");
          grad.addColorStop(1, "#f97316");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(seg.x + CELL / 2, seg.y + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        // Eyes on head
        if (isHead) {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(seg.x + CELL / 2 - 4, seg.y + CELL / 2 - 3, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.arc(seg.x + CELL / 2 + 4, seg.y + CELL / 2 - 3, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(seg.x + CELL / 2 - 4, seg.y + CELL / 2 - 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.arc(seg.x + CELL / 2 + 4, seg.y + CELL / 2 - 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Legs
        if (g.frame % 10 < 5) {
          ctx.strokeStyle = isHead ? "#ef4444" : "#f97316";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(seg.x + 3, seg.y + CELL - 2);
          ctx.lineTo(seg.x, seg.y + CELL + 3);
          ctx.moveTo(seg.x + CELL - 3, seg.y + CELL - 2);
          ctx.lineTo(seg.x + CELL, seg.y + CELL + 3);
          ctx.stroke();
        }
      }

      // Spider
      if (g.spider) {
        ctx.fillStyle = "#8b5cf6";
        ctx.beginPath();
        ctx.arc(g.spider.x + CELL / 2, g.spider.y + CELL / 2, CELL / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const a = (i * 0.4 + 0.3) + Math.sin(g.frame * 0.15) * 0.15;
          ctx.beginPath();
          ctx.moveTo(g.spider.x + CELL / 2, g.spider.y + CELL / 2);
          ctx.lineTo(g.spider.x + CELL / 2 + Math.cos(a) * 14, g.spider.y + CELL / 2 + Math.sin(a) * 12);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(g.spider.x + CELL / 2, g.spider.y + CELL / 2);
          ctx.lineTo(g.spider.x + CELL / 2 - Math.cos(a) * 14, g.spider.y + CELL / 2 + Math.sin(a) * 12);
          ctx.stroke();
        }
      }

      // Fleas
      for (const f of g.fleas) {
        ctx.fillStyle = "#ec4899";
        ctx.beginPath();
        ctx.arc(f.x + CELL / 2, f.y + CELL / 2, CELL / 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bullets
      for (const b of g.bullets) {
        ctx.fillStyle = "#00e5ff";
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x, b.y, 4, 10);
        ctx.shadowBlur = 0;
      }

      // Player
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(px + CELL / 2, py);
      ctx.lineTo(px + CELL, py + CELL);
      ctx.lineTo(px, py + CELL);
      ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.moveTo(px + CELL / 2, py + 4);
      ctx.lineTo(px + CELL - 4, py + CELL - 2);
      ctx.lineTo(px + 4, py + CELL - 2);
      ctx.fill();

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${g.score}`, 8, 16);
      ctx.fillText(`Lives: ${"♥".repeat(g.lives)}`, 8, 32);
      ctx.textAlign = "right";
      ctx.fillText(`Level ${g.level}`, W - 8, 16);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [screen]);

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 8 }}>Bug Blaster</h1>
        <p style={{ color: "#888", marginBottom: 8 }}>Destroy the centipede! Watch out for spiders and fleas.</p>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Arrow keys to move | Space/Z to shoot</p>
        {highScore > 0 && <p style={{ color: "#f59e0b", marginBottom: 16 }}>High Score: {highScore}</p>}
        <button onClick={startGame} style={{ padding: "14px 48px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
          Play
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 38, color: "#ef4444", marginBottom: 10 }}>Game Over</h1>
        <div style={{ background: card, borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 42, fontWeight: 800, color: accent, margin: 0 }}>{score}</p>
          <p style={{ color: "#888", margin: "4px 0" }}>SCORE</p>
          <p style={{ color: "#aaa" }}>Level reached: {level}</p>
          {score >= highScore && score > 0 && <p style={{ color: "#f59e0b", fontWeight: 600, marginTop: 8 }}>New High Score!</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>Play Again</button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, border: "2px solid #222" }} />
      <p style={{ color: "#555", fontSize: 12, marginTop: 8 }}>Arrows/WASD to move | Space/Z to shoot</p>
    </div>
  );
}
