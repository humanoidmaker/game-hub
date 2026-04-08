import { useRef, useEffect, useState, useCallback } from "react";

interface Ball {
  x: number; y: number; vx: number; vy: number;
  rotation: number; active: boolean; landed: boolean; hit: boolean;
}

export default function PaperToss() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  const playSound = useCallback((type: "whoosh" | "crumple" | "miss") => {
    try {
      const ac = new AudioContext();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      if (type === "whoosh") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
        osc.start(); osc.stop(ac.currentTime + 0.25);
      } else if (type === "crumple") {
        osc.type = "square";
        osc.frequency.setValueAtTime(800, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
        osc.start(); osc.stop(ac.currentTime + 0.2);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
        osc.start(); osc.stop(ac.currentTime + 0.4);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 400;
    let anim = 0;

    let ball: Ball = { x: W / 2, y: H - 60, vx: 0, vy: 0, rotation: 0, active: false, landed: false, hit: false };
    let binX = W / 2, binY = 120, binW = 50, binH = 55;
    let currentWind = (Math.random() - 0.5) * 3;
    let dragStart: { x: number; y: number } | null = null;
    let dragEnd: { x: number; y: number } | null = null;
    let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    let message = "";
    let messageTimer = 0;
    let level = 1;
    let sc = 0, strk = 0, bestSc = 0;

    const resetBall = () => {
      ball = { x: W / 2, y: H - 60, vx: 0, vy: 0, rotation: 0, active: false, landed: false, hit: false };
      currentWind = (Math.random() - 0.5) * (2 + level * 0.5);
      binX = 80 + Math.random() * (W - 160);
      binY = 60 + Math.random() * 80 + Math.max(0, (level - 3) * 10);
    };

    const addParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 30 + Math.random() * 20, color });
      }
    };

    const drawBin = () => {
      ctx.fillStyle = "#4a4a5a";
      ctx.beginPath();
      ctx.moveTo(binX - binW / 2, binY);
      ctx.lineTo(binX - binW / 2 + 5, binY + binH);
      ctx.lineTo(binX + binW / 2 - 5, binY + binH);
      ctx.lineTo(binX + binW / 2, binY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6a6a7a";
      ctx.fillRect(binX - binW / 2 - 3, binY - 4, binW + 6, 8);
      ctx.fillStyle = "#888";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("TRASH", binX, binY + binH / 2 + 4);
    };

    const drawPaper = (x: number, y: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Paper ball
      ctx.fillStyle = "#f0f0e8";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Creases
      ctx.strokeStyle = "#ccc";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(2, -7);
      ctx.moveTo(-3, 4); ctx.lineTo(6, 1);
      ctx.moveTo(-1, -8); ctx.lineTo(3, 5);
      ctx.stroke();
      ctx.restore();
    };

    const drawWindIndicator = () => {
      const wx = W / 2, wy = H - 15;
      ctx.fillStyle = "#888";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Wind", wx, wy - 12);
      const arrowLen = Math.abs(currentWind) * 15;
      const dir = currentWind > 0 ? 1 : -1;
      ctx.strokeStyle = Math.abs(currentWind) > 2 ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx - arrowLen * dir, wy);
      ctx.lineTo(wx + arrowLen * dir, wy);
      ctx.lineTo(wx + arrowLen * dir - 5 * dir, wy - 4);
      ctx.moveTo(wx + arrowLen * dir, wy);
      ctx.lineTo(wx + arrowLen * dir - 5 * dir, wy + 4);
      ctx.stroke();
    };

    const drawTrajectoryHint = () => {
      if (!dragStart || !dragEnd || ball.active) return;
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const dx = dragStart.x - dragEnd.x;
      const dy = dragStart.y - dragEnd.y;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x + dx * 0.3, ball.y + dy * 0.3);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Floor
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, H - 30, W, 30);
      // Floor lines
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < W; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, H - 30); ctx.lineTo(i + 15, H); ctx.stroke();
      }

      drawBin();
      drawWindIndicator();
      drawTrajectoryHint();

      // Update ball
      if (ball.active && !ball.landed) {
        ball.vx += currentWind * 0.015;
        ball.vy += 0.25;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.rotation += ball.vx * 0.05;

        // Trail particles
        if (Math.random() > 0.5) {
          particles.push({ x: ball.x, y: ball.y, vx: (Math.random() - 0.5) * 1, vy: Math.random(), life: 10, color: "rgba(255,255,255,0.2)" });
        }

        // Bin collision
        const inBinX = ball.x > binX - binW / 2 + 5 && ball.x < binX + binW / 2 - 5;
        const atBinTop = ball.y > binY - 5 && ball.y < binY + 15;
        if (inBinX && atBinTop && ball.vy > 0) {
          ball.landed = true;
          ball.hit = true;
          strk++;
          const bonus = Math.min(strk, 5);
          sc += 10 * bonus;
          if (sc > bestSc) bestSc = sc;
          setScore(sc); setStreak(strk); setBest(bestSc);
          level = Math.floor(sc / 50) + 1;
          message = strk > 1 ? `+${10 * bonus} Streak x${strk}!` : "+10";
          messageTimer = 60;
          addParticles(ball.x, ball.y, "#22c55e", 15);
          playSound("crumple");
          setTimeout(resetBall, 1200);
        }

        // Floor or out of bounds
        if (ball.y > H - 30 || ball.x < -20 || ball.x > W + 20) {
          ball.landed = true;
          ball.hit = false;
          strk = 0;
          setStreak(0);
          message = "Miss!";
          messageTimer = 60;
          addParticles(ball.x, Math.min(ball.y, H - 30), "#ef4444", 8);
          playSound("miss");
          setTimeout(resetBall, 1000);
        }
      }

      drawPaper(ball.x, ball.y, ball.rotation);

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      }

      // Message
      if (messageTimer > 0) {
        messageTimer--;
        ctx.globalAlpha = messageTimer / 60;
        ctx.fillStyle = message.includes("Miss") ? "#ef4444" : "#22c55e";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(message, W / 2, H / 2);
        ctx.globalAlpha = 1;
      }

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${sc}`, 10, 25);
      ctx.fillStyle = "#f59e0b";
      ctx.font = "13px system-ui";
      ctx.fillText(`Streak: ${strk}`, 10, 45);
      ctx.fillStyle = "#888";
      ctx.textAlign = "right";
      ctx.font = "12px system-ui";
      ctx.fillText(`Best: ${bestSc}`, W - 10, 25);
      ctx.fillText(`Level: ${level}`, W - 10, 42);

      anim = requestAnimationFrame(loop);
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: (cx - rect.left) * (W / rect.width), y: (cy - rect.top) * (H / rect.height) };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (ball.active) return;
      dragStart = getPos(e);
      dragEnd = { ...dragStart };
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!dragStart || ball.active) return;
      dragEnd = getPos(e);
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!dragStart || !dragEnd || ball.active) return;
      const dx = dragStart.x - dragEnd.x;
      const dy = dragStart.y - dragEnd.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 15 && dy > 10) {
        const power = Math.min(dist * 0.12, 12);
        ball.vx = dx * 0.08;
        ball.vy = -power;
        ball.active = true;
        playSound("whoosh");
      }
      dragStart = null;
      dragEnd = null;
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });
    anim = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(anim);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, [playSound]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <h2 style={{ color: "#fff", margin: "0 0 4px", fontSize: 20 }}>Paper Toss</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Flick/swipe upward to toss paper into the bin</p>
      <canvas ref={canvasRef} width={400} height={400} style={{ borderRadius: 8, cursor: "grab", touchAction: "none" }} />
    </div>
  );
}
