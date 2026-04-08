"use client";
import { useRef, useEffect, useState, useCallback } from "react";

const LANES = 4;
const LANE_KEYS = ["d", "f", "j", "k"];
const LANE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
const LANE_NAMES = ["D", "F", "J", "K"];
const HIT_Y = 440;
const NOTE_SPEED = 3;
const PERFECT_WINDOW = 20;
const GOOD_WINDOW = 40;

interface Note {
  lane: number;
  y: number;
  hit: boolean;
  result?: "perfect" | "good" | "miss";
  time: number;
}

interface Song {
  name: string;
  bpm: number;
  pattern: number[][];
}

const SONGS: Song[] = [
  {
    name: "Easy Beats",
    bpm: 100,
    pattern: (() => {
      const p: number[][] = [];
      for (let i = 0; i < 60; i++) {
        if (i % 4 === 0) p.push([0]);
        else if (i % 4 === 2) p.push([2]);
        else if (i % 8 === 1) p.push([1]);
        else if (i % 8 === 5) p.push([3]);
        else p.push([]);
      }
      return p;
    })(),
  },
  {
    name: "Rhythm Rush",
    bpm: 120,
    pattern: (() => {
      const p: number[][] = [];
      for (let i = 0; i < 80; i++) {
        if (i % 3 === 0) p.push([0, 2]);
        else if (i % 3 === 1) p.push([1]);
        else if (i % 6 === 2) p.push([3]);
        else if (i % 5 === 0) p.push([0, 1, 2, 3]);
        else p.push([]);
      }
      return p;
    })(),
  },
  {
    name: "Final Stage",
    bpm: 140,
    pattern: (() => {
      const p: number[][] = [];
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) p.push([i % 4]);
        else if (i % 4 === 1) p.push([(i + 1) % 4, (i + 2) % 4]);
        else if (i % 7 === 0) p.push([0, 1, 2, 3]);
        else p.push([]);
      }
      return p;
    })(),
  },
];

function playLaneSound(lane: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freqs = [262, 330, 392, 523];
    osc.frequency.setValueAtTime(freqs[lane], ctx.currentTime);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function getGrade(accuracy: number): { grade: string; color: string } {
  if (accuracy >= 95) return { grade: "S", color: "#ffd700" };
  if (accuracy >= 85) return { grade: "A", color: "#22c55e" };
  if (accuracy >= 70) return { grade: "B", color: "#3b82f6" };
  if (accuracy >= 50) return { grade: "C", color: "#f59e0b" };
  return { grade: "D", color: "#ef4444" };
}

export default function BeatCatcher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<"menu" | "play" | "results">("menu");
  const [songIdx, setSongIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [health, setHealth] = useState(100);
  const [perfects, setPerfects] = useState(0);
  const [goods, setGoods] = useState(0);
  const [misses, setMisses] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [lastHit, setLastHit] = useState<string>("");

  const gameRef = useRef<{
    notes: Note[];
    score: number;
    combo: number;
    maxCombo: number;
    health: number;
    perfects: number;
    goods: number;
    misses: number;
    totalNotes: number;
    running: boolean;
    frame: number;
    noteIdx: number;
    spawnTimer: number;
    laneFlash: number[];
  }>({
    notes: [], score: 0, combo: 0, maxCombo: 0, health: 100,
    perfects: 0, goods: 0, misses: 0, totalNotes: 0,
    running: false, frame: 0, noteIdx: 0, spawnTimer: 0, laneFlash: [0, 0, 0, 0],
  });

  const startSong = (idx: number) => {
    const song = SONGS[idx];
    const total = song.pattern.reduce((s, p) => s + p.length, 0);
    const g = gameRef.current;
    g.notes = [];
    g.score = 0; g.combo = 0; g.maxCombo = 0; g.health = 100;
    g.perfects = 0; g.goods = 0; g.misses = 0; g.totalNotes = total;
    g.running = true; g.frame = 0; g.noteIdx = 0; g.spawnTimer = 0;
    g.laneFlash = [0, 0, 0, 0];
    setSongIdx(idx);
    setScore(0); setCombo(0); setMaxCombo(0); setHealth(100);
    setPerfects(0); setGoods(0); setMisses(0); setTotalNotes(total);
    setLastHit("");
    setScreen("play");
  };

  useEffect(() => {
    if (screen !== "play") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const CW = 360, CH = 500;
    const LANE_W = CW / LANES;
    const song = SONGS[songIdx];
    const spawnInterval = Math.round(60 / (song.bpm / 60) * (60 / NOTE_SPEED) / song.pattern.length * 2);
    const g = gameRef.current;
    let animId: number;

    const handleKey = (e: KeyboardEvent) => {
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane === -1) return;
      e.preventDefault();
      playLaneSound(lane);
      g.laneFlash[lane] = 8;

      let closest: Note | null = null;
      let closestDist = Infinity;
      for (const n of g.notes) {
        if (n.lane !== lane || n.hit) continue;
        const dist = Math.abs(n.y - HIT_Y);
        if (dist < closestDist) { closest = n; closestDist = dist; }
      }

      if (closest && closestDist <= GOOD_WINDOW) {
        closest.hit = true;
        if (closestDist <= PERFECT_WINDOW) {
          closest.result = "perfect";
          g.perfects++;
          g.score += 100 * (1 + g.combo * 0.1);
          g.combo++;
          setLastHit("PERFECT");
        } else {
          closest.result = "good";
          g.goods++;
          g.score += 50 * (1 + g.combo * 0.05);
          g.combo++;
          setLastHit("GOOD");
        }
        if (g.combo > g.maxCombo) g.maxCombo = g.combo;
        g.health = Math.min(100, g.health + 2);
        setScore(Math.round(g.score));
        setCombo(g.combo);
        setMaxCombo(g.maxCombo);
        setPerfects(g.perfects);
        setGoods(g.goods);
        setHealth(g.health);
      }
    };

    window.addEventListener("keydown", handleKey);

    const loop = () => {
      if (!g.running) return;
      g.frame++;

      // Spawn notes
      g.spawnTimer++;
      if (g.spawnTimer >= spawnInterval && g.noteIdx < song.pattern.length) {
        g.spawnTimer = 0;
        const lanes = song.pattern[g.noteIdx];
        for (const lane of lanes) {
          g.notes.push({ lane, y: -20, hit: false, time: g.frame });
        }
        g.noteIdx++;
      }

      // Move notes
      for (const n of g.notes) {
        if (!n.hit) n.y += NOTE_SPEED;
        // Miss
        if (!n.hit && n.y > HIT_Y + GOOD_WINDOW + 10) {
          n.hit = true;
          n.result = "miss";
          g.misses++;
          g.combo = 0;
          g.health -= 8;
          setCombo(0);
          setMisses(g.misses);
          setHealth(Math.max(0, g.health));
          setLastHit("MISS");
        }
      }
      g.notes = g.notes.filter((n) => n.y < CH + 20 || !n.hit);

      // Lane flash decay
      for (let i = 0; i < LANES; i++) {
        if (g.laneFlash[i] > 0) g.laneFlash[i]--;
      }

      // End condition
      if (g.health <= 0 || (g.noteIdx >= song.pattern.length && g.notes.length === 0)) {
        g.running = false;
        setScreen("results");
        return;
      }

      // Draw
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, CW, CH);

      // Lane lines
      for (let i = 1; i < LANES; i++) {
        ctx.strokeStyle = "#1a1a3a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i * LANE_W, 0);
        ctx.lineTo(i * LANE_W, CH);
        ctx.stroke();
      }

      // Lane flash
      for (let i = 0; i < LANES; i++) {
        if (g.laneFlash[i] > 0) {
          ctx.fillStyle = `${LANE_COLORS[i]}${Math.round(g.laneFlash[i] * 3).toString(16).padStart(2, "0")}`;
          ctx.fillRect(i * LANE_W, 0, LANE_W, CH);
        }
      }

      // Hit line
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, HIT_Y);
      ctx.lineTo(CW, HIT_Y);
      ctx.stroke();

      // Hit zones
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = `${LANE_COLORS[i]}33`;
        ctx.fillRect(i * LANE_W + 4, HIT_Y - 6, LANE_W - 8, 12);
        ctx.strokeStyle = LANE_COLORS[i];
        ctx.lineWidth = 2;
        ctx.strokeRect(i * LANE_W + 4, HIT_Y - 6, LANE_W - 8, 12);
      }

      // Lane labels
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = LANE_COLORS[i];
        ctx.fillText(LANE_NAMES[i], i * LANE_W + LANE_W / 2, HIT_Y + 30);
      }

      // Notes
      for (const n of g.notes) {
        if (n.hit && n.result !== "miss") continue;
        if (n.hit) continue;
        const nx = n.lane * LANE_W + LANE_W / 2;
        const grad = ctx.createRadialGradient(nx, n.y, 5, nx, n.y, 18);
        grad.addColorStop(0, LANE_COLORS[n.lane]);
        grad.addColorStop(1, LANE_COLORS[n.lane] + "44");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(n.lane * LANE_W + 8, n.y - 10, LANE_W - 16, 20, 6);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Progress bar
      const progress = g.noteIdx / song.pattern.length;
      ctx.fillStyle = "#1a1a3a";
      ctx.fillRect(0, CH - 4, CW, 4);
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(0, CH - 4, CW * progress, 4);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKey);
    };
  }, [screen, songIdx]);

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20 }}>
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 8 }}>Beat Catcher</h1>
        <p style={{ color: "#888", marginBottom: 24 }}>Press D/F/J/K when notes hit the line!</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 300 }}>
          {SONGS.map((song, i) => (
            <button
              key={i}
              onClick={() => startSong(i)}
              style={{
                padding: "16px 24px", borderRadius: 12, border: "2px solid #333",
                background: card, color: "#fff", cursor: "pointer",
                fontSize: 16, fontWeight: 600, textAlign: "left",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
            >
              <div>{song.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{song.bpm} BPM</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          {LANE_KEYS.map((k, i) => (
            <div key={i} style={{ width: 36, height: 36, borderRadius: 8, background: LANE_COLORS[i] + "33", border: `2px solid ${LANE_COLORS[i]}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: LANE_COLORS[i], fontSize: 16 }}>
              {k.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "results") {
    const hitNotes = perfects + goods;
    const accuracy = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;
    const { grade, color } = getGrade(accuracy);
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 36, color: "#ccc", marginBottom: 8 }}>{SONGS[songIdx].name}</h1>
        <div style={{ fontSize: 80, fontWeight: 900, color, marginBottom: 8 }}>{grade}</div>
        <div style={{ background: card, borderRadius: 16, padding: 24, width: 280, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#888" }}>Score</span>
            <span style={{ color: accent, fontWeight: 700 }}>{score}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#888" }}>Max Combo</span>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>{maxCombo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#888" }}>Perfect</span>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>{perfects}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#888" }}>Good</span>
            <span style={{ color: "#3b82f6", fontWeight: 700 }}>{goods}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#888" }}>Miss</span>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>{misses}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888" }}>Accuracy</span>
            <span style={{ color, fontWeight: 700 }}>{accuracy}%</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => startSong(songIdx)} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>Retry</button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 28px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>Songs</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: 360, marginBottom: 8 }}>
        <div style={{ background: card, borderRadius: 8, padding: "4px 12px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>SCORE </span>
          <span style={{ color: accent, fontWeight: 700 }}>{score}</span>
        </div>
        <div style={{ background: card, borderRadius: 8, padding: "4px 12px" }}>
          <span style={{ color: "#888", fontSize: 11 }}>COMBO </span>
          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{combo}</span>
        </div>
        <div style={{ width: 80, background: "#333", borderRadius: 6, overflow: "hidden", height: 22, alignSelf: "center" }}>
          <div style={{ width: `${health}%`, height: "100%", background: health > 30 ? "#22c55e" : "#ef4444", transition: "width 0.3s" }} />
        </div>
      </div>
      {lastHit && (
        <div style={{ color: lastHit === "PERFECT" ? "#22c55e" : lastHit === "GOOD" ? "#3b82f6" : "#ef4444", fontWeight: 800, fontSize: 18, height: 24 }}>
          {lastHit}
        </div>
      )}
      <canvas ref={canvasRef} width={360} height={500} style={{ borderRadius: 12, border: "2px solid #222" }} />
    </div>
  );
}
