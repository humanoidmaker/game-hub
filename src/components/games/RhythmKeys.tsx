import { useRef, useEffect, useState, useCallback } from "react";

interface Note { lane: number; y: number; hit: boolean; missed: boolean; }

interface Song { name: string; bpm: number; notes: { lane: number; beat: number }[]; }

const LANE_KEYS = ["d", "f", "j", "k"];
const LANE_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b"];
const LANE_W = 70;
const HIT_Y = 450;
const HIT_TOLERANCE = 30;

const SONGS: Song[] = [
  {
    name: "Simple Beat", bpm: 120,
    notes: [
      { lane: 0, beat: 0 }, { lane: 2, beat: 1 }, { lane: 1, beat: 2 }, { lane: 3, beat: 3 },
      { lane: 0, beat: 4 }, { lane: 1, beat: 4 }, { lane: 2, beat: 5 }, { lane: 3, beat: 6 },
      { lane: 0, beat: 7 }, { lane: 2, beat: 7 }, { lane: 1, beat: 8 }, { lane: 3, beat: 9 },
      { lane: 0, beat: 10 }, { lane: 1, beat: 11 }, { lane: 2, beat: 12 }, { lane: 3, beat: 13 },
      { lane: 0, beat: 14 }, { lane: 2, beat: 14 }, { lane: 1, beat: 15 }, { lane: 3, beat: 15 },
      { lane: 0, beat: 16 }, { lane: 1, beat: 17 }, { lane: 2, beat: 18 }, { lane: 3, beat: 19 },
      { lane: 0, beat: 20 }, { lane: 2, beat: 20 }, { lane: 1, beat: 21 }, { lane: 3, beat: 22 },
      { lane: 0, beat: 23 }, { lane: 1, beat: 23 }, { lane: 2, beat: 23 }, { lane: 3, beat: 24 },
    ],
  },
  {
    name: "Fast Melody", bpm: 150,
    notes: (() => {
      const n: { lane: number; beat: number }[] = [];
      for (let i = 0; i < 40; i++) {
        n.push({ lane: i % 4, beat: i * 0.75 });
        if (i % 3 === 0) n.push({ lane: (i + 2) % 4, beat: i * 0.75 + 0.25 });
      }
      return n;
    })(),
  },
  {
    name: "Chaos Mode", bpm: 180,
    notes: (() => {
      const n: { lane: number; beat: number }[] = [];
      for (let i = 0; i < 60; i++) {
        n.push({ lane: Math.floor(Math.random() * 4), beat: i * 0.5 });
        if (Math.random() > 0.5) n.push({ lane: Math.floor(Math.random() * 4), beat: i * 0.5 + 0.25 });
      }
      return n;
    })(),
  },
];

export default function RhythmKeys() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [health, setHealth] = useState(100);
  const [songIdx, setSongIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const stateRef = useRef({ score: 0, combo: 0, maxCombo: 0, health: 100, notes: [] as Note[], laneFlash: [0, 0, 0, 0], gameOver: false });

  const startSong = useCallback((idx: number) => {
    setSongIdx(idx); setPlaying(true); setGameOver(false);
    setScore(0); setCombo(0); setMaxCombo(0); setHealth(100);
    const s = stateRef.current;
    s.score = 0; s.combo = 0; s.maxCombo = 0; s.health = 100; s.gameOver = false;
    s.laneFlash = [0, 0, 0, 0];
    const song = SONGS[idx];
    const speedMult = [0.7, 1, 1.4][difficulty];
    const pixelsPerBeat = 60 * speedMult;
    s.notes = song.notes.map(n => ({ lane: n.lane, y: -n.beat * pixelsPerBeat - 200, hit: false, missed: false }));
  }, [difficulty]);

  useEffect(() => {
    if (!playing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = LANE_W * 4 + 20, H = 500;
    let anim = 0;
    const speedMult = [1.5, 2.5, 4][difficulty];
    const state = stateRef.current;

    const playHitSound = () => {
      try {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = "sine"; osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.08, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
        osc.start(); osc.stop(ac.currentTime + 0.08);
      } catch {}
    };

    const loop = () => {
      if (state.gameOver) { anim = requestAnimationFrame(loop); return; }

      ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, W, H);

      // Lane dividers
      for (let i = 0; i <= 4; i++) {
        ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10 + i * LANE_W, 0); ctx.lineTo(10 + i * LANE_W, H); ctx.stroke();
      }

      // Hit line
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, HIT_Y); ctx.lineTo(10 + 4 * LANE_W, HIT_Y); ctx.stroke();

      // Lane flashes
      for (let i = 0; i < 4; i++) {
        if (state.laneFlash[i] > 0) {
          state.laneFlash[i] -= 0.05;
          const alpha = Math.floor(state.laneFlash[i] * 40).toString(16).padStart(2, "0");
          ctx.fillStyle = `${LANE_COLORS[i]}${alpha}`;
          ctx.fillRect(10 + i * LANE_W, HIT_Y - 20, LANE_W, 40);
        }
      }

      // Notes
      let allDone = true;
      for (const note of state.notes) {
        note.y += speedMult;
        if (!note.hit && !note.missed) {
          allDone = false;
          if (note.y > HIT_Y + HIT_TOLERANCE + 20) {
            note.missed = true;
            state.combo = 0;
            state.health -= [3, 5, 8][difficulty];
            setCombo(0); setHealth(Math.max(0, state.health));
            if (state.health <= 0) { state.gameOver = true; setGameOver(true); }
          }
        }
        if (note.y < -30 || note.y > H + 30 || note.hit || note.missed) continue;

        const nx = 10 + note.lane * LANE_W + LANE_W / 2;
        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.roundRect(nx - LANE_W / 2 + 4, note.y - 10, LANE_W - 8, 20, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = LANE_COLORS[note.lane]; ctx.shadowBlur = 8;
        ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.roundRect(nx - LANE_W / 2 + 8, note.y - 6, LANE_W - 16, 12, 4);
        ctx.fill();
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

      if (allDone && !state.gameOver) { state.gameOver = true; setGameOver(true); }

      // Key labels
      ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = LANE_COLORS[i]; ctx.globalAlpha = 0.5;
        ctx.fillText(LANE_KEYS[i].toUpperCase(), 10 + i * LANE_W + LANE_W / 2, HIT_Y + 30);
        ctx.globalAlpha = 1;
      }

      // Health bar
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(10, H - 20, W - 20, 10);
      ctx.fillStyle = state.health > 50 ? "#22c55e" : state.health > 25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(10, H - 20, (W - 20) * (state.health / 100), 10);

      // Score
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`Score: ${state.score}`, 10, 20);
      if (state.combo > 1) { ctx.fillStyle = "#f59e0b"; ctx.fillText(`Combo x${state.combo}`, 10, 38); }

      anim = requestAnimationFrame(loop);
    };

    const onKey = (e: KeyboardEvent) => {
      const lane = LANE_KEYS.indexOf(e.key.toLowerCase());
      if (lane === -1 || state.gameOver) return;
      e.preventDefault();
      state.laneFlash[lane] = 1;

      let closest: Note | null = null, closestDist = Infinity;
      for (const note of state.notes) {
        if (note.lane !== lane || note.hit || note.missed) continue;
        const dist = Math.abs(note.y - HIT_Y);
        if (dist < HIT_TOLERANCE && dist < closestDist) { closest = note; closestDist = dist; }
      }
      if (closest) {
        closest.hit = true;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        const mult = Math.min(Math.floor(state.combo / 5) + 1, 4);
        state.score += 10 * mult;
        setScore(state.score); setCombo(state.combo); setMaxCombo(state.maxCombo);
        playHitSound();
      }
    };

    window.addEventListener("keydown", onKey);
    anim = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(anim); window.removeEventListener("keydown", onKey); };
  }, [playing, songIdx, difficulty]);

  if (!playing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh", color: "#fff" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Rhythm Keys</h2>
        <p style={{ color: "#888", marginBottom: 16, fontSize: 13 }}>Press D, F, J, K when notes reach the line</p>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#888", marginRight: 8 }}>Difficulty:</span>
          {["Easy", "Medium", "Hard"].map((d, i) => (
            <button key={d} onClick={() => setDifficulty(i)} style={{
              padding: "6px 16px", margin: "0 4px", borderRadius: 6, border: "none", cursor: "pointer",
              background: difficulty === i ? "#3b82f6" : "#1a1a2e", color: difficulty === i ? "#fff" : "#888", fontSize: 13,
            }}>{d}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 300 }}>
          {SONGS.map((s, i) => (
            <button key={i} onClick={() => startSong(i)} style={{
              padding: "12px 20px", background: "#1a1a2e", color: "#fff", border: "1px solid #333",
              borderRadius: 8, cursor: "pointer", fontSize: 15, textAlign: "left",
            }}>
              <div style={{ fontWeight: "bold" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{s.bpm} BPM - {s.notes.length} notes</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh", color: "#fff" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Rhythm Keys</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>{SONGS[songIdx].name} - D F J K</p>
      <canvas ref={canvasRef} width={LANE_W * 4 + 20} height={500} style={{ borderRadius: 8 }} />
      {gameOver && (
        <div style={{ marginTop: 16, textAlign: "center", padding: 16, background: "#1a1a2e", borderRadius: 8, minWidth: 280 }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: health <= 0 ? "#ef4444" : "#22c55e" }}>
            {health <= 0 ? "Failed!" : "Song Complete!"}
          </div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 8 }}>Score: {score} | Max Combo: {maxCombo}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button onClick={() => startSong(songIdx)} style={{ padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Retry</button>
            <button onClick={() => { setPlaying(false); setGameOver(false); }} style={{ padding: "8px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Songs</button>
          </div>
        </div>
      )}
    </div>
  );
}
