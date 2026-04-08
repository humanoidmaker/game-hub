"use client";
import { useState, useCallback, useRef, useEffect } from "react";

// Board layout: indices 0-5 = player pits, 6 = player store,
// 7-12 = AI pits, 13 = AI store. Total 14 slots.
const PLAYER_PITS = [0, 1, 2, 3, 4, 5];
const AI_PITS = [7, 8, 9, 10, 11, 12];
const PLAYER_STORE = 6;
const AI_STORE = 13;
const INIT_STONES = 4;

const STONE_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6",
  "#e67e22", "#1abc9c", "#e84393", "#00cec9", "#fd79a8",
  "#6c5ce7", "#ffeaa7", "#dfe6e9", "#fab1a0", "#74b9ff",
  "#a29bfe",
];

function initBoard(): number[] {
  const b = new Array(14).fill(0);
  for (const i of PLAYER_PITS) b[i] = INIT_STONES;
  for (const i of AI_PITS) b[i] = INIT_STONES;
  return b;
}

// Generate stable stone colors for a pit based on count
function stoneColors(count: number, pitIndex: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(STONE_COLORS[(pitIndex * 7 + i * 3) % STONE_COLORS.length]);
  }
  return colors;
}

// Render small circles representing stones inside a container
function StonePile({ count, pitIndex, maxVisible }: { count: number; pitIndex: number; maxVisible: number }) {
  const colors = stoneColors(Math.min(count, maxVisible), pitIndex);
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 2,
      justifyContent: "center",
      alignItems: "center",
      padding: 2,
    }}>
      {colors.map((c, i) => (
        <div key={i} style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${c}, ${c}88)`,
          boxShadow: `0 1px 2px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)`,
          flexShrink: 0,
        }} />
      ))}
      {count > maxVisible && (
        <span style={{ fontSize: 9, color: "#ccc", marginLeft: 2 }}>+{count - maxVisible}</span>
      )}
    </div>
  );
}

export default function Mancala() {
  const [board, setBoard] = useState<number[]>(initBoard);
  const [turn, setTurn] = useState<"player" | "ai">("player");
  const [status, setStatus] = useState("Your turn! Click a pit to sow stones.");
  const [gameOver, setGameOver] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [highlightPit, setHighlightPit] = useState<number | null>(null);
  const animatingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    animatingRef.current = animating;
  }, [animating]);

  // --- Core game logic (no animation, returns final state) ---
  const sowImmediate = useCallback((b: number[], pit: number, isPlayer: boolean): { board: number[]; lastPit: number } => {
    const nb = [...b];
    let seeds = nb[pit];
    nb[pit] = 0;
    let idx = pit;
    const skipStore = isPlayer ? AI_STORE : PLAYER_STORE;
    while (seeds > 0) {
      idx = (idx + 1) % 14;
      if (idx === skipStore) continue;
      nb[idx]++;
      seeds--;
    }
    return { board: nb, lastPit: idx };
  }, []);

  const applyCapture = useCallback((b: number[], lastPit: number, isPlayer: boolean): number[] => {
    const nb = [...b];
    const myPits = isPlayer ? PLAYER_PITS : AI_PITS;
    const myStore = isPlayer ? PLAYER_STORE : AI_STORE;
    if (myPits.includes(lastPit) && nb[lastPit] === 1) {
      const opp = 12 - lastPit;
      if (nb[opp] > 0) {
        nb[myStore] += nb[opp] + 1;
        nb[opp] = 0;
        nb[lastPit] = 0;
      }
    }
    return nb;
  }, []);

  const isGameEnd = useCallback((b: number[]): boolean => {
    return PLAYER_PITS.every(i => b[i] === 0) || AI_PITS.every(i => b[i] === 0);
  }, []);

  const finalize = useCallback((b: number[]): number[] => {
    const nb = [...b];
    for (const i of PLAYER_PITS) { nb[PLAYER_STORE] += nb[i]; nb[i] = 0; }
    for (const i of AI_PITS) { nb[AI_STORE] += nb[i]; nb[i] = 0; }
    return nb;
  }, []);

  const getWinnerText = useCallback((b: number[]): string => {
    if (b[PLAYER_STORE] > b[AI_STORE]) return "You win!";
    if (b[AI_STORE] > b[PLAYER_STORE]) return "AI wins!";
    return "It's a draw!";
  }, []);

  // --- Animated sowing ---
  const sowAnimated = useCallback((b: number[], pit: number, isPlayer: boolean): Promise<{ board: number[]; lastPit: number }> => {
    return new Promise((resolve) => {
      const nb = [...b];
      let seeds = nb[pit];
      nb[pit] = 0;
      setBoard([...nb]);
      const skipStore = isPlayer ? AI_STORE : PLAYER_STORE;

      let idx = pit;
      let remaining = seeds;
      let lastIdx = pit;

      const dropNext = () => {
        if (remaining <= 0) {
          resolve({ board: [...nb], lastPit: lastIdx });
          return;
        }
        idx = (idx + 1) % 14;
        if (idx === skipStore) {
          // skip without delay
          dropNext();
          return;
        }
        nb[idx]++;
        remaining--;
        lastIdx = idx;
        setBoard([...nb]);
        setHighlightPit(idx);
        if (remaining > 0) {
          setTimeout(dropNext, 200);
        } else {
          setTimeout(() => {
            setHighlightPit(null);
            resolve({ board: [...nb], lastPit: lastIdx });
          }, 200);
        }
      };

      setTimeout(dropNext, 200);
    });
  }, []);

  // --- AI move selection ---
  const pickAiMove = useCallback((b: number[]): number => {
    const valid = AI_PITS.filter(i => b[i] > 0);
    if (valid.length === 0) return -1;

    let bestScore = -Infinity;
    let bestPit = valid[0];

    for (const pit of valid) {
      let { board: nb, lastPit } = sowImmediate(b, pit, false);
      nb = applyCapture(nb, lastPit, false);
      // Score: my store difference + bonus for extra turn
      let score = nb[AI_STORE] - b[AI_STORE];
      score -= (nb[PLAYER_STORE] - b[PLAYER_STORE]);
      // Capture bonus is already reflected in store diff
      if (lastPit === AI_STORE) score += 3; // extra turn bonus
      if (score > bestScore) {
        bestScore = score;
        bestPit = pit;
      }
    }
    return bestPit;
  }, [sowImmediate, applyCapture]);

  // --- Handle end of a move ---
  const handlePostMove = useCallback((nb: number[], lastPit: number, isPlayer: boolean): { board: number[]; ended: boolean; extraTurn: boolean } => {
    let b = applyCapture(nb, lastPit, isPlayer);
    if (isGameEnd(b)) {
      b = finalize(b);
      return { board: b, ended: true, extraTurn: false };
    }
    const myStore = isPlayer ? PLAYER_STORE : AI_STORE;
    if (lastPit === myStore) {
      return { board: b, ended: false, extraTurn: true };
    }
    return { board: b, ended: false, extraTurn: false };
  }, [applyCapture, isGameEnd, finalize]);

  // --- AI turn logic (recursive for extra turns) ---
  const runAiTurn = useCallback(async (currentBoard: number[]) => {
    const pit = pickAiMove(currentBoard);
    if (pit < 0) return;

    setStatus("AI is thinking...");
    await new Promise(r => setTimeout(r, 600));

    const { board: afterSow, lastPit } = await sowAnimated(currentBoard, pit, false);
    const result = handlePostMove(afterSow, lastPit, false);
    setBoard(result.board);

    if (result.ended) {
      setGameOver(true);
      setAnimating(false);
      setStatus(getWinnerText(result.board));
      return;
    }
    if (result.extraTurn) {
      setStatus("AI gets an extra turn!");
      await new Promise(r => setTimeout(r, 400));
      await runAiTurn(result.board);
      return;
    }

    setTurn("player");
    setAnimating(false);
    setStatus("Your turn! Click a pit to sow stones.");
  }, [pickAiMove, sowAnimated, handlePostMove, getWinnerText]);

  // --- Player move ---
  const handlePitClick = useCallback(async (pit: number) => {
    if (gameOver || turn !== "player" || animatingRef.current) return;
    if (pit < 0 || pit > 5 || board[pit] === 0) return;

    setAnimating(true);

    const { board: afterSow, lastPit } = await sowAnimated(board, pit, true);
    const result = handlePostMove(afterSow, lastPit, true);
    setBoard(result.board);

    if (result.ended) {
      setGameOver(true);
      setAnimating(false);
      setStatus(getWinnerText(result.board));
      return;
    }
    if (result.extraTurn) {
      setAnimating(false);
      setStatus("Last stone landed in your store -- extra turn!");
      return;
    }

    setTurn("ai");
    await runAiTurn(result.board);
  }, [gameOver, turn, board, sowAnimated, handlePostMove, getWinnerText, runAiTurn]);

  const resetGame = useCallback(() => {
    setBoard(initBoard());
    setTurn("player");
    setStatus("Your turn! Click a pit to sow stones.");
    setGameOver(false);
    setAnimating(false);
    setHighlightPit(null);
  }, []);

  const canClick = (pit: number) => !gameOver && turn === "player" && !animating && board[pit] > 0;

  // --- Styles ---
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0a0a1a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: 20,
    color: "#f5f0e1",
  };

  const boardStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 0,
    background: "linear-gradient(145deg, #8B4513, #A0522D, #6B3410)",
    borderRadius: 28,
    padding: "20px 16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.1)",
    border: "3px solid #5C3310",
    position: "relative",
  };

  const storeStyle = (isPlayer: boolean): React.CSSProperties => ({
    width: 72,
    minHeight: 180,
    borderRadius: 36,
    background: "linear-gradient(180deg, #5C3310, #3E2210)",
    border: "2px solid #4a2a0a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 4px 12px rgba(0,0,0,0.5)",
    padding: "10px 4px",
    gap: 4,
    position: "relative" as const,
  });

  const storeCountStyle = (isPlayer: boolean): React.CSSProperties => ({
    fontSize: 28,
    fontWeight: 800,
    color: isPlayer ? "#4fc3f7" : "#ef5350",
    textShadow: isPlayer ? "0 0 10px rgba(79,195,247,0.5)" : "0 0 10px rgba(239,83,80,0.5)",
    marginBottom: 4,
  });

  const pitStyle = (idx: number, clickable: boolean, highlighted: boolean): React.CSSProperties => ({
    width: 68,
    height: 68,
    borderRadius: "50%",
    background: highlighted
      ? "radial-gradient(circle, #7B5B3A, #5C3310)"
      : "radial-gradient(circle, #4a2a0a, #3E2210)",
    border: clickable
      ? "2px solid #4fc3f7"
      : highlighted
        ? "2px solid #f1c40f"
        : "2px solid #3a1f08",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: clickable ? "pointer" : "default",
    boxShadow: clickable
      ? "inset 0 3px 8px rgba(0,0,0,0.5), 0 0 8px rgba(79,195,247,0.3)"
      : highlighted
        ? "inset 0 3px 8px rgba(0,0,0,0.5), 0 0 8px rgba(241,196,15,0.4)"
        : "inset 0 3px 8px rgba(0,0,0,0.5)",
    transition: "all 0.2s ease",
    transform: clickable ? "scale(1)" : "scale(1)",
    position: "relative" as const,
  });

  const pitCountStyle = (isPlayer: boolean): React.CSSProperties => ({
    fontSize: 16,
    fontWeight: 700,
    color: isPlayer ? "#4fc3f7" : "#ef5350",
    marginTop: 2,
  });

  const pitLabelStyle: React.CSSProperties = {
    fontSize: 9,
    color: "#8B7355",
    position: "absolute",
    bottom: -16,
    textAlign: "center",
    width: "100%",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{
        fontSize: 36,
        fontWeight: 800,
        marginBottom: 8,
        background: "linear-gradient(135deg, #D2691E, #F4A460, #DEB887)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        letterSpacing: 2,
      }}>
        Mancala
      </h1>

      <p style={{
        fontSize: 14,
        color: "#8B7355",
        marginBottom: 16,
      }}>
        Classic Kalah -- Capture stones and fill your store!
      </p>

      {/* Score display */}
      <div style={{
        display: "flex",
        gap: 40,
        marginBottom: 20,
        fontSize: 18,
        fontWeight: 700,
      }}>
        <span style={{ color: "#4fc3f7" }}>You: {board[PLAYER_STORE]}</span>
        <span style={{ color: "#888" }}>vs</span>
        <span style={{ color: "#ef5350" }}>AI: {board[AI_STORE]}</span>
      </div>

      {/* Status */}
      <div style={{
        marginBottom: 20,
        padding: "8px 24px",
        borderRadius: 12,
        background: gameOver ? "rgba(46,204,113,0.15)" : "rgba(139,69,19,0.2)",
        border: gameOver ? "1px solid #2ecc71" : "1px solid #5C3310",
        color: gameOver ? "#2ecc71" : "#DEB887",
        fontSize: 16,
        fontWeight: 600,
        textAlign: "center",
        minWidth: 280,
      }}>
        {status}
      </div>

      {/* Board */}
      <div style={boardStyle}>
        {/* AI Store (left side) */}
        <div style={storeStyle(false)}>
          <div style={{ fontSize: 10, color: "#ef5350", marginBottom: 4, fontWeight: 600 }}>AI</div>
          <div style={storeCountStyle(false)}>{board[AI_STORE]}</div>
          <StonePile count={board[AI_STORE]} pitIndex={AI_STORE} maxVisible={16} />
        </div>

        {/* Pits area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "0 12px" }}>
          {/* AI pits (top row, displayed right to left: 12,11,10,9,8,7) */}
          <div style={{ display: "flex", gap: 10 }}>
            {[12, 11, 10, 9, 8, 7].map(i => {
              const highlighted = highlightPit === i;
              return (
                <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={pitStyle(i, false, highlighted)}>
                    <StonePile count={board[i]} pitIndex={i} maxVisible={8} />
                    <div style={pitCountStyle(false)}>{board[i]}</div>
                  </div>
                  <div style={{ ...pitLabelStyle, bottom: -14, top: "auto" }}>
                    {String.fromCharCode(70 - (i - 7))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Player pits (bottom row, left to right: 0,1,2,3,4,5) */}
          <div style={{ display: "flex", gap: 10 }}>
            {PLAYER_PITS.map(i => {
              const clickable = canClick(i);
              const highlighted = highlightPit === i;
              return (
                <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={pitStyle(i, clickable, highlighted)}
                    onClick={() => handlePitClick(i)}
                    onMouseEnter={(e) => {
                      if (clickable) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                    }}
                  >
                    <StonePile count={board[i]} pitIndex={i} maxVisible={8} />
                    <div style={pitCountStyle(true)}>{board[i]}</div>
                  </div>
                  <div style={{ ...pitLabelStyle, bottom: -14, top: "auto" }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Store (right side) */}
        <div style={storeStyle(true)}>
          <div style={{ fontSize: 10, color: "#4fc3f7", marginBottom: 4, fontWeight: 600 }}>YOU</div>
          <div style={storeCountStyle(true)}>{board[PLAYER_STORE]}</div>
          <StonePile count={board[PLAYER_STORE]} pitIndex={PLAYER_STORE} maxVisible={16} />
        </div>
      </div>

      {/* Pit labels legend */}
      <div style={{
        marginTop: 24,
        display: "flex",
        gap: 16,
        fontSize: 12,
        color: "#8B7355",
      }}>
        <span>A-F: Your pits (bottom)</span>
        <span>|</span>
        <span>AI pits (top)</span>
      </div>

      {/* New Game button */}
      <button
        onClick={resetGame}
        style={{
          marginTop: 24,
          padding: "12px 36px",
          borderRadius: 12,
          border: "2px solid #8B4513",
          background: "linear-gradient(135deg, #8B4513, #A0522D)",
          color: "#f5f0e1",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          letterSpacing: 1,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #A0522D, #CD853F)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #8B4513, #A0522D)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        }}
      >
        New Game
      </button>

      {/* Rules summary */}
      <div style={{
        marginTop: 24,
        maxWidth: 520,
        fontSize: 12,
        color: "#6B5B4F",
        lineHeight: 1.6,
        textAlign: "center",
      }}>
        <strong style={{ color: "#8B7355" }}>Rules:</strong> Pick a pit on your side to sow stones counter-clockwise, one per pit.
        Land in your store for an extra turn. Land in an empty pit on your side to capture
        the opposite pit. Game ends when one side is empty.
      </div>
    </div>
  );
}
