import { useRef, useEffect, useState, useCallback } from "react";

// 21 columns x 23 rows, 20px cells → 420x460 canvas
// Legend: # = wall, . = dot, O = power pellet, - = ghost door, G = ghost box interior, T = tunnel (empty open side)
const MAZE_TEMPLATE = [
  "#####################",
  "#....#.......#....O#",
  "#.##.#.#####.#.##.##",
  "#O##...........##.O#",
  "#.##.#.##.##.#.##..#",
  "#....#..#.#..#.....#",
  "####.##.#.#.##.#####",
  "    .#.......#.     ",
  "####.#.##-##.#.#####",
  "    ...#GGG#...     ",
  "####.#.#GGG#.#.#####",
  "    .#.#####.#.     ",
  "####.#.......#.#####",
  "#....#.#####.#....O#",
  "#.##.#.......#.##..#",
  "#..#...........#...#",
  "##.#.#.#####.#.#.###",
  "#....#...#...#.....#",
  "#.######.#.######..#",
  "#.....#.....#......#",
  "#.###.#.###.#.###..#",
  "#...................#",
  "#####################",
];

const COLS = 21;
const ROWS = 23;
const CS = 20; // cell size
const CW = COLS * CS; // 420
const CH = ROWS * CS; // 460

const POWER_DURATION = 480; // ~8 seconds at 60fps
const GHOST_EAT_SCORE = 200;
const DOT_SCORE = 10;
const PELLET_SCORE = 50;
const INITIAL_LIVES = 3;
const BASE_GHOST_SPEED = 6; // frames between ghost moves

type Dir = [number, number]; // [dr, dc]

const DIRS: { up: Dir; down: Dir; left: Dir; right: Dir } = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};
const ALL_DIRS: Dir[] = [DIRS.up, DIRS.down, DIRS.left, DIRS.right];

function buildMaze() {
  const walls: boolean[][] = [];
  const dots: number[][] = []; // 0=empty,1=dot,2=pellet
  for (let r = 0; r < ROWS; r++) {
    walls[r] = [];
    dots[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE_TEMPLATE[r]?.[c] ?? " ";
      walls[r][c] = ch === "#";
      if (ch === ".") dots[r][c] = 1;
      else if (ch === "O") dots[r][c] = 2;
      else dots[r][c] = 0;
    }
  }
  return { walls, dots };
}

function isWall(walls: boolean[][], r: number, c: number): boolean {
  // Wrap for tunnel
  const wr = ((r % ROWS) + ROWS) % ROWS;
  const wc = ((c % COLS) + COLS) % COLS;
  return walls[wr]?.[wc] ?? true;
}

function canMove(walls: boolean[][], r: number, c: number): boolean {
  return !isWall(walls, r, c);
}

function wrap(r: number, c: number): [number, number] {
  return [((r % ROWS) + ROWS) % ROWS, ((c % COLS) + COLS) % COLS];
}

function dist(r1: number, c1: number, r2: number, c2: number) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

interface Ghost {
  r: number;
  c: number;
  startR: number;
  startC: number;
  color: string;
  dir: Dir;
  scared: boolean;
  eaten: boolean;
  respawnTimer: number;
}

function createGhosts(): Ghost[] {
  return [
    { r: 9, c: 9, startR: 9, startC: 9, color: "#ff0000", dir: [0, 1], scared: false, eaten: false, respawnTimer: 0 },
    { r: 9, c: 10, startR: 9, startC: 10, color: "#ffb8ff", dir: [0, -1], scared: false, eaten: false, respawnTimer: 0 },
    { r: 10, c: 10, startR: 10, startC: 10, color: "#00ffff", dir: [-1, 0], scared: false, eaten: false, respawnTimer: 0 },
  ];
}

export default function MazeChomper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const initState = useCallback((lvl: number, currentLives: number, currentHighScore: number, currentScore: number) => {
    const { walls, dots } = buildMaze();
    const totalDots = dots.flat().filter((d) => d > 0).length;
    return {
      walls,
      dots,
      totalDots,
      dotsEaten: 0,
      player: { r: 21, c: 10, dir: [0, 0] as Dir, nextDir: [0, 0] as Dir, mouth: 0, mouthDir: 1 },
      ghosts: createGhosts(),
      score: currentScore,
      highScore: currentHighScore,
      lives: currentLives,
      level: lvl,
      powerTimer: 0,
      ghostMoveCounter: 0,
      playerMoveCounter: 0,
      ghostSpeed: Math.max(2, BASE_GHOST_SPEED - (lvl - 1)),
      playerSpeed: 4,
      over: false,
      won: false,
      paused: false,
      started: true,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = CW;
    canvas.height = CH;

    // Load high score from localStorage
    let savedHigh = 0;
    try {
      savedHigh = parseInt(localStorage.getItem("mazeChomperHigh") || "0", 10) || 0;
    } catch {}
    setHighScore(savedHigh);

    let s = initState(1, INITIAL_LIVES, savedHigh, 0);
    stateRef.current = s;
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    setGameOver(false);
    setGameWon(false);

    let animId = 0;

    const handleKey = (e: KeyboardEvent) => {
      if (!stateRef.current) return;
      const st = stateRef.current;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
      }
      if (st.over || st.won) {
        // Restart on any key
        if (e.key === " " || e.key === "Enter") {
          const ns = initState(1, INITIAL_LIVES, st.highScore, 0);
          stateRef.current = ns;
          setScore(0);
          setLives(INITIAL_LIVES);
          setLevel(1);
          setGameOver(false);
          setGameWon(false);
        }
        return;
      }
      let dir: Dir | null = null;
      if (e.key === "ArrowUp" || e.key === "w") dir = DIRS.up;
      if (e.key === "ArrowDown" || e.key === "s") dir = DIRS.down;
      if (e.key === "ArrowLeft" || e.key === "a") dir = DIRS.left;
      if (e.key === "ArrowRight" || e.key === "d") dir = DIRS.right;
      if (dir) st.player.nextDir = dir;
    };

    window.addEventListener("keydown", handleKey);

    // Touch direction handler (used by d-pad)
    (window as any).__mazeChomperDir = (dir: Dir) => {
      if (!stateRef.current) return;
      const st = stateRef.current;
      if (st.over || st.won) return;
      st.player.nextDir = dir;
    };
    (window as any).__mazeChomperRestart = () => {
      if (!stateRef.current) return;
      const st = stateRef.current;
      if (!st.over && !st.won) return;
      const ns = initState(1, INITIAL_LIVES, st.highScore, 0);
      stateRef.current = ns;
      setScore(0);
      setLives(INITIAL_LIVES);
      setLevel(1);
      setGameOver(false);
      setGameWon(false);
    };

    function moveGhost(st: any, g: Ghost) {
      if (g.eaten) {
        g.respawnTimer--;
        if (g.respawnTimer <= 0) {
          g.eaten = false;
          g.scared = false;
          g.r = g.startR;
          g.c = g.startC;
        }
        return;
      }

      const validDirs = ALL_DIRS.filter((d) => {
        const [nr, nc] = wrap(g.r + d[0], g.c + d[1]);
        // Can't reverse direction
        if (d[0] === -g.dir[0] && d[1] === -g.dir[1]) return false;
        // Ghost door tile check — ghosts can pass through '-' and 'G' tiles
        const ch = MAZE_TEMPLATE[nr]?.[nc];
        if (ch === "#") return false;
        return true;
      });

      // If no forward options, allow reverse
      let choices = validDirs.length > 0 ? validDirs : ALL_DIRS.filter((d) => {
        const [nr, nc] = wrap(g.r + d[0], g.c + d[1]);
        const ch = MAZE_TEMPLATE[nr]?.[nc];
        return ch !== "#";
      });

      if (choices.length === 0) return;

      let chosen: Dir;
      const p = st.player;

      if (g.scared) {
        // Run away from player
        choices.sort((a, b) => {
          const [ar, ac] = wrap(g.r + a[0], g.c + a[1]);
          const [br, bc] = wrap(g.r + b[0], g.c + b[1]);
          return dist(br, bc, p.r, p.c) - dist(ar, ac, p.r, p.c);
        });
        chosen = choices[0];
      } else if (g.color === "#ff0000") {
        // Red: chase player directly
        choices.sort((a, b) => {
          const [ar, ac] = wrap(g.r + a[0], g.c + a[1]);
          const [br, bc] = wrap(g.r + b[0], g.c + b[1]);
          return dist(ar, ac, p.r, p.c) - dist(br, bc, p.r, p.c);
        });
        chosen = choices[0];
      } else if (g.color === "#ffb8ff") {
        // Pink: target 4 tiles ahead of player
        const tr = p.r + p.dir[0] * 4;
        const tc = p.c + p.dir[1] * 4;
        choices.sort((a, b) => {
          const [ar, ac] = wrap(g.r + a[0], g.c + a[1]);
          const [br, bc] = wrap(g.r + b[0], g.c + b[1]);
          return dist(ar, ac, tr, tc) - dist(br, bc, tr, tc);
        });
        chosen = choices[0];
      } else {
        // Cyan: random
        chosen = choices[Math.floor(Math.random() * choices.length)];
      }

      g.dir = chosen;
      const [nr, nc] = wrap(g.r + chosen[0], g.c + chosen[1]);
      g.r = nr;
      g.c = nc;
    }

    function update(st: any) {
      if (st.over || st.won) return;

      // Player movement
      st.playerMoveCounter++;
      if (st.playerMoveCounter >= st.playerSpeed) {
        st.playerMoveCounter = 0;
        const p = st.player;
        // Try next direction first
        const [tnr, tnc] = wrap(p.r + p.nextDir[0], p.c + p.nextDir[1]);
        if (canMove(st.walls, tnr, tnc)) {
          p.dir = p.nextDir;
        }
        const [nr, nc] = wrap(p.r + p.dir[0], p.c + p.dir[1]);
        if (canMove(st.walls, nr, nc)) {
          p.r = nr;
          p.c = nc;
        }

        // Eat dot
        if (st.dots[p.r]?.[p.c] === 1) {
          st.dots[p.r][p.c] = 0;
          st.score += DOT_SCORE;
          st.dotsEaten++;
        } else if (st.dots[p.r]?.[p.c] === 2) {
          st.dots[p.r][p.c] = 0;
          st.score += PELLET_SCORE;
          st.dotsEaten++;
          st.powerTimer = POWER_DURATION;
          for (const g of st.ghosts) {
            if (!g.eaten) g.scared = true;
          }
        }

        // Update high score
        if (st.score > st.highScore) {
          st.highScore = st.score;
          try { localStorage.setItem("mazeChomperHigh", String(st.highScore)); } catch {}
        }

        setScore(st.score);
        setHighScore(st.highScore);
      }

      // Power timer
      if (st.powerTimer > 0) {
        st.powerTimer--;
        if (st.powerTimer <= 0) {
          for (const g of st.ghosts) {
            g.scared = false;
          }
        }
      }

      // Ghost movement
      st.ghostMoveCounter++;
      if (st.ghostMoveCounter >= st.ghostSpeed) {
        st.ghostMoveCounter = 0;
        for (const g of st.ghosts) {
          moveGhost(st, g);
        }
      }

      // Collision check
      for (const g of st.ghosts) {
        if (g.eaten) continue;
        if (g.r === st.player.r && g.c === st.player.c) {
          if (g.scared) {
            // Eat the ghost
            g.eaten = true;
            g.respawnTimer = 60; // ~1 second to respawn
            st.score += GHOST_EAT_SCORE;
            if (st.score > st.highScore) {
              st.highScore = st.score;
              try { localStorage.setItem("mazeChomperHigh", String(st.highScore)); } catch {}
            }
            setScore(st.score);
            setHighScore(st.highScore);
          } else {
            // Lose a life
            st.lives--;
            setLives(st.lives);
            if (st.lives <= 0) {
              st.over = true;
              setGameOver(true);
            } else {
              // Reset positions
              st.player.r = 21;
              st.player.c = 10;
              st.player.dir = [0, 0];
              st.player.nextDir = [0, 0];
              st.ghosts = createGhosts();
              st.powerTimer = 0;
            }
          }
        }
      }

      // Check level complete
      if (st.dotsEaten >= st.totalDots) {
        st.level++;
        setLevel(st.level);
        // Reset board but keep score and lives
        const { walls, dots } = buildMaze();
        const totalDots = dots.flat().filter((d) => d > 0).length;
        st.walls = walls;
        st.dots = dots;
        st.totalDots = totalDots;
        st.dotsEaten = 0;
        st.player.r = 21;
        st.player.c = 10;
        st.player.dir = [0, 0];
        st.player.nextDir = [0, 0];
        st.ghosts = createGhosts();
        st.powerTimer = 0;
        st.ghostSpeed = Math.max(2, BASE_GHOST_SPEED - (st.level - 1));
      }
    }

    function drawWalls(ctx: CanvasRenderingContext2D, walls: boolean[][]) {
      ctx.fillStyle = "#1a1aff";
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!walls[r][c]) continue;
          const x = c * CS;
          const y = r * CS;
          ctx.fillRect(x, y, CS, CS);
        }
      }
      // Draw wall borders for a nicer look
      ctx.strokeStyle = "#4444ff";
      ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!walls[r][c]) continue;
          const x = c * CS;
          const y = r * CS;
          // Draw edges where adjacent cell is not a wall
          if (r === 0 || !walls[r - 1]?.[c]) { ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + CS, y + 0.5); ctx.stroke(); }
          if (r === ROWS - 1 || !walls[r + 1]?.[c]) { ctx.beginPath(); ctx.moveTo(x, y + CS - 0.5); ctx.lineTo(x + CS, y + CS - 0.5); ctx.stroke(); }
          if (c === 0 || !walls[r]?.[c - 1]) { ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + CS); ctx.stroke(); }
          if (c === COLS - 1 || !walls[r]?.[c + 1]) { ctx.beginPath(); ctx.moveTo(x + CS - 0.5, y); ctx.lineTo(x + CS - 0.5, y + CS); ctx.stroke(); }
        }
      }
      // Ghost door
      ctx.strokeStyle = "#ffaaff";
      ctx.lineWidth = 2;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAZE_TEMPLATE[r]?.[c] === "-") {
            ctx.beginPath();
            ctx.moveTo(c * CS, r * CS + CS / 2);
            ctx.lineTo(c * CS + CS, r * CS + CS / 2);
            ctx.stroke();
          }
        }
      }
    }

    function drawDots(ctx: CanvasRenderingContext2D, dots: number[][], frame: number) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (dots[r][c] === 1) {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(c * CS + CS / 2, r * CS + CS / 2, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (dots[r][c] === 2) {
            // Power pellet — pulse
            const pulse = 3 + Math.sin(frame * 0.08) * 1.5;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(c * CS + CS / 2, r * CS + CS / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawPlayer(ctx: CanvasRenderingContext2D, p: any) {
      p.mouth += p.mouthDir * 0.12;
      if (p.mouth > 0.8) { p.mouth = 0.8; p.mouthDir = -1; }
      if (p.mouth < 0.05) { p.mouth = 0.05; p.mouthDir = 1; }

      const cx = p.c * CS + CS / 2;
      const cy = p.r * CS + CS / 2;
      const angle = Math.atan2(p.dir[0], p.dir[1]);
      const radius = CS / 2 - 1;

      ctx.fillStyle = "#ffdd00";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle + p.mouth, angle + Math.PI * 2 - p.mouth);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
    }

    function drawGhost(ctx: CanvasRenderingContext2D, g: Ghost, frame: number, powerTimer: number) {
      if (g.eaten) return;

      const cx = g.c * CS + CS / 2;
      const cy = g.r * CS + CS / 2;
      const r = CS / 2 - 1;

      // Body color
      if (g.scared) {
        // Flash white near end of power mode
        if (powerTimer < 120 && Math.floor(frame / 10) % 2 === 0) {
          ctx.fillStyle = "#ffffff";
        } else {
          ctx.fillStyle = "#2222ff";
        }
      } else {
        ctx.fillStyle = g.color;
      }

      // Ghost body: dome top + wavy bottom
      ctx.beginPath();
      ctx.arc(cx, cy - 2, r, Math.PI, 0, false);
      // Sides down
      ctx.lineTo(cx + r, cy + r - 2);
      // Wavy bottom
      const wave = Math.sin(frame * 0.2) > 0 ? 1 : -1;
      const segs = 3;
      const segW = (r * 2) / segs;
      for (let i = segs - 1; i >= 0; i--) {
        const sx = cx - r + i * segW + segW / 2;
        const sy = cy + r - 2 + wave * (i % 2 === 0 ? 2 : -2);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(cx - r, cy + r - 2);
      ctx.lineTo(cx - r, cy - 2);
      ctx.closePath();
      ctx.fill();

      // Eyes
      if (g.scared) {
        // Scared face
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        // Wavy mouth
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 3);
        for (let i = 0; i <= 4; i++) {
          ctx.lineTo(cx - 4 + i * 2, cy + 3 + (i % 2 === 0 ? 0 : -2));
        }
        ctx.stroke();
      } else {
        // Normal eyes
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(cx - 3, cy - 3, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 3, cy - 3, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupils look toward movement direction
        const px = g.dir[1] * 1.5;
        const py = g.dir[0] * 1.5;
        ctx.fillStyle = "#000022";
        ctx.beginPath();
        ctx.arc(cx - 3 + px, cy - 3 + py, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 3 + px, cy - 3 + py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let frame = 0;

    function render() {
      const st = stateRef.current;
      if (!st) return;

      update(st);
      frame++;

      // Clear
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CW, CH);

      drawWalls(ctx, st.walls);
      drawDots(ctx, st.dots, frame);
      drawPlayer(ctx, st.player);
      for (const g of st.ghosts) {
        drawGhost(ctx, g, frame, st.powerTimer);
      }

      // HUD is rendered via React, but also draw lives on canvas as small yellow circles
      // Draw small chomper icons for lives at bottom-left area
      // (skip — we use React state for HUD)

      // Game over overlay
      if (st.over) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CW / 2, CH / 2 - 20);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText(`Score: ${st.score}`, CW / 2, CH / 2 + 15);
        ctx.fillStyle = "#888888";
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("Press ENTER or SPACE to restart", CW / 2, CH / 2 + 45);
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKey);
      delete (window as any).__mazeChomperDir;
      delete (window as any).__mazeChomperRestart;
    };
  }, [initState]);

  const dpadBtn = (label: string, dir: Dir, gridArea: string) => (
    <button
      key={label}
      onPointerDown={(e) => {
        e.preventDefault();
        (window as any).__mazeChomperDir?.(dir);
      }}
      style={{
        gridArea,
        width: 48,
        height: 48,
        borderRadius: 8,
        border: "none",
        background: "#333",
        color: "#fff",
        fontSize: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, background: "#111", minHeight: "100%", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", width: CW, marginBottom: 6, fontSize: 14 }}>
        <div>
          <span style={{ color: "#ffdd00", fontWeight: "bold" }}>Score: {score}</span>
          <span style={{ color: "#888", marginLeft: 12 }}>High: {highScore}</span>
        </div>
        <div>
          <span style={{ color: "#aaa" }}>Lvl {level}</span>
          <span style={{ color: "#ffdd00", marginLeft: 12 }}>
            {"♥".repeat(lives)}
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ borderRadius: 6, border: "1px solid #333" }} />

      <p style={{ color: "#666", marginTop: 8, fontSize: 12 }}>Arrow keys or WASD to move</p>

      {/* Restart button when game over */}
      {gameOver && (
        <button
          onClick={() => (window as any).__mazeChomperRestart?.()}
          style={{
            marginTop: 10,
            padding: "8px 24px",
            borderRadius: 6,
            border: "none",
            background: "#ff4444",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Play Again
        </button>
      )}

      {/* Mobile D-pad */}
      <div
        style={{
          display: "grid",
          gridTemplateAreas: `". up ." "left . right" ". down ."`,
          gridTemplateColumns: "48px 48px 48px",
          gridTemplateRows: "48px 48px 48px",
          gap: 4,
          marginTop: 16,
        }}
      >
        {dpadBtn("▲", DIRS.up, "up")}
        {dpadBtn("◀", DIRS.left, "left")}
        {dpadBtn("▶", DIRS.right, "right")}
        {dpadBtn("▼", DIRS.down, "down")}
      </div>
    </div>
  );
}
