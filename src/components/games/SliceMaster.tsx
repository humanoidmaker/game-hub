import { useRef, useEffect, useState, useCallback } from "react";

const FRUITS = ["🍎", "🍊", "🍋", "🍇", "🍉", "🍓", "🍑", "🍌"];
const BOMB = "💣";
const W = 400;
const H = 500;
const GRAVITY = 0.25;
const FRUIT_RADIUS = 22;
const SLICE_DIST = 30;
const MAX_LIVES = 3;
const LS_KEY = "slicemaster_highscore";

interface FruitObj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  isBomb: boolean;
  sliced: boolean;
  alpha: number;
  splitAngle: number;
  splitOffset: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

function getHighScore(): number {
  try {
    return parseInt(localStorage.getItem(LS_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function setHighScore(v: number) {
  try {
    localStorage.setItem(LS_KEY, String(v));
  } catch {}
}

/* ---------- Web Audio sounds ---------- */
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playSliceSound() {
  try {
    const ctx = getAudioCtx();
    const dur = 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playBombSound() {
  try {
    const ctx = getAudioCtx();
    const dur = 0.5;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + dur);
  } catch {}
}

export default function SliceMaster() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<"start" | "playing" | "over">("start");
  const [screen, setScreen] = useState<"start" | "playing" | "over">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHS] = useState(0);
  const animRef = useRef(0);

  useEffect(() => {
    setHS(getHighScore());
  }, []);

  /* ---------- game loop ---------- */
  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    stateRef.current = "playing";
    setScreen("playing");
    setScore(0);

    let sc = 0;
    let lives = MAX_LIVES;
    let combo = 0;
    let comboTimer = 0;
    const fruits: FruitObj[] = [];
    let trail: TrailPoint[] = [];
    let slicing = false;
    let prevMouse: { x: number; y: number } | null = null;
    let frameCount = 0;
    let spawnTimer = 0;
    let gameOver = false;

    const spawnInterval = () => Math.max(18, 50 - Math.floor(frameCount / 300));

    const spawn = () => {
      const count = 1 + (Math.random() < 0.3 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const isBomb = Math.random() < 0.12;
        fruits.push({
          x,
          y: H + 30,
          vx: (Math.random() - 0.5) * 4,
          vy: -(11 + Math.random() * 3),
          emoji: isBomb ? BOMB : FRUITS[Math.floor(Math.random() * FRUITS.length)],
          isBomb,
          sliced: false,
          alpha: 1,
          splitAngle: Math.random() * Math.PI,
          splitOffset: 0,
        });
      }
    };

    const endGame = (bomb: boolean) => {
      gameOver = true;
      stateRef.current = "over";
      if (bomb) playBombSound();
      if (sc > getHighScore()) setHighScore(sc);
      setHS(Math.max(sc, getHighScore()));
      setScreen("over");
    };

    /* Slice detection: line segment vs circle */
    const segIntersectsCircle = (
      ax: number, ay: number,
      bx: number, by: number,
      cx: number, cy: number,
      r: number
    ): boolean => {
      const dx = bx - ax;
      const dy = by - ay;
      const fx = ax - cx;
      const fy = ay - cy;
      const a = dx * dx + dy * dy;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - r * r;
      let disc = b * b - 4 * a * c;
      if (disc < 0) return false;
      disc = Math.sqrt(disc);
      const t1 = (-b - disc) / (2 * a);
      const t2 = (-b + disc) / (2 * a);
      return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
    };

    const checkSlice = (x: number, y: number) => {
      if (!prevMouse) {
        prevMouse = { x, y };
        return;
      }
      let slicedAny = false;
      for (const f of fruits) {
        if (f.sliced) continue;
        if (segIntersectsCircle(prevMouse.x, prevMouse.y, x, y, f.x, f.y, SLICE_DIST)) {
          if (f.isBomb) {
            endGame(true);
            return;
          }
          f.sliced = true;
          f.splitAngle = Math.atan2(y - prevMouse.y, x - prevMouse.x) + Math.PI / 2;
          slicedAny = true;
          playSliceSound();
        }
      }
      if (slicedAny) {
        combo++;
        comboTimer = 60;
        const bonus = combo > 1 ? combo : 1;
        sc += bonus;
        setScore(sc);
      }
      prevMouse = { x, y };
    };

    /* --- Input handlers --- */
    const getPos = (e: MouseEvent | TouchEvent) => {
      const r = canvas.getBoundingClientRect();
      const t = "touches" in e ? e.touches[0] || (e as TouchEvent).changedTouches[0] : (e as MouseEvent);
      return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height) };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      slicing = true;
      prevMouse = null;
      const p = getPos(e);
      trail = [{ x: p.x, y: p.y, age: 0 }];
      checkSlice(p.x, p.y);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!slicing) return;
      const p = getPos(e);
      trail.push({ x: p.x, y: p.y, age: 0 });
      checkSlice(p.x, p.y);
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      slicing = false;
      prevMouse = null;
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });

    /* --- Render loop --- */
    const loop = () => {
      frameCount++;

      /* --- Background --- */
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      if (gameOver) {
        cancelAnimationFrame(animRef.current);
        return;
      }

      /* --- Spawn --- */
      spawnTimer++;
      if (spawnTimer >= spawnInterval()) {
        spawn();
        spawnTimer = 0;
      }

      /* --- Update & draw fruits --- */
      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        f.x += f.vx;
        f.vy += GRAVITY;
        f.y += f.vy;

        if (f.sliced) {
          f.splitOffset += 1.5;
          f.alpha -= 0.025;
          if (f.alpha <= 0) {
            fruits.splice(i, 1);
            continue;
          }
        } else if (f.y > H + 40) {
          fruits.splice(i, 1);
          if (!f.isBomb) {
            lives--;
            if (lives <= 0) {
              endGame(false);
              break;
            }
          }
          continue;
        }

        /* Draw fruit (or halves if sliced) */
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.font = "36px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (f.sliced) {
          const dx = Math.cos(f.splitAngle) * f.splitOffset;
          const dy = Math.sin(f.splitAngle) * f.splitOffset;
          /* left half */
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          ctx.clip();
          ctx.translate(f.x - dx, f.y - dy);
          ctx.fillText(f.emoji, 0, 0);
          ctx.restore();
          /* right half */
          ctx.save();
          ctx.globalAlpha = f.alpha;
          ctx.translate(f.x + dx, f.y + dy);
          ctx.fillText(f.emoji, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(f.emoji, f.x, f.y);
          /* shadow glow for bombs */
          if (f.isBomb) {
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 12;
            ctx.fillText(f.emoji, f.x, f.y);
            ctx.shadowBlur = 0;
          }
        }
        ctx.restore();
      }

      /* --- Trail --- */
      for (const t of trail) t.age++;
      trail = trail.filter((t) => t.age < 12);
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const t = trail[i];
          const p = trail[i - 1];
          const a = Math.max(0, 1 - t.age / 12);
          ctx.strokeStyle = `rgba(255,255,255,${(a * 0.7).toFixed(2)})`;
          ctx.lineWidth = 3 * a + 1;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      }

      /* --- Combo display --- */
      if (comboTimer > 0) {
        comboTimer--;
        if (combo > 1) {
          ctx.globalAlpha = Math.min(1, comboTimer / 20);
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 20px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${combo}x COMBO!`, W / 2, 60);
          ctx.globalAlpha = 1;
        }
        if (comboTimer <= 0) combo = 0;
      }

      /* --- HUD --- */
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${sc}`, 12, 28);
      ctx.textAlign = "right";
      ctx.fillStyle = "#f87171";
      ctx.fillText("❤".repeat(lives), W - 12, 28);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
    };
  }, []);

  /* ---- Screens ---- */
  const overlay = (children: React.ReactNode) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.88)",
        borderRadius: 12,
        zIndex: 2,
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          width: W,
          height: H,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 30px rgba(0,0,0,0.5)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            display: "block",
            width: W,
            height: H,
            borderRadius: 12,
            cursor: "crosshair",
            touchAction: "none",
          }}
        />

        {screen === "start" &&
          overlay(
            <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🔪🍉</div>
              <h2
                style={{
                  color: "#f1f5f9",
                  fontSize: 28,
                  fontWeight: 800,
                  margin: "0 0 6px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Slice Master
              </h2>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: 14,
                  margin: "0 0 4px",
                  textAlign: "center",
                  lineHeight: 1.5,
                  padding: "0 32px",
                }}
              >
                Swipe to slice fruits. Avoid bombs!
              </p>
              <p
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  margin: "0 0 20px",
                }}
              >
                High Score: {highScore}
              </p>
              <button
                onClick={startGame}
                style={{
                  padding: "10px 36px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Play
              </button>
            </>
          )}

        {screen === "over" &&
          overlay(
            <>
              <div style={{ fontSize: 44, marginBottom: 8 }}>💥</div>
              <h2
                style={{
                  color: "#f87171",
                  fontSize: 26,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Game Over
              </h2>
              <p
                style={{
                  color: "#e2e8f0",
                  fontSize: 18,
                  margin: "0 0 4px",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Score: {score}
              </p>
              <p
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  margin: "0 0 20px",
                }}
              >
                Best: {highScore}
              </p>
              <button
                onClick={startGame}
                style={{
                  padding: "10px 36px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                Play Again
              </button>
            </>
          )}
      </div>
      <p
        style={{
          color: "#64748b",
          fontSize: 12,
          marginTop: 10,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Drag to slice &bull; 💣 = game over &bull; Combo for bonus points
      </p>
    </div>
  );
}
