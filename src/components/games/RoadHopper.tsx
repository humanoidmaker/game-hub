import { useRef, useEffect, useState } from "react";

export default function RoadHopper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 400;
    let anim = 0;

    const CELL = 28;
    const ROWS = Math.floor(H / CELL);
    const COLS = Math.floor(W / CELL);

    let playerR = ROWS - 1, playerC = Math.floor(COLS / 2);
    let sc = 0, bestSc = 0, livesLeft = 3, dead = false, deadTimer = 0;
    let maxRow = ROWS - 1;

    type LaneType = "safe" | "road" | "river";
    interface Lane {
      type: LaneType;
      speed: number;
      items: { x: number; w: number; color: string }[];
    }

    // Generate lanes
    const generateLanes = (): Lane[] => {
      const lanes: Lane[] = [];
      for (let r = 0; r < ROWS + 10; r++) {
        if (r === 0 || r === ROWS - 1) {
          lanes.push({ type: "safe", speed: 0, items: [] });
        } else if (r <= 2) {
          // Home slots at top
          lanes.push({ type: "safe", speed: 0, items: [] });
        } else if (r % 5 === 0) {
          lanes.push({ type: "safe", speed: 0, items: [] });
        } else if (r < ROWS / 2) {
          // River
          const spd = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1);
          const items: { x: number; w: number; color: string }[] = [];
          let x = Math.random() * 50;
          while (x < W + 100) {
            const w = 50 + Math.random() * 40;
            items.push({ x, w, color: Math.random() > 0.3 ? "#5c4a2a" : "#2d5a3a" });
            x += w + 30 + Math.random() * 60;
          }
          lanes.push({ type: "river", speed: spd, items });
        } else {
          // Road
          const spd = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.5);
          const items: { x: number; w: number; color: string }[] = [];
          let x = Math.random() * 100;
          const colors = ["#ef4444", "#3b82f6", "#f59e0b", "#22c55e", "#8b5cf6"];
          while (x < W + 200) {
            const w = 30 + Math.random() * 20;
            items.push({ x, w, color: colors[Math.floor(Math.random() * colors.length)] });
            x += w + 60 + Math.random() * 100;
          }
          lanes.push({ type: "road", speed: spd, items });
        }
      }
      return lanes;
    };

    let lanes = generateLanes();
    let cameraY = 0;

    const respawn = () => {
      playerR = ROWS - 1;
      playerC = Math.floor(COLS / 2);
      maxRow = ROWS - 1;
      dead = false;
      deadTimer = 0;
      cameraY = 0;
    };

    const die = () => {
      dead = true;
      deadTimer = 60;
      livesLeft--;
      setLives(livesLeft);
      if (livesLeft <= 0) {
        if (sc > bestSc) { bestSc = sc; setBest(bestSc); }
      }
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Update items
      for (const lane of lanes) {
        for (const item of lane.items) {
          item.x += lane.speed;
          if (lane.speed > 0 && item.x > W + 50) item.x = -item.w - 20;
          if (lane.speed < 0 && item.x + item.w < -50) item.x = W + 20;
        }
      }

      // Draw lanes
      for (let r = 0; r < ROWS; r++) {
        const screenY = r * CELL - cameraY;
        if (screenY < -CELL || screenY > H + CELL) continue;
        const lane = lanes[r];

        // Lane background
        if (lane.type === "road") {
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, screenY, W, CELL);
          // Road dashes
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(0, screenY + CELL / 2);
          ctx.lineTo(W, screenY + CELL / 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (lane.type === "river") {
          ctx.fillStyle = "#0a2a4a";
          ctx.fillRect(0, screenY, W, CELL);
          // Water shimmer
          ctx.fillStyle = "rgba(59,130,246,0.1)";
          for (let wx = 0; wx < W; wx += 20) {
            ctx.fillRect(wx + Math.sin(Date.now() / 500 + wx) * 3, screenY + 5, 10, 2);
          }
        } else {
          ctx.fillStyle = r <= 2 ? "#1a2a1a" : "#0d1a0d";
          ctx.fillRect(0, screenY, W, CELL);
          if (r <= 2) {
            // Home slots
            for (let c = 2; c < COLS; c += 4) {
              ctx.strokeStyle = "#22c55e40";
              ctx.lineWidth = 1;
              ctx.strokeRect(c * CELL + 2, screenY + 2, CELL - 4, CELL - 4);
            }
          }
        }

        // Draw items (cars/logs)
        for (const item of lane.items) {
          if (item.x + item.w < 0 || item.x > W) continue;
          if (lane.type === "road") {
            // Car
            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, screenY + 4, item.w, CELL - 8);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.fillRect(item.x + 3, screenY + 6, 6, 4);
            ctx.fillRect(item.x + item.w - 9, screenY + 6, 6, 4);
            // Wheels
            ctx.fillStyle = "#111";
            ctx.fillRect(item.x + 4, screenY + 2, 6, 3);
            ctx.fillRect(item.x + 4, screenY + CELL - 5, 6, 3);
            ctx.fillRect(item.x + item.w - 10, screenY + 2, 6, 3);
            ctx.fillRect(item.x + item.w - 10, screenY + CELL - 5, 6, 3);
          } else if (lane.type === "river") {
            // Log/turtle
            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, screenY + 4, item.w, CELL - 8);
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 1;
            ctx.strokeRect(item.x, screenY + 4, item.w, CELL - 8);
            // Wood grain
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            for (let lx = item.x + 10; lx < item.x + item.w; lx += 15) {
              ctx.beginPath(); ctx.moveTo(lx, screenY + 6); ctx.lineTo(lx, screenY + CELL - 6); ctx.stroke();
            }
          }
        }
      }

      // Player
      if (!dead || deadTimer % 6 > 2) {
        const px = playerC * CELL + CELL / 2;
        const py = playerR * CELL - cameraY + CELL / 2;
        // Body
        ctx.fillStyle = dead ? "#ef4444" : "#22c55e";
        ctx.beginPath(); ctx.arc(px, py, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(px - 4, py - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 4, py - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(px - 4, py - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 4, py - 3, 1.5, 0, Math.PI * 2); ctx.fill();
      }

      // Dead timer
      if (dead) {
        deadTimer--;
        if (deadTimer <= 0) {
          if (livesLeft > 0) respawn();
          else {
            // Game over overlay
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 24px system-ui";
            ctx.textAlign = "center";
            ctx.fillText("GAME OVER", W / 2, H / 2 - 10);
            ctx.fillStyle = "#888";
            ctx.font = "14px system-ui";
            ctx.fillText(`Score: ${sc}`, W / 2, H / 2 + 15);
            ctx.fillText("Press Space to restart", W / 2, H / 2 + 35);
          }
        }
      }

      // Collision check (when alive)
      if (!dead) {
        const lane = lanes[playerR];
        const px = playerC * CELL;

        if (lane.type === "road") {
          for (const item of lane.items) {
            if (px + CELL > item.x + 4 && px < item.x + item.w - 4) {
              die(); break;
            }
          }
        } else if (lane.type === "river") {
          let onLog = false;
          for (const item of lane.items) {
            if (px + CELL / 2 > item.x && px + CELL / 2 < item.x + item.w) {
              onLog = true;
              // Move with log
              const newPx = playerC * CELL + lane.speed;
              playerC = Math.round(newPx / CELL);
              if (playerC < 0 || playerC >= COLS) die();
              break;
            }
          }
          if (!onLog && !dead) die();
        }
      }

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${sc}`, 10, 20);
      ctx.fillStyle = "#ef4444";
      ctx.fillText(`${"❤".repeat(livesLeft)}`, 10, 38);
      ctx.fillStyle = "#888";
      ctx.textAlign = "right";
      ctx.font = "12px system-ui";
      ctx.fillText(`Best: ${bestSc}`, W - 10, 20);

      anim = requestAnimationFrame(loop);
    };

    const move = (dr: number, dc: number) => {
      if (dead) {
        if (livesLeft <= 0) {
          sc = 0; setScore(0); livesLeft = 3; setLives(3);
          lanes = generateLanes();
          respawn();
        }
        return;
      }

      const nr = playerR + dr;
      const nc = playerC + dc;
      if (nc < 0 || nc >= COLS || nr < 0) return;

      playerR = nr;
      playerC = nc;

      if (dr < 0 && playerR < maxRow) {
        maxRow = playerR;
        sc++;
        setScore(sc);
        // Camera
        if (playerR * CELL - cameraY < H / 3) {
          cameraY = playerR * CELL - H / 3;
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") move(-1, 0);
      else if (e.code === "ArrowDown" || e.code === "KeyS") move(1, 0);
      else if (e.code === "ArrowLeft" || e.code === "KeyA") move(0, -1);
      else if (e.code === "ArrowRight" || e.code === "KeyD") move(0, 1);
    };

    canvas.addEventListener("click", () => move(-1, 0));
    window.addEventListener("keydown", onKey);
    anim = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(anim); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Road Hopper</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Arrow keys or tap to hop - cross roads and rivers</p>
      <canvas ref={canvasRef} width={400} height={400} style={{ borderRadius: 8, cursor: "pointer" }} />
    </div>
  );
}
