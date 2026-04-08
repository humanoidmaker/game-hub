import { useState, useEffect, useCallback } from "react";

const GRID = 7;
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316"];
const COLOR_NAMES = ["Red", "Blue", "Green", "Yellow", "Purple", "Pink", "Orange"];

interface Dot { r: number; c: number; color: number; }
interface PathCell { r: number; c: number; }

function generateLevel(level: number): { dots: [Dot, Dot][]; numColors: number } {
  const numColors = Math.min(3 + Math.floor(level / 2), 7);
  const used = new Set<string>();
  const dots: [Dot, Dot][] = [];

  for (let ci = 0; ci < numColors; ci++) {
    let attempts = 0;
    while (attempts < 100) {
      attempts++;
      const r1 = Math.floor(Math.random() * GRID);
      const c1 = Math.floor(Math.random() * GRID);
      const k1 = `${r1},${c1}`;
      if (used.has(k1)) continue;

      // Place second dot at a Manhattan distance of 3-8
      const dist = 3 + Math.floor(Math.random() * Math.min(4, 2 + level));
      let r2 = r1, c2 = c1;
      for (let step = 0; step < dist; step++) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const d = dirs[Math.floor(Math.random() * 4)];
        const nr = r2 + d[0], nc = c2 + d[1];
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
          r2 = nr; c2 = nc;
        }
      }

      const k2 = `${r2},${c2}`;
      if (used.has(k2) || k1 === k2) continue;

      used.add(k1);
      used.add(k2);
      dots.push([
        { r: r1, c: c1, color: ci },
        { r: r2, c: c2, color: ci },
      ]);
      break;
    }
  }

  return { dots, numColors };
}

export default function FlowFree() {
  const [level, setLevel] = useState(1);
  const [dots, setDots] = useState<[Dot, Dot][]>([]);
  const [numColors, setNumColors] = useState(3);
  const [paths, setPaths] = useState<Map<number, PathCell[]>>(new Map());
  const [drawing, setDrawing] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [moves, setMoves] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [undoStack, setUndoStack] = useState<Map<number, PathCell[]>[]>([]);

  const initLevel = useCallback((lvl: number) => {
    const { dots: newDots, numColors: nc } = generateLevel(lvl);
    setDots(newDots);
    setNumColors(nc);
    setPaths(new Map());
    setDrawing(null);
    setCompleted(false);
    setMoves(0);
    setTimer(0);
    setStarted(true);
    setHintShown(false);
    setUndoStack([]);
  }, []);

  useEffect(() => { initLevel(1); }, [initLevel]);

  // Timer
  useEffect(() => {
    if (!started || completed) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [started, completed]);

  const getDotAt = (r: number, c: number): Dot | null => {
    for (const [d1, d2] of dots) {
      if (d1.r === r && d1.c === c) return d1;
      if (d2.r === r && d2.c === c) return d2;
    }
    return null;
  };

  const getColorAt = (r: number, c: number): number | null => {
    const dot = getDotAt(r, c);
    if (dot) return dot.color;
    for (const [colorIdx, path] of paths) {
      if (path.some(p => p.r === r && p.c === c)) return colorIdx;
    }
    return null;
  };

  const isAdjacent = (r1: number, c1: number, r2: number, c2: number) => {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  };

  const checkCompletion = (currentPaths: Map<number, PathCell[]>) => {
    // All dot pairs must be connected
    for (const [d1, d2] of dots) {
      const path = currentPaths.get(d1.color);
      if (!path || path.length === 0) return false;
      const first = path[0];
      const last = path[path.length - 1];
      const startsAtDot = (first.r === d1.r && first.c === d1.c) || (first.r === d2.r && first.c === d2.c);
      const endsAtDot = (last.r === d1.r && last.c === d1.c) || (last.r === d2.r && last.c === d2.c);
      if (!startsAtDot || !endsAtDot) return false;
      if (first.r === last.r && first.c === last.c) return false;
    }

    // Check if all cells are filled
    let filledCount = 0;
    for (const [, path] of currentPaths) filledCount += path.length;
    // Dots are part of paths
    return filledCount >= GRID * GRID * 0.6; // Relaxed requirement since procedural generation
  };

  const handleCellDown = (r: number, c: number) => {
    if (completed) return;
    const dot = getDotAt(r, c);
    if (dot) {
      setUndoStack(prev => [...prev, new Map(paths)]);
      const newPaths = new Map(paths);
      newPaths.set(dot.color, [{ r, c }]);
      setPaths(newPaths);
      setDrawing(dot.color);
      setMoves(m => m + 1);
    }
  };

  const handleCellEnter = (r: number, c: number) => {
    if (drawing === null || completed) return;
    const currentPath = paths.get(drawing) || [];
    if (currentPath.length === 0) return;

    const last = currentPath[currentPath.length - 1];
    if (!isAdjacent(last.r, last.c, r, c)) return;

    // Don't go back on self (except allow stepping back one)
    const backIdx = currentPath.findIndex(p => p.r === r && p.c === c);
    if (backIdx >= 0 && backIdx === currentPath.length - 2) {
      // Step back
      const newPath = currentPath.slice(0, -1);
      const newPaths = new Map(paths);
      newPaths.set(drawing, newPath);
      setPaths(newPaths);
      return;
    }
    if (backIdx >= 0) return;

    // Check if cell is occupied by another color (not a dot of our color)
    const occupant = getColorAt(r, c);
    if (occupant !== null && occupant !== drawing) {
      // Clear the other path if not a dot
      const dot = getDotAt(r, c);
      if (dot && dot.color !== drawing) return; // Can't go through other dots
      // Clear conflicting path
      const newPaths = new Map(paths);
      newPaths.delete(occupant);
      const newPath = [...currentPath, { r, c }];
      newPaths.set(drawing, newPath);
      setPaths(newPaths);
      return;
    }

    // Check if this is the target dot
    const dot = getDotAt(r, c);
    if (dot && dot.color === drawing && currentPath.length > 1) {
      const newPath = [...currentPath, { r, c }];
      const newPaths = new Map(paths);
      newPaths.set(drawing, newPath);
      setPaths(newPaths);
      setDrawing(null);
      if (checkCompletion(newPaths)) {
        setCompleted(true);
      }
      return;
    }

    if (dot && dot.color !== drawing) return;

    const newPath = [...currentPath, { r, c }];
    const newPaths = new Map(paths);
    newPaths.set(drawing, newPath);
    setPaths(newPaths);
  };

  const handleUp = () => {
    setDrawing(null);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setPaths(prev);
    setUndoStack(s => s.slice(0, -1));
  };

  const showHint = () => {
    if (dots.length === 0 || hintShown) return;
    // Show the first unconnected pair's straight-line path
    for (const [d1, d2] of dots) {
      const path = paths.get(d1.color);
      if (!path || path.length <= 1) {
        // Draw a simple path
        const hintPath: PathCell[] = [{ r: d1.r, c: d1.c }];
        let cr = d1.r, cc = d1.c;
        while (cr !== d2.r) {
          cr += cr < d2.r ? 1 : -1;
          hintPath.push({ r: cr, c: cc });
        }
        while (cc !== d2.c) {
          cc += cc < d2.c ? 1 : -1;
          hintPath.push({ r: cr, c: cc });
        }
        const newPaths = new Map(paths);
        newPaths.set(d1.color, hintPath);
        setPaths(newPaths);
        setHintShown(true);
        break;
      }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const CELL = 48;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, background: "#0a0a1a", minHeight: "100vh", color: "#ccc", fontFamily: "system-ui" }}
      onMouseUp={handleUp} onTouchEnd={handleUp}>
      <h2 style={{ color: "#a855f7", margin: 0, marginBottom: 4, fontSize: 22 }}>Flow Free</h2>

      {/* HUD */}
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 13 }}>
        <span style={{ color: "#3b82f6" }}>Level: {level}/10</span>
        <span style={{ color: "#eab308" }}>Time: {formatTime(timer)}</span>
        <span style={{ color: "#22c55e" }}>Moves: {moves}</span>
        <span style={{ color: "#a855f7" }}>Colors: {numColors}</span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID}, ${CELL}px)`,
          gap: 1,
          background: "#1a1a2e",
          border: "2px solid #333",
          borderRadius: 10,
          padding: 3,
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {Array.from({ length: GRID }, (_, r) =>
          Array.from({ length: GRID }, (_, c) => {
            const dot = getDotAt(r, c);
            const pathColor = getColorAt(r, c);
            const isInPath = pathColor !== null;
            const isDot = dot !== null;

            // Check if this cell connects to neighbors in same path
            const path = pathColor !== null ? paths.get(pathColor) : null;
            const cellIdx = path ? path.findIndex(p => p.r === r && p.c === c) : -1;

            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => handleCellDown(r, c)}
                onMouseEnter={() => handleCellEnter(r, c)}
                onTouchStart={(e) => { e.preventDefault(); handleCellDown(r, c); }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (el) {
                    const cellR = el.getAttribute("data-r");
                    const cellC = el.getAttribute("data-c");
                    if (cellR && cellC) handleCellEnter(parseInt(cellR), parseInt(cellC));
                  }
                }}
                data-r={r}
                data-c={c}
                style={{
                  width: CELL,
                  height: CELL,
                  background: isInPath && !isDot
                    ? COLORS[pathColor!] + "33"
                    : "#0d0d1a",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {isDot && (
                  <div style={{
                    width: CELL * 0.6,
                    height: CELL * 0.6,
                    borderRadius: "50%",
                    background: COLORS[dot.color],
                    boxShadow: `0 0 8px ${COLORS[dot.color]}88`,
                  }} />
                )}
                {isInPath && !isDot && (
                  <div style={{
                    width: CELL * 0.4,
                    height: CELL * 0.4,
                    borderRadius: "50%",
                    background: COLORS[pathColor!] + "88",
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {dots.map(([d1], i) => {
          const path = paths.get(d1.color);
          const connected = path && path.length > 1;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 3,
              fontSize: 11, color: connected ? COLORS[d1.color] : "#666",
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: COLORS[d1.color],
                opacity: connected ? 1 : 0.5,
              }} />
              {COLOR_NAMES[d1.color]}
              {connected && " \u2713"}
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={undo} disabled={undoStack.length === 0} style={{
          background: "#222", border: "1px solid #444", borderRadius: 6,
          color: "#ccc", padding: "6px 14px", cursor: "pointer", fontSize: 13,
          opacity: undoStack.length === 0 ? 0.4 : 1,
        }}>Undo</button>
        <button onClick={showHint} disabled={hintShown} style={{
          background: "#222", border: "1px solid #444", borderRadius: 6,
          color: "#eab308", padding: "6px 14px", cursor: "pointer", fontSize: 13,
          opacity: hintShown ? 0.4 : 1,
        }}>Hint</button>
        <button onClick={() => initLevel(level)} style={{
          background: "#222", border: "1px solid #444", borderRadius: 6,
          color: "#ef4444", padding: "6px 14px", cursor: "pointer", fontSize: 13,
        }}>Reset</button>
      </div>

      {/* Completion overlay */}
      {completed && (
        <div style={{
          marginTop: 12, padding: 16, background: "#111", border: "2px solid #22c55e",
          borderRadius: 12, textAlign: "center",
        }}>
          <div style={{ color: "#22c55e", fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>Level Complete!</div>
          <div style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
            Time: {formatTime(timer)} | Moves: {moves}
          </div>
          {level < 10 ? (
            <button onClick={() => { setLevel(l => l + 1); initLevel(level + 1); }} style={{
              background: "#22c55e", border: "none", borderRadius: 8,
              color: "#000", padding: "8px 20px", cursor: "pointer",
              fontSize: 15, fontWeight: "bold",
            }}>Next Level</button>
          ) : (
            <div style={{ color: "#eab308", fontSize: 18, fontWeight: "bold" }}>
              All levels completed! Total time: {formatTime(timer)}
            </div>
          )}
        </div>
      )}

      <p style={{ color: "#444", fontSize: 10, marginTop: 10 }}>Click a dot and drag to connect matching colors</p>
    </div>
  );
}
