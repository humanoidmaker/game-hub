"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const W = 300;
const H = 500;
const LANE_X = [75, 150, 225];
const CAR_W = 30;
const CAR_H = 45;
const COIN_R = 8;
const INITIAL_SPEED = 2.5;
const SPEED_INCREMENT = 0.003;
const SPAWN_BASE = 55;
const SPAWN_MIN = 22;
const COIN_SPAWN_BASE = 120;
const LS_KEY = "car_racing_high";

interface Obstacle {
  x: number;
  y: number;
  lane: number;
  color: string;
  style: number;
}

interface Coin {
  x: number;
  y: number;
  lane: number;
  collected: boolean;
  angle: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function createOscillator(actx: AudioContext, freq: number, type: OscillatorType, gain: number) {
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(actx.destination);
  return { osc, gain: g };
}

export default function CarRacing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    playerLane: number;
    targetX: number;
    px: number;
    speed: number;
    distance: number;
    lives: number;
    score: number;
    obstacles: Obstacle[];
    coins: Coin[];
    roadY: number;
    spawnTimer: number;
    coinTimer: number;
    phase: "idle" | "playing" | "over";
    invincible: number;
    flash: number;
    keys: Record<string, boolean>;
    anim: number;
    audioCtx: AudioContext | null;
    engineOsc: { osc: OscillatorNode; gain: GainNode } | null;
    engineStarted: boolean;
    moveLeft: boolean;
    moveRight: boolean;
  }>({
    playerLane: 1,
    targetX: LANE_X[1],
    px: LANE_X[1],
    speed: INITIAL_SPEED,
    distance: 0,
    lives: 3,
    score: 0,
    obstacles: [],
    coins: [],
    roadY: 0,
    spawnTimer: 0,
    coinTimer: 0,
    phase: "idle",
    invincible: 0,
    flash: 0,
    keys: {},
    anim: 0,
    audioCtx: null,
    engineOsc: null,
    engineStarted: false,
    moveLeft: false,
    moveRight: false,
  });

  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const v = parseInt(stored, 10);
      if (!isNaN(v)) setHighScore(v);
    }
  }, []);

  const playCrash = useCallback((actx: AudioContext) => {
    try {
      const buf = actx.createBuffer(1, actx.sampleRate * 0.35, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
      }
      const src = actx.createBufferSource();
      src.buffer = buf;
      const g = actx.createGain();
      g.gain.value = 0.25;
      src.connect(g);
      g.connect(actx.destination);
      src.start();
    } catch {}
  }, []);

  const playCoinSound = useCallback((actx: AudioContext) => {
    try {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, actx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, actx.currentTime + 0.08);
      g.gain.setValueAtTime(0.15, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + 0.15);
    } catch {}
  }, []);

  const startEngine = useCallback((actx: AudioContext) => {
    const s = stateRef.current;
    if (s.engineStarted) return;
    try {
      const e = createOscillator(actx, 55, "sawtooth", 0.04);
      const e2 = createOscillator(actx, 110, "triangle", 0.02);
      e.osc.start();
      e2.osc.start();
      s.engineOsc = e;
      s.engineStarted = true;
    } catch {}
  }, []);

  const stopEngine = useCallback(() => {
    const s = stateRef.current;
    if (s.engineOsc) {
      try {
        s.engineOsc.gain.gain.linearRampToValueAtTime(0, (s.audioCtx?.currentTime ?? 0) + 0.1);
        s.engineOsc.osc.stop((s.audioCtx?.currentTime ?? 0) + 0.15);
      } catch {}
      s.engineOsc = null;
      s.engineStarted = false;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;

    const ensureAudio = () => {
      if (!s.audioCtx) {
        s.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (s.audioCtx.state === "suspended") s.audioCtx.resume();
      return s.audioCtx;
    };

    const obstacleColors = ["#e53e3e", "#3182ce", "#38a169", "#d69e2e", "#805ad5", "#dd6b20"];

    const resetGame = () => {
      s.playerLane = 1;
      s.targetX = LANE_X[1];
      s.px = LANE_X[1];
      s.speed = INITIAL_SPEED;
      s.distance = 0;
      s.lives = 3;
      s.score = 0;
      s.obstacles = [];
      s.coins = [];
      s.spawnTimer = 0;
      s.coinTimer = 0;
      s.invincible = 0;
      s.flash = 0;
      s.phase = "playing";
      setDisplayScore(0);
      setDisplayLives(3);
      setPhase("playing");
      const actx = ensureAudio();
      startEngine(actx);
    };

    const drawRoad = () => {
      // Sky / ground
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // Road surface
      ctx.fillStyle = "#2d2d2d";
      ctx.fillRect(35, 0, 230, H);

      // Road edges (white lines)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(33, 0, 3, H);
      ctx.fillRect(264, 0, 3, H);

      // Lane markings (dashed)
      s.roadY = (s.roadY + s.speed) % 40;
      ctx.strokeStyle = "#ffffff88";
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -s.roadY;
      for (const lx of [112, 188]) {
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    };

    const drawPlayerCar = () => {
      if (s.invincible > 0 && Math.floor(s.invincible * 8) % 2 === 0) return;
      const x = s.px;
      const y = H - 70;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(x, y + CAR_H / 2 + 5, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.roundRect(x - 15, y - 5, 30, 45, 4);
      ctx.fill();

      // Roof / cabin
      ctx.fillStyle = "#1e40af";
      ctx.beginPath();
      ctx.roundRect(x - 11, y + 5, 22, 18, 3);
      ctx.fill();

      // Windshield
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.roundRect(x - 9, y + 6, 18, 8, 2);
      ctx.fill();

      // Rear window
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.roundRect(x - 8, y + 28, 16, 6, 2);
      ctx.fill();

      // Headlights
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(x - 12, y - 5, 5, 4);
      ctx.fillRect(x + 7, y - 5, 5, 4);

      // Taillights
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x - 13, y + 36, 5, 4);
      ctx.fillRect(x + 8, y + 36, 5, 4);

      // Side mirrors
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(x - 17, y + 10, 3, 5);
      ctx.fillRect(x + 14, y + 10, 3, 5);
    };

    const drawObstacleCar = (o: Obstacle) => {
      const x = o.x;
      const y = o.y;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(x, y + CAR_H / 2 + 4, 17, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.roundRect(x - 14, y - 4, 28, 42, 4);
      ctx.fill();

      // Darken top half for variety
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.roundRect(x - 14, y - 4, 28, 20, [4, 4, 0, 0]);
      ctx.fill();

      // Windshield (from our perspective: rear window since facing us)
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(x - 9, y + 24, 18, 7, 2);
      ctx.fill();

      // Front (top from our view)
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(x - 8, y + 2, 16, 7, 2);
      ctx.fill();

      // Headlights (facing us = at bottom)
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(x - 11, y + 34, 5, 3);
      ctx.fillRect(x + 6, y + 34, 5, 3);

      // Taillights (at top facing away)
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x - 11, y - 3, 4, 3);
      ctx.fillRect(x + 7, y - 3, 4, 3);
    };

    const drawCoin = (c: Coin) => {
      if (c.collected) return;
      c.angle += 0.05;
      const x = c.x;
      const y = c.y;
      const scaleX = Math.abs(Math.cos(c.angle));

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scaleX, 1);

      // Outer ring
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, 0, COIN_R, 0, Math.PI * 2);
      ctx.fill();

      // Inner
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(0, 0, COIN_R - 2, 0, Math.PI * 2);
      ctx.fill();

      // Dollar sign
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0.5);

      ctx.restore();
    };

    const drawHUD = () => {
      // Score
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`Score: ${s.score}`, W / 2, 10);

      // Lives
      ctx.textAlign = "left";
      ctx.font = "14px system-ui";
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.lives ? "#ef4444" : "#4a4a4a";
        ctx.fillText("\u2764", 10 + i * 20, 12);
      }

      // Speed indicator
      ctx.textAlign = "right";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui";
      const mph = Math.floor(s.speed * 25);
      ctx.fillText(`${mph} mph`, W - 10, 14);
    };

    const drawIdleScreen = () => {
      drawRoad();

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Car Racing", W / 2, H / 2 - 60);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px system-ui";
      ctx.fillText("Dodge traffic & collect coins", W / 2, H / 2 - 25);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 16px system-ui";
      ctx.fillText("Press any key or tap to start", W / 2, H / 2 + 20);

      ctx.fillStyle = "#64748b";
      ctx.font = "12px system-ui";
      ctx.fillText("\u2190 \u2192 Arrow keys or buttons to steer", W / 2, H / 2 + 55);
      ctx.fillText("3 lanes \u2022 3 lives \u2022 speed increases", W / 2, H / 2 + 75);

      if (highScore > 0) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 13px system-ui";
        ctx.fillText(`High Score: ${highScore}`, W / 2, H / 2 + 110);
      }
    };

    const drawGameOver = () => {
      ctx.fillStyle = "rgba(220,38,38,0.35)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Game Over", W / 2, H / 2 - 50);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "18px system-ui";
      ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 10);

      const currentHigh = Math.max(highScore, s.score);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 14px system-ui";
      ctx.fillText(`High Score: ${currentHigh}`, W / 2, H / 2 + 20);

      if (s.score >= highScore && s.score > 0) {
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 14px system-ui";
        ctx.fillText("New High Score!", W / 2, H / 2 + 45);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px system-ui";
      ctx.fillText("Tap or press any key to retry", W / 2, H / 2 + 80);
    };

    const update = () => {
      if (s.phase !== "playing") return;

      // Movement
      const wantLeft = s.keys["ArrowLeft"] || s.moveLeft;
      const wantRight = s.keys["ArrowRight"] || s.moveRight;

      if (wantLeft && s.playerLane > 0) {
        if (Math.abs(s.px - s.targetX) < 2) {
          s.playerLane--;
          s.targetX = LANE_X[s.playerLane];
        }
      }
      if (wantRight && s.playerLane < 2) {
        if (Math.abs(s.px - s.targetX) < 2) {
          s.playerLane++;
          s.targetX = LANE_X[s.playerLane];
        }
      }

      // Smooth lane transition
      const dx = s.targetX - s.px;
      s.px += dx * 0.18;
      if (Math.abs(dx) < 0.5) s.px = s.targetX;

      // Speed increases over time
      s.speed = INITIAL_SPEED + s.distance * SPEED_INCREMENT;

      // Distance / score
      s.distance += s.speed * 0.1;
      s.score = Math.floor(s.distance);
      setDisplayScore(s.score);

      // Engine pitch
      if (s.engineOsc && s.audioCtx) {
        try {
          const freq = 55 + s.speed * 8;
          s.engineOsc.osc.frequency.setTargetAtTime(freq, s.audioCtx.currentTime, 0.1);
        } catch {}
      }

      // Invincibility countdown
      if (s.invincible > 0) s.invincible -= 1 / 60;

      // Spawn obstacles
      s.spawnTimer++;
      const spawnInterval = Math.max(SPAWN_MIN, SPAWN_BASE - s.distance * 0.03);
      if (s.spawnTimer >= spawnInterval) {
        s.spawnTimer = 0;
        const lane = Math.floor(Math.random() * 3);
        s.obstacles.push({
          x: LANE_X[lane],
          y: -50,
          lane,
          color: obstacleColors[Math.floor(Math.random() * obstacleColors.length)],
          style: Math.floor(Math.random() * 3),
        });
      }

      // Spawn coins
      s.coinTimer++;
      if (s.coinTimer >= COIN_SPAWN_BASE + Math.random() * 60) {
        s.coinTimer = 0;
        const lane = Math.floor(Math.random() * 3);
        // Avoid placing coin on top of an obstacle in the same lane
        const blocked = s.obstacles.some(o => o.lane === lane && o.y < 60 && o.y > -60);
        if (!blocked) {
          s.coins.push({
            x: LANE_X[lane],
            y: -20,
            lane,
            collected: false,
            angle: Math.random() * Math.PI * 2,
          });
        }
      }

      // Move obstacles
      for (const o of s.obstacles) o.y += s.speed;
      s.obstacles = s.obstacles.filter(o => o.y < H + 60);

      // Move coins
      for (const c of s.coins) c.y += s.speed;
      s.coins = s.coins.filter(c => c.y < H + 30 && !c.collected);

      const playerLeft = s.px - 14;
      const playerTop = H - 75;

      // Collision: obstacles
      if (s.invincible <= 0) {
        for (const o of s.obstacles) {
          const oLeft = o.x - 13;
          const oTop = o.y - 3;
          if (rectsOverlap(playerLeft, playerTop, 28, 44, oLeft, oTop, 26, 40)) {
            s.lives--;
            setDisplayLives(s.lives);
            // Remove the car we hit
            o.y = H + 100;

            if (s.audioCtx) playCrash(s.audioCtx);

            if (s.lives <= 0) {
              s.phase = "over";
              setPhase("over");
              stopEngine();
              // Save high score
              const newHigh = Math.max(highScore, s.score);
              if (newHigh > highScore) {
                setHighScore(newHigh);
                localStorage.setItem(LS_KEY, String(newHigh));
              }
              return;
            }
            s.invincible = 2;
            s.flash = 0.3;
            break;
          }
        }
      }

      // Collision: coins
      for (const c of s.coins) {
        if (c.collected) continue;
        const dist = Math.hypot(c.x - s.px, c.y - (H - 53));
        if (dist < COIN_R + 14) {
          c.collected = true;
          s.score += 10;
          s.distance += 10;
          setDisplayScore(s.score);
          if (s.audioCtx) playCoinSound(s.audioCtx);
        }
      }

      // Flash effect
      if (s.flash > 0) s.flash -= 1 / 60;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      if (s.phase === "idle") {
        drawIdleScreen();
        return;
      }

      drawRoad();

      // Draw coins
      for (const c of s.coins) drawCoin(c);

      // Draw obstacles
      for (const o of s.obstacles) drawObstacleCar(o);

      // Draw player
      drawPlayerCar();

      // Flash on hit
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,100,100,${s.flash})`;
        ctx.fillRect(0, 0, W, H);
      }

      drawHUD();

      if (s.phase === "over") {
        drawGameOver();
      }
    };

    const loop = () => {
      update();
      draw();
      s.anim = requestAnimationFrame(loop);
    };

    const handleAction = () => {
      if (s.phase === "idle") {
        resetGame();
      } else if (s.phase === "over") {
        resetGame();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      s.keys[e.code] = true;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
        e.preventDefault();
      }
      if (s.phase !== "playing") handleAction();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      s.keys[e.code] = false;
    };
    const onCanvasClick = () => {
      if (s.phase !== "playing") handleAction();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("click", onCanvasClick);

    s.anim = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(s.anim);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("click", onCanvasClick);
      stopEngine();
      if (s.audioCtx) {
        try { s.audioCtx.close(); } catch {}
        s.audioCtx = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMoveStart = useCallback((dir: "left" | "right") => {
    const s = stateRef.current;
    if (dir === "left") s.moveLeft = true;
    else s.moveRight = true;
    if (s.phase !== "playing") {
      s.phase = "playing";
      // Trigger start via the same mechanism
    }
  }, []);

  const handleMoveEnd = useCallback((dir: "left" | "right") => {
    const s = stateRef.current;
    if (dir === "left") s.moveLeft = false;
    else s.moveRight = false;
  }, []);

  const handleTapStart = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === "idle") {
      s.playerLane = 1;
      s.targetX = LANE_X[1];
      s.px = LANE_X[1];
      s.speed = INITIAL_SPEED;
      s.distance = 0;
      s.lives = 3;
      s.score = 0;
      s.obstacles = [];
      s.coins = [];
      s.spawnTimer = 0;
      s.coinTimer = 0;
      s.invincible = 0;
      s.flash = 0;
      s.phase = "playing";
      setDisplayScore(0);
      setDisplayLives(3);
      setPhase("playing");
      if (!s.audioCtx) {
        s.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (s.audioCtx.state === "suspended") s.audioCtx.resume();
      startEngine(s.audioCtx);
    } else if (s.phase === "over") {
      s.playerLane = 1;
      s.targetX = LANE_X[1];
      s.px = LANE_X[1];
      s.speed = INITIAL_SPEED;
      s.distance = 0;
      s.lives = 3;
      s.score = 0;
      s.obstacles = [];
      s.coins = [];
      s.spawnTimer = 0;
      s.coinTimer = 0;
      s.invincible = 0;
      s.flash = 0;
      s.phase = "playing";
      setDisplayScore(0);
      setDisplayLives(3);
      setPhase("playing");
      if (!s.audioCtx) {
        s.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (s.audioCtx.state === "suspended") s.audioCtx.resume();
      startEngine(s.audioCtx);
    }
  }, [startEngine]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: 16,
        userSelect: "none",
      }}
    >
      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: 300,
          fontSize: 13,
          color: "#94a3b8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span>
          Lives:{" "}
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ color: i < displayLives ? "#ef4444" : "#4a4a4a" }}>
              {"\u2764"}
            </span>
          ))}
        </span>
        <span>Score: {displayScore}</span>
        <span>Best: {highScore}</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 10,
          border: "2px solid #334155",
          background: "#1a1a2e",
          touchAction: "none",
        }}
        onClick={handleTapStart}
      />

      {/* Mobile controls */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 4,
        }}
      >
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            handleMoveStart("left");
            handleTapStart();
          }}
          onPointerUp={() => handleMoveEnd("left")}
          onPointerLeave={() => handleMoveEnd("left")}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            width: 80,
            height: 56,
            borderRadius: 12,
            border: "2px solid #475569",
            background: "linear-gradient(180deg, #334155 0%, #1e293b 100%)",
            color: "#e2e8f0",
            fontSize: 24,
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
          }}
          aria-label="Move left"
        >
          {"\u25C0"}
        </button>
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            handleMoveStart("right");
            handleTapStart();
          }}
          onPointerUp={() => handleMoveEnd("right")}
          onPointerLeave={() => handleMoveEnd("right")}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            width: 80,
            height: 56,
            borderRadius: 12,
            border: "2px solid #475569",
            background: "linear-gradient(180deg, #334155 0%, #1e293b 100%)",
            color: "#e2e8f0",
            fontSize: 24,
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
          }}
          aria-label="Move right"
        >
          {"\u25B6"}
        </button>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "#64748b",
          margin: 0,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Arrow keys or buttons to steer {"\u2022"} Collect coins for bonus points
      </p>
    </div>
  );
}
