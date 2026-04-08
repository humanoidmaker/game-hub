"use client";
import { useRef, useEffect, useState, useCallback } from "react";

/* ─── types ─── */
interface Bird {
  x: number; y: number; vx: number; vy: number;
  r: number; active: boolean; landed: boolean;
  type: "red" | "blue" | "yellow";
  specialUsed: boolean;
}
interface Box {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number; hp: number;
}
interface Pig {
  x: number; y: number; r: number; alive: boolean;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; color: string; r: number;
}
interface Level {
  boxes: Omit<Box, "vx" | "vy">[];
  pigs: Omit<Pig, "alive">[];
}

/* ─── audio helper (Web Audio API) ─── */
const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playSound(type: "stretch" | "launch" | "impact" | "pop") {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.15, t);

  switch (type) {
    case "stretch":
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(330, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
      break;
    case "launch":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.15);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
      break;
    case "impact":
      osc.type = "square";
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(50, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
      break;
    case "pop":
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.05);
      osc.frequency.linearRampToValueAtTime(200, t + 0.15);
      gain.gain.linearRampToValueAtTime(0, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
      break;
  }
}

/* ─── level definitions ─── */
const LEVELS: Level[] = [
  { // Level 1 — simple tower
    boxes: [
      { x: 420, y: 0, w: 20, h: 60, hp: 2 },
      { x: 470, y: 0, w: 20, h: 60, hp: 2 },
      { x: 415, y: 0, w: 80, h: 15, hp: 2 },
    ],
    pigs: [{ x: 455, y: 0, r: 14 }],
  },
  { // Level 2 — double stack
    boxes: [
      { x: 390, y: 0, w: 20, h: 50, hp: 2 },
      { x: 450, y: 0, w: 20, h: 50, hp: 2 },
      { x: 385, y: 0, w: 90, h: 15, hp: 2 },
      { x: 410, y: 0, w: 20, h: 40, hp: 1 },
      { x: 440, y: 0, w: 20, h: 40, hp: 1 },
      { x: 405, y: 0, w: 60, h: 12, hp: 1 },
    ],
    pigs: [
      { x: 420, y: 0, r: 12 },
      { x: 430, y: 0, r: 10 },
    ],
  },
  { // Level 3 — fortress
    boxes: [
      { x: 360, y: 0, w: 18, h: 70, hp: 3 },
      { x: 500, y: 0, w: 18, h: 70, hp: 3 },
      { x: 355, y: 0, w: 168, h: 14, hp: 3 },
      { x: 400, y: 0, w: 18, h: 50, hp: 2 },
      { x: 460, y: 0, w: 18, h: 50, hp: 2 },
      { x: 395, y: 0, w: 88, h: 12, hp: 2 },
    ],
    pigs: [
      { x: 430, y: 0, r: 14 },
      { x: 430, y: 0, r: 12 },
      { x: 380, y: 0, r: 10 },
    ],
  },
  { // Level 4 — twin towers
    boxes: [
      { x: 340, y: 0, w: 16, h: 60, hp: 2 },
      { x: 390, y: 0, w: 16, h: 60, hp: 2 },
      { x: 335, y: 0, w: 76, h: 14, hp: 2 },
      { x: 470, y: 0, w: 16, h: 60, hp: 2 },
      { x: 520, y: 0, w: 16, h: 60, hp: 2 },
      { x: 465, y: 0, w: 76, h: 14, hp: 2 },
    ],
    pigs: [
      { x: 365, y: 0, r: 12 },
      { x: 495, y: 0, r: 12 },
      { x: 365, y: 0, r: 10 },
    ],
  },
  { // Level 5 — mega fortress
    boxes: [
      { x: 330, y: 0, w: 20, h: 80, hp: 3 },
      { x: 540, y: 0, w: 20, h: 80, hp: 3 },
      { x: 325, y: 0, w: 240, h: 16, hp: 3 },
      { x: 380, y: 0, w: 16, h: 50, hp: 2 },
      { x: 490, y: 0, w: 16, h: 50, hp: 2 },
      { x: 375, y: 0, w: 136, h: 14, hp: 2 },
      { x: 420, y: 0, w: 14, h: 35, hp: 1 },
      { x: 455, y: 0, w: 14, h: 35, hp: 1 },
      { x: 415, y: 0, w: 58, h: 12, hp: 1 },
    ],
    pigs: [
      { x: 435, y: 0, r: 14 },
      { x: 435, y: 0, r: 12 },
      { x: 400, y: 0, r: 10 },
      { x: 470, y: 0, r: 10 },
    ],
  },
];

/* ─── constants ─── */
const W = 600, H = 350;
const GROUND = H - 35;
const SLING_X = 90, SLING_Y = GROUND - 60;
const GRAVITY = 0.28;
const BIRD_TYPES: ("red" | "blue" | "yellow")[] = ["red", "blue", "yellow", "red", "yellow"];
const BIRD_COLORS: Record<string, string> = { red: "#dc2626", blue: "#3b82f6", yellow: "#eab308" };

export default function SlingShot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [stars, setStars] = useState(0);
  const [showLevelEnd, setShowLevelEnd] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  /* ─── build level structures on the ground ─── */
  const buildLevel = useCallback((lvl: number) => {
    const def = LEVELS[lvl - 1];
    // Stack boxes from ground up in definition order per column
    // We place them based on their heights stacking upward
    const boxes: Box[] = [];
    const colMap = new Map<number, number>(); // x → current top y

    for (const b of def.boxes) {
      const topOfCol = colMap.get(b.x) ?? GROUND;
      const y = topOfCol - b.h;
      boxes.push({ ...b, vx: 0, vy: 0, y });
      colMap.set(b.x, y);
    }

    // Place pigs on top of structures or on ground
    const pigs: Pig[] = [];
    const pigXGroups = new Map<number, number>(); // track pig stacking per x
    for (const p of def.pigs) {
      // Find the highest box surface near this pig's x
      let surface = GROUND;
      for (const bx of boxes) {
        if (p.x >= bx.x && p.x <= bx.x + bx.w) {
          surface = Math.min(surface, bx.y);
        }
      }
      // Check for boxes that form a platform over the pig x
      for (const bx of boxes) {
        if (p.x >= bx.x && p.x <= bx.x + bx.w && bx.h <= 16) {
          // It's a platform piece
          surface = Math.min(surface, bx.y);
        }
      }
      const prevCount = pigXGroups.get(p.x) ?? 0;
      const pigY = surface - p.r - (prevCount * (p.r * 2 + 4));
      pigXGroups.set(p.x, prevCount + 1);
      pigs.push({ ...p, y: pigY, alive: true });
    }

    return { boxes, pigs };
  }, []);

  /* ─── main game loop ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;

    const { boxes, pigs } = buildLevel(level);

    const makeBird = (idx: number): Bird => ({
      x: SLING_X, y: SLING_Y + 20,
      vx: 0, vy: 0, r: 13, active: false, landed: false,
      type: BIRD_TYPES[idx % BIRD_TYPES.length],
      specialUsed: false,
    });

    const state = {
      birds: BIRD_TYPES.map((_, i) => makeBird(i)),
      currentBird: 0,
      boxes,
      pigs,
      particles: [] as Particle[],
      aiming: false,
      aimX: SLING_X,
      aimY: SLING_Y + 20,
      score: 0,
      settled: false,
      settleTimer: 0,
      splitBirds: [] as Bird[], // for blue bird split
    };
    stateRef.current = state;

    const bird = () => state.birds[state.currentBird];

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        state.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 30 + Math.random() * 20,
          color,
          r: 2 + Math.random() * 3,
        });
      }
    };

    const advanceBird = () => {
      if (state.currentBird < state.birds.length - 1) {
        state.currentBird++;
        const b = bird();
        b.x = SLING_X; b.y = SLING_Y + 20;
        b.active = false; b.landed = false;
        state.aimX = SLING_X; state.aimY = SLING_Y + 20;
      }
      checkEnd();
    };

    const checkEnd = () => {
      const allDead = state.pigs.every(p => !p.alive);
      if (allDead) {
        const remaining = state.birds.length - state.currentBird;
        const s = remaining >= 3 ? 3 : remaining >= 1 ? 2 : 1;
        setStars(s);
        setShowLevelEnd(true);
        return;
      }
      const b = bird();
      if (state.currentBird >= state.birds.length - 1 && (b.landed || (!b.active && state.currentBird === state.birds.length - 1))) {
        // Check after a delay if the bird has stopped
        state.settleTimer = 90;
      }
    };

    /* ─── trajectory dots ─── */
    const drawTrajectory = (sx: number, sy: number, svx: number, svy: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      let tx = sx, ty = sy, tvx = svx, tvy = svy;
      for (let i = 0; i < 30; i++) {
        tvx *= 0.998; tvy += GRAVITY; tx += tvx; ty += tvy;
        if (ty > GROUND) break;
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(tx, ty, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    /* ─── draw helpers ─── */
    const drawBird = (b: Bird, alpha = 1) => {
      ctx.globalAlpha = alpha;
      const col = BIRD_COLORS[b.type];
      // Body
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      // Darker ring
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(b.x - 4, b.y - 3, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + 4, b.y - 3, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      // Pupils look in direction of velocity
      const lookX = b.active ? Math.sign(b.vx) * 1.5 : 1;
      ctx.beginPath(); ctx.arc(b.x - 4 + lookX, b.y - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + 4 + lookX, b.y - 3, 2, 0, Math.PI * 2); ctx.fill();
      // Eyebrows (angry)
      ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x - 8, b.y - 8); ctx.lineTo(b.x - 2, b.y - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x + 8, b.y - 8); ctx.lineTo(b.x + 2, b.y - 6); ctx.stroke();
      // Beak
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(b.x + b.r - 2, b.y + 1);
      ctx.lineTo(b.x + b.r + 7, b.y + 3);
      ctx.lineTo(b.x + b.r - 2, b.y + 6);
      ctx.closePath(); ctx.fill();
      // Tail feathers
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(b.x - b.r + 2, b.y - 4);
      ctx.lineTo(b.x - b.r - 8, b.y - 8);
      ctx.lineTo(b.x - b.r - 8, b.y + 2);
      ctx.lineTo(b.x - b.r + 2, b.y + 1);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    };

    const drawPig = (p: Pig) => {
      if (!p.alive) return;
      // Body
      ctx.fillStyle = "#22c55e";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#15803d"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(p.x - 4, p.y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + 4, p.y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + 5, p.y - 3, 1.8, 0, Math.PI * 2); ctx.fill();
      // Snout
      ctx.fillStyle = "#16a34a";
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#15803d"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 6, 4, 0, 0, Math.PI * 2); ctx.stroke();
      // Nostrils
      ctx.fillStyle = "#15803d";
      ctx.beginPath(); ctx.ellipse(p.x - 2, p.y + 4, 1.5, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 4, 1.5, 1, 0, 0, Math.PI * 2); ctx.fill();
    };

    const drawBox = (b: Box) => {
      const shade = b.hp >= 3 ? "#6b3a1f" : b.hp === 2 ? "#a0522d" : "#d2691e";
      ctx.fillStyle = shade;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "#4a2c12";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Wood grain lines
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 0.5;
      if (b.w > b.h) {
        for (let i = 3; i < b.h; i += 6) {
          ctx.beginPath(); ctx.moveTo(b.x + 2, b.y + i); ctx.lineTo(b.x + b.w - 2, b.y + i); ctx.stroke();
        }
      } else {
        for (let i = 5; i < b.h; i += 8) {
          ctx.beginPath(); ctx.moveTo(b.x + 2, b.y + i); ctx.lineTo(b.x + b.w - 2, b.y + i); ctx.stroke();
        }
      }
    };

    const drawSlingshot = () => {
      // Back fork
      ctx.fillStyle = "#5c3317";
      ctx.fillRect(SLING_X - 12, SLING_Y - 10, 6, 70);
      // Front fork
      ctx.fillStyle = "#6b3a1f";
      ctx.fillRect(SLING_X + 6, SLING_Y - 10, 6, 70);
      // Base
      ctx.fillStyle = "#4a2c12";
      ctx.fillRect(SLING_X - 14, SLING_Y + 55, 30, 10);
      // Fork tips
      ctx.fillStyle = "#5c3317";
      ctx.beginPath(); ctx.arc(SLING_X - 9, SLING_Y - 10, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6b3a1f";
      ctx.beginPath(); ctx.arc(SLING_X + 9, SLING_Y - 10, 4, 0, Math.PI * 2); ctx.fill();
    };

    const drawRubberBand = (bx: number, by: number, behind: boolean) => {
      ctx.strokeStyle = "#5c3317";
      ctx.lineWidth = 3;
      if (behind) {
        // Back band (behind bird)
        ctx.beginPath();
        ctx.moveTo(SLING_X - 9, SLING_Y - 8);
        ctx.lineTo(bx, by);
        ctx.stroke();
      } else {
        // Front band (in front of bird)
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(SLING_X + 9, SLING_Y - 8);
        ctx.stroke();
      }
    };

    /* ─── collision helpers ─── */
    const circleRect = (cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number) => {
      const nearX = Math.max(rx, Math.min(cx, rx + rw));
      const nearY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - nearX, dy = cy - nearY;
      return dx * dx + dy * dy < cr * cr;
    };

    const circleDist = (ax: number, ay: number, ar: number, bx: number, by: number, br: number) => {
      const dx = ax - bx, dy = ay - by;
      return Math.sqrt(dx * dx + dy * dy) < ar + br;
    };

    const processBirdPhysics = (b: Bird) => {
      if (!b.active || b.landed) return;
      b.vy += GRAVITY;
      b.x += b.vx;
      b.y += b.vy;

      // Ground collision
      if (b.y >= GROUND - b.r) {
        b.y = GROUND - b.r;
        b.vy *= -0.3;
        b.vx *= 0.7;
        if (Math.abs(b.vx) < 0.3 && Math.abs(b.vy) < 0.5) {
          b.landed = true;
          b.vx = 0; b.vy = 0;
        }
      }

      // Off screen
      if (b.x > W + 30 || b.x < -30) {
        b.landed = true;
      }

      // Box collisions
      for (const box of state.boxes) {
        if (box.hp <= 0) continue;
        if (circleRect(b.x, b.y, b.r, box.x, box.y, box.w, box.h)) {
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          const dmg = speed > 5 ? 2 : 1;
          box.hp -= dmg;
          // Push box
          box.vx += b.vx * 0.4;
          box.vy += b.vy * 0.2;
          b.vx *= 0.4;
          b.vy *= -0.3;
          playSound("impact");
          spawnParticles(b.x, b.y, "#d2691e", 6);
          if (box.hp <= 0) {
            state.score += 100;
            setScore(prev => prev + 100);
            spawnParticles(box.x + box.w / 2, box.y + box.h / 2, "#a0522d", 10);
          }
        }
      }

      // Pig collisions
      for (const pig of state.pigs) {
        if (!pig.alive) continue;
        if (circleDist(b.x, b.y, b.r, pig.x, pig.y, pig.r)) {
          pig.alive = false;
          state.score += 500;
          setScore(prev => prev + 500);
          playSound("pop");
          spawnParticles(pig.x, pig.y, "#22c55e", 12);
        }
      }
    };

    /* ─── main loop ─── */
    const loop = () => {
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND);
      skyGrad.addColorStop(0, "#60a5fa");
      skyGrad.addColorStop(1, "#93c5fd");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, GROUND);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (const cx of [120, 300, 480]) {
        ctx.beginPath(); ctx.arc(cx, 50, 20, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 20, 45, 16, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 15, 48, 14, 0, Math.PI * 2); ctx.fill();
      }

      // Ground
      ctx.fillStyle = "#65a30d";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      // Grass tufts
      ctx.strokeStyle = "#4d7c0f";
      ctx.lineWidth = 1.5;
      for (let gx = 5; gx < W; gx += 12) {
        const gh = 4 + Math.sin(gx * 0.3) * 3;
        ctx.beginPath();
        ctx.moveTo(gx, GROUND);
        ctx.quadraticCurveTo(gx - 2, GROUND - gh, gx - 1, GROUND - gh - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx, GROUND);
        ctx.quadraticCurveTo(gx + 2, GROUND - gh, gx + 3, GROUND - gh - 1);
        ctx.stroke();
      }

      // Ground line
      ctx.strokeStyle = "#4d7c0f";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();

      const b = bird();

      // ─── Physics updates ───
      if (b.active && !b.landed) {
        processBirdPhysics(b);
      }

      // Split birds physics
      for (const sb of state.splitBirds) {
        processBirdPhysics(sb);
      }
      state.splitBirds = state.splitBirds.filter(sb => !sb.landed);

      // Box physics (gravity + friction for knocked boxes)
      for (const box of state.boxes) {
        if (box.hp <= 0) continue;
        if (Math.abs(box.vx) > 0.1 || Math.abs(box.vy) > 0.1) {
          box.vy += GRAVITY * 0.5;
          box.x += box.vx;
          box.y += box.vy;
          box.vx *= 0.92;
          if (box.y + box.h > GROUND) {
            box.y = GROUND - box.h;
            box.vy = 0;
            box.vx *= 0.8;
          }
        }
      }

      // Box-falls-on-pig check
      for (const box of state.boxes) {
        if (box.hp <= 0) continue;
        for (const pig of state.pigs) {
          if (!pig.alive) continue;
          if (circleRect(pig.x, pig.y, pig.r, box.x, box.y, box.w, box.h)) {
            const boxSpeed = Math.abs(box.vx) + Math.abs(box.vy);
            if (boxSpeed > 1.5) {
              pig.alive = false;
              state.score += 500;
              setScore(prev => prev + 500);
              playSound("pop");
              spawnParticles(pig.x, pig.y, "#22c55e", 12);
            }
          }
        }
      }

      // Remove dead boxes
      state.boxes = state.boxes.filter(bx => bx.hp > 0);

      // Particle updates
      for (const p of state.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
      }
      state.particles = state.particles.filter(p => p.life > 0);

      // Settle timer for game over check
      if (state.settleTimer > 0) {
        state.settleTimer--;
        if (state.settleTimer === 0) {
          const allDead = state.pigs.every(p => !p.alive);
          if (!allDead && b.landed && state.currentBird >= state.birds.length - 1) {
            setShowGameOver(true);
          }
        }
      }

      // Auto-advance bird after landing
      if (b.active && b.landed && state.splitBirds.length === 0) {
        if (!state.settled) {
          state.settled = true;
          setTimeout(() => {
            if (state.pigs.every(p => !p.alive)) return; // already won
            state.settled = false;
            advanceBird();
          }, 800);
        }
      }

      // ─── Drawing ───

      // Draw back rubber band when aiming
      if (state.aiming) {
        drawRubberBand(state.aimX, state.aimY, true);
      } else if (!b.active) {
        drawRubberBand(b.x, b.y, true);
      }

      // Draw back slingshot fork
      ctx.fillStyle = "#5c3317";
      ctx.fillRect(SLING_X - 12, SLING_Y - 10, 6, 70);
      ctx.beginPath(); ctx.arc(SLING_X - 9, SLING_Y - 10, 4, 0, Math.PI * 2); ctx.fill();

      // Boxes
      for (const box of state.boxes) {
        drawBox(box);
      }

      // Pigs
      for (const pig of state.pigs) {
        drawPig(pig);
      }

      // Bird on sling or in flight
      if (!b.active && !b.landed) {
        // Bird sitting on sling
        if (state.aiming) {
          drawBird({ ...b, x: state.aimX, y: state.aimY });
        } else {
          drawBird(b);
        }
      } else {
        drawBird(b);
      }

      // Split birds
      for (const sb of state.splitBirds) {
        drawBird(sb, 0.9);
      }

      // Front rubber band when aiming
      if (state.aiming) {
        drawRubberBand(state.aimX, state.aimY, false);
      } else if (!b.active) {
        drawRubberBand(b.x, b.y, false);
      }

      // Front slingshot fork
      ctx.fillStyle = "#6b3a1f";
      ctx.fillRect(SLING_X + 6, SLING_Y - 10, 6, 70);
      ctx.beginPath(); ctx.arc(SLING_X + 9, SLING_Y - 10, 4, 0, Math.PI * 2); ctx.fill();
      // Base
      ctx.fillStyle = "#4a2c12";
      ctx.fillRect(SLING_X - 14, SLING_Y + 55, 30, 10);

      // Trajectory preview
      if (state.aiming) {
        const dx = SLING_X - state.aimX;
        const dy = SLING_Y - state.aimY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(dist * 0.1, 12);
        const angle = Math.atan2(dy, dx);
        const svx = Math.cos(angle) * power;
        const svy = Math.sin(angle) * power;
        drawTrajectory(SLING_X, SLING_Y, svx, svy);
      }

      // Particles
      for (const p of state.particles) {
        ctx.globalAlpha = p.life / 50;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Queued birds display (bottom left)
      const remaining = state.birds.length - state.currentBird - 1;
      for (let i = 0; i < remaining; i++) {
        const qb = state.birds[state.currentBird + 1 + i];
        const qx = 20 + i * 28;
        const qy = GROUND + 17;
        ctx.fillStyle = BIRD_COLORS[qb.type];
        ctx.beginPath(); ctx.arc(qx, qy, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(qx, qy, 9, 0, Math.PI * 2); ctx.stroke();
      }

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, 28);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`Level ${level}`, 10, 18);
      ctx.textAlign = "center";
      ctx.fillText(`Score: ${state.score}`, W / 2, 18);
      ctx.textAlign = "right";
      ctx.fillText(`Birds: ${remaining + 1}`, W - 10, 18);

      // Bird type hint
      if (!b.active && !b.landed) {
        const hints: Record<string, string> = {
          red: "Red: Normal",
          blue: "Blue: Tap to split x3",
          yellow: "Yellow: Tap for speed boost",
        };
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.font = "11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(hints[b.type], W / 2, H - 5);
      }

      animId = requestAnimationFrame(loop);
    };

    /* ─── input handlers ─── */
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      if ("touches" in e) {
        const t = e.touches[0] || e.changedTouches[0];
        return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
      }
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const b = bird();
      if (b.active || b.landed) {
        // Tap while bird is in flight → special ability
        if (b.active && !b.landed && !b.specialUsed) {
          b.specialUsed = true;
          if (b.type === "blue") {
            // Split into 3
            for (let i = -1; i <= 1; i++) {
              if (i === 0) continue;
              const sb: Bird = {
                x: b.x, y: b.y,
                vx: b.vx * 0.9, vy: b.vy + i * 3,
                r: 10, active: true, landed: false,
                type: "blue", specialUsed: true,
              };
              state.splitBirds.push(sb);
            }
          } else if (b.type === "yellow") {
            // Speed boost
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const angle = Math.atan2(b.vy, b.vx);
            const boosted = speed * 2;
            b.vx = Math.cos(angle) * boosted;
            b.vy = Math.sin(angle) * boosted;
            spawnParticles(b.x, b.y, "#eab308", 8);
          }
        }
        return;
      }
      const pos = getPos(e);
      const dx = pos.x - b.x, dy = pos.y - b.y;
      if (dx * dx + dy * dy < 900) {
        state.aiming = true;
        state.aimX = pos.x;
        state.aimY = pos.y;
        playSound("stretch");
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!state.aiming) return;
      const pos = getPos(e);
      // Limit pull distance
      const dx = pos.x - SLING_X, dy = pos.y - SLING_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxPull = 100;
      if (dist > maxPull) {
        state.aimX = SLING_X + (dx / dist) * maxPull;
        state.aimY = SLING_Y + (dy / dist) * maxPull;
      } else {
        state.aimX = pos.x;
        state.aimY = pos.y;
      }
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!state.aiming) return;
      state.aiming = false;

      const b = bird();
      const dx = SLING_X - state.aimX;
      const dy = SLING_Y - state.aimY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) {
        // Didn't pull far enough
        b.x = SLING_X; b.y = SLING_Y + 20;
        return;
      }

      const power = Math.min(dist * 0.1, 12);
      const angle = Math.atan2(dy, dx);
      b.vx = Math.cos(angle) * power;
      b.vy = Math.sin(angle) * power;
      b.x = SLING_X;
      b.y = SLING_Y;
      b.active = true;
      playSound("launch");
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, [level, buildLevel]);

  const nextLevel = () => {
    setShowLevelEnd(false);
    setShowGameOver(false);
    if (level < LEVELS.length) {
      setLevel(l => l + 1);
    } else {
      setLevel(1);
      setScore(0);
    }
  };

  const retryLevel = () => {
    setShowLevelEnd(false);
    setShowGameOver(false);
    setScore(0);
    setLevel(l => {
      // Force re-render by toggling
      return l;
    });
    // Trick: change level to force useEffect re-run
    setLevel(0);
    setTimeout(() => setLevel(level), 0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
      <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
        Drag bird back on slingshot to aim, release to launch. Tap in flight for special!
      </p>
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            borderRadius: 10,
            cursor: "crosshair",
            maxWidth: "100%",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        />

        {/* Level complete overlay */}
        {showLevelEnd && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", borderRadius: 10,
          }}>
            <div style={{
              background: "#1e293b", borderRadius: 16, padding: "24px 40px",
              textAlign: "center", border: "2px solid #334155",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {"★".repeat(stars)}{"☆".repeat(3 - stars)}
              </div>
              <p style={{ color: "#10b981", fontSize: 22, fontWeight: "bold", margin: "0 0 4px" }}>
                Level {level} Clear!
              </p>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 16px" }}>
                Score: {score}
              </p>
              <button
                onClick={nextLevel}
                style={{
                  background: "#2563eb", color: "#fff", border: "none",
                  borderRadius: 8, padding: "10px 28px", fontSize: 15,
                  fontWeight: "bold", cursor: "pointer",
                }}
              >
                {level < LEVELS.length ? "Next Level" : "Play Again"}
              </button>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {showGameOver && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", borderRadius: 10,
          }}>
            <div style={{
              background: "#1e293b", borderRadius: 16, padding: "24px 40px",
              textAlign: "center", border: "2px solid #334155",
            }}>
              <p style={{ color: "#ef4444", fontSize: 22, fontWeight: "bold", margin: "0 0 4px" }}>
                Out of Birds!
              </p>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 16px" }}>
                Score: {score}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={retryLevel}
                  style={{
                    background: "#dc2626", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 24px", fontSize: 15,
                    fontWeight: "bold", cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
