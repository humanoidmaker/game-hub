"use client";
import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Constants ─── */
const W = 300, H = 500;
const LANE_LEFT = 60, LANE_RIGHT = 240, LANE_W = LANE_RIGHT - LANE_LEFT;
const GUTTER_W = 12;
const PIN_R = 7, BALL_R = 10;
const PIN_START_Y = 80;
const PIN_SPACING_X = 22, PIN_SPACING_Y = 20;
const BALL_START_Y = 460;
const BALL_SPEED = 4.5;
const MAX_FRAMES = 10;

/* ─── Pin triangle layout (row 0 = front, row 3 = back) ─── */
function pinPositions(): { x: number; y: number }[] {
  const cx = W / 2;
  const rows = [1, 2, 3, 4];
  const positions: { x: number; y: number }[] = [];
  for (let r = 0; r < rows.length; r++) {
    const count = rows[r];
    const y = PIN_START_Y + r * PIN_SPACING_Y;
    const startX = cx - ((count - 1) * PIN_SPACING_X) / 2;
    for (let c = 0; c < count; c++) {
      positions.push({ x: startX + c * PIN_SPACING_X, y });
    }
  }
  return positions;
}

const INITIAL_PINS = pinPositions();

interface Pin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  standing: boolean;
  fallAngle: number;
  opacity: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  curve: number;
}

interface FrameScore {
  rolls: number[];
  score: number | null;
}

/* ─── Sound generation ─── */
function playSound(type: "roll" | "strike" | "gutter") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "roll") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === "strike") {
      osc.type = "square";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.05);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      // Add noise-like crash
      const noise = ctx.createOscillator();
      const ng = ctx.createGain();
      noise.connect(ng);
      ng.connect(ctx.destination);
      noise.type = "sawtooth";
      noise.frequency.setValueAtTime(1200, ctx.currentTime);
      noise.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.25);
      ng.gain.setValueAtTime(0.12, ctx.currentTime);
      ng.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

/* ─── Standard bowling scoring ─── */
function calculateScores(frames: FrameScore[], allRolls: number[]): FrameScore[] {
  const result = frames.map(f => ({ ...f, score: null as number | null }));
  let rollIdx = 0;
  let cumulative = 0;

  for (let f = 0; f < result.length && f < 10; f++) {
    const fr = result[f];
    if (f < 9) {
      if (fr.rolls.length === 0) break;
      if (fr.rolls[0] === 10) {
        // Strike
        const next1 = allRolls[rollIdx + 1];
        const next2 = allRolls[rollIdx + 2];
        if (next1 !== undefined && next2 !== undefined) {
          cumulative += 10 + next1 + next2;
          fr.score = cumulative;
        }
        rollIdx += 1;
      } else if (fr.rolls.length >= 2) {
        const sum = fr.rolls[0] + fr.rolls[1];
        if (sum === 10) {
          // Spare
          const next1 = allRolls[rollIdx + 2];
          if (next1 !== undefined) {
            cumulative += 10 + next1;
            fr.score = cumulative;
          }
        } else {
          cumulative += sum;
          fr.score = cumulative;
        }
        rollIdx += 2;
      } else {
        break;
      }
    } else {
      // 10th frame
      if (fr.rolls.length >= 2) {
        const sum = fr.rolls[0] + fr.rolls[1];
        if (fr.rolls[0] === 10 || sum === 10) {
          if (fr.rolls.length >= 3) {
            cumulative += fr.rolls[0] + fr.rolls[1] + fr.rolls[2];
            fr.score = cumulative;
          }
        } else {
          cumulative += sum;
          fr.score = cumulative;
        }
      }
      rollIdx += fr.rolls.length;
    }
  }
  return result;
}

export default function Bowling() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Game state
  const [gamePhase, setGamePhase] = useState<"aim" | "power" | "rolling" | "settled" | "gameover">("aim");
  const [frameIdx, setFrameIdx] = useState(0);
  const [ballNum, setBallNum] = useState(0); // 0 = first ball, 1 = second, 2 = bonus in 10th
  const [frames, setFrames] = useState<FrameScore[]>(
    Array.from({ length: 10 }, () => ({ rolls: [], score: null }))
  );
  const [allRolls, setAllRolls] = useState<number[]>([]);
  const [message, setMessage] = useState("Click & drag to aim, hold to charge power");
  const [resetting, setResetting] = useState(false);

  // Refs for animation state
  const pinsRef = useRef<Pin[]>([]);
  const ballRef = useRef<Ball>({ x: W / 2, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 });
  const powerRef = useRef(0);
  const powerDirRef = useRef(1);
  const aimXRef = useRef(W / 2);
  const aimAngleRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const chargingRef = useRef(false);
  const phaseRef = useRef(gamePhase);
  const frameIdxRef = useRef(frameIdx);
  const ballNumRef = useRef(ballNum);
  const framesRef = useRef(frames);
  const allRollsRef = useRef(allRolls);
  const settledTickRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = gamePhase; }, [gamePhase]);
  useEffect(() => { frameIdxRef.current = frameIdx; }, [frameIdx]);
  useEffect(() => { ballNumRef.current = ballNum; }, [ballNum]);
  useEffect(() => { framesRef.current = frames; }, [frames]);
  useEffect(() => { allRollsRef.current = allRolls; }, [allRolls]);

  /* ─── Initialize pins ─── */
  const resetPins = useCallback((full: boolean) => {
    if (full) {
      pinsRef.current = INITIAL_PINS.map(p => ({
        x: p.x, y: p.y, vx: 0, vy: 0, standing: true, fallAngle: 0, opacity: 1,
      }));
    }
    ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
    powerRef.current = 0;
  }, []);

  useEffect(() => {
    resetPins(true);
  }, [resetPins]);

  /* ─── Pin-ball and pin-pin collision ─── */
  const processCollisions = useCallback(() => {
    const ball = ballRef.current;
    const pins = pinsRef.current;
    if (!ball.active) return;

    // Ball vs pins
    for (const pin of pins) {
      if (!pin.standing) continue;
      const dx = pin.x - ball.x;
      const dy = pin.y - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PIN_R + BALL_R) {
        pin.standing = false;
        const angle = Math.atan2(dy, dx);
        const force = 3 + Math.random() * 2;
        pin.vx = Math.cos(angle) * force;
        pin.vy = Math.sin(angle) * force;
        pin.fallAngle = (Math.random() - 0.5) * 0.5;
        // Deflect ball slightly
        ball.vx += Math.cos(angle + Math.PI) * 0.3;
      }
    }

    // Pin vs pin chain reaction
    for (let i = 0; i < pins.length; i++) {
      if (pins[i].standing) continue;
      if (Math.abs(pins[i].vx) < 0.3 && Math.abs(pins[i].vy) < 0.3) continue;
      for (let j = 0; j < pins.length; j++) {
        if (i === j || !pins[j].standing) continue;
        const dx = pins[j].x - pins[i].x;
        const dy = pins[j].y - pins[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PIN_R * 2.5) {
          pins[j].standing = false;
          const angle = Math.atan2(dy, dx);
          const force = 1.5 + Math.random() * 1.5;
          pins[j].vx = Math.cos(angle) * force;
          pins[j].vy = Math.sin(angle) * force;
          pins[j].fallAngle = (Math.random() - 0.5) * 0.4;
        }
      }
    }
  }, []);

  /* ─── Handle roll result ─── */
  const handleRollResult = useCallback(() => {
    const pins = pinsRef.current;
    const knocked = pins.filter(p => !p.standing).length;
    const fi = frameIdxRef.current;
    const bn = ballNumRef.current;
    const oldFrames = [...framesRef.current];
    const frame = { ...oldFrames[fi], rolls: [...oldFrames[fi].rolls] };

    let pinsDownThisRoll: number;
    if (bn === 0) {
      pinsDownThisRoll = knocked;
    } else {
      const prevKnocked = frame.rolls.reduce((a, b) => a + b, 0);
      pinsDownThisRoll = knocked - prevKnocked;
    }
    frame.rolls.push(pinsDownThisRoll);
    oldFrames[fi] = frame;

    const newAllRolls = [...allRollsRef.current, pinsDownThisRoll];
    const scored = calculateScores(oldFrames, newAllRolls);

    setFrames(scored);
    setAllRolls(newAllRolls);
    framesRef.current = scored;
    allRollsRef.current = newAllRolls;

    // Determine next state
    if (fi < 9) {
      // Normal frames
      if (bn === 0 && pinsDownThisRoll === 10) {
        setMessage("STRIKE!");
        playSound("strike");
        setTimeout(() => advanceFrame(fi, scored), 1200);
      } else if (bn === 1) {
        if (knocked === 10) {
          setMessage("SPARE!");
          playSound("strike");
        } else {
          setMessage(`Knocked ${pinsDownThisRoll} pin${pinsDownThisRoll !== 1 ? "s" : ""}`);
        }
        setTimeout(() => advanceFrame(fi, scored), 1200);
      } else {
        setMessage(`Knocked ${pinsDownThisRoll} pin${pinsDownThisRoll !== 1 ? "s" : ""}`);
        setBallNum(1);
        ballNumRef.current = 1;
        // Reset ball but keep pins as-is
        ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
        powerRef.current = 0;
        setGamePhase("aim");
      }
    } else {
      // 10th frame logic
      const rolls = frame.rolls;
      if (rolls.length === 1) {
        if (pinsDownThisRoll === 10) {
          setMessage("STRIKE!");
          playSound("strike");
          // Reset all pins for next roll
          setBallNum(1);
          ballNumRef.current = 1;
          setTimeout(() => {
            resetPins(true);
            ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
            powerRef.current = 0;
            setResetting(false);
            setGamePhase("aim");
            setMessage("Bonus roll! Aim and throw.");
          }, 800);
          setResetting(true);
        } else {
          setMessage(`Knocked ${pinsDownThisRoll} pin${pinsDownThisRoll !== 1 ? "s" : ""}`);
          setBallNum(1);
          ballNumRef.current = 1;
          ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
          powerRef.current = 0;
          setGamePhase("aim");
        }
      } else if (rolls.length === 2) {
        const sum = rolls[0] + rolls[1];
        if (rolls[0] === 10 && rolls[1] === 10) {
          setMessage("STRIKE!");
          playSound("strike");
          setBallNum(2);
          ballNumRef.current = 2;
          setTimeout(() => {
            resetPins(true);
            ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
            powerRef.current = 0;
            setResetting(false);
            setGamePhase("aim");
            setMessage("Final bonus roll!");
          }, 800);
          setResetting(true);
        } else if (rolls[0] === 10 || sum === 10) {
          if (rolls[0] !== 10 && sum === 10) {
            setMessage("SPARE!");
            playSound("strike");
          } else {
            setMessage(`Knocked ${pinsDownThisRoll}`);
          }
          setBallNum(2);
          ballNumRef.current = 2;
          setTimeout(() => {
            resetPins(true);
            ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
            powerRef.current = 0;
            setResetting(false);
            setGamePhase("aim");
            setMessage("Final bonus roll!");
          }, 800);
          setResetting(true);
        } else {
          // No bonus
          setMessage("Game Over!");
          setGamePhase("gameover");
        }
      } else {
        // 3rd roll done
        if (pinsDownThisRoll === 10) {
          setMessage("STRIKE! Game Over!");
          playSound("strike");
        } else {
          setMessage("Game Over!");
        }
        setGamePhase("gameover");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetPins]);

  const advanceFrame = useCallback((fi: number, scored: FrameScore[]) => {
    const nextFi = fi + 1;
    if (nextFi >= 10) {
      // Move to 10th frame
    }
    setFrameIdx(nextFi);
    frameIdxRef.current = nextFi;
    setBallNum(0);
    ballNumRef.current = 0;
    setResetting(true);
    setTimeout(() => {
      resetPins(true);
      ballRef.current = { x: aimXRef.current, y: BALL_START_Y, vx: 0, vy: 0, active: false, curve: 0 };
      powerRef.current = 0;
      setResetting(false);
      setGamePhase("aim");
      setMessage("Aim and throw!");
    }, 600);
  }, [resetPins]);

  /* ─── Main animation loop ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      const phase = phaseRef.current;

      // Update power bar
      if (phase === "power" && chargingRef.current) {
        powerRef.current += powerDirRef.current * 1.5;
        if (powerRef.current >= 100) { powerRef.current = 100; powerDirRef.current = -1; }
        if (powerRef.current <= 0) { powerRef.current = 0; powerDirRef.current = 1; }
      }

      // Update ball
      const ball = ballRef.current;
      if (ball.active) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        // Apply curve
        ball.vx += ball.curve * 0.01;
        // Dampen curve over time
        ball.curve *= 0.98;

        // Gutter check
        if (ball.x < LANE_LEFT + GUTTER_W + BALL_R || ball.x > LANE_RIGHT - GUTTER_W - BALL_R) {
          if (ball.y > 50) {
            ball.vx *= 0.5;
            // Push into gutter
            if (ball.x < W / 2) ball.vx = -1;
            else ball.vx = 1;
          }
        }

        processCollisions();

        // Ball off screen
        if (ball.y < -20 || ball.x < 10 || ball.x > W - 10) {
          ball.active = false;
          settledTickRef.current = 0;
          if (phaseRef.current === "rolling") {
            setGamePhase("settled");
            phaseRef.current = "settled";
          }
        }
      }

      // Update fallen pins
      for (const pin of pinsRef.current) {
        if (pin.standing) continue;
        pin.x += pin.vx;
        pin.y += pin.vy;
        pin.vx *= 0.92;
        pin.vy *= 0.92;
        pin.fallAngle += (pin.vx > 0 ? 0.1 : -0.1);
        pin.opacity = Math.max(0, pin.opacity - 0.008);
      }

      // Settled phase: wait a bit then process result
      if (phase === "settled") {
        settledTickRef.current++;
        if (settledTickRef.current > 40) {
          handleRollResult();
          settledTickRef.current = 0;
        }
      }

      /* ─── DRAW ─── */
      // Background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Lane
      const laneGrad = ctx.createLinearGradient(LANE_LEFT, 0, LANE_RIGHT, 0);
      laneGrad.addColorStop(0, "#8B6914");
      laneGrad.addColorStop(0.15, "#C4983A");
      laneGrad.addColorStop(0.5, "#DAA84C");
      laneGrad.addColorStop(0.85, "#C4983A");
      laneGrad.addColorStop(1, "#8B6914");
      ctx.fillStyle = laneGrad;
      ctx.fillRect(LANE_LEFT + GUTTER_W, 30, LANE_W - GUTTER_W * 2, H - 40);

      // Lane lines
      ctx.strokeStyle = "rgba(139,105,20,0.4)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const x = LANE_LEFT + GUTTER_W + (LANE_W - GUTTER_W * 2) * i / 5;
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, H - 10);
        ctx.stroke();
      }

      // Gutters
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(LANE_LEFT, 30, GUTTER_W, H - 40);
      ctx.fillRect(LANE_RIGHT - GUTTER_W, 30, GUTTER_W, H - 40);

      // Arrows (aiming dots)
      ctx.fillStyle = "rgba(139,105,20,0.6)";
      for (let i = 0; i < 7; i++) {
        const ax = LANE_LEFT + GUTTER_W + 10 + i * ((LANE_W - GUTTER_W * 2 - 20) / 6);
        drawTriangle(ctx, ax, 320, 5);
      }

      // Foul line
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(LANE_LEFT, 400);
      ctx.lineTo(LANE_RIGHT, 400);
      ctx.stroke();

      // Pin area background
      ctx.fillStyle = "#f5f0e0";
      ctx.fillRect(LANE_LEFT + GUTTER_W, 30, LANE_W - GUTTER_W * 2, 100);

      // Draw pins
      for (const pin of pinsRef.current) {
        if (pin.opacity <= 0) continue;
        ctx.save();
        ctx.globalAlpha = pin.opacity;
        ctx.translate(pin.x, pin.y);
        if (!pin.standing) ctx.rotate(pin.fallAngle);

        // Pin body
        ctx.fillStyle = pin.standing ? "#ffffff" : "#cccccc";
        ctx.beginPath();
        ctx.arc(0, 0, PIN_R, 0, Math.PI * 2);
        ctx.fill();

        // Pin neck (top)
        if (pin.standing) {
          ctx.fillStyle = "#ff3333";
          ctx.beginPath();
          ctx.arc(0, -2, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pin border
        ctx.strokeStyle = pin.standing ? "#888" : "#666";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, PIN_R, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Draw ball
      if (ball.active || phase === "aim" || phase === "power") {
        const bx = ball.active ? ball.x : aimXRef.current;
        const by = ball.active ? ball.y : BALL_START_Y;

        // Ball shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(bx + 2, by + 2, BALL_R, BALL_R * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ball
        const ballGrad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, BALL_R);
        ballGrad.addColorStop(0, "#4a90d9");
        ballGrad.addColorStop(1, "#1a3a6a");
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
        ctx.fill();

        // Finger holes
        ctx.fillStyle = "#0d1f3c";
        ctx.beginPath();
        ctx.arc(bx - 2, by - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + 2, by - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by + 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Aim line
      if (phase === "aim" || phase === "power") {
        ctx.strokeStyle = "rgba(255,255,100,0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(aimXRef.current, BALL_START_Y);
        const aimEndX = aimXRef.current + aimAngleRef.current * 80;
        ctx.lineTo(aimEndX, PIN_START_Y + 40);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Power bar
      if (phase === "power") {
        const barX = 15, barY = 100, barW = 16, barH = 300;
        ctx.fillStyle = "#333";
        ctx.fillRect(barX, barY, barW, barH);
        const pwr = powerRef.current / 100;
        const pwrH = barH * pwr;
        const pwrGrad = ctx.createLinearGradient(barX, barY + barH, barX, barY);
        pwrGrad.addColorStop(0, "#22c55e");
        pwrGrad.addColorStop(0.6, "#eab308");
        pwrGrad.addColorStop(1, "#ef4444");
        ctx.fillStyle = pwrGrad;
        ctx.fillRect(barX, barY + barH - pwrH, barW, pwrH);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PWR", barX + barW / 2, barY - 6);
        ctx.fillText(`${Math.round(powerRef.current)}%`, barX + barW / 2, barY + barH + 14);
      }

      // Pin reset animation overlay
      if (resetting) {
        ctx.fillStyle = "rgba(26,26,46,0.5)";
        ctx.fillRect(LANE_LEFT, 30, LANE_W, 100);
        ctx.fillStyle = "#fff";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Resetting pins...", W / 2, 85);
      }

      // Frame/ball indicator at top
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `Frame ${frameIdxRef.current + 1} / 10  |  Ball ${ballNumRef.current + 1}`,
        W / 2, 18
      );

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [processCollisions, handleRollResult, resetting]);

  /* ─── Input handlers ─── */
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gamePhase !== "aim") return;
    const pos = getCanvasPos(e);
    draggingRef.current = true;
    dragStartXRef.current = pos.x;
    aimXRef.current = Math.max(LANE_LEFT + GUTTER_W + BALL_R, Math.min(LANE_RIGHT - GUTTER_W - BALL_R, pos.x));
    ballRef.current.x = aimXRef.current;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingRef.current || gamePhase !== "aim") return;
    const pos = getCanvasPos(e);
    aimXRef.current = Math.max(LANE_LEFT + GUTTER_W + BALL_R, Math.min(LANE_RIGHT - GUTTER_W - BALL_R, pos.x));
    ballRef.current.x = aimXRef.current;
    // Angle from drag offset
    aimAngleRef.current = Math.max(-2, Math.min(2, (pos.x - dragStartXRef.current) * 0.02));
  };

  const handlePointerUp = () => {
    if (gamePhase === "aim" && draggingRef.current) {
      draggingRef.current = false;
      // Start power charging
      setGamePhase("power");
      phaseRef.current = "power";
      chargingRef.current = true;
      powerDirRef.current = 1;
      powerRef.current = 0;
      setMessage("Release to throw!");
    }
  };

  const handleRelease = () => {
    if (gamePhase !== "power") return;
    chargingRef.current = false;
    const pwr = powerRef.current / 100;
    const speed = BALL_SPEED * (0.3 + pwr * 0.7);
    const angle = aimAngleRef.current;

    ballRef.current = {
      x: aimXRef.current,
      y: BALL_START_Y,
      vx: angle * speed * 0.3,
      vy: -speed,
      active: true,
      curve: angle * 1.5,
    };

    setGamePhase("rolling");
    phaseRef.current = "rolling";
    playSound("roll");
    setMessage("");

    // Check for gutter after delay
    setTimeout(() => {
      const b = ballRef.current;
      if (b.active && (b.x < LANE_LEFT + GUTTER_W + 2 || b.x > LANE_RIGHT - GUTTER_W - 2)) {
        playSound("gutter");
      }
    }, 400);
  };

  const handleCanvasClick = () => {
    if (gamePhase === "power") {
      handleRelease();
    }
  };

  /* ─── Reset game ─── */
  const resetGame = () => {
    setFrameIdx(0);
    frameIdxRef.current = 0;
    setBallNum(0);
    ballNumRef.current = 0;
    setFrames(Array.from({ length: 10 }, () => ({ rolls: [], score: null })));
    framesRef.current = Array.from({ length: 10 }, () => ({ rolls: [], score: null }));
    setAllRolls([]);
    allRollsRef.current = [];
    setMessage("Click & drag to aim, hold to charge power");
    setGamePhase("aim");
    phaseRef.current = "aim";
    resetPins(true);
  };

  /* ─── Scorecard rendering ─── */
  const renderScorecard = () => {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, marginTop: 8, width: 300 }}>
        {frames.map((f, i) => {
          const isCurrent = i === frameIdx && gamePhase !== "gameover";
          const isStrike = f.rolls[0] === 10 && i < 9;
          const isSpare = !isStrike && f.rolls.length >= 2 && f.rolls[0] + f.rolls[1] === 10 && i < 9;
          return (
            <div
              key={i}
              style={{
                width: i === 9 ? 56 : 26,
                border: `1px solid ${isCurrent ? "#eab308" : "#444"}`,
                borderRadius: 3,
                background: isCurrent ? "rgba(234,179,8,0.1)" : "#111",
                textAlign: "center",
                fontSize: 9,
                padding: 1,
              }}
            >
              <div style={{ color: "#888", borderBottom: "1px solid #333", padding: "1px 0" }}>
                {i + 1}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 1, padding: "1px 0", minHeight: 14 }}>
                {i < 9 ? (
                  <>
                    <span style={{ color: isStrike ? "#10b981" : "#ccc", fontWeight: isStrike ? 700 : 400 }}>
                      {f.rolls[0] !== undefined ? (f.rolls[0] === 10 ? "X" : f.rolls[0]) : ""}
                    </span>
                    {!isStrike && (
                      <span style={{ color: isSpare ? "#10b981" : "#ccc", fontWeight: isSpare ? 700 : 400 }}>
                        {f.rolls[1] !== undefined ? (isSpare ? "/" : f.rolls[1]) : ""}
                      </span>
                    )}
                  </>
                ) : (
                  /* 10th frame */
                  <>
                    <span style={{ color: f.rolls[0] === 10 ? "#10b981" : "#ccc" }}>
                      {f.rolls[0] !== undefined ? (f.rolls[0] === 10 ? "X" : f.rolls[0]) : ""}
                    </span>
                    <span style={{ color: (f.rolls[0] === 10 && f.rolls[1] === 10) ? "#10b981" : (f.rolls[0] !== 10 && f.rolls.length >= 2 && f.rolls[0] + f.rolls[1] === 10) ? "#10b981" : "#ccc" }}>
                      {f.rolls[1] !== undefined
                        ? (f.rolls[0] === 10
                          ? (f.rolls[1] === 10 ? "X" : f.rolls[1])
                          : (f.rolls[0] + f.rolls[1] === 10 ? "/" : f.rolls[1]))
                        : ""}
                    </span>
                    <span style={{ color: f.rolls[2] === 10 ? "#10b981" : "#ccc" }}>
                      {f.rolls[2] !== undefined ? (f.rolls[2] === 10 ? "X" : f.rolls[2]) : ""}
                    </span>
                  </>
                )}
              </div>
              <div style={{ color: "#eab308", fontWeight: 700, fontSize: 10, borderTop: "1px solid #333", padding: "1px 0", minHeight: 13 }}>
                {f.score !== null ? f.score : ""}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#0d0d1a", padding: 12, borderRadius: 12, userSelect: "none" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: 300, height: 500, borderRadius: 8, cursor: gamePhase === "aim" ? "crosshair" : gamePhase === "power" ? "pointer" : "default", border: "1px solid #333" }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={handleCanvasClick}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={() => { if (gamePhase === "aim") handlePointerUp(); else handleRelease(); }}
      />

      {/* Message */}
      <div style={{ color: message.includes("STRIKE") || message.includes("SPARE") ? "#10b981" : message.includes("Game Over") ? "#ef4444" : "#aaa", fontSize: 14, fontWeight: 600, marginTop: 6, height: 20, textAlign: "center" }}>
        {message}
      </div>

      {/* Scorecard */}
      {renderScorecard()}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {gamePhase === "gameover" && (
          <button
            onClick={resetGame}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#10b981", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            New Game
          </button>
        )}
        {gamePhase !== "gameover" && (
          <button
            onClick={resetGame}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #444", background: "transparent", color: "#888", cursor: "pointer", fontSize: 11 }}
          >
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size * 0.7, y + size * 0.5);
  ctx.lineTo(x + size * 0.7, y + size * 0.5);
  ctx.closePath();
  ctx.fill();
}
