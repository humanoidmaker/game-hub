"use client";
import { useRef, useState, useEffect, useCallback } from "react";

const WORDS = [
  "cat","dog","elephant","giraffe","penguin","dolphin","butterfly","spider","octopus","kangaroo",
  "snake","parrot","whale","turtle","rabbit","lion","tiger","eagle","shark","frog",
  "house","castle","bridge","rocket","umbrella","telescope","piano","guitar","violin","drums",
  "bicycle","airplane","helicopter","submarine","sailboat","train","motorcycle","skateboard","scooter","bus",
  "pizza","hamburger","icecream","cake","banana","apple","watermelon","spaghetti","cookie","sandwich",
  "tree","flower","mountain","volcano","rainbow","cloud","sun","moon","star","lightning",
  "robot","alien","wizard","princess","pirate","ninja","ghost","dragon","unicorn","mermaid",
  "swimming","dancing","running","jumping","sleeping","cooking","painting","singing","reading","flying",
  "camera","laptop","phone","clock","lamp","chair","table","window","door","key",
  "hat","shoe","glasses","ring","crown","sword","shield","arrow","balloon","kite",
  "fire","snowflake","tornado","wave","river","island","desert","forest","cave","beach"
];

const COLORS = ["#ffffff","#ef4444","#22c55e","#3b82f6","#eab308","#8b5cf6","#ec4899","#f97316"];
const BRUSH_SIZES = [3, 8, 16];
const TIMER_SECONDS = 60;
const MAX_UNDO = 10;

type Phase = "drawer" | "guesser";
type Stroke = { color: string; size: number; points: { x: number; y: number }[] };

function pickWord(exclude?: string): string {
  let w: string;
  do { w = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (w === exclude && WORDS.length > 1);
  return w;
}

export default function DrawGuess() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [word, setWord] = useState(() => pickWord());
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [msg, setMsg] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[0]);
  const [eraser, setEraser] = useState(false);
  const [phase, setPhase] = useState<Phase>("drawer");
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);

  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const strokes = useRef<Stroke[]>([]);
  const currentStroke = useRef<Stroke | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- canvas helpers ----
  const clearCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 300);
  }, []);

  const redrawAll = useCallback(() => {
    clearCanvas();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    for (const s of strokes.current) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }
  }, [clearCanvas]);

  // ---- init canvas on mount ----
  useEffect(() => { clearCanvas(); }, [clearCanvas]);

  // ---- timer ----
  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setInterval(() => setTimer(t => t - 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timer === 0 && timerActive) {
      setTimerActive(false);
      setMsg("Time's up! The word was: " + word);
    }
  }, [timerActive, timer, word]);

  // ---- pointer helpers ----
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0] || (e as React.TouchEvent).changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  }, []);

  const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== "drawer") return;
    e.preventDefault();
    drawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const strokeColor = eraser ? "#ffffff" : color;
    currentStroke.current = { color: strokeColor, size: brushSize, points: [pos] };
  }, [phase, getPos, eraser, color, brushSize]);

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || phase !== "drawer") return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !currentStroke.current) return;
    currentStroke.current.points.push(pos);
    ctx.strokeStyle = currentStroke.current.color;
    ctx.lineWidth = currentStroke.current.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [phase, getPos]);

  const onUp = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      strokes.current.push(currentStroke.current);
      if (strokes.current.length > MAX_UNDO + 50) {
        strokes.current = strokes.current.slice(-MAX_UNDO - 50);
      }
    }
    currentStroke.current = null;
  }, []);

  // ---- actions ----
  const undo = () => {
    if (strokes.current.length === 0) return;
    strokes.current.pop();
    redrawAll();
  };

  const handleClear = () => {
    strokes.current = [];
    clearCanvas();
  };

  const nextWord = useCallback(() => {
    const w = pickWord(word);
    setWord(w);
    strokes.current = [];
    clearCanvas();
    setGuess("");
    setMsg("");
    setTimer(TIMER_SECONDS);
    setTimerActive(false);
    setPhase("drawer");
  }, [word, clearCanvas]);

  const checkGuess = () => {
    if (!guess.trim()) return;
    if (guess.toLowerCase().trim() === word.toLowerCase()) {
      const bonus = timer > 0 ? Math.max(1, Math.ceil(timer / 10)) : 1;
      setScore(s => s + bonus);
      setMsg(`Correct! +${bonus} points`);
      setTimerActive(false);
      setRound(r => r + 1);
      setTimeout(() => nextWord(), 1500);
    } else {
      setMsg("Wrong! Try again.");
    }
    setGuess("");
  };

  const skipWord = () => {
    setMsg("Skipped! The word was: " + word);
    setTimerActive(false);
    setRound(r => r + 1);
    setTimeout(() => nextWord(), 1500);
  };

  const passToGuesser = () => {
    setPhase("guesser");
    setTimerActive(true);
    setMsg("");
  };

  const passToDrawer = () => {
    nextWord();
  };

  // ---- styles ----
  const containerStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: 24, minHeight: "100%", fontFamily: "inherit",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex", gap: 24, marginBottom: 12, fontSize: 14, color: "#aaa",
  };

  const canvasWrapStyle: React.CSSProperties = {
    borderRadius: 10, border: "2px solid #444", overflow: "hidden", marginBottom: 10,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  };

  const toolRowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap",
    justifyContent: "center",
  };

  const btnBase: React.CSSProperties = {
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
    padding: "6px 14px", transition: "background 0.15s",
  };

  const timerColor = timer <= 10 ? "#ef4444" : timer <= 30 ? "#eab308" : "#22c55e";

  return (
    <div style={containerStyle}>
      {/* header stats */}
      <div style={headerStyle}>
        <span>Round <b style={{ color: "#fff" }}>{round}</b></span>
        <span>Score <b style={{ color: "#eab308" }}>{score}</b></span>
        <span style={{ color: timerColor, fontWeight: 700 }}>
          {timerActive ? `${timer}s` : phase === "drawer" ? "Ready" : `${timer}s`}
        </span>
      </div>

      {/* word display */}
      {phase === "drawer" ? (
        <p style={{ color: "#eab308", fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
          Draw: {word}
        </p>
      ) : (
        <p style={{
          color: "#555", fontSize: 18, fontWeight: 700, marginBottom: 8,
          filter: "blur(8px)", userSelect: "none", letterSpacing: 4,
        }}>
          {word}
        </p>
      )}

      {/* canvas */}
      <div style={canvasWrapStyle}>
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{ display: "block", cursor: phase === "drawer" ? "crosshair" : "default", background: "#ffffff" }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
      </div>

      {/* drawing tools (visible to drawer) */}
      {phase === "drawer" && (
        <>
          {/* color swatches + eraser */}
          <div style={toolRowStyle}>
            {COLORS.map(c => (
              <div
                key={c}
                onClick={() => { setColor(c); setEraser(false); }}
                style={{
                  width: 28, height: 28, borderRadius: "50%", background: c,
                  border: !eraser && color === c ? "3px solid #38bdf8" : "2px solid #555",
                  cursor: "pointer", boxShadow: !eraser && color === c ? "0 0 6px #38bdf8" : "none",
                  transition: "border 0.15s, box-shadow 0.15s",
                }}
              />
            ))}
            <div
              onClick={() => setEraser(true)}
              title="Eraser"
              style={{
                width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#888,#444)",
                border: eraser ? "3px solid #38bdf8" : "2px solid #555",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#fff", fontWeight: 700, boxShadow: eraser ? "0 0 6px #38bdf8" : "none",
              }}
            >
              E
            </div>
          </div>

          {/* brush sizes */}
          <div style={toolRowStyle}>
            {BRUSH_SIZES.map(s => (
              <div
                key={s}
                onClick={() => setBrushSize(s)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: brushSize === s ? "#333" : "#1a1a1a",
                  border: brushSize === s ? "2px solid #38bdf8" : "2px solid #444",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "border 0.15s",
                }}
              >
                <div style={{
                  width: s + 2, height: s + 2, borderRadius: "50%",
                  background: eraser ? "#888" : color,
                }} />
              </div>
            ))}

            <button onClick={undo} style={{ ...btnBase, background: "#1e293b", color: "#94a3b8", marginLeft: 10 }}>
              Undo
            </button>
            <button onClick={handleClear} style={{ ...btnBase, background: "#3b1111", color: "#ef4444", marginLeft: 4 }}>
              Clear
            </button>
          </div>

          {/* pass to guesser */}
          <button onClick={passToGuesser} style={{
            ...btnBase, background: "#2563eb", color: "#fff", padding: "10px 28px", fontSize: 15, marginTop: 4, marginBottom: 4,
          }}>
            Pass to Guesser
          </button>
        </>
      )}

      {/* guesser controls */}
      {phase === "guesser" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 4 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === "Enter" && checkGuess()}
              placeholder="Type your guess..."
              autoFocus
              style={{
                padding: "10px 16px", borderRadius: 8, border: "1px solid #444",
                background: "#111", color: "#fff", fontSize: 15, outline: "none", width: 220,
              }}
            />
            <button onClick={checkGuess} style={{ ...btnBase, background: "#10b981", color: "#000", padding: "10px 20px", fontSize: 15 }}>
              Guess
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={skipWord} style={{ ...btnBase, background: "#333", color: "#888", padding: "8px 18px" }}>
              Skip Word
            </button>
            <button onClick={passToDrawer} style={{ ...btnBase, background: "#1e293b", color: "#94a3b8", padding: "8px 18px" }}>
              Pass to Drawer
            </button>
          </div>
        </div>
      )}

      {/* message */}
      {msg && (
        <p style={{
          marginTop: 10, fontWeight: 700, fontSize: 16,
          color: msg.includes("Correct") ? "#10b981" : msg.includes("Wrong") ? "#ef4444" : "#eab308",
        }}>
          {msg}
        </p>
      )}
    </div>
  );
}
