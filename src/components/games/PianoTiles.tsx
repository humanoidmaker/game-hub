import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 4;
const W = 300;
const H = 500;
const COL_W = W / COLS;
const NOTE_FREQS = [261.63, 329.63, 392.0, 493.88]; // C4, E4, G4, B4
const BUZZ_FREQ = 80;
const LS_KEY = "piano_tiles_hiscore";
const MODES = ["Classic", "Arcade", "Zen"] as const;
type Mode = (typeof MODES)[number];

interface Tile {
  id: number;
  col: number;
  y: number;
  h: number;
  hit: boolean;
  missed: boolean;
}

function getHighScore(): Record<Mode, number> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { Classic: 0, Arcade: 0, Zen: 0 };
}

function saveHighScore(mode: Mode, score: number) {
  try {
    const hs = getHighScore();
    if (score > (hs[mode] || 0)) {
      hs[mode] = score;
      localStorage.setItem(LS_KEY, JSON.stringify(hs));
    }
  } catch {}
}

let audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playNote(freq: number, duration = 0.18) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playBuzz() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = BUZZ_FREQ;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

export default function PianoTiles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    tiles: [] as Tile[],
    speed: 2,
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectBonus: 0,
    dead: false,
    started: false,
    nextId: 0,
    spawnY: 0,
    mode: "Classic" as Mode,
    arcadeTimer: 30,
    lastTime: 0,
    level: 1,
  });
  const animRef = useRef(0);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScores, setHighScores] = useState<Record<Mode, number>>(getHighScore);
  const [mode, setMode] = useState<Mode>("Classic");
  const [phase, setPhase] = useState<"menu" | "play" | "over">("menu");
  const [arcadeTime, setArcadeTime] = useState(30);
  const [finalScore, setFinalScore] = useState(0);

  const getTileH = useCallback((level: number) => {
    return Math.max(50, 100 - (level - 1) * 5);
  }, []);

  const startGame = useCallback(
    (m: Mode) => {
      const s = stateRef.current;
      s.tiles = [];
      s.speed = 2;
      s.score = 0;
      s.combo = 0;
      s.maxCombo = 0;
      s.perfectBonus = 0;
      s.dead = false;
      s.started = false;
      s.nextId = 0;
      s.mode = m;
      s.arcadeTimer = 30;
      s.lastTime = 0;
      s.level = 1;

      const tileH = getTileH(1);
      s.spawnY = -tileH;
      for (let i = 0; i < 6; i++) {
        const col = Math.floor(Math.random() * COLS);
        s.tiles.push({ id: s.nextId++, col, y: s.spawnY, h: tileH, hit: false, missed: false });
        s.spawnY -= tileH;
      }

      setScore(0);
      setCombo(0);
      setArcadeTime(30);
      setMode(m);
      setPhase("play");
    },
    [getTileH]
  );

  const endGame = useCallback((s: typeof stateRef.current) => {
    s.dead = true;
    const total = s.score + s.perfectBonus;
    setFinalScore(total);
    saveHighScore(s.mode, total);
    setHighScores(getHighScore());
    setPhase("over");
  }, []);

  useEffect(() => {
    if (phase !== "play") {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;
    s.lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - s.lastTime) / 1000;
      s.lastTime = now;

      // Dark background
      ctx.fillStyle = "#111118";
      ctx.fillRect(0, 0, W, H);

      // Column lines
      for (let i = 1; i < COLS; i++) {
        ctx.strokeStyle = "#222230";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i * COL_W, 0);
        ctx.lineTo(i * COL_W, H);
        ctx.stroke();
      }

      // Bottom target line
      ctx.strokeStyle = "#444460";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H - 60);
      ctx.lineTo(W, H - 60);
      ctx.stroke();

      if (s.started && !s.dead) {
        // Arcade timer
        if (s.mode === "Arcade") {
          s.arcadeTimer -= dt;
          setArcadeTime(Math.max(0, Math.ceil(s.arcadeTimer)));
          if (s.arcadeTimer <= 0) {
            endGame(s);
            return;
          }
        }

        // Move tiles
        for (const t of s.tiles) t.y += s.speed;

        // Check missed tiles (only fail in Classic/Arcade)
        for (const t of s.tiles) {
          if (!t.hit && !t.missed && t.y > H) {
            t.missed = true;
            if (s.mode !== "Zen") {
              playBuzz();
              endGame(s);
              return;
            }
          }
        }

        // Clean up off-screen tiles
        s.tiles = s.tiles.filter((t) => t.y < H + 120);

        // Spawn more
        const tileH = getTileH(s.level);
        const topTile = s.tiles.reduce((min, t) => (t.y < min ? t.y : min), Infinity);
        if (topTile > -tileH) {
          s.spawnY = topTile - tileH;
          const col = Math.floor(Math.random() * COLS);
          s.tiles.push({ id: s.nextId++, col, y: s.spawnY, h: tileH, hit: false, missed: false });
        }

        // Speed and level increase
        s.level = 1 + Math.floor(s.score / 15);
        s.speed = 2 + s.score * 0.06;
      }

      // Draw tiles
      for (const t of s.tiles) {
        if (t.y > H + t.h || t.y + t.h < 0) continue;
        const x = t.col * COL_W;
        if (t.hit) {
          ctx.fillStyle = "#22c55e";
        } else if (t.missed) {
          ctx.fillStyle = "#ef4444";
        } else {
          ctx.fillStyle = "#e8e8e8";
        }
        const r = 4;
        const tx = x + 2;
        const ty = t.y + 1;
        const tw = COL_W - 4;
        const th = t.h - 2;
        ctx.beginPath();
        ctx.moveTo(tx + r, ty);
        ctx.lineTo(tx + tw - r, ty);
        ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
        ctx.lineTo(tx + tw, ty + th - r);
        ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - r, ty + th);
        ctx.lineTo(tx + r, ty + th);
        ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - r);
        ctx.lineTo(tx, ty + r);
        ctx.quadraticCurveTo(tx, ty, tx + r, ty);
        ctx.closePath();
        ctx.fill();
      }

      // Tap to start prompt
      if (!s.started) {
        ctx.fillStyle = "#ffffffcc";
        ctx.font = "bold 16px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Tap a tile to start!", W / 2, H / 2);
      }

      // HUD: score top-center
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(String(s.score), W / 2, 32);

      // Combo indicator
      if (s.combo >= 3) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 14px system-ui";
        ctx.fillText(`${s.combo}x Combo!`, W / 2, 54);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    const onClick = (e: MouseEvent) => {
      if (s.dead) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const col = Math.floor(mx / COL_W);

      let hitTile = false;
      // Find the lowest (highest y) unhit tile in the clicked column within click range
      let best: Tile | null = null;
      for (const t of s.tiles) {
        if (t.hit || t.missed || t.col !== col) continue;
        if (my >= t.y && my <= t.y + t.h) {
          if (!best || t.y > best.y) best = t;
        }
      }
      if (best) {
        best.hit = true;
        s.score++;
        s.combo++;
        if (s.combo > s.maxCombo) s.maxCombo = s.combo;
        // Perfect accuracy bonus: every 10 combo, +5 bonus points
        if (s.combo > 0 && s.combo % 10 === 0) {
          s.perfectBonus += 5;
        }
        setScore(s.score);
        setCombo(s.combo);
        hitTile = true;
        if (!s.started) s.started = true;
        playNote(NOTE_FREQS[col] || 261.63, 0.2);
      }

      if (!hitTile && s.started) {
        s.combo = 0;
        setCombo(0);
        if (s.mode !== "Zen") {
          playBuzz();
          endGame(s);
        }
      }
    };

    canvas.addEventListener("click", onClick);
    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("click", onClick);
    };
  }, [phase, endGame, getTileH]);

  // --- STYLES ---
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    fontFamily: "system-ui, sans-serif",
    color: "#e0e0e0",
    minHeight: 540,
  };

  const btnStyle = (bg: string): React.CSSProperties => ({
    padding: "10px 28px",
    fontSize: 15,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    background: bg,
    color: "#fff",
    marginBottom: 8,
    width: 200,
    transition: "opacity 0.15s",
  });

  // --- MENU ---
  if (phase === "menu") {
    return (
      <div style={containerStyle}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 4,
            letterSpacing: -1,
            color: "#fff",
          }}
        >
          Piano Tiles
        </div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
          Tap the tiles. Don't miss!
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <button style={btnStyle("#3b82f6")} onClick={() => startGame("Classic")}>
            Classic (Endless)
          </button>
          <button style={btnStyle("#8b5cf6")} onClick={() => startGame("Arcade")}>
            Arcade (30s)
          </button>
          <button style={btnStyle("#10b981")} onClick={() => startGame("Zen")}>
            Zen (No Fail)
          </button>
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: "#666", textAlign: "center" }}>
          <div style={{ marginBottom: 4, fontWeight: 700, color: "#888" }}>High Scores</div>
          {MODES.map((m) => (
            <div key={m}>
              {m}: {highScores[m] || 0}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- GAME OVER ---
  if (phase === "over") {
    const s = stateRef.current;
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>
          {mode === "Arcade" && s.arcadeTimer <= 0 ? "Time's Up!" : mode === "Zen" ? "Done!" : "Game Over!"}
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", margin: "8px 0" }}>
          {finalScore}
        </div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
          Tiles: {s.score} | Bonus: {s.perfectBonus} | Best Combo: {s.maxCombo}x
        </div>
        <div style={{ fontSize: 13, color: "#fbbf24", marginBottom: 16 }}>
          High Score ({mode}): {highScores[mode] || 0}
        </div>
        <button style={btnStyle("#3b82f6")} onClick={() => startGame(mode)}>
          Play Again
        </button>
        <button
          style={{ ...btnStyle("#333"), color: "#aaa" }}
          onClick={() => setPhase("menu")}
        >
          Menu
        </button>
      </div>
    );
  }

  // --- PLAYING ---
  return (
    <div style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: W,
          marginBottom: 6,
          fontSize: 13,
        }}
      >
        <span style={{ color: "#888" }}>
          {mode}
          {mode === "Arcade" ? ` | ${arcadeTime}s` : ""}
        </span>
        <span style={{ color: "#fbbf24", fontWeight: 700 }}>
          {combo >= 3 ? `${combo}x` : ""}
        </span>
        <span style={{ color: "#888" }}>Score: {score}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 10, cursor: "pointer", display: "block" }}
      />
      <button
        style={{
          marginTop: 10,
          padding: "6px 20px",
          fontSize: 12,
          border: "1px solid #333",
          borderRadius: 6,
          background: "transparent",
          color: "#666",
          cursor: "pointer",
        }}
        onClick={() => {
          stateRef.current.dead = true;
          setPhase("menu");
        }}
      >
        Back to Menu
      </button>
    </div>
  );
}
