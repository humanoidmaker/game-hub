import { useRef, useEffect, useState, useCallback } from "react";

/* ─── Types ─── */
interface Vec2 {
  x: number;
  y: number;
}

interface Coin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  type: "white" | "black" | "queen" | "striker";
  pocketed: boolean;
}

/* ─── Constants ─── */
const CANVAS = 500; // total canvas size including border
const BORDER = 50; // wooden border thickness
const BOARD = CANVAS - BORDER * 2; // playable area = 400x400
const POCKET_R = 20;
const COIN_R = 10;
const STRIKER_R = 14;
const FRICTION = 0.982;
const STOP_THRESHOLD = 0.08;
const MAX_POWER = 14;
const POWER_SCALE = 0.12;
const RESTITUTION_WALL = 0.65;
const RESTITUTION_COIN = 0.9;

// Board edges (inner playable area)
const LEFT = BORDER;
const RIGHT = CANVAS - BORDER;
const TOP = BORDER;
const BOTTOM = CANVAS - BORDER;

// Pocket positions (at corners of the playable area)
const POCKETS: Vec2[] = [
  { x: LEFT, y: TOP },
  { x: RIGHT, y: TOP },
  { x: LEFT, y: BOTTOM },
  { x: RIGHT, y: BOTTOM },
];

/* ─── Helpers ─── */
function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/* ─── Coin layout: center ring pattern ─── */
function createCoins(): Coin[] {
  const coins: Coin[] = [];
  const cx = CANVAS / 2;
  const cy = CANVAS / 2;

  // Queen in the dead center
  coins.push({
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    r: COIN_R,
    color: "#dc2626",
    type: "queen",
    pocketed: false,
  });

  // Inner ring: 6 coins alternating white/black
  const innerR = 24;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    coins.push({
      x: cx + Math.cos(angle) * innerR,
      y: cy + Math.sin(angle) * innerR,
      vx: 0,
      vy: 0,
      r: COIN_R,
      color: i % 2 === 0 ? "#f5e6c8" : "#1a1a1a",
      type: i % 2 === 0 ? "white" : "black",
      pocketed: false,
    });
  }

  // Outer ring: 12 coins alternating black/white
  const outerR = 46;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    coins.push({
      x: cx + Math.cos(angle) * outerR,
      y: cy + Math.sin(angle) * outerR,
      vx: 0,
      vy: 0,
      r: COIN_R,
      color: i % 2 === 0 ? "#1a1a1a" : "#f5e6c8",
      type: i % 2 === 0 ? "black" : "white",
      pocketed: false,
    });
  }

  return coins; // 1 queen + 6 inner + 12 outer = 19 (9 white + 9 black + 1 queen)
}

function createStriker(forPlayer: boolean): Coin {
  return {
    x: CANVAS / 2,
    y: forPlayer ? BOTTOM - 40 : TOP + 40,
    vx: 0,
    vy: 0,
    r: STRIKER_R,
    color: "#fffbe6",
    type: "striker",
    pocketed: false,
  };
}

/* ─── Component ─── */
export default function Carrom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coinsRef = useRef<Coin[]>([]);
  const strikerRef = useRef<Coin>(createStriker(true));
  const turnRef = useRef<"player" | "bot">("player");
  const aimRef = useRef<{ active: boolean; mx: number; my: number }>({
    active: false,
    mx: 0,
    my: 0,
  });
  const animRef = useRef<number>(0);
  const shotFiredRef = useRef(false);
  const waitingRef = useRef(false);
  const pocketedThisTurnRef = useRef<Coin[]>([]);

  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [whiteLeft, setWhiteLeft] = useState(9);
  const [blackLeft, setBlackLeft] = useState(9);
  const [queenPocketed, setQueenPocketed] = useState(false);
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [message, setMessage] = useState("Your turn — click & drag the striker to shoot!");
  const [gameOver, setGameOver] = useState(false);

  /* ─── Init / Reset ─── */
  const resetGame = useCallback(() => {
    coinsRef.current = createCoins();
    strikerRef.current = createStriker(true);
    turnRef.current = "player";
    shotFiredRef.current = false;
    waitingRef.current = false;
    pocketedThisTurnRef.current = [];
    setPlayerScore(0);
    setBotScore(0);
    setWhiteLeft(9);
    setBlackLeft(9);
    setQueenPocketed(false);
    setTurn("player");
    setMessage("Your turn — click & drag the striker to shoot!");
    setGameOver(false);
  }, []);

  /* ─── Drawing ─── */
  function drawBoard(ctx: CanvasRenderingContext2D) {
    // Outer wooden border
    const grad = ctx.createLinearGradient(0, 0, CANVAS, CANVAS);
    grad.addColorStop(0, "#8B5E3C");
    grad.addColorStop(0.3, "#A0724E");
    grad.addColorStop(0.6, "#8B5E3C");
    grad.addColorStop(1, "#6B4226");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS, CANVAS);

    // Inner border groove
    ctx.strokeStyle = "#5C3A1E";
    ctx.lineWidth = 3;
    ctx.strokeRect(BORDER - 4, BORDER - 4, BOARD + 8, BOARD + 8);

    // Playing surface
    const surfGrad = ctx.createRadialGradient(
      CANVAS / 2,
      CANVAS / 2,
      20,
      CANVAS / 2,
      CANVAS / 2,
      BOARD / 1.2
    );
    surfGrad.addColorStop(0, "#dfc88a");
    surfGrad.addColorStop(1, "#c4a265");
    ctx.fillStyle = surfGrad;
    ctx.fillRect(LEFT, TOP, BOARD, BOARD);

    // Inner lines (carrom board markings)
    ctx.strokeStyle = "#a0874d";
    ctx.lineWidth = 1;
    // center circle
    ctx.beginPath();
    ctx.arc(CANVAS / 2, CANVAS / 2, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CANVAS / 2, CANVAS / 2, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Diagonal corner lines
    const lineInset = 30;
    const lineLen = 56;
    const corners = [
      { cx: LEFT, cy: TOP, dx: 1, dy: 1 },
      { cx: RIGHT, cy: TOP, dx: -1, dy: 1 },
      { cx: LEFT, cy: BOTTOM, dx: 1, dy: -1 },
      { cx: RIGHT, cy: BOTTOM, dx: -1, dy: -1 },
    ];
    ctx.strokeStyle = "#a0874d";
    ctx.lineWidth = 1.5;
    for (const c of corners) {
      const sx = c.cx + c.dx * lineInset;
      const sy = c.cy + c.dy * lineInset;
      // Draw arc marking near pockets
      ctx.beginPath();
      const startAngle = Math.atan2(c.dy, c.dx) - Math.PI / 4;
      ctx.arc(c.cx, c.cy, lineLen, startAngle, startAngle + Math.PI / 2);
      ctx.stroke();
    }

    // Baseline indicators (striker placement zones)
    ctx.strokeStyle = "#a0874d88";
    ctx.lineWidth = 1;
    // Bottom baseline (player)
    const baseY1 = BOTTOM - 40;
    ctx.beginPath();
    ctx.moveTo(LEFT + 50, baseY1);
    ctx.lineTo(RIGHT - 50, baseY1);
    ctx.stroke();
    // small circles at ends
    ctx.beginPath();
    ctx.arc(LEFT + 50, baseY1, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(RIGHT - 50, baseY1, 4, 0, Math.PI * 2);
    ctx.stroke();
    // Top baseline (bot)
    const baseY2 = TOP + 40;
    ctx.beginPath();
    ctx.moveTo(LEFT + 50, baseY2);
    ctx.lineTo(RIGHT - 50, baseY2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(LEFT + 50, baseY2, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(RIGHT - 50, baseY2, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Pockets
    for (const p of POCKETS) {
      // Pocket shadow
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R + 3, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1000";
      ctx.fill();
      // Pocket hole
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
    }
  }

  function drawCoin(ctx: CanvasRenderingContext2D, c: Coin) {
    if (c.pocketed) return;

    ctx.save();

    // Shadow
    ctx.beginPath();
    ctx.arc(c.x + 1, c.y + 2, c.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fill();

    // Main body
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.fill();

    // Inner ring detail
    if (c.type !== "striker") {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle =
        c.type === "white"
          ? "#c4a265"
          : c.type === "black"
          ? "#444"
          : "#ff6b6b";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Highlight
    ctx.beginPath();
    ctx.arc(c.x - c.r * 0.25, c.y - c.r * 0.25, c.r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Striker ring
    if (c.type === "striker") {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawAimLine(ctx: CanvasRenderingContext2D) {
    const aim = aimRef.current;
    if (!aim.active) return;
    const s = strikerRef.current;

    // Direction is opposite of drag (rubber band)
    const dx = s.x - aim.mx;
    const dy = s.y - aim.my;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 3) return;

    const power = Math.min(d * POWER_SCALE, MAX_POWER);
    const nx = dx / d;
    const ny = dy / d;
    const lineLen = power * 16;

    // Dotted aim line
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + nx * lineLen, s.y + ny * lineLen);
    ctx.stroke();
    ctx.setLineDash([]);

    // Power indicator bar at bottom of canvas
    const maxBarW = 120;
    const barH = 8;
    const barX = CANVAS / 2 - maxBarW / 2;
    const barY = CANVAS - 18;
    const fill = power / MAX_POWER;

    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, maxBarW, barH);
    const barGrad = ctx.createLinearGradient(barX, barY, barX + maxBarW, barY);
    barGrad.addColorStop(0, "#4ade80");
    barGrad.addColorStop(0.5, "#facc15");
    barGrad.addColorStop(1, "#ef4444");
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY, maxBarW * fill, barH);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, maxBarW, barH);

    // "POWER" label
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("POWER", CANVAS / 2, barY - 3);

    // Rubber band line (from striker to mouse)
    ctx.strokeStyle = "rgba(255,100,100,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(aim.mx, aim.my);
    ctx.stroke();

    ctx.restore();
  }

  /* ─── Physics ─── */
  function allStopped(coins: Coin[], striker: Coin): boolean {
    const active = [...coins.filter((c) => !c.pocketed), striker].filter(
      (c) => !c.pocketed
    );
    return active.every(
      (c) =>
        Math.abs(c.vx) < STOP_THRESHOLD && Math.abs(c.vy) < STOP_THRESHOLD
    );
  }

  function stepPhysics(coins: Coin[], striker: Coin) {
    const active = [
      ...coins.filter((c) => !c.pocketed),
      ...(striker.pocketed ? [] : [striker]),
    ];

    // Move + friction
    for (const c of active) {
      c.x += c.vx;
      c.y += c.vy;
      c.vx *= FRICTION;
      c.vy *= FRICTION;
      if (Math.abs(c.vx) < STOP_THRESHOLD * 0.5) c.vx = 0;
      if (Math.abs(c.vy) < STOP_THRESHOLD * 0.5) c.vy = 0;
    }

    // Wall bounce
    for (const c of active) {
      if (c.x - c.r < LEFT) {
        c.x = LEFT + c.r;
        c.vx = Math.abs(c.vx) * RESTITUTION_WALL;
      }
      if (c.x + c.r > RIGHT) {
        c.x = RIGHT - c.r;
        c.vx = -Math.abs(c.vx) * RESTITUTION_WALL;
      }
      if (c.y - c.r < TOP) {
        c.y = TOP + c.r;
        c.vy = Math.abs(c.vy) * RESTITUTION_WALL;
      }
      if (c.y + c.r > BOTTOM) {
        c.y = BOTTOM - c.r;
        c.vy = -Math.abs(c.vy) * RESTITUTION_WALL;
      }
    }

    // Circle-circle collisions
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.r + b.r;
        if (d < minDist && d > 0.001) {
          const nx = dx / d;
          const ny = dy / d;

          // Relative velocity along normal
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dvn = dvx * nx + dvy * ny;

          if (dvn > 0) {
            // Mass weighting: striker is heavier
            const mA = a.type === "striker" ? 2 : 1;
            const mB = b.type === "striker" ? 2 : 1;
            const impulse = (dvn * RESTITUTION_COIN * 2) / (mA + mB);
            a.vx -= impulse * mB * nx;
            a.vy -= impulse * mB * ny;
            b.vx += impulse * mA * nx;
            b.vy += impulse * mA * ny;
          }

          // Separate overlapping coins
          const overlap = (minDist - d) / 2 + 0.5;
          a.x -= overlap * nx;
          a.y -= overlap * ny;
          b.x += overlap * nx;
          b.y += overlap * ny;
        }
      }
    }

    // Pocket detection — coins
    const justPocketed: Coin[] = [];
    for (const c of coins) {
      if (c.pocketed) continue;
      for (const p of POCKETS) {
        if (dist(c, p) < POCKET_R + c.r * 0.3) {
          c.pocketed = true;
          c.vx = 0;
          c.vy = 0;
          justPocketed.push(c);
          break;
        }
      }
    }

    // Pocket detection — striker
    let strikerFoul = false;
    if (!striker.pocketed) {
      for (const p of POCKETS) {
        if (dist(striker, p) < POCKET_R + striker.r * 0.3) {
          striker.pocketed = true;
          striker.vx = 0;
          striker.vy = 0;
          strikerFoul = true;
          break;
        }
      }
    }

    return { justPocketed, strikerFoul };
  }

  /* ─── Bot AI ─── */
  function botShoot(coins: Coin[], striker: Coin) {
    // Targets: black coins (bot aims for black)
    const targets = coins.filter((c) => !c.pocketed && c.type === "black");
    const fallback = coins.filter((c) => !c.pocketed && c.type !== "striker");
    const pool = targets.length > 0 ? targets : fallback;

    if (pool.length === 0) return;

    // Find best target-pocket pair (shortest combined distance)
    let bestTarget = pool[0];
    let bestPocket = POCKETS[0];
    let bestScore = Infinity;

    for (const t of pool) {
      for (const p of POCKETS) {
        const dST = dist(striker, t);
        const dTP = dist(t, p);
        const score = dST + dTP * 0.8; // weight pocket distance slightly less
        if (score < bestScore) {
          bestScore = score;
          bestTarget = t;
          bestPocket = p;
        }
      }
    }

    // Aim: push target toward pocket
    // Direction from target to pocket
    const tpx = bestPocket.x - bestTarget.x;
    const tpy = bestPocket.y - bestTarget.y;
    const tpd = Math.sqrt(tpx * tpx + tpy * tpy);

    // Hit point: the point on the target opposite the pocket direction
    const hitX = bestTarget.x - (tpx / tpd) * (bestTarget.r + striker.r);
    const hitY = bestTarget.y - (tpy / tpd) * (bestTarget.r + striker.r);

    // Direction from striker to hit point
    const dx = hitX - striker.x;
    const dy = hitY - striker.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < 0.1) return;

    // Add slight inaccuracy
    const errorAngle = (Math.random() - 0.5) * 0.15;
    const angle = Math.atan2(dy, dx) + errorAngle;

    const power = clamp(5 + Math.random() * 5, 4, MAX_POWER * 0.7);
    striker.vx = Math.cos(angle) * power;
    striker.vy = Math.sin(angle) * power;
  }

  /* ─── Main game loop setup ─── */
  useEffect(() => {
    coinsRef.current = createCoins();
    strikerRef.current = createStriker(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let wasMoving = false;
    let pendingTurnSwitch = false;
    let turnSwitchTimer: ReturnType<typeof setTimeout> | null = null;

    const loop = () => {
      const coins = coinsRef.current;
      const striker = strikerRef.current;

      // Physics step
      const { justPocketed, strikerFoul } = stepPhysics(coins, striker);

      // Track coins pocketed this turn
      if (justPocketed.length > 0) {
        pocketedThisTurnRef.current.push(...justPocketed);
      }

      // Update counts
      const wRemain = coins.filter(
        (c) => c.type === "white" && !c.pocketed
      ).length;
      const bRemain = coins.filter(
        (c) => c.type === "black" && !c.pocketed
      ).length;
      const qGone = coins.find((c) => c.type === "queen")?.pocketed ?? false;

      setWhiteLeft(wRemain);
      setBlackLeft(bRemain);
      setQueenPocketed(qGone);

      // Handle scoring for pocketed coins
      for (const pc of justPocketed) {
        const pts = pc.type === "queen" ? 3 : 1;
        if (turnRef.current === "player") {
          setPlayerScore((s) => s + pts);
        } else {
          setBotScore((s) => s + pts);
        }
      }

      // Check if all movement stopped after a shot
      const moving = !allStopped(coins, striker);

      if (shotFiredRef.current && wasMoving && !moving && !pendingTurnSwitch) {
        pendingTurnSwitch = true;
        const currentTurn = turnRef.current;
        const pocketed = pocketedThisTurnRef.current;

        // Foul handling: striker pocketed
        let foul = striker.pocketed;
        if (foul) {
          // Opponent gets a coin back
          const opponentColor =
            currentTurn === "player" ? "black" : "white";
          // Actually in standard carrom, foul = opponent places one of YOUR pocketed coins back
          // Simplified: just a penalty message
          if (currentTurn === "player") {
            setPlayerScore((s) => Math.max(0, s - 1));
          } else {
            setBotScore((s) => Math.max(0, s - 1));
          }
        }

        // Reset striker
        striker.pocketed = false;
        striker.vx = 0;
        striker.vy = 0;

        // Check game over
        if (wRemain === 0 || bRemain === 0) {
          setGameOver(true);
          if (wRemain === 0) {
            setMessage("Game Over! Player wins — all white coins pocketed!");
          } else {
            setMessage("Game Over! Bot wins — all black coins pocketed!");
          }
          striker.x = CANVAS / 2;
          striker.y = BOTTOM - 40;
          shotFiredRef.current = false;
          pendingTurnSwitch = false;
          pocketedThisTurnRef.current = [];
          // Still draw
          render();
          animRef.current = requestAnimationFrame(loop);
          wasMoving = false;
          return;
        }

        // Determine if current player pocketed one of their own => gets another turn
        const ownColor = currentTurn === "player" ? "white" : "black";
        const gotOwn = pocketed.some((c) => c.type === ownColor);
        const extraTurn = gotOwn && !foul;

        pocketedThisTurnRef.current = [];

        if (extraTurn) {
          // Same player goes again
          striker.x = CANVAS / 2;
          striker.y = currentTurn === "player" ? BOTTOM - 40 : TOP + 40;
          shotFiredRef.current = false;
          pendingTurnSwitch = false;
          if (currentTurn === "player") {
            setMessage("Nice pocket! You go again!");
          } else {
            // Bot shoots again after delay
            turnSwitchTimer = setTimeout(() => {
              botShoot(coins, striker);
              shotFiredRef.current = true;
              pendingTurnSwitch = false;
            }, 800);
          }
        } else {
          // Switch turns
          const nextTurn = currentTurn === "player" ? "bot" : "player";
          turnRef.current = nextTurn;
          setTurn(nextTurn);
          shotFiredRef.current = false;

          striker.x = CANVAS / 2;
          striker.y = nextTurn === "player" ? BOTTOM - 40 : TOP + 40;

          if (foul) {
            setMessage(
              currentTurn === "player"
                ? "Foul! Striker pocketed. -1 point. Bot's turn."
                : "Bot foul! -1 point. Your turn!"
            );
          } else {
            setMessage(
              nextTurn === "player"
                ? "Your turn — click & drag the striker to shoot!"
                : "Bot is thinking..."
            );
          }

          if (nextTurn === "bot") {
            turnSwitchTimer = setTimeout(() => {
              botShoot(coinsRef.current, strikerRef.current);
              shotFiredRef.current = true;
              pendingTurnSwitch = false;
            }, 900);
          } else {
            pendingTurnSwitch = false;
          }
        }
      }

      wasMoving = moving;

      // Draw
      render();

      animRef.current = requestAnimationFrame(loop);
    };

    function render() {
      const coins = coinsRef.current;
      const striker = strikerRef.current;

      drawBoard(ctx!);

      // Draw coins
      for (const c of coins) {
        drawCoin(ctx!, c);
      }
      // Draw striker
      drawCoin(ctx!, striker);

      // Draw aim line
      drawAimLine(ctx!);
    }

    // Mouse / touch handlers
    function getPos(e: MouseEvent | TouchEvent): Vec2 {
      const rect = canvas!.getBoundingClientRect();
      const scaleX = CANVAS / rect.width;
      const scaleY = CANVAS / rect.height;
      if ("touches" in e) {
        const t = e.touches[0] || (e as TouchEvent).changedTouches[0];
        return {
          x: (t.clientX - rect.left) * scaleX,
          y: (t.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: ((e as MouseEvent).clientX - rect.left) * scaleX,
        y: ((e as MouseEvent).clientY - rect.top) * scaleY,
      };
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (turnRef.current !== "player" || shotFiredRef.current || gameOverRef.current)
        return;
      const pos = getPos(e);
      const s = strikerRef.current;
      // Must click near the striker
      if (dist(pos, s) > s.r * 3) return;
      aimRef.current = { active: true, mx: pos.x, my: pos.y };
    }

    function onPointerMove(e: MouseEvent | TouchEvent) {
      if (!aimRef.current.active) return;
      e.preventDefault();
      const pos = getPos(e);
      aimRef.current.mx = pos.x;
      aimRef.current.my = pos.y;
    }

    function onPointerUp(e: MouseEvent | TouchEvent) {
      if (!aimRef.current.active) return;
      const s = strikerRef.current;
      const aim = aimRef.current;

      const dx = s.x - aim.mx;
      const dy = s.y - aim.my;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d > 5) {
        const power = Math.min(d * POWER_SCALE, MAX_POWER);
        s.vx = (dx / d) * power;
        s.vy = (dy / d) * power;
        shotFiredRef.current = true;
        pocketedThisTurnRef.current = [];
      }

      aim.active = false;
    }

    canvas.addEventListener("mousedown", onPointerDown as any);
    canvas.addEventListener("mousemove", onPointerMove as any);
    canvas.addEventListener("mouseup", onPointerUp as any);
    canvas.addEventListener("touchstart", onPointerDown as any, {
      passive: false,
    });
    canvas.addEventListener("touchmove", onPointerMove as any, {
      passive: false,
    });
    canvas.addEventListener("touchend", onPointerUp as any);

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      if (turnSwitchTimer) clearTimeout(turnSwitchTimer);
      canvas.removeEventListener("mousedown", onPointerDown as any);
      canvas.removeEventListener("mousemove", onPointerMove as any);
      canvas.removeEventListener("mouseup", onPointerUp as any);
      canvas.removeEventListener("touchstart", onPointerDown as any);
      canvas.removeEventListener("touchmove", onPointerMove as any);
      canvas.removeEventListener("touchend", onPointerUp as any);
    };
  }, []);

  // Keep a ref for gameOver that the loop can access
  const gameOverRef = useRef(false);
  gameOverRef.current = gameOver;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 20,
        background: "#1a1a2e",
        borderRadius: 12,
        minHeight: 600,
        userSelect: "none",
      }}
    >
      {/* Status */}
      <p
        style={{
          color: "#e0d6b8",
          marginBottom: 10,
          fontSize: 15,
          fontWeight: 500,
          textAlign: "center",
          minHeight: 22,
        }}
      >
        {message}
      </p>

      {/* Scoreboard */}
      <div
        style={{
          display: "flex",
          gap: 28,
          marginBottom: 14,
          fontSize: 13,
          fontFamily: "monospace",
        }}
      >
        <span
          style={{
            color: turn === "player" ? "#4ade80" : "#888",
            fontWeight: turn === "player" ? 700 : 400,
            padding: "4px 10px",
            borderRadius: 6,
            background:
              turn === "player" ? "rgba(74,222,128,0.1)" : "transparent",
          }}
        >
          Player (White): {playerScore} pts
        </span>
        <span
          style={{
            color: turn === "bot" ? "#f87171" : "#888",
            fontWeight: turn === "bot" ? 700 : 400,
            padding: "4px 10px",
            borderRadius: 6,
            background:
              turn === "bot" ? "rgba(248,113,113,0.1)" : "transparent",
          }}
        >
          Bot (Black): {botScore} pts
        </span>
      </div>

      {/* Coins remaining */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 12,
          fontSize: 11,
          color: "#999",
          fontFamily: "monospace",
        }}
      >
        <span>White left: {whiteLeft}</span>
        <span>Black left: {blackLeft}</span>
        <span style={{ color: queenPocketed ? "#ef4444" : "#999" }}>
          Queen: {queenPocketed ? "Pocketed" : "On board"}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS}
        height={CANVAS}
        style={{
          borderRadius: 8,
          cursor: gameOver ? "default" : "crosshair",
          maxWidth: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      />

      {/* New Game */}
      <button
        onClick={resetGame}
        style={{
          marginTop: 16,
          padding: "10px 28px",
          background: "linear-gradient(135deg, #8B5E3C, #A0724E)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.5,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        New Game
      </button>
    </div>
  );
}
