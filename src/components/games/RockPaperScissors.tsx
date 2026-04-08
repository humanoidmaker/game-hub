"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ───────── types & constants ───────── */
interface Choice {
  name: string;
  emoji: string;
  beats: string[]; // names this choice defeats
}

const STANDARD_CHOICES: Choice[] = [
  { name: "Rock", emoji: "\u270A", beats: ["Scissors"] },
  { name: "Paper", emoji: "\u270B", beats: ["Rock"] },
  { name: "Scissors", emoji: "\u270C\uFE0F", beats: ["Paper"] },
];

const EXTENDED_CHOICES: Choice[] = [
  { name: "Rock", emoji: "\u270A", beats: ["Scissors", "Lizard"] },
  { name: "Paper", emoji: "\u270B", beats: ["Rock", "Spock"] },
  { name: "Scissors", emoji: "\u270C\uFE0F", beats: ["Paper", "Lizard"] },
  { name: "Lizard", emoji: "\uD83E\uDD8E", beats: ["Spock", "Paper"] },
  { name: "Spock", emoji: "\uD83D\uDD96", beats: ["Scissors", "Rock"] },
];

const MAX_ROUNDS = 5;

type RoundResult = "win" | "lose" | "draw";

/* ───────── sound helpers (Web Audio) ───────── */
function playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.18) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playSelectSound() {
  playTone(600, 0.1, "sine", 0.15);
}

function playWinChime() {
  setTimeout(() => playTone(523, 0.15, "sine", 0.2), 0);
  setTimeout(() => playTone(659, 0.15, "sine", 0.2), 150);
  setTimeout(() => playTone(784, 0.25, "sine", 0.2), 300);
}

function playLoseBuzz() {
  playTone(150, 0.35, "sawtooth", 0.12);
}

/* ───────── confetti ───────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
}

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const animId = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(animId.current);
      particles.current = [];
      const cv = canvasRef.current;
      if (cv) {
        const ctx = cv.getContext("2d");
        ctx?.clearRect(0, 0, cv.width, cv.height);
      }
      return;
    }
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    cv.width = cv.offsetWidth;
    cv.height = cv.offsetHeight;

    const colors = ["#f44", "#4f4", "#44f", "#ff4", "#f4f", "#4ff", "#fa4", "#fff"];
    particles.current = Array.from({ length: 120 }, () => ({
      x: cv.width / 2 + (Math.random() - 0.5) * 100,
      y: cv.height * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 10 - 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 3,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    }));

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of particles.current) {
        p.x += p.vx;
        p.vy += 0.18;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, 1 - frame / 120);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (frame < 120) {
        animId.current = requestAnimationFrame(animate);
      }
    };
    animId.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animId.current);
  }, [active]);

  return canvasRef;
}

/* ───────── main component ───────── */
export default function RockPaperScissors() {
  const [extendedMode, setExtendedMode] = useState(false);
  const [scores, setScores] = useState({ you: 0, bot: 0, draw: 0 });
  const [round, setRound] = useState(1);
  const [playerChoice, setPlayerChoice] = useState<number | null>(null);
  const [botChoice, setBotChoice] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [matchOver, setMatchOver] = useState(false);
  const [matchResult, setMatchResult] = useState<string>("");
  const [thinking, setThinking] = useState(false);
  const [thinkingEmoji, setThinkingEmoji] = useState("\u270A");
  const [totalGames, setTotalGames] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<number | null>(null);

  const choices = extendedMode ? EXTENDED_CHOICES : STANDARD_CHOICES;
  const thinkingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const confettiRef = useConfetti(showConfetti);

  const getResult = useCallback(
    (pIdx: number, bIdx: number): RoundResult => {
      if (pIdx === bIdx) return "draw";
      return choices[pIdx].beats.includes(choices[bIdx].name) ? "win" : "lose";
    },
    [choices]
  );

  const play = (choiceIdx: number) => {
    if (matchOver || thinking) return;
    playSelectSound();
    setPlayerChoice(choiceIdx);
    setBotChoice(null);
    setRoundResult(null);
    setThinking(true);

    // cycling animation
    let cycle = 0;
    thinkingInterval.current = setInterval(() => {
      setThinkingEmoji(choices[cycle % choices.length].emoji);
      cycle++;
    }, 100);

    setTimeout(() => {
      if (thinkingInterval.current) clearInterval(thinkingInterval.current);
      const bc = Math.floor(Math.random() * choices.length);
      setBotChoice(bc);
      setThinking(false);

      const result = getResult(choiceIdx, bc);
      setRoundResult(result);

      const ns = { ...scores };
      if (result === "win") ns.you++;
      else if (result === "lose") ns.bot++;
      else ns.draw++;
      setScores(ns);

      if (result === "win") playWinChime();
      else if (result === "lose") playLoseBuzz();
      else playTone(440, 0.15, "triangle", 0.12);

      if (round >= MAX_ROUNDS) {
        setMatchOver(true);
        setTotalGames((g) => g + 1);
        if (ns.you > ns.bot) {
          setMatchResult(`You win the match ${ns.you}\u2013${ns.bot}!`);
          setTotalWins((w) => w + 1);
          setShowConfetti(true);
          playWinChime();
        } else if (ns.bot > ns.you) {
          setMatchResult(`Bot wins the match ${ns.bot}\u2013${ns.you}!`);
          playLoseBuzz();
        } else {
          setMatchResult(`Match drawn ${ns.you}\u2013${ns.bot}!`);
        }
      } else {
        setRound((r) => r + 1);
      }
    }, 1000);
  };

  const reset = () => {
    setScores({ you: 0, bot: 0, draw: 0 });
    setRound(1);
    setPlayerChoice(null);
    setBotChoice(null);
    setRoundResult(null);
    setMatchOver(false);
    setMatchResult("");
    setShowConfetti(false);
  };

  const toggleMode = () => {
    reset();
    setExtendedMode((m) => !m);
  };

  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const resultColor =
    roundResult === "win" ? "#22c55e" : roundResult === "lose" ? "#ef4444" : "#eab308";

  const resultLabel =
    roundResult === "win"
      ? "You win this round!"
      : roundResult === "lose"
      ? "Bot wins this round!"
      : "It\u2019s a draw!";

  /* ───────── styles ───────── */
  const container: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 16px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#e2e8f0",
    position: "relative",
    overflow: "hidden",
    minHeight: 520,
  };

  const title: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 4,
    letterSpacing: "-0.5px",
    background: "linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };

  const modeToggle: React.CSSProperties = {
    fontSize: 12,
    padding: "5px 14px",
    borderRadius: 20,
    border: `1px solid ${extendedMode ? "#a78bfa" : "#475569"}`,
    background: extendedMode ? "rgba(167,139,250,0.15)" : "transparent",
    color: extendedMode ? "#a78bfa" : "#94a3b8",
    cursor: "pointer",
    marginBottom: 16,
    transition: "all .2s",
  };

  const scoreboard: React.CSSProperties = {
    display: "flex",
    gap: 24,
    marginBottom: 6,
    fontSize: 15,
    fontWeight: 600,
  };

  const roundBadge: React.CSSProperties = {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 18,
  };

  const vsArea: React.CSSProperties = {
    display: "flex",
    gap: 32,
    alignItems: "center",
    marginBottom: 14,
    minHeight: 130,
  };

  const choiceBox: React.CSSProperties = {
    textAlign: "center",
    minWidth: 100,
  };

  const emojiLarge: React.CSSProperties = {
    fontSize: 64,
    lineHeight: 1.1,
    transition: "transform .2s",
  };

  const btnStyle = (i: number): React.CSSProperties => ({
    fontSize: 60,
    padding: "14px 22px",
    borderRadius: 16,
    border: hoveredBtn === i ? "2px solid #60a5fa" : "2px solid #334155",
    background: hoveredBtn === i ? "rgba(96,165,250,0.1)" : "#1e293b",
    cursor: thinking ? "not-allowed" : "pointer",
    transition: "all .2s",
    transform: hoveredBtn === i ? "scale(1.1)" : "scale(1)",
    opacity: thinking ? 0.5 : 1,
    lineHeight: 1,
  });

  const btnLabel: React.CSSProperties = {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  };

  const playAgainBtn: React.CSSProperties = {
    marginTop: 18,
    padding: "12px 36px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    transition: "transform .15s",
    boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
  };

  const statsBox: React.CSSProperties = {
    marginTop: 20,
    padding: "10px 20px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid #1e293b",
    fontSize: 13,
    color: "#64748b",
    display: "flex",
    gap: 20,
  };

  const matchBanner: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 4,
    color: matchResult.includes("You win")
      ? "#22c55e"
      : matchResult.includes("Bot")
      ? "#ef4444"
      : "#eab308",
    textShadow: `0 0 20px ${
      matchResult.includes("You win")
        ? "rgba(34,197,94,0.4)"
        : matchResult.includes("Bot")
        ? "rgba(239,68,68,0.4)"
        : "rgba(234,179,8,0.4)"
    }`,
  };

  /* ───────── render ───────── */
  return (
    <div style={container}>
      {/* confetti canvas */}
      <canvas
        ref={confettiRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      <h2 style={title}>
        {extendedMode ? "Rock Paper Scissors Lizard Spock" : "Rock Paper Scissors"}
      </h2>

      <button style={modeToggle} onClick={toggleMode}>
        {extendedMode ? "Standard Mode" : "Extended Mode (Lizard Spock)"}
      </button>

      {/* scoreboard */}
      <div style={scoreboard}>
        <span style={{ color: "#3b82f6" }}>You: {scores.you}</span>
        <span style={{ color: "#94a3b8" }}>Draw: {scores.draw}</span>
        <span style={{ color: "#ef4444" }}>Bot: {scores.bot}</span>
      </div>
      <div style={roundBadge}>
        Round {Math.min(round, MAX_ROUNDS)} / {MAX_ROUNDS}
      </div>

      {/* vs display */}
      {(playerChoice !== null || thinking) && (
        <div style={vsArea}>
          <div style={choiceBox}>
            <div style={emojiLarge}>
              {playerChoice !== null ? choices[playerChoice].emoji : ""}
            </div>
            <div style={{ fontSize: 13, color: "#3b82f6", marginTop: 4, fontWeight: 600 }}>
              You
            </div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#475569" }}>VS</span>
          <div style={choiceBox}>
            <div
              style={{
                ...emojiLarge,
                ...(thinking ? { animation: "none", opacity: 0.6 } : {}),
              }}
            >
              {thinking ? thinkingEmoji : botChoice !== null ? choices[botChoice].emoji : ""}
            </div>
            <div style={{ fontSize: 13, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>
              {thinking ? "Thinking..." : "Bot"}
            </div>
          </div>
        </div>
      )}

      {/* round result */}
      {roundResult && !matchOver && (
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: resultColor,
            marginBottom: 14,
            textShadow: `0 0 12px ${resultColor}44`,
          }}
        >
          {resultLabel}
        </div>
      )}

      {/* match result */}
      {matchOver && (
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={matchBanner}>{matchResult}</div>
        </div>
      )}

      {/* choice buttons */}
      {!matchOver && (
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {choices.map((c, i) => (
            <div key={c.name} style={{ textAlign: "center" }}>
              <button
                onClick={() => play(i)}
                onMouseEnter={() => setHoveredBtn(i)}
                onMouseLeave={() => setHoveredBtn(null)}
                style={btnStyle(i)}
                aria-label={c.name}
                disabled={thinking}
              >
                {c.emoji}
              </button>
              <div style={btnLabel}>{c.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* play again */}
      {matchOver && (
        <button
          onClick={reset}
          style={playAgainBtn}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = "scale(1.05)")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
        >
          Play Again
        </button>
      )}

      {/* stats */}
      {totalGames > 0 && (
        <div style={statsBox}>
          <span>Games: {totalGames}</span>
          <span>Wins: {totalWins}</span>
          <span>Win Rate: {winRate}%</span>
        </div>
      )}
    </div>
  );
}
