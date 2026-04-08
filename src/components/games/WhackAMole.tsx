"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type MoleState = "hidden" | "up" | "golden" | "hit" | "miss";

interface Hole {
  state: MoleState;
  timer: number | null;
}

const GRID_SIZE = 9;
const GAME_DURATION = 30;
const BASE_MOLE_MIN = 800;
const BASE_MOLE_MAX = 1200;
const BASE_SPAWN_INTERVAL = 1000;
const GOLDEN_CHANCE = 0.08;
const HIT_DISPLAY_MS = 400;
const MISS_DISPLAY_MS = 300;

function playWhackSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 200);
  } catch {}
}

function playGoldenSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

function playMissSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    setTimeout(() => ctx.close(), 200);
  } catch {}
}

export default function WhackAMole() {
  const [holes, setHoles] = useState<Hole[]>(
    Array.from({ length: GRID_SIZE }, () => ({ state: "hidden", timer: null }))
  );
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<"start" | "playing" | "over">("start");
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lastPoints, setLastPoints] = useState<{ idx: number; pts: number; key: number } | null>(null);

  const holesRef = useRef(holes);
  holesRef.current = holes;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const moleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointKey = useRef(0);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("whack-a-mole-highscore");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  const clearAllTimers = useCallback(() => {
    moleTimers.current.forEach(t => clearTimeout(t));
    moleTimers.current = [];
    if (gameTimer.current) clearInterval(gameTimer.current);
    if (spawnTimer.current) clearTimeout(spawnTimer.current);
    gameTimer.current = null;
    spawnTimer.current = null;
  }, []);

  const getSpawnParams = useCallback(() => {
    const elapsed = GAME_DURATION - timeLeftRef.current;
    const progress = elapsed / GAME_DURATION; // 0 to 1
    const maxMoles = progress < 0.3 ? 1 : progress < 0.6 ? 2 : 3;
    const speedMult = 1 - progress * 0.4; // mole display time shrinks
    const spawnMult = 1 - progress * 0.5; // spawn interval shrinks
    return { maxMoles, speedMult, spawnMult };
  }, []);

  const spawnMole = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    const { maxMoles, speedMult, spawnMult } = getSpawnParams();
    const count = 1 + Math.floor(Math.random() * maxMoles);

    const available: number[] = [];
    holesRef.current.forEach((h, i) => {
      if (h.state === "hidden") available.push(i);
    });

    const toSpawn = available.sort(() => Math.random() - 0.5).slice(0, count);

    if (toSpawn.length > 0) {
      setHoles(prev => {
        const next = [...prev];
        toSpawn.forEach(idx => {
          const isGolden = Math.random() < GOLDEN_CHANCE;
          next[idx] = { state: isGolden ? "golden" : "up", timer: null };
        });
        return next;
      });

      // Set hide timers for each spawned mole
      toSpawn.forEach(idx => {
        const duration = (BASE_MOLE_MIN + Math.random() * (BASE_MOLE_MAX - BASE_MOLE_MIN)) * speedMult;
        const t = setTimeout(() => {
          if (phaseRef.current !== "playing") return;
          setHoles(prev => {
            const next = [...prev];
            if (next[idx].state === "up" || next[idx].state === "golden") {
              next[idx] = { state: "hidden", timer: null };
              // Missed a mole — reset combo
              setCombo(0);
            }
            return next;
          });
        }, duration);
        moleTimers.current.push(t);
      });
    }

    // Schedule next spawn
    const nextInterval = BASE_SPAWN_INTERVAL * spawnMult * (0.7 + Math.random() * 0.6);
    spawnTimer.current = setTimeout(spawnMole, nextInterval);
  }, [getSpawnParams]);

  const endGame = useCallback(() => {
    clearAllTimers();
    setPhase("over");
    const finalScore = scoreRef.current;
    setHighScore(prev => {
      const newHigh = Math.max(prev, finalScore);
      try { localStorage.setItem("whack-a-mole-highscore", String(newHigh)); } catch {}
      return newHigh;
    });
    setHoles(Array.from({ length: GRID_SIZE }, () => ({ state: "hidden", timer: null })));
  }, [clearAllTimers]);

  const startGame = useCallback(() => {
    clearAllTimers();
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(GAME_DURATION);
    setLastPoints(null);
    setHoles(Array.from({ length: GRID_SIZE }, () => ({ state: "hidden", timer: null })));
    setPhase("playing");

    // Game countdown
    gameTimer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Start spawning moles after a brief delay
    spawnTimer.current = setTimeout(spawnMole, 500);
  }, [clearAllTimers, endGame, spawnMole]);

  const whack = useCallback((idx: number) => {
    if (phaseRef.current !== "playing") return;
    const h = holesRef.current[idx];

    if (h.state === "up" || h.state === "golden") {
      const isGolden = h.state === "golden";
      const newCombo = comboRef.current + 1;
      const comboBonus = newCombo >= 5 ? 2 : newCombo >= 3 ? 1 : 0;
      const pts = (isGolden ? 3 : 1) + comboBonus;

      if (isGolden) playGoldenSound();
      else playWhackSound();

      setScore(s => s + pts);
      setCombo(newCombo);
      setBestCombo(prev => Math.max(prev, newCombo));
      pointKey.current += 1;
      setLastPoints({ idx, pts, key: pointKey.current });

      setHoles(prev => {
        const next = [...prev];
        next[idx] = { state: "hit", timer: null };
        return next;
      });

      // Clear hit state after brief display
      const t = setTimeout(() => {
        setHoles(prev => {
          const next = [...prev];
          if (next[idx].state === "hit") {
            next[idx] = { state: "hidden", timer: null };
          }
          return next;
        });
      }, HIT_DISPLAY_MS);
      moleTimers.current.push(t);
    } else if (h.state === "hidden") {
      // Missed — clicked empty hole
      playMissSound();
      setCombo(0);
      setHoles(prev => {
        const next = [...prev];
        next[idx] = { state: "miss", timer: null };
        return next;
      });
      const t = setTimeout(() => {
        setHoles(prev => {
          const next = [...prev];
          if (next[idx].state === "miss") {
            next[idx] = { state: "hidden", timer: null };
          }
          return next;
        });
      }, MISS_DISPLAY_MS);
      moleTimers.current.push(t);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const timerColor = timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#10b981";
  const timerPct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a1a 0%, #0f1a0f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: 20,
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Stars background */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: "50%",
              background: `rgba(255,255,255,${0.2 + Math.random() * 0.5})`,
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 50}%`,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 4px 0",
          textShadow: "0 2px 20px rgba(16,185,129,0.3)",
          letterSpacing: -0.5,
        }}
      >
        Whack-a-Mole
      </h1>

      {/* Score bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 8,
          fontSize: 15,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#94a3b8" }}>
          Score{" "}
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{score}</span>
        </div>
        <div style={{ color: "#94a3b8" }}>
          Best{" "}
          <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 20 }}>{highScore}</span>
        </div>
        {phase === "playing" && combo >= 2 && (
          <div
            style={{
              color: combo >= 5 ? "#f472b6" : "#38bdf8",
              fontWeight: 700,
              fontSize: 16,
              animation: "pulse 0.3s ease",
            }}
          >
            {combo}x Combo!
          </div>
        )}
      </div>

      {/* Timer bar */}
      {phase === "playing" && (
        <div
          style={{
            width: 300,
            maxWidth: "90%",
            height: 8,
            borderRadius: 4,
            background: "rgba(255,255,255,0.1)",
            marginBottom: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${timerPct}%`,
              height: "100%",
              borderRadius: 4,
              background: timerColor,
              transition: "width 1s linear, background 0.5s ease",
            }}
          />
        </div>
      )}

      {phase === "playing" && (
        <div style={{ color: timerColor, fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
          {timeLeft}s
        </div>
      )}

      {/* Start Screen */}
      {phase === "start" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            marginTop: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 72 }}>🐹</div>
          <p style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", maxWidth: 320, margin: 0, lineHeight: 1.6 }}>
            Whack the moles as they pop up! Watch out for{" "}
            <span style={{ color: "#fbbf24", fontWeight: 600 }}>golden moles</span> worth 3 points.
            Build combos for bonus points!
          </p>
          <button
            onClick={startGame}
            style={{
              padding: "14px 48px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.transform = "scale(1.05)";
              (e.target as HTMLElement).style.boxShadow = "0 6px 28px rgba(16,185,129,0.5)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.transform = "scale(1)";
              (e.target as HTMLElement).style.boxShadow = "0 4px 20px rgba(16,185,129,0.4)";
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {/* Game Grid */}
      {phase === "playing" && (
        <div
          style={{
            background: "linear-gradient(180deg, #166534 0%, #14532d 50%, #713f12 100%)",
            borderRadius: 24,
            padding: "32px 28px 40px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.05)",
            position: "relative",
          }}
        >
          {/* Grass tufts */}
          <div style={{ position: "absolute", top: -8, left: 20, fontSize: 20, opacity: 0.6 }}>🌿</div>
          <div style={{ position: "absolute", top: -6, right: 24, fontSize: 16, opacity: 0.5 }}>🌱</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {holes.map((hole, i) => {
              const isUp = hole.state === "up" || hole.state === "golden";
              const isHit = hole.state === "hit";
              const isMiss = hole.state === "miss";
              const isGolden = hole.state === "golden";

              return (
                <div
                  key={i}
                  onClick={() => whack(i)}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    position: "relative",
                    cursor: phase === "playing" ? "pointer" : "default",
                    // Hole background
                    background: isMiss
                      ? "radial-gradient(ellipse, #7f1d1d 0%, #451a03 60%, #3b2506 100%)"
                      : "radial-gradient(ellipse, #1c0f00 0%, #3b2506 60%, #5c3a1e 100%)",
                    boxShadow: isMiss
                      ? "inset 0 4px 16px rgba(220,38,38,0.5), 0 2px 8px rgba(0,0,0,0.3)"
                      : "inset 0 4px 16px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)",
                    border: "3px solid #5c3a1e",
                    overflow: "hidden",
                    transition: "box-shadow 0.15s ease",
                  }}
                >
                  {/* Mole */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: isUp || isHit ? 8 : -60,
                      left: "50%",
                      transform: `translateX(-50%) scale(${isUp ? 1 : isHit ? 0.9 : 0})`,
                      transition: isUp
                        ? "bottom 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)"
                        : "bottom 0.12s ease-in, transform 0.12s ease-in",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    {/* Mole body */}
                    <div
                      style={{
                        width: 56,
                        height: 52,
                        borderRadius: "50% 50% 40% 40%",
                        background: isGolden
                          ? "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)"
                          : "linear-gradient(180deg, #a0744e 0%, #7c5835 100%)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        boxShadow: isGolden
                          ? "0 0 16px rgba(251,191,36,0.6), 0 2px 8px rgba(0,0,0,0.3)"
                          : "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      {/* Eyes */}
                      <div style={{ display: "flex", gap: 10, marginTop: -2 }}>
                        <div
                          style={{
                            width: 10,
                            height: isHit ? 3 : 10,
                            borderRadius: isHit ? 2 : "50%",
                            background: isHit ? "#000" : "#1a1a1a",
                            transition: "all 0.1s ease",
                          }}
                        />
                        <div
                          style={{
                            width: 10,
                            height: isHit ? 3 : 10,
                            borderRadius: isHit ? 2 : "50%",
                            background: isHit ? "#000" : "#1a1a1a",
                            transition: "all 0.1s ease",
                          }}
                        />
                      </div>
                      {/* Eye whites/pupils */}
                      {!isHit && (
                        <div
                          style={{
                            position: "absolute",
                            top: 16,
                            display: "flex",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: "#fff",
                              marginTop: -2,
                              marginLeft: 2,
                            }}
                          />
                          <div
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: "#fff",
                              marginTop: -2,
                              marginLeft: 2,
                            }}
                          />
                        </div>
                      )}
                      {/* Nose */}
                      <div
                        style={{
                          width: 8,
                          height: 6,
                          borderRadius: "50%",
                          background: isGolden ? "#92400e" : "#5c3a1e",
                          marginTop: 2,
                        }}
                      />
                      {/* Hit stars */}
                      {isHit && (
                        <div
                          style={{
                            position: "absolute",
                            top: -8,
                            fontSize: 14,
                            animation: "spin 0.4s linear",
                          }}
                        >
                          ✦
                        </div>
                      )}
                      {/* Golden sparkle */}
                      {isGolden && (
                        <div
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -4,
                            fontSize: 12,
                          }}
                        >
                          ✨
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Floating points */}
                  {lastPoints && lastPoints.idx === i && (
                    <div
                      key={lastPoints.key}
                      style={{
                        position: "absolute",
                        top: -8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: lastPoints.pts >= 3 ? "#fbbf24" : "#10b981",
                        fontWeight: 800,
                        fontSize: 18,
                        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                        pointerEvents: "none",
                        animation: "floatUp 0.6s ease forwards",
                        zIndex: 10,
                      }}
                    >
                      +{lastPoints.pts}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {phase === "over" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            padding: "28px 36px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 4 }}>🎯</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>Game Over!</div>

          <div
            style={{
              display: "flex",
              gap: 32,
              margin: "8px 0",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                Score
              </div>
              <div style={{ color: "#fff", fontSize: 32, fontWeight: 800 }}>{score}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                Best
              </div>
              <div style={{ color: "#fbbf24", fontSize: 32, fontWeight: 800 }}>{highScore}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                Max Combo
              </div>
              <div style={{ color: "#38bdf8", fontSize: 32, fontWeight: 800 }}>{bestCombo}x</div>
            </div>
          </div>

          {score >= highScore && score > 0 && (
            <div
              style={{
                color: "#fbbf24",
                fontWeight: 700,
                fontSize: 16,
                padding: "4px 16px",
                borderRadius: 8,
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.2)",
              }}
            >
              New High Score!
            </div>
          )}

          <button
            onClick={startGame}
            style={{
              marginTop: 8,
              padding: "14px 48px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.transform = "scale(1.05)";
              (e.target as HTMLElement).style.boxShadow = "0 6px 28px rgba(16,185,129,0.5)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.transform = "scale(1)";
              (e.target as HTMLElement).style.boxShadow = "0 4px 20px rgba(16,185,129,0.4)";
            }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Keyframe animations via style tag */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-32px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
