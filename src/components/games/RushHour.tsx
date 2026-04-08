import { useState, useCallback } from "react";

interface Car { id: number; r: number; c: number; len: number; horiz: boolean; color: string; isTarget: boolean; }

const PUZZLES: Car[][] = [
  [
    { id: 0, r: 2, c: 0, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 3, horiz: false, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 2, len: 2, horiz: true, color: "#22c55e", isTarget: false },
    { id: 3, r: 1, c: 3, len: 3, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 4, c: 1, len: 2, horiz: true, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 3, c: 4, len: 2, horiz: false, color: "#ec4899", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 1, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 2, horiz: false, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 1, len: 2, horiz: true, color: "#22c55e", isTarget: false },
    { id: 3, r: 0, c: 4, len: 3, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 3, c: 0, len: 2, horiz: true, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 4, c: 2, len: 3, horiz: true, color: "#f97316", isTarget: false },
    { id: 6, r: 5, c: 0, len: 2, horiz: true, color: "#06b6d4", isTarget: false },
    { id: 7, r: 1, c: 3, len: 2, horiz: false, color: "#84cc16", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 0, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 2, horiz: true, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 3, len: 3, horiz: false, color: "#22c55e", isTarget: false },
    { id: 3, r: 1, c: 0, len: 2, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 1, len: 2, horiz: true, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 3, c: 1, len: 2, horiz: false, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 2, len: 3, horiz: true, color: "#f97316", isTarget: false },
    { id: 7, r: 4, c: 0, len: 2, horiz: true, color: "#06b6d4", isTarget: false },
    { id: 8, r: 4, c: 4, len: 2, horiz: false, color: "#84cc16", isTarget: false },
    { id: 9, r: 5, c: 2, len: 2, horiz: true, color: "#a855f7", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 2, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 3, horiz: true, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 4, len: 3, horiz: false, color: "#22c55e", isTarget: false },
    { id: 3, r: 1, c: 0, len: 2, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 2, len: 2, horiz: false, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 3, c: 0, len: 3, horiz: false, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 3, len: 2, horiz: true, color: "#f97316", isTarget: false },
    { id: 7, r: 4, c: 1, len: 2, horiz: true, color: "#06b6d4", isTarget: false },
    { id: 8, r: 5, c: 2, len: 3, horiz: true, color: "#84cc16", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 0, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 2, horiz: true, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 2, len: 3, horiz: false, color: "#22c55e", isTarget: false },
    { id: 3, r: 0, c: 5, len: 2, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 0, len: 2, horiz: false, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 1, c: 3, len: 2, horiz: true, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 0, len: 2, horiz: true, color: "#f97316", isTarget: false },
    { id: 7, r: 3, c: 3, len: 3, horiz: false, color: "#06b6d4", isTarget: false },
    { id: 8, r: 4, c: 0, len: 3, horiz: true, color: "#84cc16", isTarget: false },
    { id: 9, r: 5, c: 1, len: 2, horiz: true, color: "#a855f7", isTarget: false },
    { id: 10, r: 4, c: 4, len: 2, horiz: false, color: "#14b8a6", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 1, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 3, horiz: false, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 1, len: 3, horiz: true, color: "#22c55e", isTarget: false },
    { id: 3, r: 1, c: 1, len: 2, horiz: true, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 4, len: 2, horiz: false, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 3, c: 0, len: 2, horiz: true, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 3, len: 3, horiz: false, color: "#f97316", isTarget: false },
    { id: 7, r: 4, c: 1, len: 2, horiz: false, color: "#06b6d4", isTarget: false },
    { id: 8, r: 5, c: 0, len: 3, horiz: true, color: "#84cc16", isTarget: false },
    { id: 9, r: 4, c: 4, len: 2, horiz: true, color: "#a855f7", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 0, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 2, len: 2, horiz: false, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 3, len: 2, horiz: true, color: "#22c55e", isTarget: false },
    { id: 3, r: 1, c: 4, len: 3, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 3, c: 0, len: 3, horiz: false, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 3, c: 2, len: 2, horiz: true, color: "#ec4899", isTarget: false },
    { id: 6, r: 4, c: 3, len: 2, horiz: false, color: "#f97316", isTarget: false },
    { id: 7, r: 5, c: 1, len: 2, horiz: true, color: "#06b6d4", isTarget: false },
    { id: 8, r: 4, c: 1, len: 2, horiz: true, color: "#84cc16", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 2, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 2, horiz: false, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 1, len: 2, horiz: true, color: "#22c55e", isTarget: false },
    { id: 3, r: 0, c: 4, len: 2, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 2, len: 2, horiz: true, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 2, c: 0, len: 2, horiz: false, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 1, len: 3, horiz: true, color: "#f97316", isTarget: false },
    { id: 7, r: 4, c: 0, len: 2, horiz: true, color: "#06b6d4", isTarget: false },
    { id: 8, r: 4, c: 3, len: 3, horiz: false, color: "#84cc16", isTarget: false },
    { id: 9, r: 5, c: 0, len: 2, horiz: true, color: "#a855f7", isTarget: false },
    { id: 10, r: 5, c: 4, len: 2, horiz: true, color: "#14b8a6", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 1, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 2, horiz: true, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 3, len: 2, horiz: false, color: "#22c55e", isTarget: false },
    { id: 3, r: 0, c: 5, len: 3, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 0, len: 3, horiz: false, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 1, c: 1, len: 2, horiz: true, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 0, len: 2, horiz: true, color: "#f97316", isTarget: false },
    { id: 7, r: 3, c: 4, len: 2, horiz: true, color: "#06b6d4", isTarget: false },
    { id: 8, r: 4, c: 2, len: 3, horiz: false, color: "#84cc16", isTarget: false },
    { id: 9, r: 4, c: 3, len: 3, horiz: true, color: "#a855f7", isTarget: false },
    { id: 10, r: 5, c: 0, len: 2, horiz: true, color: "#14b8a6", isTarget: false },
  ],
  [
    { id: 0, r: 2, c: 0, len: 2, horiz: true, color: "#ef4444", isTarget: true },
    { id: 1, r: 0, c: 0, len: 2, horiz: true, color: "#3b82f6", isTarget: false },
    { id: 2, r: 0, c: 3, len: 3, horiz: false, color: "#22c55e", isTarget: false },
    { id: 3, r: 1, c: 0, len: 2, horiz: false, color: "#eab308", isTarget: false },
    { id: 4, r: 1, c: 1, len: 2, horiz: true, color: "#8b5cf6", isTarget: false },
    { id: 5, r: 1, c: 4, len: 2, horiz: false, color: "#ec4899", isTarget: false },
    { id: 6, r: 3, c: 1, len: 2, horiz: true, color: "#f97316", isTarget: false },
    { id: 7, r: 3, c: 4, len: 3, horiz: false, color: "#06b6d4", isTarget: false },
    { id: 8, r: 4, c: 0, len: 3, horiz: true, color: "#84cc16", isTarget: false },
    { id: 9, r: 5, c: 2, len: 2, horiz: true, color: "#a855f7", isTarget: false },
  ],
];

const SIZE = 6, CS = 56;

export default function RushHour() {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [cars, setCars] = useState<Car[]>(() => PUZZLES[0].map(c => ({ ...c })));
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<Car[][]>([]);
  const [solved, setSolved] = useState(false);

  const isOccupied = useCallback((r: number, c: number, excludeId: number, carList: Car[]): boolean => {
    for (const car of carList) {
      if (car.id === excludeId) continue;
      for (let i = 0; i < car.len; i++) {
        const cr = car.horiz ? car.r : car.r + i;
        const cc = car.horiz ? car.c + i : car.c;
        if (cr === r && cc === c) return true;
      }
    }
    return false;
  }, []);

  const moveCar = useCallback((id: number, dir: number) => {
    setCars(prev => {
      const car = prev.find(c => c.id === id);
      if (!car || solved) return prev;
      const nr = car.horiz ? car.r : car.r + dir;
      const nc = car.horiz ? car.c + dir : car.c;
      const endR = car.horiz ? nr : nr + car.len - 1;
      const endC = car.horiz ? nc + car.len - 1 : nc;
      if (nr < 0 || nc < 0 || endR >= SIZE || endC >= SIZE) return prev;
      for (let i = 0; i < car.len; i++) {
        const cr = car.horiz ? nr : nr + i;
        const cc = car.horiz ? nc + i : nc;
        if (isOccupied(cr, cc, id, prev)) return prev;
      }
      setHistory(h => [...h, prev.map(c => ({ ...c }))]);
      setMoves(m => m + 1);
      const newCars = prev.map(c => c.id === id ? { ...c, r: nr, c: nc } : c);
      // Check win
      const target = newCars.find(c => c.isTarget);
      if (target && target.horiz && target.c + target.len >= SIZE) {
        setTimeout(() => setSolved(true), 200);
      }
      return newCars;
    });
  }, [isOccupied, solved]);

  const undo = () => {
    if (history.length === 0) return;
    setCars(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
  };

  const loadPuzzle = (idx: number) => {
    setPuzzleIdx(idx);
    setCars(PUZZLES[idx].map(c => ({ ...c })));
    setSelected(null);
    setMoves(0);
    setHistory([]);
    setSolved(false);
  };

  const nextPuzzle = () => {
    const next = puzzleIdx + 1;
    if (next < PUZZLES.length) loadPuzzle(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh", color: "#fff" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Rush Hour</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Slide cars to get the red car to the exit (right edge)</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 14, alignItems: "center" }}>
        <span>Puzzle: {puzzleIdx + 1}/{PUZZLES.length}</span>
        <span style={{ color: "#f59e0b" }}>Moves: {moves}</span>
        <button onClick={undo} disabled={history.length === 0} style={{
          padding: "4px 12px", background: history.length > 0 ? "#333" : "#1a1a2e",
          color: history.length > 0 ? "#fff" : "#555", border: "none", borderRadius: 4, cursor: history.length > 0 ? "pointer" : "default", fontSize: 12,
        }}>Undo</button>
        <button onClick={() => loadPuzzle(puzzleIdx)} style={{
          padding: "4px 12px", background: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12,
        }}>Reset</button>
      </div>

      {/* Grid */}
      <div style={{ position: "relative", width: SIZE * CS + 4, height: SIZE * CS + 4, background: "#1a1a2e", borderRadius: 8, border: "2px solid #333" }}>
        {/* Grid lines */}
        {Array.from({ length: SIZE + 1 }).map((_, i) => (
          <div key={`h${i}`} style={{ position: "absolute", left: 0, top: i * CS, width: SIZE * CS, height: 1, background: "#2a2a3e" }} />
        ))}
        {Array.from({ length: SIZE + 1 }).map((_, i) => (
          <div key={`v${i}`} style={{ position: "absolute", left: i * CS, top: 0, width: 1, height: SIZE * CS, background: "#2a2a3e" }} />
        ))}

        {/* Exit indicator */}
        <div style={{ position: "absolute", right: -16, top: 2 * CS + CS / 2 - 10, width: 14, height: 20, background: "#ef444480", borderRadius: "0 4px 4px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "#fff" }}>&#9654;</span>
        </div>

        {/* Cars */}
        {cars.map(car => (
          <div
            key={car.id}
            onClick={() => setSelected(selected === car.id ? null : car.id)}
            style={{
              position: "absolute",
              left: car.c * CS + 3,
              top: car.r * CS + 3,
              width: car.horiz ? car.len * CS - 6 : CS - 6,
              height: car.horiz ? CS - 6 : car.len * CS - 6,
              background: car.color,
              borderRadius: 6,
              cursor: "pointer",
              border: selected === car.id ? "2px solid #fff" : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "left 0.15s, top 0.15s",
              boxShadow: car.isTarget ? "0 0 8px rgba(239,68,68,0.5)" : "none",
              zIndex: selected === car.id ? 10 : 1,
            }}
          >
            {car.isTarget && <span style={{ fontSize: 14, fontWeight: "bold" }}>&#9654;</span>}
            {/* Grip lines */}
            {!car.isTarget && (
              <div style={{ display: "flex", gap: 2, flexDirection: car.horiz ? "column" : "row", opacity: 0.4 }}>
                <div style={{ width: car.horiz ? 12 : 2, height: car.horiz ? 2 : 12, background: "#000", borderRadius: 1 }} />
                <div style={{ width: car.horiz ? 12 : 2, height: car.horiz ? 2 : 12, background: "#000", borderRadius: 1 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Move buttons for selected car */}
      {selected !== null && !solved && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {cars.find(c => c.id === selected)?.horiz ? (
            <>
              <button onClick={() => moveCar(selected, -1)} style={{ padding: "8px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 16 }}>&#9664; Left</button>
              <button onClick={() => moveCar(selected, 1)} style={{ padding: "8px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 16 }}>Right &#9654;</button>
            </>
          ) : (
            <>
              <button onClick={() => moveCar(selected, -1)} style={{ padding: "8px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 16 }}>&#9650; Up</button>
              <button onClick={() => moveCar(selected, 1)} style={{ padding: "8px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 16 }}>Down &#9660;</button>
            </>
          )}
        </div>
      )}

      {/* Puzzle selector */}
      <div style={{ display: "flex", gap: 4, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {PUZZLES.map((_, i) => (
          <button key={i} onClick={() => loadPuzzle(i)} style={{
            width: 28, height: 28, borderRadius: 4, border: "none", cursor: "pointer",
            background: i === puzzleIdx ? "#3b82f6" : "#1a1a2e", color: i === puzzleIdx ? "#fff" : "#888", fontSize: 11,
          }}>{i + 1}</button>
        ))}
      </div>

      {solved && (
        <div style={{ marginTop: 16, textAlign: "center", padding: 16, background: "#1a2a1a", borderRadius: 8, border: "1px solid #22c55e40" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#22c55e" }}>Solved!</div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>Completed in {moves} moves</div>
          {puzzleIdx + 1 < PUZZLES.length && (
            <button onClick={nextPuzzle} style={{ marginTop: 8, padding: "8px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Next Puzzle</button>
          )}
        </div>
      )}
    </div>
  );
}
