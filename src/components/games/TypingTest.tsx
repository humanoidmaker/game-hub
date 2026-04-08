"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const PARAGRAPHS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice. Learning to type quickly and accurately is an essential skill in the modern digital world.",
  "Programming is the art of telling a computer what to do. It requires logic, creativity, and patience. A good programmer writes code that humans can understand, not just machines. Clean code is a hallmark of professional software development.",
  "In the heart of every great city lies a story waiting to be told. From the bustling streets of Tokyo to the ancient ruins of Rome, each destination offers a unique glimpse into the tapestry of human civilization and cultural heritage.",
  "The ocean covers more than seventy percent of the Earth's surface. Its depths remain largely unexplored, hiding countless species and geological wonders. Marine biology continues to reveal new discoveries about the incredible diversity of life beneath the waves.",
  "Artificial intelligence is transforming the way we live and work. Machine learning algorithms can now recognize faces, translate languages, and even create art. The future promises even more revolutionary applications of this powerful technology.",
  "Music has the power to change our mood, inspire creativity, and bring people together. From classical symphonies to modern electronic beats, the universal language of music transcends cultural boundaries and speaks directly to the human soul.",
  "Space exploration represents one of humanity's greatest achievements. From the first moon landing to the Mars rovers, each mission expands our understanding of the cosmos. The dream of interstellar travel continues to drive scientific innovation.",
  "Cooking is both an art and a science. Understanding how heat transforms ingredients, how flavors combine, and how textures complement each other can turn a simple meal into an extraordinary culinary experience that delights all the senses.",
  "Books have been the primary vehicle for preserving and transmitting knowledge throughout human history. From ancient scrolls to digital readers, the written word continues to educate, entertain, and inspire millions of people around the world.",
  "Climate change poses one of the greatest challenges facing our planet. Rising temperatures, melting ice caps, and extreme weather events demand immediate action. Sustainable practices and renewable energy sources offer hope for a greener future.",
  "The human brain is the most complex organ in the known universe. With approximately one hundred billion neurons forming trillions of connections, it processes information, stores memories, and generates consciousness in ways we are only beginning to understand.",
  "Photography captures moments that would otherwise be lost to time. Whether through a professional camera or a smartphone, the ability to freeze an instant and preserve it forever has fundamentally changed how we document and share our experiences.",
];

export default function TypingTest() {
  const [phase, setPhase] = useState<"setup" | "typing" | "result">("setup");
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [errors, setErrors] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [highScore, setHighScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTest = useCallback(() => {
    const para = PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)];
    setText(para);
    setTyped("");
    setCursorPos(0);
    setErrors(0);
    setTotalChars(0);
    setWpm(0);
    setAccuracy(100);
    setTimeLeft(duration);
    setStartTime(Date.now());
    setPhase("typing");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [duration]);

  useEffect(() => {
    if (phase !== "typing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== "typing") return;
    const val = e.target.value;
    const newLen = val.length;

    if (newLen > text.length) return;

    let errs = 0;
    for (let i = 0; i < newLen; i++) {
      if (val[i] !== text[i]) errs++;
    }

    setTyped(val);
    setCursorPos(newLen);
    setErrors(errs);
    setTotalChars(newLen);

    // WPM calculation
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    if (elapsed > 0) {
      const correctChars = newLen - errs;
      const w = Math.round((correctChars / 5) / elapsed);
      setWpm(w);
      setAccuracy(newLen > 0 ? Math.round(((newLen - errs) / newLen) * 100) : 100);
    }

    // Complete
    if (newLen >= text.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("result");
    }
  };

  useEffect(() => {
    if (phase === "result" && wpm > highScore) {
      setHighScore(wpm);
    }
  }, [phase, wpm]);

  const getCharStyle = (idx: number): React.CSSProperties => {
    if (idx >= cursorPos) return { color: "#555", background: idx === cursorPos ? "#ffd70066" : "transparent" };
    if (typed[idx] === text[idx]) return { color: "#4ecdc4", background: "transparent" };
    return { color: "#ff6b6b", background: "#ff6b6b22", textDecoration: "underline" };
  };

  if (phase === "setup") {
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, monospace", color: "#e0e0e0" }}>
        <h1 style={{ color: "#ffd700", fontSize: "32px", marginBottom: "4px" }}>Typing Test</h1>
        <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>Test your typing speed and accuracy</p>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px", textAlign: "center" }}>Duration</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[30, 60, 120].map(d => (
              <button key={d} onClick={() => setDuration(d)} style={{ padding: "10px 20px", background: duration === d ? "#ffd700" : "#1a1a3a", color: duration === d ? "#0a0a1a" : "#ccc", border: "1px solid #333", borderRadius: "10px", cursor: "pointer", fontWeight: duration === d ? 700 : 400, fontSize: "14px" }}>{d}s</button>
            ))}
          </div>
        </div>

        {highScore > 0 && <p style={{ color: "#4ecdc4", fontSize: "14px", marginBottom: "16px" }}>Best: {highScore} WPM</p>}

        <button onClick={startTest} style={{ padding: "14px 44px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Start</button>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0" }}>
        <h2 style={{ color: "#ffd700", fontSize: "28px", marginBottom: "24px" }}>Results</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          <div style={{ textAlign: "center", padding: "16px 24px", background: "#0d0d2a", borderRadius: "12px" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#4ecdc4" }}>{wpm}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>WPM</div>
          </div>
          <div style={{ textAlign: "center", padding: "16px 24px", background: "#0d0d2a", borderRadius: "12px" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: accuracy >= 95 ? "#4ecdc4" : accuracy >= 85 ? "#ffd700" : "#ff6b6b" }}>{accuracy}%</div>
            <div style={{ fontSize: "12px", color: "#888" }}>Accuracy</div>
          </div>
          <div style={{ textAlign: "center", padding: "16px 24px", background: "#0d0d2a", borderRadius: "12px" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#ff6b6b" }}>{errors}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>Errors</div>
          </div>
          <div style={{ textAlign: "center", padding: "16px 24px", background: "#0d0d2a", borderRadius: "12px" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, color: "#a855f7" }}>{totalChars}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>Characters</div>
          </div>
        </div>

        {wpm >= highScore && wpm > 0 && <p style={{ color: "#ffd700", fontSize: "14px", marginBottom: "12px" }}>New High Score!</p>}
        {highScore > 0 && <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>Best: {highScore} WPM</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={startTest} style={{ padding: "12px 36px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Retry</button>
          <button onClick={() => setPhase("setup")} style={{ padding: "12px 24px", background: "transparent", color: "#888", border: "1px solid #333", borderRadius: "25px", fontSize: "14px", cursor: "pointer" }}>Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      {/* Stats bar */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "20px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, color: timeLeft <= 10 ? "#ff6b6b" : "#ffd700" }}>{timeLeft}</div>
          <div style={{ fontSize: "11px", color: "#888" }}>seconds</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#4ecdc4" }}>{wpm}</div>
          <div style={{ fontSize: "11px", color: "#888" }}>WPM</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, color: accuracy >= 95 ? "#4ecdc4" : accuracy >= 85 ? "#ffd700" : "#ff6b6b" }}>{accuracy}%</div>
          <div style={{ fontSize: "11px", color: "#888" }}>accuracy</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#ff6b6b" }}>{errors}</div>
          <div style={{ fontSize: "11px", color: "#888" }}>errors</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: "600px", height: "4px", background: "#1a1a3a", borderRadius: "2px", marginBottom: "20px" }}>
        <div style={{ width: `${(cursorPos / text.length) * 100}%`, height: "100%", background: "#4ecdc4", borderRadius: "2px", transition: "width 0.1s" }} />
      </div>

      {/* Text display */}
      <div style={{ maxWidth: "600px", width: "100%", background: "#0d0d2a", borderRadius: "12px", padding: "24px", marginBottom: "16px", lineHeight: 1.8, fontSize: "18px", fontFamily: "monospace", letterSpacing: "0.5px", position: "relative", minHeight: "150px" }} onClick={() => inputRef.current?.focus()}>
        {text.split("").map((char, i) => (
          <span key={i} style={{ ...getCharStyle(i), transition: "color 0.1s" }}>{char}</span>
        ))}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        value={typed}
        onChange={handleInput}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <p style={{ color: "#555", fontSize: "12px" }}>Click the text area and start typing</p>

      {/* Timer bar at top */}
      <div style={{ position: "fixed", top: 0, left: 0, width: `${(timeLeft / duration) * 100}%`, height: "3px", background: timeLeft <= 10 ? "#ff6b6b" : "#ffd700", transition: "width 1s linear" }} />
    </div>
  );
}
