import { useRef, useEffect, useState } from "react";

export default function CrossyRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 400;
    const TILE = 28;
    const COLS = Math.floor(W / TILE);
    let anim = 0;

    interface Car { x: number; w: number; speed: number; color: string; }
    interface Log { x: number; w: number; speed: number; }
    interface Lane {
      type: "grass" | "road" | "water" | "safe";
      cars: Car[];
      logs: Log[];
      treeX: number[];
    }

    const carColors = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#ec4899"];

    const makeLane = (row: number): Lane => {
      if (row === 0) return { type: "safe", cars: [], logs: [], treeX: [] };
      if (row % 8 === 0) {
        const trees: number[] = [];
        for (let i = 0; i < 3; i++) trees.push(Math.floor(Math.random() * COLS) * TILE);
        return { type: "grass", cars: [], logs: [], treeX: trees };
      }

      const isWater = row % 5 === 0 || row % 7 === 0;
      if (isWater) {
        const logs: Log[] = [];
        const count = 2 + Math.floor(Math.random() * 2);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const spd = dir * (0.4 + Math.random() * 0.8);
        for (let i = 0; i < count; i++) {
          logs.push({ x: i * (W / count) + Math.random() * 40, w: 55 + Math.random() * 35, speed: spd });
        }
        return { type: "water", cars: [], logs, treeX: [] };
      }

      const cars: Car[] = [];
      const count = 2 + Math.floor(Math.random() * 2);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const spd = dir * (0.6 + Math.random() * 1.2 + row * 0.02);
      for (let i = 0; i < count; i++) {
        cars.push({
          x: i * (W / count) + Math.random() * 30,
          w: 30 + Math.random() * 20,
          speed: spd,
          color: carColors[Math.floor(Math.random() * carColors.length)],
        });
      }
      return { type: "road", cars, logs: [], treeX: [] };
    };

    let px = Math.floor(COLS / 2);
    let py = 0;
    let sc = 0;
    let dead = false;
    let started = false;
    let livesLeft = 3;
    let maxRow = 0;
    let hopAnim = 0;
    let hopDir = { dx: 0, dy: 0 };
    let invincible = 0;
    const lanes: Lane[] = [];

    for (let r = 0; r < 100; r++) lanes[r] = makeLane(r);

    const resetPlayer = () => {
      px = Math.floor(COLS / 2); py = 0; sc = 0; maxRow = 0;
      dead = false; livesLeft = 3; invincible = 0;
      setScore(0); setLives(3);
      lanes.length = 0;
      for (let r = 0; r < 100; r++) lanes[r] = makeLane(r);
    };

    const loseLife = () => {
      livesLeft--;
      setLives(livesLeft);
      if (livesLeft <= 0) {
        dead = true;
        setBest(b => Math.max(b, sc));
      } else {
        py = Math.max(0, py - 3);
        invincible = 90;
      }
    };

    const tryMove = (dx: number, dy: number) => {
      if (dead || !started || hopAnim > 0) return;
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || nx >= COLS) return;
      if (ny < 0) return;

      // Extend lanes if needed
      while (ny >= lanes.length) lanes.push(makeLane(lanes.length));

      px = nx;
      py = ny;
      hopAnim = 6;
      hopDir = { dx, dy };

      if (py > maxRow) {
        maxRow = py;
        sc = maxRow;
        setScore(sc);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (dead) { if (e.key === " " || e.key === "Enter") { resetPlayer(); started = true; } return; }
      if (!started) { started = true; }
      switch (e.key) {
        case "ArrowUp": case "w": case "W": tryMove(0, 1); break;
        case "ArrowDown": case "s": case "S": tryMove(0, -1); break;
        case "ArrowLeft": case "a": case "A": tryMove(-1, 0); break;
        case "ArrowRight": case "d": case "D": tryMove(1, 0); break;
      }
    };

    const onClick = () => {
      if (dead) { resetPlayer(); started = true; return; }
      if (!started) { started = true; return; }
      tryMove(0, 1);
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      if (!started) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Crossy Run", W / 2, H / 2 - 50);

        ctx.fillStyle = "#22c55e";
        ctx.font = "40px system-ui";
        ctx.fillText("\ud83d\udc14", W / 2, H / 2 + 10);

        ctx.fillStyle = "#888";
        ctx.font = "14px system-ui";
        ctx.fillText("Arrow keys / WASD to move", W / 2, H / 2 + 50);
        ctx.fillText("Click to hop forward", W / 2, H / 2 + 72);
        ctx.fillText("Cross roads & rivers. 3 lives!", W / 2, H / 2 + 94);

        anim = requestAnimationFrame(loop);
        return;
      }

      if (hopAnim > 0) hopAnim--;
      if (invincible > 0) invincible--;

      // Camera offset: player at row ~6 from bottom
      const camRow = py - 6;

      // Draw lanes
      const startRow = Math.max(0, camRow - 2);
      const endRow = camRow + Math.ceil(H / TILE) + 2;

      for (let r = startRow; r < endRow; r++) {
        while (r >= lanes.length) lanes.push(makeLane(lanes.length));
        const lane = lanes[r];
        const sy = H - (r - camRow) * TILE - TILE;

        // Lane background
        if (lane.type === "road") ctx.fillStyle = "#1a1a2e";
        else if (lane.type === "water") ctx.fillStyle = "#0c2d5b";
        else if (lane.type === "grass") ctx.fillStyle = "#0a2a0a";
        else ctx.fillStyle = "#0d1a0d";
        ctx.fillRect(0, sy, W, TILE);

        // Lane markings for road
        if (lane.type === "road") {
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(0, sy); ctx.lineTo(W, sy);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Water shimmer
        if (lane.type === "water") {
          const t = Date.now() / 1000;
          for (let wx = 0; wx < W; wx += 20) {
            ctx.fillStyle = `rgba(59,130,246,${0.1 + 0.05 * Math.sin(t * 2 + wx * 0.1 + r)})`;
            ctx.fillRect(wx, sy, 10, TILE);
          }
        }

        // Trees on grass
        if (lane.type === "grass") {
          for (const tx of lane.treeX) {
            ctx.fillStyle = "#1a4a1a";
            ctx.font = `${TILE - 4}px system-ui`;
            ctx.textAlign = "center";
            ctx.fillText("\ud83c\udf32", tx + TILE / 2, sy + TILE - 4);
          }
        }

        // Move and draw cars
        for (const car of lane.cars) {
          car.x += car.speed;
          if (car.x > W + car.w) car.x = -car.w;
          if (car.x < -car.w) car.x = W + car.w;

          ctx.fillStyle = car.color;
          const rx = car.x;
          ctx.beginPath();
          const cr = 4;
          ctx.roundRect(rx, sy + 3, car.w, TILE - 6, cr);
          ctx.fill();

          // Headlights
          ctx.fillStyle = "#eab308";
          if (car.speed > 0) {
            ctx.fillRect(rx + car.w - 3, sy + 6, 3, 4);
            ctx.fillRect(rx + car.w - 3, sy + TILE - 10, 3, 4);
          } else {
            ctx.fillRect(rx, sy + 6, 3, 4);
            ctx.fillRect(rx, sy + TILE - 10, 3, 4);
          }

          // Collision
          if (r === py && invincible <= 0) {
            const playerX = px * TILE;
            if (playerX + TILE > rx + 4 && playerX < rx + car.w - 4) {
              loseLife();
            }
          }
        }

        // Move and draw logs
        for (const log of lane.logs) {
          log.x += log.speed;
          if (log.x > W + log.w) log.x = -log.w;
          if (log.x < -log.w) log.x = W + log.w;

          ctx.fillStyle = "#8B4513";
          ctx.beginPath();
          ctx.roundRect(log.x, sy + 4, log.w, TILE - 8, 6);
          ctx.fill();
          ctx.fillStyle = "#A0522D";
          ctx.fillRect(log.x + 5, sy + 8, log.w - 10, 3);
          ctx.fillRect(log.x + 8, sy + TILE - 12, log.w - 16, 2);
        }

        // Water death check + log riding
        if (lane.type === "water" && r === py && invincible <= 0) {
          const playerX = px * TILE;
          let onLog = false;
          for (const log of lane.logs) {
            if (playerX + TILE > log.x + 5 && playerX < log.x + log.w - 5) {
              onLog = true;
              px += log.speed / TILE * 0.5;
              px = Math.max(0, Math.min(COLS - 1, Math.round(px)));
              break;
            }
          }
          if (!onLog) loseLife();
        }
      }

      // Draw player
      const playerScreenX = px * TILE;
      const playerScreenY = H - (py - camRow) * TILE - TILE;

      let offsetY = 0;
      if (hopAnim > 0) {
        offsetY = -Math.sin((hopAnim / 6) * Math.PI) * 8;
      }

      if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) {
        // Blink when invincible
      } else {
        ctx.save();
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 8;
        ctx.font = `${TILE - 2}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText("\ud83d\udc14", playerScreenX + TILE / 2, playerScreenY + TILE - 3 + offsetY);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // HUD
      ctx.fillStyle = "rgba(10,10,26,0.7)";
      ctx.fillRect(0, 0, W, 36);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("Score: " + sc, 10, 24);

      ctx.textAlign = "center";
      ctx.fillText("Best: " + Math.max(sc, best), W / 2, 24);

      ctx.textAlign = "right";
      ctx.fillStyle = "#ef4444";
      let heartsStr = "";
      for (let i = 0; i < livesLeft; i++) heartsStr += "\u2764\ufe0f ";
      ctx.font = "14px system-ui";
      ctx.fillText(heartsStr.trim(), W - 10, 24);

      // Game over overlay
      if (dead) {
        ctx.fillStyle = "rgba(10,10,26,0.85)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 30px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", W / 2, H / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px system-ui";
        ctx.fillText("Distance: " + sc, W / 2, H / 2);

        ctx.fillStyle = "#eab308";
        ctx.font = "16px system-ui";
        ctx.fillText("Best: " + Math.max(sc, best), W / 2, H / 2 + 30);

        ctx.fillStyle = "#888";
        ctx.font = "14px system-ui";
        ctx.fillText("Click or press Enter to retry", W / 2, H / 2 + 65);
      }

      anim = requestAnimationFrame(loop);
    };

    window.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onClick);
    anim = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>
        Lives: {lives} | Score: {score} | Best: {best}
      </p>
      <canvas ref={canvasRef} width={400} height={400} style={{ borderRadius: 12, cursor: "pointer", border: "1px solid #222" }} />
      <p style={{ color: "#555", marginTop: 8, fontSize: 11 }}>Arrow keys / WASD to move, Click to hop forward</p>
    </div>
  );
}
