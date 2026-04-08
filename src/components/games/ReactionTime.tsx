"use client";
import { useState, useRef, useCallback, useEffect } from "react";

type Phase = "idle" | "waiting" | "ready" | "result" | "early" | "done";

export default function ReactionTime() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [highScore, setHighScore] = useState(999);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const saved = localStorage.getItem("reactiontime_best");
    if (saved) setHighScore(parseFloat(saved));
  }, []);

  const MAX_ATTEMPTS = 5;

  const getCategory = (ms: number) => {
    if (ms < 150) return { label: "Amazing ⚡", color: "#a855f7" };
    if (ms < 250) return { label: "Fast 🔥", color: "#22c55e" };
    if (ms < 350) return { label: "Average 👍", color: "#eab308" };
    return { label: "Slow 🐢", color: "#ef4444" };
  };

  const startWaiting = useCallback(() => {
    setPhase("waiting");
    const delay = 2000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (phase === "idle") {
      setTimes([]);
      setAttempt(0);
      startWaiting();
    } else if (phase === "waiting") {
      clearTimeout(timerRef.current);
      setPhase("early");
    } else if (phase === "ready") {
      const elapsed = Math.round(performance.now() - startRef.current);
      setCurrentTime(elapsed);
      setTimes(prev => [...prev, elapsed]);
      setAttempt(prev => prev + 1);
      setPhase("result");
    } else if (phase === "early") {
      startWaiting();
    } else if (phase === "result") {
      if (attempt >= MAX_ATTEMPTS) {
        setPhase("done");
      } else {
        startWaiting();
      }
    } else if (phase === "done") {
      setPhase("idle");
    }
  }, [phase, attempt, startWaiting]);

  useEffect(() => {
    if (phase === "done" && times.length > 0) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      if (avg < highScore) {
        setHighScore(avg);
        localStorage.setItem("reactiontime_best", String(avg));
      }
    }
  }, [phase, times, highScore]);

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const best = times.length > 0 ? Math.min(...times) : 0;
  const maxBar = times.length > 0 ? Math.max(...times) : 1;

  const bg = phase === "waiting" ? "#dc2626" : phase === "ready" ? "#16a34a" : phase === "early" ? "#eab308" : phase === "result" ? "#2563eb" : "#0a0a1a";
  const text = phase === "waiting" ? "Wait..." : phase === "ready" ? "CLICK NOW!" : phase === "early" ? "Too early!" : phase === "result" ? `${currentTime}ms` : "";

  const s: Record<string, React.CSSProperties> = {
    wrap: { display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100%", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e0e0e0", background: "#0a0a1a", padding: 20 },
    title: { fontSize: 24, fontWeight: 800, marginBottom: 4, background: "linear-gradient(135deg, #22c55e, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    sub: { fontSize: 12, color: "#666", marginBottom: 20 },
    card: { width: "100%", maxWidth: 420, minHeight: 220, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.15s", background: bg, padding: 30, marginBottom: 20 },
    bigText: { fontSize: phase === "result" ? 56 : 32, fontWeight: 800, color: "#fff", textShadow: "0 0 20px rgba(255,255,255,0.3)", marginBottom: 8 },
    hint: { fontSize: 14, color: "rgba(255,255,255,0.7)" },
    statsRow: { display: "flex", gap: 16, marginBottom: 16 },
    statBox: { background: "#111", borderRadius: 10, padding: "12px 20px", textAlign: "center" as const },
    statLabel: { fontSize: 11, color: "#666", marginBottom: 4 },
    statVal: { fontSize: 20, fontWeight: 700 },
    barChart: { width: "100%", maxWidth: 420, marginBottom: 16 },
    barRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
    barLabel: { width: 24, fontSize: 12, color: "#888", textAlign: "right" as const },
    bar: { height: 24, borderRadius: 6, transition: "width 0.5s", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontSize: 11, fontWeight: 600, color: "#fff" },
    dots: { display: "flex", gap: 8, marginBottom: 16 },
    dot: { width: 12, height: 12, borderRadius: "50%", border: "2px solid #333" },
    btn: { padding: "12px 32px", borderRadius: 10, border: "none", background: "#22c55e", color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 12 },
    best: { fontSize: 12, color: "#888", marginTop: 8 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.title}>Reaction Time</div>
      <div style={s.sub}>Test how fast you can react</div>

      {/* Attempt dots */}
      <div style={s.dots}>
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
          <div key={i} style={{ ...s.dot, background: i < times.length ? (times[i] < 250 ? "#22c55e" : times[i] < 350 ? "#eab308" : "#ef4444") : "transparent" }} />
        ))}
      </div>

      {phase === "done" ? (
        <>
          {/* Results */}
          <div style={s.statsRow}>
            <div style={s.statBox}>
              <div style={s.statLabel}>AVERAGE</div>
              <div style={{ ...s.statVal, color: getCategory(avg).color }}>{avg}ms</div>
              <div style={{ fontSize: 11, color: getCategory(avg).color }}>{getCategory(avg).label}</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statLabel}>BEST</div>
              <div style={{ ...s.statVal, color: getCategory(best).color }}>{best}ms</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statLabel}>HIGH SCORE</div>
              <div style={{ ...s.statVal, color: "#a855f7" }}>{highScore}ms</div>
            </div>
          </div>

          {avg <= highScore && <div style={{ color: "#eab308", fontWeight: 700, marginBottom: 8 }}>🏆 New Best Average!</div>}

          {/* Bar chart */}
          <div style={s.barChart}>
            {times.map((t, i) => {
              const cat = getCategory(t);
              return (
                <div key={i} style={s.barRow}>
                  <div style={s.barLabel}>#{i + 1}</div>
                  <div style={{ ...s.bar, width: `${Math.max(20, (t / maxBar) * 100)}%`, background: cat.color }}>{t}ms</div>
                </div>
              );
            })}
          </div>

          <button onClick={handleClick} style={s.btn}>Try Again</button>
        </>
      ) : (
        <>
          {/* Main clickable card */}
          <div style={s.card} onClick={handleClick}>
            {phase === "idle" ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Click to Start</div>
                <div style={s.hint}>When the screen turns green, click as fast as you can!</div>
              </>
            ) : phase === "result" ? (
              <>
                <div style={s.bigText}>{currentTime}ms</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: getCategory(currentTime).color, marginBottom: 8 }}>{getCategory(currentTime).label}</div>
                <div style={s.hint}>{attempt >= MAX_ATTEMPTS ? "Click to see results" : `Click for attempt ${attempt + 1}/${MAX_ATTEMPTS}`}</div>
              </>
            ) : (
              <>
                <div style={s.bigText}>{text}</div>
                <div style={s.hint}>{phase === "waiting" ? "Wait for green..." : phase === "ready" ? "Click!" : "Click to try again"}</div>
              </>
            )}
          </div>

          {times.length > 0 && phase !== "idle" && (
            <div style={{ fontSize: 13, color: "#888" }}>
              Attempts: {times.map((t, i) => <span key={i} style={{ color: getCategory(t).color, marginRight: 8 }}>{t}ms</span>)}
            </div>
          )}
        </>
      )}

      {highScore < 999 && phase === "idle" && <div style={s.best}>Best average: {highScore}ms</div>}
    </div>
  );
}
