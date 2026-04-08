"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Types ─── */
type Difficulty = "easy" | "medium" | "hard";
type Op = "+" | "-" | "\u00d7" | "\u00f7";

interface Question {
  a: number;
  b: number;
  op: Op;
  answer: number;
  display: string;
}

/* ─── Question Generator ─── */
function genQuestion(diff: Difficulty): Question {
  const ops: Op[] = ["+", "-", "\u00d7", "\u00f7"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  const min = diff === "easy" ? 1 : diff === "medium" ? 10 : 100;
  const range = diff === "easy" ? 9 : diff === "medium" ? 99 : 999;

  switch (op) {
    case "+":
      a = min + Math.floor(Math.random() * (range - min + 1));
      b = min + Math.floor(Math.random() * (range - min + 1));
      answer = a + b;
      break;
    case "-":
      a = min + Math.floor(Math.random() * (range - min + 1));
      b = min + Math.floor(Math.random() * a);
      answer = a - b;
      break;
    case "\u00d7": {
      const mRange = diff === "easy" ? 9 : diff === "medium" ? 20 : 50;
      a = 2 + Math.floor(Math.random() * mRange);
      b = 2 + Math.floor(Math.random() * mRange);
      answer = a * b;
      break;
    }
    case "\u00f7":
      b = 2 + Math.floor(Math.random() * (diff === "easy" ? 8 : diff === "medium" ? 15 : 30));
      answer = 1 + Math.floor(Math.random() * (diff === "easy" ? 9 : diff === "medium" ? 20 : 50));
      a = b * answer;
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }

  return { a, b, op, answer, display: `${a} ${op} ${b}` };
}

/* ─── Constants ─── */
const BG = "#0a0a1a";
const ACCENT = "#f59e0b";
const CARD = "#141428";
const BTN = "#7c3aed";
const SUCCESS = "#22c55e";
const DANGER = "#ef4444";
const TOTAL_QUESTIONS = 20;
const TIME_PER_Q = 10;

export default function MathChallenge() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [question, setQuestion] = useState<Question | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "timeout" | "">("");
  const [highScore, setHighScore] = useState(0);
  const [results, setResults] = useState<
    { q: string; correct: boolean; userAns: string; answer: number; time: number }[]
  >([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const qRef = useRef<Question | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mathchallenge_high");
      if (saved) setHighScore(Number(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  }, []);

  const advanceQuestion = useCallback(
    (idx: number, sc: number) => {
      if (idx >= TOTAL_QUESTIONS) {
        setPhase("done");
        if (sc > highScore) {
          setHighScore(sc);
          try {
            localStorage.setItem("mathchallenge_high", String(sc));
          } catch {
            /* ignore */
          }
        }
        return;
      }
      const q = genQuestion(difficulty);
      qRef.current = q;
      setQuestion(q);
      setInput("");
      setFeedback("");
      setTimeLeft(TIME_PER_Q);
      startTimeRef.current = Date.now();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setFeedback("timeout");
            setStreak(0);
            setResults((p) => [
              ...p,
              {
                q: qRef.current!.display,
                correct: false,
                userAns: "\u2014",
                answer: qRef.current!.answer,
                time: TIME_PER_Q,
              },
            ]);
            const nextIdx = idx + 1;
            setQIndex(nextIdx);
            feedbackTimeoutRef.current = setTimeout(() => advanceQuestion(nextIdx, sc), 1400);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      setTimeout(() => inputRef.current?.focus(), 60);
    },
    [difficulty, highScore]
  );

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setQIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setResults([]);
    setPhase("playing");
  };

  useEffect(() => {
    if (phase === "playing") advanceQuestion(0, 0);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const submit = () => {
    if (!question || feedback) return;
    clearTimers();
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const userAns = Number(input);
    const correct = userAns === question.answer;
    let newScore = score;
    if (correct) {
      const speedBonus = Math.max(0, Math.round((TIME_PER_Q - elapsed) * 10));
      newScore = score + 100 + speedBonus;
      setScore(newScore);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
      setFeedback("correct");
    } else {
      setStreak(0);
      setFeedback("wrong");
    }
    setResults((p) => [
      ...p,
      {
        q: question.display,
        correct,
        userAns: input || "\u2014",
        answer: question.answer,
        time: Math.round(elapsed * 10) / 10,
      },
    ]);
    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    feedbackTimeoutRef.current = setTimeout(() => advanceQuestion(nextIdx, newScore), 1200);
  };

  /* ─── Menu ─── */
  if (phase === "menu") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          color: "#e2e8f0",
          fontFamily: "sans-serif",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: 32, color: ACCENT, marginBottom: 8 }}>Math Challenge</h1>
        <p style={{ color: "#94a3b8", marginBottom: 32 }}>
          {TOTAL_QUESTIONS} questions. Beat the clock. Earn speed bonuses!
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => startGame(d)}
              style={{
                background: d === "easy" ? SUCCESS : d === "medium" ? ACCENT : DANGER,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "16px 32px",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {d}
            </button>
          ))}
        </div>
        {highScore > 0 && (
          <div style={{ marginTop: 24, color: "#a78bfa", fontSize: 16 }}>High Score: {highScore}</div>
        )}
      </div>
    );
  }

  /* ─── Done ─── */
  if (phase === "done") {
    const correctCount = results.filter((r) => r.correct).length;
    return (
      <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
        <h1 style={{ textAlign: "center", fontSize: 28, color: ACCENT, marginBottom: 8 }}>Results</h1>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20 }}>
          <div style={{ background: CARD, borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>Score</div>
            <div style={{ color: ACCENT, fontSize: 28, fontWeight: 700 }}>{score}</div>
          </div>
          <div style={{ background: CARD, borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>Correct</div>
            <div style={{ color: SUCCESS, fontSize: 28, fontWeight: 700 }}>
              {correctCount}/{TOTAL_QUESTIONS}
            </div>
          </div>
          <div style={{ background: CARD, borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: 12 }}>Best Streak</div>
            <div style={{ color: "#a78bfa", fontSize: 28, fontWeight: 700 }}>{bestStreak}</div>
          </div>
        </div>
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: CARD,
            borderRadius: 12,
            padding: 16,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #1e1e3a",
                fontSize: 14,
                gap: 8,
              }}
            >
              <span style={{ color: r.correct ? SUCCESS : DANGER, width: 20 }}>
                {r.correct ? "\u2713" : "\u2717"}
              </span>
              <span style={{ color: "#94a3b8", flex: 1 }}>{r.q} = </span>
              <span style={{ color: r.correct ? SUCCESS : DANGER, width: 60, textAlign: "right" }}>
                {r.userAns}
              </span>
              <span style={{ color: "#64748b", width: 60, textAlign: "right" }}>({r.answer})</span>
              <span style={{ color: "#64748b", width: 40, textAlign: "right" }}>{r.time}s</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => setPhase("menu")}
            style={{
              background: BTN,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  /* ─── Playing ─── */
  const progress = (Math.min(qIndex, TOTAL_QUESTIONS) / TOTAL_QUESTIONS) * 100;
  const timerPct = (timeLeft / TIME_PER_Q) * 100;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
      {/* Header stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          maxWidth: 500,
          margin: "0 auto 12px",
          fontSize: 14,
        }}
      >
        <span style={{ color: "#64748b" }}>
          Q {Math.min(qIndex + 1, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}
        </span>
        <span style={{ color: ACCENT }}>Score: {score}</span>
        <span style={{ color: "#a78bfa" }}>Streak: {streak}</span>
      </div>

      {/* Progress bar */}
      <div
        style={{ maxWidth: 500, margin: "0 auto 8px", height: 6, background: "#1e1e3a", borderRadius: 3 }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: ACCENT,
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Timer bar */}
      <div
        style={{ maxWidth: 500, margin: "0 auto 24px", height: 6, background: "#1e1e3a", borderRadius: 3 }}
      >
        <div
          style={{
            width: `${timerPct}%`,
            height: "100%",
            background: timeLeft <= 3 ? DANGER : SUCCESS,
            borderRadius: 3,
            transition: "width 1s linear",
          }}
        />
      </div>

      {/* Question */}
      {question && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8, textTransform: "capitalize" }}>
            {difficulty}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 24,
              fontFamily: "monospace",
            }}
          >
            {question.display} = ?
          </div>
          {feedback === "" && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <input
                ref={inputRef}
                type="number"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={{
                  background: "#1e1e3a",
                  color: "#fff",
                  border: `2px solid ${ACCENT}`,
                  borderRadius: 10,
                  padding: "12px 20px",
                  fontSize: 24,
                  width: 160,
                  textAlign: "center",
                  outline: "none",
                  fontFamily: "monospace",
                }}
                autoFocus
              />
              <button
                onClick={submit}
                style={{
                  background: BTN,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontSize: 18,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Submit
              </button>
            </div>
          )}
          {feedback && (
            <div style={{ fontSize: 24, fontWeight: 700, color: feedback === "correct" ? SUCCESS : DANGER, marginTop: 8 }}>
              {feedback === "correct"
                ? "Correct!"
                : feedback === "wrong"
                  ? `Wrong! Answer: ${question.answer}`
                  : `Time's up! Answer: ${question.answer}`}
            </div>
          )}
        </div>
      )}

      {/* Big timer */}
      <div
        style={{
          textAlign: "center",
          fontSize: 48,
          fontWeight: 700,
          color: timeLeft <= 3 ? DANGER : "#334155",
          fontFamily: "monospace",
        }}
      >
        {timeLeft}
      </div>
    </div>
  );
}
