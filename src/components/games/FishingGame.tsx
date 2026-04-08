"use client";
import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Fish types ─── */
const FISH_TYPES = [
  { id: "small", name: "Small Fish", emoji: "\u{1F41F}", color: "#60a5fa", points: 10, difficulty: 0.3, weight: 40, desc: "Easy catch" },
  { id: "medium", name: "Medium Fish", emoji: "\u{1F420}", color: "#f59e0b", points: 25, difficulty: 0.5, weight: 30, desc: "Moderate" },
  { id: "large", name: "Large Fish", emoji: "\u{1F421}", color: "#ef4444", points: 50, difficulty: 0.75, weight: 15, desc: "Hard catch" },
  { id: "golden", name: "Golden Fish", emoji: "\u{2B50}", color: "#fbbf24", points: 100, difficulty: 0.92, weight: 5, desc: "Very rare!" },
  { id: "boot", name: "Old Boot", emoji: "\u{1F462}", color: "#6b7280", points: 0, difficulty: 0.15, weight: 10, desc: "Junk..." },
] as const;

type FishType = (typeof FISH_TYPES)[number];
type Phase = "menu" | "idle" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "escaped" | "done";

/* ─── Sound helper (Web Audio API, no files needed) ─── */
function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}
function playSplash() {
  playTone(180, 0.3, "sawtooth", 0.08);
  setTimeout(() => playTone(120, 0.2, "sawtooth", 0.06), 80);
}
function playReel() {
  playTone(600, 0.08, "square", 0.05);
}
function playCatchChime() {
  playTone(523, 0.15, "sine", 0.1);
  setTimeout(() => playTone(659, 0.15, "sine", 0.1), 120);
  setTimeout(() => playTone(784, 0.25, "sine", 0.12), 240);
}
function playBite() {
  playTone(440, 0.1, "square", 0.1);
  setTimeout(() => playTone(550, 0.1, "square", 0.1), 100);
}
function playEscape() {
  playTone(300, 0.2, "sawtooth", 0.08);
  setTimeout(() => playTone(200, 0.3, "sawtooth", 0.06), 150);
}

/* ─── localStorage helpers ─── */
const LS_KEY = "fishing_game_best";
function getBest(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LS_KEY) || "0", 10);
}
function saveBest(s: number) {
  if (typeof window === "undefined") return;
  const prev = getBest();
  if (s > prev) localStorage.setItem(LS_KEY, String(s));
}

/* ─── Canvas constants ─── */
const W = 400;
const H = 500;
const WATER_Y = 180;
const BANK_Y = 430;
const ROD_BASE = { x: 340, y: 460 };
const ROD_TIP = { x: 280, y: 160 };
const GAME_DURATION = 180; // 3 minutes

/* ─── Pick a fish based on power ─── */
function pickFish(power: number): FishType {
  const powerFactor = power / 100;
  const adjusted = FISH_TYPES.map((f) => ({
    ...f,
    w: f.id === "golden" ? f.weight * powerFactor : f.id === "large" ? f.weight * (0.5 + powerFactor * 0.5) : f.weight,
  }));
  const total = adjusted.reduce((s, f) => s + f.w, 0);
  let r = Math.random() * total;
  for (const f of adjusted) {
    r -= f.w;
    if (r <= 0) return f;
  }
  return FISH_TYPES[0];
}

export default function FishingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef<Phase>("menu");
  const [phase, _setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [castPower, setCastPower] = useState(0);
  const [currentFish, setCurrentFish] = useState<FishType | null>(null);
  const [tension, setTension] = useState(50);
  const [reelProgress, setReelProgress] = useState(0);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  /* mutable refs for animation loop */
  const stateRef = useRef({
    castPower: 0,
    charging: false,
    bobberX: 200,
    bobberY: 250,
    lineEndX: 200,
    lineEndY: 250,
    tension: 50,
    reelProgress: 0,
    reeling: false,
    fish: null as FishType | null,
    fishPullDir: 1,
    fishPullTimer: 0,
    biteTimer: 0,
    biteFlash: 0,
    castAnimT: 0,
    waterRipples: [] as { x: number; y: number; r: number; a: number }[],
    bgFish: Array.from({ length: 6 }, () => ({
      x: Math.random() * W,
      y: WATER_Y + 40 + Math.random() * (BANK_Y - WATER_Y - 80),
      speed: 0.3 + Math.random() * 0.8,
      dir: Math.random() > 0.5 ? 1 : -1,
      size: 8 + Math.random() * 14,
    })),
    clouds: Array.from({ length: 3 }, (_, i) => ({
      x: i * 150 + Math.random() * 50,
      y: 20 + Math.random() * 40,
      w: 50 + Math.random() * 40,
    })),
    castTargetX: 200,
    castTargetY: 280,
    score: 0,
    timeLeft: GAME_DURATION,
  });

  const timerRef = useRef<any>(null);
  const gameTimerRef = useRef<any>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    _setPhase(p);
  }, []);

  /* Load best score on mount */
  useEffect(() => {
    setBestScore(getBest());
  }, []);

  /* ─── Canvas drawing ─── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const st = stateRef.current;
    const p = phaseRef.current;
    const t = performance.now() / 1000;

    ctx.clearRect(0, 0, W, H);

    /* Sky gradient (dark, peaceful) */
    const skyGrad = ctx.createLinearGradient(0, 0, 0, WATER_Y);
    skyGrad.addColorStop(0, "#0f172a");
    skyGrad.addColorStop(0.5, "#1e293b");
    skyGrad.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, WATER_Y);

    /* Stars */
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137.5) % W);
      const sy = ((i * 73.1) % (WATER_Y - 20)) + 5;
      const twinkle = Math.sin(t * 2 + i) * 0.5 + 0.5;
      ctx.globalAlpha = 0.2 + twinkle * 0.6;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    /* Moon */
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(80, 50, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(90, 45, 22, 0, Math.PI * 2);
    ctx.fill();

    /* Clouds */
    ctx.fillStyle = "rgba(148,163,184,0.15)";
    for (const c of st.clouds) {
      c.x += 0.08;
      if (c.x > W + 60) c.x = -80;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w / 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x - c.w * 0.25, c.y + 4, c.w * 0.3, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Distant treeline */
    ctx.fillStyle = "#0d3320";
    for (let i = 0; i < 20; i++) {
      const tx = i * 22 - 5;
      const th = 25 + Math.sin(i * 1.3) * 12;
      ctx.beginPath();
      ctx.moveTo(tx, WATER_Y);
      ctx.lineTo(tx + 11, WATER_Y - th);
      ctx.lineTo(tx + 22, WATER_Y);
      ctx.fill();
    }

    /* Water */
    const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, BANK_Y);
    waterGrad.addColorStop(0, "#1e40af");
    waterGrad.addColorStop(0.4, "#1e3a8a");
    waterGrad.addColorStop(1, "#172554");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, WATER_Y, W, BANK_Y - WATER_Y);

    /* Water waves */
    ctx.strokeStyle = "rgba(96,165,250,0.15)";
    ctx.lineWidth = 1.5;
    for (let row = 0; row < 6; row++) {
      ctx.beginPath();
      const wy = WATER_Y + 20 + row * 35;
      for (let x = 0; x < W; x += 4) {
        const y = wy + Math.sin((x + t * 40 + row * 50) / 30) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    /* Water reflection shimmer */
    ctx.fillStyle = "rgba(147,197,253,0.04)";
    for (let i = 0; i < 12; i++) {
      const rx = ((i * 41 + t * 15) % (W + 40)) - 20;
      const ry = WATER_Y + 10 + (i * 37) % (BANK_Y - WATER_Y - 30);
      ctx.fillRect(rx, ry, 30 + Math.sin(t + i) * 10, 2);
    }

    /* Background fish swimming */
    for (const bf of st.bgFish) {
      bf.x += bf.speed * bf.dir;
      if (bf.x > W + 20) { bf.x = -20; bf.dir = 1; }
      if (bf.x < -20) { bf.x = W + 20; bf.dir = -1; }
      ctx.fillStyle = "rgba(96,165,250,0.12)";
      ctx.beginPath();
      const fx = bf.x;
      const fy = bf.y + Math.sin(t * 2 + bf.x / 30) * 3;
      ctx.ellipse(fx, fy, bf.size, bf.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      /* tail */
      ctx.beginPath();
      ctx.moveTo(fx - bf.dir * bf.size, fy);
      ctx.lineTo(fx - bf.dir * (bf.size + 6), fy - 4);
      ctx.lineTo(fx - bf.dir * (bf.size + 6), fy + 4);
      ctx.closePath();
      ctx.fill();
    }

    /* Water ripples */
    st.waterRipples = st.waterRipples.filter((r) => r.a > 0.01);
    for (const rp of st.waterRipples) {
      rp.r += 0.5;
      rp.a *= 0.97;
      ctx.strokeStyle = `rgba(147,197,253,${rp.a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* Green bank at bottom */
    const bankGrad = ctx.createLinearGradient(0, BANK_Y, 0, H);
    bankGrad.addColorStop(0, "#166534");
    bankGrad.addColorStop(0.3, "#15803d");
    bankGrad.addColorStop(1, "#14532d");
    ctx.fillStyle = bankGrad;
    ctx.beginPath();
    ctx.moveTo(0, BANK_Y);
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, BANK_Y - Math.sin(x / 40) * 6 - 3);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    /* Grass tufts */
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 15; i++) {
      const gx = 10 + i * 28;
      const gy = BANK_Y - 2;
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + j * 4 + Math.sin(t + i) * 2, gy - 12, gx + j * 6, gy - 16);
        ctx.stroke();
      }
    }

    /* Fishing rod */
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ROD_BASE.x, ROD_BASE.y);
    ctx.quadraticCurveTo(ROD_BASE.x - 20, ROD_BASE.y - 100, ROD_TIP.x, ROD_TIP.y);
    ctx.stroke();
    /* Rod handle */
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ROD_BASE.x, ROD_BASE.y);
    ctx.lineTo(ROD_BASE.x + 10, ROD_BASE.y + 20);
    ctx.stroke();
    /* Reel on rod */
    ctx.fillStyle = "#a3a3a3";
    ctx.beginPath();
    ctx.arc(ROD_BASE.x - 5, ROD_BASE.y - 40, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#737373";
    ctx.beginPath();
    ctx.arc(ROD_BASE.x - 5, ROD_BASE.y - 40, 3, 0, Math.PI * 2);
    ctx.fill();

    /* Fishing line and bobber */
    if (p === "casting") {
      /* Animate cast */
      st.castAnimT = Math.min(st.castAnimT + 0.04, 1);
      const tt = st.castAnimT;
      const curveT = 1 - (1 - tt) * (1 - tt); // ease out
      st.lineEndX = ROD_TIP.x + (st.castTargetX - ROD_TIP.x) * curveT;
      st.lineEndY = ROD_TIP.y + (st.castTargetY - ROD_TIP.y) * curveT - Math.sin(curveT * Math.PI) * 80;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
      ctx.lineTo(st.lineEndX, st.lineEndY);
      ctx.stroke();
      /* bobber */
      drawBobber(ctx, st.lineEndX, st.lineEndY, false, t);
    } else if (p === "waiting" || p === "bite" || p === "reeling") {
      /* Line from rod tip to bobber */
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
      ctx.quadraticCurveTo(
        (ROD_TIP.x + st.bobberX) / 2,
        ROD_TIP.y + 30,
        st.bobberX,
        st.bobberY
      );
      ctx.stroke();

      const bobDip = p === "bite" ? Math.sin(t * 12) * 6 : 0;
      const bobY = st.bobberY + bobDip;
      drawBobber(ctx, st.bobberX, bobY, p === "bite", t);

      if (p === "bite") {
        /* Exclamation */
        st.biteFlash = (st.biteFlash + 1) % 30;
        if (st.biteFlash < 20) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", st.bobberX, st.bobberY - 25);
        }
        /* Ripples */
        if (Math.random() < 0.15) {
          st.waterRipples.push({ x: st.bobberX + (Math.random() - 0.5) * 10, y: st.bobberY, r: 2, a: 0.5 });
        }
      }

      if (p === "reeling") {
        /* Reeling: show line tension visually */
        ctx.strokeStyle = st.tension > 80 || st.tension < 20 ? "#ef4444" : "#22c55e";
        ctx.lineWidth = 1.5;
        /* Underwater line to fish */
        ctx.beginPath();
        ctx.moveTo(st.bobberX, st.bobberY);
        const fishDepth = st.bobberY + 30 + (100 - st.reelProgress) * 0.5;
        ctx.lineTo(st.bobberX + Math.sin(t * 5) * 10, fishDepth);
        ctx.stroke();
        /* Fish silhouette */
        ctx.fillStyle = st.fish?.color || "#60a5fa";
        ctx.globalAlpha = 0.5 + st.reelProgress * 0.005;
        ctx.beginPath();
        const fsx = st.bobberX + Math.sin(t * 5) * 10;
        const fsy = fishDepth;
        ctx.ellipse(fsx, fsy, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    /* Power bar (while charging) */
    if (st.charging && p === "idle") {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 80, H - 70, 160, 20);
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 80, H - 70, 160, 20);
      const pw = (st.castPower / 100) * 156;
      const barColor = st.castPower < 40 ? "#22c55e" : st.castPower < 70 ? "#eab308" : "#ef4444";
      ctx.fillStyle = barColor;
      ctx.fillRect(W / 2 - 78, H - 68, pw, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("POWER", W / 2, H - 55);
    }

    frameRef.current = requestAnimationFrame(draw);
  }, []);

  function drawBobber(ctx: CanvasRenderingContext2D, x: number, y: number, biting: boolean, t: number) {
    /* Bobber float */
    ctx.fillStyle = biting ? "#ef4444" : "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    /* Red top */
    ctx.fillStyle = biting ? "#fbbf24" : "#ef4444";
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 4, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    /* Stick */
    ctx.strokeStyle = "#fafafa";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x, y - 14);
    ctx.stroke();
  }

  /* ─── Start animation loop ─── */
  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  /* ─── Game start ─── */
  const startGame = useCallback(() => {
    setScore(0);
    stateRef.current.score = 0;
    setTimeLeft(GAME_DURATION);
    stateRef.current.timeLeft = GAME_DURATION;
    setCollection({});
    setMessage("");
    setPhase("idle");

    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    gameTimerRef.current = setInterval(() => {
      stateRef.current.timeLeft -= 1;
      setTimeLeft((t) => {
        const nt = t - 1;
        if (nt <= 0) {
          clearInterval(gameTimerRef.current);
          setPhase("done");
          saveBest(stateRef.current.score);
          setBestScore(Math.max(getBest(), stateRef.current.score));
          return 0;
        }
        return nt;
      });
    }, 1000);
  }, [setPhase]);

  /* cleanup intervals on unmount */
  useEffect(() => {
    return () => {
      clearInterval(gameTimerRef.current);
      clearInterval(timerRef.current);
      clearTimeout(timerRef.current);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* ─── Casting logic ─── */
  const startCharge = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const st = stateRef.current;
    st.charging = true;
    st.castPower = 0;
    setCastPower(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      st.castPower = Math.min(st.castPower + 2, 100);
      setCastPower(st.castPower);
    }, 30);
  }, []);

  const releaseCast = useCallback(() => {
    const st = stateRef.current;
    if (!st.charging) return;
    clearInterval(timerRef.current);
    st.charging = false;

    const power = st.castPower;
    /* Calculate target based on power */
    const minX = 60, maxX = 200;
    const targetX = maxX - (power / 100) * (maxX - minX) + (Math.random() - 0.5) * 30;
    const minY = WATER_Y + 30, maxY = WATER_Y + (BANK_Y - WATER_Y) * 0.7;
    const targetY = minY + (power / 100) * (maxY - minY - 40) + Math.random() * 20;

    st.castTargetX = targetX;
    st.castTargetY = targetY;
    st.castAnimT = 0;
    st.bobberX = targetX;
    st.bobberY = targetY;

    setPhase("casting");
    playSplash();

    /* After cast animation, go to waiting */
    setTimeout(() => {
      st.waterRipples.push(
        { x: targetX, y: targetY, r: 3, a: 0.6 },
        { x: targetX + 5, y: targetY, r: 1, a: 0.4 }
      );
      setPhase("waiting");
      setMessage("Waiting for a bite...");

      /* Random wait for fish bite */
      const waitTime = 2000 + Math.random() * 6000;
      timerRef.current = setTimeout(() => {
        if (phaseRef.current !== "waiting") return;
        const fish = pickFish(power);
        st.fish = fish;
        setCurrentFish(fish);
        setPhase("bite");
        setMessage("A fish is biting! Click NOW!");
        playBite();

        /* Bite window — must click within 2.5 seconds */
        timerRef.current = setTimeout(() => {
          if (phaseRef.current === "bite") {
            setPhase("escaped");
            setMessage("Too slow! The fish got away...");
            playEscape();
            setTimeout(() => {
              if (phaseRef.current === "escaped") {
                setPhase("idle");
                setMessage("");
              }
            }, 1500);
          }
        }, 2500);
      }, waitTime);
    }, 800);
  }, [setPhase]);

  /* ─── Hook the fish ─── */
  const hookFish = useCallback(() => {
    if (phaseRef.current !== "bite") return;
    clearTimeout(timerRef.current);
    const st = stateRef.current;
    st.tension = 50;
    st.reelProgress = 0;
    st.reeling = false;
    st.fishPullDir = 1;
    st.fishPullTimer = 0;
    setTension(50);
    setReelProgress(0);
    setPhase("reeling");
    setMessage("Hold click to reel! Keep tension in GREEN zone!");
    playReel();

    /* Fish pull simulation */
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== "reeling") {
        clearInterval(timerRef.current);
        return;
      }
      const fish = st.fish;
      if (!fish) return;

      /* Fish randomly changes pull direction */
      st.fishPullTimer++;
      if (st.fishPullTimer > 20 + Math.random() * 30) {
        st.fishPullTimer = 0;
        st.fishPullDir = Math.random() > 0.5 ? 1 : -1;
      }

      /* Fish pulls on tension */
      const pullStrength = fish.difficulty * 2.5 + Math.random() * 1.5;
      st.tension += st.fishPullDir * pullStrength;

      /* If player is reeling, progress goes up, tension goes up */
      if (st.reeling) {
        st.reelProgress += 0.6 + (1 - fish.difficulty) * 0.4;
        st.tension += 1.2;
      } else {
        /* If not reeling, tension drops */
        st.tension -= 1.5;
        st.reelProgress -= 0.15;
      }

      /* Clamp */
      st.tension = Math.max(0, Math.min(100, st.tension));
      st.reelProgress = Math.max(0, Math.min(100, st.reelProgress));
      setTension(Math.round(st.tension));
      setReelProgress(Math.round(st.reelProgress));

      /* Check fail conditions (tension out of green zone too long) */
      if (st.tension >= 100 || st.tension <= 0) {
        clearInterval(timerRef.current);
        setPhase("escaped");
        setMessage(st.tension >= 100 ? "Line snapped! Fish escaped!" : "Line went slack! Fish escaped!");
        playEscape();
        setTimeout(() => {
          if (phaseRef.current === "escaped") {
            setPhase("idle");
            setMessage("");
          }
        }, 1800);
        return;
      }

      /* Check win */
      if (st.reelProgress >= 100) {
        clearInterval(timerRef.current);
        const f = st.fish!;
        st.score += f.points;
        setScore(st.score);
        setPhase("caught");
        setMessage(`You caught a ${f.name}! +${f.points} pts`);
        setCollection((c) => ({ ...c, [f.id]: (c[f.id] || 0) + 1 }));
        playCatchChime();
        setTimeout(() => {
          if (phaseRef.current === "caught") {
            setPhase("idle");
            setMessage("");
          }
        }, 2200);
      }
    }, 50);
  }, [setPhase]);

  /* ─── Reel hold handlers ─── */
  const startReel = useCallback(() => {
    stateRef.current.reeling = true;
  }, []);
  const stopReel = useCallback(() => {
    stateRef.current.reeling = false;
  }, []);

  /* ─── Canvas click dispatcher ─── */
  const handleCanvasMouseDown = useCallback(() => {
    const p = phaseRef.current;
    if (p === "idle") startCharge();
    else if (p === "bite") hookFish();
    else if (p === "reeling") { startReel(); playReel(); }
  }, [startCharge, hookFish, startReel]);

  const handleCanvasMouseUp = useCallback(() => {
    const p = phaseRef.current;
    if (p === "idle" && stateRef.current.charging) releaseCast();
    else if (p === "reeling") stopReel();
  }, [releaseCast, stopReel]);

  /* Format time */
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* Tension bar color */
  const tensionColor = tension > 75 || tension < 25 ? "#ef4444" : tension > 60 || tension < 35 ? "#eab308" : "#22c55e";
  const tensionZone = tension > 80 || tension < 20 ? "DANGER" : tension > 65 || tension < 30 ? "CAREFUL" : "GOOD";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, userSelect: "none" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", width: W, marginBottom: 8 }}>
        <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 18 }}>Score: {score}</span>
        {phase !== "menu" && phase !== "done" && (
          <span style={{ color: timeLeft <= 30 ? "#ef4444" : "#94a3b8", fontWeight: 600, fontSize: 16 }}>
            {formatTime(timeLeft)}
          </span>
        )}
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Best: {bestScore}</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 12, cursor: "pointer", display: "block", background: "#0f172a" }}
        onMouseDown={phase !== "menu" && phase !== "done" ? handleCanvasMouseDown : undefined}
        onMouseUp={phase !== "menu" && phase !== "done" ? handleCanvasMouseUp : undefined}
        onMouseLeave={phase === "reeling" ? stopReel : phase === "idle" && stateRef.current.charging ? releaseCast : undefined}
        onTouchStart={phase !== "menu" && phase !== "done" ? (e) => { e.preventDefault(); handleCanvasMouseDown(); } : undefined}
        onTouchEnd={phase !== "menu" && phase !== "done" ? (e) => { e.preventDefault(); handleCanvasMouseUp(); } : undefined}
      />

      {/* Message */}
      {message && (
        <p
          style={{
            marginTop: 8,
            fontWeight: 600,
            fontSize: 14,
            color:
              phase === "bite" ? "#ef4444" :
              phase === "caught" ? "#22c55e" :
              phase === "escaped" ? "#f97316" :
              phase === "reeling" ? "#fbbf24" :
              "#94a3b8",
            textAlign: "center",
            minHeight: 20,
          }}
        >
          {message}
        </p>
      )}

      {/* Tension bar during reeling */}
      {phase === "reeling" && (
        <div style={{ width: W, marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ color: "#94a3b8", fontSize: 11 }}>Tension</span>
            <span style={{ color: tensionColor, fontSize: 11, fontWeight: 700 }}>{tensionZone}</span>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 6, height: 14, position: "relative", overflow: "hidden", border: "1px solid #334155" }}>
            {/* Green zone indicator */}
            <div style={{ position: "absolute", left: "25%", width: "50%", height: "100%", background: "rgba(34,197,94,0.15)" }} />
            {/* Tension marker */}
            <div
              style={{
                position: "absolute",
                left: `${tension}%`,
                top: 0,
                width: 4,
                height: "100%",
                background: tensionColor,
                borderRadius: 2,
                transform: "translateX(-2px)",
                transition: "left 0.05s",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: "#94a3b8", fontSize: 11 }}>Reel Progress</span>
            <span style={{ color: "#60a5fa", fontSize: 11 }}>{reelProgress}%</span>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 6, height: 10, overflow: "hidden", border: "1px solid #334155" }}>
            <div style={{ background: "#3b82f6", height: "100%", width: `${reelProgress}%`, transition: "width 0.1s", borderRadius: 6 }} />
          </div>
        </div>
      )}

      {/* Menu overlay */}
      {phase === "menu" && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.85)",
          borderRadius: 12,
          zIndex: 10,
          pointerEvents: "auto",
        }}>
          <p style={{ fontSize: 32, marginBottom: 4 }}>{"\u{1F3A3}"}</p>
          <h2 style={{ color: "#fbbf24", fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Fishing Game</h2>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4, textAlign: "center", maxWidth: 280 }}>
            Cast your line, wait for a bite, and reel in fish! Keep tension in the green zone while reeling.
          </p>
          <p style={{ color: "#64748b", fontSize: 11, marginBottom: 16 }}>3 minute time limit</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 16, maxWidth: 320 }}>
            {FISH_TYPES.map((f) => (
              <div key={f.id} style={{ background: "#1e293b", borderRadius: 8, padding: "4px 10px", textAlign: "center" }}>
                <span style={{ fontSize: 18 }}>{f.emoji}</span>
                <p style={{ color: f.color, fontSize: 10, fontWeight: 600, margin: 0 }}>{f.name}</p>
                <p style={{ color: "#64748b", fontSize: 9, margin: 0 }}>{f.points}pts - {f.desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={startGame}
            style={{
              padding: "12px 40px", borderRadius: 10, border: "none",
              background: "#22c55e", color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer",
            }}
          >
            Start Fishing
          </button>
          {bestScore > 0 && <p style={{ color: "#fbbf24", fontSize: 12, marginTop: 8 }}>Best: {bestScore} pts</p>}
        </div>
      )}

      {/* Done overlay */}
      {phase === "done" && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.9)",
          borderRadius: 12,
          zIndex: 10,
        }}>
          <p style={{ fontSize: 36, marginBottom: 4 }}>{"\u{1F3A3}"}</p>
          <h2 style={{ color: "#fbbf24", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Time's Up!</h2>
          <p style={{ color: "#e2e8f0", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{score} pts</p>
          {score >= bestScore && score > 0 && (
            <p style={{ color: "#fbbf24", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>New Best Score!</p>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 16, maxWidth: 320 }}>
            {FISH_TYPES.filter((f) => collection[f.id]).map((f) => (
              <div key={f.id} style={{ background: "#1e293b", borderRadius: 8, padding: "4px 10px", textAlign: "center" }}>
                <span style={{ fontSize: 18 }}>{f.emoji}</span>
                <p style={{ color: f.color, fontSize: 10, fontWeight: 600, margin: 0 }}>{f.name} x{collection[f.id]}</p>
              </div>
            ))}
            {Object.keys(collection).length === 0 && (
              <p style={{ color: "#64748b", fontSize: 12 }}>No fish caught this round</p>
            )}
          </div>
          <button
            onClick={startGame}
            style={{
              padding: "12px 40px", borderRadius: 10, border: "none",
              background: "#22c55e", color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer",
            }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Fish collection (during gameplay) */}
      {phase !== "menu" && phase !== "done" && Object.keys(collection).length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 8, maxWidth: W }}>
          {FISH_TYPES.filter((f) => collection[f.id]).map((f) => (
            <span key={f.id} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "#1e293b", color: f.color, border: `1px solid ${f.color}33` }}>
              {f.emoji} {f.name} x{collection[f.id]}
            </span>
          ))}
        </div>
      )}

      {/* Instructions during gameplay */}
      {phase === "idle" && !message && stateRef.current.timeLeft > 0 && stateRef.current.timeLeft < GAME_DURATION && (
        <p style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>Hold and release on the water to cast</p>
      )}
      {phase === "idle" && !message && stateRef.current.timeLeft === GAME_DURATION && (
        <p style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>Hold and release on the water to cast your line</p>
      )}
    </div>
  );
}