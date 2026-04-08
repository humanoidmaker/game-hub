"use client";
import { useState, useCallback, useEffect } from "react";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"];
const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow", "Purple", "Pink", "Orange", "Cyan"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPuzzle(numColors: number): string[][] {
  const colors = COLORS.slice(0, numColors);
  const pool: string[] = [];
  for (const c of colors) for (let i = 0; i < 4; i++) pool.push(c);
  const shuffled = shuffle(pool);
  const tubes: string[][] = [];
  for (let i = 0; i < numColors; i++) tubes.push(shuffled.splice(0, 4));
  tubes.push([], []);
  return tubes;
}

function isSolved(tubes: string[][]): boolean {
  return tubes.every((t) => t.length === 0 || (t.length === 4 && t.every((c) => c === t[0])));
}

interface LevelDef {
  name: string;
  colors: number;
}

const LEVELS: LevelDef[] = [
  { name: "Beginner", colors: 4 },
  { name: "Easy", colors: 5 },
  { name: "Medium", colors: 6 },
  { name: "Hard", colors: 7 },
  { name: "Expert", colors: 8 },
];

export default function BallSort() {
  const [screen, setScreen] = useState<"menu" | "play" | "win">("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [tubes, setTubes] = useState<string[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<string[][][]>([]);
  const [animating, setAnimating] = useState<{ from: number; to: number; color: string } | null>(null);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});

  const startLevel = useCallback((idx: number) => {
    const level = LEVELS[idx];
    const puzzle = createPuzzle(level.colors);
    setTubes(puzzle);
    setSelected(null);
    setMoves(0);
    setHistory([]);
    setAnimating(null);
    setLevelIdx(idx);
    setScreen("play");
  }, []);

  useEffect(() => {
    if (screen === "play" && isSolved(tubes) && moves > 0) {
      const best = bestMoves[levelIdx];
      if (!best || moves < best) {
        setBestMoves((prev) => ({ ...prev, [levelIdx]: moves }));
      }
      setTimeout(() => setScreen("win"), 300);
    }
  }, [tubes, screen, moves, levelIdx, bestMoves]);

  const handleTubeClick = (i: number) => {
    if (animating) return;
    if (selected === null) {
      if (tubes[i].length > 0) setSelected(i);
    } else if (selected === i) {
      setSelected(null);
    } else {
      const from = tubes[selected];
      const to = tubes[i];
      const ball = from[from.length - 1];
      if (to.length < 4 && (to.length === 0 || to[to.length - 1] === ball)) {
        setAnimating({ from: selected, to: i, color: ball });
        setHistory((h) => [...h, tubes.map((t) => [...t])]);
        setTimeout(() => {
          setTubes((prev) => {
            const nt = prev.map((t) => [...t]);
            const b = nt[selected].pop()!;
            nt[i].push(b);
            return nt;
          });
          setMoves((m) => m + 1);
          setSelected(null);
          setAnimating(null);
        }, 250);
      } else {
        setSelected(i);
      }
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTubes(prev);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m - 1);
    setSelected(null);
  };

  const restart = () => startLevel(levelIdx);

  const bg = "#0a0a1a";
  const card = "#141430";
  const accent = "#00e5ff";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20 }}>
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 6, textShadow: "0 0 20px rgba(0,229,255,0.4)" }}>Ball Sort Puzzle</h1>
        <p style={{ color: "#888", marginBottom: 30 }}>Sort the balls so each tube has one color</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 300 }}>
          {LEVELS.map((level, i) => (
            <button
              key={i}
              onClick={() => startLevel(i)}
              style={{
                padding: "14px 24px", borderRadius: 12, border: "2px solid #333",
                background: card, color: "#fff", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 16, fontWeight: 600, transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
            >
              <span>{level.name}</span>
              <span style={{ display: "flex", gap: 4 }}>
                {COLORS.slice(0, level.colors).map((c, ci) => (
                  <span key={ci} style={{ width: 14, height: 14, borderRadius: "50%", background: c, display: "inline-block" }} />
                ))}
              </span>
            </button>
          ))}
        </div>
        {Object.keys(bestMoves).length > 0 && (
          <div style={{ marginTop: 24, color: "#666", fontSize: 13 }}>
            Best scores: {Object.entries(bestMoves).map(([k, v]) => `${LEVELS[Number(k)].name}: ${v} moves`).join(" | ")}
          </div>
        )}
      </div>
    );
  }

  if (screen === "win") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20 }}>
        <h1 style={{ fontSize: 40, color: "#22c55e", marginBottom: 8 }}>Solved!</h1>
        <div style={{ background: card, borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 16, color: "#aaa", margin: "0 0 4px" }}>{LEVELS[levelIdx].name} Level</p>
          <p style={{ fontSize: 42, fontWeight: 800, color: accent, margin: "0 0 4px" }}>{moves}</p>
          <p style={{ color: "#888", margin: 0 }}>moves</p>
          {bestMoves[levelIdx] === moves && <p style={{ color: "#f59e0b", marginTop: 8, fontWeight: 600 }}>New Best!</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={restart} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>
            Replay
          </button>
          {levelIdx < LEVELS.length - 1 && (
            <button onClick={() => startLevel(levelIdx + 1)} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "#22c55e", color: "#000", fontWeight: 700, cursor: "pointer" }}>
              Next Level
            </button>
          )}
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 28px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>
            Menu
          </button>
        </div>
      </div>
    );
  }

  const tubeWidth = 52;
  const ballSize = 38;
  const tubeHeight = 160;
  const totalTubes = tubes.length;

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 600, marginBottom: 16 }}>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px" }}>
          <span style={{ color: "#888", fontSize: 12 }}>LEVEL</span>
          <div style={{ color: accent, fontWeight: 700, fontSize: 16 }}>{LEVELS[levelIdx].name}</div>
        </div>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px" }}>
          <span style={{ color: "#888", fontSize: 12 }}>MOVES</span>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{moves}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={undo} disabled={history.length === 0} style={{ padding: "8px 16px", borderRadius: 8, border: "2px solid #444", background: "transparent", color: history.length === 0 ? "#444" : "#ccc", fontWeight: 600, cursor: history.length === 0 ? "default" : "pointer" }}>
            Undo
          </button>
          <button onClick={restart} style={{ padding: "8px 16px", borderRadius: 8, border: "2px solid #555", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>
            Restart
          </button>
        </div>
      </div>

      {/* Tubes */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 20, maxWidth: 650 }}>
        {tubes.map((tube, ti) => {
          const isSelected = selected === ti;
          return (
            <div
              key={ti}
              onClick={() => handleTubeClick(ti)}
              style={{
                width: tubeWidth,
                height: tubeHeight,
                borderRadius: "0 0 24px 24px",
                border: `3px solid ${isSelected ? accent : "#333"}`,
                borderTop: "none",
                background: isSelected ? "rgba(0,229,255,0.05)" : "rgba(255,255,255,0.02)",
                display: "flex",
                flexDirection: "column-reverse",
                alignItems: "center",
                padding: "4px 0",
                gap: 2,
                cursor: "pointer",
                transition: "all 0.2s",
                transform: isSelected ? "translateY(-8px)" : "none",
                boxShadow: isSelected ? `0 8px 20px rgba(0,229,255,0.2)` : "none",
                position: "relative",
              }}
            >
              {tube.map((color, bi) => (
                <div
                  key={bi}
                  style={{
                    width: ballSize,
                    height: ballSize - 4,
                    borderRadius: "50%",
                    background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color}88)`,
                    boxShadow: `0 2px 8px ${color}44, inset 0 -2px 4px rgba(0,0,0,0.3)`,
                    transition: "all 0.2s",
                  }}
                />
              ))}
              {/* Tube label */}
              <div style={{ position: "absolute", bottom: -22, fontSize: 10, color: "#555" }}>{ti + 1}</div>
            </div>
          );
        })}
      </div>

      <p style={{ color: "#555", fontSize: 12, marginTop: 40 }}>
        Click a tube to pick the top ball, then click another tube to place it.
      </p>
    </div>
  );
}
