"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const WORD_BANK: string[] = [
  "ABLE","ACID","AGED","ALSO","AREA","ARMY","AWAY","BABY","BACK","BALL","BAND","BANK","BASE","BATH","BEAN","BEAR",
  "BEAT","BEEN","BELL","BELT","BEND","BEST","BIKE","BIRD","BITE","BLOW","BLUE","BOAT","BODY","BOMB","BOND","BONE",
  "BOOK","BOOT","BORN","BOSS","BULK","BURN","BUSH","BUSY","CAFE","CAGE","CAKE","CALL","CALM","CAME","CAMP","CARD",
  "CARE","CASE","CASH","CAST","CAVE","CHIP","CITY","CLUE","COAL","COAT","CODE","COIN","COLD","COME","COOK","COOL",
  "COPE","COPY","CORE","COST","CROP","CURE","DARK","DATA","DATE","DAWN","DEAD","DEAF","DEAL","DEAR","DEBT","DECK",
  "DEEP","DEER","DIET","DIRT","DISC","DISH","DOCK","DOES","DONE","DOOR","DOSE","DOWN","DRAW","DREW","DROP","DRUM",
  "DUAL","DUKE","DUST","DUTY","EACH","EARN","EASE","EAST","EASY","EDGE","ELSE","EMIT","EPIC","EVEN","EVER","EVIL",
  "EXAM","EXIT","FACE","FACT","FADE","FAIL","FAIR","FAKE","FALL","FAME","FARM","FAST","FATE","FEAR","FEED","FEEL",
  "ABSTRACT","ACADEMIC","ACCURATE","ACHIEVED","ACTIVELY","ACTUALLY","ADDITION","ADJUSTED","ADVANCED","AFFORDED",
  "AIRCRAFT","ALPHABET","AMBITION","AMERICAN","ANALYSIS","ANIMATED","ANNOUNCE","ANYTHING","ANYWHERE","APPEALED",
  "APPETITE","APPROACH","APPROVAL","ARGUMENT","ARTISTIC","ASSEMBLY","ASSUMING","ATTACKED","ATTEMPTS","ATTENDED",
  "AUDIENCE","AVOIDING","BACKBONE","BACKWARD","BALANCED","BANKRUPT","BASEMENT","BATHROOM","BECOMING","BEHAVIOR",
  "BELIEVED","BENEFITS","BIRTHDAY","BLEEDING","BLOCKING","BLOSSOMS","BOUNDARY","BRANCHES","BREAKING","BREATHER",
  "BRIDGING","BRIGHTEN","BRINGING","BROTHERS","BROWSING","BRUISING","BUILDING","BURSTING","BUSINESS","CAMPAIGN",
  "CAPABLE","CAPITAL","CAPTAIN","CAPTURE","CAREFUL","CARRIED","CATALOG","CAUTION","CEILING","CENTRAL","CENTURY",
  "CERTAIN","CHAMBER","CHANCES","CHANGED","CHANNEL","CHAPTER","CHARGED","CHARITY","CHECKED","CHICKEN","CHRONIC",
  "CIRCLES","CLAIMED","CLASSIC","CLEANED","CLIMATE","CLOSELY","CLOSURE","CLUSTER","COASTAL","COATING","COLLECT",
  "COLLEGE","COLUMNS","COMBINE","COMFORT","COMMAND","COMMENT","COMPANY","COMPARE","COMPETE","COMPLEX","CONCERN",
  "CONDUCT","CONFIRM","CONNECT","CONSENT","CONSIST","CONTACT","CONTAIN","CONTENT","CONTEST","CONTEXT","CONTROL",
  "CONVERT","COOKING","CORRECT","COUNCIL","COUNTER","COUNTRY","COUPLED","COURAGE","COVERED","CREATED","CREDITS",
  "CRIMINAL","CRITICAL","CROSSING","CULTURAL","CURRENCY","CUSTOMER","CYLINDER","DATABASE","DAUGHTER","DEADLINE",
  "UNIVERSE","UMBRELLA","ULTIMATE","TEACHING","TOGETHER","THINKING","THOUSAND","POWERFUL","PRACTICE","PRECIOUS",
  "PLEASURE","PLATFORM","PLANNING","PHYSICAL","POSSIBLY","POSITION","DISTANCE","DIVISION","DOMESTIC","DOMINANT",
  "ELEPHANT","ELEVATOR","EMERGING","EMISSION","EMPHASIS","EMPLOYEE","ENJOYING","ENORMOUS","ENTIRELY","ENTRANCE",
  "ENVELOPE","EQUATION","EQUIPPED","ESSENTIAL","EVALUATE","EVIDENCE","EXCHANGE","EXCITING","EXERCISE","EXISTING",
  "EXPANDED","EXPECTED","EXPEDITE","EXPLICIT","EXPLORED","EXPOSURE","EXTENDED","EXTERNAL","EXTRACTS","EYEBROWS",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Difficulty = "easy" | "medium" | "hard";
const DIFF_RANGE: Record<Difficulty, [number, number]> = {
  easy: [4, 5],
  medium: [6, 7],
  hard: [8, 12],
};

function getWordsForDifficulty(diff: Difficulty): string[] {
  const [mn, mx] = DIFF_RANGE[diff];
  return WORD_BANK.filter((w) => w.length >= mn && w.length <= mx);
}

function scramble(word: string): string[] {
  let s = shuffle(word.split(""));
  let tries = 0;
  while (s.join("") === word && tries < 20) {
    s = shuffle(word.split(""));
    tries++;
  }
  return s;
}

export default function Anagram() {
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [score, setScore] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [answer, setAnswer] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const [hintUsed, setHintUsed] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickNewWord = useCallback(
    (used: Set<string>) => {
      const pool = getWordsForDifficulty(difficulty).filter((w) => !used.has(w));
      if (pool.length === 0) return false;
      const w = pool[Math.floor(Math.random() * pool.length)];
      setCurrentWord(w);
      setScrambled(scramble(w));
      setSelected([]);
      setAnswer("");
      setHintUsed(false);
      setUsedWords((prev) => new Set([...prev, w]));
      return true;
    },
    [difficulty]
  );

  const startGame = () => {
    setScore(0);
    setWordsCompleted(0);
    setTimeLeft(60);
    setStreak(0);
    setUsedWords(new Set());
    setFlash(null);
    const used = new Set<string>();
    setScreen("play");
    const pool = getWordsForDifficulty(difficulty);
    const w = pool[Math.floor(Math.random() * pool.length)];
    setCurrentWord(w);
    setScrambled(scramble(w));
    setSelected([]);
    setAnswer("");
    setHintUsed(false);
    used.add(w);
    setUsedWords(used);
  };

  useEffect(() => {
    if (screen !== "play") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setScreen("over");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  const handleTileClick = (idx: number) => {
    if (selected.includes(idx)) return;
    const newSel = [...selected, idx];
    setSelected(newSel);
    const newAns = newSel.map((i) => scrambled[i]).join("");
    setAnswer(newAns);

    if (newAns.length === currentWord.length) {
      if (newAns === currentWord) {
        const bonus = hintUsed ? 0 : 5;
        const streakBonus = streak >= 3 ? 10 : streak >= 2 ? 5 : 0;
        const baseScore = currentWord.length * 10;
        setScore((s) => s + baseScore + bonus + streakBonus);
        setWordsCompleted((c) => c + 1);
        setStreak((s) => s + 1);
        setFlash("correct");
        setTimeout(() => {
          setFlash(null);
          pickNewWord(usedWords);
        }, 500);
      } else {
        setStreak(0);
        setFlash("wrong");
        setTimeout(() => {
          setFlash(null);
          setSelected([]);
          setAnswer("");
        }, 600);
      }
    }
  };

  const removeLast = () => {
    if (selected.length === 0) return;
    const newSel = selected.slice(0, -1);
    setSelected(newSel);
    setAnswer(newSel.map((i) => scrambled[i]).join(""));
  };

  const useHint = () => {
    if (hintUsed) return;
    setHintUsed(true);
    const firstLetter = currentWord[0];
    const idx = scrambled.findIndex((l, i) => l === firstLetter && !selected.includes(i));
    if (idx !== -1) {
      const newSel = [idx, ...selected.filter((i) => i !== idx)];
      setSelected(newSel);
      setAnswer(newSel.map((i) => scrambled[i]).join(""));
    }
  };

  const skipWord = () => {
    setStreak(0);
    pickNewWord(usedWords);
  };

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20 }}>
        <h1 style={{ fontSize: 42, marginBottom: 8, color: accent, textShadow: "0 0 20px rgba(0,229,255,0.4)" }}>Anagram Frenzy</h1>
        <p style={{ color: "#aaa", marginBottom: 30, fontSize: 16 }}>Unscramble the letters to form the word!</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 30 }}>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "2px solid",
                borderColor: difficulty === d ? accent : "#333",
                background: difficulty === d ? "rgba(0,229,255,0.15)" : "transparent",
                color: difficulty === d ? accent : "#888", cursor: "pointer",
                fontSize: 15, fontWeight: 600, textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {d} ({DIFF_RANGE[d][0]}-{DIFF_RANGE[d][1]} letters)
            </button>
          ))}
        </div>
        <button
          onClick={startGame}
          style={{
            padding: "14px 48px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${accent}, #7c3aed)`,
            color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,229,255,0.3)",
          }}
        >
          Start Game
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20 }}>
        <h1 style={{ fontSize: 38, color: "#f59e0b", marginBottom: 10 }}>Time's Up!</h1>
        <div style={{ background: card, borderRadius: 16, padding: 30, textAlign: "center", marginBottom: 24, minWidth: 280 }}>
          <p style={{ fontSize: 48, fontWeight: 800, color: accent, margin: "0 0 8px" }}>{score}</p>
          <p style={{ color: "#aaa", margin: 0, fontSize: 14 }}>TOTAL SCORE</p>
          <div style={{ marginTop: 16, fontSize: 18, color: "#ccc" }}>
            Words solved: <span style={{ color: "#22c55e", fontWeight: 700 }}>{wordsCompleted}</span>
          </div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>Difficulty: {difficulty}</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
            Play Again
          </button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>
            Menu
          </button>
        </div>
      </div>
    );
  }

  const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : accent;

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* HUD */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 500, marginBottom: 20 }}>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#888" }}>SCORE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>{score}</div>
        </div>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#888" }}>TIME</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: timerColor }}>{timeLeft}s</div>
        </div>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#888" }}>WORDS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{wordsCompleted}</div>
        </div>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#888" }}>STREAK</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{streak}</div>
        </div>
      </div>

      {/* Flash feedback */}
      {flash && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          padding: "8px 24px", borderRadius: 20,
          background: flash === "correct" ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
          color: "#fff", fontWeight: 700, fontSize: 18, zIndex: 100,
          animation: "fadeIn 0.2s ease",
        }}>
          {flash === "correct" ? "Correct!" : "Wrong!"}
        </div>
      )}

      {/* Answer area */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, minHeight: 56, alignItems: "center" }}>
        {currentWord.split("").map((_, i) => (
          <div
            key={i}
            style={{
              width: 44, height: 50, borderRadius: 8,
              background: answer[i] ? (flash === "correct" ? "#22c55e" : flash === "wrong" ? "#ef4444" : "#7c3aed") : "rgba(255,255,255,0.05)",
              border: `2px solid ${answer[i] ? "transparent" : "#333"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 800, color: "#fff",
              transition: "all 0.2s",
            }}
          >
            {answer[i] || ""}
          </div>
        ))}
      </div>

      {/* Hint display */}
      {hintUsed && (
        <p style={{ color: "#f59e0b", fontSize: 13, margin: "0 0 12px" }}>Hint: The word starts with "{currentWord[0]}"</p>
      )}

      {/* Scrambled tiles */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 24 }}>
        {scrambled.map((letter, i) => {
          const isSelected = selected.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              disabled={isSelected}
              style={{
                width: 50, height: 54, borderRadius: 10, border: "none",
                background: isSelected
                  ? "rgba(255,255,255,0.05)"
                  : "linear-gradient(145deg, #2a2a5a, #1e1e48)",
                color: isSelected ? "#333" : "#fff",
                fontSize: 24, fontWeight: 800, cursor: isSelected ? "default" : "pointer",
                boxShadow: isSelected ? "none" : "0 4px 12px rgba(0,0,0,0.4)",
                transition: "all 0.15s",
                transform: isSelected ? "scale(0.9)" : "scale(1)",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={removeLast}
          disabled={selected.length === 0}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "2px solid #444",
            background: "transparent", color: "#ccc", fontWeight: 600,
            cursor: selected.length === 0 ? "default" : "pointer",
            opacity: selected.length === 0 ? 0.4 : 1, fontSize: 14,
          }}
        >
          Undo
        </button>
        <button
          onClick={() => { setSelected([]); setAnswer(""); }}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "2px solid #555",
            background: "transparent", color: "#ccc", fontWeight: 600,
            cursor: "pointer", fontSize: 14,
          }}
        >
          Clear
        </button>
        <button
          onClick={useHint}
          disabled={hintUsed}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: hintUsed ? "#333" : "#f59e0b",
            color: hintUsed ? "#666" : "#000", fontWeight: 700,
            cursor: hintUsed ? "default" : "pointer", fontSize: 14,
          }}
        >
          {hintUsed ? "Hint Used" : "Hint"}
        </button>
        <button
          onClick={skipWord}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#ef4444", color: "#fff", fontWeight: 700,
            cursor: "pointer", fontSize: 14,
          }}
        >
          Skip
        </button>
      </div>

      <p style={{ color: "#555", fontSize: 12, marginTop: 20 }}>
        {difficulty.toUpperCase()} mode | {currentWord.length} letters
      </p>
    </div>
  );
}
