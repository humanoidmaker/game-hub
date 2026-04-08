"use client";
import { useRef, useEffect, useState, useCallback } from "react";

// --- Audio via Web Audio API ---
function createAudioCtx(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playWhoosh(ctx: AudioContext) {
  const dur = 0.15;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    d[i] = (Math.random() * 2 - 1) * (1 - t / dur) * 0.3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000;
  src.connect(hp).connect(ctx.destination);
  src.start();
}

function playThud(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function playCrunch(ctx: AudioContext) {
  const dur = 0.18;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / ctx.sampleRate;
    d[i] = (Math.random() * 2 - 1) * Math.sin(t * 600) * (1 - t / dur) * 0.35;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

function playClang(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 800;
  osc2.type = "sawtooth";
  osc2.frequency.value = 1200;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc2.start();
  osc.stop(ctx.currentTime + 0.4);
  osc2.stop(ctx.currentTime + 0.4);
}

// --- Constants ---
const W = 400;
const H = 500;
const CX = W / 2;
const CY = 180;
const LOG_R = 70;
const KNIFE_LEN = 38;
const KNIFE_BLADE = 22;
const KNIFE_HANDLE = 16;
const KNIFE_W = 3;
const THROW_SPEED = -12;
const HIT_THRESHOLD = 0.22; // radians
const BASE_KNIVES = 5;
const KNIFE_PER_KNIFE = 10;
const APPLE_BONUS = 50;

interface StuckKnife {
  angle: number; // angle relative to log (no rotation)
}

interface Apple {
  angle: number;
  collected: boolean;
}

interface FlyingKnife {
  y: number;
  vy: number;
}

export default function KnifeHit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [remaining, setRemaining] = useState(BASE_KNIVES);
  const [gameOver, setGameOver] = useState(false);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("knifehit_highscore");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const saveHighScore = useCallback((s: number) => {
    try {
      const prev = parseInt(localStorage.getItem("knifehit_highscore") || "0", 10);
      if (s > prev) {
        localStorage.setItem("knifehit_highscore", String(s));
        setHighScore(s);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;

    // Game state
    const state = {
      rotation: 0,
      rotSpeed: 0.018,
      rotDir: 1,
      knives: [] as StuckKnife[],
      apples: [] as Apple[],
      flying: null as FlyingKnife | null,
      score: 0,
      level: 1,
      remaining: BASE_KNIVES,
      dead: false,
      shakeFrames: 0,
      bossLevel: false,
      bossTimer: 0,
      bossFlipInterval: 120,
      levelTransition: 0, // frames of "Level X" splash
    };
    stateRef.current = state;

    function spawnApples() {
      state.apples = [];
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        let angle: number;
        let ok: boolean;
        let attempts = 0;
        do {
          angle = Math.random() * Math.PI * 2;
          ok = true;
          // avoid existing knives
          for (const k of state.knives) {
            const diff = Math.abs(((angle - k.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (diff < 0.4) { ok = false; break; }
          }
          // avoid other apples
          for (const a of state.apples) {
            const diff = Math.abs(((angle - a.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
            if (diff < 0.5) { ok = false; break; }
          }
          attempts++;
        } while (!ok && attempts < 30);
        state.apples.push({ angle, collected: false });
      }
    }

    function setupLevel() {
      state.knives = [];
      state.bossLevel = state.level % 5 === 0;
      state.bossTimer = 0;
      state.bossFlipInterval = Math.max(60, 150 - state.level * 5);

      // Rotation speed scales with level
      const baseSpeed = 0.018 + state.level * 0.004;
      state.rotSpeed = Math.min(baseSpeed, 0.07);
      state.rotDir = 1;

      // Knives needed
      state.remaining = BASE_KNIVES + Math.floor(state.level / 3);
      setRemaining(state.remaining);

      // Pre-placed knives on higher levels
      if (state.level > 2) {
        const pre = Math.min(Math.floor(state.level / 2), 5);
        for (let i = 0; i < pre; i++) {
          state.knives.push({ angle: (i / pre) * Math.PI * 2 });
        }
      }

      // Spawn apples
      spawnApples();

      state.levelTransition = 90;
    }

    setupLevel();

    // --- Drawing helpers ---
    function drawLog() {
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(state.rotation);

      // Outer bark
      ctx.beginPath();
      ctx.arc(0, 0, LOG_R, 0, Math.PI * 2);
      ctx.fillStyle = "#6B3A1F";
      ctx.fill();

      // Inner wood
      ctx.beginPath();
      ctx.arc(0, 0, LOG_R - 6, 0, Math.PI * 2);
      ctx.fillStyle = "#8B5A2B";
      ctx.fill();

      // Wood grain rings
      for (let r = 15; r < LOG_R - 6; r += 14) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(90,50,20,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Grain lines (radial cracks)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * (LOG_R - 12), Math.sin(a) * (LOG_R - 12));
        ctx.strokeStyle = "rgba(60,30,10,0.25)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#5A3210";
      ctx.fill();

      ctx.restore();
    }

    function drawStuckKnife(knifeAngle: number) {
      const angle = knifeAngle + state.rotation;
      // Blade tip goes into the log, handle sticks out
      const tipX = CX + Math.cos(angle) * (LOG_R - 8);
      const tipY = CY + Math.sin(angle) * (LOG_R - 8);
      const handleX = CX + Math.cos(angle) * (LOG_R + KNIFE_LEN - 8);
      const handleY = CY + Math.sin(angle) * (LOG_R + KNIFE_LEN - 8);
      const midX = CX + Math.cos(angle) * (LOG_R + KNIFE_BLADE - 8);
      const midY = CY + Math.sin(angle) * (LOG_R + KNIFE_BLADE - 8);

      // Blade
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(midX, midY);
      ctx.strokeStyle = "#C0C0C0";
      ctx.lineWidth = KNIFE_W;
      ctx.lineCap = "round";
      ctx.stroke();

      // Handle
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(handleX, handleY);
      ctx.strokeStyle = "#4A3728";
      ctx.lineWidth = KNIFE_W + 2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Pommel
      ctx.beginPath();
      ctx.arc(handleX, handleY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#333";
      ctx.fill();
    }

    function drawApple(apple: Apple) {
      if (apple.collected) return;
      const angle = apple.angle + state.rotation;
      const ax = CX + Math.cos(angle) * (LOG_R + 16);
      const ay = CY + Math.sin(angle) * (LOG_R + 16);

      // Apple body
      ctx.beginPath();
      ctx.arc(ax, ay, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#E53935";
      ctx.fill();
      ctx.strokeStyle = "#B71C1C";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Highlight
      ctx.beginPath();
      ctx.arc(ax - 2, ay - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fill();

      // Stem
      ctx.beginPath();
      ctx.moveTo(ax, ay - 8);
      ctx.lineTo(ax + 1, ay - 12);
      ctx.strokeStyle = "#4E342E";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Leaf
      ctx.beginPath();
      ctx.ellipse(ax + 3, ay - 11, 4, 2, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#43A047";
      ctx.fill();
    }

    function drawFlyingKnife(y: number) {
      // Blade (pointing up)
      ctx.beginPath();
      ctx.moveTo(CX, y);
      ctx.lineTo(CX, y + KNIFE_BLADE);
      ctx.strokeStyle = "#C0C0C0";
      ctx.lineWidth = KNIFE_W;
      ctx.lineCap = "round";
      ctx.stroke();

      // Handle
      ctx.beginPath();
      ctx.moveTo(CX, y + KNIFE_BLADE);
      ctx.lineTo(CX, y + KNIFE_LEN);
      ctx.strokeStyle = "#4A3728";
      ctx.lineWidth = KNIFE_W + 2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Pommel
      ctx.beginPath();
      ctx.arc(CX, y + KNIFE_LEN, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#333";
      ctx.fill();
    }

    function drawWaitingKnife() {
      const y = H - 90;
      drawFlyingKnife(y);
    }

    function drawRemainingKnives() {
      for (let i = 0; i < state.remaining; i++) {
        const x = 24;
        const y = H - 50 - i * 20;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.strokeStyle = i === 0 ? "#fff" : "#555";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "#fff" : "#555";
        ctx.fill();
      }
    }

    function drawHUD() {
      // Score
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(state.score), CX, H - 28);

      // Level badge
      const isBoss = state.bossLevel;
      ctx.fillStyle = isBoss ? "#FF6F00" : "#888";
      ctx.font = `bold 13px 'Segoe UI', system-ui, sans-serif`;
      ctx.textAlign = "center";
      const lvlText = isBoss ? `BOSS LV ${state.level}` : `LEVEL ${state.level}`;
      ctx.fillText(lvlText, CX, 24);

      // High score
      ctx.fillStyle = "#555";
      ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`BEST: ${Math.max(state.score, highScoreVal)}`, W - 12, 24);
    }

    let highScoreVal = 0;
    try {
      highScoreVal = parseInt(localStorage.getItem("knifehit_highscore") || "0", 10) || 0;
    } catch {}

    function drawGameOver() {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#EF4444";
      ctx.font = "bold 32px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", CX, CY - 10);

      ctx.fillStyle = "#aaa";
      ctx.font = "16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(`Score: ${state.score}`, CX, CY + 30);

      if (state.score >= highScoreVal) {
        ctx.fillStyle = "#FFC107";
        ctx.font = "bold 14px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText("NEW HIGH SCORE!", CX, CY + 55);
      }

      ctx.fillStyle = "#666";
      ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Tap to restart", CX, CY + 90);
    }

    function drawLevelSplash() {
      if (state.levelTransition <= 0) return;
      const alpha = Math.min(state.levelTransition / 30, 1) * 0.85;
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.5})`;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = state.bossLevel
        ? `rgba(255,111,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.font = "bold 30px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        state.bossLevel ? `BOSS LEVEL ${state.level}` : `LEVEL ${state.level}`,
        CX,
        CY
      );

      if (state.bossLevel) {
        ctx.fillStyle = `rgba(255,200,100,${alpha * 0.7})`;
        ctx.font = "14px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText("Log changes direction!", CX, CY + 30);
      }
    }

    // --- Main loop ---
    function loop() {
      // Shake offset
      let sx = 0, sy = 0;
      if (state.shakeFrames > 0) {
        sx = (Math.random() - 0.5) * 6;
        sy = (Math.random() - 0.5) * 6;
        state.shakeFrames--;
      }

      ctx.save();
      ctx.translate(sx, sy);

      // Background
      ctx.fillStyle = "#111118";
      ctx.fillRect(-5, -5, W + 10, H + 10);

      // Subtle radial gradient behind log
      const grad = ctx.createRadialGradient(CX, CY, 20, CX, CY, LOG_R + 80);
      grad.addColorStop(0, "rgba(60,30,10,0.15)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Level transition countdown
      if (state.levelTransition > 0) {
        state.levelTransition--;
      }

      // Rotation
      if (!state.dead) {
        state.rotation += state.rotSpeed * state.rotDir;

        // Boss: flip direction periodically
        if (state.bossLevel) {
          state.bossTimer++;
          if (state.bossTimer >= state.bossFlipInterval) {
            state.bossTimer = 0;
            state.rotDir *= -1;
          }
        }
      }

      // Draw log
      drawLog();

      // Draw apples
      for (const apple of state.apples) {
        drawApple(apple);
      }

      // Draw stuck knives
      for (const k of state.knives) {
        drawStuckKnife(k.angle);
      }

      // Flying knife
      if (state.flying) {
        state.flying.y += state.flying.vy;
        drawFlyingKnife(state.flying.y);

        // Check if reached log
        if (state.flying.y <= CY + LOG_R - 8) {
          // The knife arrives from below, pointing up => angle is -PI/2 relative to center
          // Adjust for current rotation
          const hitAngle = -Math.PI / 2 - state.rotation;
          // Normalize to [0, 2PI)
          const norm = ((hitAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

          // Check collision with existing knives
          let hitKnife = false;
          for (const k of state.knives) {
            const kn = ((k.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            let diff = Math.abs(norm - kn);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < HIT_THRESHOLD) {
              hitKnife = true;
              break;
            }
          }

          if (hitKnife) {
            // Game over
            state.dead = true;
            state.shakeFrames = 12;
            setGameOver(true);
            saveHighScore(state.score);
            if (audioRef.current) playClang(audioRef.current);
          } else {
            // Stick knife
            state.knives.push({ angle: norm });
            state.score += KNIFE_PER_KNIFE;
            state.remaining--;
            setScore(state.score);
            setRemaining(state.remaining);
            if (audioRef.current) playThud(audioRef.current);

            // Check apple collision
            for (const apple of state.apples) {
              if (apple.collected) continue;
              const an = ((apple.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              let diff = Math.abs(norm - an);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;
              if (diff < 0.3) {
                apple.collected = true;
                state.score += APPLE_BONUS;
                setScore(state.score);
                if (audioRef.current) playCrunch(audioRef.current);
              }
            }

            // Check level complete
            if (state.remaining <= 0) {
              state.level++;
              setLevel(state.level);
              setupLevel();
            }
          }

          state.flying = null;
        }
      }

      // Waiting knife at bottom
      if (!state.flying && !state.dead && state.levelTransition <= 0) {
        drawWaitingKnife();
      }

      // Remaining knives indicator
      drawRemainingKnives();

      // HUD
      drawHUD();

      // Level splash
      drawLevelSplash();

      // Game over overlay
      if (state.dead) {
        drawGameOver();
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);

    // Click / tap handler
    function onClick() {
      // Init audio on first interaction
      if (!audioRef.current) {
        audioRef.current = createAudioCtx();
      }

      if (state.dead) {
        // Restart
        state.dead = false;
        state.score = 0;
        state.level = 1;
        state.rotation = 0;
        state.flying = null;
        setScore(0);
        setLevel(1);
        setGameOver(false);
        setupLevel();
        return;
      }

      if (state.flying || state.levelTransition > 0) return;
      if (state.remaining <= 0) return;

      state.flying = { y: H - 90, vy: THROW_SPEED };
      if (audioRef.current) playWhoosh(audioRef.current);
    }

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      onClick();
    }, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", onClick);
    };
  }, [saveHighScore]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 10,
          width: W,
          justifyContent: "space-between",
        }}
      >
        <div style={{ color: "#888", fontSize: 12, fontFamily: "system-ui" }}>
          Tap/click to throw knife
        </div>
        <div
          style={{
            color: "#FFC107",
            fontSize: 12,
            fontFamily: "system-ui",
            fontWeight: 600,
          }}
        >
          HI: {highScore}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 12,
          cursor: "pointer",
          background: "#111118",
          display: "block",
          maxWidth: "100%",
          touchAction: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 10,
          color: "#666",
          fontSize: 12,
          fontFamily: "system-ui",
        }}
      >
        <span>
          Level <strong style={{ color: "#aaa" }}>{level}</strong>
        </span>
        <span>
          Knives left:{" "}
          <strong style={{ color: remaining <= 2 ? "#EF4444" : "#aaa" }}>
            {remaining}
          </strong>
        </span>
        <span>
          Score <strong style={{ color: "#aaa" }}>{score}</strong>
        </span>
      </div>
    </div>
  );
}
