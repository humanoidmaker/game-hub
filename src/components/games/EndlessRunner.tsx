import { useRef, useEffect, useState, useCallback } from "react";

// --------------- Audio helpers ---------------
function createJumpSound(actx: AudioContext) {
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, actx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, actx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + 0.2);
}

function createCrashSound(actx: AudioContext) {
  const buf = actx.createBufferSource();
  const buffer = actx.createBuffer(1, actx.sampleRate * 0.3, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  buf.buffer = buffer;
  const gain = actx.createGain();
  gain.gain.setValueAtTime(0.3, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.3);
  buf.connect(gain);
  gain.connect(actx.destination);
  buf.start();
}

// --------------- Types ---------------
interface Obstacle {
  x: number;
  w: number;
  h: number;
  y: number; // top of obstacle
  type: "cactus" | "bird";
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

interface GameState {
  started: boolean;
  dead: boolean;
  playerY: number;
  playerVY: number;
  ducking: boolean;
  obstacles: Obstacle[];
  clouds: Cloud[];
  speed: number;
  dist: number;
  highScore: number;
  spawnTimer: number;
  groundOffset: number;
  frameToggle: number;
  frameTimer: number;
}

const LS_KEY = "endless_runner_high";

// --------------- Constants ---------------
const W = 600;
const H = 300;
const GROUND_Y = H - 40; // top of ground
const PLAYER_X = 60;
const PLAYER_W = 24;
const PLAYER_H = 40;
const PLAYER_DUCK_H = 20;
const GRAVITY = 0.65;
const JUMP_VEL = -13;
const BASE_SPEED = 4.5;
const DAY_NIGHT_INTERVAL = 500;

export default function EndlessRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const actxRef = useRef<AudioContext | null>(null);
  const animRef = useRef(0);

  const [displayScore, setDisplayScore] = useState(0);
  const [displayHigh, setDisplayHigh] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  // Ensure AudioContext exists (needs user gesture)
  const ensureAudio = useCallback(() => {
    if (!actxRef.current) {
      actxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (actxRef.current.state === "suspended") {
      actxRef.current.resume();
    }
  }, []);

  // Reset / init game state
  const initState = useCallback((): GameState => {
    let hi = 0;
    try {
      hi = parseInt(localStorage.getItem(LS_KEY) || "0", 10) || 0;
    } catch {}
    const clouds: Cloud[] = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 20 + Math.random() * 60,
        w: 40 + Math.random() * 50,
        speed: 0.3 + Math.random() * 0.5,
      });
    }
    return {
      started: false,
      dead: false,
      playerY: GROUND_Y,
      playerVY: 0,
      ducking: false,
      obstacles: [],
      clouds,
      speed: BASE_SPEED,
      dist: 0,
      highScore: hi,
      spawnTimer: 0,
      groundOffset: 0,
      frameToggle: 0,
      frameTimer: 0,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const keys = keysRef.current;

    const s = initState();
    stateRef.current = s;
    setDisplayHigh(s.highScore);
    setDisplayScore(0);
    setGameOver(false);
    setStarted(false);

    // ---------- Drawing helpers ----------
    function dayNightT(dist: number): number {
      // Returns 0..1 where 0 = day, 1 = night
      const cycle = (dist % (DAY_NIGHT_INTERVAL * 2)) / DAY_NIGHT_INTERVAL;
      return cycle <= 1 ? cycle : 2 - cycle;
    }

    function lerpColor(
      r1: number, g1: number, b1: number,
      r2: number, g2: number, b2: number,
      t: number,
    ): string {
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return `rgb(${r},${g},${b})`;
    }

    function drawBackground(t: number) {
      // Sky gradient from day to night
      const skyColor = lerpColor(135, 206, 235, 15, 15, 40, t);
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, W, GROUND_Y);

      // Ground
      const groundColor = lerpColor(76, 153, 0, 30, 50, 20, t);
      ctx.fillStyle = groundColor;
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

      // Ground line
      const lineColor = lerpColor(60, 120, 0, 20, 40, 10, t);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      // Ground dashes (scrolling terrain)
      ctx.strokeStyle = lerpColor(90, 170, 20, 40, 60, 15, t);
      ctx.lineWidth = 1;
      const dashW = 20;
      const gap = 40;
      const offset = s.groundOffset % (dashW + gap);
      for (let x = -offset; x < W; x += dashW + gap) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 10);
        ctx.lineTo(x + dashW, GROUND_Y + 10);
        ctx.stroke();
      }
      for (let x = -offset + 15; x < W; x += dashW + gap + 10) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 22);
        ctx.lineTo(x + dashW * 0.6, GROUND_Y + 22);
        ctx.stroke();
      }
    }

    function drawClouds(t: number) {
      const cloudColor = lerpColor(255, 255, 255, 80, 80, 110, t);
      ctx.fillStyle = cloudColor;
      for (const c of s.clouds) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x - c.w * 0.2, c.y - 6, c.w * 0.3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(c.x + c.w * 0.2, c.y - 4, c.w * 0.25, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPlayer() {
      const isDucking = s.ducking;
      const ph = isDucking ? PLAYER_DUCK_H : PLAYER_H;
      const py = s.playerY - ph;
      const px = PLAYER_X;

      // Body rectangle
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(px, py, PLAYER_W, ph);

      // Head
      const headR = 6;
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(px + PLAYER_W / 2, py - headR + 2, headR, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + PLAYER_W - 6, py - headR + (isDucking ? 1 : 0), 4, 3);

      if (!isDucking) {
        // Legs (running animation)
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 3;
        const legY = py + ph;
        if (s.playerY < GROUND_Y) {
          // In air: legs tucked
          ctx.beginPath();
          ctx.moveTo(px + 6, legY);
          ctx.lineTo(px + 4, legY + 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + PLAYER_W - 6, legY);
          ctx.lineTo(px + PLAYER_W - 4, legY + 8);
          ctx.stroke();
        } else {
          // On ground: alternate
          const f = s.frameToggle;
          const spread = f === 0 ? 6 : -4;
          ctx.beginPath();
          ctx.moveTo(px + 8, legY);
          ctx.lineTo(px + 8 + spread, legY + 10);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px + PLAYER_W - 8, legY);
          ctx.lineTo(px + PLAYER_W - 8 - spread, legY + 10);
          ctx.stroke();
        }
      }
    }

    function drawObstacle(o: Obstacle, t: number) {
      if (o.type === "cactus") {
        const cactusColor = lerpColor(34, 139, 34, 20, 80, 20, t);
        ctx.fillStyle = cactusColor;
        // Main body
        ctx.fillRect(o.x + o.w / 2 - 5, o.y, 10, o.h);
        // Arms
        ctx.fillRect(o.x, o.y + o.h * 0.3, o.w, 6);
        // Arm verticals
        ctx.fillRect(o.x, o.y + o.h * 0.15, 6, o.h * 0.2);
        ctx.fillRect(o.x + o.w - 6, o.y + o.h * 0.15, 6, o.h * 0.2);
      } else {
        // Bird
        const birdColor = lerpColor(220, 50, 50, 180, 40, 40, t);
        ctx.fillStyle = birdColor;
        // Body
        ctx.fillRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10);
        // Wings (animated)
        const wingUp = s.frameToggle === 0;
        ctx.beginPath();
        ctx.moveTo(o.x + 5, o.y + o.h / 2);
        ctx.lineTo(o.x - 5, wingUp ? o.y - 5 : o.y + o.h + 3);
        ctx.lineTo(o.x + 12, o.y + o.h / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(o.x + o.w - 5, o.y + o.h / 2);
        ctx.lineTo(o.x + o.w + 5, wingUp ? o.y - 5 : o.y + o.h + 3);
        ctx.lineTo(o.x + o.w - 12, o.y + o.h / 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = "#fff";
        ctx.fillRect(o.x + o.w - 10, o.y + 5, 3, 3);
        // Beak
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(o.x + o.w - 2, o.y + 8, 5, 3);
      }
    }

    // ---------- Spawn obstacle ----------
    function spawnObstacle() {
      const r = Math.random();
      if (r < 0.45) {
        // Tall cactus (must jump)
        const h = 35 + Math.random() * 15;
        s.obstacles.push({
          x: W + 10,
          w: 24,
          h,
          y: GROUND_Y - h,
          type: "cactus",
        });
      } else if (r < 0.75) {
        // Low bird (must duck)
        s.obstacles.push({
          x: W + 10,
          w: 30,
          h: 18,
          y: GROUND_Y - PLAYER_H - 8,
          type: "bird",
        });
      } else {
        // Small cactus (can jump or sometimes duck)
        const h = 22 + Math.random() * 8;
        s.obstacles.push({
          x: W + 10,
          w: 18,
          h,
          y: GROUND_Y - h,
          type: "cactus",
        });
      }
    }

    // ---------- Collision ----------
    function checkCollision(): boolean {
      const isDucking = s.ducking;
      const ph = isDucking ? PLAYER_DUCK_H : PLAYER_H;
      const py = s.playerY - ph;
      const px = PLAYER_X;

      for (const o of s.obstacles) {
        if (
          px + PLAYER_W > o.x &&
          px < o.x + o.w &&
          py + ph > o.y &&
          py < o.y + o.h
        ) {
          return true;
        }
      }
      return false;
    }

    // ---------- Main loop ----------
    function loop() {
      const t = dayNightT(s.dist);

      // Draw background
      drawBackground(t);

      // Update & draw clouds (parallax)
      for (const c of s.clouds) {
        c.x -= c.speed * (s.started && !s.dead ? s.speed / BASE_SPEED : 0.3);
        if (c.x + c.w < 0) {
          c.x = W + c.w;
          c.y = 20 + Math.random() * 60;
        }
      }
      drawClouds(t);

      // ---------- Not started ----------
      if (!s.started) {
        drawPlayer();
        ctx.fillStyle = lerpColor(80, 80, 80, 180, 180, 200, t);
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("ENDLESS RUNNER", W / 2, H / 2 - 30);
        ctx.font = "15px system-ui, sans-serif";
        ctx.fillText("Press Space / Up to Start", W / 2, H / 2);
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("Space/Up = Jump  |  Down = Duck", W / 2, H / 2 + 25);
        if (s.highScore > 0) {
          ctx.fillText("Best: " + s.highScore, W / 2, H / 2 + 50);
        }
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      // ---------- Dead ----------
      if (s.dead) {
        // Draw obstacles and player frozen
        for (const o of s.obstacles) drawObstacle(o, t);
        drawPlayer();

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 30);

        ctx.fillStyle = "#fff";
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText("Score: " + Math.floor(s.dist), W / 2, H / 2);
        ctx.fillText("Best: " + s.highScore, W / 2, H / 2 + 24);

        ctx.fillStyle = "#aaa";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText("Tap or Press Space to Restart", W / 2, H / 2 + 55);

        animRef.current = requestAnimationFrame(loop);
        return;
      }

      // ---------- Active game ----------
      // Jump input
      if ((keys["Space"] || keys["ArrowUp"]) && s.playerY >= GROUND_Y) {
        s.playerVY = JUMP_VEL;
        ensureAudio();
        if (actxRef.current) createJumpSound(actxRef.current);
      }

      // Duck input
      s.ducking = !!(keys["ArrowDown"]) && s.playerY >= GROUND_Y;

      // Physics
      s.playerVY += GRAVITY;
      s.playerY += s.playerVY;
      if (s.playerY > GROUND_Y) {
        s.playerY = GROUND_Y;
        s.playerVY = 0;
      }

      // Speed & distance
      s.speed = BASE_SPEED + s.dist * 0.003;
      s.dist += s.speed * 0.06;
      s.groundOffset += s.speed;

      // Frame animation toggle
      s.frameTimer++;
      if (s.frameTimer > 8) {
        s.frameTimer = 0;
        s.frameToggle = s.frameToggle === 0 ? 1 : 0;
      }

      // Spawn
      s.spawnTimer++;
      const minGap = Math.max(40, 80 - s.dist * 0.02);
      if (s.spawnTimer > minGap + Math.random() * 30) {
        s.spawnTimer = 0;
        spawnObstacle();
      }

      // Update obstacles
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        s.obstacles[i].x -= s.speed;
        if (s.obstacles[i].x + s.obstacles[i].w < -20) {
          s.obstacles.splice(i, 1);
        }
      }

      // Draw obstacles
      for (const o of s.obstacles) drawObstacle(o, t);

      // Draw player
      drawPlayer();

      // Collision
      if (checkCollision()) {
        s.dead = true;
        setGameOver(true);
        if (s.dist > s.highScore) {
          s.highScore = Math.floor(s.dist);
          try {
            localStorage.setItem(LS_KEY, String(s.highScore));
          } catch {}
        }
        setDisplayHigh(s.highScore);
        ensureAudio();
        if (actxRef.current) createCrashSound(actxRef.current);
      }

      // HUD - Score
      ctx.fillStyle = lerpColor(50, 50, 50, 220, 220, 240, t);
      ctx.font = "bold 16px system-ui, monospace";
      ctx.textAlign = "right";
      ctx.fillText("Score: " + Math.floor(s.dist), W - 12, 24);
      ctx.font = "12px system-ui, monospace";
      ctx.fillStyle = lerpColor(100, 100, 100, 160, 160, 180, t);
      ctx.fillText("Best: " + s.highScore, W - 12, 42);

      setDisplayScore(Math.floor(s.dist));

      animRef.current = requestAnimationFrame(loop);
    }

    // ---------- Input handlers ----------
    function handleAction(action: "jump" | "duck" | "duckEnd") {
      ensureAudio();
      if (s.dead) {
        // Restart
        const hi = s.highScore;
        Object.assign(s, initState());
        s.highScore = hi;
        s.started = true;
        setGameOver(false);
        setStarted(true);
        return;
      }
      if (!s.started) {
        s.started = true;
        setStarted(true);
      }
      if (action === "jump") {
        keys["Space"] = true;
        setTimeout(() => (keys["Space"] = false), 100);
      } else if (action === "duck") {
        keys["ArrowDown"] = true;
      } else {
        keys["ArrowDown"] = false;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      keys[e.code] = true;

      if (s.dead && (e.code === "Space" || e.code === "ArrowUp")) {
        handleAction("jump");
        return;
      }
      if (!s.started) {
        s.started = true;
        setStarted(true);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keys[e.code] = false;
    }

    function onCanvasClick() {
      if (s.dead) {
        handleAction("jump");
      } else if (!s.started) {
        handleAction("jump");
      }
    }

    // Expose handleAction for mobile buttons
    (canvas as any).__handleAction = handleAction;

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("click", onCanvasClick);

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("click", onCanvasClick);
    };
  }, [initState, ensureAudio]);

  // Mobile button handlers
  const handleJump = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && (canvas as any).__handleAction) {
      (canvas as any).__handleAction("jump");
    }
  }, []);

  const handleDuckStart = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && (canvas as any).__handleAction) {
      (canvas as any).__handleAction("duck");
    }
  }, []);

  const handleDuckEnd = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && (canvas as any).__handleAction) {
      (canvas as any).__handleAction("duckEnd");
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 16,
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: W,
          maxWidth: "100%",
          fontSize: 13,
          color: "#888",
        }}
      >
        <span>Space/Up: Jump | Down: Duck</span>
        <span>
          Score: <b style={{ color: "#fff" }}>{displayScore}</b> | Best:{" "}
          <b style={{ color: "#f59e0b" }}>{displayHigh}</b>
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 8,
          maxWidth: "100%",
          cursor: "pointer",
          border: "1px solid #333",
        }}
      />

      {/* Mobile controls */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 4,
        }}
      >
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleJump();
          }}
          onClick={handleJump}
          style={{
            padding: "12px 32px",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          Jump
        </button>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleDuckStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleDuckEnd();
          }}
          onMouseDown={handleDuckStart}
          onMouseUp={handleDuckEnd}
          onMouseLeave={handleDuckEnd}
          style={{
            padding: "12px 32px",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            background: "#f59e0b",
            color: "#fff",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          Duck
        </button>
      </div>
    </div>
  );
}
