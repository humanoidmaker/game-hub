"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const PADS = [
  { color:"#ef4444", glow:"#fca5a5", freq:262, label:"C" },
  { color:"#3b82f6", glow:"#93c5fd", freq:294, label:"D" },
  { color:"#22c55e", glow:"#86efac", freq:330, label:"E" },
  { color:"#eab308", glow:"#fde047", freq:349, label:"F" },
  { color:"#a855f7", glow:"#c084fc", freq:392, label:"G" },
  { color:"#f97316", glow:"#fdba74", freq:440, label:"A" },
];

type Phase = "idle" | "playing" | "input" | "gameover";

export default function MusicMemory() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [status, setStatus] = useState("Press Start");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("musicmemory_high");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const playTone = useCallback((freq: number, dur = 300) => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur / 1000);
  }, []);

  const playSequence = useCallback(async (seq: number[]) => {
    setPhase("playing");
    setStatus("Watch...");
    const delay = seq.length > 8 ? 350 : 500;
    for (let i = 0; i < seq.length; i++) {
      await new Promise(r => setTimeout(r, 200));
      setActiveIdx(seq[i]);
      playTone(PADS[seq[i]].freq, delay - 50);
      await new Promise(r => setTimeout(r, delay));
      setActiveIdx(null);
    }
    setPhase("input");
    setStatus("Your turn!");
    setPlayerIdx(0);
  }, [playTone]);

  const startGame = () => {
    const first = [Math.floor(Math.random() * 6)];
    setSequence(first);
    setScore(0);
    playSequence(first);
  };

  const handlePadClick = (idx: number) => {
    if (phase !== "input") return;
    setActiveIdx(idx);
    playTone(PADS[idx].freq, 200);
    setTimeout(() => setActiveIdx(null), 200);

    if (idx === sequence[playerIdx]) {
      const nextIdx = playerIdx + 1;
      if (nextIdx >= sequence.length) {
        const newScore = sequence.length;
        setScore(newScore);
        if (newScore > highScore) { setHighScore(newScore); localStorage.setItem("musicmemory_high", String(newScore)); }
        const next = [...sequence, Math.floor(Math.random() * 6)];
        setSequence(next);
        setStatus("Correct! ✓");
        setTimeout(() => playSequence(next), 800);
      } else {
        setPlayerIdx(nextIdx);
      }
    } else {
      setPhase("gameover");
      setStatus("Wrong! ✗");
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.value = 150;
      g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:20, minHeight:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e0e0e0", background:"#0a0a1a" }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4, background:"linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Music Memory</div>
      <div style={{ fontSize:12, color:"#666", marginBottom:16 }}>Repeat the sequence!</div>

      <div style={{ display:"flex", gap:16, marginBottom:12, fontSize:13 }}>
        <span>Score: <b style={{ color:"#22c55e" }}>{score}</b></span>
        <span>Best: <b style={{ color:"#eab308" }}>{highScore}</b></span>
      </div>

      <div style={{ fontSize:16, fontWeight:600, color: phase === "gameover" ? "#ef4444" : phase === "input" ? "#22c55e" : "#6366f1", marginBottom:16, minHeight:24 }}>{status}</div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 100px)", gap:10, marginBottom:20 }}>
        {PADS.map((pad, i) => {
          const isActive = activeIdx === i;
          return (
            <button key={i} onClick={() => handlePadClick(i)} style={{
              width:100, height:100, borderRadius:16, border:"none", cursor: phase === "input" ? "pointer" : "default",
              background: isActive ? pad.glow : pad.color,
              boxShadow: isActive ? `0 0 30px ${pad.glow}, 0 0 60px ${pad.glow}44` : `0 4px 12px ${pad.color}44`,
              transform: isActive ? "scale(1.08)" : "scale(1)", transition:"all 0.12s",
              fontSize:14, fontWeight:700, color: isActive ? "#000" : "#fff", opacity: phase === "playing" ? 0.7 : 1,
            }}>
              {pad.label}
            </button>
          );
        })}
      </div>

      {(phase === "idle" || phase === "gameover") && (
        <button onClick={startGame} style={{ padding:"14px 40px", borderRadius:12, border:"none", background:"#6366f1", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer" }}>
          {phase === "gameover" ? "Play Again" : "Start"}
        </button>
      )}

      {phase === "gameover" && (
        <div style={{ marginTop:12, fontSize:14, color:"#888" }}>
          You reached level <b style={{ color:"#a855f7" }}>{score}</b>
          {score >= highScore && score > 0 && <span style={{ color:"#eab308", marginLeft:8 }}>🏆 New Record!</span>}
        </div>
      )}
    </div>
  );
}
