"use client";
import { useRef, useEffect, useState, useCallback } from "react";

interface Platform { x: number; y: number; w: number; }
interface Ladder { x: number; y1: number; y2: number; }
interface Barrel { x: number; y: number; vx: number; vy: number; onPlatform: number; }
interface Coin { x: number; y: number; collected: boolean; }
interface Player { x: number; y: number; vx: number; vy: number; onGround: boolean; onLadder: boolean; facing: number; }

const W = 400, H = 500;
const GRAVITY = 0.4, JUMP = -8, SPEED = 3, BARREL_SPEED = 2;

const LEVELS: { platforms: Platform[]; ladders: Ladder[]; coins: { x: number; y: number }[]; barrelSpawn: { x: number; y: number; vx: number }[]; goal: { x: number; y: number } }[] = [
  {
    platforms: [
      { x: 0, y: 480, w: 400 },
      { x: 40, y: 380, w: 320 },
      { x: 20, y: 280, w: 340 },
      { x: 40, y: 180, w: 320 },
      { x: 60, y: 90, w: 280 },
    ],
    ladders: [
      { x: 320, y1: 380, y2: 480 },
      { x: 80, y1: 280, y2: 380 },
      { x: 300, y1: 180, y2: 280 },
      { x: 100, y1: 90, y2: 180 },
    ],
    coins: [
      { x: 200, y: 360 }, { x: 150, y: 260 }, { x: 250, y: 160 }, { x: 180, y: 70 },
    ],
    barrelSpawn: [{ x: 80, y: 170, vx: BARREL_SPEED }],
    goal: { x: 300, y: 60 },
  },
  {
    platforms: [
      { x: 0, y: 480, w: 400 },
      { x: 20, y: 400, w: 180 }, { x: 220, y: 400, w: 160 },
      { x: 60, y: 320, w: 280 },
      { x: 20, y: 240, w: 160 }, { x: 220, y: 240, w: 160 },
      { x: 80, y: 160, w: 240 },
      { x: 100, y: 80, w: 200 },
    ],
    ladders: [
      { x: 160, y1: 400, y2: 480 },
      { x: 300, y1: 320, y2: 400 },
      { x: 100, y1: 240, y2: 320 },
      { x: 280, y1: 160, y2: 240 },
      { x: 160, y1: 80, y2: 160 },
    ],
    coins: [
      { x: 100, y: 380 }, { x: 300, y: 380 }, { x: 200, y: 300 },
      { x: 120, y: 220 }, { x: 300, y: 220 }, { x: 200, y: 140 },
    ],
    barrelSpawn: [{ x: 120, y: 70, vx: BARREL_SPEED }, { x: 280, y: 150, vx: -BARREL_SPEED }],
    goal: { x: 200, y: 50 },
  },
  {
    platforms: [
      { x: 0, y: 480, w: 400 },
      { x: 30, y: 410, w: 150 }, { x: 220, y: 410, w: 150 },
      { x: 50, y: 340, w: 300 },
      { x: 10, y: 270, w: 180 }, { x: 210, y: 270, w: 180 },
      { x: 60, y: 200, w: 280 },
      { x: 30, y: 130, w: 150 }, { x: 220, y: 130, w: 150 },
      { x: 100, y: 60, w: 200 },
    ],
    ladders: [
      { x: 150, y1: 410, y2: 480 },
      { x: 320, y1: 340, y2: 410 },
      { x: 80, y1: 270, y2: 340 },
      { x: 300, y1: 200, y2: 270 },
      { x: 120, y1: 130, y2: 200 },
      { x: 280, y1: 60, y2: 130 },
    ],
    coins: [
      { x: 80, y: 390 }, { x: 280, y: 390 }, { x: 200, y: 320 },
      { x: 100, y: 250 }, { x: 320, y: 250 }, { x: 150, y: 180 },
      { x: 80, y: 110 }, { x: 300, y: 110 },
    ],
    barrelSpawn: [
      { x: 140, y: 50, vx: BARREL_SPEED },
      { x: 260, y: 120, vx: -BARREL_SPEED },
      { x: 100, y: 190, vx: BARREL_SPEED },
    ],
    goal: { x: 200, y: 30 },
  },
];

export default function BarrelClimb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "play" | "win" | "over">("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(0);
  const keysRef = useRef<Set<string>>(new Set());
  const gameRef = useRef<{
    player: Player;
    barrels: Barrel[];
    coins: Coin[];
    score: number;
    lives: number;
    frame: number;
    running: boolean;
    barrelTimer: number;
    levelData: typeof LEVELS[0];
  } | null>(null);

  const initLevel = useCallback((lvl: number, keepScore?: number, keepLives?: number) => {
    const ld = LEVELS[lvl];
    gameRef.current = {
      player: { x: 50, y: 460, vx: 0, vy: 0, onGround: true, onLadder: false, facing: 1 },
      barrels: [],
      coins: ld.coins.map((c) => ({ ...c, collected: false })),
      score: keepScore ?? 0,
      lives: keepLives ?? 3,
      frame: 0,
      running: true,
      barrelTimer: 0,
      levelData: ld,
    };
    setScore(gameRef.current.score);
    setLives(gameRef.current.lives);
    setLevel(lvl);
    setScreen("play");
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); e.preventDefault(); };
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
      const p = g.player;
      const ld = g.levelData;

      // Player input
      p.vx = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) { p.vx = -SPEED; p.facing = -1; }
      if (keys.has("ArrowRight") || keys.has("d")) { p.vx = SPEED; p.facing = 1; }

      // Ladder check
      const onLadderNow = ld.ladders.some((l) => Math.abs(p.x - l.x) < 15 && p.y >= l.y1 && p.y <= l.y2);
      if (onLadderNow && (keys.has("ArrowUp") || keys.has("w"))) {
        p.onLadder = true;
        p.vy = -SPEED;
      } else if (onLadderNow && (keys.has("ArrowDown") || keys.has("s"))) {
        p.onLadder = true;
        p.vy = SPEED * 0.8;
      } else if (p.onLadder && onLadderNow) {
        p.vy = 0;
      } else {
        p.onLadder = false;
      }

      // Jump
      if ((keys.has(" ") || keys.has("ArrowUp") || keys.has("w")) && p.onGround && !p.onLadder) {
        p.vy = JUMP;
        p.onGround = false;
      }

      // Gravity
      if (!p.onLadder) {
        p.vy += GRAVITY;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Platform collision
      p.onGround = false;
      for (const plat of ld.platforms) {
        if (p.x >= plat.x - 8 && p.x <= plat.x + plat.w + 8 && p.vy >= 0) {
          if (p.y >= plat.y - 16 && p.y <= plat.y + 4) {
            p.y = plat.y - 16;
            p.vy = 0;
            p.onGround = true;
          }
        }
      }

      // Bounds
      if (p.x < 10) p.x = 10;
      if (p.x > W - 10) p.x = W - 10;
      if (p.y > H) {
        g.lives--;
        setLives(g.lives);
        if (g.lives <= 0) { g.running = false; setScreen("over"); return; }
        p.x = 50; p.y = 460; p.vx = 0; p.vy = 0;
      }

      // Barrels
      g.barrelTimer++;
      if (g.barrelTimer % 120 === 0) {
        for (const bs of ld.barrelSpawn) {
          g.barrels.push({ x: bs.x, y: bs.y, vx: bs.vx, vy: 0, onPlatform: -1 });
        }
      }

      for (const b of g.barrels) {
        b.vy += GRAVITY * 0.5;
        b.x += b.vx;
        b.y += b.vy;

        for (const plat of ld.platforms) {
          if (b.x >= plat.x && b.x <= plat.x + plat.w && b.vy >= 0) {
            if (b.y >= plat.y - 10 && b.y <= plat.y + 4) {
              b.y = plat.y - 10;
              b.vy = 0;
            }
          }
        }
        if (b.x < 0 || b.x > W) b.vx = -b.vx;

        // Hit player
        if (Math.abs(b.x - p.x) < 18 && Math.abs(b.y - p.y) < 18) {
          g.lives--;
          setLives(g.lives);
          if (g.lives <= 0) { g.running = false; setScreen("over"); return; }
          p.x = 50; p.y = 460; p.vx = 0; p.vy = 0;
        }
      }
      g.barrels = g.barrels.filter((b) => b.y < H + 20);

      // Coins
      for (const c of g.coins) {
        if (!c.collected && Math.abs(c.x - p.x) < 16 && Math.abs(c.y - p.y) < 16) {
          c.collected = true;
          g.score += 50;
          setScore(g.score);
        }
      }

      // Goal
      if (Math.abs(p.x - ld.goal.x) < 20 && Math.abs(p.y - ld.goal.y) < 20) {
        g.score += 200;
        setScore(g.score);
        if (level < LEVELS.length - 1) {
          initLevel(level + 1, g.score, g.lives);
          return;
        } else {
          g.running = false;
          setScreen("win");
          return;
        }
      }

      // Draw
      g.frame++;
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Platforms
      for (const plat of ld.platforms) {
        const pg = ctx.createLinearGradient(plat.x, plat.y - 6, plat.x, plat.y + 6);
        pg.addColorStop(0, "#4a3728");
        pg.addColorStop(1, "#2a1f16");
        ctx.fillStyle = pg;
        ctx.fillRect(plat.x, plat.y - 6, plat.w, 12);
        ctx.strokeStyle = "#5c4033";
        ctx.lineWidth = 1;
        ctx.strokeRect(plat.x, plat.y - 6, plat.w, 12);
      }

      // Ladders
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2;
      for (const l of ld.ladders) {
        ctx.beginPath();
        ctx.moveTo(l.x - 8, l.y1);
        ctx.lineTo(l.x - 8, l.y2);
        ctx.moveTo(l.x + 8, l.y1);
        ctx.lineTo(l.x + 8, l.y2);
        ctx.stroke();
        for (let ry = l.y1 + 15; ry < l.y2; ry += 15) {
          ctx.beginPath();
          ctx.moveTo(l.x - 8, ry);
          ctx.lineTo(l.x + 8, ry);
          ctx.stroke();
        }
      }

      // Goal flag
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(ld.goal.x - 2, ld.goal.y - 20, 4, 30);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(ld.goal.x + 2, ld.goal.y - 20);
      ctx.lineTo(ld.goal.x + 20, ld.goal.y - 14);
      ctx.lineTo(ld.goal.x + 2, ld.goal.y - 8);
      ctx.fill();

      // Coins
      for (const c of g.coins) {
        if (c.collected) continue;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b8860b";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("$", c.x, c.y + 3);
      }

      // Barrels
      for (const b of g.barrels) {
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5c3010";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "#a0522d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x - 10, b.y);
        ctx.lineTo(b.x + 10, b.y);
        ctx.stroke();
      }

      // Player
      ctx.save();
      ctx.translate(p.x, p.y);
      // Body
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-8, -12, 16, 16);
      // Head
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, -18, 8, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.fillRect(p.facing > 0 ? 2 : -5, -20, 3, 3);
      // Legs
      ctx.fillStyle = "#1e40af";
      ctx.fillRect(-7, 4, 5, 8);
      ctx.fillRect(2, 4, 5, 8);
      // Arms
      const armSwing = Math.sin(g.frame * 0.2) * 4;
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-12, -8 + armSwing, 4, 10);
      ctx.fillRect(8, -8 - armSwing, 4, 10);
      ctx.restore();

      // HUD on canvas
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${g.score}`, 10, 20);
      ctx.fillText(`Lives: ${"♥".repeat(g.lives)}`, 10, 38);
      ctx.textAlign = "right";
      ctx.fillText(`Level ${level + 1}/${LEVELS.length}`, W - 10, 20);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [screen, level, initLevel]);

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 8 }}>Barrel Climb</h1>
        <p style={{ color: "#888", marginBottom: 8 }}>Climb ladders, dodge barrels, collect coins!</p>
        <p style={{ color: "#666", marginBottom: 24, fontSize: 13 }}>Arrow keys / WASD to move, Space to jump</p>
        <button onClick={() => initLevel(0)} style={{ padding: "14px 48px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
          Start
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 38, color: "#ef4444" }}>Game Over</h1>
        <p style={{ fontSize: 28, color: accent, fontWeight: 800 }}>{score} pts</p>
        <p style={{ color: "#888" }}>Reached Level {level + 1}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => initLevel(0)} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>Retry</button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>Menu</button>
        </div>
      </div>
    );
  }

  if (screen === "win") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 40, color: "#22c55e" }}>You Win!</h1>
        <p style={{ fontSize: 32, color: accent, fontWeight: 800 }}>{score} pts</p>
        <p style={{ color: "#888" }}>All levels cleared!</p>
        <button onClick={() => initLevel(0)} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer", marginTop: 16 }}>Play Again</button>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: 20, fontFamily: "'Segoe UI', sans-serif" }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, border: "2px solid #222" }} />
      <p style={{ color: "#555", fontSize: 12, marginTop: 10 }}>Arrow keys / WASD to move | Space to jump</p>
    </div>
  );
}
