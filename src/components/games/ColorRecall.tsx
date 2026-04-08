"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const COLORS = [
  { name: "Red", hex: "#ef4444", glow: "#fca5a5", freq: 261.63 },
  { name: "Blue", hex: "#3b82f6", glow: "#93c5fd", freq: 329.63 },
  { name: "Green", hex: "#22c55e", glow: "#86efac", freq: 392.0 },
  { name: "Yellow", hex: "#eab308", glow: "#fde047", freq: 523.25 },
];

const LS_KEY = "color-recall-highscore";

function playTone(freq: number, ctx: AudioContext, duration = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playErrorBuzz(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 120;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

export default function ColorRecall() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "playback" | "input" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [flash, setFlash] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {}
    return () => {
      timeouts.current.forEach(clearTimeout);
    };
  }, []);

  const saveHigh = useCallback((val: number) => {
    setHighScore(val);
    try { localStorage.setItem(LS_KEY, String(val)); } catch {}
  }, []);

  const getAudio = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    if (audioCtx.current.state === "suspended") audioCtx.current.resume();
    return audioCtx.current;
  }, []);

  const clearTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  };

  const lightUp = useCallback((idx: number, duration: number) => {
    const ctx = getAudio();
    playTone(COLORS[idx].freq, ctx, duration / 1000);
    setLit(idx);
    return new Promise<void>((resolve) => {
      schedule(() => {
        setLit(null);
        schedule(() => resolve(), 100);
      }, duration);
    });
  }, [getAudio]);

  const playSequence = useCallback(async (seq: number[], level: number) => {
    setPhase("playback");
    setPlayerIdx(0);
    await new Promise<void>((r) => schedule(r, 400));
    const speed = level > 10 ? 350 : 500;
    for (let i = 0; i < seq.length; i++) {
      await lightUp(seq[i], speed);
    }
    setPhase("input");
  }, [lightUp]);

  const startGame = () => {
    clearTimeouts();
    const first = Math.floor(Math.random() * 4);
    const seq = [first];
    setSequence(seq);
    setScore(0);
    setFlash(false);
    playSequence(seq, 1);
  };

  const nextRound = useCallback((prevSeq: number[]) => {
    const next = [...prevSeq, Math.floor(Math.random() * 4)];
    setSequence(next);
    const level = next.length;
    schedule(() => playSequence(next, level), 600);
  }, [playSequence]);

  const handlePress = useCallback((idx: number) => {
    if (phase !== "input") return;

    const ctx = getAudio();
    playTone(COLORS[idx].freq, ctx, 0.2);
    setLit(idx);
    schedule(() => setLit(null), 200);

    if (idx !== sequence[playerIdx]) {
      playErrorBuzz(ctx);
      setPhase("gameover");
      setFlash(true);
      const finalScore = sequence.length - 1;
      setScore(finalScore);
      if (finalScore > highScore) saveHigh(finalScore);
      schedule(() => setFlash(false), 600);
      return;
    }

    const nextIdx = playerIdx + 1;
    if (nextIdx >= sequence.length) {
      const newScore = sequence.length;
      setScore(newScore);
      if (newScore > highScore) saveHigh(newScore);
      nextRound(sequence);
    } else {
      setPlayerIdx(nextIdx);
    }
  }, [phase, sequence, playerIdx, highScore, getAudio, saveHigh, nextRound]);

  const level = score;
  const statusText =
    phase === "playback" ? "Watch..." :
    phase === "input" ? "Your turn!" :
    phase === "gameover" ? "Game Over!" :
    "Press Start";

  const statusColor =
    phase === "gameover" ? "#ef4444" :
    phase === "input" ? "#22c55e" :
    phase === "playback" ? "#facc15" :
    "#94a3b8";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100%",
      padding: 24,
      background: "#0f172a",
      borderRadius: 16,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      userSelect: "none",
    }}>
      <h2 style={{
        color: "#e2e8f0",
        fontSize: 28,
        fontWeight: 700,
        margin: "0 0 8px 0",
        letterSpacing: -0.5,
      }}>
        Color Recall
      </h2>

      <div style={{
        display: "flex",
        gap: 24,
        marginBottom: 12,
        fontSize: 15,
      }}>
        <span style={{ color: "#94a3b8" }}>
          Level: <b style={{ color: "#e2e8f0" }}>{level}</b>
        </span>
        <span style={{ color: "#94a3b8" }}>
          Score: <b style={{ color: "#e2e8f0" }}>{score}</b>
        </span>
        <span style={{ color: "#94a3b8" }}>
          Best: <b style={{ color: "#facc15" }}>{highScore}</b>
        </span>
      </div>

      <p style={{
        color: statusColor,
        fontSize: 18,
        fontWeight: 600,
        margin: "4px 0 20px 0",
        minHeight: 28,
        transition: "color 0.2s",
      }}>
        {statusText}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        padding: 4,
        position: "relative",
      }}>
        {flash && (
          <div style={{
            position: "absolute",
            inset: -10,
            borderRadius: 24,
            background: "rgba(239,68,68,0.25)",
            animation: "colorRecallFlash 0.6s ease-out",
            pointerEvents: "none",
            zIndex: 10,
          }} />
        )}
        {COLORS.map((c, i) => {
          const isLit = lit === i;
          return (
            <button
              key={c.name}
              onClick={() => handlePress(i)}
              disabled={phase !== "input"}
              aria-label={c.name}
              style={{
                width: 120,
                height: 120,
                borderRadius: 20,
                border: "3px solid " + (isLit ? c.glow : "rgba(255,255,255,0.08)"),
                background: c.hex,
                cursor: phase === "input" ? "pointer" : "default",
                opacity: phase === "playback" && !isLit ? 0.5 : 1,
                filter: isLit ? "brightness(1.5)" : "brightness(1)",
                boxShadow: isLit
                  ? `0 0 30px 8px ${c.glow}, inset 0 0 20px rgba(255,255,255,0.25)`
                  : `0 4px 12px rgba(0,0,0,0.3)`,
                transition: "all 0.12s ease",
                outline: "none",
                position: "relative",
                zIndex: 1,
              }}
            />
          );
        })}
      </div>

      {(phase === "idle" || phase === "gameover") && (
        <button
          onClick={startGame}
          style={{
            marginTop: 28,
            padding: "12px 36px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            transition: "transform 0.15s, box-shadow 0.15s",
            letterSpacing: 0.3,
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1.05)";
            (e.target as HTMLElement).style.boxShadow = "0 6px 20px rgba(99,102,241,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = "scale(1)";
            (e.target as HTMLElement).style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)";
          }}
        >
          {phase === "gameover" ? "Play Again" : "Start"}
        </button>
      )}

      <style>{`
        @keyframes colorRecallFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
