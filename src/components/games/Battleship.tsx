"use client";
import { useState, useCallback, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────────
const SIZE = 10;
const COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

interface ShipDef {
  name: string;
  size: number;
  color: string;
}

const SHIP_DEFS: ShipDef[] = [
  { name: "Carrier", size: 5, color: "#6366f1" },
  { name: "Battleship", size: 4, color: "#3b82f6" },
  { name: "Cruiser", size: 3, color: "#06b6d4" },
  { name: "Submarine", size: 3, color: "#10b981" },
  { name: "Destroyer", size: 2, color: "#f59e0b" },
];

// Each cell stores the ship index (0-4) or -1 for water
type CellState = number; // -1 = water, 0-4 = ship index
type ShotState = "none" | "hit" | "miss";

interface PlacedShip {
  index: number;
  row: number;
  col: number;
  horizontal: boolean;
  size: number;
  cells: [number, number][];
  sunk: boolean;
}

function createEmptyGrid(): CellState[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(-1));
}

function createEmptyShots(): ShotState[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill("none"));
}

function canPlaceShip(
  grid: CellState[][],
  row: number,
  col: number,
  size: number,
  horizontal: boolean
): boolean {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
    if (grid[r][c] !== -1) return false;
  }
  return true;
}

function placeShipOnGrid(
  grid: CellState[][],
  row: number,
  col: number,
  size: number,
  horizontal: boolean,
  shipIndex: number
): CellState[][] {
  const g = grid.map((r) => [...r]);
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    g[r][c] = shipIndex;
  }
  return g;
}

function getShipCells(
  row: number,
  col: number,
  size: number,
  horizontal: boolean
): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < size; i++) {
    cells.push([horizontal ? row : row + i, horizontal ? col + i : col]);
  }
  return cells;
}

function randomPlaceAllShips(): { grid: CellState[][]; ships: PlacedShip[] } {
  let grid = createEmptyGrid();
  const ships: PlacedShip[] = [];
  for (let idx = 0; idx < SHIP_DEFS.length; idx++) {
    const size = SHIP_DEFS[idx].size;
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(
        Math.random() * (horizontal ? SIZE : SIZE - size + 1)
      );
      const col = Math.floor(
        Math.random() * (horizontal ? SIZE - size + 1 : SIZE)
      );
      if (canPlaceShip(grid, row, col, size, horizontal)) {
        grid = placeShipOnGrid(grid, row, col, size, horizontal, idx);
        ships.push({
          index: idx,
          row,
          col,
          horizontal,
          size,
          cells: getShipCells(row, col, size, horizontal),
          sunk: false,
        });
        placed = true;
      }
    }
  }
  return { grid, ships };
}

function isShipSunk(
  ship: PlacedShip,
  shots: ShotState[][]
): boolean {
  return ship.cells.every(([r, c]) => shots[r][c] === "hit");
}

// ── AI logic ───────────────────────────────────────────────────────────────────
interface AIState {
  hits: [number, number][];
  huntStack: [number, number][];
  mode: "random" | "hunt";
}

function createAIState(): AIState {
  return { hits: [], huntStack: [], mode: "random" };
}

function getAdjacentCells(r: number, c: number): [number, number][] {
  const adj: [number, number][] = [];
  if (r > 0) adj.push([r - 1, c]);
  if (r < SIZE - 1) adj.push([r + 1, c]);
  if (c > 0) adj.push([r, c - 1]);
  if (c < SIZE - 1) adj.push([r, c + 1]);
  return adj;
}

function aiChooseTarget(
  ai: AIState,
  shots: ShotState[][]
): [number, number] {
  // In hunt mode, try cells from the hunt stack
  while (ai.huntStack.length > 0) {
    const target = ai.huntStack.pop()!;
    if (shots[target[0]][target[1]] === "none") {
      return target;
    }
  }
  // If hunt stack is empty, reset to random
  ai.mode = "random";

  // Random mode: pick a random unshot cell (use checkerboard pattern for efficiency)
  const candidates: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (shots[r][c] === "none" && (r + c) % 2 === 0) {
        candidates.push([r, c]);
      }
    }
  }
  // If checkerboard exhausted, try all remaining
  if (candidates.length === 0) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (shots[r][c] === "none") candidates.push([r, c]);
      }
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function aiAfterHit(
  ai: AIState,
  r: number,
  c: number,
  shots: ShotState[][],
  playerShips: PlacedShip[]
): void {
  ai.hits.push([r, c]);
  ai.mode = "hunt";

  // Check if the ship this hit belongs to is now sunk
  const sunkShip = playerShips.find(
    (s) => s.sunk && s.cells.some(([sr, sc]) => sr === r && sc === c)
  );
  if (sunkShip) {
    // Remove all hits belonging to this sunk ship from our tracking
    const sunkSet = new Set(sunkShip.cells.map(([sr, sc]) => `${sr},${sc}`));
    ai.hits = ai.hits.filter(([hr, hc]) => !sunkSet.has(`${hr},${hc}`));
    // Remove hunt stack entries that came from this ship
    ai.huntStack = ai.huntStack.filter(
      ([hr, hc]) => shots[hr][hc] === "none"
    );
    if (ai.hits.length === 0) {
      ai.mode = "random";
      ai.huntStack = [];
    }
    return;
  }

  // Smart hunting: if we have 2+ unsunk hits in a line, prioritize extending that line
  const unsunkHits = ai.hits;
  if (unsunkHits.length >= 2) {
    // Check for collinear hits
    const sameRow = unsunkHits.filter(([hr]) => hr === r);
    const sameCol = unsunkHits.filter(([, hc]) => hc === c);

    if (sameRow.length >= 2) {
      // Extend horizontally
      const cols = sameRow.map(([, hc]) => hc).sort((a, b) => a - b);
      const minC = cols[0];
      const maxC = cols[cols.length - 1];
      const lineTargets: [number, number][] = [];
      if (minC > 0 && shots[r][minC - 1] === "none")
        lineTargets.push([r, minC - 1]);
      if (maxC < SIZE - 1 && shots[r][maxC + 1] === "none")
        lineTargets.push([r, maxC + 1]);
      if (lineTargets.length > 0) {
        ai.huntStack = lineTargets;
        return;
      }
    }
    if (sameCol.length >= 2) {
      // Extend vertically
      const rows = sameCol.map(([hr]) => hr).sort((a, b) => a - b);
      const minR = rows[0];
      const maxR = rows[rows.length - 1];
      const lineTargets: [number, number][] = [];
      if (minR > 0 && shots[minR - 1][c] === "none")
        lineTargets.push([minR - 1, c]);
      if (maxR < SIZE - 1 && shots[maxR + 1][c] === "none")
        lineTargets.push([maxR + 1, c]);
      if (lineTargets.length > 0) {
        ai.huntStack = lineTargets;
        return;
      }
    }
  }

  // Default: add all adjacent unshot cells
  const adj = getAdjacentCells(r, c).filter(
    ([ar, ac]) => shots[ar][ac] === "none"
  );
  ai.huntStack.push(...adj);
}

// ── Component ──────────────────────────────────────────────────────────────────
type Phase = "placement" | "battle" | "gameover";

export default function Battleship() {
  // ── State ──
  const [phase, setPhase] = useState<Phase>("placement");
  const [playerGrid, setPlayerGrid] = useState<CellState[][]>(createEmptyGrid);
  const [playerShips, setPlayerShips] = useState<PlacedShip[]>([]);
  const [enemyGrid, setEnemyGrid] = useState<CellState[][]>(createEmptyGrid);
  const [enemyShips, setEnemyShips] = useState<PlacedShip[]>([]);
  const [playerShots, setPlayerShots] = useState<ShotState[][]>(createEmptyShots);
  const [enemyShots, setEnemyShots] = useState<ShotState[][]>(createEmptyShots);
  const [placementIndex, setPlacementIndex] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<"player" | "enemy">("player");
  const [shotCount, setShotCount] = useState(0);
  const [enemyShotCount, setEnemyShotCount] = useState(0);
  const [message, setMessage] = useState("Place your Carrier (5 cells)");
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null);
  const aiRef = useRef<AIState>(createAIState());

  // ── Keyboard: R to rotate ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        if (phase === "placement") setHorizontal((h) => !h);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  // ── Init enemy ships ──
  useEffect(() => {
    const { grid, ships } = randomPlaceAllShips();
    setEnemyGrid(grid);
    setEnemyShips(ships);
  }, []);

  // ── New Game ──
  const newGame = useCallback(() => {
    setPhase("placement");
    setPlayerGrid(createEmptyGrid());
    setPlayerShips([]);
    const { grid, ships } = randomPlaceAllShips();
    setEnemyGrid(grid);
    setEnemyShips(ships);
    setPlayerShots(createEmptyShots());
    setEnemyShots(createEmptyShots());
    setPlacementIndex(0);
    setHorizontal(true);
    setHoverCell(null);
    setTurn("player");
    setShotCount(0);
    setEnemyShotCount(0);
    setMessage("Place your Carrier (5 cells)");
    setWinner(null);
    aiRef.current = createAIState();
  }, []);

  // ── Placement click ──
  const handlePlacement = useCallback(
    (row: number, col: number) => {
      if (phase !== "placement" || placementIndex >= SHIP_DEFS.length) return;
      const ship = SHIP_DEFS[placementIndex];
      if (!canPlaceShip(playerGrid, row, col, ship.size, horizontal)) return;

      const newGrid = placeShipOnGrid(
        playerGrid,
        row,
        col,
        ship.size,
        horizontal,
        placementIndex
      );
      const newShip: PlacedShip = {
        index: placementIndex,
        row,
        col,
        horizontal,
        size: ship.size,
        cells: getShipCells(row, col, ship.size, horizontal),
        sunk: false,
      };
      const newShips = [...playerShips, newShip];
      setPlayerGrid(newGrid);
      setPlayerShips(newShips);

      const nextIdx = placementIndex + 1;
      setPlacementIndex(nextIdx);
      if (nextIdx >= SHIP_DEFS.length) {
        setPhase("battle");
        setMessage("Your turn -- click enemy grid to fire!");
      } else {
        setMessage(
          `Place your ${SHIP_DEFS[nextIdx].name} (${SHIP_DEFS[nextIdx].size} cells)`
        );
      }
    },
    [phase, placementIndex, playerGrid, playerShips, horizontal]
  );

  // ── Enemy AI turn ──
  const doEnemyTurn = useCallback(
    (
      currentEnemyShots: ShotState[][],
      currentPlayerGrid: CellState[][],
      currentPlayerShips: PlacedShip[]
    ) => {
      const ai = aiRef.current;
      const [r, c] = aiChooseTarget(ai, currentEnemyShots);
      const newShots = currentEnemyShots.map((row) => [...row]);
      const isHit = currentPlayerGrid[r][c] !== -1;
      newShots[r][c] = isHit ? "hit" : "miss";

      // Check sunk
      let updatedShips = currentPlayerShips;
      if (isHit) {
        updatedShips = currentPlayerShips.map((s) => ({
          ...s,
          sunk: s.sunk || isShipSunk(s, newShots),
        }));
        setPlayerShips(updatedShips);
        aiAfterHit(ai, r, c, newShots, updatedShips);
      }

      setEnemyShots(newShots);
      setEnemyShotCount((prev) => prev + 1);

      // Check win
      if (updatedShips.every((s) => s.sunk || isShipSunk(s, newShots))) {
        setPhase("gameover");
        setWinner("enemy");
        setMessage("Defeat! The enemy sank all your ships.");
        return;
      }

      setTurn("player");
      setMessage("Your turn -- click enemy grid to fire!");
    },
    []
  );

  // ── Player fire ──
  const handleFire = useCallback(
    (row: number, col: number) => {
      if (phase !== "battle" || turn !== "player") return;
      if (playerShots[row][col] !== "none") return;

      const newShots = playerShots.map((r) => [...r]);
      const isHit = enemyGrid[row][col] !== -1;
      newShots[row][col] = isHit ? "hit" : "miss";
      setPlayerShots(newShots);
      setShotCount((prev) => prev + 1);

      // Check sunk
      let updatedEnemyShips = enemyShips;
      if (isHit) {
        updatedEnemyShips = enemyShips.map((s) => ({
          ...s,
          sunk: s.sunk || isShipSunk(s, newShots),
        }));
        setEnemyShips(updatedEnemyShips);
      }

      // Check win
      if (
        updatedEnemyShips.every((s) => s.sunk || isShipSunk(s, newShots))
      ) {
        setPhase("gameover");
        setWinner("player");
        setMessage("Victory! You sank all enemy ships!");
        return;
      }

      setTurn("enemy");
      setMessage("Enemy is firing...");
      setTimeout(() => {
        doEnemyTurn(enemyShots, playerGrid, playerShips);
      }, 600);
    },
    [
      phase,
      turn,
      playerShots,
      enemyGrid,
      enemyShips,
      enemyShots,
      playerGrid,
      playerShips,
      doEnemyTurn,
    ]
  );

  // ── Hover preview for placement ──
  const getPreviewCells = (): Set<string> => {
    const set = new Set<string>();
    if (phase !== "placement" || !hoverCell || placementIndex >= SHIP_DEFS.length)
      return set;
    const [row, col] = hoverCell;
    const size = SHIP_DEFS[placementIndex].size;
    const valid = canPlaceShip(playerGrid, row, col, size, horizontal);
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
        set.add(`${r},${c}:${valid ? "valid" : "invalid"}`);
      }
    }
    return set;
  };

  const previewCells = getPreviewCells();

  // ── Styles ──
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0a0a1a",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 10px",
    userSelect: "none",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    color: "#60a5fa",
    marginBottom: 4,
    letterSpacing: 2,
  };

  const messageStyle: React.CSSProperties = {
    fontSize: 16,
    color:
      winner === "player"
        ? "#4ade80"
        : winner === "enemy"
        ? "#f87171"
        : "#94a3b8",
    marginBottom: 12,
    minHeight: 24,
    fontWeight: winner ? 700 : 400,
  };

  const boardsContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: 40,
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
  };

  const boardWrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const boardLabelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `28px repeat(${SIZE}, 36px)`,
    gridTemplateRows: `28px repeat(${SIZE}, 36px)`,
    gap: 2,
  };

  const headerCellStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
  };

  const cellBase: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    transition: "background 0.15s",
    position: "relative",
  };

  const btnStyle: React.CSSProperties = {
    padding: "10px 28px",
    fontSize: 15,
    fontWeight: 600,
    background: "#1e40af",
    color: "#e2e8f0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    letterSpacing: 1,
  };

  const rotateBtnStyle: React.CSSProperties = {
    ...btnStyle,
    background: "#334155",
    padding: "8px 18px",
    fontSize: 13,
  };

  const panelStyle: React.CSSProperties = {
    display: "flex",
    gap: 30,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 16,
  };

  const shipListStyle: React.CSSProperties = {
    background: "#111827",
    borderRadius: 8,
    padding: "12px 18px",
    minWidth: 180,
  };

  const shipListTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  };

  // ── Render grid ──
  const renderGrid = (
    grid: CellState[][],
    shots: ShotState[][],
    ships: PlacedShip[],
    isPlayerGrid: boolean,
    onClick?: (r: number, c: number) => void,
    onHover?: (r: number, c: number) => void,
    onLeave?: () => void
  ) => {
    // Build sunk ship cell set for coloring
    const sunkCells = new Map<string, number>();
    ships.forEach((s) => {
      if (s.sunk) {
        s.cells.forEach(([r, c]) => sunkCells.set(`${r},${c}`, s.index));
      }
    });

    return (
      <div style={gridStyle}>
        {/* Top-left corner */}
        <div style={headerCellStyle} />
        {/* Column headers */}
        {COLS.map((letter) => (
          <div key={letter} style={headerCellStyle}>
            {letter}
          </div>
        ))}
        {/* Rows */}
        {Array.from({ length: SIZE }, (_, r) => (
          <>
            {/* Row label */}
            <div key={`rl-${r}`} style={headerCellStyle}>
              {r + 1}
            </div>
            {Array.from({ length: SIZE }, (_, c) => {
              const shot = shots[r][c];
              const cellVal = grid[r][c];
              const isSunkCell = sunkCells.has(`${r},${c}`);
              const key = `${r},${c}`;

              let bg = "#0c4a6e";
              let content: React.ReactNode = null;
              let cursor = "default";

              if (isPlayerGrid) {
                // Player's own grid
                if (isSunkCell) {
                  bg = "#7f1d1d";
                  if (shot === "hit") content = <HitMarker />;
                } else if (shot === "hit") {
                  bg = "#dc2626";
                  content = <HitMarker />;
                } else if (shot === "miss") {
                  bg = "#0c4a6e";
                  content = <MissMarker />;
                } else if (cellVal !== -1) {
                  // Show ship
                  bg = SHIP_DEFS[cellVal].color;
                }

                // Placement preview
                if (phase === "placement") {
                  const validKey = `${r},${c}:valid`;
                  const invalidKey = `${r},${c}:invalid`;
                  if (previewCells.has(validKey)) {
                    bg = "#22c55e80";
                    cursor = "pointer";
                  } else if (previewCells.has(invalidKey)) {
                    bg = "#ef444480";
                    cursor = "not-allowed";
                  } else if (cellVal === -1 && phase === "placement") {
                    cursor = "pointer";
                  }
                }
              } else {
                // Enemy grid
                if (isSunkCell) {
                  bg = "#7f1d1d";
                  if (shot === "hit") content = <HitMarker />;
                } else if (shot === "hit") {
                  bg = "#dc2626";
                  content = <HitMarker />;
                } else if (shot === "miss") {
                  bg = "#0c4a6e";
                  content = <MissMarker />;
                }
                if (
                  phase === "battle" &&
                  turn === "player" &&
                  shot === "none"
                ) {
                  cursor = "crosshair";
                }
              }

              return (
                <div
                  key={key}
                  style={{
                    ...cellBase,
                    background: bg,
                    cursor,
                    border:
                      isPlayerGrid && cellVal !== -1 && !isSunkCell && shot !== "hit"
                        ? `1px solid ${SHIP_DEFS[cellVal]?.color ?? "#0c4a6e"}55`
                        : "1px solid #0e3a5c",
                  }}
                  onClick={() => onClick?.(r, c)}
                  onMouseEnter={() => onHover?.(r, c)}
                  onMouseLeave={() => onLeave?.()}
                >
                  {content}
                </div>
              );
            })}
          </>
        ))}
      </div>
    );
  };

  // ── Ship status panel ──
  const renderShipStatus = (
    ships: PlacedShip[],
    shots: ShotState[][],
    label: string
  ) => (
    <div style={shipListStyle}>
      <div style={shipListTitleStyle}>{label}</div>
      {SHIP_DEFS.map((def, idx) => {
        const ship = ships.find((s) => s.index === idx);
        const sunk = ship ? ship.sunk || isShipSunk(ship, shots) : false;
        const placed = !!ship;
        return (
          <div
            key={def.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
              opacity: sunk ? 0.4 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 2,
              }}
            >
              {Array.from({ length: def.size }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 2,
                    background: placed ? (sunk ? "#7f1d1d" : def.color) : "#334155",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 12,
                color: sunk ? "#ef4444" : "#94a3b8",
                textDecoration: sunk ? "line-through" : "none",
              }}
            >
              {def.name}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>BATTLESHIP</div>
      <div style={messageStyle}>{message}</div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        {phase === "placement" && (
          <button
            style={rotateBtnStyle}
            onClick={() => setHorizontal((h) => !h)}
          >
            Rotate ({horizontal ? "Horizontal" : "Vertical"}) [R]
          </button>
        )}
        <button style={btnStyle} onClick={newGame}>
          New Game
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 16,
          fontSize: 13,
          color: "#64748b",
        }}
      >
        <span>
          Your shots: <strong style={{ color: "#e2e8f0" }}>{shotCount}</strong>
        </span>
        <span>
          Enemy shots:{" "}
          <strong style={{ color: "#e2e8f0" }}>{enemyShotCount}</strong>
        </span>
        {phase === "battle" && (
          <span>
            Turn:{" "}
            <strong
              style={{ color: turn === "player" ? "#4ade80" : "#f87171" }}
            >
              {turn === "player" ? "Yours" : "Enemy"}
            </strong>
          </span>
        )}
      </div>

      {/* Boards */}
      <div style={boardsContainerStyle}>
        <div style={boardWrapperStyle}>
          <div style={boardLabelStyle}>Your Fleet</div>
          {renderGrid(
            playerGrid,
            enemyShots,
            playerShips,
            true,
            phase === "placement" ? handlePlacement : undefined,
            phase === "placement"
              ? (r, c) => setHoverCell([r, c])
              : undefined,
            phase === "placement" ? () => setHoverCell(null) : undefined
          )}
        </div>
        <div style={boardWrapperStyle}>
          <div style={boardLabelStyle}>Enemy Waters</div>
          {renderGrid(
            enemyGrid,
            playerShots,
            enemyShips,
            false,
            phase === "battle" && turn === "player" ? handleFire : undefined
          )}
        </div>
      </div>

      {/* Ship status panels */}
      <div style={panelStyle}>
        {renderShipStatus(playerShips, enemyShots, "Your Ships")}
        {renderShipStatus(enemyShips, playerShots, "Enemy Ships")}
      </div>

      {/* Game over overlay */}
      {phase === "gameover" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={newGame}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: winner === "player" ? "#4ade80" : "#f87171",
              marginBottom: 12,
              textShadow: "0 0 30px currentColor",
            }}
          >
            {winner === "player" ? "VICTORY!" : "DEFEAT!"}
          </div>
          <div style={{ fontSize: 18, color: "#94a3b8", marginBottom: 24 }}>
            {winner === "player"
              ? `You sank all enemy ships in ${shotCount} shots!`
              : `The enemy sank your fleet in ${enemyShotCount} shots.`}
          </div>
          <button style={{ ...btnStyle, fontSize: 18, padding: "14px 40px" }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

// ── Small marker components ────────────────────────────────────────────────────
function HitMarker() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <line
        x1="4"
        y1="4"
        x2="16"
        y2="16"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="4"
        x2="4"
        y2="16"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MissMarker() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="4" fill="#cbd5e1" />
    </svg>
  );
}
