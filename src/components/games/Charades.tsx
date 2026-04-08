"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const WORD_BANK: Record<string, string[]> = {
  Movies: [
    "Titanic","Jurassic Park","The Matrix","Avengers","Frozen","Finding Nemo","Batman","Spider-Man","Star Wars",
    "Harry Potter","Inception","Forrest Gump","The Lion King","Shrek","Toy Story","Jaws","Rocky","Gladiator",
    "Avatar","Interstellar","Gravity","Up","Coco","Moana","Ratatouille","Inside Out","Wall-E","Aladdin",
    "Mulan","Bambi","Dumbo","Pinocchio","Cinderella","Tarzan","Hercules","Zootopia","Cars","Brave",
  ],
  Animals: [
    "Elephant","Penguin","Kangaroo","Giraffe","Monkey","Snake","Butterfly","Eagle","Dolphin","Octopus",
    "Chameleon","Peacock","Flamingo","Gorilla","Crocodile","Seahorse","Porcupine","Lobster","Jellyfish","Parrot",
    "Tiger","Cheetah","Koala","Panda","Sloth","Hummingbird","Ostrich","Walrus","Rhinoceros","Hedgehog",
    "Armadillo","Platypus","Iguana","Starfish","Turtle","Frog","Owl","Swan","Woodpecker","Crab",
  ],
  Actions: [
    "Swimming","Dancing","Cooking","Painting","Climbing","Fishing","Skiing","Surfing","Juggling","Boxing",
    "Wrestling","Skipping","Rowing","Archery","Fencing","Bowling","Skateboarding","Sneezing","Yawning","Laughing",
    "Crying","Singing","Whistling","Clapping","Waving","Running","Jumping","Crawling","Sliding","Spinning",
    "Stretching","Typing","Writing","Drawing","Knitting","Gardening","Vacuuming","Ironing","Sweeping","Mopping",
  ],
  Objects: [
    "Umbrella","Telescope","Guitar","Microphone","Camera","Bicycle","Scissors","Ladder","Hammer","Piano",
    "Balloon","Candle","Mirror","Pillow","Toothbrush","Compass","Magnifying Glass","Binoculars","Parachute","Trampoline",
    "Chainsaw","Wheelbarrow","Typewriter","Gramophone","Sundial","Hourglass","Kaleidoscope","Periscope","Boomerang","Slingshot",
    "Paintbrush","Flashlight","Thermometer","Stethoscope","Wrench","Screwdriver","Blender","Toaster","Funnel","Plunger",
  ],
  Professions: [
    "Doctor","Firefighter","Chef","Astronaut","Detective","Magician","Pilot","Barber","Dentist","Plumber",
    "Electrician","Teacher","Librarian","Judge","Farmer","Mechanic","Sailor","Lifeguard","Surgeon","Veterinarian",
    "Architect","Photographer","Musician","Sculptor","Baker","Butcher","Carpenter","Miner","Tailor","Locksmith",
  ],
  Sports: [
    "Basketball","Tennis","Swimming","Gymnastics","Hockey","Baseball","Golf","Volleyball","Badminton","Cricket",
    "Rugby","Boxing","Wrestling","Fencing","Archery","Weightlifting","Skating","Snowboarding","Surfing","Kayaking",
    "Diving","Polo","Lacrosse","Squash","Table Tennis","Darts","Bowling","Cycling","Running","Javelin",
  ],
};

const ALL_CATEGORIES = Object.keys(WORD_BANK);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PlayerScore {
  name: string;
  score: number;
}

export default function Charades() {
  const [screen, setScreen] = useState<"setup" | "ready" | "play" | "roundEnd" | "gameOver">("setup");
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [currentCategory, setCurrentCategory] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [roundScore, setRoundScore] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickWord = useCallback((used: Set<string>) => {
    const cats = Array.from(selectedCategories);
    const available: { word: string; cat: string }[] = [];
    for (const cat of cats) {
      for (const word of WORD_BANK[cat]) {
        if (!used.has(word)) available.push({ word, cat });
      }
    }
    if (available.length === 0) return null;
    const pick = available[Math.floor(Math.random() * available.length)];
    return pick;
  }, [selectedCategories]);

  const nextWord = useCallback(() => {
    const pick = pickWord(usedWords);
    if (pick) {
      setCurrentWord(pick.word);
      setCurrentCategory(pick.cat);
      setUsedWords((u) => new Set([...u, pick.word]));
    }
  }, [pickWord, usedWords]);

  const addPlayer = () => {
    const name = nameInput.trim();
    if (name && players.length < 6 && !players.some((p) => p.name === name)) {
      setPlayers([...players, { name, score: 0 }]);
      setNameInput("");
    }
  };

  const startGame = () => {
    if (players.length < 2) return;
    setRound(1);
    setCurrentPlayerIdx(0);
    setUsedWords(new Set());
    setPlayers(players.map((p) => ({ ...p, score: 0 })));
    showReady(0);
  };

  const showReady = (playerIdx: number) => {
    setCurrentPlayerIdx(playerIdx);
    const pick = pickWord(usedWords);
    if (pick) {
      setCurrentWord(pick.word);
      setCurrentCategory(pick.cat);
      setUsedWords((u) => new Set([...u, pick.word]));
    }
    setRoundScore(0);
    setSkipped(0);
    setTimeLeft(60);
    setScreen("ready");
  };

  const startTurn = () => {
    setScreen("play");
  };

  useEffect(() => {
    if (screen !== "play") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setScreen("roundEnd");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  const handleCorrect = () => {
    setRoundScore((s) => s + 1);
    setPlayers((prev) => prev.map((p, i) => i === currentPlayerIdx ? { ...p, score: p.score + 1 } : p));
    nextWord();
  };

  const handleSkip = () => {
    setSkipped((s) => s + 1);
    nextWord();
  };

  const endTurn = () => {
    const nextPlayer = (currentPlayerIdx + 1) % players.length;
    const nextRound = nextPlayer === 0 ? round + 1 : round;
    if (nextRound > totalRounds) {
      setScreen("gameOver");
    } else {
      setRound(nextRound);
      showReady(nextPlayer);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const cardBg = "#141430";

  if (screen === "setup") {
    return (
      <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20, justifyContent: "center" }}>
        <h1 style={{ fontSize: 40, color: accent, marginBottom: 20 }}>Charades</h1>

        {/* Add players */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 20, width: 340, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", color: "#ccc", fontSize: 15 }}>Players (2-6)</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Enter name..."
              maxLength={15}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "2px solid #333", background: "#0d0d24", color: "#fff", fontSize: 14, outline: "none" }}
            />
            <button
              onClick={addPlayer}
              disabled={players.length >= 6}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}
            >
              Add
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {players.map((p, i) => (
              <span
                key={i}
                style={{ background: "#2a2a5a", borderRadius: 6, padding: "4px 10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
              >
                {p.name}
                <span
                  onClick={() => setPlayers(players.filter((_, j) => j !== i))}
                  style={{ cursor: "pointer", color: "#ef4444", fontWeight: 700 }}
                >x</span>
              </span>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 20, width: 340, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px", color: "#ccc", fontSize: 15 }}>Categories</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  border: "2px solid",
                  borderColor: selectedCategories.has(cat) ? accent : "#333",
                  background: selectedCategories.has(cat) ? "rgba(0,229,255,0.1)" : "transparent",
                  color: selectedCategories.has(cat) ? accent : "#666",
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rounds */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 20, width: 340, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", color: "#ccc", fontSize: 15 }}>Rounds per player</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setTotalRounds(r)}
                style={{
                  width: 40, height: 40, borderRadius: 8,
                  border: "2px solid", borderColor: totalRounds === r ? accent : "#333",
                  background: totalRounds === r ? "rgba(0,229,255,0.1)" : "transparent",
                  color: totalRounds === r ? accent : "#666", fontWeight: 700,
                  cursor: "pointer", fontSize: 16,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={players.length < 2}
          style={{
            padding: "14px 48px", borderRadius: 12, border: "none",
            background: players.length >= 2 ? `linear-gradient(135deg, ${accent}, #7c3aed)` : "#333",
            color: players.length >= 2 ? "#fff" : "#666",
            fontSize: 18, fontWeight: 700, cursor: players.length >= 2 ? "pointer" : "default",
          }}
        >
          Start Game
        </button>
      </div>
    );
  }

  if (screen === "ready") {
    return (
      <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>Round {round} of {totalRounds}</div>
        <h2 style={{ fontSize: 28, color: accent, marginBottom: 20 }}>{players[currentPlayerIdx].name}'s Turn</h2>
        <p style={{ color: "#aaa", marginBottom: 24, textAlign: "center" }}>
          Get ready to act! Other players will guess.<br />
          Don't let anyone see the screen.
        </p>
        <button
          onClick={startTurn}
          style={{
            padding: "16px 48px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, #22c55e, #16a34a)`,
            color: "#fff", fontSize: 22, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
          }}
        >
          Show Word & Start!
        </button>
      </div>
    );
  }

  if (screen === "play") {
    const timerColor = timeLeft <= 10 ? "#ef4444" : timeLeft <= 20 ? "#f59e0b" : accent;
    return (
      <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ fontSize: 13, color: "#888" }}>{players[currentPlayerIdx].name}'s turn | Round {round}</div>
        <div style={{ fontSize: 14, color: "#7c3aed", marginBottom: 12, fontWeight: 600 }}>{currentCategory}</div>

        {/* Timer */}
        <div style={{ fontSize: 56, fontWeight: 900, color: timerColor, marginBottom: 16 }}>{timeLeft}</div>

        {/* Word */}
        <div style={{
          background: cardBg, borderRadius: 16, padding: "24px 40px", marginBottom: 24,
          border: "2px solid #2a2a5a", textAlign: "center",
        }}>
          <p style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: 0 }}>{currentWord}</p>
        </div>

        <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>
          Correct: <span style={{ color: "#22c55e", fontWeight: 700 }}>{roundScore}</span> | Skipped: <span style={{ color: "#f59e0b" }}>{skipped}</span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleCorrect}
            style={{
              padding: "14px 40px", borderRadius: 12, border: "none",
              background: "#22c55e", color: "#fff", fontSize: 18, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
            }}
          >
            Correct!
          </button>
          <button
            onClick={handleSkip}
            style={{
              padding: "14px 32px", borderRadius: 12, border: "2px solid #f59e0b",
              background: "transparent", color: "#f59e0b", fontSize: 16, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (screen === "roundEnd") {
    return (
      <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <h2 style={{ color: "#f59e0b", fontSize: 28, marginBottom: 8 }}>Time's Up!</h2>
        <p style={{ color: "#ccc", fontSize: 18 }}>{players[currentPlayerIdx].name} scored <span style={{ color: "#22c55e", fontWeight: 800 }}>{roundScore}</span> points</p>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 20 }}>Skipped: {skipped}</p>

        {/* Scoreboard */}
        <div style={{ background: cardBg, borderRadius: 12, padding: 16, width: 300, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", color: "#888", fontSize: 14 }}>SCOREBOARD</h3>
          {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1a3a" }}>
              <span style={{ color: i === 0 ? "#ffd700" : "#ccc" }}>{i + 1}. {p.name}</span>
              <span style={{ color: accent, fontWeight: 700 }}>{p.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={endTurn}
          style={{
            padding: "14px 40px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${accent}, #7c3aed)`,
            color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
          }}
        >
          Next Turn
        </button>
      </div>
    );
  }

  // gameOver
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <h1 style={{ fontSize: 38, color: "#ffd700", marginBottom: 20 }}>Game Over!</h1>

      <div style={{ background: cardBg, borderRadius: 16, padding: 24, width: 320, marginBottom: 24 }}>
        {sorted.map((p, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: i < sorted.length - 1 ? "1px solid #1a1a3a" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#333",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: i < 3 ? "#000" : "#888",
              }}>
                {i + 1}
              </span>
              <span style={{ color: i === 0 ? "#ffd700" : "#ccc", fontWeight: i === 0 ? 700 : 400, fontSize: 16 }}>
                {p.name}
              </span>
            </div>
            <span style={{ color: accent, fontWeight: 800, fontSize: 20 }}>{p.score}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>
          Play Again
        </button>
        <button onClick={() => setScreen("setup")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>
          New Game
        </button>
      </div>
    </div>
  );
}
