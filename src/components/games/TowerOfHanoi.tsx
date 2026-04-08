"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
];

const PEG_HEIGHT = 300;
const PEG_WIDTH = 8;
const BASE_HEIGHT = 12;
const DISK_HEIGHT = 28;
const DISK_GAP = 2;
const MIN_DISK_WIDTH = 40;
const MAX_DISK_WIDTH = 160;
const PEG_SPACING = 220;
const LIFT_HEIGHT = 40;
const ANIM_DURATION = 300;

interface AnimatingDisk {
  disk: number;
  fromPeg: number;
  toPeg: number;
  phase: "lift" | "move" | "drop";
  x: number;
  y: number;
}

function diskWidth(disk: number, totalDisks: number): number {
  const range = MAX_DISK_WIDTH - MIN_DISK_WIDTH;
  return MIN_DISK_WIDTH + (disk / totalDisks) * range;
}

function pegCenterX(pegIndex: number): number {
  return PEG_SPACING * pegIndex + PEG_SPACING / 2;
}

function diskY(stackIndex: number): number {
  return PEG_HEIGHT - BASE_HEIGHT - (stackIndex + 1) * (DISK_HEIGHT + DISK_GAP);
}

function generateHanoiMoves(
  n: number,
  from: number,
  to: number,
  aux: number
): [number, number][] {
  if (n === 0) return [];
  return [
    ...generateHanoiMoves(n - 1, from, aux, to),
    [from, to],
    ...generateHanoiMoves(n - 1, aux, to, from),
  ];
}

export default function TowerOfHanoi() {
  const [diskCount, setDiskCount] = useState(4);
  const [pegs, setPegs] = useState<number[][]>(() => [
    Array.from({ length: 4 }, (_, i) => 4 - i),
    [],
    [],
  ]);
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [animating, setAnimating] = useState<AnimatingDisk | null>(null);
  const [autoSolving, setAutoSolving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSolveRef = useRef(false);
  const pegsRef = useRef(pegs);
  pegsRef.current = pegs;

  // Timer
  useEffect(() => {
    if (running && !won) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, won]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const optimal = Math.pow(2, diskCount) - 1;

  const resetGame = useCallback((n: number) => {
    autoSolveRef.current = false;
    setAutoSolving(false);
    setDiskCount(n);
    setPegs([Array.from({ length: n }, (_, i) => n - i), [], []]);
    setSelectedPeg(null);
    setMoves(0);
    setTimer(0);
    setRunning(false);
    setWon(false);
    setAnimating(null);
  }, []);

  const animateMove = useCallback(
    (
      fromPeg: number,
      toPeg: number,
      currentPegs: number[][],
      onDone: (newPegs: number[][]) => void
    ) => {
      const disk = currentPegs[fromPeg][currentPegs[fromPeg].length - 1];
      const fromStack = currentPegs[fromPeg].length - 1;
      const toStack = currentPegs[toPeg].length;
      const startX = pegCenterX(fromPeg);
      const startY = diskY(fromStack);
      const endX = pegCenterX(toPeg);
      const endY = diskY(toStack);
      const topY = LIFT_HEIGHT;

      // Phase 1: lift
      setAnimating({ disk, fromPeg, toPeg, phase: "lift", x: startX, y: startY });

      setTimeout(() => {
        setAnimating({ disk, fromPeg, toPeg, phase: "lift", x: startX, y: topY });

        setTimeout(() => {
          // Phase 2: move horizontally
          setAnimating({ disk, fromPeg, toPeg, phase: "move", x: endX, y: topY });

          setTimeout(() => {
            // Phase 3: drop
            setAnimating({ disk, fromPeg, toPeg, phase: "drop", x: endX, y: endY });

            setTimeout(() => {
              // Complete the move
              const np = currentPegs.map((p) => [...p]);
              np[fromPeg].pop();
              np[toPeg].push(disk);
              setAnimating(null);
              onDone(np);
            }, ANIM_DURATION);
          }, ANIM_DURATION);
        }, ANIM_DURATION);
      }, 50);
    },
    []
  );

  const handlePegClick = (pegIndex: number) => {
    if (won || animating || autoSolving) return;

    if (!running && pegs[0].length === diskCount) {
      setRunning(true);
    }

    if (selectedPeg === null) {
      if (pegs[pegIndex].length > 0) setSelectedPeg(pegIndex);
      return;
    }

    if (selectedPeg === pegIndex) {
      setSelectedPeg(null);
      return;
    }

    const fromPegs = pegs[selectedPeg];
    const toPegs = pegs[pegIndex];
    const disk = fromPegs[fromPegs.length - 1];

    if (toPegs.length > 0 && toPegs[toPegs.length - 1] < disk) {
      setSelectedPeg(null);
      return;
    }

    if (!running) setRunning(true);
    setSelectedPeg(null);

    animateMove(selectedPeg, pegIndex, pegs, (newPegs) => {
      setPegs(newPegs);
      setMoves((m) => m + 1);
      if (newPegs[2].length === diskCount) {
        setWon(true);
        setRunning(false);
      }
    });
  };

  const handleAutoSolve = useCallback(() => {
    if (autoSolving || animating) return;

    // Reset to initial state first
    const n = diskCount;
    const initialPegs: number[][] = [
      Array.from({ length: n }, (_, i) => n - i),
      [],
      [],
    ];
    setPegs(initialPegs);
    setMoves(0);
    setTimer(0);
    setRunning(true);
    setWon(false);
    setSelectedPeg(null);
    setAutoSolving(true);
    autoSolveRef.current = true;

    const solveMoves = generateHanoiMoves(n, 0, 2, 1);
    let moveIndex = 0;
    let currentPegs = initialPegs;

    const doNext = () => {
      if (!autoSolveRef.current || moveIndex >= solveMoves.length) {
        if (autoSolveRef.current && moveIndex >= solveMoves.length) {
          setWon(true);
          setRunning(false);
        }
        setAutoSolving(false);
        autoSolveRef.current = false;
        return;
      }

      const [from, to] = solveMoves[moveIndex];
      moveIndex++;

      animateMove(from, to, currentPegs, (newPegs) => {
        currentPegs = newPegs;
        setPegs(newPegs);
        setMoves((m) => m + 1);
        setTimeout(doNext, 100);
      });
    };

    setTimeout(doNext, 300);
  }, [diskCount, autoSolving, animating, animateMove]);

  const totalWidth = PEG_SPACING * 3;
  const totalHeight = PEG_HEIGHT + 60;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0a1a",
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#e0e0e0",
        userSelect: "none",
      }}
    >
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 4,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 1,
        }}
      >
        Tower of Hanoi
      </h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        Move all disks from peg A to peg C
      </p>

      {/* Disk count selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => resetGame(n)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "2px solid",
              borderColor: diskCount === n ? "#3b82f6" : "#333",
              background: diskCount === n ? "#3b82f6" : "#1a1a2e",
              color: diskCount === n ? "#fff" : "#888",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {n} Disks
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: "#1a1a2e",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #333",
          }}
        >
          <span style={{ color: "#888", fontSize: 12 }}>Moves</span>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
            {moves}
          </div>
        </div>
        <div
          style={{
            background: "#1a1a2e",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #333",
          }}
        >
          <span style={{ color: "#888", fontSize: 12 }}>Optimal</span>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#8b5cf6" }}>
            {optimal}
          </div>
        </div>
        <div
          style={{
            background: "#1a1a2e",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #333",
          }}
        >
          <span style={{ color: "#888", fontSize: 12 }}>Time</span>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
            {formatTime(timer)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => resetGame(diskCount)}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: "#1a1a2e",
            color: "#e0e0e0",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid #333",
            transition: "all 0.2s",
          }}
        >
          New Game
        </button>
        <button
          onClick={handleAutoSolve}
          disabled={autoSolving || !!animating}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background:
              autoSolving || animating
                ? "#333"
                : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            color: autoSolving || animating ? "#666" : "#fff",
            cursor: autoSolving || animating ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          {autoSolving ? "Solving..." : "Auto Solve"}
        </button>
      </div>

      {/* Win message */}
      {won && (
        <div
          style={{
            padding: "12px 32px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
            textAlign: "center",
            boxShadow: "0 0 30px #10b98155",
          }}
        >
          Solved in {moves} moves!
          {moves === optimal && (
            <span
              style={{ display: "block", fontSize: 14, fontWeight: 400, marginTop: 4 }}
            >
              Perfect! That is the optimal solution!
            </span>
          )}
        </div>
      )}

      {/* Game area */}
      <div
        style={{
          position: "relative",
          width: totalWidth,
          height: totalHeight,
          background: "#0f0f23",
          borderRadius: 16,
          border: "1px solid #222",
          overflow: "hidden",
        }}
      >
        {/* Base */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: BASE_HEIGHT,
            background: "linear-gradient(180deg, #444, #333)",
            borderRadius: "0 0 16px 16px",
          }}
        />

        {/* Pegs */}
        {[0, 1, 2].map((pi) => {
          const cx = pegCenterX(pi);
          const isSelected = selectedPeg === pi;
          return (
            <div
              key={pi}
              onClick={() => handlePegClick(pi)}
              style={{
                position: "absolute",
                left: cx - PEG_SPACING / 2,
                top: 0,
                width: PEG_SPACING,
                height: PEG_HEIGHT,
                cursor: animating || autoSolving ? "default" : "pointer",
              }}
            >
              {/* Pole */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  bottom: BASE_HEIGHT,
                  width: PEG_WIDTH,
                  height: PEG_HEIGHT - BASE_HEIGHT - 30,
                  background: isSelected
                    ? "linear-gradient(180deg, #3b82f6, #60a5fa)"
                    : "linear-gradient(180deg, #555, #444)",
                  borderRadius: PEG_WIDTH / 2,
                  boxShadow: isSelected
                    ? "0 0 20px #3b82f688, 0 0 40px #3b82f644"
                    : "none",
                  transition: "all 0.2s",
                }}
              />

              {/* Peg label */}
              <div
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: isSelected ? "#3b82f6" : "#555",
                  fontSize: 16,
                  fontWeight: 700,
                  transition: "color 0.2s",
                }}
              >
                {["A", "B", "C"][pi]}
              </div>

              {/* Disks on this peg */}
              {pegs[pi].map((disk, di) => {
                // Hide disk if it's being animated away from this peg
                if (
                  animating &&
                  animating.fromPeg === pi &&
                  animating.disk === disk &&
                  di === pegs[pi].length - 1
                ) {
                  return null;
                }
                const w = diskWidth(disk, diskCount);
                const y = diskY(di);
                return (
                  <div
                    key={di}
                    style={{
                      position: "absolute",
                      left: "50%",
                      transform: "translateX(-50%)",
                      top: y,
                      width: w,
                      height: DISK_HEIGHT,
                      background: `linear-gradient(180deg, ${COLORS[disk - 1]}, ${COLORS[disk - 1]}cc)`,
                      borderRadius: DISK_HEIGHT / 2,
                      boxShadow: `0 2px 8px ${COLORS[disk - 1]}44`,
                      border: "1px solid #ffffff15",
                      transition: "none",
                    }}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Animating disk */}
        {animating && (
          <div
            style={{
              position: "absolute",
              left: animating.x,
              top: animating.y,
              width: diskWidth(animating.disk, diskCount),
              height: DISK_HEIGHT,
              background: `linear-gradient(180deg, ${COLORS[animating.disk - 1]}, ${COLORS[animating.disk - 1]}cc)`,
              borderRadius: DISK_HEIGHT / 2,
              boxShadow: `0 4px 16px ${COLORS[animating.disk - 1]}66, 0 0 20px ${COLORS[animating.disk - 1]}33`,
              border: "1px solid #ffffff22",
              transform: "translateX(-50%)",
              transition: `left ${ANIM_DURATION}ms ease-in-out, top ${ANIM_DURATION}ms ease-in-out`,
              zIndex: 100,
            }}
          />
        )}
      </div>

      {/* Instructions */}
      <p
        style={{
          color: "#444",
          fontSize: 12,
          marginTop: 24,
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        Click a peg to select the top disk, then click another peg to move it.
        Only smaller disks can be placed on larger ones.
      </p>
    </div>
  );
}
