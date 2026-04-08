import { useRef, useEffect, useState, useCallback } from "react";

// ---- Audio helpers (Web Audio API) ----
function createAudioCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  actx: AudioContext | null,
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.12
) {
  if (!actx) return;
  try {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + dur);
  } catch {}
}

function sfxFlipper(actx: AudioContext | null) {
  playTone(actx, 220, 0.06, "square", 0.1);
}
function sfxBumper(actx: AudioContext | null) {
  playTone(actx, 660, 0.1, "sine", 0.15);
  playTone(actx, 880, 0.08, "sine", 0.1);
}
function sfxTarget(actx: AudioContext | null) {
  playTone(actx, 1200, 0.12, "triangle", 0.13);
}
function sfxDrain(actx: AudioContext | null) {
  playTone(actx, 120, 0.4, "sawtooth", 0.15);
}
function sfxLaunch(actx: AudioContext | null) {
  playTone(actx, 300, 0.15, "sawtooth", 0.08);
  setTimeout(() => playTone(actx, 500, 0.1, "square", 0.06), 80);
}
function sfxBonus(actx: AudioContext | null) {
  [0, 80, 160, 240, 320].forEach((d, i) =>
    setTimeout(() => playTone(actx, 600 + i * 200, 0.12, "sine", 0.12), d)
  );
}

// ---- Types ----
interface Vec2 {
  x: number;
  y: number;
}
interface Ball extends Vec2 {
  vx: number;
  vy: number;
  r: number;
}
interface Bumper extends Vec2 {
  r: number;
  flash: number;
}
interface Target {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  flash: number;
}
interface Trail {
  x: number;
  y: number;
  age: number;
}

// ---- Constants ----
const W = 300;
const H = 500;
const GRAVITY = 0.18;
const WALL_LEFT = 12;
const WALL_RIGHT = W - 12;
const WALL_TOP = 12;
const BALL_RADIUS = 6;
const FLIPPER_LEN = 55;
const FLIPPER_THICK = 8;
const FLIPPER_REST_ANGLE = 0.35; // radians down from horizontal
const FLIPPER_UP_ANGLE = -0.45; // radians up from horizontal
const FLIPPER_SPEED = 0.25; // angle change per frame
const SPRING_X = W - 20;
const SPRING_LANE_LEFT = W - 30;
const MAX_LAUNCH_POWER = 16;
const LAUNCH_CHARGE_RATE = 0.28;
const BALL_SAVE_DURATION = 180; // frames (~3 seconds)
const DRAIN_Y = H - 15;
const TILT_FORCE = 1.2;

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [score, setScore] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("");

  // Mobile flipper state
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);

  const initGame = useCallback(() => {
    const bumpers: Bumper[] = [
      { x: 90, y: 140, r: 22, flash: 0 },
      { x: 210, y: 140, r: 22, flash: 0 },
      { x: 150, y: 200, r: 25, flash: 0 },
    ];

    const targets: Target[] = [
      { x: 55, y: 80, w: 28, h: 10, lit: false, flash: 0 },
      { x: 95, y: 65, w: 28, h: 10, lit: false, flash: 0 },
      { x: 135, y: 55, w: 28, h: 10, lit: false, flash: 0 },
      { x: 175, y: 65, w: 28, h: 10, lit: false, flash: 0 },
      { x: 215, y: 80, w: 28, h: 10, lit: false, flash: 0 },
    ];

    return {
      ball: { x: SPRING_X, y: H - 60, vx: 0, vy: 0, r: BALL_RADIUS } as Ball,
      bumpers,
      targets,
      leftFlipperAngle: FLIPPER_REST_ANGLE,
      rightFlipperAngle: FLIPPER_REST_ANGLE,
      score: 0,
      ballsRemaining: 3,
      launched: false,
      charging: false,
      chargePower: 0,
      ballSaveTimer: BALL_SAVE_DURATION, // ball save active at start of each ball
      gameOver: false,
      trails: [] as Trail[],
      keys: {} as Record<string, boolean>,
      mobileLeft: false,
      mobileRight: false,
      tiltOffset: { x: 0, y: 0 } as Vec2,
      tiltDecay: 0,
      frame: 0,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    if (!audioRef.current) {
      audioRef.current = createAudioCtx();
    }
    const actx = audioRef.current;

    let state = initGame();
    stateRef.current = state;
    let animId = 0;

    // ---- Helpers ----
    function resetBall(s: typeof state) {
      s.ball = { x: SPRING_X, y: H - 60, vx: 0, vy: 0, r: BALL_RADIUS };
      s.launched = false;
      s.charging = false;
      s.chargePower = 0;
      s.ballSaveTimer = BALL_SAVE_DURATION;
      s.trails = [];
    }

    function flipperActive(side: "left" | "right"): boolean {
      if (side === "left") {
        return !!(state.keys["KeyZ"] || state.keys["ArrowLeft"] || state.mobileLeft);
      }
      return !!(state.keys["Slash"] || state.keys["ArrowRight"] || state.mobileRight);
    }

    // Point on flipper segment for collision
    function flipperSegment(
      pivotX: number,
      pivotY: number,
      angle: number,
      side: "left" | "right"
    ): { x1: number; y1: number; x2: number; y2: number } {
      const dir = side === "left" ? 1 : -1;
      const cos = Math.cos(angle * dir);
      const sin = Math.sin(angle * dir);
      return {
        x1: pivotX,
        y1: pivotY,
        x2: pivotX + cos * FLIPPER_LEN * dir,
        y2: pivotY - sin * FLIPPER_LEN,
      };
    }

    // Distance from point to line segment
    function pointToSegmentDist(
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ): { dist: number; cx: number; cy: number } {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = x1 + t * dx;
      const cy = y1 + t * dy;
      const ddx = px - cx;
      const ddy = py - cy;
      return { dist: Math.sqrt(ddx * ddx + ddy * ddy), cx, cy };
    }

    // ---- Main loop ----
    function loop() {
      const s = state;
      s.frame++;

      // --- Update flipper angles ---
      const leftActive = flipperActive("left");
      const rightActive = flipperActive("right");
      const targetLeft = leftActive ? FLIPPER_UP_ANGLE : FLIPPER_REST_ANGLE;
      const targetRight = rightActive ? FLIPPER_UP_ANGLE : FLIPPER_REST_ANGLE;

      if (s.leftFlipperAngle < targetLeft) {
        s.leftFlipperAngle = Math.min(s.leftFlipperAngle + FLIPPER_SPEED, targetLeft);
      } else if (s.leftFlipperAngle > targetLeft) {
        s.leftFlipperAngle = Math.max(s.leftFlipperAngle - FLIPPER_SPEED, targetLeft);
      }
      if (s.rightFlipperAngle < targetRight) {
        s.rightFlipperAngle = Math.min(s.rightFlipperAngle + FLIPPER_SPEED, targetRight);
      } else if (s.rightFlipperAngle > targetRight) {
        s.rightFlipperAngle = Math.max(s.rightFlipperAngle - FLIPPER_SPEED, targetRight);
      }

      // --- Spring charging ---
      if (s.keys["Space"] && !s.launched && !s.gameOver) {
        s.charging = true;
        s.chargePower = Math.min(s.chargePower + LAUNCH_CHARGE_RATE, MAX_LAUNCH_POWER);
      }

      // --- Tilt decay ---
      if (s.tiltDecay > 0) {
        s.tiltDecay--;
        s.tiltOffset.x *= 0.9;
        s.tiltOffset.y *= 0.9;
      }

      // --- Ball physics ---
      if (s.launched && !s.gameOver) {
        const b = s.ball;

        // Gravity
        b.vy += GRAVITY;

        // Apply tilt
        b.vx += s.tiltOffset.x * 0.05;
        b.vy += s.tiltOffset.y * 0.05;

        // Cap speed
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > 14) {
          b.vx = (b.vx / speed) * 14;
          b.vy = (b.vy / speed) * 14;
        }

        b.x += b.vx;
        b.y += b.vy;

        // Trail
        s.trails.push({ x: b.x, y: b.y, age: 0 });
        if (s.trails.length > 20) s.trails.shift();

        // Wall collisions
        if (b.x - b.r < WALL_LEFT) {
          b.x = WALL_LEFT + b.r;
          b.vx = Math.abs(b.vx) * 0.75;
        }
        if (b.x + b.r > WALL_RIGHT) {
          b.x = WALL_RIGHT - b.r;
          b.vx = -Math.abs(b.vx) * 0.75;
        }
        if (b.y - b.r < WALL_TOP) {
          b.y = WALL_TOP + b.r;
          b.vy = Math.abs(b.vy) * 0.75;
        }

        // Flipper collision
        const flipPivotY = H - 55;
        const leftPivotX = 75;
        const rightPivotX = W - 75;
        const collisionRadius = b.r + FLIPPER_THICK / 2;

        // Left flipper
        const lSeg = flipperSegment(leftPivotX, flipPivotY, s.leftFlipperAngle, "left");
        const lRes = pointToSegmentDist(b.x, b.y, lSeg.x1, lSeg.y1, lSeg.x2, lSeg.y2);
        if (lRes.dist < collisionRadius) {
          const nx = (b.x - lRes.cx) / (lRes.dist || 1);
          const ny = (b.y - lRes.cy) / (lRes.dist || 1);
          b.x = lRes.cx + nx * (collisionRadius + 1);
          b.y = lRes.cy + ny * (collisionRadius + 1);
          const flipperBoost = leftActive ? 8 : 2;
          b.vx = nx * flipperBoost + (b.x - leftPivotX) * 0.08;
          b.vy = ny * flipperBoost - (leftActive ? 4 : 0);
          if (leftActive) sfxFlipper(actx);
        }

        // Right flipper
        const rSeg = flipperSegment(rightPivotX, flipPivotY, s.rightFlipperAngle, "right");
        const rRes = pointToSegmentDist(b.x, b.y, rSeg.x1, rSeg.y1, rSeg.x2, rSeg.y2);
        if (rRes.dist < collisionRadius) {
          const nx = (b.x - rRes.cx) / (rRes.dist || 1);
          const ny = (b.y - rRes.cy) / (rRes.dist || 1);
          b.x = rRes.cx + nx * (collisionRadius + 1);
          b.y = rRes.cy + ny * (collisionRadius + 1);
          const flipperBoost = rightActive ? 8 : 2;
          b.vx = nx * flipperBoost + (b.x - rightPivotX) * 0.08;
          b.vy = ny * flipperBoost - (rightActive ? 4 : 0);
          if (rightActive) sfxFlipper(actx);
        }

        // Bumper collision
        for (const bmp of s.bumpers) {
          const dx = b.x - bmp.x;
          const dy = b.y - bmp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < b.r + bmp.r) {
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            b.x = bmp.x + nx * (b.r + bmp.r + 2);
            b.y = bmp.y + ny * (b.r + bmp.r + 2);
            b.vx = nx * 6;
            b.vy = ny * 6;
            s.score += 100;
            bmp.flash = 12;
            sfxBumper(actx);
            setScore(s.score);
          }
        }

        // Target collision
        for (const tgt of s.targets) {
          if (tgt.lit) continue;
          if (
            b.x + b.r > tgt.x &&
            b.x - b.r < tgt.x + tgt.w &&
            b.y + b.r > tgt.y &&
            b.y - b.r < tgt.y + tgt.h
          ) {
            tgt.lit = true;
            tgt.flash = 20;
            s.score += 500;
            b.vy = Math.abs(b.vy) * 0.5 + 2; // bounce down slightly
            sfxTarget(actx);
            setScore(s.score);

            // Check all 5 lit bonus
            if (s.targets.every((t) => t.lit)) {
              s.score += 5000;
              setScore(s.score);
              setMessage("ALL TARGETS BONUS +5000!");
              sfxBonus(actx);
              setTimeout(() => setMessage(""), 2000);
              // Reset targets after bonus
              setTimeout(() => {
                for (const t of s.targets) {
                  t.lit = false;
                }
              }, 1500);
            }
          }
        }

        // Ball save timer
        if (s.ballSaveTimer > 0) s.ballSaveTimer--;

        // Drain detection
        if (b.y > DRAIN_Y + 30) {
          if (s.ballSaveTimer > 0) {
            // Ball save: return ball
            b.x = W / 2;
            b.y = H - 120;
            b.vx = (Math.random() - 0.5) * 2;
            b.vy = -5;
            s.ballSaveTimer = 0;
            setMessage("BALL SAVED!");
            setTimeout(() => setMessage(""), 1200);
          } else {
            sfxDrain(actx);
            s.ballsRemaining--;
            setBallsLeft(s.ballsRemaining);
            if (s.ballsRemaining <= 0) {
              s.gameOver = true;
              setGameOver(true);
            } else {
              resetBall(s);
              setMessage("Ball " + (4 - s.ballsRemaining) + " of 3");
              setTimeout(() => setMessage(""), 1500);
            }
          }
        }
      }

      // --- Decay flashes ---
      for (const bmp of s.bumpers) {
        if (bmp.flash > 0) bmp.flash--;
      }
      for (const tgt of s.targets) {
        if (tgt.flash > 0) tgt.flash--;
      }
      for (const tr of s.trails) {
        tr.age++;
      }

      // ============ DRAW ============
      ctx.clearRect(0, 0, W, H);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#0a0015");
      bgGrad.addColorStop(0.5, "#0d0020");
      bgGrad.addColorStop(1, "#05000d");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Neon border
      ctx.shadowColor = "#6f00ff";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, W - 16, H - 16);
      ctx.shadowBlur = 0;

      // Inner table guides (decorative angled walls)
      ctx.strokeStyle = "#7c3aed55";
      ctx.lineWidth = 2;
      // Left guide
      ctx.beginPath();
      ctx.moveTo(WALL_LEFT, H - 100);
      ctx.lineTo(55, H - 65);
      ctx.stroke();
      // Right guide
      ctx.beginPath();
      ctx.moveTo(WALL_RIGHT, H - 100);
      ctx.lineTo(W - 55, H - 65);
      ctx.stroke();

      // Spring lane separator
      ctx.strokeStyle = "#7c3aed88";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SPRING_LANE_LEFT, WALL_TOP);
      ctx.lineTo(SPRING_LANE_LEFT, H - 90);
      ctx.stroke();

      // --- Draw targets ---
      for (const tgt of s.targets) {
        const glowAmount = tgt.flash > 0 ? tgt.flash / 20 : 0;
        if (tgt.lit) {
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 10 + glowAmount * 8;
          ctx.fillStyle = `rgba(245, 158, 11, ${0.7 + glowAmount * 0.3})`;
        } else {
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 3;
          ctx.fillStyle = "#78350f";
        }
        ctx.fillRect(tgt.x, tgt.y, tgt.w, tgt.h);
        ctx.strokeStyle = tgt.lit ? "#fbbf24" : "#92400e";
        ctx.lineWidth = 1;
        ctx.strokeRect(tgt.x, tgt.y, tgt.w, tgt.h);
        ctx.shadowBlur = 0;
      }

      // --- Draw bumpers ---
      for (const bmp of s.bumpers) {
        const glow = bmp.flash > 0 ? bmp.flash / 12 : 0;
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2);

        // Outer glow
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 8 + glow * 20;

        // Fill
        const r = Math.floor(239 * (0.3 + glow * 0.7));
        ctx.fillStyle = `rgba(${r}, 68, 68, ${0.4 + glow * 0.6})`;
        ctx.fill();

        // Ring
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + glow * 0.4})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, bmp.r * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(252, 165, 165, ${0.3 + glow * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Score label
        ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.5})`;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("100", bmp.x, bmp.y);

        ctx.shadowBlur = 0;
      }

      // --- Draw flippers ---
      const flipPivotY = H - 55;
      const leftPivotX = 75;
      const rightPivotX = W - 75;

      // Left flipper
      ctx.save();
      ctx.translate(leftPivotX, flipPivotY);
      ctx.rotate(-s.leftFlipperAngle);
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = leftActive ? 12 : 4;
      const lgrd = ctx.createLinearGradient(0, 0, FLIPPER_LEN, 0);
      lgrd.addColorStop(0, "#2563eb");
      lgrd.addColorStop(1, "#60a5fa");
      ctx.fillStyle = lgrd;
      ctx.beginPath();
      ctx.moveTo(-4, -FLIPPER_THICK / 2);
      ctx.lineTo(FLIPPER_LEN, -3);
      ctx.lineTo(FLIPPER_LEN, 3);
      ctx.lineTo(-4, FLIPPER_THICK / 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pivot dot
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#93c5fd";
      ctx.fill();
      ctx.restore();

      // Right flipper
      ctx.save();
      ctx.translate(rightPivotX, flipPivotY);
      ctx.rotate(s.rightFlipperAngle);
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = rightActive ? 12 : 4;
      const rgrd = ctx.createLinearGradient(0, 0, -FLIPPER_LEN, 0);
      rgrd.addColorStop(0, "#2563eb");
      rgrd.addColorStop(1, "#60a5fa");
      ctx.fillStyle = rgrd;
      ctx.beginPath();
      ctx.moveTo(4, -FLIPPER_THICK / 2);
      ctx.lineTo(-FLIPPER_LEN, -3);
      ctx.lineTo(-FLIPPER_LEN, 3);
      ctx.lineTo(4, FLIPPER_THICK / 2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pivot dot
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#93c5fd";
      ctx.fill();
      ctx.restore();

      // --- Draw drain gap (visual) ---
      ctx.fillStyle = "#1e002e";
      ctx.fillRect(leftPivotX + 25, DRAIN_Y, rightPivotX - leftPivotX - 50, 6);

      // --- Ball save indicator ---
      if (s.ballSaveTimer > 0 && s.launched) {
        const alpha = s.ballSaveTimer > 60 ? 0.8 : (s.ballSaveTimer / 60) * 0.8;
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.fillRect(leftPivotX + 25, DRAIN_Y, rightPivotX - leftPivotX - 50, 3);
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 6;
        ctx.fillRect(leftPivotX + 25, DRAIN_Y, rightPivotX - leftPivotX - 50, 3);
        ctx.shadowBlur = 0;
      }

      // --- Draw spring ---
      if (!s.launched) {
        const springTop = H - 60 - s.chargePower * 1.5;
        const springBottom = H - 30;
        const springSegments = 8;
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#a855f7";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        for (let i = 0; i <= springSegments; i++) {
          const t = i / springSegments;
          const y = springTop + t * (springBottom - springTop);
          const x = SPRING_X + (i % 2 === 0 ? -5 : 5);
          if (i === 0) ctx.moveTo(SPRING_X, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Charge bar
        if (s.charging) {
          const barH = (s.chargePower / MAX_LAUNCH_POWER) * 40;
          ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + (s.chargePower / MAX_LAUNCH_POWER) * 0.5})`;
          ctx.fillRect(SPRING_X - 3, springBottom - barH, 6, barH);
        }
      }

      // --- Draw ball trail ---
      for (let i = 0; i < s.trails.length; i++) {
        const tr = s.trails[i];
        const alpha = Math.max(0, 1 - tr.age / 20) * 0.4;
        const size = BALL_RADIUS * (1 - tr.age / 25);
        if (size > 0 && alpha > 0) {
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`;
          ctx.fill();
        }
      }

      // --- Draw ball ---
      if (!s.gameOver || s.frame % 30 < 20) {
        const b = s.ball;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.shadowColor = "#e0e7ff";
        ctx.shadowBlur = 10;
        const ballGrad = ctx.createRadialGradient(
          b.x - 2,
          b.y - 2,
          1,
          b.x,
          b.y,
          b.r
        );
        ballGrad.addColorStop(0, "#f8fafc");
        ballGrad.addColorStop(0.7, "#c7d2fe");
        ballGrad.addColorStop(1, "#818cf8");
        ctx.fillStyle = ballGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // --- HUD ---
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0a001588";
      ctx.fillRect(0, 0, W, 34);

      ctx.fillStyle = "#e0e7ff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${s.score}`, 16, 10);

      // Balls remaining indicators
      for (let i = 0; i < s.ballsRemaining; i++) {
        ctx.beginPath();
        ctx.arc(W - 20 - i * 16, 20, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#818cf8";
        ctx.fill();
      }

      // Ball save indicator text
      if (s.ballSaveTimer > 0 && s.launched) {
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BALL SAVE", W / 2, 24);
      }

      // Launch instruction
      if (!s.launched && !s.gameOver) {
        ctx.fillStyle = "#a78bfa";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const pulse = 0.5 + Math.sin(s.frame * 0.06) * 0.5;
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        ctx.fillText("HOLD SPACE", W / 2 - 15, H / 2);
        ctx.fillText("TO LAUNCH", W / 2 - 15, H / 2 + 16);
        ctx.globalAlpha = 1;
      }

      // Game over
      if (s.gameOver) {
        ctx.fillStyle = "rgba(10, 0, 20, 0.75)";
        ctx.fillRect(0, 0, W, H);
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#e0e7ff";
        ctx.font = "16px monospace";
        ctx.fillText(`SCORE: ${s.score}`, W / 2, H / 2 + 15);
        ctx.fillStyle = "#a78bfa";
        ctx.font = "12px monospace";
        ctx.fillText("PRESS ENTER TO RESTART", W / 2, H / 2 + 45);
      }

      animId = requestAnimationFrame(loop);
    }

    // ---- Input ----
    function onKeyDown(e: KeyboardEvent) {
      state.keys[e.code] = true;

      if (e.code === "Space") {
        e.preventDefault();
        // Resume audio context on user gesture
        if (actx && actx.state === "suspended") actx.resume();
      }

      // Tilt
      if (e.code === "KeyT" && state.launched) {
        state.tiltOffset.x += (Math.random() - 0.5) * TILT_FORCE * 2;
        state.tiltOffset.y += (Math.random() - 0.5) * TILT_FORCE;
        state.tiltDecay = 30;
      }

      // Flipper sound on first press
      if (e.code === "KeyZ" || e.code === "ArrowLeft") {
        sfxFlipper(actx);
      }
      if (e.code === "Slash" || e.code === "ArrowRight") {
        sfxFlipper(actx);
      }

      // Restart
      if (e.code === "Enter" && state.gameOver) {
        state = initGame();
        stateRef.current = state;
        setScore(0);
        setBallsLeft(3);
        setGameOver(false);
        setMessage("");
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      state.keys[e.code] = false;

      // Launch on space release
      if (e.code === "Space" && state.charging && !state.launched && !state.gameOver) {
        state.launched = true;
        state.ball.vy = -state.chargePower;
        state.ball.vx = (Math.random() - 0.5) * 1.5;
        state.charging = false;
        sfxLaunch(actx);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Device motion for tilt on mobile
    function onDeviceMotion(e: DeviceMotionEvent) {
      if (e.accelerationIncludingGravity && state.launched) {
        const ax = e.accelerationIncludingGravity.x || 0;
        const ay = e.accelerationIncludingGravity.y || 0;
        if (Math.abs(ax) > 8 || Math.abs(ay) > 12) {
          state.tiltOffset.x += ax * 0.05;
          state.tiltOffset.y += ay * 0.03;
          state.tiltDecay = 20;
        }
      }
    }
    window.addEventListener("devicemotion", onDeviceMotion);

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("devicemotion", onDeviceMotion);
    };
  }, [initGame]);

  // Mobile button handlers
  const handleMobileFlip = useCallback(
    (side: "left" | "right", pressed: boolean) => {
      if (!stateRef.current) return;
      if (!audioRef.current) audioRef.current = createAudioCtx();
      if (audioRef.current && audioRef.current.state === "suspended")
        audioRef.current.resume();

      if (side === "left") {
        stateRef.current.mobileLeft = pressed;
        setLeftPressed(pressed);
      } else {
        stateRef.current.mobileRight = pressed;
        setRightPressed(pressed);
      }
      if (pressed) sfxFlipper(audioRef.current);
    },
    []
  );

  const handleMobileLaunch = useCallback(() => {
    if (!stateRef.current) return;
    const s = stateRef.current;
    if (!audioRef.current) audioRef.current = createAudioCtx();
    if (audioRef.current && audioRef.current.state === "suspended")
      audioRef.current.resume();

    if (s.gameOver) {
      // Trigger restart via simulated Enter
      const evt = new KeyboardEvent("keydown", { code: "Enter" });
      window.dispatchEvent(evt);
      return;
    }
    if (!s.launched) {
      s.launched = true;
      s.ball.vy = -10 - Math.random() * 4;
      s.ball.vx = (Math.random() - 0.5) * 1.5;
      sfxLaunch(audioRef.current);
    }
  }, []);

  const handleMobileTilt = useCallback(() => {
    if (!stateRef.current || !stateRef.current.launched) return;
    stateRef.current.tiltOffset.x += (Math.random() - 0.5) * TILT_FORCE * 2;
    stateRef.current.tiltOffset.y += (Math.random() - 0.5) * TILT_FORCE;
    stateRef.current.tiltDecay = 30;
  }, []);

  const btnBase: React.CSSProperties = {
    border: "none",
    borderRadius: 8,
    color: "#e0e7ff",
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: 14,
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    padding: "12px 0",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 12,
        background: "#050008",
        borderRadius: 12,
        maxWidth: 340,
        margin: "0 auto",
      }}
    >
      {/* Score header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: 300,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            color: "#a78bfa",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          Z / Left: left flipper &nbsp; / / Right: right flipper
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: 300,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: "#a78bfa",
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          SPACE: charge &amp; launch &nbsp; T: tilt
        </span>
      </div>

      {/* Message overlay */}
      {message && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#fbbf24",
            fontFamily: "monospace",
            fontWeight: "bold",
            fontSize: 16,
            textShadow: "0 0 10px #f59e0b",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {message}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 8, display: "block" }}
      />

      {/* Mobile controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 10,
          width: 300,
        }}
      >
        <button
          style={{
            ...btnBase,
            flex: 1,
            background: leftPressed ? "#3b82f6" : "#1e1b4b",
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMobileFlip("left", true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMobileFlip("left", false);
          }}
          onMouseDown={() => handleMobileFlip("left", true)}
          onMouseUp={() => handleMobileFlip("left", false)}
          onMouseLeave={() => handleMobileFlip("left", false)}
        >
          LEFT
        </button>
        <button
          style={{
            ...btnBase,
            flex: 0.8,
            background: "#3b0764",
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMobileLaunch();
          }}
          onMouseDown={handleMobileLaunch}
        >
          {gameOver ? "RESTART" : "LAUNCH"}
        </button>
        <button
          style={{
            ...btnBase,
            flex: 0.5,
            background: "#4c1d95",
            fontSize: 12,
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMobileTilt();
          }}
          onMouseDown={handleMobileTilt}
        >
          TILT
        </button>
        <button
          style={{
            ...btnBase,
            flex: 1,
            background: rightPressed ? "#3b82f6" : "#1e1b4b",
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleMobileFlip("right", true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleMobileFlip("right", false);
          }}
          onMouseDown={() => handleMobileFlip("right", true)}
          onMouseUp={() => handleMobileFlip("right", false)}
          onMouseLeave={() => handleMobileFlip("right", false)}
        >
          RIGHT
        </button>
      </div>
    </div>
  );
}
