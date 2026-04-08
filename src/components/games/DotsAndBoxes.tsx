"use client";
import { useState, useEffect, useCallback, useRef } from "react";

type Player = "human" | "ai";

interface Line {
  type: "h" | "v";
  row: number;
  col: number;
}

function lineKey(l: Line): string {
  return `${l.type}-${l.row}-${l.col}`;
}

function boxSides(r: number, c: number): Line[] {
  return [
    { type: "h", row: r, col: c },
    { type: "h", row: r + 1, col: c },
    { type: "v", row: r, col: c },
    { type: "v", row: r, col: c + 1 },
  ];
}

function isBoxComplete(lines: Set<string>, r: number, c: number): boolean {
  return boxSides(r, c).every((l) => lines.has(lineKey(l)));
}

function countBoxSides(lines: Set<string>, r: number, c: number): number {
  return boxSides(r, c).filter((l) => lines.has(lineKey(l))).length;
}

function getAllLines(rows: number, cols: number): Line[] {
  const result: Line[] = [];
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c < cols; c++) result.push({ type: "h", row: r, col: c });
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols; c++) result.push({ type: "v", row: r, col: c });
  return result;
}

function adjacentBoxes(
  line: Line,
  rows: number,
  cols: number
): [number, number][] {
  const result: [number, number][] = [];
  if (line.type === "h") {
    if (line.row > 0) result.push([line.row - 1, line.col]);
    if (line.row < rows) result.push([line.row, line.col]);
  } else {
    if (line.col > 0) result.push([line.row, line.col - 1]);
    if (line.col < cols) result.push([line.row, line.col]);
  }
  return result;
}

function wouldComplete(
  lines: Set<string>,
  line: Line,
  rows: number,
  cols: number
): boolean {
  const next = new Set(lines);
  next.add(lineKey(line));
  return adjacentBoxes(line, rows, cols).some(([r, c]) =>
    isBoxComplete(next, r, c)
  );
}

function wouldGiveBox(
  lines: Set<string>,
  line: Line,
  rows: number,
  cols: number
): boolean {
  const next = new Set(lines);
  next.add(lineKey(line));
  return adjacentBoxes(line, rows, cols).some(
    ([r, c]) => countBoxSides(next, r, c) === 3
  );
}

function aiChoose(
  lines: Set<string>,
  rows: number,
  cols: number
): Line | null {
  const all = getAllLines(rows, cols);
  const available = all.filter((l) => !lines.has(lineKey(l)));
  if (available.length === 0) return null;

  // 1. Complete a box
  const completers = available.filter((l) =>
    wouldComplete(lines, l, rows, cols)
  );
  if (completers.length > 0) return completers[0];

  // 2. Safe moves (don't give opponent a box)
  const safe = available.filter((l) => !wouldGiveBox(lines, l, rows, cols));
  if (safe.length > 0) return safe[Math.floor(Math.random() * safe.length)];

  // 3. Pick line that causes least damage
  const scored = available.map((l) => {
    const adj = adjacentBoxes(l, rows, cols);
    const next = new Set(lines);
    next.add(lineKey(l));
    const damage = adj.filter(
      ([r, c]) => countBoxSides(next, r, c) === 3
    ).length;
    return { line: l, damage };
  });
  scored.sort((a, b) => a.damage - b.damage);
  return scored[0].line;
}

const GRID_OPTIONS = [
  { label: "4\u00d74", rows: 3, cols: 3, dots: 4 },
  { label: "5\u00d75", rows: 4, cols: 4, dots: 5 },
  { label: "6\u00d76", rows: 5, cols: 5, dots: 6 },
];

export default function DotsAndBoxes() {
  const [gridIndex, setGridIndex] = useState(1);
  const grid = GRID_OPTIONS[gridIndex];
  const { rows, cols, dots: dotCount } = grid;

  const [lines, setLines] = useState<Set<string>>(new Set());
  const [owners, setOwners] = useState<Record<string, Player>>({});
  const [lineOwners, setLineOwners] = useState<Record<string, Player>>({});
  const [turn, setTurn] = useState<Player>("human");
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ human: 0, ai: 0 });
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const DOT_R = 6;
  const SPACING = 60;
  const PAD = 24;
  const svgW = (dotCount - 1) * SPACING + PAD * 2;
  const svgH = (dotCount - 1) * SPACING + PAD * 2;
  const dotX = (c: number) => PAD + c * SPACING;
  const dotY = (r: number) => PAD + r * SPACING;

  const resetGame = useCallback(
    (idx?: number) => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      const i = idx !== undefined ? idx : gridIndex;
      setGridIndex(i);
      setLines(new Set());
      setOwners({});
      setLineOwners({});
      setTurn("human");
      setGameOver(false);
      setScores({ human: 0, ai: 0 });
      setGameKey((k) => k + 1);
    },
    [gridIndex]
  );

  const handlePlay = useCallback(
    (
      line: Line,
      currentLines: Set<string>,
      currentOwners: Record<string, Player>,
      currentLineOwners: Record<string, Player>,
      currentTurn: Player
    ) => {
      const key = lineKey(line);
      if (currentLines.has(key)) return;

      const nextLines = new Set(currentLines);
      nextLines.add(key);
      const nextLineOwners = { ...currentLineOwners, [key]: currentTurn };

      const r = GRID_OPTIONS[gridIndex].rows;
      const c = GRID_OPTIONS[gridIndex].cols;
      let completed = 0;
      const nextOwners = { ...currentOwners };

      for (let br = 0; br < r; br++) {
        for (let bc = 0; bc < c; bc++) {
          const bk = `${br},${bc}`;
          if (!nextOwners[bk] && isBoxComplete(nextLines, br, bc)) {
            nextOwners[bk] = currentTurn;
            completed++;
          }
        }
      }

      const newScores = { human: 0, ai: 0 };
      for (const v of Object.values(nextOwners)) newScores[v]++;

      const allDone = newScores.human + newScores.ai === r * c;
      const nextTurn =
        completed > 0
          ? currentTurn
          : currentTurn === "human"
          ? "ai"
          : "human";

      setLines(nextLines);
      setOwners(nextOwners);
      setLineOwners(nextLineOwners);
      setScores(newScores);
      setTurn(nextTurn);
      if (allDone) setGameOver(true);
    },
    [gridIndex]
  );

  // AI turn
  useEffect(() => {
    if (turn !== "ai" || gameOver) return;
    aiTimerRef.current = setTimeout(() => {
      const r = GRID_OPTIONS[gridIndex].rows;
      const c = GRID_OPTIONS[gridIndex].cols;
      const chosen = aiChoose(lines, r, c);
      if (!chosen) return;
      handlePlay(chosen, lines, owners, lineOwners, "ai");
    }, 400);
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameOver, gameKey, lines, owners, lineOwners, gridIndex, handlePlay]);

  const handleHumanClick = (line: Line) => {
    if (turn !== "human" || gameOver) return;
    if (lines.has(lineKey(line))) return;
    handlePlay(line, lines, owners, lineOwners, "human");
  };

  const winner = gameOver
    ? scores.human > scores.ai
      ? "You Win!"
      : scores.ai > scores.human
      ? "AI Wins!"
      : "It's a Draw!"
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "#e2e8f0",
        padding: 20,
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          margin: "0 0 4px 0",
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 1,
        }}
      >
        Dots &amp; Boxes
      </h1>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 18px 0" }}>
        Click between dots to draw a line. Complete a box to score!
      </p>

      {/* Grid size selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {GRID_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            onClick={() => resetGame(i)}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              background: gridIndex === i ? "#3b82f6" : "#1e293b",
              color: gridIndex === i ? "#fff" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Score panel */}
      <div
        style={{
          display: "flex",
          gap: 32,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "8px 20px",
            borderRadius: 10,
            background:
              turn === "human" && !gameOver
                ? "rgba(59,130,246,0.15)"
                : "transparent",
            border:
              turn === "human" && !gameOver
                ? "2px solid #3b82f6"
                : "2px solid transparent",
            transition: "all 0.3s",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#3b82f6",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            You
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6" }}>
            {scores.human}
          </div>
        </div>
        <div style={{ fontSize: 16, color: "#475569", fontWeight: 700 }}>
          vs
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "8px 20px",
            borderRadius: 10,
            background:
              turn === "ai" && !gameOver
                ? "rgba(239,68,68,0.15)"
                : "transparent",
            border:
              turn === "ai" && !gameOver
                ? "2px solid #ef4444"
                : "2px solid transparent",
            transition: "all 0.3s",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#ef4444",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            AI
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>
            {scores.ai}
          </div>
        </div>
      </div>

      {/* Turn / winner indicator */}
      {!gameOver && (
        <div
          style={{
            fontSize: 14,
            marginBottom: 12,
            color: turn === "human" ? "#3b82f6" : "#ef4444",
            fontWeight: 600,
          }}
        >
          {turn === "human" ? "Your turn" : "AI is thinking..."}
        </div>
      )}
      {gameOver && winner && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 12,
            color:
              scores.human > scores.ai
                ? "#10b981"
                : scores.ai > scores.human
                ? "#ef4444"
                : "#f59e0b",
            textShadow: "0 0 20px currentColor",
          }}
        >
          {winner}
        </div>
      )}

      {/* Game board */}
      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <svg width={svgW} height={svgH} style={{ display: "block" }}>
          {/* Filled boxes */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const owner = owners[`${r},${c}`];
              if (!owner) return null;
              const isHuman = owner === "human";
              return (
                <g key={`box-${r}-${c}`}>
                  <rect
                    x={dotX(c)}
                    y={dotY(r)}
                    width={SPACING}
                    height={SPACING}
                    fill={
                      isHuman
                        ? "rgba(59,130,246,0.2)"
                        : "rgba(239,68,68,0.2)"
                    }
                    rx={4}
                  />
                  <text
                    x={dotX(c) + SPACING / 2}
                    y={dotY(r) + SPACING / 2 + 6}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight={800}
                    fill={isHuman ? "#3b82f6" : "#ef4444"}
                    opacity={0.7}
                  >
                    {isHuman ? "Y" : "A"}
                  </text>
                </g>
              );
            })
          )}

          {/* Horizontal lines */}
          {Array.from({ length: dotCount }, (_, r) =>
            Array.from({ length: dotCount - 1 }, (_, c) => {
              const line: Line = { type: "h", row: r, col: c };
              const key = lineKey(line);
              const drawn = lines.has(key);
              const lOwner = lineOwners[key];
              const color = drawn
                ? lOwner === "human"
                  ? "#3b82f6"
                  : "#ef4444"
                : "#1e293b";
              return (
                <g key={`hl-${r}-${c}`}>
                  {!drawn && !gameOver && turn === "human" && (
                    <rect
                      x={dotX(c) + DOT_R}
                      y={dotY(r) - 8}
                      width={SPACING - DOT_R * 2}
                      height={16}
                      fill="transparent"
                      cursor="pointer"
                      onClick={() => handleHumanClick(line)}
                      onMouseEnter={(e) => {
                        const sib = e.currentTarget
                          .nextElementSibling as SVGElement | null;
                        if (sib) sib.setAttribute("stroke", "#334155");
                      }}
                      onMouseLeave={(e) => {
                        const sib = e.currentTarget
                          .nextElementSibling as SVGElement | null;
                        if (sib) sib.setAttribute("stroke", "#1e293b");
                      }}
                    />
                  )}
                  <line
                    x1={dotX(c) + DOT_R}
                    y1={dotY(r)}
                    x2={dotX(c + 1) - DOT_R}
                    y2={dotY(r)}
                    stroke={color}
                    strokeWidth={drawn ? 4 : 2}
                    strokeLinecap="round"
                    pointerEvents="none"
                    style={{
                      transition: "stroke 0.2s, stroke-width 0.2s",
                    }}
                  />
                </g>
              );
            })
          )}

          {/* Vertical lines */}
          {Array.from({ length: dotCount - 1 }, (_, r) =>
            Array.from({ length: dotCount }, (_, c) => {
              const line: Line = { type: "v", row: r, col: c };
              const key = lineKey(line);
              const drawn = lines.has(key);
              const lOwner = lineOwners[key];
              const color = drawn
                ? lOwner === "human"
                  ? "#3b82f6"
                  : "#ef4444"
                : "#1e293b";
              return (
                <g key={`vl-${r}-${c}`}>
                  {!drawn && !gameOver && turn === "human" && (
                    <rect
                      x={dotX(c) - 8}
                      y={dotY(r) + DOT_R}
                      width={16}
                      height={SPACING - DOT_R * 2}
                      fill="transparent"
                      cursor="pointer"
                      onClick={() => handleHumanClick(line)}
                      onMouseEnter={(e) => {
                        const sib = e.currentTarget
                          .nextElementSibling as SVGElement | null;
                        if (sib) sib.setAttribute("stroke", "#334155");
                      }}
                      onMouseLeave={(e) => {
                        const sib = e.currentTarget
                          .nextElementSibling as SVGElement | null;
                        if (sib) sib.setAttribute("stroke", "#1e293b");
                      }}
                    />
                  )}
                  <line
                    x1={dotX(c)}
                    y1={dotY(r) + DOT_R}
                    x2={dotX(c)}
                    y2={dotY(r + 1) - DOT_R}
                    stroke={color}
                    strokeWidth={drawn ? 4 : 2}
                    strokeLinecap="round"
                    pointerEvents="none"
                    style={{
                      transition: "stroke 0.2s, stroke-width 0.2s",
                    }}
                  />
                </g>
              );
            })
          )}

          {/* Dots */}
          {Array.from({ length: dotCount }, (_, r) =>
            Array.from({ length: dotCount }, (_, c) => (
              <circle
                key={`dot-${r}-${c}`}
                cx={dotX(c)}
                cy={dotY(r)}
                r={DOT_R}
                fill="#e2e8f0"
                style={{
                  filter: "drop-shadow(0 0 3px rgba(226,232,240,0.4))",
                }}
              />
            ))
          )}
        </svg>
      </div>

      {/* New game button */}
      <button
        onClick={() => resetGame()}
        style={{
          marginTop: 20,
          padding: "10px 28px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          color: "#fff",
          letterSpacing: 0.5,
          transition: "transform 0.15s, box-shadow 0.15s",
          boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        New Game
      </button>
    </div>
  );
}
