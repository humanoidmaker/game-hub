"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Question { q: string; options: string[]; correct: number; category: string }

const QUESTIONS: Question[] = [
  { q: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1, category: "Science" },
  { q: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2, category: "Geography" },
  { q: "Who painted the Mona Lisa?", options: ["Picasso", "Van Gogh", "Da Vinci", "Rembrandt"], correct: 2, category: "History" },
  { q: "What is the smallest prime number?", options: ["0", "1", "2", "3"], correct: 2, category: "Science" },
  { q: "Which country hosted the 2016 Olympics?", options: ["China", "UK", "Brazil", "Japan"], correct: 2, category: "Sports" },
  { q: "What does CPU stand for?", options: ["Central Processing Unit", "Central Program Utility", "Computer Personal Unit", "Central Processor Upgrade"], correct: 0, category: "Tech" },
  { q: "Who discovered gravity?", options: ["Einstein", "Newton", "Galileo", "Hawking"], correct: 1, category: "Science" },
  { q: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2, category: "Geography" },
  { q: "Which sport uses a shuttlecock?", options: ["Tennis", "Badminton", "Squash", "Table Tennis"], correct: 1, category: "Sports" },
  { q: "What year did the Titanic sink?", options: ["1910", "1912", "1914", "1920"], correct: 1, category: "History" },
  { q: "What does HTML stand for?", options: ["HyperText Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Logic", "Home Tool Markup Language"], correct: 0, category: "Tech" },
  { q: "Which gas do plants absorb?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2, category: "Science" },
  { q: "What is the longest river in the world?", options: ["Amazon", "Nile", "Mississippi", "Yangtze"], correct: 1, category: "Geography" },
  { q: "Who wrote Romeo and Juliet?", options: ["Dickens", "Shakespeare", "Austen", "Tolstoy"], correct: 1, category: "History" },
  { q: "In which sport is the term 'love' used for zero?", options: ["Cricket", "Tennis", "Golf", "Badminton"], correct: 1, category: "Sports" },
  { q: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2, category: "Science" },
  { q: "Which company created the iPhone?", options: ["Samsung", "Google", "Apple", "Microsoft"], correct: 2, category: "Tech" },
  { q: "Mount Everest is in which mountain range?", options: ["Andes", "Alps", "Rockies", "Himalayas"], correct: 3, category: "Geography" },
  { q: "Who was the first person to walk on the Moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], correct: 1, category: "History" },
  { q: "How many players are on a soccer team?", options: ["9", "10", "11", "12"], correct: 2, category: "Sports" },
  { q: "What is the hardest natural substance?", options: ["Gold", "Iron", "Diamond", "Platinum"], correct: 2, category: "Science" },
  { q: "What does RAM stand for?", options: ["Random Access Memory", "Read And Modify", "Rapid Application Module", "Run All Memory"], correct: 0, category: "Tech" },
  { q: "Which country has the most population?", options: ["USA", "India", "China", "Indonesia"], correct: 1, category: "Geography" },
  { q: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2, category: "History" },
  { q: "What sport does Usain Bolt play?", options: ["Swimming", "Track & Field", "Basketball", "Soccer"], correct: 1, category: "Sports" },
  { q: "What is the speed of light (approx)?", options: ["300,000 m/s", "300,000 km/s", "30,000 km/s", "3,000,000 km/s"], correct: 1, category: "Science" },
  { q: "Who founded Microsoft?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Jeff Bezos"], correct: 1, category: "Tech" },
  { q: "Which desert is the largest?", options: ["Sahara", "Antarctic", "Gobi", "Arabian"], correct: 1, category: "Geography" },
  { q: "Who invented the telephone?", options: ["Edison", "Bell", "Tesla", "Marconi"], correct: 1, category: "History" },
  { q: "How many Grand Slams are there in tennis?", options: ["3", "4", "5", "6"], correct: 1, category: "Sports" },
  { q: "Water is made of which elements?", options: ["H and He", "H and O", "O and N", "H and N"], correct: 1, category: "Science" },
  { q: "What does URL stand for?", options: ["Uniform Resource Locator", "Universal Routing Link", "Unified Resource Layer", "Universal Reference Locator"], correct: 0, category: "Tech" },
  { q: "Which is the smallest continent?", options: ["Europe", "Antarctica", "Australia", "South America"], correct: 2, category: "Geography" },
  { q: "Who was the first US president?", options: ["Lincoln", "Jefferson", "Washington", "Adams"], correct: 2, category: "History" },
  { q: "In cricket, how many runs is a six worth?", options: ["4", "5", "6", "7"], correct: 2, category: "Sports" },
  { q: "What planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars", "Earth"], correct: 1, category: "Science" },
  { q: "What language is Android primarily written in?", options: ["Python", "Java/Kotlin", "Swift", "C#"], correct: 1, category: "Tech" },
  { q: "Which African country was never colonized?", options: ["Nigeria", "Ethiopia", "Kenya", "Ghana"], correct: 1, category: "History" },
  { q: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Nagoya"], correct: 2, category: "Geography" },
  { q: "Who holds the record for most Olympic gold medals?", options: ["Usain Bolt", "Michael Phelps", "Carl Lewis", "Mark Spitz"], correct: 1, category: "Sports" },
  { q: "What is the boiling point of water in Celsius?", options: ["90", "100", "110", "120"], correct: 1, category: "Science" },
  { q: "Who created Python programming language?", options: ["James Gosling", "Guido van Rossum", "Dennis Ritchie", "Bjarne Stroustrup"], correct: 1, category: "Tech" },
  { q: "Machu Picchu is located in which country?", options: ["Bolivia", "Peru", "Ecuador", "Colombia"], correct: 1, category: "Geography" },
  { q: "The Great Wall of China was built primarily to defend against?", options: ["Japanese", "Mongols", "Koreans", "Indians"], correct: 1, category: "History" },
  { q: "How many holes are in a standard golf course?", options: ["9", "12", "18", "24"], correct: 2, category: "Sports" },
  { q: "What gas makes up most of Earth's atmosphere?", options: ["Oxygen", "Nitrogen", "CO2", "Argon"], correct: 1, category: "Science" },
  { q: "What does GPU stand for?", options: ["General Processing Unit", "Graphics Processing Unit", "Global Program Utility", "Graphical Pixel Unit"], correct: 1, category: "Tech" },
  { q: "Which river flows through London?", options: ["Seine", "Rhine", "Thames", "Danube"], correct: 2, category: "Geography" },
  { q: "Who wrote the theory of relativity?", options: ["Newton", "Bohr", "Einstein", "Planck"], correct: 2, category: "Science" },
  { q: "In which year was the first FIFA World Cup?", options: ["1926", "1928", "1930", "1934"], correct: 2, category: "Sports" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export default function TriviaBattle() {
  const [phase, setPhase] = useState<"setup" | "playing" | "result">("setup");
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [turn, setTurn] = useState(0); // 0 = P1, 1 = P2
  const [scores, setScores] = useState([0, 0]);
  const [timer, setTimer] = useState(15);
  const [answered, setAnswered] = useState<number | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    const qs = shuffleArray(QUESTIONS).slice(0, 10);
    setQuestions(qs);
    setQIdx(0);
    setTurn(0);
    setScores([0, 0]);
    setPhase("playing");
    setTimer(15);
    setAnswered(null);
    setShowCorrect(false);
  }, []);

  useEffect(() => {
    if (phase !== "playing" || answered !== null) return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { setShowCorrect(true); setAnswered(-1); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, qIdx, answered]);

  const answer = (idx: number) => {
    if (answered !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(idx);
    setShowCorrect(true);
    if (idx === questions[qIdx].correct) {
      setScores(prev => { const n = [...prev]; n[turn] += 10; return n; });
    }
  };

  const nextQuestion = () => {
    if (qIdx >= 9) { setPhase("result"); return; }
    setQIdx(q => q + 1);
    setTurn(t => 1 - t);
    setTimer(15);
    setAnswered(null);
    setShowCorrect(false);
  };

  const currentQ = questions[qIdx];
  const currentPlayer = turn === 0 ? p1Name : p2Name;
  const catColors: Record<string, string> = { Science: "#4ecdc4", History: "#ffd700", Sports: "#ff6b6b", Tech: "#a855f7", Geography: "#22c55e" };

  if (phase === "setup") {
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0" }}>
        <h1 style={{ color: "#ffd700", fontSize: "32px", marginBottom: "4px" }}>Trivia Battle</h1>
        <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>2-Player Quiz on the same device</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          <input value={p1Name} onChange={e => setP1Name(e.target.value)} placeholder="Player 1 name" style={{ padding: "10px 16px", background: "#1a1a3a", border: "1px solid #333", borderRadius: "8px", color: "#4ecdc4", fontSize: "14px", outline: "none", width: "220px" }} />
          <input value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="Player 2 name" style={{ padding: "10px 16px", background: "#1a1a3a", border: "1px solid #333", borderRadius: "8px", color: "#ff6b6b", fontSize: "14px", outline: "none", width: "220px" }} />
        </div>
        <button onClick={startGame} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Start</button>
      </div>
    );
  }

  if (phase === "result") {
    const winner = scores[0] > scores[1] ? p1Name : scores[1] > scores[0] ? p2Name : "Nobody";
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0" }}>
        <h2 style={{ color: "#ffd700", fontSize: "28px", marginBottom: "20px" }}>Game Over!</h2>
        <div style={{ display: "flex", gap: "40px", marginBottom: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#4ecdc4" }}>{p1Name}</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: scores[0] >= scores[1] ? "#ffd700" : "#888" }}>{scores[0]}</div>
          </div>
          <div style={{ fontSize: "24px", color: "#555", alignSelf: "center" }}>vs</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#ff6b6b" }}>{p2Name}</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: scores[1] >= scores[0] ? "#ffd700" : "#888" }}>{scores[1]}</div>
          </div>
        </div>
        <p style={{ fontSize: "18px", color: winner === "Nobody" ? "#888" : "#ffd700", marginBottom: "20px" }}>
          {winner === "Nobody" ? "It's a tie!" : `${winner} wins!`}
        </p>
        <button onClick={() => setPhase("setup")} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Play Again</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "400px", marginBottom: "16px" }}>
        <div style={{ textAlign: "center", padding: "8px 16px", borderRadius: "10px", background: turn === 0 ? "#4ecdc422" : "transparent", border: turn === 0 ? "2px solid #4ecdc4" : "2px solid transparent" }}>
          <div style={{ fontSize: "12px", color: "#4ecdc4" }}>{p1Name}</div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{scores[0]}</div>
        </div>
        <div style={{ textAlign: "center", alignSelf: "center" }}>
          <div style={{ fontSize: "12px", color: "#888" }}>Q{qIdx + 1}/10</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: timer <= 5 ? "#ff6b6b" : "#ffd700" }}>{timer}</div>
        </div>
        <div style={{ textAlign: "center", padding: "8px 16px", borderRadius: "10px", background: turn === 1 ? "#ff6b6b22" : "transparent", border: turn === 1 ? "2px solid #ff6b6b" : "2px solid transparent" }}>
          <div style={{ fontSize: "12px", color: "#ff6b6b" }}>{p2Name}</div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{scores[1]}</div>
        </div>
      </div>

      {/* Current player */}
      <div style={{ padding: "6px 16px", borderRadius: "15px", background: turn === 0 ? "#4ecdc433" : "#ff6b6b33", color: turn === 0 ? "#4ecdc4" : "#ff6b6b", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>
        {currentPlayer}&apos;s turn
      </div>

      {/* Category */}
      {currentQ && (
        <span style={{ padding: "4px 12px", borderRadius: "10px", background: (catColors[currentQ.category] || "#888") + "22", color: catColors[currentQ.category] || "#888", fontSize: "11px", marginBottom: "12px" }}>{currentQ.category}</span>
      )}

      {/* Question */}
      {currentQ && (
        <div style={{ background: "#0d0d2a", borderRadius: "12px", padding: "20px", maxWidth: "400px", width: "100%", marginBottom: "16px" }}>
          <p style={{ fontSize: "16px", lineHeight: 1.5, textAlign: "center", margin: 0 }}>{currentQ.q}</p>
        </div>
      )}

      {/* Options */}
      {currentQ && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px", width: "100%", marginBottom: "16px" }}>
          {currentQ.options.map((opt, i) => {
            let bg = "#1a1a3a";
            let border = "1px solid #333";
            let color = "#e0e0e0";
            if (showCorrect) {
              if (i === currentQ.correct) { bg = "#1a3a1a"; border = "2px solid #4ecdc4"; color = "#4ecdc4"; }
              else if (i === answered) { bg = "#3a1a1a"; border = "2px solid #ff6b6b"; color = "#ff6b6b"; }
            } else if (answered === i) { bg = "#2a2a4a"; border = "2px solid #ffd700"; }
            return (
              <button key={i} onClick={() => answer(i)} disabled={answered !== null} style={{ padding: "12px 16px", background: bg, border, borderRadius: "10px", color, fontSize: "14px", cursor: answered !== null ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                <span style={{ fontWeight: 600, marginRight: "8px", color: "#888" }}>{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback & next */}
      {showCorrect && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: answered === currentQ.correct ? "#4ecdc4" : "#ff6b6b", fontSize: "14px", marginBottom: "10px" }}>
            {answered === -1 ? "Time's up!" : answered === currentQ.correct ? "Correct! +10" : "Wrong!"}
          </p>
          <button onClick={nextQuestion} style={{ padding: "10px 30px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
            {qIdx >= 9 ? "See Results" : "Next Question"}
          </button>
        </div>
      )}

      {/* Timer bar */}
      <div style={{ position: "fixed", top: 0, left: 0, width: `${(timer / 15) * 100}%`, height: "3px", background: timer <= 5 ? "#ff6b6b" : "#ffd700", transition: "width 1s linear" }} />
    </div>
  );
}
