import { useState, useCallback, useEffect, useRef } from "react";

type PipeType = "empty" | "straight-h" | "straight-v" | "corner-tl" | "corner-tr" | "corner-bl" | "corner-br" | "cross" | "t-up" | "t-down" | "t-left" | "t-right" | "source" | "exit";
type Dir = "up" | "down" | "left" | "right";

interface Cell { type: PipeType; filled: boolean; }

const GRID = 7;
const CS = 50;

const CONNECTIONS: Record<PipeType, Dir[]> = {
  "empty": [], "straight-h": ["left", "right"], "straight-v": ["up", "down"],
  "corner-tl": ["down", "right"], "corner-tr": ["down", "left"],
  "corner-bl": ["up", "right"], "corner-br": ["up", "left"],
  "cross": ["up", "down", "left", "right"],
  "t-up": ["up", "left", "right"], "t-down": ["down", "left", "right"],
  "t-left": ["up", "down", "left"], "t-right": ["up", "down", "right"],
  "source": ["right"], "exit": ["left"],
};

const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const DIR_DELTA: Record<Dir, [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const PLACEABLE: PipeType[] = ["straight-h", "straight-v", "corner-tl", "corner-tr", "corner-bl", "corner-br", "cross", "t-up", "t-down", "t-left", "t-right"];

const LEVELS = [
  { sourceR: 3, sourceC: 0, exitR: 3, exitC: 6, timer: 18 },
  { sourceR: 1, sourceC: 0, exitR: 5, exitC: 6, timer: 16 },
  { sourceR: 0, sourceC: 0, exitR: 6, exitC: 6, timer: 14 },
  { sourceR: 5, sourceC: 0, exitR: 1, exitC: 6, timer: 13 },
  { sourceR: 3, sourceC: 0, exitR: 0, exitC: 6, timer: 12 },
  { sourceR: 6, sourceC: 0, exitR: 0, exitC: 6, timer: 11 },
  { sourceR: 0, sourceC: 0, exitR: 3, exitC: 6, timer: 10 },
];

function makeGrid(lvl: typeof LEVELS[0]): Cell[][] {
  const g: Cell[][] = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => ({ type: "empty" as PipeType, filled: false }))
  );
  g[lvl.sourceR][lvl.sourceC] = { type: "source", filled: false };
  g[lvl.exitR][lvl.exitC] = { type: "exit", filled: false };
  return g;
}

function getNextPipe(): PipeType {
  return PLACEABLE[Math.floor(Math.random() * PLACEABLE.length)];
}

export default function PipeMania() {
  const [level, setLevel] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>(() => makeGrid(LEVELS[0]));
  const [nextPipes, setNextPipes] = useState<PipeType[]>(() => [getNextPipe(), getNextPipe(), getNextPipe()]);
  const [flowing, setFlowing] = useState(false);
  const [timer, setTimer] = useState(LEVELS[0].timer);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const flowRef = useRef<{ queue: { r: number; c: number; from: Dir }[]; interval: number | null }>({ queue: [], interval: null });

  useEffect(() => {
    if (flowing || gameOver || won) return;
    if (timer <= 0) { setFlowing(true); return; }
    const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, flowing, gameOver, won]);

  useEffect(() => {
    if (!flowing || gameOver || won) return;
    const lvl = LEVELS[level];
    flowRef.current.queue = [{ r: lvl.sourceR, c: lvl.sourceC + 1, from: "left" }];

    setGrid(prev => {
      const ng = prev.map(row => row.map(c => ({ ...c })));
      ng[lvl.sourceR][lvl.sourceC].filled = true;
      return ng;
    });

    const interval = window.setInterval(() => {
      const q = flowRef.current.queue;
      if (q.length === 0) { clearInterval(interval); setGameOver(true); return; }
      const { r, c, from } = q.shift()!;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) { clearInterval(interval); setGameOver(true); return; }

      setGrid(prev => {
        const ng = prev.map(row => row.map(cell => ({ ...cell })));
        const cell = ng[r][c];
        if (cell.type === "empty" || !CONNECTIONS[cell.type].includes(from)) {
          clearInterval(interval);
          flowRef.current.queue = [];
          setTimeout(() => setGameOver(true), 100);
          return ng;
        }
        cell.filled = true;
        const lvl = LEVELS[level];
        if (r === lvl.exitR && c === lvl.exitC) {
          clearInterval(interval);
          flowRef.current.queue = [];
          setTimeout(() => setWon(true), 100);
          return ng;
        }
        const conns = CONNECTIONS[cell.type].filter(d => d !== from);
        for (const dir of conns) {
          const [dr, dc] = DIR_DELTA[dir];
          q.push({ r: r + dr, c: c + dc, from: OPPOSITE[dir] });
        }
        setScore(prev => prev + 10);
        return ng;
      });
    }, 500);

    flowRef.current.interval = interval;
    return () => clearInterval(interval);
  }, [flowing, level, gameOver, won]);

  const placePipe = useCallback((r: number, c: number) => {
    if (flowing || gameOver || won) return;
    const cell = grid[r][c];
    if (cell.type === "source" || cell.type === "exit") return;
    setGrid(prev => {
      const ng = prev.map(row => row.map(cell => ({ ...cell })));
      ng[r][c] = { type: nextPipes[0], filled: false };
      return ng;
    });
    setNextPipes(prev => [...prev.slice(1), getNextPipe()]);
  }, [flowing, gameOver, won, grid, nextPipes]);

  const nextLevel = () => {
    const nl = level + 1;
    if (nl >= LEVELS.length) { setGameOver(true); return; }
    setLevel(nl);
    setGrid(makeGrid(LEVELS[nl]));
    setNextPipes([getNextPipe(), getNextPipe(), getNextPipe()]);
    setFlowing(false);
    setTimer(LEVELS[nl].timer);
    setWon(false);
    setGameOver(false);
    if (flowRef.current.interval) clearInterval(flowRef.current.interval);
  };

  const restart = () => {
    setLevel(0);
    setGrid(makeGrid(LEVELS[0]));
    setNextPipes([getNextPipe(), getNextPipe(), getNextPipe()]);
    setFlowing(false);
    setTimer(LEVELS[0].timer);
    setScore(0);
    setWon(false);
    setGameOver(false);
    if (flowRef.current.interval) clearInterval(flowRef.current.interval);
  };

  const renderPipe = (type: PipeType, filled: boolean, size: number) => {
    const half = size / 2;
    const pw = 12;
    const color = filled ? "#3b82f6" : "#4a4a5a";
    const bg = filled ? "rgba(59,130,246,0.15)" : "transparent";
    const conns = CONNECTIONS[type];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={bg} />
        {conns.includes("up") && <rect x={half - pw / 2} y={0} width={pw} height={half} fill={color} rx={2} />}
        {conns.includes("down") && <rect x={half - pw / 2} y={half} width={pw} height={half} fill={color} rx={2} />}
        {conns.includes("left") && <rect x={0} y={half - pw / 2} width={half} height={pw} fill={color} rx={2} />}
        {conns.includes("right") && <rect x={half} y={half - pw / 2} width={half} height={pw} fill={color} rx={2} />}
        {conns.length > 0 && <circle cx={half} cy={half} r={pw / 2} fill={color} />}
      </svg>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh", color: "#fff" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Pipe Mania</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Place pipes to guide water from source to exit</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 14 }}>
        <span>Level: {level + 1}/{LEVELS.length}</span>
        <span style={{ color: "#f59e0b" }}>Score: {score}</span>
        <span style={{ color: timer <= 3 && !flowing ? "#ef4444" : "#22c55e" }}>
          {flowing ? "Flowing..." : `Timer: ${timer}s`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#888" }}>Next:</span>
        {nextPipes.map((p, i) => (
          <div key={i} style={{ border: i === 0 ? "2px solid #f59e0b" : "1px solid #333", borderRadius: 4, padding: 2, opacity: i === 0 ? 1 : 0.5 }}>
            {renderPipe(p, false, 36)}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID}, ${CS}px)`, gap: 1, background: "#1a1a2e", padding: 2, borderRadius: 8 }}>
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} onClick={() => placePipe(r, c)} style={{
              width: CS, height: CS,
              background: cell.type === "source" ? "#1a3a1a" : cell.type === "exit" ? "#3a1a1a" : "#0d0d20",
              cursor: cell.type === "source" || cell.type === "exit" || flowing ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: cell.filled ? "1px solid rgba(59,130,246,0.3)" : "1px solid #1a1a2e",
            }}>
              {cell.type === "source" ? (
                <div style={{ textAlign: "center" }}>
                  {renderPipe("source", cell.filled, CS - 4)}
                  <div style={{ fontSize: 8, color: "#22c55e", fontWeight: "bold", marginTop: -10 }}>SRC</div>
                </div>
              ) : cell.type === "exit" ? (
                <div style={{ textAlign: "center" }}>
                  {renderPipe("exit", cell.filled, CS - 4)}
                  <div style={{ fontSize: 8, color: "#ef4444", fontWeight: "bold", marginTop: -10 }}>EXIT</div>
                </div>
              ) : cell.type !== "empty" ? (
                renderPipe(cell.type, cell.filled, CS - 4)
              ) : (
                <div style={{ width: 4, height: 4, borderRadius: 2, background: "#222" }} />
              )}
            </div>
          ))
        )}
      </div>

      {won && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <div style={{ color: "#22c55e", fontSize: 20, fontWeight: "bold" }}>Level Complete!</div>
          <button onClick={nextLevel} style={{ marginTop: 8, padding: "8px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            {level + 1 < LEVELS.length ? "Next Level" : "Finish"}
          </button>
        </div>
      )}
      {gameOver && !won && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <div style={{ color: "#ef4444", fontSize: 20, fontWeight: "bold" }}>Water Leaked!</div>
          <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Final Score: {score}</div>
          <button onClick={restart} style={{ marginTop: 8, padding: "8px 24px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>Restart</button>
        </div>
      )}
    </div>
  );
}
