import { useState, useEffect, useCallback, useRef } from "react";

const ALL_EMOJIS = [
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
  "🦁","🐸","🐵","🐔","🐧","🐤","🦋","🐢","🐬","🦄",
];

type GridSize = "3x4" | "4x4" | "5x4";

const GRID_CONFIG: Record<GridSize, { cols: number; rows: number; pairs: number }> = {
  "3x4": { cols: 4, rows: 3, pairs: 6 },
  "4x4": { cols: 4, rows: 4, pairs: 8 },
  "5x4": { cols: 4, rows: 5, pairs: 10 },
};

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: number): Card[] {
  const emojis = ALL_EMOJIS.slice(0, pairs);
  const doubled = [...emojis, ...emojis];
  const shuffled = fisherYatesShuffle(doubled);
  return shuffled.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

function getStars(moves: number, pairs: number): number {
  if (moves <= pairs * 1.5) return 3;
  if (moves <= pairs * 2.5) return 2;
  return 1;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface BestScore {
  moves: number;
  time: number;
  stars: number;
}

export default function MemoryMatch() {
  const [gridSize, setGridSize] = useState<GridSize>("4x4");
  const [cards, setCards] = useState<Card[]>(() => buildDeck(GRID_CONFIG["4x4"].pairs));
  const [firstFlip, setFirstFlip] = useState<number | null>(null);
  const [secondFlip, setSecondFlip] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [bestScores, setBestScores] = useState<Record<GridSize, BestScore | null>>({
    "3x4": null,
    "4x4": null,
    "5x4": null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer effect
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Win detection
  useEffect(() => {
    if (!gameStarted) return;
    const allMatched = cards.length > 0 && cards.every((c) => c.matched);
    if (allMatched && !won) {
      setWon(true);
      setTimerRunning(false);
      const pairs = GRID_CONFIG[gridSize].pairs;
      const stars = getStars(moves, pairs);
      const current = bestScores[gridSize];
      if (!current || moves < current.moves || (moves === current.moves && timer < current.time)) {
        setBestScores((prev) => ({
          ...prev,
          [gridSize]: { moves, time: timer, stars },
        }));
      }
    }
  }, [cards, gameStarted, won, moves, timer, gridSize, bestScores]);

  const startNewGame = useCallback(
    (size: GridSize) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const config = GRID_CONFIG[size];
      setGridSize(size);
      setCards(buildDeck(config.pairs));
      setFirstFlip(null);
      setSecondFlip(null);
      setMoves(0);
      setTimer(0);
      setTimerRunning(false);
      setGameStarted(false);
      setWon(false);
      setLocked(false);
    },
    []
  );

  const handleClick = useCallback(
    (index: number) => {
      if (locked || won) return;
      const card = cards[index];
      if (card.matched || card.flipped) return;

      if (!gameStarted) {
        setGameStarted(true);
        setTimerRunning(true);
      }

      const updated = cards.map((c, i) => (i === index ? { ...c, flipped: true } : { ...c }));
      setCards(updated);

      if (firstFlip === null) {
        // First card
        setFirstFlip(index);
      } else {
        // Second card
        setSecondFlip(index);
        setMoves((m) => m + 1);
        setLocked(true);

        const firstCard = cards[firstFlip];
        const secondCard = cards[index];

        if (firstCard.emoji === secondCard.emoji) {
          // Match
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstFlip || i === index ? { ...c, matched: true } : c
              )
            );
            setFirstFlip(null);
            setSecondFlip(null);
            setLocked(false);
          }, 400);
        } else {
          // No match — flip back after delay
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstFlip || i === index ? { ...c, flipped: false } : c
              )
            );
            setFirstFlip(null);
            setSecondFlip(null);
            setLocked(false);
          }, 1000);
        }
      }
    },
    [cards, firstFlip, locked, won, gameStarted]
  );

  const config = GRID_CONFIG[gridSize];
  const pairs = config.pairs;
  const matchedCount = cards.filter((c) => c.matched).length / 2;
  const stars = getStars(moves, pairs);
  const best = bestScores[gridSize];

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 24,
    minHeight: "100%",
    background: "#0a0a1a",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: 20,
    textAlign: "center" as const,
  };

  const sizeButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px",
    borderRadius: 8,
    border: active ? "2px solid #7c3aed" : "2px solid #333",
    background: active ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#1a1a2e",
    color: active ? "#fff" : "#94a3b8",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    transition: "all 0.2s ease",
  });

  const newGameBtnStyle: React.CSSProperties = {
    padding: "10px 28px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    marginTop: 16,
    transition: "opacity 0.2s",
  };

  const statsStyle: React.CSSProperties = {
    display: "flex",
    gap: 24,
    marginBottom: 16,
    fontSize: 14,
    color: "#94a3b8",
  };

  const statValueStyle: React.CSSProperties = {
    color: "#e2e8f0",
    fontWeight: 600,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${config.cols}, 80px)`,
    gap: 8,
  };

  const cardContainerStyle: React.CSSProperties = {
    width: 80,
    height: 80,
    perspective: "600px",
    cursor: "pointer",
  };

  const cardInnerStyle = (flipped: boolean, matched: boolean): React.CSSProperties => ({
    position: "relative" as const,
    width: "100%",
    height: "100%",
    transition: "transform 400ms ease",
    transformStyle: "preserve-3d" as const,
    transform: flipped || matched ? "rotateY(180deg)" : "rotateY(0deg)",
  });

  const cardFaceBase: React.CSSProperties = {
    position: "absolute" as const,
    width: "100%",
    height: "100%",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
  };

  const cardFrontStyle = (matched: boolean): React.CSSProperties => ({
    ...cardFaceBase,
    background: "linear-gradient(135deg, #1e1b4b, #312e81)",
    border: "2px solid #4338ca",
    color: "#818cf8",
    fontSize: 28,
    fontWeight: 700,
    opacity: matched ? 0.7 : 1,
  });

  const cardBackStyle = (matched: boolean): React.CSSProperties => ({
    ...cardFaceBase,
    transform: "rotateY(180deg)",
    background: matched ? "#1a2e1a" : "linear-gradient(135deg, #1e293b, #334155)",
    border: matched ? "2px solid #22c55e" : "2px solid #475569",
    fontSize: 36,
    opacity: matched ? 0.7 : 1,
  });

  const celebrationStyle: React.CSSProperties = {
    marginTop: 20,
    padding: "20px 32px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #14532d, #166534)",
    border: "2px solid #22c55e",
    textAlign: "center" as const,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {(Object.keys(GRID_CONFIG) as GridSize[]).map((size) => (
            <button
              key={size}
              onClick={() => startNewGame(size)}
              style={sizeButtonStyle(gridSize === size)}
            >
              {size}
            </button>
          ))}
        </div>

        <div style={statsStyle}>
          <span>
            Moves: <span style={statValueStyle}>{moves}</span>
          </span>
          <span>
            Matched: <span style={statValueStyle}>{matchedCount}/{pairs}</span>
          </span>
          <span>
            Time: <span style={statValueStyle}>{formatTime(timer)}</span>
          </span>
          <span>
            Stars: <span style={statValueStyle}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>
          </span>
        </div>

        {best && (
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            Best ({gridSize}): {best.moves} moves, {formatTime(best.time)}, {"★".repeat(best.stars)}
          </div>
        )}
      </div>

      <div style={gridStyle}>
        {cards.map((card, index) => (
          <div
            key={card.id + "-" + index}
            style={cardContainerStyle}
            onClick={() => handleClick(index)}
          >
            <div style={cardInnerStyle(card.flipped, card.matched)}>
              {/* Front face (face-down) */}
              <div style={cardFrontStyle(card.matched)}>?</div>
              {/* Back face (face-up, shows emoji) */}
              <div style={cardBackStyle(card.matched)}>{card.emoji}</div>
            </div>
          </div>
        ))}
      </div>

      {won && (
        <div style={celebrationStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>
            Congratulations!
          </div>
          <div style={{ color: "#86efac", fontSize: 15, lineHeight: 1.8 }}>
            You found all {pairs} pairs in <strong>{moves}</strong> moves and <strong>{formatTime(timer)}</strong>!
            <br />
            Rating: <span style={{ fontSize: 20 }}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>
          </div>
        </div>
      )}

      <button style={newGameBtnStyle} onClick={() => startNewGame(gridSize)}>
        New Game
      </button>
    </div>
  );
}
