"use client";
import { useRef, useEffect, useState, useCallback } from "react";

/* ───── constants ───── */
const W = 400, H = 600;
const BUBBLE_R = 14;
const COLS = 14;
const ROW_H = BUBBLE_R * 1.73;          // vertical spacing (sqrt(3) * R)
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316"];
const COLOR_NAMES = ["red", "blue", "green", "yellow", "purple", "orange"];
const SPEED = 10;
const SHOOTER_Y = H - 40;
const MAX_ROWS = 30;                     // internal grid height
const GAME_OVER_Y = SHOOTER_Y - BUBBLE_R * 2;

/* ───── helpers ───── */
function randColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function colCount(row: number) {
  return row % 2 === 0 ? COLS : COLS - 1;
}

function gridToXY(r: number, c: number): [number, number] {
  const offset = r % 2 === 1 ? BUBBLE_R : 0;
  const x = BUBBLE_R + c * BUBBLE_R * 2 + offset;
  const y = BUBBLE_R + r * ROW_H;
  return [x, y];
}

function hexNeighbors(r: number, c: number): [number, number][] {
  if (r % 2 === 0) {
    return [
      [r - 1, c - 1], [r - 1, c],
      [r, c - 1], [r, c + 1],
      [r + 1, c - 1], [r + 1, c],
    ];
  }
  return [
    [r - 1, c], [r - 1, c + 1],
    [r, c - 1], [r, c + 1],
    [r + 1, c], [r + 1, c + 1],
  ];
}

/* ───── pop sound via Web Audio API ───── */
let audioCtx: AudioContext | null = null;
function playPop() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } catch { /* ignore audio errors */ }
}

function playDropSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
  } catch { /* ignore */ }
}

/* ───── animation particle ───── */
interface PopParticle {
  x: number; y: number; color: string; t: number; type: "pop" | "fall";
  vy?: number;
}

/* ───── component ───── */
export default function BubbleShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    grid: (string | null)[][];
    bullet: { x: number; y: number; vx: number; vy: number; color: string } | null;
    aimAngle: number;
    currentColor: string;
    nextColor: string;
    score: number;
    highScore: number;
    shotCount: number;
    gameOver: boolean;
    particles: PopParticle[];
    animId: number;
  } | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [nextColorDisplay, setNextColorDisplay] = useState(COLORS[0]);

  /* ───── init grid ───── */
  const makeGrid = useCallback((): (string | null)[][] => {
    const grid: (string | null)[][] = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      grid[r] = [];
      const cc = colCount(r);
      for (let c = 0; c < cc; c++) {
        grid[r][c] = r < 5 ? randColor() : null;
      }
    }
    return grid;
  }, []);

  /* ───── start / restart ───── */
  const startGame = useCallback(() => {
    let hs = 0;
    try { hs = parseInt(localStorage.getItem("bubbleShooterHigh") || "0", 10) || 0; } catch { /* */ }
    setHighScore(hs);
    setScore(0);
    setGameOver(false);
    const c1 = randColor(), c2 = randColor();
    setNextColorDisplay(c2);

    if (stateRef.current) {
      cancelAnimationFrame(stateRef.current.animId);
    }
    stateRef.current = {
      grid: makeGrid(),
      bullet: null,
      aimAngle: -Math.PI / 2,
      currentColor: c1,
      nextColor: c2,
      score: 0,
      highScore: hs,
      shotCount: 0,
      gameOver: false,
      particles: [],
      animId: 0,
    };
  }, [makeGrid]);

  /* ───── main effect ───── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = W;
    canvas.height = H;

    startGame();

    /* ----- find nearest empty grid slot ----- */
    function findNearest(bx: number, by: number): [number, number] | null {
      const s = stateRef.current!;
      let bestR = -1, bestC = -1, bestDist = Infinity;
      for (let r = 0; r < MAX_ROWS; r++) {
        const cc = colCount(r);
        for (let c = 0; c < cc; c++) {
          if (s.grid[r] && s.grid[r][c] !== null) continue;
          const [gx, gy] = gridToXY(r, c);
          const d = Math.hypot(bx - gx, by - gy);
          if (d < BUBBLE_R * 2.2 && d < bestDist) {
            bestDist = d; bestR = r; bestC = c;
          }
        }
      }
      return bestR >= 0 ? [bestR, bestC] : null;
    }

    /* ----- flood fill for matching color ----- */
    function floodMatch(r: number, c: number, color: string): [number, number][] {
      const s = stateRef.current!;
      const visited = new Set<string>();
      const stack: [number, number][] = [[r, c]];
      const matched: [number, number][] = [];
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        const key = `${cr},${cc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (cr < 0 || cr >= MAX_ROWS) continue;
        const maxC = colCount(cr);
        if (cc < 0 || cc >= maxC) continue;
        if (!s.grid[cr] || s.grid[cr][cc] !== color) continue;
        matched.push([cr, cc]);
        for (const [nr, nc] of hexNeighbors(cr, cc)) {
          stack.push([nr, nc]);
        }
      }
      return matched;
    }

    /* ----- find floating bubbles (not connected to row 0) ----- */
    function findFloating(): [number, number][] {
      const s = stateRef.current!;
      const connected = new Set<string>();
      const stack: [number, number][] = [];
      // seed from row 0
      const cc0 = colCount(0);
      for (let c = 0; c < cc0; c++) {
        if (s.grid[0] && s.grid[0][c] !== null) {
          stack.push([0, c]);
          connected.add(`0,${c}`);
        }
      }
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        for (const [nr, nc] of hexNeighbors(cr, cc)) {
          const key = `${nr},${nc}`;
          if (connected.has(key)) continue;
          if (nr < 0 || nr >= MAX_ROWS) continue;
          const maxC = colCount(nr);
          if (nc < 0 || nc >= maxC) continue;
          if (!s.grid[nr] || s.grid[nr][nc] === null) continue;
          connected.add(key);
          stack.push([nr, nc]);
        }
      }
      // anything not connected is floating
      const floating: [number, number][] = [];
      for (let r = 0; r < MAX_ROWS; r++) {
        const maxC = colCount(r);
        for (let c = 0; c < maxC; c++) {
          if (s.grid[r] && s.grid[r][c] !== null && !connected.has(`${r},${c}`)) {
            floating.push([r, c]);
          }
        }
      }
      return floating;
    }

    /* ----- add new row from top, shifting everything down ----- */
    function addRowFromTop() {
      const s = stateRef.current!;
      // shift all rows down by 1
      for (let r = MAX_ROWS - 1; r >= 1; r--) {
        // when shifting, odd/even parity flips, so we need to handle column counts
        s.grid[r] = s.grid[r - 1];
      }
      // create new row 0
      const cc = colCount(0);
      s.grid[0] = [];
      for (let c = 0; c < cc; c++) {
        s.grid[0][c] = randColor();
      }
      // Fix column counts: after shifting, rows that changed parity might have wrong col counts
      // Rebuild grids to ensure correct column counts
      for (let r = 1; r < MAX_ROWS; r++) {
        const expected = colCount(r);
        const row = s.grid[r];
        if (!row) { s.grid[r] = new Array(expected).fill(null); continue; }
        if (row.length > expected) {
          s.grid[r] = row.slice(0, expected);
        } else {
          while (s.grid[r].length < expected) s.grid[r].push(null);
        }
      }
    }

    /* ----- check game over ----- */
    function checkGameOver(): boolean {
      const s = stateRef.current!;
      for (let r = 0; r < MAX_ROWS; r++) {
        const maxC = colCount(r);
        for (let c = 0; c < maxC; c++) {
          if (s.grid[r] && s.grid[r][c] !== null) {
            const [, gy] = gridToXY(r, c);
            if (gy + BUBBLE_R >= GAME_OVER_Y) return true;
          }
        }
      }
      return false;
    }

    /* ----- place bubble and resolve ----- */
    function placeBubble(bx: number, by: number, color: string) {
      const s = stateRef.current!;
      const pos = findNearest(bx, by);
      if (!pos) return;
      const [pr, pc] = pos;
      if (!s.grid[pr]) {
        s.grid[pr] = new Array(colCount(pr)).fill(null);
      }
      s.grid[pr][pc] = color;

      // check matches
      const matched = floodMatch(pr, pc, color);
      if (matched.length >= 3) {
        playPop();
        for (const [mr, mc] of matched) {
          const [mx, my] = gridToXY(mr, mc);
          s.particles.push({ x: mx, y: my, color: s.grid[mr][mc]!, t: 1, type: "pop" });
          s.grid[mr][mc] = null;
        }
        s.score += matched.length * 10;

        // remove floating
        const floating = findFloating();
        if (floating.length > 0) {
          playDropSound();
          for (const [fr, fc] of floating) {
            const [fx, fy] = gridToXY(fr, fc);
            s.particles.push({ x: fx, y: fy, color: s.grid[fr][fc]!, t: 1, type: "fall", vy: 0 });
            s.grid[fr][fc] = null;
          }
          s.score += floating.length * 15; // bonus for floating drops
        }

        setScore(s.score);
        try {
          if (s.score > s.highScore) {
            s.highScore = s.score;
            setHighScore(s.highScore);
            localStorage.setItem("bubbleShooterHigh", String(s.highScore));
          }
        } catch { /* */ }
      }

      // every 5 shots, add row from top
      s.shotCount++;
      if (s.shotCount % 5 === 0) {
        addRowFromTop();
      }

      // check game over
      if (checkGameOver()) {
        s.gameOver = true;
        setGameOver(true);
      }
    }

    /* ----- draw a bubble with gradient ----- */
    function drawBubble(x: number, y: number, color: string, radius: number, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
      grad.addColorStop(0, "#ffffff88");
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, darken(color, 0.3));
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    function darken(hex: string, amount: number): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const f = 1 - amount;
      return `rgb(${Math.floor(r * f)},${Math.floor(g * f)},${Math.floor(b * f)})`;
    }

    /* ----- draw dotted aim line ----- */
    function drawAimLine() {
      const s = stateRef.current!;
      const sx = W / 2, sy = SHOOTER_Y;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);

      // trace aim with wall bounces for a nice preview
      let cx = sx, cy = sy;
      let dx = Math.cos(s.aimAngle);
      let dy = Math.sin(s.aimAngle);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const step = 3;
      for (let i = 0; i < 120; i++) {
        cx += dx * step;
        cy += dy * step;
        if (cx < BUBBLE_R) { cx = BUBBLE_R; dx = -dx; }
        if (cx > W - BUBBLE_R) { cx = W - BUBBLE_R; dx = -dx; }
        if (cy < 0) break;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* ----- main render loop ----- */
    function loop() {
      const s = stateRef.current;
      if (!s) return;

      // dark background
      ctx.fillStyle = "#111118";
      ctx.fillRect(0, 0, W, H);

      // subtle grid area background
      ctx.fillStyle = "#16161e";
      ctx.fillRect(0, 0, W, GAME_OVER_Y);

      // game-over line
      ctx.strokeStyle = "rgba(239,68,68,0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, GAME_OVER_Y);
      ctx.lineTo(W, GAME_OVER_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // draw grid bubbles
      for (let r = 0; r < MAX_ROWS; r++) {
        const maxC = colCount(r);
        for (let c = 0; c < maxC; c++) {
          if (!s.grid[r] || s.grid[r][c] === null) continue;
          const [gx, gy] = gridToXY(r, c);
          if (gy > GAME_OVER_Y + BUBBLE_R * 2) continue; // off screen
          drawBubble(gx, gy, s.grid[r][c]!, BUBBLE_R);
        }
      }

      // update & draw particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        if (p.type === "pop") {
          p.t -= 0.06;
          if (p.t <= 0) { s.particles.splice(i, 1); continue; }
          drawBubble(p.x, p.y, p.color, BUBBLE_R * p.t, p.t);
        } else {
          // fall
          p.vy = (p.vy || 0) + 0.5;
          p.y += p.vy;
          p.t -= 0.02;
          if (p.t <= 0 || p.y > H + 20) { s.particles.splice(i, 1); continue; }
          drawBubble(p.x, p.y, p.color, BUBBLE_R, p.t);
        }
      }

      // move bullet
      if (s.bullet && !s.gameOver) {
        const b = s.bullet;
        b.x += b.vx;
        b.y += b.vy;
        // wall bounce
        if (b.x - BUBBLE_R <= 0) { b.x = BUBBLE_R; b.vx = Math.abs(b.vx); }
        if (b.x + BUBBLE_R >= W) { b.x = W - BUBBLE_R; b.vx = -Math.abs(b.vx); }
        // ceiling
        if (b.y - BUBBLE_R <= 0) {
          placeBubble(b.x, Math.max(b.y, BUBBLE_R), b.color);
          s.bullet = null;
          s.currentColor = s.nextColor;
          s.nextColor = randColor();
          setNextColorDisplay(s.nextColor);
        } else {
          // collision with grid bubbles
          let hit = false;
          outer:
          for (let r = 0; r < MAX_ROWS; r++) {
            const maxC = colCount(r);
            for (let c = 0; c < maxC; c++) {
              if (!s.grid[r] || s.grid[r][c] === null) continue;
              const [gx, gy] = gridToXY(r, c);
              if (Math.hypot(b.x - gx, b.y - gy) < BUBBLE_R * 1.9) {
                placeBubble(b.x, b.y, b.color);
                s.bullet = null;
                s.currentColor = s.nextColor;
                s.nextColor = randColor();
                setNextColorDisplay(s.nextColor);
                hit = true;
                break outer;
              }
            }
          }
          if (!hit) {
            drawBubble(b.x, b.y, b.color, BUBBLE_R);
          }
        }
      }

      // aim line
      if (!s.bullet && !s.gameOver) {
        drawAimLine();
      }

      // shooter platform
      ctx.fillStyle = "#222230";
      ctx.fillRect(0, SHOOTER_Y + BUBBLE_R + 8, W, H - SHOOTER_Y - BUBBLE_R - 8);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, SHOOTER_Y + BUBBLE_R + 8);
      ctx.lineTo(W, SHOOTER_Y + BUBBLE_R + 8);
      ctx.stroke();

      // current bubble (shooter)
      if (!s.bullet && !s.gameOver) {
        drawBubble(W / 2, SHOOTER_Y, s.currentColor, BUBBLE_R);
        // small direction indicator
        const indX = W / 2 + Math.cos(s.aimAngle) * (BUBBLE_R + 6);
        const indY = SHOOTER_Y + Math.sin(s.aimAngle) * (BUBBLE_R + 6);
        ctx.beginPath();
        ctx.arc(indX, indY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
      }

      // next bubble preview
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NEXT", W / 2 + 60, SHOOTER_Y - 10);
      drawBubble(W / 2 + 60, SHOOTER_Y + 6, s.nextColor, BUBBLE_R * 0.7);

      // game over overlay
      if (s.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "18px sans-serif";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 16);
        ctx.fillStyle = "#888";
        ctx.font = "14px sans-serif";
        ctx.fillText("Click \"New Game\" to restart", W / 2, H / 2 + 48);
      }

      s.animId = requestAnimationFrame(loop);
    }

    /* ----- event handlers ----- */
    function onMove(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || s.gameOver) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      let angle = Math.atan2(my - SHOOTER_Y, mx - W / 2);
      // clamp to upward
      if (angle > -0.15) angle = -0.15;
      if (angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;
      s.aimAngle = angle;
    }

    function onClick(e: MouseEvent) {
      const s = stateRef.current;
      if (!s || s.bullet || s.gameOver) return;
      // resume audio context on user gesture
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      s.bullet = {
        x: W / 2,
        y: SHOOTER_Y,
        vx: Math.cos(s.aimAngle) * SPEED,
        vy: Math.sin(s.aimAngle) * SPEED,
        color: s.currentColor,
      };
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);

    stateRef.current!.animId = requestAnimationFrame(loop);

    return () => {
      const s = stateRef.current;
      if (s) cancelAnimationFrame(s.animId);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewGame = useCallback(() => {
    startGame();
  }, [startGame]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: 16, fontFamily: "sans-serif", userSelect: "none",
    }}>
      {/* score bar */}
      <div style={{
        display: "flex", gap: 24, marginBottom: 8, alignItems: "center",
        color: "#ccc", fontSize: 14,
      }}>
        <span>Score: <b style={{ color: "#eab308", fontSize: 18 }}>{score}</b></span>
        <span>High: <b style={{ color: "#a855f7", fontSize: 18 }}>{highScore}</b></span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          Next:
          <span style={{
            display: "inline-block", width: 18, height: 18, borderRadius: "50%",
            background: nextColorDisplay, border: "1px solid rgba(255,255,255,0.2)",
          }} />
        </span>
      </div>

      {/* canvas */}
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 10, cursor: "crosshair",
          border: "1px solid rgba(255,255,255,0.08)",
          maxWidth: "100%", height: "auto",
        }}
      />

      {/* controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
        <button
          onClick={handleNewGame}
          style={{
            padding: "8px 20px", borderRadius: 6, border: "none",
            background: "#3b82f6", color: "#fff", fontWeight: 600,
            cursor: "pointer", fontSize: 14,
          }}
        >
          New Game
        </button>
        <span style={{ color: "#666", fontSize: 12 }}>
          Aim with mouse, click to shoot
        </span>
      </div>

      {/* game over banner */}
      {gameOver && (
        <div style={{
          marginTop: 10, padding: "8px 20px", borderRadius: 6,
          background: "rgba(239,68,68,0.15)", color: "#ef4444",
          fontSize: 14, fontWeight: 600,
        }}>
          Game Over! Final Score: {score}
        </div>
      )}
    </div>
  );
}
