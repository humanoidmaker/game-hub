"use client";
import { useState, useCallback, useEffect } from "react";

/* ─────────────────────────────────────────────
   Word Database: 200+ words across 5 categories
   ───────────────────────────────────────────── */
const WORD_DB: Record<string, string[]> = {
  Animals: [
    "elephant","giraffe","dolphin","penguin","cheetah","gorilla","hamster","leopard","panther","buffalo",
    "crocodile","flamingo","gazelle","hedgehog","iguana","jellyfish","kangaroo","lobster","mongoose","narwhal",
    "octopus","parrot","quail","raccoon","salmon","toucan","vulture","walrus","zebra","antelope",
    "badger","camel","donkey","falcon","gecko","heron","impala","jackal","koala","lemur",
    "meerkat","otter","pelican","rabbit","sparrow","turtle","viper","wombat","chameleon","porcupine",
  ],
  Countries: [
    "argentina","australia","brazil","canada","denmark","ethiopia","finland","germany","hungary","iceland",
    "jamaica","kenya","lebanon","malaysia","nigeria","pakistan","romania","sweden","thailand","ukraine",
    "vietnam","zimbabwe","colombia","ecuador","france","greece","honduras","indonesia","jordan","kuwait",
    "lithuania","morocco","nepal","portugal","singapore","tanzania","uruguay","venezuela","ireland","belgium",
    "cambodia","eritrea","guatemala","panama","croatia","egypt","japan","spain","norway","mexico",
  ],
  Technology: [
    "algorithm","bluetooth","compiler","database","ethernet","firmware","graphics","hardware","internet","javascript",
    "keyboard","malware","network","operating","processor","quantum","robotics","software","terminal","virtual",
    "wireless","angular","backend","cybersecurity","debugging","encryption","framework","gateway","hosting","interface",
    "kubernetes","localhost","middleware","nodejs","python","recursion","serverless","typescript","variable","webpack",
    "android","bootstrap","container","devops","endpoint","fullstack","broadband","satellite","analytics","blockchain",
  ],
  Food: [
    "avocado","burrito","chocolate","dumpling","espresso","focaccia","guacamole","hamburger","jambalaya","ketchup",
    "lasagna","macaroni","noodles","omelette","pancake","ravioli","spaghetti","tortilla","vanilla","waffle",
    "baguette","calzone","empanada","falafel","granola","hummus","jalapeno","kebab","lemonade","muffin",
    "nachos","oatmeal","pretzel","quinoa","risotto","smoothie","tiramisu","brownie","croissant","edamame",
    "frittata","gnocchi","brioche","kimchi","linguine","mousse","saffron","zucchini","apricot","caramel",
  ],
  Sports: [
    "baseball","basketball","boxing","cricket","cycling","diving","fencing","football","gymnastics","handball",
    "hockey","javelin","karate","lacrosse","marathon","netball","polo","rowing","sailing","soccer",
    "softball","surfing","swimming","tennis","triathlon","volleyball","wrestling","archery","badminton","bobsled",
    "canoeing","climbing","curling","discus","equestrian","hurdles","judo","kickboxing","pentathlon","skateboarding",
    "snowboard","squash","sprinting","taekwondo","weightlifting","biathlon","dressage","kayaking","rugby","skiing",
  ],
};

const CATEGORIES = Object.keys(WORD_DB);

const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const MAX_WRONG = 7;
const MAX_HINTS = 2;

function pickWord(category: string): string {
  const words = WORD_DB[category];
  return words[Math.floor(Math.random() * words.length)].toUpperCase();
}

/* ─────────────────────────────────────────────
   SVG Hangman Figure with CSS animations
   ───────────────────────────────────────────── */
function HangmanSVG({ wrongCount }: { wrongCount: number }) {
  return (
    <svg width={220} height={260} viewBox="0 0 220 260" style={{ display: "block" }}>
      {/* Gallows */}
      <line x1={20} y1={240} x2={200} y2={240} stroke="#555" strokeWidth={4} strokeLinecap="round" />
      <line x1={60} y1={240} x2={60} y2={20} stroke="#555" strokeWidth={4} strokeLinecap="round" />
      <line x1={58} y1={20} x2={140} y2={20} stroke="#555" strokeWidth={4} strokeLinecap="round" />
      <line x1={140} y1={20} x2={140} y2={50} stroke="#555" strokeWidth={4} strokeLinecap="round" />
      <line x1={60} y1={50} x2={90} y2={20} stroke="#555" strokeWidth={3} strokeLinecap="round" />

      {/* Head */}
      {wrongCount >= 1 && (
        <circle
          cx={140} cy={70} r={20}
          stroke="#ffffff" strokeWidth={3} fill="none"
          className="hangman-part"
        />
      )}
      {/* Body */}
      {wrongCount >= 2 && (
        <line
          x1={140} y1={90} x2={140} y2={155}
          stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
          className="hangman-part"
        />
      )}
      {/* Left arm */}
      {wrongCount >= 3 && (
        <line
          x1={140} y1={108} x2={110} y2={135}
          stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
          className="hangman-part"
        />
      )}
      {/* Right arm */}
      {wrongCount >= 4 && (
        <line
          x1={140} y1={108} x2={170} y2={135}
          stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
          className="hangman-part"
        />
      )}
      {/* Left leg */}
      {wrongCount >= 5 && (
        <line
          x1={140} y1={155} x2={115} y2={195}
          stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
          className="hangman-part"
        />
      )}
      {/* Right leg */}
      {wrongCount >= 6 && (
        <line
          x1={140} y1={155} x2={165} y2={195}
          stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
          className="hangman-part"
        />
      )}
      {/* Death face (7th wrong = game over) */}
      {wrongCount >= 7 && (
        <g className="hangman-part">
          <line x1={132} y1={63} x2={137} y2={68} stroke="#ef4444" strokeWidth={2} />
          <line x1={137} y1={63} x2={132} y2={68} stroke="#ef4444" strokeWidth={2} />
          <line x1={143} y1={63} x2={148} y2={68} stroke="#ef4444" strokeWidth={2} />
          <line x1={148} y1={63} x2={143} y2={68} stroke="#ef4444" strokeWidth={2} />
          <path d="M132,80 Q140,75 148,80" stroke="#ef4444" strokeWidth={2} fill="none" />
        </g>
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Category icons
   ───────────────────────────────────────────── */
function getCategoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    Animals: "🐾",
    Countries: "🌍",
    Technology: "💻",
    Food: "🍕",
    Sports: "⚽",
  };
  return icons[cat] || "📝";
}

/* ─────────────────────────────────────────────
   CSS Keyframes (injected via <style>)
   ───────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes hangmanAppear {
    0% { opacity: 0; transform: translateY(-10px); }
    50% { opacity: 1; transform: translateY(3px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes letterReveal {
    0% { opacity: 0; transform: scale(1.6) translateY(-4px); }
    60% { opacity: 1; transform: scale(0.95) translateY(0); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    15% { transform: translateX(-8px); }
    30% { transform: translateX(7px); }
    45% { transform: translateX(-6px); }
    60% { transform: translateX(5px); }
    75% { transform: translateX(-3px); }
    90% { transform: translateX(2px); }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
    50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.3); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .hangman-part {
    animation: hangmanAppear 0.45s ease-out both;
  }
  .letter-pop {
    animation: letterReveal 0.35s ease-out both;
  }
`;

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export default function Hangman() {
  const [category, setCategory] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrongCount, setWrongCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [shakeWord, setShakeWord] = useState(false);

  /* Physical keyboard support */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        guess(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const startGame = useCallback((cat: string) => {
    setCategory(cat);
    setWord(pickWord(cat));
    setGuessed(new Set());
    setWrongCount(0);
    setHintsUsed(0);
    setGameOver(false);
    setGameWon(false);
    setShakeWord(false);
  }, []);

  const newGame = useCallback(() => {
    if (category) startGame(category);
  }, [category, startGame]);

  const changeCategory = useCallback(() => {
    setCategory(null);
    setWord("");
    setGuessed(new Set());
    setWrongCount(0);
    setHintsUsed(0);
    setGameOver(false);
    setGameWon(false);
  }, []);

  const guess = useCallback(
    (letter: string) => {
      if (gameOver || gameWon || guessed.has(letter)) return;
      const next = new Set(guessed);
      next.add(letter);
      setGuessed(next);

      if (word.includes(letter)) {
        const allFound = word.split("").every((l) => next.has(l));
        if (allFound) {
          const remaining = MAX_WRONG - wrongCount;
          const earned = word.length * 10 + remaining * 15;
          setScore((s) => s + earned);
          setStreak((s) => s + 1);
          setGameWon(true);
        }
      } else {
        const newWrong = wrongCount + 1;
        setWrongCount(newWrong);
        setShakeWord(true);
        setTimeout(() => setShakeWord(false), 500);
        if (newWrong >= MAX_WRONG) {
          setStreak(0);
          setGameOver(true);
        }
      }
    },
    [gameOver, gameWon, guessed, word, wrongCount]
  );

  const useHint = useCallback(() => {
    if (gameOver || gameWon || hintsUsed >= MAX_HINTS) return;
    const unrevealed = [...new Set(word.split(""))].filter((l) => !guessed.has(l));
    if (unrevealed.length === 0) return;
    const hintLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setHintsUsed((h) => h + 1);

    const next = new Set(guessed);
    next.add(hintLetter);
    setGuessed(next);

    const allFound = word.split("").every((l) => next.has(l));
    if (allFound) {
      const remaining = MAX_WRONG - wrongCount;
      const earned = word.length * 10 + remaining * 15;
      setScore((s) => s + earned);
      setStreak((s) => s + 1);
      setGameWon(true);
    }
  }, [gameOver, gameWon, hintsUsed, word, guessed, wrongCount]);

  /* ── Category Selection Screen ── */
  if (!category) {
    return (
      <div style={containerStyle}>
        <style>{KEYFRAMES}</style>
        <h1 style={titleStyle}>Hangman</h1>
        <p style={{ color: "#9ca3af", fontSize: 16, marginBottom: 36, marginTop: 0 }}>
          Choose a category to begin
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            maxWidth: 580,
            width: "100%",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => startGame(cat)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "22px 12px",
                background: "#111127",
                border: "1px solid #2a2a4a",
                borderRadius: 14,
                cursor: "pointer",
                color: "#fff",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#6366f1";
                e.currentTarget.style.borderColor = "#818cf8";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#111127";
                e.currentTarget.style.borderColor = "#2a2a4a";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: 30 }}>{getCategoryIcon(cat)}</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{cat}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {WORD_DB[cat].length} words
              </span>
            </button>
          ))}
        </div>

        {score > 0 && (
          <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 28 }}>
            Total Score:{" "}
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>{score}</span>
          </p>
        )}
      </div>
    );
  }

  /* ── Game Screen ── */
  const wordLetters = word.split("");

  return (
    <div style={containerStyle}>
      <style>{KEYFRAMES}</style>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: 540,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={changeCategory}
            style={{
              background: "none",
              border: "1px solid #333",
              color: "#9ca3af",
              padding: "5px 14px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
          <span
            style={{
              background: "#1a1a3a",
              padding: "4px 14px",
              borderRadius: 20,
              fontSize: 13,
              color: "#818cf8",
              fontWeight: 600,
              border: "1px solid #6366f133",
            }}
          >
            {getCategoryIcon(category)} {category}
          </span>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ textAlign: "center" }}>
            <div style={statLabelStyle}>Score</div>
            <div style={{ color: "#fbbf24", fontSize: 18, fontWeight: 700 }}>{score}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={statLabelStyle}>Streak</div>
            <div style={{ color: streak > 0 ? "#f97316" : "#555", fontSize: 18, fontWeight: 700 }}>
              {streak > 0 ? `${streak}` : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hangman SVG ── */}
      <div
        style={{
          background: "#0d0d24",
          borderRadius: 16,
          padding: "10px 24px",
          marginBottom: 12,
          border: "1px solid #1e1e3a",
        }}
      >
        <HangmanSVG wrongCount={wrongCount} />
      </div>

      {/* ── Wrong Guess Indicator ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 18,
        }}
      >
        {Array.from({ length: MAX_WRONG }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: i < wrongCount ? "#ef4444" : "#1e1e3a",
              border: `2px solid ${i < wrongCount ? "#ef4444" : "#333"}`,
              transition: "all 0.3s ease",
            }}
          />
        ))}
        <span style={{ color: "#666", fontSize: 13, marginLeft: 6 }}>
          {MAX_WRONG - wrongCount} left
        </span>
      </div>

      {/* ── Word Display ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          animation: shakeWord ? "shake 0.5s ease-in-out" : "none",
        }}
      >
        {wordLetters.map((letter, i) => {
          const revealed = guessed.has(letter);
          const showOnLoss = gameOver && !revealed;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span
                className={revealed ? "letter-pop" : undefined}
                style={{
                  width: 34,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  fontWeight: 700,
                  color: showOnLoss ? "#ef4444" : revealed ? "#ffffff" : "transparent",
                  transition: "color 0.3s ease",
                }}
              >
                {revealed || gameOver ? letter : "\u00A0"}
              </span>
              <div
                style={{
                  width: 28,
                  height: 3,
                  borderRadius: 2,
                  background: revealed ? "#22c55e" : showOnLoss ? "#ef4444" : "#3a3a5a",
                  transition: "background 0.3s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── Result Banner ── */}
      {gameWon && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 18,
            padding: "14px 30px",
            background: "linear-gradient(135deg, #064e3b, #065f46)",
            borderRadius: 14,
            border: "1px solid rgba(34, 197, 94, 0.3)",
            animation: "slideUp 0.4s ease-out",
          }}
        >
          <div style={{ color: "#22c55e", fontSize: 24, fontWeight: 800 }}>You Won!</div>
          <div style={{ color: "#a7f3d0", fontSize: 14, marginTop: 4 }}>
            +{word.length * 10 + (MAX_WRONG - wrongCount) * 15} points
          </div>
        </div>
      )}
      {gameOver && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 18,
            padding: "14px 30px",
            background: "linear-gradient(135deg, #450a0a, #7f1d1d)",
            borderRadius: 14,
            border: "1px solid rgba(239, 68, 68, 0.3)",
            animation: "slideUp 0.4s ease-out",
          }}
        >
          <div style={{ color: "#ef4444", fontSize: 24, fontWeight: 800 }}>Game Over</div>
          <div style={{ color: "#fca5a5", fontSize: 14, marginTop: 4 }}>
            The word was: <span style={{ fontWeight: 700, letterSpacing: 2 }}>{word}</span>
          </div>
        </div>
      )}

      {/* ── On-Screen QWERTY Keyboard ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
        }}
      >
        {QWERTY_ROWS.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 5 }}>
            {row.map((letter) => {
              const isGuessed = guessed.has(letter);
              const isCorrect = isGuessed && word.includes(letter);
              const isWrong = isGuessed && !word.includes(letter);
              const disabled = isGuessed || gameOver || gameWon;

              let bg = "#1a1a3a";
              let fg = "#ccc";
              let borderColor = "#2a2a4a";
              if (isCorrect) {
                bg = "#14532d";
                fg = "#22c55e";
                borderColor = "#22c55e44";
              }
              if (isWrong) {
                bg = "#450a0a";
                fg = "#ef4444";
                borderColor = "#ef444444";
              }

              return (
                <button
                  key={letter}
                  onClick={() => guess(letter)}
                  disabled={disabled}
                  style={{
                    width: 38,
                    height: 44,
                    borderRadius: 8,
                    border: `1px solid ${borderColor}`,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: disabled ? "default" : "pointer",
                    background: bg,
                    color: fg,
                    opacity: isGuessed ? 0.65 : 1,
                    transition: "all 0.15s ease",
                    transform: isGuessed ? "scale(0.93)" : "scale(1)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = "#2d2d5a";
                      e.currentTarget.style.transform = "scale(1.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled) {
                      e.currentTarget.style.background = bg;
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {!gameOver && !gameWon && (
          <button
            onClick={useHint}
            disabled={hintsUsed >= MAX_HINTS}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "1px solid #f59e0b44",
              background: hintsUsed >= MAX_HINTS ? "#1a1a2e" : "#1a1a3a",
              color: hintsUsed >= MAX_HINTS ? "#555" : "#f59e0b",
              fontSize: 14,
              fontWeight: 600,
              cursor: hintsUsed >= MAX_HINTS ? "default" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            Hint ({MAX_HINTS - hintsUsed} left)
          </button>
        )}
        <button
          onClick={newGame}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: "none",
            background: "#6366f1",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#4f46e5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#6366f1";
          }}
        >
          New Game
        </button>
        <button
          onClick={changeCategory}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "1px solid #6366f144",
            background: "transparent",
            color: "#818cf8",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#1a1a3a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Change Category
        </button>
      </div>
    </div>
  );
}

/* ─── Shared Inline Styles ─── */
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a1a",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "28px 16px",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  color: "#ffffff",
};

const titleStyle: React.CSSProperties = {
  fontSize: 38,
  fontWeight: 800,
  marginBottom: 4,
  marginTop: 0,
  background: "linear-gradient(135deg, #818cf8, #6366f1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  letterSpacing: -0.5,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#555",
  textTransform: "uppercase",
  letterSpacing: 1,
};
