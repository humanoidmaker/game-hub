"use client";
import { useState, useCallback, useRef, useEffect } from "react";

/* ─── constants ─── */
const COLORS = [
  "#ef4444", "#3b82f6", "#22c55e", "#eab308",
  "#8b5cf6", "#ec4899", "#f97316", "#06b6d4",
  "#a3e635", "#f43f5e", "#14b8a6", "#d946ef",
];
const LAYERS = 4;
const MAX_UNDO = 10;

type Difficulty = "easy" | "medium" | "hard";
const DIFF_TUBES: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 14 };
const DIFF_LABELS: Record<Difficulty, string> = { easy: "Easy (8)", medium: "Medium (10)", hard: "Hard (14)" };

/* ─── puzzle generation (shuffle from solved → guarantees solvable) ─── */
function generatePuzzle(tubeCount: number): string[][] {
  const colorCount = tubeCount - 2;
  const colors = COLORS.slice(0, colorCount);

  // start from solved state
  const solved: string[][] = colors.map((c) => Array(LAYERS).fill(c));
  solved.push([], []);

  // flatten filled tubes, shuffle, redistribute
  const pool: string[] = [];
  for (let i = 0; i < colorCount; i++) {
    for (let j = 0; j < LAYERS; j++) pool.push(solved[i][j]);
  }

  // fisher-yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // ensure it's not already solved after shuffle
  let alreadySolved = true;
  for (let i = 0; i < colorCount; i++) {
    const slice = pool.slice(i * LAYERS, i * LAYERS + LAYERS);
    if (!slice.every((c) => c === slice[0])) { alreadySolved = false; break; }
  }
  if (alreadySolved) {
    // swap one element between first two tubes
    [pool[0], pool[LAYERS]] = [pool[LAYERS], pool[0]];
  }

  const tubes: string[][] = [];
  for (let i = 0; i < colorCount; i++) {
    tubes.push(pool.slice(i * LAYERS, i * LAYERS + LAYERS));
  }
  tubes.push([], []); // two empty tubes
  return tubes;
}

function isSolved(tubes: string[][]): boolean {
  return tubes.every(
    (t) => t.length === 0 || (t.length === LAYERS && t.every((c) => c === t[0]))
  );
}

/* ─── pour animation state ─── */
interface PourAnim {
  fromIdx: number;
  toIdx: number;
  color: string;
  count: number;
  phase: "lift" | "move" | "drop" | "done";
}

/* ─── component ─── */
export default function WaterSort() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [level, setLevel] = useState(1);
  const [tubes, setTubes] = useState<string[][]>(() => generatePuzzle(DIFF_TUBES.easy));
  const [selected, setSelected] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [history, setHistory] = useState<string[][][]>([]);
  const [anim, setAnim] = useState<PourAnim | null>(null);
  const [won, setWon] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* cleanup timer on unmount */
  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current); }, []);

  const tubeCount = DIFF_TUBES[difficulty];

  const startLevel = useCallback((diff: Difficulty, lvl: number) => {
    setDifficulty(diff);
    setLevel(lvl);
    setTubes(generatePuzzle(DIFF_TUBES[diff]));
    setSelected(null);
    setMoveCount(0);
    setHistory([]);
    setWon(false);
    setAnim(null);
  }, []);

  const restart = useCallback(() => {
    startLevel(difficulty, level);
  }, [difficulty, level, startLevel]);

  const undo = useCallback(() => {
    if (history.length === 0 || anim) return;
    const prev = history[history.length - 1];
    setTubes(prev);
    setHistory((h) => h.slice(0, -1));
    setMoveCount((m) => m - 1);
    setSelected(null);
  }, [history, anim]);

  /* pour with animation */
  const executePour = useCallback(
    (fromIdx: number, toIdx: number, currentTubes: string[][]) => {
      const from = currentTubes[fromIdx];
      const to = currentTubes[toIdx];
      const topColor = from[from.length - 1];

      // count how many matching segments on top of source
      let pourCount = 0;
      for (let i = from.length - 1; i >= 0; i--) {
        if (from[i] === topColor && to.length + pourCount < LAYERS) pourCount++;
        else break;
      }
      if (pourCount === 0) return;

      // save history (before pour)
      setHistory((h) => {
        const next = [...h, currentTubes.map((t) => [...t])];
        return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
      });

      // start animation
      const animState: PourAnim = { fromIdx, toIdx, color: topColor, count: pourCount, phase: "lift" };
      setAnim(animState);

      // remove from source immediately (visually they are "lifted")
      const interim = currentTubes.map((t) => [...t]);
      for (let i = 0; i < pourCount; i++) interim[fromIdx].pop();
      setTubes(interim);

      // phase: lift → move → drop → done
      animTimer.current = setTimeout(() => {
        setAnim((a) => a ? { ...a, phase: "move" } : null);
        animTimer.current = setTimeout(() => {
          setAnim((a) => a ? { ...a, phase: "drop" } : null);
          // actually add to destination
          const final = interim.map((t) => [...t]);
          for (let i = 0; i < pourCount; i++) final[toIdx].push(topColor);
          setTubes(final);
          setMoveCount((m) => m + 1);

          animTimer.current = setTimeout(() => {
            setAnim(null);
            if (isSolved(final)) setWon(true);
          }, 200);
        }, 250);
      }, 200);
    },
    []
  );

  const handleClick = useCallback(
    (idx: number) => {
      if (won || anim) return;

      if (selected === null) {
        if (tubes[idx].length > 0) setSelected(idx);
      } else if (selected === idx) {
        setSelected(null);
      } else {
        const from = tubes[selected];
        const to = tubes[idx];
        const topColor = from[from.length - 1];
        if (to.length < LAYERS && (to.length === 0 || to[to.length - 1] === topColor)) {
          executePour(selected, idx, tubes);
        }
        setSelected(null);
      }
    },
    [selected, tubes, won, anim, executePour]
  );

  const nextLevel = useCallback(() => {
    startLevel(difficulty, level + 1);
  }, [difficulty, level, startLevel]);

  /* ─── styles ─── */
  const bg = "#0f0f1a";
  const panelBg = "#181828";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 12px",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "#e2e8f0",
        userSelect: "none",
      }}
    >
      {/* title */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          margin: "0 0 4px",
          background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.5px",
        }}
      >
        Water Sort Puzzle
      </h1>

      {/* level counter */}
      <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 14 }}>
        Level {level} &middot; {DIFF_LABELS[difficulty]}
      </p>

      {/* difficulty buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => startLevel(d, 1)}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: difficulty === d
                ? "linear-gradient(135deg, #06b6d4, #8b5cf6)"
                : "#1e1e36",
              color: difficulty === d ? "#fff" : "#94a3b8",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {DIFF_LABELS[d]}
          </button>
        ))}
      </div>

      {/* controls row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <button
          onClick={undo}
          disabled={history.length === 0 || !!anim}
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            border: "none",
            background: history.length > 0 && !anim ? "#334155" : "#1e1e2e",
            color: history.length > 0 && !anim ? "#e2e8f0" : "#475569",
            cursor: history.length > 0 && !anim ? "pointer" : "not-allowed",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Undo ({history.length})
        </button>
        <button
          onClick={restart}
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            border: "none",
            background: "#334155",
            color: "#e2e8f0",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Restart
        </button>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>
          Moves: <strong style={{ color: "#e2e8f0" }}>{moveCount}</strong>
        </span>
      </div>

      {/* win banner */}
      {won && (
        <div
          style={{
            background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
            borderRadius: 14,
            padding: "16px 32px",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>
            Solved in {moveCount} moves!
          </p>
          <button
            onClick={nextLevel}
            style={{
              marginTop: 10,
              padding: "8px 24px",
              borderRadius: 8,
              border: "none",
              background: "#fff",
              color: "#1e1e36",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Next Level
          </button>
        </div>
      )}

      {/* tubes area */}
      <div
        style={{
          background: panelBg,
          borderRadius: 20,
          padding: "28px 20px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "center",
          maxWidth: tubeCount <= 10 ? 600 : 800,
        }}
      >
        {tubes.map((tube, i) => {
          const isSelected = selected === i;
          const isAnimSource = anim && anim.fromIdx === i;
          const isAnimDest = anim && anim.toIdx === i;
          const liftOffset = isSelected ? -14 : 0;

          // pour animation floating segments
          let floatingSegments: React.ReactNode = null;
          if (anim && (isAnimSource || isAnimDest)) {
            const { phase, color, count } = anim;
            if (phase === "lift" && isAnimSource) {
              floatingSegments = (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column-reverse",
                    alignItems: "center",
                    transition: "transform 0.2s ease-out",
                    transform: "translateY(-8px)",
                  }}
                >
                  {Array.from({ length: count }).map((_, si) => (
                    <div
                      key={si}
                      style={{
                        width: "80%",
                        height: 28,
                        background: color,
                        borderRadius: si === 0 ? "6px 6px 0 0" : 0,
                        marginBottom: 1,
                        boxShadow: `0 0 12px ${color}66`,
                      }}
                    />
                  ))}
                </div>
              );
            }
            if ((phase === "move" || phase === "drop") && isAnimDest) {
              floatingSegments = (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column-reverse",
                    alignItems: "center",
                    transition: "transform 0.25s ease-in",
                    transform: phase === "drop" ? `translateY(${(LAYERS - tube.length + count) * 30 + 20}px)` : "translateY(-8px)",
                    opacity: phase === "drop" ? 0 : 1,
                  }}
                >
                  {Array.from({ length: count }).map((_, si) => (
                    <div
                      key={si}
                      style={{
                        width: "80%",
                        height: 28,
                        background: color,
                        borderRadius: si === 0 ? "6px 6px 0 0" : 0,
                        marginBottom: 1,
                        boxShadow: `0 0 12px ${color}66`,
                      }}
                    />
                  ))}
                </div>
              );
            }
          }

          return (
            <div
              key={i}
              onClick={() => handleClick(i)}
              style={{
                position: "relative",
                cursor: won ? "default" : "pointer",
                transform: `translateY(${liftOffset}px)`,
                transition: "transform 0.15s ease-out",
              }}
            >
              {floatingSegments}

              {/* tube */}
              <div
                style={{
                  width: 48,
                  height: 140,
                  borderRadius: "4px 4px 20px 20px",
                  border: isSelected
                    ? "2px solid #06b6d4"
                    : "2px solid #334155",
                  borderTop: isSelected
                    ? "2px solid transparent"
                    : "2px solid transparent",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                  display: "flex",
                  flexDirection: "column-reverse",
                  padding: "3px",
                  gap: 2,
                  boxShadow: isSelected
                    ? "0 0 16px rgba(6,182,212,0.3), inset 0 0 20px rgba(255,255,255,0.02)"
                    : "inset 0 0 20px rgba(255,255,255,0.02)",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {tube.map((color, j) => {
                  const isBottom = j === 0;
                  const isTop = j === tube.length - 1;
                  return (
                    <div
                      key={j}
                      style={{
                        width: "100%",
                        height: 30,
                        borderRadius: isBottom
                          ? "2px 2px 16px 16px"
                          : isTop
                          ? "4px 4px 2px 2px"
                          : "2px",
                        background: `linear-gradient(180deg, ${color}ee 0%, ${color} 60%, ${color}cc 100%)`,
                        boxShadow: `inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 6px ${color}44`,
                        transition: "all 0.2s ease",
                      }}
                    />
                  );
                })}
              </div>

              {/* glass reflection overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 5,
                  width: 8,
                  height: 140,
                  borderRadius: "4px 4px 20px 20px",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* instructions */}
      <p style={{ marginTop: 20, color: "#475569", fontSize: 12, textAlign: "center", maxWidth: 400, lineHeight: 1.6 }}>
        Click a tube to select it, then click another to pour.
        You can only pour onto the same color or into an empty tube.
        Fill each tube with a single color to win.
      </p>
    </div>
  );
}
