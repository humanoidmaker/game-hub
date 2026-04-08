"use client";
import { useState, useCallback, useMemo } from "react";

const PUZZLES = [
  { center: "A", outer: ["R","T","I","N","G","E"], pangrams: ["TREATING","RERATING","GRATINATE"], words: ["RAIN","RING","RATE","RARE","RANT","RANG","RAGE","TARE","TEAR","TIER","TIRE","TANG","TRIAGE","TRAIN","TRAIT","GRAIN","GRATE","GREAT","IRATE","INERT","INTER","GATE","GAIT","GAIN","GEAR","GIANT","GRANT","INGRATE","AGITATE","RATTING","RATING","RANTING","RARING","TEARING","EARING","NEARING","ARRANGE","ARENA","AREA","ARIA","AGATE","AGAIN","AGENT","AIRING","EATING","ERRATA","EARNING","GAITER","GARNET","IGNITE","INNATE","NAGGING","RAGGING","RIGGING","RAGING","RETAIN","RETINA","REGAIN","TANNING","TARING","ATTAIN","NAIRA","TIARA","ATRIA"] },
  { center: "E", outer: ["S","P","L","I","N","D"], words: ["SPELL","SPEED","SPEND","SPINE","SLIDE","SNIDE","PILED","PILES","LINED","LINES","DINES","PINES","SPLEEN","NEEDLE","NIPPLE","SIMPLE","SPIED","ELIDE","PENIS","PEELS","SEEP","SEED","SEEN","SLED","SLID","SIDE","PEEL","PEED","PEND","PINE","ISLE","ISLE","IDLE","DENIED","DENIES","DIESEL","DELETE","SPLENDID","DISPEL","ELDEN","LESSEN","PENILE","SINNED","SIPPED","SIPPED","PEDDLE","PEDDLER","DIPPED","DIPPER","PLIED","SNIPE","ENSILE","ELIDES","EDIBLE","LINSEED","SPELLED","SPELLED"] },
  { center: "O", outer: ["C","M","P","U","T","R"], words: ["COMP","COMP","ROMP","CROP","COOP","COUP","POUR","TOUR","ROUT","MOOT","ROOT","TOOT","MOTOR","TUMOR","COURT","CROUTON","CORRUPT","COMPORT","CONTOUR","PORT","MOTTO","MOAT","MOOR","PROOF","TROOP","TOUPEE","OOMPH","TOPMOST","OUTPOST","CORPO","PROMPT","UPROOT","PROMO","MORON","ROBOT","ONTO","OTTO","MUTT","PROMO","TROMP","OUTCROP","COMFORT","IMPORT","REPORT","TORPOR","ROTATOR","ROOFTOP","CUTOUT","OUTPUT","PROTOCOL","FOOTPRINT","OCTOPUS"] },
  { center: "L", outer: ["B","A","N","K","I","G"], words: ["BALL","BALK","BAIL","BANK","BANG","GAIN","GLIB","BLANK","BLINK","GLIB","NAIL","KNIT","LANK","LINK","LANG","BILLING","KILLING","LAGGING","NAGGING","BAGGING","BANKING","BLANKING","BLINKING","LABELING","ALIGNING","ABLING","ABLING","AILING","LACKING","BALKING","BALING","LAKING","KLING","GLING","GALLING","LINING","INKLING","ANKLING","LANKING","LINKING","KLING","BLING","GLIBBING"] },
  { center: "S", outer: ["H","A","R","P","E","D"], words: ["SHARP","SHAPE","SHADE","SHARE","SPARE","SPADE","SPEAR","DASHES","RASHES","HARPS","DRAPES","SHARED","SHAPED","SHADES","SHAPES","SPARED","PASSER","PASSED","HEAPS","REAPS","HEADS","READS","SHRED","DRESS","PRESS","STRESS","PRESSED","HARASSED","ASHED","GRASPS","RASPS","HASPS","DESKS","SERAPH","PHRASE","SPARSE","ASSED","PASSED","HARNESS","SADNESS","MADNESS","HARDNESS","SHARPNESS","RASHEST","SASHED","HASHED","DASHED","PASHED","RASHED"] },
];

function SpellingBee() {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];
  const [input, setInput] = useState("");
  const [found, setFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const allLetters = useMemo(() => [puzzle.center, ...puzzle.outer], [puzzle]);
  const validWords = useMemo(() => {
    const set = new Set<string>();
    puzzle.words.forEach(w => set.add(w.toUpperCase()));
    if (puzzle.pangrams) puzzle.pangrams.forEach(w => set.add(w.toUpperCase()));
    return set;
  }, [puzzle]);

  const isPangram = useCallback((word: string) => {
    const letters = new Set(word.toUpperCase().split(""));
    return allLetters.every(l => letters.has(l.toUpperCase()));
  }, [allLetters]);

  const addLetter = (l: string) => {
    if (gameOver) return;
    setInput(prev => prev + l);
    setMessage("");
  };

  const removeLetter = () => {
    setInput(prev => prev.slice(0, -1));
  };

  const shuffleOuter = () => {
    puzzle.outer.sort(() => Math.random() - 0.5);
    setInput(prev => prev); // force re-render trick
  };

  const showMsg = (msg: string, isError: boolean) => {
    setMessage(msg);
    if (isError) { setShake(true); setTimeout(() => setShake(false), 500); }
  };

  const submit = () => {
    if (gameOver) return;
    const word = input.toUpperCase();
    if (word.length < 4) { showMsg("Too short! Need 4+ letters", true); setInput(""); return; }
    if (!word.includes(puzzle.center.toUpperCase())) { showMsg("Must include center letter!", true); setInput(""); return; }
    const wordLetters = word.split("");
    const allowed = new Set(allLetters.map(l => l.toUpperCase()));
    if (wordLetters.some(l => !allowed.has(l))) { showMsg("Invalid letter used!", true); setInput(""); return; }
    if (found.includes(word)) { showMsg("Already found!", true); setInput(""); return; }
    if (!validWords.has(word)) { showMsg("Not in word list", true); setInput(""); return; }

    const pan = isPangram(word);
    const pts = word.length === 4 ? 1 : word.length + (pan ? 7 : 0);
    setScore(s => s + pts);
    setFound(f => [...f, word]);
    showMsg(pan ? "PANGRAM! +" + pts : "Nice! +" + pts, false);
    setInput("");
  };

  const nextPuzzle = () => {
    setPuzzleIdx(i => i + 1);
    setFound([]);
    setInput("");
    setMessage("");
    setGameOver(false);
  };

  const hexPoints = (cx: number, cy: number, r: number) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(" ");
  };

  const centerX = 140, centerY = 140, hexR = 42, gap = 5;
  const dist = hexR * 2 + gap;
  const outerPositions = [
    { x: centerX, y: centerY - dist },
    { x: centerX + dist * 0.866, y: centerY - dist * 0.5 },
    { x: centerX + dist * 0.866, y: centerY + dist * 0.5 },
    { x: centerX, y: centerY + dist },
    { x: centerX - dist * 0.866, y: centerY + dist * 0.5 },
    { x: centerX - dist * 0.866, y: centerY - dist * 0.5 },
  ];

  const totalPossible = Array.from(validWords).reduce((sum, w) => {
    const pts = w.length === 4 ? 1 : w.length + (isPangram(w) ? 7 : 0);
    return sum + pts;
  }, 0);
  const pct = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

  const ranks = ["Beginner","Good Start","Moving Up","Good","Solid","Nice","Great","Amazing","Genius","Queen Bee"];
  const rankIdx = Math.min(Math.floor(pct / 11), ranks.length - 1);

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#ffd700", marginBottom: "4px" }}>Spelling Bee</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>Make 4+ letter words. Center letter required in every word!</p>

      <div style={{ display: "flex", gap: "20px", marginBottom: "12px", fontSize: "14px" }}>
        <span style={{ color: "#ffd700" }}>Score: {score}</span>
        <span style={{ color: "#4ecdc4" }}>Rank: {ranks[rankIdx]}</span>
        <span style={{ color: "#888" }}>Found: {found.length}/{validWords.size}</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: "280px", height: "6px", background: "#1a1a3a", borderRadius: "3px", marginBottom: "16px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #ffd700, #ff6b6b)", borderRadius: "3px", transition: "width 0.3s" }} />
      </div>

      {/* Honeycomb */}
      <svg width="280" height="280" style={{ marginBottom: "12px" }}>
        {/* Center hex */}
        <polygon points={hexPoints(centerX, centerY, hexR)} fill="#ffd700" stroke="#ffed4a" strokeWidth="2" style={{ cursor: "pointer" }} onClick={() => addLetter(puzzle.center)} />
        <text x={centerX} y={centerY + 7} textAnchor="middle" fill="#0a0a1a" fontSize="22" fontWeight="bold" style={{ pointerEvents: "none" }}>{puzzle.center}</text>

        {/* Outer hexes */}
        {puzzle.outer.map((letter, i) => (
          <g key={i} onClick={() => addLetter(letter)} style={{ cursor: "pointer" }}>
            <polygon points={hexPoints(outerPositions[i].x, outerPositions[i].y, hexR)} fill="#1a1a3a" stroke="#333366" strokeWidth="2" />
            <text x={outerPositions[i].x} y={outerPositions[i].y + 7} textAnchor="middle" fill="#e0e0e0" fontSize="20" fontWeight="bold" style={{ pointerEvents: "none" }}>{letter}</text>
          </g>
        ))}
      </svg>

      {/* Input */}
      <div style={{ minHeight: "40px", fontSize: "24px", fontWeight: 700, letterSpacing: "4px", marginBottom: "8px", animation: shake ? "shake 0.5s" : "none" }}>
        {input.split("").map((l, i) => (
          <span key={i} style={{ color: l.toUpperCase() === puzzle.center.toUpperCase() ? "#ffd700" : "#e0e0e0" }}>{l}</span>
        ))}
        <span style={{ borderRight: "2px solid #ffd700", animation: "blink 1s infinite" }}>&nbsp;</span>
      </div>

      {/* Message */}
      <div style={{ height: "24px", fontSize: "14px", color: message.includes("!") && !message.includes("+") ? "#ff6b6b" : "#4ecdc4", marginBottom: "12px" }}>{message}</div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={removeLetter} style={{ padding: "8px 20px", background: "#1a1a3a", color: "#e0e0e0", border: "1px solid #333", borderRadius: "20px", cursor: "pointer", fontSize: "14px" }}>Delete</button>
        <button onClick={shuffleOuter} style={{ padding: "8px 20px", background: "#1a1a3a", color: "#e0e0e0", border: "1px solid #333", borderRadius: "20px", cursor: "pointer", fontSize: "14px" }}>Shuffle</button>
        <button onClick={submit} style={{ padding: "8px 20px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>Enter</button>
      </div>

      {/* Found words */}
      <div style={{ width: "300px", maxHeight: "180px", overflowY: "auto", background: "#0d0d2a", borderRadius: "10px", padding: "12px" }}>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Found Words:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {found.map((w, i) => (
            <span key={i} style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "12px", background: isPangram(w) ? "#ffd700" : "#1a1a3a", color: isPangram(w) ? "#0a0a1a" : "#ccc", fontWeight: isPangram(w) ? 700 : 400 }}>{w}</span>
          ))}
          {found.length === 0 && <span style={{ color: "#555", fontSize: "12px" }}>No words yet</span>}
        </div>
      </div>

      <button onClick={nextPuzzle} style={{ marginTop: "16px", padding: "8px 24px", background: "transparent", color: "#ffd700", border: "1px solid #ffd700", borderRadius: "20px", cursor: "pointer", fontSize: "13px" }}>New Puzzle</button>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
      `}</style>
    </div>
  );
}

export default SpellingBee;
