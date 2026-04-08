"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ───────── constants ───────── */
const COLORS = ["#e63946", "#457b9d", "#2a9d8f", "#e9c46a"] as const;
const DARK_COLORS = ["#b71c1c", "#1a5276", "#1b7a6e", "#c9a227"] as const;
const LIGHT_COLORS = [
  "rgba(230,57,70,0.25)",
  "rgba(69,123,157,0.25)",
  "rgba(42,157,143,0.25)",
  "rgba(233,196,106,0.25)",
] as const;
const NAMES = ["Red", "Blue", "Green", "Yellow"] as const;
const BOARD = 15;
const MAIN_PATH = 52;
const HOME_STRETCH = 5;
const TOKENS_PER_PLAYER = 4;

/* Start positions on the 52-square main loop for each player */
const START_POS = [0, 13, 26, 39];
/* Safe squares on the main loop (start positions + the star squares) */
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/* ───────── board coordinate mapping ───────── */

// The 52 main-path squares mapped to (row, col) on the 15x15 grid.
// We trace the classic Ludo path clockwise starting from Red's start.
const MAIN_PATH_COORDS: [number, number][] = (() => {
  const p: [number, number][] = [];
  // Red start column going up (col=1, row 6→1)
  for (let r = 6; r >= 1; r--) p.push([r, 6]);
  // top row going right (row=0, col 6→8)
  p.push([0, 6]);
  p.push([0, 7]);
  p.push([0, 8]);
  // Blue start column going down (col=8, row 0→5) — but right side top
  // Actually: top-right going down col=8
  for (let r = 1; r <= 6; r++) p.push([r, 8]);
  // right row going right (row=6, col 9→13)
  for (let c = 9; c <= 13; c++) p.push([6, c]);
  // right edge going down (col=14, row 6→8)
  p.push([14, 6]);
  p.push([14, 7]);
  p.push([14, 8]);
  // Green start going down then left — bottom-right going left col=8 row 8→13
  for (let r = 8; r <= 13; r++) p.push([r, 8]);
  // bottom row going left (row=14, col 8→6)
  p.push([14, 8]);
  p.push([14, 7]);
  p.push([14, 6]);
  // left col going up (col=6, row 13→8)
  for (let c = 5; c >= 1; c--) p.push([8, c]);
  // left edge up (row 8→6, col=0)
  p.push([8, 0]);
  p.push([7, 0]);
  p.push([6, 0]);
  // back to Red's column going up (col=6, row 5→1) — wait, that's where we started
  for (let r = 8; r <= 13; r++) p.push([r, 6]);
  return p;
})();

// Actually let me properly map the classic Ludo board path.
// The 15x15 board has a cross-shaped path. Let me redo this carefully.

function buildMainPath(): [number, number][] {
  const coords: [number, number][] = [];

  // Segment 1: Red's exit column — going UP from (6,1) to (1,1)...
  // Actually the classic path: Red starts at row=6, col=1 and goes upward.
  // But the standard Ludo 15x15:
  // Top-left = Red home base (rows 0-5, cols 0-5)
  // Top-right = Blue home base (rows 0-5, cols 9-14)
  // Bottom-left = Yellow home base (rows 9-14, cols 0-5)
  // Bottom-right = Green home base (rows 9-14, cols 9-14)
  // Cross path: row 6-8 full width, col 6-8 full height

  // Path squares (the cross arms + perimeter of the cross):
  // We go clockwise from Red's start.

  // Red starts: position just outside Red's home = (6, 1)
  // Path goes UP along col 6 from row 6 to row 0
  for (let r = 6; r >= 1; r--) coords.push([r, 6]);
  // Turn right at top: row 0, col 6 → col 7 → col 8
  coords.push([0, 6]);
  coords.push([0, 7]);
  coords.push([0, 8]);
  // Blue starts: go DOWN along col 8 from row 0 to row 6
  for (let r = 1; r <= 6; r++) coords.push([r, 8]);
  // Turn right: row 6, col 9 → col 14... wait, col 9 to 13
  for (let c = 9; c <= 13; c++) coords.push([6, c]);
  // Turn down: col 14, row 6 → 7 → 8
  coords.push([14, 6]);  // Hmm, this is wrong. Let me think again.

  // OK I need to be very precise. Let me just hardcode the 52 coords.
  return coords;
}

// Let me just define the path properly with a direct coordinate list.
// Classic Ludo 15x15 board path (52 squares), starting from Red's start square.
// The cross occupies rows 6-8 (horizontal) and cols 6-8 (vertical).
// Path goes along the OUTER edge of the cross.

function getMainPathCoords(): [number, number][] {
  const c: [number, number][] = [];

  // --- Segment: Red's arm (left-center going up) ---
  // Start at (6,1) going up to (1,6)
  // Actually: go up col=6 from row=6 to row=1
  c.push([6, 1]); // 0 - Red start
  c.push([5, 1]); // Hmm, this is wrong too.

  // Let me think about this differently. The path in Ludo goes around the board
  // on the OUTSIDE of the cross shape. Each arm of the cross has 6 squares
  // in the outer column and 6 in the inner column.

  // I'll trace it as: for each arm, 5 squares going toward center on one side,
  // 1 at the tip, then 5 going away from center on the other side, plus 2 at
  // each corner = 13 per quadrant × 4 = 52.

  return c;
}

// After careful analysis, here's the definitive 52-cell main path for a 15×15 Ludo board.
// Row/col are 0-indexed. The path starts at Red's entry point and goes clockwise.

const PATH: [number, number][] = [
  // 0-4: Up Red's left column (col 6, rows 6→2) — BUT we need to start outside home
  // Red enters at the square just after Yellow's last square.
  // Standard: Red's start is at the top of the left arm.

  // Let me use the STANDARD numbering:
  // Red start = square 0 = (6,1)
  // Goes up along col 1... NO.

  // OK. I'll use a well-known layout:
  // The cross consists of:
  //   Vertical arm: col 6,7,8 for all rows 0-14
  //   Horizontal arm: row 6,7,8 for all cols 0-14
  // The path goes around the perimeter of this cross.

  // Starting from Red's start (1,6), going up (toward row 0):
  [1, 6], // 0  - RED START
  [2, 6], // 1
  [3, 6], // 2
  [4, 6], // 3
  [5, 6], // 4
  [6, 5], // 5  - turn left
  [6, 4], // 6
  [6, 3], // 7
  [6, 2], // 8  - SAFE (star)
  [6, 1], // 9
  [6, 0], // 10
  [7, 0], // 11 - turn down
  [8, 0], // 12
  [8, 1], // 13 - YELLOW START
  [8, 2], // 14
  [8, 3], // 15
  [8, 4], // 16
  [8, 5], // 17
  [9, 6], // 18 - turn down
  [10, 6], // 19
  [11, 6], // 20
  [12, 6], // 21 - SAFE (star)
  [13, 6], // 22
  [14, 6], // 23
  [14, 7], // 24 - turn right
  [14, 8], // 25
  [13, 8], // 26 - GREEN START
  [12, 8], // 27
  [11, 8], // 28
  [10, 8], // 29
  [9, 8],  // 30
  [8, 9],  // 31 - turn right
  [8, 10], // 32
  [8, 11], // 33
  [8, 12], // 34 - SAFE (star)
  [8, 13], // 35
  [8, 14], // 36
  [7, 14], // 37 - turn up
  [6, 14], // 38
  [6, 13], // 39 - BLUE START
  [6, 12], // 40
  [6, 11], // 41
  [6, 10], // 42
  [6, 9],  // 43
  [5, 8],  // 44 - turn up
  [4, 8],  // 45
  [3, 8],  // 46
  [2, 8],  // 47 - SAFE (star)
  [1, 8],  // 48
  [0, 8],  // 49
  [0, 7],  // 50 - turn left
  [0, 6],  // 51
];

// Each player's start index on the main path
const PLAYER_START = [0, 39, 26, 13]; // Red, Blue, Green, Yellow

// Each player's home-stretch entry: the square BEFORE entering home stretch
// (i.e., the last main-path square before diverting)
// Red: enters home stretch after square 51 (goes into row 1-5, col 7)
// Blue: enters home stretch after square 38 (goes into col 13-9, row 7)
// Green: enters home stretch after square 25 (goes into row 13-9, col 7)
// Yellow: enters home stretch after square 12 (goes into col 1-5, row 7)
const HOME_ENTRY = [51, 38, 25, 12];

// Home stretch coordinates for each player (5 squares leading to center)
const HOME_STRETCH_COORDS: [number, number][][] = [
  // Red: col 7, rows 1→5
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  // Blue: row 7, cols 13→9
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  // Green: col 7, rows 13→9
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  // Yellow: row 7, cols 1→5
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
];

// Home base token positions (where tokens sit before entering play)
const HOME_POSITIONS: [number, number][][] = [
  // Red (top-left quadrant)
  [[1, 1], [1, 4], [4, 1], [4, 4]],
  // Blue (top-right quadrant)
  [[1, 10], [1, 13], [4, 10], [4, 13]],
  // Green (bottom-right quadrant)
  [[10, 10], [10, 13], [13, 10], [13, 13]],
  // Yellow (bottom-left quadrant)
  [[10, 1], [10, 4], [13, 1], [13, 4]],
];

// Safe squares (start positions + star positions)
const SAFE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/* ───────── types ───────── */
interface TokenState {
  /** -1 = at home base, 0-51 = main path index (RELATIVE to this player's start), 52-56 = home stretch (52=HS[0]..56=HS[4]), 57 = finished */
  pos: number;
}

interface GameState {
  tokens: TokenState[][]; // [player][token]
  current: number;
  dice: number;
  rolled: boolean;
  status: string;
  gameOver: boolean;
  winner: number;
  animating: boolean;
  consecutiveSixes: number;
  scores: number[]; // tokens finished per player
}

/* ───────── helpers ───────── */
function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function absPathIndex(player: number, relPos: number): number {
  // Convert player-relative position (0-51) to absolute main path index
  return (PLAYER_START[player] + relPos) % MAIN_PATH;
}

function getTokenCoords(player: number, token: TokenState, tokenIndex: number): [number, number] {
  if (token.pos === -1) {
    return HOME_POSITIONS[player][tokenIndex];
  }
  if (token.pos >= MAIN_PATH && token.pos < MAIN_PATH + HOME_STRETCH) {
    return HOME_STRETCH_COORDS[player][token.pos - MAIN_PATH];
  }
  if (token.pos >= MAIN_PATH + HOME_STRETCH) {
    // Finished — place in center
    const offsets: [number, number][] = [[7, 6], [6, 7], [7, 8], [8, 7]];
    return offsets[player];
  }
  const absIdx = absPathIndex(player, token.pos);
  return PATH[absIdx];
}

function canTokenMove(token: TokenState, dice: number): boolean {
  if (token.pos >= MAIN_PATH + HOME_STRETCH) return false; // already finished
  if (token.pos === -1) return dice === 6;
  const newPos = token.pos + dice;
  if (newPos > MAIN_PATH + HOME_STRETCH) return false; // overshoot
  return true;
}

function getNewPos(token: TokenState, dice: number): number {
  if (token.pos === -1) return 0; // enter at relative position 0
  return token.pos + dice;
}

function initState(): GameState {
  return {
    tokens: Array.from({ length: 4 }, () =>
      Array.from({ length: TOKENS_PER_PLAYER }, () => ({ pos: -1 }))
    ),
    current: 0,
    dice: 0,
    rolled: false,
    status: "Red's turn — roll the dice!",
    gameOver: false,
    winner: -1,
    animating: false,
    consecutiveSixes: 0,
    scores: [0, 0, 0, 0],
  };
}

/* ───────── dice face SVG ───────── */
function DiceFace({ value, size = 56 }: { value: number; size?: number }) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
  };
  const dots = value >= 1 && value <= 6 ? dotPositions[value] : [];
  const r = size * 0.08;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect x={2} y={2} width={size - 4} height={size - 4} rx={8} ry={8}
        fill="#fff" stroke="#333" strokeWidth={2} />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx * size} cy={cy * size} r={r} fill="#1a1a2e" />
      ))}
    </svg>
  );
}

/* ───────── cell type detection ───────── */
function getCellType(row: number, col: number): {
  type: "home" | "path" | "homeStretch" | "center" | "empty";
  player?: number;
  pathIndex?: number;
  isSafe?: boolean;
  isStar?: boolean;
  isStart?: boolean;
  homeStretchIndex?: number;
} {
  // Center (3x3)
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
    return { type: "center" };
  }

  // Home stretch cells
  for (let p = 0; p < 4; p++) {
    for (let h = 0; h < HOME_STRETCH; h++) {
      const [hr, hc] = HOME_STRETCH_COORDS[p][h];
      if (row === hr && col === hc) {
        return { type: "homeStretch", player: p, homeStretchIndex: h };
      }
    }
  }

  // Main path cells
  for (let i = 0; i < MAIN_PATH; i++) {
    const [pr, pc] = PATH[i];
    if (row === pr && col === pc) {
      const isSafe = SAFE_SET.has(i);
      const isStart = i === 0 || i === 13 || i === 26 || i === 39;
      const isStar = isSafe && !isStart;
      return { type: "path", pathIndex: i, isSafe, isStar, isStart };
    }
  }

  // Home bases
  if (row >= 0 && row <= 5 && col >= 0 && col <= 5) return { type: "home", player: 0 };
  if (row >= 0 && row <= 5 && col >= 9 && col <= 14) return { type: "home", player: 1 };
  if (row >= 9 && row <= 14 && col >= 9 && col <= 14) return { type: "home", player: 2 };
  if (row >= 9 && row <= 14 && col >= 0 && col <= 5) return { type: "home", player: 3 };

  return { type: "empty" };
}

/* ───────── determine cell background color ───────── */
function getCellBg(row: number, col: number, cellInfo: ReturnType<typeof getCellType>): string {
  if (cellInfo.type === "center") return "#1a1a2e";
  if (cellInfo.type === "homeStretch") return COLORS[cellInfo.player!];
  if (cellInfo.type === "home") return LIGHT_COLORS[cellInfo.player!];

  if (cellInfo.type === "path") {
    if (cellInfo.isStart) {
      // Color the start squares
      if (cellInfo.pathIndex === 0) return COLORS[0];
      if (cellInfo.pathIndex === 13) return COLORS[3];
      if (cellInfo.pathIndex === 26) return COLORS[2];
      if (cellInfo.pathIndex === 39) return COLORS[1];
    }
    if (cellInfo.isStar) return "#2a2a4a";
    return "#1e1e3a";
  }

  return "transparent";
}

/* ───────── main component ───────── */
export default function Ludo() {
  const [game, setGame] = useState<GameState>(initState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Bot auto-play
  useEffect(() => {
    if (game.gameOver || game.animating) return;
    if (game.current !== 0) {
      // Bot's turn
      if (!game.rolled) {
        timerRef.current = setTimeout(() => {
          handleRoll();
        }, 600);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.current, game.rolled, game.gameOver, game.animating]);

  const handleRoll = useCallback(() => {
    setGame(prev => {
      if (prev.rolled || prev.gameOver || prev.animating) return prev;
      const dice = rollDice();
      const p = prev.current;
      const movable = prev.tokens[p].filter((t, _) => canTokenMove(t, dice));

      if (movable.length === 0) {
        // No moves possible
        const next = (p + 1) % 4;
        return {
          ...prev,
          dice,
          rolled: false,
          current: next,
          consecutiveSixes: 0,
          status: `${NAMES[p]} rolled ${dice} — no moves. ${NAMES[next]}'s turn!`,
        };
      }

      if (p === 0) {
        // Human player — wait for token selection
        return {
          ...prev,
          dice,
          rolled: true,
          status: `Red rolled ${dice} — pick a token to move!`,
        };
      }

      // Bot: auto-select best token
      const bestIdx = selectBotToken(prev, p, dice);
      return executeMove(prev, p, bestIdx, dice);
    });
  }, []);

  const handleTokenClick = useCallback((player: number, tokenIdx: number) => {
    setGame(prev => {
      if (prev.gameOver || prev.animating) return prev;
      if (player !== 0 || prev.current !== 0 || !prev.rolled) return prev;
      if (!canTokenMove(prev.tokens[0][tokenIdx], prev.dice)) return prev;
      return executeMove(prev, 0, tokenIdx, prev.dice);
    });
  }, []);

  const handleNewGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setGame(initState());
  }, []);

  // Build board cells
  const cells: JSX.Element[] = [];
  // Track which tokens are on which cell for rendering
  const tokenPositions = new Map<string, { player: number; tokenIdx: number; token: TokenState }[]>();

  for (let p = 0; p < 4; p++) {
    for (let t = 0; t < TOKENS_PER_PLAYER; t++) {
      const tok = game.tokens[p][t];
      const [row, col] = getTokenCoords(p, tok, t);
      const key = `${row},${col}`;
      if (!tokenPositions.has(key)) tokenPositions.set(key, []);
      tokenPositions.get(key)!.push({ player: p, tokenIdx: t, token: tok });
    }
  }

  for (let row = 0; row < BOARD; row++) {
    for (let col = 0; col < BOARD; col++) {
      const cellInfo = getCellType(row, col);
      const bg = getCellBg(row, col, cellInfo);
      const key = `${row},${col}`;
      const tokensHere = tokenPositions.get(key) || [];

      const isPartOfBoard = cellInfo.type !== "empty" &&
        !(cellInfo.type === "home" && !HOME_POSITIONS.some(hp => hp.some(([r, c]) => r === row && c === col)));

      // Determine if this is a home base circle position
      const isHomeCircle = HOME_POSITIONS.some(hp => hp.some(([r, c]) => r === row && c === col));

      cells.push(
        <div
          key={key}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            backgroundColor: cellInfo.type === "empty" ? "transparent" :
              cellInfo.type === "home" ? (isHomeCircle ? LIGHT_COLORS[cellInfo.player!] : LIGHT_COLORS[cellInfo.player!]) :
              bg,
            border: (cellInfo.type === "path" || cellInfo.type === "homeStretch" || cellInfo.type === "center")
              ? "1px solid rgba(255,255,255,0.1)"
              : cellInfo.type === "home" && isHomeCircle ? "1px solid rgba(255,255,255,0.08)" : "none",
            borderRadius: cellInfo.type === "center" ? "0" : "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
            transition: "background-color 0.2s",
          }}
        >
          {/* Star marker for safe squares */}
          {cellInfo.isStar && tokensHere.length === 0 && (
            <span style={{ fontSize: "10px", color: "#ffd700", opacity: 0.7, position: "absolute" }}>★</span>
          )}
          {/* Start arrow */}
          {cellInfo.isStart && tokensHere.length === 0 && (
            <span style={{
              fontSize: "8px",
              fontWeight: "bold",
              color: "#fff",
              opacity: 0.5,
              position: "absolute",
            }}>▶</span>
          )}
          {/* Center star */}
          {cellInfo.type === "center" && row === 7 && col === 7 && (
            <span style={{
              fontSize: "18px",
              color: "#ffd700",
              filter: "drop-shadow(0 0 4px #ffd700)",
            }}>★</span>
          )}
          {/* Home base circles (empty spots for tokens) */}
          {isHomeCircle && tokensHere.length === 0 && cellInfo.type === "home" && (
            <div style={{
              width: "60%",
              height: "60%",
              borderRadius: "50%",
              border: `2px solid ${COLORS[cellInfo.player!]}`,
              opacity: 0.4,
            }} />
          )}
          {/* Tokens */}
          {tokensHere.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1px",
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}>
              {tokensHere.map(({ player: tp, tokenIdx: ti }, i) => {
                const isClickable = tp === 0 && game.current === 0 && game.rolled &&
                  canTokenMove(game.tokens[0][ti], game.dice);
                const size = tokensHere.length > 1 ? "55%" : "70%";
                return (
                  <div
                    key={`${tp}-${ti}`}
                    onClick={() => handleTokenClick(tp, ti)}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: "50%",
                      backgroundColor: COLORS[tp],
                      border: `2px solid ${DARK_COLORS[tp]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: tokensHere.length > 1 ? "7px" : "9px",
                      fontWeight: "bold",
                      color: "#fff",
                      cursor: isClickable ? "pointer" : "default",
                      boxShadow: isClickable
                        ? `0 0 8px ${COLORS[tp]}, 0 0 16px ${COLORS[tp]}`
                        : `0 1px 3px rgba(0,0,0,0.5)`,
                      animation: isClickable ? "tokenPulse 1s infinite" : "none",
                      zIndex: 10,
                      transition: "all 0.3s ease",
                      textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                    }}
                  >
                    {ti + 1}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  }

  const cellSize = `minmax(0, 1fr)`;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px",
      padding: "20px",
      backgroundColor: "#0a0a1a",
      minHeight: "100vh",
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      color: "#e0e0e0",
    }}>
      <style>{`
        @keyframes tokenPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes diceShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
      `}</style>

      <h2 style={{
        margin: 0,
        fontSize: "24px",
        fontWeight: 700,
        color: "#ffd700",
        textShadow: "0 0 10px rgba(255,215,0,0.3)",
        letterSpacing: "2px",
      }}>
        LUDO
      </h2>

      {/* Turn indicator */}
      <div style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}>
        {NAMES.map((name, i) => (
          <div key={i} style={{
            padding: "6px 14px",
            borderRadius: "20px",
            backgroundColor: game.current === i ? COLORS[i] : "rgba(255,255,255,0.05)",
            color: game.current === i ? "#fff" : "#888",
            fontWeight: game.current === i ? 700 : 400,
            fontSize: "13px",
            border: `2px solid ${game.current === i ? COLORS[i] : "transparent"}`,
            transition: "all 0.3s",
            boxShadow: game.current === i ? `0 0 12px ${COLORS[i]}40` : "none",
          }}>
            {name}{i === 0 ? " (You)" : ""} — {game.scores[i]}/4
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        fontSize: "14px",
        color: "#ccc",
        minHeight: "20px",
        textAlign: "center",
        padding: "4px 16px",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: "8px",
      }}>
        {game.status}
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        {/* Board */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${BOARD}, ${cellSize})`,
          gridTemplateRows: `repeat(${BOARD}, ${cellSize})`,
          width: "min(80vw, 480px)",
          height: "min(80vw, 480px)",
          minWidth: "400px",
          minHeight: "400px",
          gap: "1px",
          backgroundColor: "#0d0d20",
          borderRadius: "12px",
          padding: "8px",
          boxShadow: "0 0 30px rgba(0,0,0,0.6), inset 0 0 30px rgba(255,255,255,0.02)",
          border: "2px solid rgba(255,255,255,0.08)",
        }}>
          {cells}
        </div>

        {/* Dice & controls panel */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}>
          {/* Dice */}
          <div
            onClick={() => {
              if (game.current === 0 && !game.rolled && !game.gameOver && !game.animating) {
                handleRoll();
              }
            }}
            style={{
              cursor: game.current === 0 && !game.rolled && !game.gameOver ? "pointer" : "default",
              transition: "transform 0.2s",
              filter: game.current !== 0 || game.rolled || game.gameOver ? "brightness(0.5)" : "none",
            }}
          >
            <DiceFace value={game.dice || 1} size={64} />
          </div>

          <div style={{ fontSize: "12px", color: "#888", textAlign: "center" }}>
            {game.current === 0 && !game.rolled && !game.gameOver
              ? "Click dice to roll"
              : game.current === 0 && game.rolled
              ? "Click a glowing token"
              : "Waiting for bot..."}
          </div>

          <button
            onClick={handleNewGame}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "2px solid #ffd700",
              backgroundColor: "transparent",
              color: "#ffd700",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              letterSpacing: "1px",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#ffd700";
              (e.target as HTMLButtonElement).style.color = "#0a0a1a";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.target as HTMLButtonElement).style.color = "#ffd700";
            }}
          >
            NEW GAME
          </button>

          {game.gameOver && (
            <div style={{
              padding: "12px 20px",
              borderRadius: "12px",
              backgroundColor: COLORS[game.winner] + "30",
              border: `2px solid ${COLORS[game.winner]}`,
              fontSize: "16px",
              fontWeight: 700,
              color: COLORS[game.winner],
              textAlign: "center",
            }}>
              {game.winner === 0 ? "YOU WIN!" : `${NAMES[game.winner]} wins!`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── bot AI ───────── */
function selectBotToken(state: GameState, player: number, dice: number): number {
  const tokens = state.tokens[player];
  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
    const tok = tokens[i];
    if (!canTokenMove(tok, dice)) continue;

    let score = 0;
    const newPos = getNewPos(tok, dice);

    // Highest priority: finish a token
    if (newPos === MAIN_PATH + HOME_STRETCH) {
      score += 1000;
    }

    // High priority: kill an opponent
    if (newPos >= 0 && newPos < MAIN_PATH) {
      const absNew = absPathIndex(player, newPos);
      if (!SAFE_SET.has(absNew)) {
        for (let op = 0; op < 4; op++) {
          if (op === player) continue;
          for (const ot of state.tokens[op]) {
            if (ot.pos >= 0 && ot.pos < MAIN_PATH) {
              const otAbs = absPathIndex(op, ot.pos);
              if (otAbs === absNew) {
                score += 500;
              }
            }
          }
        }
      }
    }

    // Move token that is furthest along
    if (tok.pos >= 0) {
      score += tok.pos * 2;
    }

    // Priority: leave home
    if (tok.pos === -1 && dice === 6) {
      score += 100;
    }

    // Prefer moving to safe square
    if (newPos >= 0 && newPos < MAIN_PATH) {
      const absNew = absPathIndex(player, newPos);
      if (SAFE_SET.has(absNew)) score += 30;
    }

    // Avoid leaving a safe square if on one
    if (tok.pos >= 0 && tok.pos < MAIN_PATH) {
      const curAbs = absPathIndex(player, tok.pos);
      if (SAFE_SET.has(curAbs)) score -= 10;
    }

    // Prefer entering home stretch
    if (newPos >= MAIN_PATH && newPos < MAIN_PATH + HOME_STRETCH) {
      score += 200;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/* ───────── move execution ───────── */
function executeMove(prev: GameState, player: number, tokenIdx: number, dice: number): GameState {
  const newTokens = prev.tokens.map(p => p.map(t => ({ ...t })));
  const tok = newTokens[player][tokenIdx];
  const newPos = getNewPos(tok, dice);
  tok.pos = newPos;

  let status = `${NAMES[player]} moved token ${tokenIdx + 1}`;
  let killed = false;

  // Check for kills on main path
  if (newPos >= 0 && newPos < MAIN_PATH) {
    const absNew = absPathIndex(player, newPos);
    if (!SAFE_SET.has(absNew)) {
      for (let op = 0; op < 4; op++) {
        if (op === player) continue;
        for (const ot of newTokens[op]) {
          if (ot.pos >= 0 && ot.pos < MAIN_PATH) {
            const otAbs = absPathIndex(op, ot.pos);
            if (otAbs === absNew) {
              ot.pos = -1; // Send home
              killed = true;
              status += ` and captured ${NAMES[op]}'s token!`;
            }
          }
        }
      }
    }
  }

  // Check if token finished
  const newScores = [...prev.scores];
  if (newPos === MAIN_PATH + HOME_STRETCH) {
    newScores[player]++;
    status = `${NAMES[player]} got a token home! (${newScores[player]}/4)`;
  }

  // Check game over
  if (newScores[player] === TOKENS_PER_PLAYER) {
    return {
      ...prev,
      tokens: newTokens,
      dice,
      rolled: false,
      status: `${NAMES[player]} wins the game!`,
      gameOver: true,
      winner: player,
      scores: newScores,
      animating: false,
      consecutiveSixes: 0,
    };
  }

  // Determine next turn
  let nextPlayer = (player + 1) % 4;
  let extraTurn = false;
  let consecutiveSixes = prev.consecutiveSixes;

  if (dice === 6 || killed) {
    if (dice === 6) {
      consecutiveSixes++;
      if (consecutiveSixes >= 3) {
        // Three sixes in a row — lose turn
        status += " Three 6s — turn forfeited!";
        consecutiveSixes = 0;
      } else {
        extraTurn = true;
        status += " — extra turn!";
      }
    } else {
      extraTurn = true;
      consecutiveSixes = 0;
      status += " — bonus turn!";
    }
  } else {
    consecutiveSixes = 0;
  }

  if (extraTurn) {
    nextPlayer = player;
  }

  if (!extraTurn) {
    status += ` ${NAMES[nextPlayer]}'s turn.`;
  }

  return {
    ...prev,
    tokens: newTokens,
    dice,
    rolled: false,
    current: nextPlayer,
    status,
    scores: newScores,
    animating: false,
    consecutiveSixes: extraTurn ? consecutiveSixes : 0,
  };
}
