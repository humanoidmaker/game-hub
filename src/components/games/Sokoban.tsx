import { useState, useEffect, useCallback } from "react";

interface Level {
  map: string[];
  targets: [number, number][];
}

const LEVELS: Level[] = [
  { map: ["#####", "#. @#", "# $ #", "#   #", "#####"], targets: [[1, 1]] },
  { map: ["######", "#    #", "# $$ #", "# .  #", "#  .@#", "######"], targets: [[3, 2], [4, 3]] },
  { map: ["#######", "#     #", "# $.$ #", "# . . #", "#  $  #", "#  @  #", "#######"], targets: [[3, 2], [3, 4], [2, 3]] },
  { map: ["########", "#      #", "# $.   #", "# .$.  #", "#   $. #", "#   @  #", "########"], targets: [[2, 2], [3, 2], [3, 4], [4, 4]] },
  { map: ["#######", "#  .  #", "# $.$ #", "#. $ .#", "# $.$ #", "#  @  #", "#######"], targets: [[1, 3], [2, 2], [2, 4], [3, 1], [3, 5], [4, 2], [4, 4]] },
  { map: ["########", "# .    #", "# $$$  #", "#  . . #", "#  $ $ #", "#  . @ #", "########"], targets: [[1, 2], [3, 3], [3, 5], [5, 3]] },
  { map: ["########", "#      #", "# .$$. #", "# $..$ #", "# .$$. #", "#   @  #", "########"], targets: [[2, 2], [2, 5], [3, 3], [3, 4], [4, 2], [4, 5]] },
  { map: ["#########", "#   #   #", "# $ . $ #", "#  .#.  #", "# $ . $ #", "#   @   #", "#########"], targets: [[2, 4], [3, 3], [3, 5], [4, 4]] },
  { map: ["########", "#  ..  #", "# $$$$ #", "#  ..  #", "# $  $ #", "# .  . #", "#  @   #", "########"], targets: [[1, 3], [1, 4], [3, 3], [3, 4], [5, 2], [5, 5]] },
  { map: ["#########", "#       #", "# .$.$. #", "# $.$.$ #", "# .$.$. #", "#   @   #", "#########"], targets: [[2, 2], [2, 4], [2, 6], [3, 3], [3, 5], [4, 2], [4, 4], [4, 6]] },
  { map: ["##########", "#        #", "# .$$$$. #", "# $....$ #", "# $....$ #", "# .$$$$. #", "#    @   #", "##########"], targets: [[2, 2], [2, 7], [3, 3], [3, 4], [3, 5], [3, 6], [4, 3], [4, 4], [4, 5], [4, 6], [5, 2], [5, 7]] },
];

const CS = 40;

function parseLevel(lvl: Level) {
  const rows = lvl.map.length;
  const cols = Math.max(...lvl.map.map(r => r.length));
  const walls: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const boxes: [number, number][] = [];
  let player: [number, number] = [0, 0];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < lvl.map[r].length; c++) {
      const ch = lvl.map[r][c];
      if (ch === "#") walls[r][c] = true;
      if (ch === "$") boxes.push([r, c]);
      if (ch === "@") player = [r, c];
    }
  }
  return { rows, cols, walls, boxes, player, targets: lvl.targets };
}

export default function Sokoban() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [state, setState] = useState(() => parseLevel(LEVELS[0]));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<{ player: [number, number]; boxes: [number, number][] }[]>([]);
  const [solved, setSolved] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const loadLevel = useCallback((idx: number) => {
    setLevelIdx(idx);
    setState(parseLevel(LEVELS[idx]));
    setMoves(0);
    setHistory([]);
    setSolved(false);
  }, []);

  const checkWin = useCallback((boxes: [number, number][], targets: [number, number][]) => {
    return targets.every(([tr, tc]) => boxes.some(([br, bc]) => br === tr && bc === tc));
  }, []);

  const move = useCallback((dr: number, dc: number) => {
    if (solved) return;
    setState(prev => {
      const { rows, cols, walls, boxes, player, targets } = prev;
      const [pr, pc] = player;
      const nr = pr + dr, nc = pc + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || walls[nr][nc]) return prev;

      const boxIdx = boxes.findIndex(([br, bc]) => br === nr && bc === nc);
      let newBoxes = boxes.map(b => [...b] as [number, number]);

      if (boxIdx >= 0) {
        const bnr = nr + dr, bnc = nc + dc;
        if (bnr < 0 || bnr >= rows || bnc < 0 || bnc >= cols || walls[bnr][bnc]) return prev;
        if (boxes.some(([br, bc]) => br === bnr && bc === bnc)) return prev;
        newBoxes[boxIdx] = [bnr, bnc];
      }

      setHistory(h => [...h, { player: [...player] as [number, number], boxes: boxes.map(b => [...b] as [number, number]) }]);
      setMoves(m => m + 1);

      if (checkWin(newBoxes, targets)) {
        setTimeout(() => setSolved(true), 200);
      }

      return { ...prev, player: [nr, nc] as [number, number], boxes: newBoxes };
    });
  }, [solved, checkWin]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setState(s => ({ ...s, player: prev.player, boxes: prev.boxes }));
    setHistory(h => h.slice(0, -1));
    setMoves(m => m - 1);
  }, [history]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); move(-1, 0); }
      else if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); move(1, 0); }
      else if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); move(0, -1); }
      else if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); move(0, 1); }
      else if (e.code === "KeyZ") { e.preventDefault(); undo(); }
      else if (e.code === "KeyR") { e.preventDefault(); loadLevel(levelIdx); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, undo, loadLevel, levelIdx]);

  const { rows, cols, walls, boxes, player, targets } = state;

  const isTarget = (r: number, c: number) => targets.some(([tr, tc]) => tr === r && tc === c);
  const isBox = (r: number, c: number) => boxes.some(([br, bc]) => br === r && bc === c);
  const boxOnTarget = (r: number, c: number) => isBox(r, c) && isTarget(r, c);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20, background: "#0a0a1a", minHeight: "100vh", color: "#fff" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Sokoban</h2>
      <p style={{ color: "#888", marginBottom: 8, fontSize: 13 }}>Push boxes onto targets - Arrow keys, Z=Undo, R=Reset</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 14, alignItems: "center" }}>
        <span>Level: {levelIdx + 1}/{LEVELS.length}</span>
        <span style={{ color: "#f59e0b" }}>Moves: {moves}</span>
        <button onClick={undo} disabled={history.length === 0} style={{
          padding: "4px 10px", background: history.length > 0 ? "#333" : "#1a1a2e",
          color: history.length > 0 ? "#fff" : "#555", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12,
        }}>Undo</button>
        <button onClick={() => loadLevel(levelIdx)} style={{ padding: "4px 10px", background: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>Reset</button>
        <button onClick={() => setShowSelector(!showSelector)} style={{ padding: "4px 10px", background: "#333", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>Levels</button>
      </div>

      {showSelector && (
        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {LEVELS.map((_, i) => (
            <button key={i} onClick={() => { loadLevel(i); setShowSelector(false); }} style={{
              width: 30, height: 30, borderRadius: 4, border: "none", cursor: "pointer",
              background: i === levelIdx ? "#3b82f6" : "#1a1a2e", color: i === levelIdx ? "#fff" : "#888", fontSize: 12,
            }}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${CS}px)`, gap: 1, background: "#0a0a1a", padding: 2, borderRadius: 8 }}>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const wall = walls[r][c];
            const target = isTarget(r, c);
            const box = isBox(r, c);
            const onTarget = boxOnTarget(r, c);
            const isPlayer = player[0] === r && player[1] === c;

            return (
              <div key={`${r}-${c}`} style={{
                width: CS, height: CS,
                background: wall ? "#2a2a3e" : "#0d0d20",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                borderRadius: wall ? 2 : 0,
              }}>
                {wall && (
                  <div style={{ width: CS - 4, height: CS - 4, background: "#3a3a4e", borderRadius: 3, border: "1px solid #4a4a5e" }} />
                )}
                {target && !box && (
                  <div style={{
                    width: 12, height: 12, borderRadius: 6,
                    background: "#ef444440", border: "2px solid #ef4444",
                    position: "absolute",
                  }} />
                )}
                {box && (
                  <div style={{
                    width: CS - 8, height: CS - 8, borderRadius: 4,
                    background: onTarget ? "#22c55e" : "#f59e0b",
                    border: `2px solid ${onTarget ? "#16a34a" : "#d97706"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: onTarget ? "0 0 8px rgba(34,197,94,0.3)" : "none",
                    transition: "background 0.2s",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(0,0,0,0.2)" }} />
                  </div>
                )}
                {isPlayer && (
                  <div style={{
                    width: CS - 10, height: CS - 10, borderRadius: "50%",
                    background: "#3b82f6",
                    border: "2px solid #60a5fa",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "absolute",
                    zIndex: 2,
                  }}>
                    <div style={{ width: 4, height: 4, borderRadius: 2, background: "#fff", marginRight: 4 }} />
                    <div style={{ width: 4, height: 4, borderRadius: 2, background: "#fff" }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Mobile controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gap: 4, marginTop: 16 }}>
        <div />
        <button onClick={() => move(-1, 0)} style={{ width: 44, height: 44, background: "#1a1a2e", color: "#fff", border: "1px solid #333", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>&#9650;</button>
        <div />
        <button onClick={() => move(0, -1)} style={{ width: 44, height: 44, background: "#1a1a2e", color: "#fff", border: "1px solid #333", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>&#9664;</button>
        <button onClick={() => move(1, 0)} style={{ width: 44, height: 44, background: "#1a1a2e", color: "#fff", border: "1px solid #333", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>&#9660;</button>
        <button onClick={() => move(0, 1)} style={{ width: 44, height: 44, background: "#1a1a2e", color: "#fff", border: "1px solid #333", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>&#9654;</button>
      </div>

      {solved && (
        <div style={{ marginTop: 16, textAlign: "center", padding: 16, background: "#1a2a1a", borderRadius: 8, border: "1px solid #22c55e40" }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#22c55e" }}>Level Solved!</div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>Completed in {moves} moves</div>
          {levelIdx + 1 < LEVELS.length && (
            <button onClick={() => loadLevel(levelIdx + 1)} style={{ marginTop: 8, padding: "8px 24px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Next Level</button>
          )}
        </div>
      )}
    </div>
  );
}
