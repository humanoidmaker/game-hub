"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const W = 600, H = 300;
const GRAVITY = 0.3;
const MAX_SPEED = 6;
const GROUND_Y = 220;

interface TerrainPoint { x: number; y: number; }
interface Coin { x: number; y: number; collected: boolean; }

export default function BikeRacing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const keysRef = useRef<Set<string>>(new Set());

  const gameRef = useRef<{
    bike: { x: number; y: number; vy: number; angle: number; speed: number; airborne: boolean; flipping: boolean; flipAngle: number; };
    terrain: TerrainPoint[];
    coinList: Coin[];
    cameraX: number;
    distance: number;
    coins: number;
    fuel: number;
    lives: number;
    frame: number;
    running: boolean;
    nextTerrainX: number;
    lastCoinX: number;
    fuelPickups: { x: number; y: number; collected: boolean }[];
  } | null>(null);

  const generateTerrain = (startX: number, count: number): TerrainPoint[] => {
    const points: TerrainPoint[] = [];
    let x = startX;
    let y = GROUND_Y;
    for (let i = 0; i < count; i++) {
      const dy = (Math.random() - 0.5) * 30;
      y = Math.max(120, Math.min(260, y + dy));
      points.push({ x, y });
      x += 20 + Math.random() * 30;
    }
    return points;
  };

  const getTerrainY = (terrain: TerrainPoint[], px: number): number => {
    for (let i = 0; i < terrain.length - 1; i++) {
      if (px >= terrain[i].x && px < terrain[i + 1].x) {
        const t = (px - terrain[i].x) / (terrain[i + 1].x - terrain[i].x);
        return terrain[i].y + t * (terrain[i + 1].y - terrain[i].y);
      }
    }
    return GROUND_Y;
  };

  const getTerrainAngle = (terrain: TerrainPoint[], px: number): number => {
    for (let i = 0; i < terrain.length - 1; i++) {
      if (px >= terrain[i].x && px < terrain[i + 1].x) {
        const dx = terrain[i + 1].x - terrain[i].x;
        const dy = terrain[i + 1].y - terrain[i].y;
        return Math.atan2(dy, dx);
      }
    }
    return 0;
  };

  const startGame = () => {
    const terrain = generateTerrain(0, 200);
    const coinList: Coin[] = [];
    for (let i = 200; i < 4000; i += 150 + Math.random() * 200) {
      coinList.push({ x: i, y: getTerrainY(terrain, i) - 40, collected: false });
    }
    const fuelPickups: { x: number; y: number; collected: boolean }[] = [];
    for (let i = 500; i < 4000; i += 400 + Math.random() * 300) {
      fuelPickups.push({ x: i, y: getTerrainY(terrain, i) - 35, collected: false });
    }

    gameRef.current = {
      bike: { x: 100, y: GROUND_Y - 20, vy: 0, angle: 0, speed: 0, airborne: false, flipping: false, flipAngle: 0 },
      terrain,
      coinList,
      cameraX: 0,
      distance: 0,
      coins: 0,
      fuel: 100,
      lives: 3,
      frame: 0,
      running: true,
      nextTerrainX: terrain[terrain.length - 1].x,
      lastCoinX: 4000,
      fuelPickups,
    };
    setDistance(0);
    setCoins(0);
    setFuel(100);
    setLives(3);
    setScreen("play");
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault(); };
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
      const b = g.bike;
      g.frame++;

      // Accelerate
      if (keys.has("ArrowUp") || keys.has("w")) {
        if (g.fuel > 0) {
          b.speed = Math.min(MAX_SPEED, b.speed + 0.15);
          g.fuel -= 0.08;
          setFuel(Math.round(g.fuel));
        }
      } else {
        b.speed = Math.max(0, b.speed - 0.03);
      }

      // Flip in air
      if ((keys.has(" ")) && b.airborne) {
        b.flipping = true;
        b.flipAngle += 0.15;
      }

      // Move
      b.x += b.speed;
      g.cameraX = b.x - 150;
      g.distance = Math.round(b.x / 10);
      setDistance(g.distance);

      // Terrain generation
      if (b.x > g.nextTerrainX - 2000) {
        const newTerrain = generateTerrain(g.nextTerrainX, 100);
        g.terrain.push(...newTerrain);
        g.nextTerrainX = newTerrain[newTerrain.length - 1].x;
        // New coins
        for (let cx = g.lastCoinX; cx < g.nextTerrainX; cx += 150 + Math.random() * 200) {
          g.coinList.push({ x: cx, y: getTerrainY(g.terrain, cx) - 40, collected: false });
        }
        g.lastCoinX = g.nextTerrainX;
      }

      // Gravity & terrain
      const groundY = getTerrainY(g.terrain, b.x);
      if (b.y < groundY - 20) {
        b.airborne = true;
        b.vy += GRAVITY;
      } else {
        if (b.airborne) {
          // Landing check
          if (b.flipping) {
            const landAngle = b.flipAngle % (Math.PI * 2);
            if (landAngle > Math.PI * 0.3 && landAngle < Math.PI * 1.7) {
              // Crash
              g.lives--;
              setLives(g.lives);
              if (g.lives <= 0) {
                g.running = false;
                setHighScore((h) => Math.max(h, g.distance));
                setScreen("over");
                return;
              }
              b.speed = 0;
            } else {
              // Bonus for flip
              g.coins += 5;
              setCoins(g.coins);
            }
            b.flipping = false;
            b.flipAngle = 0;
          }
          b.airborne = false;
        }
        b.y = groundY - 20;
        b.vy = 0;
        b.angle = getTerrainAngle(g.terrain, b.x);
      }
      b.y += b.vy;

      // Coins
      for (const c of g.coinList) {
        if (!c.collected && Math.abs(c.x - b.x) < 20 && Math.abs(c.y - b.y) < 25) {
          c.collected = true;
          g.coins++;
          setCoins(g.coins);
        }
      }

      // Fuel pickups
      for (const f of g.fuelPickups) {
        if (!f.collected && Math.abs(f.x - b.x) < 20 && Math.abs(f.y - b.y) < 25) {
          f.collected = true;
          g.fuel = Math.min(100, g.fuel + 30);
          setFuel(Math.round(g.fuel));
        }
      }

      // Out of fuel and stopped
      if (g.fuel <= 0 && b.speed <= 0.1) {
        g.running = false;
        setHighScore((h) => Math.max(h, g.distance));
        setScreen("over");
        return;
      }

      // Draw
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, "#0a0a2e");
      skyGrad.addColorStop(1, "#0a0a1a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 173.7 + g.cameraX * 0.05) % (W + 40)) - 20;
        const sy = (i * 67.3) % 150;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(g.frame * 0.02 + i) * 0.2})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Mountains (parallax)
      ctx.fillStyle = "#0f0f2a";
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i <= W; i += 40) {
        const mx = i + g.cameraX * 0.1;
        const my = 140 + Math.sin(mx * 0.005) * 40 + Math.cos(mx * 0.003) * 30;
        ctx.lineTo(i, my);
      }
      ctx.lineTo(W, H);
      ctx.fill();

      // Terrain
      ctx.fillStyle = "#1a1a3a";
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (const p of g.terrain) {
        const sx = p.x - g.cameraX;
        if (sx < -50 || sx > W + 50) continue;
        ctx.lineTo(sx, p.y);
      }
      ctx.lineTo(W, H);
      ctx.fill();

      // Terrain outline
      ctx.strokeStyle = "#2a2a5a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (const p of g.terrain) {
        const sx = p.x - g.cameraX;
        if (sx < -50 || sx > W + 50) continue;
        if (!started) { ctx.moveTo(sx, p.y); started = true; }
        else ctx.lineTo(sx, p.y);
      }
      ctx.stroke();

      // Coins
      for (const c of g.coinList) {
        if (c.collected) continue;
        const sx = c.x - g.cameraX;
        if (sx < -20 || sx > W + 20) continue;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(sx, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b8860b";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("$", sx, c.y + 3);
      }

      // Fuel pickups
      for (const f of g.fuelPickups) {
        if (f.collected) continue;
        const sx = f.x - g.cameraX;
        if (sx < -20 || sx > W + 20) continue;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(sx - 6, f.y - 8, 12, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("F", sx, f.y + 3);
      }

      // Bike
      ctx.save();
      const bsx = b.x - g.cameraX;
      ctx.translate(bsx, b.y);
      const drawAngle = b.flipping ? b.flipAngle : b.angle;
      ctx.rotate(drawAngle);

      // Wheels
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(-14, 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(14, 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-14, 8, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(14, 8, 10, 0, Math.PI * 2);
      ctx.stroke();

      // Spokes
      const spokeAngle = g.frame * b.speed * 0.1;
      for (let i = 0; i < 4; i++) {
        const a = spokeAngle + (i * Math.PI) / 2;
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-14, 8);
        ctx.lineTo(-14 + Math.cos(a) * 8, 8 + Math.sin(a) * 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(14, 8);
        ctx.lineTo(14 + Math.cos(a) * 8, 8 + Math.sin(a) * 8);
        ctx.stroke();
      }

      // Frame
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(0, -6);
      ctx.lineTo(14, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-8, -6);
      ctx.stroke();

      // Handlebars
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 2);
      ctx.lineTo(16, -6);
      ctx.stroke();

      // Seat
      ctx.fillStyle = "#444";
      ctx.fillRect(-10, -9, 10, 4);

      // Rider
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-6, -20, 10, 12);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(-1, -24, 5, 0, Math.PI * 2);
      ctx.fill();

      // Exhaust
      if (b.speed > 1 && g.fuel > 0) {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(200,200,200,${0.3 - i * 0.1})`;
          ctx.beginPath();
          ctx.arc(-20 - i * 6 - Math.random() * 4, 6 + Math.random() * 4, 3 + i, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      // Speed lines
      if (b.speed > 4) {
        ctx.strokeStyle = `rgba(255,255,255,${(b.speed - 4) * 0.15})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const ly = 100 + i * 30 + (g.frame * 7 + i * 50) % 150;
          ctx.beginPath();
          ctx.moveTo(bsx - 40 - Math.random() * 20, ly);
          ctx.lineTo(bsx - 60 - b.speed * 5, ly);
          ctx.stroke();
        }
      }

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
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 8 }}>Bike Racing</h1>
        <p style={{ color: "#888", marginBottom: 8 }}>Race across procedural terrain!</p>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>Up/W = accelerate | Space = flip in air</p>
        {highScore > 0 && <p style={{ color: "#f59e0b", marginBottom: 16 }}>Best Distance: {highScore}m</p>}
        <button onClick={startGame} style={{ padding: "14px 48px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
          Ride!
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 38, color: "#ef4444", marginBottom: 10 }}>Wipeout!</h1>
        <div style={{ background: card, borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 36, fontWeight: 800, color: accent, margin: 0 }}>{distance}m</p>
          <p style={{ color: "#888", margin: "4px 0 12px" }}>DISTANCE</p>
          <p style={{ color: "#ffd700", fontSize: 18 }}>Coins: {coins}</p>
          {distance >= highScore && distance > 0 && <p style={{ color: "#f59e0b", fontWeight: 600, marginTop: 8 }}>New Record!</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>Retry</button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>Menu</button>
        </div>
      </div>
    );
  }

  const fuelColor = fuel <= 20 ? "#ef4444" : fuel <= 40 ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: W, marginBottom: 8 }}>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>DIST </span>
          <span style={{ color: accent, fontWeight: 700 }}>{distance}m</span>
        </div>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>COINS </span>
          <span style={{ color: "#ffd700", fontWeight: 700 }}>{coins}</span>
        </div>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#888", fontSize: 11 }}>FUEL</span>
          <div style={{ width: 60, height: 10, background: "#333", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${fuel}%`, height: "100%", background: fuelColor, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ background: card, borderRadius: 8, padding: "6px 14px" }}>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>{"♥".repeat(lives)}</span>
        </div>
      </div>
      <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, border: "2px solid #222" }} />
      <p style={{ color: "#555", fontSize: 12, marginTop: 8 }}>Up/W = accelerate | Space = flip in air</p>
    </div>
  );
}
