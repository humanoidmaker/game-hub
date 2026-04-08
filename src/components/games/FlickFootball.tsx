import { useRef, useEffect, useState } from "react";

export default function FlickFootball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 400, H = 350;
    let anim = 0;

    interface Ball {
      x: number; y: number; z: number;
      vx: number; vy: number; vz: number;
      active: boolean; scored: boolean; missed: boolean;
    }

    interface Keeper {
      x: number; targetX: number;
      diving: boolean; diveDir: number;
      diveProgress: number;
    }

    const s = {
      ball: { x: W / 2, y: H - 60, z: 0, vx: 0, vy: 0, vz: 0, active: false, scored: false, missed: false } as Ball,
      keeper: { x: W / 2, targetX: W / 2, diving: false, diveDir: 0, diveProgress: 0 } as Keeper,
      score: 0,
      shotsLeft: 10,
      totalShots: 0,
      wind: 0,
      phase: "ready" as "ready" | "flying" | "result" | "gameover",
      resultTimer: 0,
      dragStart: null as { x: number; y: number } | null,
      dragEnd: null as { x: number; y: number } | null,
      particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    };

    const goalLeft = 100, goalRight = 300, goalTop = 60, goalBottom = 170;
    const goalWidth = goalRight - goalLeft;
    const goalCenterX = (goalLeft + goalRight) / 2;

    const resetBall = () => {
      s.ball = { x: W / 2, y: H - 60, z: 0, vx: 0, vy: 0, vz: 0, active: false, scored: false, missed: false };
      s.keeper = { x: goalCenterX, targetX: goalCenterX, diving: false, diveDir: 0, diveProgress: 0 };
      s.phase = "ready";
      s.wind = (Math.random() - 0.5) * 1.5;
      s.dragStart = null;
      s.dragEnd = null;
    };

    const spawnGoalParticles = () => {
      for (let i = 0; i < 20; i++) {
        s.particles.push({
          x: s.ball.x, y: s.ball.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 4 - 2,
          life: 40, color: "#22c55e",
        });
      }
    };

    const drawGoal = () => {
      // Net grid
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = goalLeft + (goalWidth / 10) * i;
        ctx.beginPath(); ctx.moveTo(x, goalTop); ctx.lineTo(x, goalBottom); ctx.stroke();
      }
      for (let i = 0; i <= 5; i++) {
        const y = goalTop + ((goalBottom - goalTop) / 5) * i;
        ctx.beginPath(); ctx.moveTo(goalLeft, y); ctx.lineTo(goalRight, y); ctx.stroke();
      }

      ctx.fillStyle = "rgba(50,50,80,0.3)";
      ctx.fillRect(goalLeft, goalTop, goalWidth, goalBottom - goalTop);

      // Frame
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalBottom);
      ctx.lineTo(goalLeft, goalTop);
      ctx.lineTo(goalRight, goalTop);
      ctx.lineTo(goalRight, goalBottom);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff33";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(goalLeft, goalTop + 3);
      ctx.lineTo(goalRight, goalTop + 3);
      ctx.stroke();
    };

    const drawKeeper = () => {
      const k = s.keeper;
      const kw = 30, kh = 50;
      let kx = k.x;
      let ky = goalBottom - kh;
      let armOffset = 0;

      if (k.diving) {
        kx += k.diveDir * k.diveProgress * 50;
        armOffset = k.diveDir * k.diveProgress * 20;
        ky -= Math.sin(k.diveProgress * Math.PI) * 15;
      }

      ctx.fillStyle = "#eab308";
      ctx.fillRect(kx - kw / 2, ky, kw, kh);

      ctx.beginPath();
      ctx.arc(kx, ky - 5, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#f5d0a9";
      ctx.fill();

      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(kx - kw / 2, ky + 15);
      ctx.lineTo(kx - kw / 2 - 15 + armOffset, ky + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kx + kw / 2, ky + 15);
      ctx.lineTo(kx + kw / 2 + 15 + armOffset, ky + 5);
      ctx.stroke();

      ctx.fillStyle = "#22c55e";
      ctx.beginPath(); ctx.arc(kx - kw / 2 - 15 + armOffset, ky + 5, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(kx + kw / 2 + 15 + armOffset, ky + 5, 6, 0, Math.PI * 2); ctx.fill();
    };

    const drawBall = () => {
      const b = s.ball;
      const scale = 1 + b.z * 0.01;
      const radius = 12 / scale;
      const screenY = b.y - b.z * 0.5;

      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 5, radius * 1.2, radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(b.x, screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(b.x, screenY, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawField = () => {
      const grad = ctx.createLinearGradient(0, goalBottom, 0, H);
      grad.addColorStop(0, "#0a3a0a");
      grad.addColorStop(1, "#0a2a0a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, goalBottom, W, H - goalBottom);

      ctx.strokeStyle = "#ffffff22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(W / 2, H - 30, 80, 30, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(W / 2, H - 60, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = () => {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, goalBottom);
      skyGrad.addColorStop(0, "#0a0a2a");
      skyGrad.addColorStop(1, "#0a1a1a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, goalBottom);

      drawField();
      drawGoal();

      // Wind indicator
      ctx.fillStyle = "#888";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      const windDir = s.wind > 0.1 ? ">>>" : s.wind < -0.1 ? "<<<" : "--";
      ctx.fillText(`Wind: ${windDir} ${Math.abs(s.wind).toFixed(1)}`, W / 2, 20);

      if (s.phase === "gameover") {
        ctx.fillStyle = "rgba(10,10,26,0.85)";
        ctx.fillRect(0, 40, W, H - 80);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px system-ui";
        ctx.fillText("Final Score", W / 2, H / 2 - 40);

        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 48px system-ui";
        ctx.fillText(`${s.score} / 10`, W / 2, H / 2 + 15);

        ctx.fillStyle = "#eab308";
        ctx.font = "16px system-ui";
        ctx.fillText(`Best: ${Math.max(s.score, best)}`, W / 2, H / 2 + 45);

        ctx.fillStyle = "#888";
        ctx.font = "14px system-ui";
        ctx.fillText("Click to play again", W / 2, H / 2 + 75);

        anim = requestAnimationFrame(loop);
        return;
      }

      drawKeeper();

      if (s.phase === "flying") {
        const b = s.ball;
        b.x += b.vx;
        b.y += b.vy;
        b.z += b.vz;
        b.vx += s.wind * 0.02;
        b.vz *= 0.98;

        if (!s.keeper.diving) {
          const timeToGoal = Math.abs((goalBottom - 30 - b.y) / (b.vy || -1));
          const predictedX = b.x + b.vx * timeToGoal;
          s.keeper.diveDir = predictedX > goalCenterX ? 1 : -1;
          s.keeper.diving = true;
          if (Math.random() < 0.35) s.keeper.diveDir *= -1;
        }

        if (s.keeper.diving) {
          s.keeper.diveProgress = Math.min(1, s.keeper.diveProgress + 0.04);
        }

        if (b.y <= goalBottom - 20 && !b.scored && !b.missed) {
          const kx = s.keeper.x + s.keeper.diveDir * s.keeper.diveProgress * 50;
          const keeperReach = 35;

          if (b.x >= goalLeft + 5 && b.x <= goalRight - 5 && b.y >= goalTop && b.y <= goalBottom) {
            if (Math.abs(b.x - kx) < keeperReach && b.y > goalTop + 10) {
              b.missed = true;
              b.vx *= -0.3;
              b.vy *= -0.5;
            } else {
              b.scored = true;
              s.score++;
              setScore(s.score);
              spawnGoalParticles();
            }
          } else if (b.y < goalTop - 10 || b.x < goalLeft - 20 || b.x > goalRight + 20) {
            b.missed = true;
          }
        }

        if (b.y < -50 || b.y > H + 50 || b.x < -50 || b.x > W + 50) {
          if (!b.scored) b.missed = true;
          s.phase = "result";
          s.resultTimer = 60;
          s.totalShots++;
          s.shotsLeft--;
          setShots(s.totalShots);
        }
      }

      if (s.phase === "result") {
        s.resultTimer--;
        const msg = s.ball.scored ? "GOAL!" : "MISS!";
        ctx.fillStyle = s.ball.scored ? "#22c55e" : "#ef4444";
        ctx.font = "bold 36px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(msg, W / 2, H / 2);

        if (s.resultTimer <= 0) {
          if (s.shotsLeft <= 0) {
            s.phase = "gameover";
            setBest(b => Math.max(b, s.score));
          } else {
            resetBall();
          }
        }
      }

      drawBall();

      // Drag line
      if (s.dragStart && s.dragEnd && s.phase === "ready") {
        ctx.strokeStyle = "#ffffff44";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(s.dragStart.x, s.dragStart.y);
        ctx.lineTo(s.dragEnd.x, s.dragEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const dx = s.dragStart.x - s.dragEnd.x;
        const dy = s.dragStart.y - s.dragEnd.y;
        const power = Math.min(100, Math.sqrt(dx * dx + dy * dy));
        ctx.fillStyle = power > 70 ? "#ef4444" : power > 40 ? "#eab308" : "#22c55e";
        ctx.font = "12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`Power: ${Math.floor(power)}%`, W / 2, H - 15);
      }

      // Particles
      s.particles = s.particles.filter(p => p.life > 0);
      for (const p of s.particles) {
        p.x += p.vx; p.y += p.vy; p.life--;
        p.vy += 0.05;
        ctx.globalAlpha = p.life / 40;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // HUD
      ctx.fillStyle = "rgba(10,10,26,0.6)";
      ctx.fillRect(0, H - 35, W, 35);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Goals: ${s.score}`, 10, H - 14);
      ctx.textAlign = "right";
      ctx.fillText(`Shots left: ${s.shotsLeft}`, W - 10, H - 14);

      anim = requestAnimationFrame(loop);
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = "touches" in e ? e.touches[0] || (e as TouchEvent).changedTouches[0] : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (s.phase === "gameover") {
        s.score = 0; s.shotsLeft = 10; s.totalShots = 0;
        setScore(0); setShots(0);
        resetBall();
        return;
      }
      if (s.phase !== "ready") return;
      s.dragStart = getPos(e);
      s.dragEnd = null;
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!s.dragStart || s.phase !== "ready") return;
      e.preventDefault();
      s.dragEnd = getPos(e);
    };

    const onUp = () => {
      if (!s.dragStart || !s.dragEnd || s.phase !== "ready") {
        s.dragStart = null;
        return;
      }
      const dx = s.dragStart.x - s.dragEnd.x;
      const dy = s.dragStart.y - s.dragEnd.y;
      const power = Math.min(15, Math.sqrt(dx * dx + dy * dy) * 0.1);

      if (power < 1) { s.dragStart = null; s.dragEnd = null; return; }

      const angle = Math.atan2(dy, dx);
      s.ball.vx = Math.cos(angle) * power;
      s.ball.vy = Math.sin(angle) * power * -0.7;
      s.ball.vz = power * 0.3;
      s.ball.active = true;
      s.phase = "flying";
      s.dragStart = null;
      s.dragEnd = null;
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp);

    resetBall();
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
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh" }}>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>
        Goals: {score}/{shots > 0 ? shots : 0} | Best: {best} | Swipe to kick!
      </p>
      <canvas ref={canvasRef} width={400} height={350} style={{ borderRadius: 12, cursor: "pointer", border: "1px solid #222", touchAction: "none" }} />
      <p style={{ color: "#555", marginTop: 8, fontSize: 11 }}>Click and drag to aim and shoot. Power = drag distance.</p>
    </div>
  );
}
