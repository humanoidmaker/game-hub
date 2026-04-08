"use client";
import { useState, useEffect, useCallback } from "react";

function shuffle<T>(a: T[]): T[] { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }

export default function JigsawPuzzle() {
  const [size, setSize] = useState(3);
  const [tiles, setTiles] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<Record<number, { moves: number; time: number }>>({});

  const total = size * size;
  const cellSize = size <= 3 ? 90 : size <= 4 ? 72 : 58;

  const initGame = useCallback((s: number) => {
    const solved = Array.from({ length: s * s }, (_, i) => i);
    let shuffled: number[];
    do { shuffled = shuffle(solved); } while (shuffled.every((v, i) => v === i));
    setTiles(shuffled);
    setSelected(null);
    setMoves(0);
    setTimer(0);
    setStarted(false);
    setWon(false);
  }, []);

  useEffect(() => { initGame(size); }, [size, initGame]);

  useEffect(() => {
    if (!started || won) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [started, won]);

  const handleClick = (idx: number) => {
    if (won) return;
    if (!started) setStarted(true);
    if (selected === null) {
      setSelected(idx);
    } else {
      if (selected === idx) { setSelected(null); return; }
      const next = [...tiles];
      [next[selected], next[idx]] = [next[idx], next[selected]];
      setTiles(next);
      setMoves(m => m + 1);
      setSelected(null);
      if (next.every((v, i) => v === i)) {
        setWon(true);
        const m = moves + 1;
        const t = timer;
        setBest(prev => {
          const old = prev[size];
          if (!old || m < old.moves) return { ...prev, [size]: { moves: m, time: t } };
          return prev;
        });
      }
    }
  };

  const getColor = (tileIdx: number) => {
    const hue = (tileIdx / total) * 300;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:20, minHeight:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e0e0e0", background:"#0a0a1a" }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4, background:"linear-gradient(135deg,#ec4899,#f59e0b)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Jigsaw Puzzle</div>
      <div style={{ fontSize:12, color:"#666", marginBottom:16 }}>Swap tiles to arrange them in order</div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[3, 4, 5].map(s => (
          <button key={s} onClick={() => { setSize(s); initGame(s); }} style={{ padding:"8px 18px", borderRadius:8, border:"none", background: size === s ? "#6366f1" : "#1e1e2e", color: size === s ? "#fff" : "#888", cursor:"pointer", fontSize:13, fontWeight:600 }}>{s}×{s}</button>
        ))}
      </div>

      <div style={{ display:"flex", gap:20, marginBottom:12, fontSize:13, color:"#888" }}>
        <span>Moves: <b style={{ color:"#fff" }}>{moves}</b></span>
        <span>Time: <b style={{ color:"#eab308" }}>{formatTime(timer)}</b></span>
        {best[size] && <span>Best: <b style={{ color:"#22c55e" }}>{best[size].moves} moves</b></span>}
      </div>

      <div style={{ display:"inline-grid", gridTemplateColumns:`repeat(${size}, ${cellSize}px)`, gap:4, padding:8, borderRadius:12, background:"#111" }}>
        {tiles.map((tile, idx) => {
          const isCorrect = tile === idx;
          const isSelected = selected === idx;
          return (
            <div key={idx} onClick={() => handleClick(idx)} style={{
              width: cellSize, height: cellSize, borderRadius: 8, display:"flex", alignItems:"center", justifyContent:"center",
              background: getColor(tile), cursor:"pointer", fontSize: cellSize * 0.35, fontWeight:800, color:"#fff",
              border: isSelected ? "3px solid #fff" : isCorrect ? "3px solid #22c55e" : "3px solid transparent",
              boxShadow: isSelected ? "0 0 12px rgba(255,255,255,0.5)" : isCorrect ? "0 0 8px rgba(34,197,94,0.4)" : "none",
              transform: isSelected ? "scale(1.05)" : "scale(1)", transition:"all 0.15s",
              textShadow:"0 1px 3px rgba(0,0,0,0.5)",
            }}>
              {tile + 1}
            </div>
          );
        })}
      </div>

      {won && (
        <div style={{ marginTop:16, padding:"16px 32px", borderRadius:12, background:"#14532d", border:"1px solid #22c55e", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color:"#22c55e", marginBottom:4 }}>🎉 Puzzle Complete!</div>
          <div style={{ fontSize:13, color:"#86efac" }}>{moves} moves · {formatTime(timer)}</div>
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button onClick={() => initGame(size)} style={{ padding:"10px 24px", borderRadius:8, border:"none", background:"#6366f1", color:"#fff", cursor:"pointer", fontWeight:600 }}>New Puzzle</button>
      </div>
    </div>
  );
}
