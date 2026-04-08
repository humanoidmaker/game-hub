"use client";
import { useRef, useEffect, useState, useCallback } from "react";

// Classic dartboard sector order (clockwise from top)
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SECTOR_ANGLE = (Math.PI * 2) / 20;

// Board geometry (radii)
const R_BULL = 8;
const R_OUTER_BULL = 20;
const R_INNER_SINGLE = 50;
const R_TRIPLE = 62;
const R_OUTER_TRIPLE = 74;
const R_OUTER_SINGLE = 107;
const R_DOUBLE = 119;
const R_OUTER_DOUBLE = 131;
const R_NUMBER = 148;
const CX = 200;
const CY = 200;

// Colors
const COL_RED = "#d42b2b";
const COL_GREEN = "#1b7a2e";
const COL_WHITE = "#f0e6cc";
const COL_BLACK = "#1a1a1a";
const COL_WIRE = "#8a8a7a";
const COL_BULL_RED = "#d42b2b";
const COL_BULL_GREEN = "#1b7a2e";

type DartMarker = { x: number; y: number; label: string; score: number; multiplier: number };

type HitResult = {
  score: number;
  baseScore: number;
  multiplier: number;
  label: string;
  isDouble: boolean;
  isBull: boolean;
};

function getSectorIndex(angle: number): number {
  // angle 0 = right, we need to rotate so sector 0 (20) is at top
  let a = (angle + Math.PI / 2 + SECTOR_ANGLE / 2 + Math.PI * 4) % (Math.PI * 2);
  return Math.floor(a / SECTOR_ANGLE) % 20;
}

function getHit(x: number, y: number): HitResult {
  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= R_BULL) return { score: 50, baseScore: 50, multiplier: 1, label: "Bull (50)", isDouble: true, isBull: true };
  if (dist <= R_OUTER_BULL) return { score: 25, baseScore: 25, multiplier: 1, label: "Bullseye (25)", isDouble: false, isBull: false };
  if (dist > R_OUTER_DOUBLE) return { score: 0, baseScore: 0, multiplier: 0, label: "Miss!", isDouble: false, isBull: false };

  const angle = Math.atan2(dy, dx);
  const idx = getSectorIndex(angle);
  const base = SECTORS[idx];

  if (dist >= R_DOUBLE && dist <= R_OUTER_DOUBLE) {
    return { score: base * 2, baseScore: base, multiplier: 2, label: `D${base} (${base * 2})`, isDouble: true, isBull: false };
  }
  if (dist >= R_TRIPLE && dist <= R_OUTER_TRIPLE) {
    return { score: base * 3, baseScore: base, multiplier: 3, label: `T${base} (${base * 3})`, isDouble: false, isBull: false };
  }
  return { score: base, baseScore: base, multiplier: 1, label: `${base}`, isDouble: false, isBull: false };
}

function getCheckout(remaining: number): string {
  if (remaining > 170) return "";
  if (remaining <= 0) return "";
  // Single-dart checkouts
  if (remaining === 50) return "Bull";
  if (remaining <= 40 && remaining % 2 === 0) return `D${remaining / 2}`;
  // Two-dart checkouts
  if (remaining === 51) return "S1, Bull";
  for (let d = 1; d <= 20; d++) {
    const afterDouble = remaining - d * 2;
    if (afterDouble === 0) return `D${d}`;
    if (afterDouble === 50) return `S${d === 25 ? "Bull" : ""}, Bull`.replace("S, ", "");
  }
  // Try single + double
  for (let s = 1; s <= 20; s++) {
    const afterSingle = remaining - s;
    if (afterSingle > 0 && afterSingle <= 40 && afterSingle % 2 === 0) return `S${s}, D${afterSingle / 2}`;
    if (afterSingle === 50) return `S${s}, Bull`;
  }
  // Try double + double
  for (let d1 = 1; d1 <= 20; d1++) {
    const after = remaining - d1 * 2;
    if (after > 0 && after <= 40 && after % 2 === 0) return `D${d1}, D${after / 2}`;
    if (after === 50) return `D${d1}, Bull`;
  }
  // Try triple + double
  for (let t = 1; t <= 20; t++) {
    const after = remaining - t * 3;
    if (after > 0 && after <= 40 && after % 2 === 0) return `T${t}, D${after / 2}`;
    if (after === 50) return `T${t}, Bull`;
  }
  // Three darts
  for (let t = 20; t >= 1; t--) {
    for (let s = 1; s <= 20; s++) {
      const after = remaining - t * 3 - s;
      if (after > 0 && after <= 40 && after % 2 === 0) return `T${t}, S${s}, D${after / 2}`;
      if (after === 50) return `T${t}, S${s}, Bull`;
    }
  }
  return "";
}

// Audio helpers
function playThrow() {
  try {
    const ac = new AudioContext();
    const dur = 0.15;
    const noise = ac.createBufferSource();
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2000;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.15, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    noise.connect(hp).connect(gain).connect(ac.destination);
    noise.start();
    noise.stop(ac.currentTime + dur);
    setTimeout(() => ac.close(), 300);
  } catch {}
}

function playThud() {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.08);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.1);
    setTimeout(() => ac.close(), 300);
  } catch {}
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  // Black background circle
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUTER_DOUBLE + 20, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();

  // Draw sectors
  for (let i = 0; i < 20; i++) {
    const startAngle = -Math.PI / 2 - SECTOR_ANGLE / 2 + i * SECTOR_ANGLE;
    const endAngle = startAngle + SECTOR_ANGLE;
    const isEven = i % 2 === 0;

    // Outer double ring
    ctx.beginPath();
    ctx.arc(CX, CY, R_OUTER_DOUBLE, startAngle, endAngle);
    ctx.arc(CX, CY, R_DOUBLE, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isEven ? COL_RED : COL_GREEN;
    ctx.fill();

    // Outer single
    ctx.beginPath();
    ctx.arc(CX, CY, R_DOUBLE, startAngle, endAngle);
    ctx.arc(CX, CY, R_OUTER_TRIPLE, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isEven ? COL_WHITE : COL_BLACK;
    ctx.fill();

    // Triple ring
    ctx.beginPath();
    ctx.arc(CX, CY, R_OUTER_TRIPLE, startAngle, endAngle);
    ctx.arc(CX, CY, R_TRIPLE, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isEven ? COL_RED : COL_GREEN;
    ctx.fill();

    // Inner single
    ctx.beginPath();
    ctx.arc(CX, CY, R_TRIPLE, startAngle, endAngle);
    ctx.arc(CX, CY, R_OUTER_BULL, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = isEven ? COL_WHITE : COL_BLACK;
    ctx.fill();
  }

  // Wire lines (sector dividers)
  ctx.strokeStyle = COL_WIRE;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 - SECTOR_ANGLE / 2 + i * SECTOR_ANGLE;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * R_OUTER_BULL, CY + Math.sin(a) * R_OUTER_BULL);
    ctx.lineTo(CX + Math.cos(a) * R_OUTER_DOUBLE, CY + Math.sin(a) * R_OUTER_DOUBLE);
    ctx.stroke();
  }

  // Wire rings
  for (const r of [R_OUTER_BULL, R_TRIPLE, R_OUTER_TRIPLE, R_DOUBLE, R_OUTER_DOUBLE]) {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = COL_WIRE;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Outer bull (green)
  ctx.beginPath();
  ctx.arc(CX, CY, R_OUTER_BULL, 0, Math.PI * 2);
  ctx.fillStyle = COL_BULL_GREEN;
  ctx.fill();
  ctx.strokeStyle = COL_WIRE;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Inner bull (red)
  ctx.beginPath();
  ctx.arc(CX, CY, R_BULL, 0, Math.PI * 2);
  ctx.fillStyle = COL_BULL_RED;
  ctx.fill();
  ctx.strokeStyle = COL_WIRE;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Numbers
  ctx.fillStyle = "#ccc";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + i * SECTOR_ANGLE;
    ctx.fillText(
      String(SECTORS[i]),
      CX + Math.cos(a) * R_NUMBER,
      CY + Math.sin(a) * R_NUMBER
    );
  }
}

function drawDarts(ctx: CanvasRenderingContext2D, darts: DartMarker[]) {
  for (const d of darts) {
    // Shadow
    ctx.beginPath();
    ctx.arc(d.x + 1, d.y + 1, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fill();
    // Dart body
    ctx.beginPath();
    ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd700";
    ctx.fill();
    ctx.strokeStyle = "#aa8800";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Center dot
    ctx.beginPath();
    ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();
  }
}

function drawAimIndicator(ctx: CanvasRenderingContext2D, mx: number, my: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,100,0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(mx, my, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx - 8, my);
  ctx.lineTo(mx + 8, my);
  ctx.moveTo(mx, my - 8);
  ctx.lineTo(mx, my + 8);
  ctx.stroke();
  ctx.restore();
}

export default function Darts() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: CX, y: CY });
  const animRef = useRef(0);

  const [playerScore, setPlayerScore] = useState(301);
  const [botScore, setBotScore] = useState(301);
  const [round, setRound] = useState(1);
  const [dartsLeft, setDartsLeft] = useState(3);
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [message, setMessage] = useState("Your throw! Click the board.");
  const [playerDarts, setPlayerDarts] = useState<DartMarker[]>([]);
  const [botDarts, setBotDarts] = useState<DartMarker[]>([]);
  const [winner, setWinner] = useState<"player" | "bot" | null>(null);
  const [turnScoresBefore, setTurnScoresBefore] = useState(301);
  const [botThinking, setBotThinking] = useState(false);

  const resetGame = useCallback(() => {
    setPlayerScore(301);
    setBotScore(301);
    setRound(1);
    setDartsLeft(3);
    setTurn("player");
    setMessage("Your throw! Click the board.");
    setPlayerDarts([]);
    setBotDarts([]);
    setWinner(null);
    setTurnScoresBefore(301);
    setBotThinking(false);
  }, []);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const render = () => {
      ctx.clearRect(0, 0, 400, 400);
      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, 400, 400);

      drawBoard(ctx);
      drawDarts(ctx, botDarts);
      drawDarts(ctx, playerDarts);

      if (turn === "player" && !winner) {
        drawAimIndicator(ctx, mouseRef.current.x, mouseRef.current.y);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [playerDarts, botDarts, turn, winner]);

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMove);
    return () => canvas.removeEventListener("mousemove", onMove);
  }, []);

  // Bot turn logic
  const doBotTurn = useCallback(
    (currentBotScore: number) => {
      setBotThinking(true);
      let remaining = currentBotScore;
      const newBotDarts: DartMarker[] = [];
      let bust = false;
      let dartIdx = 0;

      const throwNext = () => {
        if (dartIdx >= 3 || bust || remaining === 0) {
          setBotThinking(false);
          if (bust) {
            setBotScore(currentBotScore);
            setMessage(`Bot busts! Score stays at ${currentBotScore}.`);
            setBotDarts(newBotDarts);
          } else if (remaining === 0) {
            setBotScore(0);
            setWinner("bot");
            setMessage("Bot wins the game!");
            setBotDarts(newBotDarts);
            return;
          }
          setBotDarts(newBotDarts);
          setTurn("player");
          setDartsLeft(3);
          setTurnScoresBefore(playerScore);
          setRound((r) => r + 1);
          if (!bust && remaining > 0) {
            setMessage(`Bot finishes with ${remaining}. Your turn!`);
          }
          return;
        }

        // Bot aiming logic
        let targetX = CX;
        let targetY = CY;
        const spread = remaining > 100 ? 40 : remaining > 50 ? 30 : 20;

        // Aim for specific targets
        if (remaining <= 40 && remaining % 2 === 0) {
          // Aim for the double
          const doubleVal = remaining / 2;
          const sIdx = SECTORS.indexOf(doubleVal);
          if (sIdx >= 0) {
            const a = -Math.PI / 2 + sIdx * SECTOR_ANGLE;
            const r = (R_DOUBLE + R_OUTER_DOUBLE) / 2;
            targetX = CX + Math.cos(a) * r;
            targetY = CY + Math.sin(a) * r;
          }
        } else if (remaining === 50) {
          targetX = CX;
          targetY = CY;
        } else if (remaining <= 60) {
          // Aim for single to leave a double
          const want = remaining % 2 === 0 ? remaining : remaining - 1;
          for (let s = 1; s <= 20; s++) {
            if (want - s > 0 && (want - s) <= 40 && (want - s) % 2 === 0) {
              const sIdx = SECTORS.indexOf(s);
              if (sIdx >= 0) {
                const a = -Math.PI / 2 + sIdx * SECTOR_ANGLE;
                const r = (R_OUTER_BULL + R_TRIPLE) / 2;
                targetX = CX + Math.cos(a) * r;
                targetY = CY + Math.sin(a) * r;
              }
              break;
            }
          }
        } else {
          // Aim for T20
          const a = -Math.PI / 2;
          const r = (R_TRIPLE + R_OUTER_TRIPLE) / 2;
          targetX = CX + Math.cos(a) * r;
          targetY = CY + Math.sin(a) * r;
        }

        const hitX = targetX + (Math.random() - 0.5) * spread;
        const hitY = targetY + (Math.random() - 0.5) * spread;
        const hit = getHit(hitX, hitY);

        playThrow();
        setTimeout(() => {
          playThud();
          const newRemaining = remaining - hit.score;

          if (newRemaining < 0 || newRemaining === 1 || (newRemaining === 0 && !hit.isDouble && !hit.isBull)) {
            bust = true;
            newBotDarts.push({ x: hitX, y: hitY, label: hit.label, score: hit.score, multiplier: hit.multiplier });
            setMessage(`Bot throws ${hit.label} - Bust!`);
            setBotDarts([...newBotDarts]);
            setTimeout(() => {
              dartIdx = 3;
              throwNext();
            }, 500);
            return;
          }

          remaining = newRemaining;
          newBotDarts.push({ x: hitX, y: hitY, label: hit.label, score: hit.score, multiplier: hit.multiplier });
          setBotScore(remaining);
          setBotDarts([...newBotDarts]);
          setMessage(`Bot throws ${hit.label}. Bot: ${remaining}`);
          dartIdx++;
          setTimeout(throwNext, 700);
        }, 150);
      };

      setTimeout(throwNext, 600);
    },
    [playerScore]
  );

  // Handle player click
  const handleClick = useCallback(() => {
    if (turn !== "player" || winner || botThinking) return;

    const wobble = 12;
    const hitX = mouseRef.current.x + (Math.random() - 0.5) * wobble;
    const hitY = mouseRef.current.y + (Math.random() - 0.5) * wobble;
    const hit = getHit(hitX, hitY);

    playThrow();
    setTimeout(() => playThud(), 100);

    const newRemaining = playerScore - hit.score;

    // Bust check
    if (newRemaining < 0 || newRemaining === 1 || (newRemaining === 0 && !hit.isDouble && !hit.isBull)) {
      setPlayerScore(turnScoresBefore);
      setMessage(`${hit.label} - Bust! Score resets to ${turnScoresBefore}.`);
      setPlayerDarts((prev) => [...prev, { x: hitX, y: hitY, label: hit.label, score: hit.score, multiplier: hit.multiplier }]);
      setDartsLeft(0);
      // Go to bot turn
      setTimeout(() => {
        setPlayerDarts([]);
        doBotTurn(botScore);
      }, 1200);
      return;
    }

    // Win check
    if (newRemaining === 0) {
      setPlayerScore(0);
      setWinner("player");
      setMessage("You win! Congratulations!");
      setPlayerDarts((prev) => [...prev, { x: hitX, y: hitY, label: hit.label, score: hit.score, multiplier: hit.multiplier }]);
      return;
    }

    setPlayerScore(newRemaining);
    const remaining = dartsLeft - 1;
    setDartsLeft(remaining);
    setPlayerDarts((prev) => [...prev, { x: hitX, y: hitY, label: hit.label, score: hit.score, multiplier: hit.multiplier }]);
    setMessage(`${hit.label}. Remaining: ${newRemaining}. Darts left: ${remaining}`);

    if (remaining === 0) {
      setTimeout(() => {
        setPlayerDarts([]);
        doBotTurn(botScore);
      }, 800);
    }
  }, [turn, winner, botThinking, playerScore, dartsLeft, botScore, turnScoresBefore, doBotTurn]);

  const checkout = turn === "player" && !winner ? getCheckout(playerScore) : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 20,
        background: "#0d0d0d",
        borderRadius: 12,
        minHeight: 600,
        fontFamily: "Arial, sans-serif",
        color: "#ccc",
        gap: 8,
      }}
    >
      {/* Header scores */}
      <div style={{ display: "flex", gap: 32, marginBottom: 4 }}>
        <div
          style={{
            textAlign: "center",
            padding: "8px 20px",
            borderRadius: 8,
            background: turn === "player" && !winner ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.03)",
            border: turn === "player" && !winner ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>You</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#3b82f6" }}>{playerScore}</div>
        </div>
        <div style={{ textAlign: "center", padding: "8px 12px" }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>Round</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#888" }}>{round}</div>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "8px 20px",
            borderRadius: 8,
            background: turn === "bot" && !winner ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
            border: turn === "bot" && !winner ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Bot</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>{botScore}</div>
        </div>
      </div>

      {/* Darts left indicator */}
      {turn === "player" && !winner && (
        <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i < dartsLeft ? "#ffd700" : "#333",
                transition: "background 0.2s",
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: "#666", marginLeft: 4 }}>
            {dartsLeft} dart{dartsLeft !== 1 ? "s" : ""} left
          </span>
        </div>
      )}

      {/* Checkout suggestion */}
      {checkout && (
        <div style={{ fontSize: 12, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "3px 12px", borderRadius: 6 }}>
          Checkout: {checkout}
        </div>
      )}

      {/* Message */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: winner === "player" ? "#22c55e" : winner === "bot" ? "#ef4444" : "#e2e8f0",
          minHeight: 22,
          textAlign: "center",
        }}
      >
        {message}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onClick={handleClick}
        style={{
          cursor: turn === "player" && !winner ? "crosshair" : "default",
          borderRadius: 8,
          border: "1px solid #222",
        }}
      />

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          onClick={resetGame}
          style={{
            padding: "8px 24px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          New Game
        </button>
      </div>

      {/* Rules hint */}
      <div style={{ fontSize: 10, color: "#555", textAlign: "center", maxWidth: 350, lineHeight: 1.4, marginTop: 4 }}>
        301: Subtract your score from 301. Must finish on a double or bull (50). Going below 0 or to 1 is a bust.
      </div>
    </div>
  );
}
