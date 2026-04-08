"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ── helpers ──────────────────────────────────────────────────────
const W = 400, H = 350;
const GOAL_X = 80, GOAL_Y = 60, GOAL_W = 240, GOAL_H = 140;
const GK_W = 40, GK_H = 60;
const BALL_R = 10;

type Dir = "left" | "center" | "right";
type Phase =
  | "aim"        // player aiming
  | "charge"     // player holding power bar
  | "shoot"      // ball flying toward goal
  | "shootResult"
  | "botAim"     // bot about to shoot
  | "botShoot"   // ball flying at player
  | "botResult"
  | "over";

interface Shot { x: number; y: number }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function playTone(type: "kick" | "cheer" | "groan" | "whistle") {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const g = ac.createGain();
    g.connect(ac.destination);
    if (type === "kick") {
      const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = 200;
      o.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.15);
      g.gain.setValueAtTime(0.4, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.2);
      o.connect(g); o.start(); o.stop(ac.currentTime + 0.2);
    } else if (type === "cheer") {
      // white‑noise burst + rising tone
      const buf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3000; f.Q.value = 0.5;
      src.connect(f); f.connect(g);
      g.gain.setValueAtTime(0.3, ac.currentTime);
      g.gain.linearRampToValueAtTime(0.0, ac.currentTime + 0.6);
      src.start(); src.stop(ac.currentTime + 0.6);
      const o = ac.createOscillator(); o.type = "sine"; o.frequency.value = 500;
      o.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.4);
      const g2 = ac.createGain(); g2.connect(ac.destination);
      g2.gain.setValueAtTime(0.15, ac.currentTime);
      g2.gain.linearRampToValueAtTime(0.0, ac.currentTime + 0.5);
      o.connect(g2); o.start(); o.stop(ac.currentTime + 0.5);
    } else if (type === "groan") {
      const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = 180;
      o.frequency.linearRampToValueAtTime(100, ac.currentTime + 0.5);
      g.gain.setValueAtTime(0.12, ac.currentTime);
      g.gain.linearRampToValueAtTime(0.0, ac.currentTime + 0.5);
      o.connect(g); o.start(); o.stop(ac.currentTime + 0.5);
    } else {
      const o = ac.createOscillator(); o.type = "square"; o.frequency.value = 700;
      g.gain.setValueAtTime(0.2, ac.currentTime);
      g.gain.setValueAtTime(0.0, ac.currentTime + 0.12);
      g.gain.setValueAtTime(0.2, ac.currentTime + 0.2);
      g.gain.setValueAtTime(0.0, ac.currentTime + 0.45);
      o.connect(g); o.start(); o.stop(ac.currentTime + 0.5);
    }
  } catch { /* ignore if audio unavailable */ }
}

function randomDir(): Dir {
  const r = Math.random();
  return r < 0.33 ? "left" : r < 0.66 ? "center" : "right";
}

// ── component ────────────────────────────────────────────────────
export default function PenaltyShootout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // game state refs (avoid stale closure issues in animation loop)
  const [, forceRender] = useState(0);
  const rerender = useCallback(() => forceRender(c => c + 1), []);

  const state = useRef({
    phase: "aim" as Phase,
    round: 1,         // 1‑based, each round = player shoot + bot shoot
    playerScore: 0,
    botScore: 0,
    maxRounds: 5,
    suddenDeath: false,

    // aiming
    aimX: GOAL_X + GOAL_W / 2,
    aimY: GOAL_Y + GOAL_H / 2,

    // power bar
    power: 0,          // 0‑1
    charging: false,

    // ball animation
    ballX: W / 2,
    ballY: H - 40,
    ballTargetX: 0,
    ballTargetY: 0,
    ballT: 0,          // 0‑1 animation progress
    ballStartX: 0,
    ballStartY: 0,

    // goalkeeper
    gkX: GOAL_X + GOAL_W / 2 - GK_W / 2,
    gkY: GOAL_Y + GOAL_H - GK_H - 4,
    gkTargetX: 0,
    gkDiveDir: "center" as Dir,
    gkDiving: false,

    // bot shoot phase
    botShotTarget: { x: 0, y: 0 } as Shot,
    playerDiveDir: null as Dir | null,

    // result message
    msg: "",
    msgColor: "#fff",
  });

  const s = state.current;

  // ── drawing ──────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const g = s;

    // clear
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);

    // pitch
    ctx.fillStyle = "#1a5c2a";
    ctx.fillRect(0, H * 0.35, W, H * 0.65);
    // pitch lines
    ctx.strokeStyle = "#2d8a4e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.35); ctx.lineTo(W, H * 0.35);
    ctx.stroke();
    // penalty area trapezoid (perspective)
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, H); ctx.lineTo(GOAL_X - 10, GOAL_Y + GOAL_H + 10);
    ctx.lineTo(GOAL_X + GOAL_W + 10, GOAL_Y + GOAL_H + 10);
    ctx.lineTo(W - 40, H);
    ctx.stroke();

    // penalty spot
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(W / 2, H - 40, 3, 0, Math.PI * 2); ctx.fill();

    // ── goal frame ──
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(GOAL_X, GOAL_Y + GOAL_H);
    ctx.lineTo(GOAL_X, GOAL_Y);
    ctx.lineTo(GOAL_X + GOAL_W, GOAL_Y);
    ctx.lineTo(GOAL_X + GOAL_W, GOAL_Y + GOAL_H);
    ctx.stroke();

    // ── net ──
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.7;
    const netStep = 16;
    for (let x = GOAL_X + netStep; x < GOAL_X + GOAL_W; x += netStep) {
      ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_H); ctx.stroke();
    }
    for (let y = GOAL_Y + netStep; y < GOAL_Y + GOAL_H; y += netStep) {
      ctx.beginPath(); ctx.moveTo(GOAL_X, y); ctx.lineTo(GOAL_X + GOAL_W, y); ctx.stroke();
    }

    // ── goalkeeper ──
    const gx = g.gkX + GK_W / 2;
    const gy = g.gkY + GK_H;
    // body
    ctx.fillStyle = "#e7c438";
    ctx.fillRect(gx - 12, gy - GK_H, 24, 36);
    // head
    ctx.fillStyle = "#f5c6a0";
    ctx.beginPath(); ctx.arc(gx, gy - GK_H - 6, 10, 0, Math.PI * 2); ctx.fill();
    // shorts
    ctx.fillStyle = "#222";
    ctx.fillRect(gx - 12, gy - GK_H + 36, 24, 14);
    // legs
    ctx.fillStyle = "#f5c6a0";
    ctx.fillRect(gx - 10, gy - 10, 6, 12);
    ctx.fillRect(gx + 4, gy - 10, 6, 12);
    // arms (spread when diving)
    ctx.strokeStyle = "#f5c6a0";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    if (g.gkDiving && g.gkDiveDir === "left") {
      ctx.beginPath(); ctx.moveTo(gx - 12, gy - GK_H + 10); ctx.lineTo(gx - 32, gy - GK_H - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx + 12, gy - GK_H + 10); ctx.lineTo(gx - 8, gy - GK_H - 5); ctx.stroke();
    } else if (g.gkDiving && g.gkDiveDir === "right") {
      ctx.beginPath(); ctx.moveTo(gx + 12, gy - GK_H + 10); ctx.lineTo(gx + 32, gy - GK_H - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx - 12, gy - GK_H + 10); ctx.lineTo(gx + 8, gy - GK_H - 5); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(gx - 12, gy - GK_H + 10); ctx.lineTo(gx - 24, gy - GK_H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx + 12, gy - GK_H + 10); ctx.lineTo(gx + 24, gy - GK_H); ctx.stroke();
    }
    // gloves
    ctx.fillStyle = "#38d97c";
    if (g.gkDiving && g.gkDiveDir === "left") {
      ctx.beginPath(); ctx.arc(gx - 32, gy - GK_H - 10, 5, 0, Math.PI * 2); ctx.fill();
    } else if (g.gkDiving && g.gkDiveDir === "right") {
      ctx.beginPath(); ctx.arc(gx + 32, gy - GK_H - 10, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(gx - 24, gy - GK_H, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + 24, gy - GK_H, 5, 0, Math.PI * 2); ctx.fill();
    }

    // ── crosshair when aiming ──
    if (g.phase === "aim" || g.phase === "charge") {
      ctx.strokeStyle = "rgba(255,80,80,0.7)";
      ctx.lineWidth = 1.5;
      const cx = g.aimX, cy = g.aimY;
      ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
    }

    // ── ball ──
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(g.ballX, g.ballY, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(g.ballX, g.ballY, BALL_R, 0, Math.PI * 2); ctx.stroke();
    // ball pentagon pattern
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.arc(g.ballX, g.ballY, 4, 0, Math.PI * 2); ctx.fill();

    // ── power bar (during charge) ──
    if (g.phase === "charge" || (g.phase === "aim" && g.power > 0)) {
      const barW = 160, barH = 14;
      const bx = W / 2 - barW / 2, by = H - 18;
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, barW, barH);
      const pct = g.power;
      const col = pct < 0.5 ? "#38d97c" : pct < 0.8 ? "#eab308" : "#ef4444";
      ctx.fillStyle = col;
      ctx.fillRect(bx + 2, by + 2, (barW - 4) * pct, barH - 4);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("POWER", W / 2, by - 3);
    }

    // ── bot shoot: show direction buttons ──
    if (g.phase === "botAim") {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Bot is shooting! Pick a direction to dive:", W / 2, H / 2 - 50);
      // drawn via HTML overlay
    }

    // ── scoreboard ──
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, 30);
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(`You: ${g.playerScore}`, 12, 20);
    ctx.textAlign = "center";
    ctx.fillStyle = "#aaa";
    const roundLabel = g.suddenDeath ? "Sudden Death" : `Round ${g.round}/${g.maxRounds}`;
    ctx.fillText(roundLabel, W / 2, 20);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f87171";
    ctx.fillText(`Bot: ${g.botScore}`, W - 12, 20);

    // ── message ──
    if (g.msg) {
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = g.msgColor;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.strokeText(g.msg, W / 2, GOAL_Y + GOAL_H + 32);
      ctx.fillText(g.msg, W / 2, GOAL_Y + GOAL_H + 32);
    }

    // ── instruction ──
    if (g.phase === "aim") {
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("Click on goal to aim, then hold to charge power", W / 2, H - 4);
    }
  }, [s]);

  // ── animation loop ─────────────────────────────────────────────
  const loop = useCallback(() => {
    const g = s;

    // power charging
    if (g.charging && g.phase === "charge") {
      g.power = Math.min(1, g.power + 0.018);
    }

    // ball animation (player shoot)
    if (g.phase === "shoot") {
      g.ballT += 0.04;
      if (g.ballT >= 1) g.ballT = 1;
      const t = g.ballT;
      // arc: ball rises then falls toward target
      const midY = Math.min(g.ballStartY, g.ballTargetY) - 60 * g.power;
      g.ballX = g.ballStartX + (g.ballTargetX - g.ballStartX) * t;
      g.ballY = g.ballStartY + (g.ballTargetY - g.ballStartY) * t + (midY - g.ballStartY) * 4 * t * (1 - t) * -0.3;

      // trigger GK dive partway through
      if (t > 0.3 && !g.gkDiving) {
        g.gkDiving = true;
        g.gkDiveDir = randomDir();
        const diveOffset = g.gkDiveDir === "left" ? -60 : g.gkDiveDir === "right" ? 60 : 0;
        g.gkTargetX = clamp(GOAL_X + GOAL_W / 2 - GK_W / 2 + diveOffset, GOAL_X, GOAL_X + GOAL_W - GK_W);
      }
      if (g.gkDiving) {
        g.gkX += (g.gkTargetX - g.gkX) * 0.2;
      }

      if (t >= 1) {
        // determine goal or save
        const bx = g.ballTargetX, by = g.ballTargetY;
        const inGoal = bx > GOAL_X + BALL_R && bx < GOAL_X + GOAL_W - BALL_R && by > GOAL_Y + BALL_R && by < GOAL_Y + GOAL_H - BALL_R;
        // check if GK covers ball
        const gkCx = g.gkX + GK_W / 2, gkCy = g.gkY + GK_H / 2;
        const saved = Math.abs(bx - gkCx) < GK_W * 0.7 && Math.abs(by - gkCy) < GK_H * 0.7;

        if (inGoal && !saved) {
          g.playerScore++;
          g.msg = "GOAL!";
          g.msgColor = "#4ade80";
          playTone("cheer");
        } else if (!inGoal) {
          g.msg = "MISSED!";
          g.msgColor = "#f87171";
          playTone("groan");
        } else {
          g.msg = "SAVED!";
          g.msgColor = "#facc15";
          playTone("groan");
        }
        g.phase = "shootResult";
        rerender();
        setTimeout(() => {
          g.msg = "";
          g.phase = "botAim";
          g.playerDiveDir = null;
          resetBallAndGK();
          rerender();
        }, 1200);
      }
    }

    // ball animation (bot shoot)
    if (g.phase === "botShoot") {
      g.ballT += 0.05;
      if (g.ballT >= 1) g.ballT = 1;
      const t = g.ballT;
      g.ballX = g.ballStartX + (g.ballTargetX - g.ballStartX) * t;
      g.ballY = g.ballStartY + (g.ballTargetY - g.ballStartY) * t - 40 * t * (1 - t);

      // player GK dives
      if (g.playerDiveDir && t > 0.2) {
        const diveOffset = g.playerDiveDir === "left" ? -60 : g.playerDiveDir === "right" ? 60 : 0;
        const target = clamp(GOAL_X + GOAL_W / 2 - GK_W / 2 + diveOffset, GOAL_X, GOAL_X + GOAL_W - GK_W);
        g.gkX += (target - g.gkX) * 0.2;
        g.gkDiving = true;
        g.gkDiveDir = g.playerDiveDir;
      }

      if (t >= 1) {
        const bx = g.ballTargetX, by = g.ballTargetY;
        const inGoal = bx > GOAL_X + BALL_R && bx < GOAL_X + GOAL_W - BALL_R && by > GOAL_Y + BALL_R && by < GOAL_Y + GOAL_H - BALL_R;
        const gkCx = g.gkX + GK_W / 2, gkCy = g.gkY + GK_H / 2;
        const saved = g.playerDiveDir !== null && Math.abs(bx - gkCx) < GK_W * 0.7 && Math.abs(by - gkCy) < GK_H * 0.7;
        // bot misses 20% of the time (shoots wide)
        const botMissed = !inGoal;

        if (inGoal && !saved) {
          g.botScore++;
          g.msg = "Bot scores!";
          g.msgColor = "#f87171";
          playTone("groan");
        } else if (botMissed) {
          g.msg = "Bot missed!";
          g.msgColor = "#4ade80";
          playTone("cheer");
        } else {
          g.msg = "You saved it!";
          g.msgColor = "#4ade80";
          playTone("cheer");
        }
        g.phase = "botResult";
        rerender();

        setTimeout(() => {
          // check game end
          if (!g.suddenDeath && g.round >= g.maxRounds) {
            if (g.playerScore === g.botScore) {
              g.suddenDeath = true;
              g.msg = "Tied! Sudden death!";
              g.msgColor = "#facc15";
              playTone("whistle");
              rerender();
              setTimeout(() => {
                g.msg = "";
                g.round++;
                g.phase = "aim";
                resetBallAndGK();
                rerender();
              }, 1500);
            } else {
              g.phase = "over";
              g.msg = g.playerScore > g.botScore ? "You win!" : "Bot wins!";
              g.msgColor = g.playerScore > g.botScore ? "#4ade80" : "#f87171";
              playTone("whistle");
              rerender();
            }
          } else if (g.suddenDeath) {
            // in sudden death, after both shoot, check if scores differ
            if (g.playerScore !== g.botScore) {
              g.phase = "over";
              g.msg = g.playerScore > g.botScore ? "You win!" : "Bot wins!";
              g.msgColor = g.playerScore > g.botScore ? "#4ade80" : "#f87171";
              playTone("whistle");
              rerender();
            } else {
              g.msg = "";
              g.round++;
              g.phase = "aim";
              resetBallAndGK();
              rerender();
            }
          } else {
            g.msg = "";
            g.round++;
            g.phase = "aim";
            resetBallAndGK();
            rerender();
          }
        }, 1400);
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, rerender, s]);

  function resetBallAndGK() {
    s.ballX = W / 2;
    s.ballY = H - 40;
    s.ballT = 0;
    s.gkX = GOAL_X + GOAL_W / 2 - GK_W / 2;
    s.gkY = GOAL_Y + GOAL_H - GK_H - 4;
    s.gkDiving = false;
    s.gkDiveDir = "center";
    s.power = 0;
    s.charging = false;
  }

  function resetGame() {
    s.phase = "aim";
    s.round = 1;
    s.playerScore = 0;
    s.botScore = 0;
    s.suddenDeath = false;
    s.msg = "";
    s.aimX = GOAL_X + GOAL_W / 2;
    s.aimY = GOAL_Y + GOAL_H / 2;
    s.playerDiveDir = null;
    resetBallAndGK();
    rerender();
  }

  // ── canvas events ──────────────────────────────────────────────
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (s.phase !== "aim" && s.phase !== "charge") return;
    const { x, y } = getCanvasPos(e);
    s.aimX = clamp(x, GOAL_X + 10, GOAL_X + GOAL_W - 10);
    s.aimY = clamp(y, GOAL_Y + 10, GOAL_Y + GOAL_H - 10);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (s.phase !== "aim") return;
    const { x, y } = getCanvasPos(e);
    // only start charging if clicking within goal area
    if (x >= GOAL_X && x <= GOAL_X + GOAL_W && y >= GOAL_Y && y <= GOAL_Y + GOAL_H) {
      s.phase = "charge";
      s.charging = true;
      s.power = 0;
      rerender();
    }
  }

  function handleMouseUp() {
    if (s.phase !== "charge") return;
    s.charging = false;
    // shoot!
    playTone("kick");
    s.ballStartX = W / 2;
    s.ballStartY = H - 40;
    // power affects accuracy: high power = more random offset, also affects ball speed (handled by power value)
    const inaccuracy = s.power > 0.85 ? (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 10;
    s.ballTargetX = s.aimX + inaccuracy;
    s.ballTargetY = s.aimY + (s.power > 0.85 ? (Math.random() - 0.5) * 20 : 0);
    s.ballT = 0;
    s.phase = "shoot";
    rerender();
  }

  function handleDive(dir: Dir) {
    if (s.phase !== "botAim" || s.playerDiveDir !== null) return;
    s.playerDiveDir = dir;

    // bot picks a shot target
    const shotX = GOAL_X + 30 + Math.random() * (GOAL_W - 60);
    const shotY = GOAL_Y + 20 + Math.random() * (GOAL_H - 40);
    // 15% chance bot shoots wide
    const missChance = Math.random();
    if (missChance < 0.15) {
      s.botShotTarget = { x: Math.random() < 0.5 ? GOAL_X - 20 : GOAL_X + GOAL_W + 20, y: shotY };
    } else {
      s.botShotTarget = { x: shotX, y: shotY };
    }

    s.ballStartX = W / 2;
    s.ballStartY = GOAL_Y + GOAL_H + 60;
    s.ballTargetX = s.botShotTarget.x;
    s.ballTargetY = s.botShotTarget.y;
    s.ballX = s.ballStartX;
    s.ballY = s.ballStartY;
    s.ballT = 0;

    playTone("kick");
    s.phase = "botShoot";
    rerender();
  }

  // ── lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const phase = s.phase;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#111", borderRadius: 12, padding: 8, userSelect: "none" }}>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ borderRadius: 8, cursor: phase === "aim" || phase === "charge" ? "crosshair" : "default", display: "block" }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {/* Dive buttons overlay for bot-shoot phase */}
        {phase === "botAim" && (
          <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", borderRadius: 8 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 16, textAlign: "center" }}>
              Bot is shooting!<br />Pick a direction to dive:
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {(["left", "center", "right"] as Dir[]).map(dir => (
                <button
                  key={dir}
                  onClick={() => handleDive(dir)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "2px solid #fff",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                >
                  {dir === "left" ? "\u2B05 Left" : dir === "right" ? "Right \u27A1" : "\u2B06 Center"}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Game over overlay */}
        {phase === "over" && (
          <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", borderRadius: 8 }}>
            <div style={{ color: s.msgColor, fontWeight: 700, fontSize: 28, marginBottom: 8 }}>{s.msg}</div>
            <div style={{ color: "#ccc", fontSize: 16, marginBottom: 16 }}>
              {s.playerScore} &ndash; {s.botScore}
            </div>
            <button
              onClick={resetGame}
              style={{
                padding: "10px 32px",
                borderRadius: 8,
                border: "none",
                background: "#10b981",
                color: "#000",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
