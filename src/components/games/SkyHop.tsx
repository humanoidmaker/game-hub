import { useRef, useEffect, useState } from "react";

export default function SkyHop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 300, H = 500;
    let anim = 0;
    const keys: Record<string, boolean> = {};

    type PlatType = "normal" | "moving" | "breaking" | "spring";
    interface Platform { x: number; y: number; w: number; type: PlatType; dx?: number; broken?: boolean; springBounce?: number; }

    let py = H - 100, vy = -8, px = W / 2;
    let platforms: Platform[] = [];
    let sc = 0, bestSc = 0, dead = false, maxY = py;
    let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    let bgStars: { x: number; y: number; s: number }[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() * 1.5
    }));

    const makePlatform = (y: number): Platform => {
      const r = Math.random();
      const x = Math.random() * (W - 60);
      if (sc > 3000 && r < 0.15) return { x, y, w: 55, type: "breaking" };
      if (sc > 1000 && r < 0.3) return { x, y, w: 55, type: "moving", dx: 1 + Math.random() * 1.5 };
      if (r < 0.1) return { x, y, w: 55, type: "spring" };
      return { x, y, w: 60, type: "normal" };
    };

    // Initial platforms
    for (let i = 0; i < 8; i++) {
      platforms.push({ x: Math.random() * (W - 60), y: H - i * 65 - 20, w: 60, type: "normal" });
    }

    const loop = () => {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0a0a1a");
      grad.addColorStop(1, "#0a0a2a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of bgStars) {
        ctx.fillStyle = `rgba(255,255,255,${s.s / 3})`;
        ctx.fillRect(s.x, s.y, s.s > 1 ? 2 : 1, s.s > 1 ? 2 : 1);
      }

      if (dead) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 24px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", W / 2, H / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "16px system-ui";
        ctx.fillText(`Score: ${sc}`, W / 2, H / 2 + 10);
        ctx.fillStyle = "#888";
        ctx.font = "13px system-ui";
        ctx.fillText(`Best: ${bestSc}`, W / 2, H / 2 + 32);
        ctx.fillText("Press Space to restart", W / 2, H / 2 + 55);
        anim = requestAnimationFrame(loop);
        return;
      }

      // Move
      if (keys["ArrowLeft"]) px -= 5;
      if (keys["ArrowRight"]) px += 5;
      px = (px + W) % W;

      vy += 0.32;
      py += vy;

      // Camera scroll
      if (py < H / 3) {
        const diff = H / 3 - py;
        py = H / 3;
        for (const p of platforms) p.y += diff;
        for (const s of bgStars) { s.y += diff * 0.1; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
        sc += Math.floor(diff);
        setScore(sc);
      }

      // Platform collision (only when falling)
      if (vy > 0) {
        for (const p of platforms) {
          if (p.broken) continue;
          if (py + 18 >= p.y && py + 18 <= p.y + 12 && px >= p.x - 10 && px <= p.x + p.w + 10) {
            if (p.type === "breaking") {
              p.broken = true;
              // Break particles
              for (let i = 0; i < 8; i++) {
                particles.push({ x: p.x + p.w / 2, y: p.y, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2, life: 20, color: "#f59e0b" });
              }
              continue;
            }
            if (p.type === "spring") {
              vy = -16;
              p.springBounce = 1;
            } else {
              vy = -10 - Math.min(sc / 2000, 3);
            }
            // Jump particles
            for (let i = 0; i < 3; i++) {
              particles.push({ x: px, y: py + 18, vx: (Math.random() - 0.5) * 3, vy: 1, life: 10, color: "#3b82f680" });
            }
          }
        }
      }

      // Fell off screen
      if (py > H + 50) {
        dead = true;
        if (sc > bestSc) { bestSc = sc; setBest(bestSc); }
      }

      // Update moving platforms
      for (const p of platforms) {
        if (p.type === "moving" && p.dx !== undefined) {
          p.x += p.dx;
          if (p.x <= 0 || p.x + p.w >= W) p.dx = -p.dx;
        }
        if (p.springBounce !== undefined && p.springBounce > 0) p.springBounce -= 0.1;
      }

      // Remove off-screen platforms and generate new
      for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].y > H + 30) {
          platforms.splice(i, 1);
        }
      }
      while (platforms.length < 8) {
        const topY = Math.min(...platforms.map(p => p.y));
        const gap = 50 + Math.random() * 30 + Math.min(sc / 500, 20);
        platforms.push(makePlatform(topY - gap));
      }

      // Draw platforms
      for (const p of platforms) {
        if (p.broken) continue;
        let color = "#3b82f6";
        if (p.type === "moving") color = "#f59e0b";
        else if (p.type === "breaking") color = "#ef4444";
        else if (p.type === "spring") color = "#22c55e";

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, 8, 4);
        ctx.fill();

        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = color;
        ctx.fillRect(p.x + 5, p.y + 1, p.w - 10, 3);
        ctx.shadowBlur = 0;

        if (p.type === "spring") {
          const bounce = p.springBounce || 0;
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(p.x + p.w / 2 - 4, p.y - 8 + bounce * 4, 8, 8);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(p.x + p.w / 2 - 6, p.y - 10 + bounce * 4, 12, 4);
        }

        if (p.type === "breaking") {
          ctx.strokeStyle = "#ff666640";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x + 10, p.y + 2); ctx.lineTo(p.x + p.w / 2, p.y + 6);
          ctx.moveTo(p.x + p.w - 10, p.y + 2); ctx.lineTo(p.x + p.w / 2, p.y + 6);
          ctx.stroke();
        }
      }

      // Player
      ctx.fillStyle = "#fff";
      // Body
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      // Face
      ctx.fillStyle = "#0a0a1a";
      ctx.beginPath();
      ctx.arc(px - 3, py - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 3, py - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.strokeStyle = "#0a0a1a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py + 1, 4, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Legs (dangling when falling, tucked when rising)
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      if (vy > 0) {
        ctx.beginPath();
        ctx.moveTo(px - 4, py + 10); ctx.lineTo(px - 6, py + 18);
        ctx.moveTo(px + 4, py + 10); ctx.lineTo(px + 6, py + 18);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(px - 4, py + 10); ctx.lineTo(px - 2, py + 16);
        ctx.moveTo(px + 4, py + 10); ctx.lineTo(px + 2, py + 16);
        ctx.stroke();
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`${sc}`, 10, 25);
      ctx.fillStyle = "#888";
      ctx.font = "11px system-ui";
      ctx.fillText(`Best: ${bestSc}`, 10, 42);

      // Height indicator
      ctx.fillStyle = "#3b82f640";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(sc / 100)}m`, W - 10, 20);

      anim = requestAnimationFrame(loop);
    };

    const onKey = (e: KeyboardEvent) => {
      keys[e.code] = true;
      e.preventDefault();
      if (e.code === "Space" && dead) {
        py = H - 100; vy = -8; px = W / 2;
        sc = 0; setScore(0); dead = false; maxY = py;
        platforms = [];
        particles = [];
        for (let i = 0; i < 8; i++) platforms.push({ x: Math.random() * (W - 60), y: H - i * 65 - 20, w: 60, type: "normal" });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

    // Touch controls
    let touchX = 0;
    const onTouch = (e: TouchEvent) => { touchX = e.touches[0].clientX; };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchX;
      touchX = e.touches[0].clientX;
      px += dx * 0.5;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("touchstart", onTouch, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    anim = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("touchstart", onTouch);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Sky Hop</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Arrow keys to move - jump higher and higher</p>
      <canvas ref={canvasRef} width={300} height={500} style={{ borderRadius: 8 }} />
    </div>
  );
}
