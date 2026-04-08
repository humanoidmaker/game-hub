"use client";
import { useState, useRef, useCallback, useEffect } from "react";

/* ───── constants ───── */
const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎"] as const;
type Symbol = (typeof SYMBOLS)[number];

const BET_OPTIONS = [10, 25, 50, 100] as const;
const STARTING_CREDITS = 1000;
const REEL_COUNT = 3;
const SPIN_DURATION_BASE = 1200; // ms – first reel
const SPIN_STAGGER = 400; // ms extra per reel

/* ───── audio via Web Audio API ───── */
const audioCtx = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(freq: number, duration: number, type: OscillatorType = "square", gain = 0.08) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(audioCtx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}

function soundReelSpin() {
  for (let i = 0; i < 6; i++) setTimeout(() => playTone(200 + i * 40, 0.06, "sawtooth", 0.04), i * 30);
}

function soundReelStop() {
  playTone(600, 0.08, "square", 0.1);
  setTimeout(() => playTone(400, 0.06, "square", 0.06), 40);
}

function soundWin() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15, "square", 0.09), i * 120));
}

function soundJackpot() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1318, 1568];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.2, "square", 0.1), i * 100));
  setTimeout(() => {
    [523, 784, 1047, 1568].forEach((f, i) => setTimeout(() => playTone(f, 0.3, "triangle", 0.12), i * 80));
  }, 900);
}

/* ───── helpers ───── */
function randomSymbol(): Symbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function generateReelStrip(): Symbol[] {
  // 30-symbol virtual strip
  return Array.from({ length: 30 }, () => randomSymbol());
}

function calculateWin(a: Symbol, b: Symbol, c: Symbol, bet: number): { payout: number; label: string; tier: "jackpot" | "small" | "cherry" | "none" } {
  if (a === b && b === c) {
    return { payout: bet * 50, label: `JACKPOT! ${a}${b}${c}`, tier: "jackpot" };
  }
  if (a === b || b === c || a === c) {
    return { payout: bet * 5, label: `Two Match! +${bet * 5}`, tier: "small" };
  }
  if (a === "🍒" || b === "🍒" || c === "🍒") {
    return { payout: bet * 2, label: `Cherry Bonus! +${bet * 2}`, tier: "cherry" };
  }
  return { payout: 0, label: "No luck this time", tier: "none" };
}

/* ───── keyframes (injected once) ───── */
const STYLE_ID = "slot-machine-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes sm-neon-border {
      0%, 100% { box-shadow: 0 0 8px #ff00ff, 0 0 20px #ff00ff44, inset 0 0 8px #ff00ff22; }
      50% { box-shadow: 0 0 16px #00ffff, 0 0 40px #00ffff44, inset 0 0 12px #00ffff22; }
    }
    @keyframes sm-flash-win {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    @keyframes sm-jackpot-flash {
      0%, 100% { color: #ffd700; text-shadow: 0 0 10px #ffd700, 0 0 30px #ff8c00; }
      33% { color: #ff00ff; text-shadow: 0 0 10px #ff00ff, 0 0 30px #ff00ff; }
      66% { color: #00ffff; text-shadow: 0 0 10px #00ffff, 0 0 30px #00ffff; }
    }
    @keyframes sm-lever-pull {
      0% { transform: rotate(0deg); }
      30% { transform: rotate(25deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes sm-bounce {
      0% { transform: translateY(-10px); }
      40% { transform: translateY(4px); }
      70% { transform: translateY(-2px); }
      100% { transform: translateY(0px); }
    }
    @keyframes sm-reel-spin {
      0% { transform: translateY(0); }
      100% { transform: translateY(-100%); }
    }
    @keyframes sm-credit-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes sm-bulb-chase {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);
}

/* ══════════════════ Component ══════════════════ */
export default function SlotMachine() {
  useEffect(() => { ensureKeyframes(); }, []);

  /* ── state ── */
  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [bet, setBet] = useState<number>(BET_OPTIONS[0]);
  const [reelResults, setReelResults] = useState<Symbol[]>(["💎", "🔔", "🍒"]);
  const [spinning, setSpinning] = useState(false);
  const [reelsStopped, setReelsStopped] = useState<boolean[]>([true, true, true]);
  const [winInfo, setWinInfo] = useState<{ payout: number; label: string; tier: string } | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const [leverPulled, setLeverPulled] = useState(false);
  const [autoSpinLeft, setAutoSpinLeft] = useState(0);
  const [reelSpinSymbols, setReelSpinSymbols] = useState<Symbol[][]>([[], [], []]);
  const [bounceReel, setBounceReel] = useState<boolean[]>([false, false, false]);
  const [spinTick, setSpinTick] = useState(0);

  /* Tick interval to animate spinning reels */
  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setSpinTick(t => t + 1), 60);
    return () => clearInterval(id);
  }, [spinning]);

  const autoSpinRef = useRef(autoSpinLeft);
  autoSpinRef.current = autoSpinLeft;
  const spinningRef = useRef(spinning);
  spinningRef.current = spinning;
  const creditsRef = useRef(credits);
  creditsRef.current = credits;
  const betRef = useRef(bet);
  betRef.current = bet;

  /* ── spin logic ── */
  const doSpin = useCallback(() => {
    if (spinningRef.current) return;
    if (creditsRef.current < betRef.current) return;

    // Resume audio context on interaction
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

    const currentBet = betRef.current;
    setCredits(c => c - currentBet);
    setSpinning(true);
    setWinInfo(null);
    setWinFlash(false);
    setReelsStopped([false, false, false]);
    setBounceReel([false, false, false]);
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 500);

    // Generate spinning symbols for animation
    const strips = [generateReelStrip(), generateReelStrip(), generateReelStrip()];
    setReelSpinSymbols(strips);

    soundReelSpin();

    // Determine final results
    const finals: Symbol[] = [randomSymbol(), randomSymbol(), randomSymbol()];

    // Stop reels one by one
    for (let r = 0; r < REEL_COUNT; r++) {
      const delay = SPIN_DURATION_BASE + r * SPIN_STAGGER;
      setTimeout(() => {
        soundReelStop();
        setReelResults(prev => {
          const next = [...prev];
          next[r] = finals[r];
          return next as Symbol[];
        });
        setReelsStopped(prev => {
          const next = [...prev];
          next[r] = true;
          return next;
        });
        setBounceReel(prev => {
          const next = [...prev];
          next[r] = true;
          return next;
        });
        setTimeout(() => setBounceReel(prev => { const n = [...prev]; n[r] = false; return n; }), 300);

        // All reels stopped?
        if (r === REEL_COUNT - 1) {
          const result = calculateWin(finals[0], finals[1], finals[2], currentBet);
          setTimeout(() => {
            setSpinning(false);
            if (result.payout > 0) {
              setCredits(c => c + result.payout);
              setWinFlash(true);
              if (result.tier === "jackpot") soundJackpot();
              else soundWin();
              setTimeout(() => setWinFlash(false), 2000);
            }
            setWinInfo(result);

            // Auto-spin continuation
            if (autoSpinRef.current > 0) {
              setAutoSpinLeft(a => a - 1);
              setTimeout(() => {
                if (autoSpinRef.current > 0 && creditsRef.current >= betRef.current) {
                  doSpin();
                } else {
                  setAutoSpinLeft(0);
                }
              }, 800);
            }
          }, 200);
        }
      }, delay);
    }
  }, []);

  const startAutoSpin = useCallback(() => {
    if (spinning) return;
    setAutoSpinLeft(10);
    autoSpinRef.current = 10;
    doSpin();
  }, [spinning, doSpin]);

  const stopAutoSpin = useCallback(() => {
    setAutoSpinLeft(0);
  }, []);

  /* ── neon bulbs around frame ── */
  const bulbCount = 32;
  const bulbs = Array.from({ length: bulbCount }, (_, i) => i);

  /* ══════════════ RENDER ══════════════ */
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(180deg, #0a0014 0%, #1a0028 50%, #0a0014 100%)",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      padding: 20,
      color: "#fff",
      userSelect: "none",
    }}>
      {/* ── Title ── */}
      <div style={{
        fontSize: 36,
        fontWeight: 900,
        letterSpacing: 4,
        textAlign: "center",
        marginBottom: 16,
        color: "#ffd700",
        textShadow: "0 0 10px #ffd700, 0 0 30px #ff8c00, 0 0 50px #ff4500",
      }}>
        SLOT MACHINE
      </div>
      <div style={{
        fontSize: 13,
        color: "#ff00ff",
        textShadow: "0 0 6px #ff00ff",
        marginBottom: 20,
        letterSpacing: 6,
        textTransform: "uppercase",
      }}>
        Las Vegas
      </div>

      {/* ── Credit display ── */}
      <div style={{
        display: "flex",
        gap: 30,
        marginBottom: 18,
        fontSize: 18,
        fontWeight: 700,
      }}>
        <div style={{
          background: "linear-gradient(135deg, #1a0a2e, #2a1040)",
          border: "2px solid #ffd700",
          borderRadius: 10,
          padding: "8px 24px",
          color: "#ffd700",
          textShadow: "0 0 6px #ffd700",
          animation: winFlash ? "sm-credit-pop 0.3s ease" : "none",
        }}>
          CREDITS: {credits}
        </div>
        <div style={{
          background: "linear-gradient(135deg, #1a0a2e, #2a1040)",
          border: "2px solid #00ffff",
          borderRadius: 10,
          padding: "8px 24px",
          color: "#00ffff",
          textShadow: "0 0 6px #00ffff",
        }}>
          BET: {bet}
        </div>
      </div>

      {/* ── Vegas frame with bulbs ── */}
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, #2a0a3e, #1a0028)",
        border: "4px solid #ffd700",
        borderRadius: 20,
        padding: 30,
        animation: "sm-neon-border 3s ease-in-out infinite",
      }}>
        {/* Decorative bulbs */}
        {bulbs.map(i => {
          const total = bulbCount;
          const perSide = Math.ceil(total / 4);
          let top = 0, left = 0;
          const frameW = 380, frameH = 260;
          const side = Math.floor(i / perSide);
          const pos = (i % perSide) / perSide;
          switch (side) {
            case 0: top = -6; left = pos * frameW; break;
            case 1: top = pos * frameH; left = frameW - 6; break;
            case 2: top = frameH - 6; left = (1 - pos) * frameW; break;
            default: top = (1 - pos) * frameH; left = -6; break;
          }
          const color = i % 3 === 0 ? "#ff0040" : i % 3 === 1 ? "#ffd700" : "#00ff88";
          return (
            <div key={i} style={{
              position: "absolute",
              top,
              left,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 6px ${color}`,
              animation: `sm-bulb-chase 0.8s ease-in-out ${(i * 0.1) % 0.8}s infinite`,
              zIndex: 2,
            }} />
          );
        })}

        {/* ── Reels area ── */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {[0, 1, 2].map(reelIdx => {
            const isStopped = reelsStopped[reelIdx];
            const isBouncing = bounceReel[reelIdx];
            const symbol = reelResults[reelIdx];
            const spinSymbols = reelSpinSymbols[reelIdx];

            return (
              <div key={reelIdx} style={{
                width: 100,
                height: 200,
                background: "linear-gradient(180deg, #0a0a1a, #141428, #0a0a1a)",
                borderRadius: 12,
                border: "2px solid #333",
                overflow: "hidden",
                position: "relative",
                boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
              }}>
                {/* Darkened top/bottom rows */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: "33%",
                  background: "rgba(0,0,0,0.5)", zIndex: 3, pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: "33%",
                  background: "rgba(0,0,0,0.5)", zIndex: 3, pointerEvents: "none",
                }} />

                {/* Win line indicator (middle row borders) */}
                <div style={{
                  position: "absolute",
                  top: "33%",
                  left: 0,
                  right: 0,
                  height: "34%",
                  borderTop: winInfo && winInfo.payout > 0 ? "2px solid #ffd700" : "1px solid #ff00ff44",
                  borderBottom: winInfo && winInfo.payout > 0 ? "2px solid #ffd700" : "1px solid #ff00ff44",
                  zIndex: 4,
                  pointerEvents: "none",
                  boxShadow: winInfo && winInfo.payout > 0 ? "inset 0 0 15px #ffd70044" : "none",
                }} />

                {/* Reel content */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  transition: isStopped ? "none" : "filter 0.1s",
                  filter: isStopped ? "none" : "blur(3px)",
                  animation: isBouncing ? "sm-bounce 0.3s ease-out" : "none",
                }}>
                  {isStopped ? (
                    /* Show 3 visible rows: top, middle (result), bottom */
                    <>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.4 }}>
                        {SYMBOLS[(SYMBOLS.indexOf(symbol) + SYMBOLS.length - 1) % SYMBOLS.length]}
                      </div>
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52,
                        filter: winInfo && winInfo.payout > 0 ? "drop-shadow(0 0 8px #ffd700)" : "none",
                      }}>
                        {symbol}
                      </div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.4 }}>
                        {SYMBOLS[(SYMBOLS.indexOf(symbol) + 1) % SYMBOLS.length]}
                      </div>
                    </>
                  ) : (
                    /* Spinning: rapidly cycling symbols */
                    <>
                      {[0, 1, 2].map(row => (
                        <div key={row} style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: row === 1 ? 52 : 40,
                          opacity: row === 1 ? 1 : 0.4,
                        }}>
                          {spinSymbols.length > 0 ? spinSymbols[(spinTick + row * 7 + reelIdx * 13) % spinSymbols.length] : "🍒"}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Lever ── */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginLeft: 8,
          }}>
            <div style={{
              width: 20,
              height: 80,
              background: "linear-gradient(90deg, #888, #ccc, #888)",
              borderRadius: 4,
              position: "relative",
              transformOrigin: "bottom center",
              animation: leverPulled ? "sm-lever-pull 0.5s ease-out" : "none",
            }}>
              <div style={{
                position: "absolute",
                top: -14,
                left: "50%",
                transform: "translateX(-50%)",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "radial-gradient(circle at 40% 35%, #ff4444, #aa0000)",
                border: "2px solid #ff6666",
                boxShadow: "0 0 10px #ff000066",
              }} />
            </div>
            <div style={{
              width: 30,
              height: 10,
              background: "#666",
              borderRadius: "0 0 6px 6px",
              marginTop: -2,
            }} />
          </div>
        </div>

        {/* ── WIN LINE label ── */}
        <div style={{
          position: "absolute",
          left: -2,
          top: "50%",
          transform: "translateY(-50%)",
          background: "#ff00ff",
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
          padding: "2px 6px",
          borderRadius: "4px 0 0 4px",
          textShadow: "0 0 4px #fff",
          letterSpacing: 1,
        }}>
          WIN LINE
        </div>
        <div style={{
          position: "absolute",
          right: 28,
          top: "50%",
          transform: "translateY(-50%)",
          background: "#ff00ff",
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
          padding: "2px 6px",
          borderRadius: "0 4px 4px 0",
          textShadow: "0 0 4px #fff",
          letterSpacing: 1,
        }}>
          WIN LINE
        </div>
      </div>

      {/* ── Win display ── */}
      <div style={{
        height: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 16,
      }}>
        {winInfo && (
          <div style={{
            fontSize: winInfo.tier === "jackpot" ? 28 : 20,
            fontWeight: 900,
            textAlign: "center",
            animation: winInfo.payout > 0
              ? (winInfo.tier === "jackpot" ? "sm-jackpot-flash 0.4s ease-in-out infinite" : "sm-flash-win 0.5s ease-in-out 3")
              : "none",
            color: winInfo.payout > 0
              ? (winInfo.tier === "jackpot" ? "#ffd700" : winInfo.tier === "cherry" ? "#ff6b9d" : "#00ff88")
              : "#555",
            textShadow: winInfo.payout > 0 ? "0 0 10px currentColor" : "none",
          }}>
            {winInfo.label}
            {winInfo.payout > 0 && winInfo.tier !== "jackpot" && (
              <span style={{ display: "block", fontSize: 14, color: "#ffd700", marginTop: 2 }}>
                Won {winInfo.payout} credits!
              </span>
            )}
            {winInfo.tier === "jackpot" && (
              <span style={{ display: "block", fontSize: 16, marginTop: 4 }}>
                WON {winInfo.payout} CREDITS!
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Bet selector ── */}
      <div style={{
        display: "flex",
        gap: 8,
        marginTop: 12,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 13, color: "#888", alignSelf: "center", marginRight: 4 }}>BET:</span>
        {BET_OPTIONS.map(b => (
          <button
            key={b}
            onClick={() => { if (!spinning) setBet(b); }}
            disabled={spinning}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: bet === b ? "2px solid #ffd700" : "2px solid #333",
              background: bet === b
                ? "linear-gradient(135deg, #ffd700, #ff8c00)"
                : "linear-gradient(135deg, #1a1a2e, #16213e)",
              color: bet === b ? "#000" : "#aaa",
              fontWeight: 800,
              fontSize: 15,
              cursor: spinning ? "default" : "pointer",
              transition: "all 0.2s",
              textShadow: bet === b ? "none" : "0 0 4px #00000088",
            }}
          >
            {b}
          </button>
        ))}
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        {/* Pull lever / Spin button */}
        <button
          onClick={doSpin}
          disabled={spinning || credits < bet}
          style={{
            padding: "14px 48px",
            borderRadius: 12,
            border: "3px solid #ff4444",
            background: spinning
              ? "linear-gradient(135deg, #333, #222)"
              : credits < bet
                ? "linear-gradient(135deg, #333, #222)"
                : "linear-gradient(135deg, #ff0040, #cc0033)",
            color: spinning || credits < bet ? "#666" : "#fff",
            fontWeight: 900,
            fontSize: 20,
            cursor: spinning || credits < bet ? "default" : "pointer",
            letterSpacing: 3,
            textShadow: spinning ? "none" : "0 0 10px #ff000088",
            boxShadow: spinning ? "none" : "0 0 20px #ff004044, 0 4px 15px rgba(0,0,0,0.4)",
            transition: "all 0.2s",
          }}
        >
          {spinning ? "SPINNING..." : "PULL"}
        </button>

        {/* Auto-spin */}
        <button
          onClick={autoSpinLeft > 0 ? stopAutoSpin : startAutoSpin}
          disabled={spinning && autoSpinLeft === 0}
          style={{
            padding: "14px 24px",
            borderRadius: 12,
            border: autoSpinLeft > 0 ? "2px solid #ff4444" : "2px solid #00ffff",
            background: autoSpinLeft > 0
              ? "linear-gradient(135deg, #440000, #220000)"
              : "linear-gradient(135deg, #0a2a3a, #061a28)",
            color: autoSpinLeft > 0 ? "#ff4444" : "#00ffff",
            fontWeight: 700,
            fontSize: 14,
            cursor: spinning && autoSpinLeft === 0 ? "default" : "pointer",
            textShadow: `0 0 6px ${autoSpinLeft > 0 ? "#ff4444" : "#00ffff"}`,
            transition: "all 0.2s",
          }}
        >
          {autoSpinLeft > 0 ? `STOP (${autoSpinLeft})` : "AUTO x10"}
        </button>
      </div>

      {/* ── Paytable ── */}
      <div style={{
        marginTop: 24,
        background: "linear-gradient(135deg, #1a0a2e88, #0a001488)",
        border: "1px solid #333",
        borderRadius: 12,
        padding: "14px 24px",
        display: "flex",
        gap: 24,
        fontSize: 13,
        color: "#888",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#ffd700", fontWeight: 800, marginBottom: 4 }}>3 MATCH</div>
          <div>50x BET</div>
        </div>
        <div style={{ width: 1, background: "#333" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#00ff88", fontWeight: 800, marginBottom: 4 }}>2 MATCH</div>
          <div>5x BET</div>
        </div>
        <div style={{ width: 1, background: "#333" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#ff6b9d", fontWeight: 800, marginBottom: 4 }}>ANY 🍒</div>
          <div>2x BET</div>
        </div>
      </div>

    </div>
  );
}
