"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───
type Delivery = "straight" | "swingLeft" | "swingRight" | "bouncer";
type WicketType = "bowled" | "caught" | "runOut" | null;
type BallResult = {
  runs: number;
  wicket: boolean;
  wicketType: WicketType;
  label: string;
};

// ─── Constants ───
const W = 400;
const H = 400;
const PITCH_TOP = 40;
const PITCH_BOTTOM = 360;
const PITCH_CENTER_X = W / 2;
const HIT_ZONE_Y = 300;
const HIT_ZONE_TOLERANCE = 28;
const TOTAL_OVERS = 5;
const TOTAL_BALLS = TOTAL_OVERS * 6;
const TOTAL_WICKETS = 10;
const BALL_SPEED_MIN = 2.2;
const BALL_SPEED_MAX = 3.6;

// ─── Audio helpers ───
function playSound(type: "hit" | "cheer" | "wicket") {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "hit") {
      osc.type = "square";
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === "cheer") {
      osc.type = "sawtooth";
      osc.frequency.value = 600;
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = "sine";
      osc.frequency.value = 300;
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
}

// ─── Ball physics ───
function pickDelivery(): Delivery {
  const r = Math.random();
  if (r < 0.35) return "straight";
  if (r < 0.55) return "swingLeft";
  if (r < 0.75) return "swingRight";
  return "bouncer";
}

function pickSpeed(): number {
  return BALL_SPEED_MIN + Math.random() * (BALL_SPEED_MAX - BALL_SPEED_MIN);
}

// ─── Determine result based on timing ───
function determineResult(
  timingOffset: number,
  delivery: Delivery
): BallResult {
  const abs = Math.abs(timingOffset);

  // Perfect timing (within zone)
  if (abs <= HIT_ZONE_TOLERANCE) {
    const quality = 1 - abs / HIT_ZONE_TOLERANCE; // 0..1
    const r = Math.random();
    // Bouncer is harder to hit
    const bouncerPenalty = delivery === "bouncer" ? 0.2 : 0;

    if (quality > 0.7 && r > 0.3 + bouncerPenalty) {
      const isSix = r > 0.6;
      return {
        runs: isSix ? 6 : 4,
        wicket: false,
        wicketType: null,
        label: isSix ? "SIX! Over the boundary!" : "FOUR! Brilliant shot!",
      };
    }
    if (quality > 0.4) {
      const runs = Math.random() > 0.5 ? 2 : 3;
      return { runs, wicket: false, wicketType: null, label: `${runs} runs! Good timing.` };
    }
    const runs = Math.random() > 0.4 ? 1 : 0;
    return {
      runs,
      wicket: false,
      wicketType: null,
      label: runs === 0 ? "Dot ball. Defended." : "1 run. Quick single!",
    };
  }

  // Early swing — miss = bowled
  if (timingOffset < -HIT_ZONE_TOLERANCE) {
    if (Math.random() < 0.55) {
      return { runs: 0, wicket: true, wicketType: "bowled", label: "BOWLED! Played too early!" };
    }
    return { runs: 0, wicket: false, wicketType: null, label: "Played and missed!" };
  }

  // Late swing — caught or run out
  if (Math.random() < 0.45) {
    const isCaught = Math.random() > 0.35;
    return {
      runs: 0,
      wicket: true,
      wicketType: isCaught ? "caught" : "runOut",
      label: isCaught
        ? "CAUGHT! Edged it late!"
        : "RUN OUT! Risky running!",
    };
  }
  const runs = Math.random() > 0.6 ? 1 : 0;
  return {
    runs,
    wicket: false,
    wicketType: null,
    label: runs === 0 ? "Late shot, dot ball." : "1 run, lucky edge.",
  };
}

// ─── Main component ───
export default function Cricket() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // Game state
  const [totalRuns, setTotalRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [ballsPlayed, setBallsPlayed] = useState(0);
  const [lastResult, setLastResult] = useState<BallResult | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [inningsSummary, setInningsSummary] = useState<string[]>([]);

  // Ball animation state stored in refs for smooth canvas animation
  const ballState = useRef({
    active: false,
    y: PITCH_TOP,
    x: PITCH_CENTER_X,
    speed: 3,
    delivery: "straight" as Delivery,
    swingAmt: 0,
    bouncerPeak: false,
    hit: false,
    resultShown: false,
    // for hit animation
    hitAnimY: 0,
    hitAnimX: 0,
    hitAnimVx: 0,
    hitAnimVy: 0,
    hitAnimActive: false,
    // post delivery pause timer
    pauseTimer: 0,
  });

  const gameState = useRef({
    runs: 0,
    wickets: 0,
    balls: 0,
    over: false,
    ballLog: [] as string[],
  });

  // Reset everything
  const resetGame = useCallback(() => {
    setTotalRuns(0);
    setWickets(0);
    setBallsPlayed(0);
    setLastResult(null);
    setGameOver(false);
    setInningsSummary([]);
    gameState.current = { runs: 0, wickets: 0, balls: 0, over: false, ballLog: [] };
    ballState.current.active = false;
    ballState.current.hit = false;
    ballState.current.resultShown = false;
    ballState.current.hitAnimActive = false;
    ballState.current.pauseTimer = 0;
  }, []);

  // Bowl a new ball
  const bowlBall = useCallback(() => {
    const gs = gameState.current;
    if (gs.over || gs.wickets >= TOTAL_WICKETS || gs.balls >= TOTAL_BALLS) return;
    const delivery = pickDelivery();
    const speed = pickSpeed();
    const bs = ballState.current;
    bs.active = true;
    bs.y = PITCH_TOP;
    bs.x = PITCH_CENTER_X;
    bs.speed = speed;
    bs.delivery = delivery;
    bs.swingAmt = delivery === "swingLeft" ? -(1 + Math.random()) : delivery === "swingRight" ? (1 + Math.random()) : 0;
    bs.bouncerPeak = false;
    bs.hit = false;
    bs.resultShown = false;
    bs.hitAnimActive = false;
    bs.pauseTimer = 0;
    setLastResult(null);
  }, []);

  // Handle batting (click/tap)
  const handleBat = useCallback(() => {
    const bs = ballState.current;
    const gs = gameState.current;
    if (!bs.active || bs.hit || gs.over) return;

    const timingOffset = bs.y - HIT_ZONE_Y;
    const result = determineResult(timingOffset, bs.delivery);

    bs.hit = true;

    // If it's a hit (runs scored), animate ball flying
    if (!result.wicket && result.runs >= 4) {
      bs.hitAnimActive = true;
      bs.hitAnimX = bs.x;
      bs.hitAnimY = bs.y;
      bs.hitAnimVx = (Math.random() - 0.5) * 6;
      bs.hitAnimVy = -(6 + Math.random() * 4);
    }

    // Play sound
    if (result.wicket) {
      playSound("wicket");
    } else if (result.runs >= 4) {
      playSound("cheer");
    } else {
      playSound("hit");
    }

    // Update game state
    gs.runs += result.runs;
    gs.balls += 1;
    if (result.wicket) gs.wickets += 1;
    gs.ballLog.push(
      result.wicket ? "W" : result.runs === 0 ? "." : String(result.runs)
    );

    setTotalRuns(gs.runs);
    setWickets(gs.wickets);
    setBallsPlayed(gs.balls);
    setLastResult(result);

    // Check innings end
    if (gs.wickets >= TOTAL_WICKETS || gs.balls >= TOTAL_BALLS) {
      gs.over = true;
      const rr = gs.balls > 0 ? ((gs.runs / gs.balls) * 6).toFixed(2) : "0.00";
      setInningsSummary([
        `Final Score: ${gs.runs}/${gs.wickets}`,
        `Overs: ${Math.floor(gs.balls / 6)}.${gs.balls % 6} / ${TOTAL_OVERS}`,
        `Run Rate: ${rr}`,
        `Ball Log: ${gs.ballLog.join(" ")}`,
      ]);
      setGameOver(true);
    }

    // Pause before next delivery
    bs.pauseTimer = 90;
  }, []);

  // Handle missed ball (ball passes batter)
  const handleMiss = useCallback(() => {
    const bs = ballState.current;
    const gs = gameState.current;
    if (bs.hit || gs.over) return;

    // Ball went past — bowled or just a leave
    const isBowled = bs.delivery === "straight" && Math.abs(bs.x - PITCH_CENTER_X) < 20;
    const result: BallResult = isBowled
      ? { runs: 0, wicket: true, wicketType: "bowled", label: "BOWLED! Missed it completely!" }
      : { runs: 0, wicket: false, wicketType: null, label: "Left alone. Dot ball." };

    if (result.wicket) playSound("wicket");

    bs.hit = true;
    gs.runs += result.runs;
    gs.balls += 1;
    if (result.wicket) gs.wickets += 1;
    gs.ballLog.push(result.wicket ? "W" : ".");

    setTotalRuns(gs.runs);
    setWickets(gs.wickets);
    setBallsPlayed(gs.balls);
    setLastResult(result);

    if (gs.wickets >= TOTAL_WICKETS || gs.balls >= TOTAL_BALLS) {
      gs.over = true;
      const rr = gs.balls > 0 ? ((gs.runs / gs.balls) * 6).toFixed(2) : "0.00";
      setInningsSummary([
        `Final Score: ${gs.runs}/${gs.wickets}`,
        `Overs: ${Math.floor(gs.balls / 6)}.${gs.balls % 6} / ${TOTAL_OVERS}`,
        `Run Rate: ${rr}`,
        `Ball Log: ${gs.ballLog.join(" ")}`,
      ]);
      setGameOver(true);
    }

    bs.pauseTimer = 90;
  }, []);

  // ─── Canvas draw loop ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    function draw() {
      if (!running || !ctx) return;
      const bs = ballState.current;
      const gs = gameState.current;

      // Clear
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, W, H);

      // ─── Pitch ───
      // Pitch trapezoid (perspective)
      ctx.beginPath();
      ctx.moveTo(PITCH_CENTER_X - 30, PITCH_TOP);
      ctx.lineTo(PITCH_CENTER_X + 30, PITCH_TOP);
      ctx.lineTo(PITCH_CENTER_X + 70, PITCH_BOTTOM);
      ctx.lineTo(PITCH_CENTER_X - 70, PITCH_BOTTOM);
      ctx.closePath();
      ctx.fillStyle = "#2d5a1e";
      ctx.fill();

      // Crease lines
      ctx.strokeStyle = "#ffffff55";
      ctx.lineWidth = 1.5;
      // Bowling crease
      ctx.beginPath();
      ctx.moveTo(PITCH_CENTER_X - 32, PITCH_TOP + 20);
      ctx.lineTo(PITCH_CENTER_X + 32, PITCH_TOP + 20);
      ctx.stroke();
      // Batting crease
      ctx.beginPath();
      ctx.moveTo(PITCH_CENTER_X - 65, HIT_ZONE_Y + 20);
      ctx.lineTo(PITCH_CENTER_X + 65, HIT_ZONE_Y + 20);
      ctx.stroke();

      // Stumps at bowler's end
      for (let i = -4; i <= 4; i += 4) {
        ctx.fillStyle = "#ddd";
        ctx.fillRect(PITCH_CENTER_X + i - 1, PITCH_TOP + 8, 2, 14);
      }

      // Stumps at batter's end
      for (let i = -6; i <= 6; i += 6) {
        ctx.fillStyle = "#eee";
        ctx.fillRect(PITCH_CENTER_X + i - 1.5, PITCH_BOTTOM - 18, 3, 20);
      }
      // Bails
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(PITCH_CENTER_X - 8, PITCH_BOTTOM - 19, 16, 2);

      // ─── Hit zone indicator ───
      ctx.fillStyle = "#ffffff10";
      ctx.fillRect(PITCH_CENTER_X - 60, HIT_ZONE_Y - HIT_ZONE_TOLERANCE, 120, HIT_ZONE_TOLERANCE * 2);
      ctx.strokeStyle = "#ffffff22";
      ctx.strokeRect(PITCH_CENTER_X - 60, HIT_ZONE_Y - HIT_ZONE_TOLERANCE, 120, HIT_ZONE_TOLERANCE * 2);

      // Label
      ctx.fillStyle = "#ffffff44";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HIT ZONE", PITCH_CENTER_X, HIT_ZONE_Y + 4);

      // ─── Batter silhouette ───
      ctx.fillStyle = "#ffffffcc";
      // Body
      ctx.fillRect(PITCH_CENTER_X + 24, PITCH_BOTTOM - 50, 4, 30);
      // Head
      ctx.beginPath();
      ctx.arc(PITCH_CENTER_X + 26, PITCH_BOTTOM - 55, 6, 0, Math.PI * 2);
      ctx.fill();
      // Bat
      ctx.strokeStyle = "#d4a052";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(PITCH_CENTER_X + 20, PITCH_BOTTOM - 40);
      ctx.lineTo(PITCH_CENTER_X + 5, PITCH_BOTTOM - 55);
      ctx.stroke();

      // ─── Ball animation ───
      if (bs.active) {
        if (!bs.hit) {
          // Move ball down
          bs.y += bs.speed;

          // Apply swing
          if (bs.delivery === "swingLeft" || bs.delivery === "swingRight") {
            const progress = (bs.y - PITCH_TOP) / (PITCH_BOTTOM - PITCH_TOP);
            bs.x = PITCH_CENTER_X + bs.swingAmt * progress * 30;
          }
          // Bouncer effect
          if (bs.delivery === "bouncer") {
            const mid = (PITCH_TOP + PITCH_BOTTOM) / 2;
            if (bs.y > mid - 30 && bs.y < mid + 30 && !bs.bouncerPeak) {
              bs.speed = Math.max(bs.speed * 0.97, 1.5);
            }
            if (bs.y > mid + 30) {
              bs.bouncerPeak = true;
              bs.speed = Math.min(bs.speed * 1.02, 4.5);
            }
          }

          // Ball passed batter without hit
          if (bs.y > PITCH_BOTTOM + 10) {
            handleMiss();
          }
        }

        // Draw ball (if not hit-animated away)
        if (!bs.hitAnimActive || !bs.hit) {
          // Ball shadow
          const ballSize = 4 + ((bs.y - PITCH_TOP) / (PITCH_BOTTOM - PITCH_TOP)) * 4;
          if (!bs.hit) {
            ctx.fillStyle = "#00000066";
            ctx.beginPath();
            ctx.ellipse(bs.x + 2, bs.y + 2, ballSize, ballSize * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          // Ball
          ctx.fillStyle = bs.hit ? "#ff4444" : "#cc0000";
          ctx.beginPath();
          ctx.arc(bs.x, bs.y, ballSize, 0, Math.PI * 2);
          ctx.fill();
          // Seam
          ctx.strokeStyle = "#ffffff88";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(bs.x, bs.y, ballSize * 0.6, 0, Math.PI);
          ctx.stroke();
        }

        // Hit animation (ball flying to boundary)
        if (bs.hitAnimActive) {
          bs.hitAnimX += bs.hitAnimVx;
          bs.hitAnimY += bs.hitAnimVy;
          bs.hitAnimVy += 0.08; // slight gravity

          ctx.fillStyle = "#cc0000";
          ctx.beginPath();
          ctx.arc(bs.hitAnimX, bs.hitAnimY, 5, 0, Math.PI * 2);
          ctx.fill();

          // Trail
          ctx.strokeStyle = "#ff444466";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bs.x, bs.y);
          ctx.lineTo(bs.hitAnimX, bs.hitAnimY);
          ctx.stroke();

          if (bs.hitAnimY < -20 || bs.hitAnimX < -20 || bs.hitAnimX > W + 20) {
            bs.hitAnimActive = false;
          }
        }

        // Pause timer & auto-bowl next
        if (bs.hit) {
          bs.pauseTimer -= 1;
          if (bs.pauseTimer <= 0 && !gs.over) {
            bowlBall();
          }
        }
      }

      // ─── Delivery type indicator ───
      if (bs.active && !bs.hit) {
        ctx.fillStyle = "#ffffff66";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        const labels: Record<Delivery, string> = {
          straight: "Straight",
          swingLeft: "In-swing",
          swingRight: "Out-swing",
          bouncer: "Bouncer!",
        };
        ctx.fillText(labels[bs.delivery], 10, H - 10);
      }

      // ─── Outfield (decorative boundary ring) ───
      ctx.strokeStyle = "#ffffff15";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(PITCH_CENTER_X, H / 2, 190, 190, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Boundary rope
      ctx.strokeStyle = "#ffffff08";
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(PITCH_CENTER_X, H / 2, 195, 195, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [handleMiss, bowlBall]);

  // Start first ball on mount
  useEffect(() => {
    const t = setTimeout(() => bowlBall(), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Computed display values ───
  const overs = `${Math.floor(ballsPlayed / 6)}.${ballsPlayed % 6}`;
  const runRate = ballsPlayed > 0 ? ((totalRuns / ballsPlayed) * 6).toFixed(2) : "0.00";

  const resultColor =
    lastResult === null
      ? "#aaa"
      : lastResult.wicket
      ? "#ef4444"
      : lastResult.runs >= 4
      ? "#facc15"
      : lastResult.runs > 0
      ? "#4ade80"
      : "#888";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 8,
        userSelect: "none",
      }}
    >
      {/* Scoreboard */}
      <div
        style={{
          display: "flex",
          gap: 16,
          background: "#1a1a2e",
          borderRadius: 10,
          padding: "8px 18px",
          alignItems: "center",
          fontSize: 13,
          color: "#ccc",
          minWidth: 380,
          justifyContent: "space-between",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>
            {totalRuns}/{wickets}
          </div>
          <div style={{ fontSize: 10, color: "#888" }}>SCORE</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{overs}</div>
          <div style={{ fontSize: 10, color: "#888" }}>OVERS ({TOTAL_OVERS})</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            {ballsPlayed}/{TOTAL_BALLS}
          </div>
          <div style={{ fontSize: 10, color: "#888" }}>BALLS</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>{runRate}</div>
          <div style={{ fontSize: 10, color: "#888" }}>RUN RATE</div>
        </div>
      </div>

      {/* Result text */}
      <div
        style={{
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 15,
          color: resultColor,
          letterSpacing: 0.3,
        }}
      >
        {lastResult ? lastResult.label : "Click the pitch to bat!"}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleBat}
        onTouchStart={(e) => {
          e.preventDefault();
          handleBat();
        }}
        style={{
          borderRadius: 12,
          cursor: gameOver ? "default" : "pointer",
          border: "2px solid #333",
          background: "#111",
          touchAction: "none",
        }}
      />

      {/* Game over / innings summary */}
      {gameOver && (
        <div
          style={{
            background: "#1a1a2e",
            borderRadius: 10,
            padding: 16,
            textAlign: "center",
            minWidth: 320,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: "#facc15", marginBottom: 8 }}>
            Innings Over
          </div>
          {inningsSummary.map((line, i) => (
            <div key={i} style={{ color: "#ccc", fontSize: 13, marginBottom: 4 }}>
              {line}
            </div>
          ))}
          <button
            onClick={() => {
              resetGame();
              setTimeout(() => bowlBall(), 400);
            }}
            style={{
              marginTop: 12,
              padding: "10px 32px",
              borderRadius: 8,
              border: "none",
              background: "#10b981",
              color: "#000",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
