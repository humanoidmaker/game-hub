"use client";
import { useState, useRef, useEffect, useCallback } from "react";

/* ─── constants ─── */
const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,
  5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const SEGMENT = (2 * Math.PI) / 37;
const BET_AMOUNTS = [10, 25, 50, 100] as const;
const INITIAL_CHIPS = 1000;

/* payout map */
const PAYOUTS: Record<string, number> = {
  straight: 35, split: 17, street: 11, corner: 8, sixline: 5,
  dozen: 2, column: 2, half: 1, color: 1, parity: 1,
};

type BetSpot = {
  label: string;
  numbers: number[];
  type: string;
};

/* ─── sound helpers (Web Audio) ─── */
function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12) {
  try {
    const ac = new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {}
}

function soundSpin() {
  let i = 0;
  const iv = setInterval(() => {
    playTone(300 + Math.random() * 200, 0.05, "triangle", 0.06);
    i++;
    if (i > 30) clearInterval(iv);
  }, 80);
  return iv;
}

function soundBounce() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => playTone(800 - i * 100, 0.06, "sine", 0.1), i * 90);
  }
}

function soundWin() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.25, "sine", 0.15), i * 120)
  );
}

function soundLose() {
  playTone(200, 0.4, "sawtooth", 0.08);
}

/* ─── color helpers ─── */
function numColor(n: number): string {
  if (n === 0) return "#0a8a3e";
  return REDS.has(n) ? "#c0272d" : "#1a1a1a";
}

function numTextColor(): string {
  return "#fff";
}

/* ─── draw wheel on canvas ─── */
function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  rotation: number,
  ballAngle: number | null,
  showBall: boolean
) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 6;
  const innerR = R * 0.7;
  const textR = R * 0.85;

  ctx.clearRect(0, 0, size, size);

  /* outer ring */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 4, 0, Math.PI * 2);
  ctx.fillStyle = "#3e2c1a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#c8a44e";
  ctx.lineWidth = 2;
  ctx.stroke();

  /* segments */
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  for (let i = 0; i < 37; i++) {
    const a0 = i * SEGMENT - Math.PI / 2;
    const a1 = a0 + SEGMENT;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = numColor(WHEEL_ORDER[i]);
    ctx.fill();
    ctx.strokeStyle = "#c8a44e";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    /* number text */
    const mid = a0 + SEGMENT / 2;
    ctx.save();
    ctx.rotate(mid);
    ctx.translate(textR, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = numTextColor();
    ctx.font = `bold ${Math.round(size / 32)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(WHEEL_ORDER[i]), 0, 0);
    ctx.restore();
  }

  /* inner circle */
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#1a3d1a";
  ctx.fill();
  ctx.strokeStyle = "#c8a44e";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* inner decoration */
  ctx.beginPath();
  ctx.arc(0, 0, innerR * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "#2d5a2d";
  ctx.fill();
  ctx.strokeStyle = "#c8a44e";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  /* ball */
  if (showBall && ballAngle !== null) {
    const ballR = R * 0.78;
    const bx = cx + ballR * Math.cos(ballAngle);
    const by = cy + ballR * Math.sin(ballAngle);
    ctx.beginPath();
    ctx.arc(bx, by, size / 50, 0, Math.PI * 2);
    ctx.fillStyle = "#eee";
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.stroke();
    /* shine */
    ctx.beginPath();
    ctx.arc(bx - 1, by - 1, size / 120, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  /* pointer at top */
  ctx.beginPath();
  ctx.moveTo(cx, 8);
  ctx.lineTo(cx - 8, 0);
  ctx.lineTo(cx + 8, 0);
  ctx.closePath();
  ctx.fillStyle = "#c8a44e";
  ctx.fill();
}

/* ─── build betting spots ─── */
function buildBettingTable(): BetSpot[][] {
  const rows: BetSpot[][] = [];

  /* row 0: 0 */
  rows.push([{ label: "0", numbers: [0], type: "straight" }]);

  /* rows 1-12: numbers 1-36 in grid (3 cols x 12 rows) */
  for (let r = 0; r < 12; r++) {
    const base = r * 3 + 1;
    rows.push([
      { label: String(base + 2), numbers: [base + 2], type: "straight" },
      { label: String(base + 1), numbers: [base + 1], type: "straight" },
      { label: String(base), numbers: [base], type: "straight" },
    ]);
  }

  return rows;
}

const NUMBER_GRID = buildBettingTable();

/* outside bets */
const OUTSIDE_BETS: BetSpot[] = [
  { label: "1st 12", numbers: Array.from({ length: 12 }, (_, i) => i + 1), type: "dozen" },
  { label: "2nd 12", numbers: Array.from({ length: 12 }, (_, i) => i + 13), type: "dozen" },
  { label: "3rd 12", numbers: Array.from({ length: 12 }, (_, i) => i + 25), type: "dozen" },
  { label: "1-18", numbers: Array.from({ length: 18 }, (_, i) => i + 1), type: "half" },
  { label: "EVEN", numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => n % 2 === 0), type: "parity" },
  { label: "RED", numbers: [...REDS], type: "color" },
  { label: "BLACK", numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !REDS.has(n)), type: "color" },
  { label: "ODD", numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter(n => n % 2 === 1), type: "parity" },
  { label: "19-36", numbers: Array.from({ length: 18 }, (_, i) => i + 19), type: "half" },
];

const COLUMN_BETS: BetSpot[] = [
  { label: "2:1", numbers: Array.from({ length: 12 }, (_, i) => i * 3 + 3), type: "column" },
  { label: "2:1", numbers: Array.from({ length: 12 }, (_, i) => i * 3 + 2), type: "column" },
  { label: "2:1", numbers: Array.from({ length: 12 }, (_, i) => i * 3 + 1), type: "column" },
];

type PlacedBet = { spot: BetSpot; amount: number };
type HistoryEntry = { number: number; color: string };

/* ═════════════════════════════════ COMPONENT ═════════════════════════════════ */
export default function Roulette() {
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [winAmount, setWinAmount] = useState(0);

  /* canvas / animation refs */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRotation = useRef(0);
  const ballAngle = useRef<number | null>(null);
  const showBall = useRef(false);
  const animFrame = useRef(0);
  const spinSoundRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const CANVAS_SIZE = 340;

  /* static wheel draw */
  const drawStatic = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawWheel(ctx, CANVAS_SIZE, wheelRotation.current, ballAngle.current, showBall.current);
  }, []);

  useEffect(() => {
    drawStatic();
  }, [drawStatic]);

  /* total bet */
  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  /* place a bet */
  const placeBet = (spot: BetSpot) => {
    if (spinning) return;
    if (chips < selectedAmount) {
      setMessage("Not enough chips!");
      return;
    }
    setChips(c => c - selectedAmount);
    setBets(prev => {
      const idx = prev.findIndex(b => b.spot.label === spot.label && b.spot.type === spot.type);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], amount: copy[idx].amount + selectedAmount };
        return copy;
      }
      return [...prev, { spot, amount: selectedAmount }];
    });
    setMessage("");
    playTone(600, 0.05, "sine", 0.08);
  };

  /* clear bets */
  const clearBets = () => {
    if (spinning) return;
    const refund = bets.reduce((s, b) => s + b.amount, 0);
    setChips(c => c + refund);
    setBets([]);
    setMessage("");
  };

  /* spin */
  const spin = () => {
    if (spinning || bets.length === 0) return;

    setSpinning(true);
    setMessage("");
    setResult(null);
    setWinAmount(0);

    /* pick winning number */
    const winIndex = Math.floor(Math.random() * 37);
    const winNumber = WHEEL_ORDER[winIndex];

    /* target angle: spin several full rotations + land on winning segment */
    const targetSegmentAngle = winIndex * SEGMENT + SEGMENT / 2;
    /* ball goes opposite direction, pointer is at top (-PI/2) */
    const fullRotations = (4 + Math.random() * 3) * Math.PI * 2;
    const targetWheelRotation = wheelRotation.current + fullRotations;

    /* ball spins opposite */
    const ballStart = Math.random() * Math.PI * 2;
    const ballFullRotations = (6 + Math.random() * 4) * Math.PI * 2;
    /* ball final position: needs to align with winning segment considering wheel rotation */
    const ballFinal = -(targetWheelRotation) - targetSegmentAngle + (-Math.PI / 2);

    const duration = 4000;
    const startTime = performance.now();
    const startRotation = wheelRotation.current;

    showBall.current = true;
    spinSoundRef.current = soundSpin();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      let t = Math.min(elapsed / duration, 1);
      /* ease out cubic */
      t = 1 - Math.pow(1 - t, 3);

      wheelRotation.current = startRotation + (targetWheelRotation - startRotation) * t;
      ballAngle.current = ballStart + (ballFinal - ballStart) * t;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawWheel(ctx, CANVAS_SIZE, wheelRotation.current, ballAngle.current, showBall.current);

      if (elapsed < duration) {
        animFrame.current = requestAnimationFrame(animate);
      } else {
        /* done */
        if (spinSoundRef.current) clearInterval(spinSoundRef.current);
        soundBounce();

        /* normalize rotation */
        wheelRotation.current = wheelRotation.current % (Math.PI * 2);

        /* calculate winnings */
        let totalWin = 0;
        for (const b of bets) {
          if (b.spot.numbers.includes(winNumber)) {
            const payout = PAYOUTS[b.spot.type] ?? 0;
            totalWin += b.amount + b.amount * payout;
          }
        }

        const color = winNumber === 0 ? "green" : REDS.has(winNumber) ? "red" : "black";

        setTimeout(() => {
          setResult(winNumber);
          setSpinning(false);
          setWinAmount(totalWin);
          setBets([]);

          if (totalWin > 0) {
            setChips(c => c + totalWin);
            setMessage(`Ball lands on ${winNumber}! You win ${totalWin} chips!`);
            soundWin();
          } else {
            setMessage(`Ball lands on ${winNumber}. You lose ${totalBet} chips.`);
            soundLose();
          }

          setHistory(prev => [{ number: winNumber, color }, ...prev].slice(0, 10));
        }, 300);
      }
    };

    animFrame.current = requestAnimationFrame(animate);
  };

  /* cleanup */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrame.current);
      if (spinSoundRef.current) clearInterval(spinSoundRef.current);
    };
  }, []);

  /* get bet amount on a spot */
  const getBetOn = (label: string, type: string) => {
    const b = bets.find(b => b.spot.label === label && b.spot.type === type);
    return b ? b.amount : 0;
  };

  /* ─── styles ─── */
  const S = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0c2e0c 0%, #143a14 50%, #0a250a 100%)",
      color: "#fff",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      padding: "20px 10px",
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 800,
      color: "#c8a44e",
      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
      margin: 0,
      letterSpacing: 2,
    },
    chipDisplay: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(0,0,0,0.4)",
      borderRadius: 12,
      padding: "8px 20px",
      border: "1px solid #c8a44e44",
    },
    chipCount: {
      fontSize: 22,
      fontWeight: 700,
      color: "#c8a44e",
    },
    chipLabel: {
      fontSize: 13,
      color: "#a89060",
      textTransform: "uppercase" as const,
      letterSpacing: 1,
    },
    canvas: {
      borderRadius: "50%",
      boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 0 80px rgba(200,164,78,0.15)",
    },
    betAmountRow: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      flexWrap: "wrap" as const,
    },
    betAmountBtn: (active: boolean) => ({
      width: 56,
      height: 56,
      borderRadius: "50%",
      border: active ? "3px solid #c8a44e" : "2px solid #555",
      background: active
        ? "radial-gradient(circle, #5a3d1a 0%, #3a2510 100%)"
        : "radial-gradient(circle, #333 0%, #1a1a1a 100%)",
      color: active ? "#c8a44e" : "#888",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: active ? "0 0 12px rgba(200,164,78,0.4)" : "none",
      transition: "all 0.15s",
    }),
    tableContainer: {
      background: "rgba(0,0,0,0.3)",
      borderRadius: 12,
      padding: 12,
      border: "1px solid #2a5a2a",
      maxWidth: 480,
      width: "100%",
    },
    numberBtn: (n: number, hasBet: boolean) => ({
      width: 38,
      height: 34,
      border: hasBet ? "2px solid #c8a44e" : "1px solid #444",
      borderRadius: 4,
      background: numColor(n),
      color: "#fff",
      fontSize: 13,
      fontWeight: hasBet ? 800 : 600,
      cursor: "pointer",
      position: "relative" as const,
      boxShadow: hasBet ? "0 0 8px rgba(200,164,78,0.5)" : "none",
      transition: "all 0.1s",
    }),
    outsideBtn: (hasBet: boolean, special?: string) => ({
      flex: 1,
      minWidth: 50,
      height: 34,
      border: hasBet ? "2px solid #c8a44e" : "1px solid #444",
      borderRadius: 4,
      background: special === "red" ? "#c0272d" : special === "black" ? "#1a1a1a" : "#1a3d1a",
      color: "#fff",
      fontSize: 11,
      fontWeight: hasBet ? 800 : 600,
      cursor: "pointer",
      boxShadow: hasBet ? "0 0 8px rgba(200,164,78,0.5)" : "none",
      transition: "all 0.1s",
    }),
    actionRow: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
    },
    spinBtn: {
      padding: "12px 48px",
      borderRadius: 30,
      border: "2px solid #c8a44e",
      background: "linear-gradient(135deg, #1a5a1a 0%, #0d3d0d 100%)",
      color: "#c8a44e",
      fontSize: 18,
      fontWeight: 800,
      cursor: "pointer",
      letterSpacing: 2,
      textTransform: "uppercase" as const,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      transition: "all 0.2s",
    },
    clearBtn: {
      padding: "12px 24px",
      borderRadius: 30,
      border: "1px solid #666",
      background: "rgba(0,0,0,0.4)",
      color: "#aaa",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    },
    message: (isWin: boolean) => ({
      fontSize: 16,
      fontWeight: 700,
      color: isWin ? "#4ade80" : "#f87171",
      textAlign: "center" as const,
      minHeight: 24,
    }),
    historyRow: {
      display: "flex",
      gap: 6,
      justifyContent: "center",
      flexWrap: "wrap" as const,
    },
    historyItem: (color: string) => ({
      width: 32,
      height: 32,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      color: "#fff",
      background: color === "green" ? "#0a8a3e" : color === "red" ? "#c0272d" : "#1a1a1a",
      border: "2px solid #c8a44e55",
    }),
    sectionLabel: {
      fontSize: 11,
      color: "#6a8a6a",
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: 4,
      textAlign: "center" as const,
    },
    betBadge: {
      position: "absolute" as const,
      top: -6,
      right: -6,
      background: "#c8a44e",
      color: "#000",
      fontSize: 9,
      fontWeight: 800,
      borderRadius: 10,
      padding: "1px 4px",
      minWidth: 16,
      textAlign: "center" as const,
    },
  };

  return (
    <div style={S.container}>
      {/* title */}
      <h1 style={S.title}>ROULETTE</h1>

      {/* chip display */}
      <div style={S.chipDisplay}>
        <span style={S.chipLabel}>Chips</span>
        <span style={S.chipCount}>{chips.toLocaleString()}</span>
        {totalBet > 0 && (
          <span style={{ fontSize: 13, color: "#f59e0b" }}>(Bet: {totalBet})</span>
        )}
      </div>

      {/* canvas wheel */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={S.canvas}
      />

      {/* message */}
      {message && <div style={S.message(winAmount > 0)}>{message}</div>}

      {/* bet amount selector */}
      <div>
        <div style={S.sectionLabel}>Select Chip</div>
        <div style={S.betAmountRow}>
          {BET_AMOUNTS.map(a => (
            <button
              key={a}
              style={S.betAmountBtn(selectedAmount === a)}
              onClick={() => setSelectedAmount(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* betting table */}
      <div style={S.tableContainer}>
        <div style={S.sectionLabel}>Betting Table — Click to Place Chips</div>

        {/* zero */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <button
            style={{ ...S.numberBtn(0, getBetOn("0", "straight") > 0), width: "100%", maxWidth: 120, height: 36 }}
            onClick={() => placeBet(NUMBER_GRID[0][0])}
          >
            0
            {getBetOn("0", "straight") > 0 && <span style={S.betBadge}>{getBetOn("0", "straight")}</span>}
          </button>
        </div>

        {/* number grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
          {NUMBER_GRID.slice(1).map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: 2, justifyContent: "center" }}>
              {row.map(spot => {
                const amt = getBetOn(spot.label, spot.type);
                return (
                  <button
                    key={spot.label}
                    style={S.numberBtn(spot.numbers[0], amt > 0)}
                    onClick={() => placeBet(spot)}
                  >
                    {spot.label}
                    {amt > 0 && <span style={S.betBadge}>{amt}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* column bets */}
        <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 6 }}>
          {COLUMN_BETS.map((spot, i) => {
            const amt = getBetOn(spot.label + i, spot.type);
            return (
              <button
                key={i}
                style={S.outsideBtn(amt > 0)}
                onClick={() => placeBet({ ...spot, label: spot.label + i })}
              >
                Col {i + 1} (2:1)
                {amt > 0 && <span style={{ ...S.betBadge, position: "relative" as const, top: 0, right: 0, marginLeft: 4 }}>{amt}</span>}
              </button>
            );
          })}
        </div>

        {/* dozens */}
        <div style={{ display: "flex", gap: 2, justifyContent: "center", marginBottom: 4 }}>
          {OUTSIDE_BETS.slice(0, 3).map((spot, i) => {
            const amt = getBetOn(spot.label, spot.type);
            return (
              <button key={i} style={S.outsideBtn(amt > 0)} onClick={() => placeBet(spot)}>
                {spot.label}
                {amt > 0 && <span style={{ ...S.betBadge, position: "relative" as const, top: 0, right: 0, marginLeft: 4 }}>{amt}</span>}
              </button>
            );
          })}
        </div>

        {/* even-money bets */}
        <div style={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          {OUTSIDE_BETS.slice(3).map((spot, i) => {
            const amt = getBetOn(spot.label, spot.type);
            const special = spot.label === "RED" ? "red" : spot.label === "BLACK" ? "black" : undefined;
            return (
              <button key={i} style={S.outsideBtn(amt > 0, special)} onClick={() => placeBet(spot)}>
                {spot.label}
                {amt > 0 && <span style={{ ...S.betBadge, position: "relative" as const, top: 0, right: 0, marginLeft: 4 }}>{amt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* action buttons */}
      <div style={S.actionRow}>
        <button
          style={{
            ...S.clearBtn,
            opacity: spinning || bets.length === 0 ? 0.4 : 1,
            cursor: spinning || bets.length === 0 ? "default" : "pointer",
          }}
          onClick={clearBets}
          disabled={spinning || bets.length === 0}
        >
          Clear Bets
        </button>
        <button
          style={{
            ...S.spinBtn,
            opacity: spinning || bets.length === 0 ? 0.4 : 1,
            cursor: spinning || bets.length === 0 ? "default" : "pointer",
          }}
          onClick={spin}
          disabled={spinning || bets.length === 0}
        >
          {spinning ? "Spinning..." : "SPIN"}
        </button>
      </div>

      {/* last result */}
      {result !== null && (
        <div style={{ textAlign: "center" }}>
          <div style={S.sectionLabel}>Last Result</div>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: numColor(result),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 800,
              color: "#fff",
              border: "3px solid #c8a44e",
              margin: "0 auto",
              boxShadow: "0 0 20px rgba(200,164,78,0.3)",
            }}
          >
            {result}
          </div>
        </div>
      )}

      {/* history */}
      {history.length > 0 && (
        <div>
          <div style={S.sectionLabel}>History (Last 10)</div>
          <div style={S.historyRow}>
            {history.map((h, i) => (
              <div key={i} style={S.historyItem(h.color)}>
                {h.number}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* payout info */}
      <div style={{ maxWidth: 400, width: "100%", background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 16px" }}>
        <div style={S.sectionLabel}>Payouts</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", fontSize: 12, color: "#8a9a8a" }}>
          <span>Straight (1 number)</span><span style={{ textAlign: "right", color: "#c8a44e" }}>35:1</span>
          <span>Dozen / Column</span><span style={{ textAlign: "right", color: "#c8a44e" }}>2:1</span>
          <span>Red / Black</span><span style={{ textAlign: "right", color: "#c8a44e" }}>1:1</span>
          <span>Odd / Even</span><span style={{ textAlign: "right", color: "#c8a44e" }}>1:1</span>
          <span>1-18 / 19-36</span><span style={{ textAlign: "right", color: "#c8a44e" }}>1:1</span>
        </div>
      </div>
    </div>
  );
}
