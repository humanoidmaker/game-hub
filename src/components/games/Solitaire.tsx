"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
const SUIT_SYMBOLS: Record<number, string> = { 0: "♠", 1: "♥", 2: "♦", 3: "♣" };

function isRed(suit: number): boolean {
  return suit === 1 || suit === 2;
}

interface Card {
  suit: number;
  rank: number;
  faceUp: boolean;
  id: string;
}

interface GameState {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
}

interface Selection {
  source: "tableau" | "waste";
  col?: number;
  cardIndex?: number;
}

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) {
    for (let r = 0; r < 13; r++) {
      deck.push({ suit: s, rank: r, faceUp: false, id: `${s}-${r}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cloneCard(c: Card): Card {
  return { suit: c.suit, rank: c.rank, faceUp: c.faceUp, id: c.id };
}

function cloneState(g: GameState): GameState {
  return {
    tableau: g.tableau.map((col) => col.map(cloneCard)),
    stock: g.stock.map(cloneCard),
    waste: g.waste.map(cloneCard),
    foundations: g.foundations.map((f) => f.map(cloneCard)),
  };
}

function initGame(): GameState {
  const deck = makeDeck();
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let idx = 0;
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r <= c; r++) {
      const card = deck[idx++];
      card.faceUp = r === c;
      tableau[c].push(card);
    }
  }
  return {
    tableau,
    stock: deck.slice(idx),
    waste: [],
    foundations: [[], [], [], []],
  };
}

function canPlaceOnTableau(card: Card, target: Card[]): boolean {
  if (target.length === 0) return card.rank === 12;
  const top = target[target.length - 1];
  return top.faceUp && isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
}

function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 0;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function checkWin(foundations: Card[][]): boolean {
  return foundations.every((f) => f.length === 13);
}

/* ------------------------------------------------------------------ */
/*  CARD FACE RENDERING HELPERS                                       */
/* ------------------------------------------------------------------ */

function getSuitPips(rank: number): { x: number; y: number; flip?: boolean }[] {
  const cx = 50;
  const layouts: Record<number, { x: number; y: number; flip?: boolean }[]> = {
    0: [{ x: cx, y: 50 }], // A
    1: [{ x: cx, y: 25 }, { x: cx, y: 75, flip: true }],
    2: [{ x: cx, y: 20 }, { x: cx, y: 50 }, { x: cx, y: 80, flip: true }],
    3: [{ x: 30, y: 25 }, { x: 70, y: 25 }, { x: 30, y: 75, flip: true }, { x: 70, y: 75, flip: true }],
    4: [{ x: 30, y: 25 }, { x: 70, y: 25 }, { x: cx, y: 50 }, { x: 30, y: 75, flip: true }, { x: 70, y: 75, flip: true }],
    5: [{ x: 30, y: 25 }, { x: 70, y: 25 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 75, flip: true }, { x: 70, y: 75, flip: true }],
    6: [{ x: 30, y: 25 }, { x: 70, y: 25 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: cx, y: 37 }, { x: 30, y: 75, flip: true }, { x: 70, y: 75, flip: true }],
    7: [{ x: 30, y: 22 }, { x: 70, y: 22 }, { x: 30, y: 44 }, { x: 70, y: 44 }, { x: cx, y: 33 }, { x: 30, y: 66, flip: true }, { x: 70, y: 66, flip: true }, { x: cx, y: 78, flip: true }],
    8: [{ x: 30, y: 20 }, { x: 70, y: 20 }, { x: 30, y: 40 }, { x: 70, y: 40 }, { x: cx, y: 30 }, { x: 30, y: 60, flip: true }, { x: 70, y: 60, flip: true }, { x: cx, y: 70, flip: true }, { x: cx, y: 50 }],
    9: [{ x: 30, y: 18 }, { x: 70, y: 18 }, { x: 30, y: 38 }, { x: 70, y: 38 }, { x: 30, y: 58, flip: true }, { x: 70, y: 58, flip: true }, { x: 30, y: 78, flip: true }, { x: 70, y: 78, flip: true }, { x: cx, y: 28 }, { x: cx, y: 68, flip: true }],
  };
  return layouts[rank] || [];
}

function getFaceSymbol(rank: number): string {
  if (rank === 10) return "J";
  if (rank === 11) return "Q";
  if (rank === 12) return "K";
  return "";
}

/* ------------------------------------------------------------------ */
/*  CARD COMPONENT                                                    */
/* ------------------------------------------------------------------ */

function CardView({
  card,
  onClick,
  onDoubleClick,
  selected,
  style,
  draggable,
}: {
  card: Card | null;
  onClick?: () => void;
  onDoubleClick?: () => void;
  selected?: boolean;
  style?: React.CSSProperties;
  draggable?: boolean;
}) {
  const CARD_W = 72;
  const CARD_H = 100;

  if (!card) {
    return (
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 8,
          border: "2px dashed rgba(255,255,255,0.15)",
          background: "rgba(0,0,0,0.15)",
          ...style,
        }}
      />
    );
  }

  if (!card.faceUp) {
    return (
      <div
        onClick={onClick}
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 8,
          border: "1px solid #0d2b5e",
          background: "linear-gradient(135deg, #1a3a7a 0%, #0f2660 50%, #1a3a7a 100%)",
          cursor: onClick ? "pointer" : "default",
          boxShadow: "1px 2px 4px rgba(0,0,0,0.4)",
          position: "relative",
          overflow: "hidden",
          ...style,
        }}
      >
        {/* Card back pattern */}
        <div
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: 5,
            border: "1.5px solid rgba(255,255,255,0.15)",
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.04) 3px, rgba(255,255,255,0.04) 6px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
          }}
        />
      </div>
    );
  }

  const color = isRed(card.suit) ? "#c0392b" : "#1a1a2e";
  const suitChar = SUIT_SYMBOLS[card.suit];
  const rankStr = RANKS[card.rank];
  const isFace = card.rank >= 10;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 8,
        border: selected ? "2px solid #3b82f6" : "1px solid #aaa",
        background: "linear-gradient(145deg, #ffffff 0%, #f5f0e8 100%)",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        position: "relative",
        boxShadow: selected
          ? "0 0 8px rgba(59,130,246,0.6), 1px 2px 4px rgba(0,0,0,0.3)"
          : "1px 2px 4px rgba(0,0,0,0.3)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Top-left corner */}
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
        }}
      >
        <span style={{ color, fontSize: 13, fontWeight: 800, fontFamily: "Georgia, serif" }}>
          {rankStr}
        </span>
        <span style={{ color, fontSize: 11, marginTop: -1 }}>{suitChar}</span>
      </div>

      {/* Bottom-right corner (inverted) */}
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          transform: "rotate(180deg)",
        }}
      >
        <span style={{ color, fontSize: 13, fontWeight: 800, fontFamily: "Georgia, serif" }}>
          {rankStr}
        </span>
        <span style={{ color, fontSize: 11, marginTop: -1 }}>{suitChar}</span>
      </div>

      {/* Center area */}
      {isFace ? (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <span style={{ fontSize: 28, color, lineHeight: 1 }}>{suitChar}</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color,
              fontFamily: "Georgia, serif",
              marginTop: -2,
            }}
          >
            {getFaceSymbol(card.rank)}
          </span>
        </div>
      ) : card.rank === 0 ? (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 36,
            color,
            lineHeight: 1,
          }}
        >
          {suitChar}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 16,
            right: 16,
            bottom: 18,
          }}
        >
          {getSuitPips(card.rank).map((pip, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${pip.x}%`,
                top: `${pip.y}%`,
                transform: `translate(-50%,-50%)${pip.flip ? " rotate(180deg)" : ""}`,
                fontSize: 16,
                lineHeight: 1,
                color,
              }}
            >
              {suitChar}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EMPTY PLACEHOLDER                                                 */
/* ------------------------------------------------------------------ */

function EmptySlot({
  label,
  onClick,
  style,
}: {
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 72,
        height: 100,
        borderRadius: 8,
        border: "2px dashed rgba(255,255,255,0.2)",
        background: "rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {label && (
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 24 }}>{label}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                    */
/* ------------------------------------------------------------------ */

export default function Solitaire() {
  const [game, setGame] = useState<GameState>(initGame);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [winAnimFrame, setWinAnimFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (gameStarted && !won) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, won]);

  // Win animation
  useEffect(() => {
    if (!won) return;
    const interval = setInterval(() => {
      setWinAnimFrame((f) => (f + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [won]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const newGame = useCallback(() => {
    setGame(initGame());
    setSelected(null);
    setMoves(0);
    setTimer(0);
    setGameStarted(false);
    setWon(false);
    setWinAnimFrame(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const restart = useCallback(() => {
    // Restart with the same deck by flipping everything face down and re-dealing
    // For simplicity, just start a new game
    newGame();
  }, [newGame]);

  const startIfNeeded = () => {
    if (!gameStarted) setGameStarted(true);
  };

  const incrementMoves = () => setMoves((m) => m + 1);

  /* ---- Try to auto-move a card to foundation ---- */
  const tryAutoFoundation = (g: GameState, card: Card): number => {
    for (let fi = 0; fi < 4; fi++) {
      if (canPlaceOnFoundation(card, g.foundations[fi])) return fi;
    }
    return -1;
  };

  /* ---- Draw from stock ---- */
  const drawStock = () => {
    startIfNeeded();
    const g = cloneState(game);
    if (g.stock.length === 0) {
      if (g.waste.length === 0) return;
      g.stock = g.waste.reverse().map((c) => ({ ...c, faceUp: false }));
      g.waste = [];
    } else {
      const c = g.stock.pop()!;
      c.faceUp = true;
      g.waste.push(c);
    }
    incrementMoves();
    setGame(g);
    setSelected(null);
  };

  /* ---- Click on waste pile ---- */
  const clickWaste = () => {
    if (game.waste.length === 0) return;
    startIfNeeded();

    if (selected?.source === "waste") {
      setSelected(null);
      return;
    }
    setSelected({ source: "waste" });
  };

  /* ---- Double-click waste (auto to foundation) ---- */
  const doubleClickWaste = () => {
    if (game.waste.length === 0) return;
    startIfNeeded();
    const g = cloneState(game);
    const card = g.waste[g.waste.length - 1];
    const fi = tryAutoFoundation(g, card);
    if (fi >= 0) {
      g.foundations[fi].push(card);
      g.waste.pop();
      incrementMoves();
      setGame(g);
      setSelected(null);
      if (checkWin(g.foundations)) setWon(true);
    }
  };

  /* ---- Click foundation (for placing selected card) ---- */
  const clickFoundation = (fi: number) => {
    if (!selected) return;
    const g = cloneState(game);

    let card: Card | null = null;

    if (selected.source === "waste" && g.waste.length > 0) {
      card = g.waste[g.waste.length - 1];
      if (canPlaceOnFoundation(card, g.foundations[fi])) {
        g.foundations[fi].push(card);
        g.waste.pop();
        incrementMoves();
        setGame(g);
        setSelected(null);
        if (checkWin(g.foundations)) setWon(true);
        return;
      }
    }

    if (
      selected.source === "tableau" &&
      selected.col !== undefined &&
      selected.cardIndex !== undefined
    ) {
      const col = g.tableau[selected.col];
      // Only top card can go to foundation
      if (selected.cardIndex === col.length - 1) {
        card = col[col.length - 1];
        if (canPlaceOnFoundation(card, g.foundations[fi])) {
          g.foundations[fi].push(card);
          col.pop();
          if (col.length > 0 && !col[col.length - 1].faceUp) {
            col[col.length - 1].faceUp = true;
          }
          incrementMoves();
          setGame(g);
          setSelected(null);
          if (checkWin(g.foundations)) setWon(true);
          return;
        }
      }
    }

    setSelected(null);
  };

  /* ---- Click tableau card ---- */
  const clickTableau = (colIdx: number, cardIdx: number) => {
    startIfNeeded();
    const card = game.tableau[colIdx][cardIdx];
    if (!card.faceUp) return;

    if (selected) {
      // Try to place selected onto this column
      const g = cloneState(game);

      if (selected.source === "waste" && g.waste.length > 0) {
        const src = g.waste[g.waste.length - 1];
        if (canPlaceOnTableau(src, g.tableau[colIdx])) {
          g.tableau[colIdx].push(src);
          g.waste.pop();
          incrementMoves();
          setGame(g);
          setSelected(null);
          return;
        }
      }

      if (
        selected.source === "tableau" &&
        selected.col !== undefined &&
        selected.cardIndex !== undefined
      ) {
        if (selected.col === colIdx) {
          // Re-clicking same column, change selection
          setSelected({ source: "tableau", col: colIdx, cardIndex: cardIdx });
          return;
        }
        const srcCards = g.tableau[selected.col].slice(selected.cardIndex);
        const topSrc = srcCards[0];
        if (canPlaceOnTableau(topSrc, g.tableau[colIdx])) {
          g.tableau[selected.col] = g.tableau[selected.col].slice(0, selected.cardIndex);
          g.tableau[colIdx] = [...g.tableau[colIdx], ...srcCards];
          const srcCol = g.tableau[selected.col];
          if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
            srcCol[srcCol.length - 1].faceUp = true;
          }
          incrementMoves();
          setGame(g);
          setSelected(null);
          return;
        }
      }

      setSelected(null);
      return;
    }

    // No selection yet, select this card
    setSelected({ source: "tableau", col: colIdx, cardIndex: cardIdx });
  };

  /* ---- Click on empty tableau column ---- */
  const clickEmptyTableau = (colIdx: number) => {
    if (!selected) return;
    startIfNeeded();
    const g = cloneState(game);

    if (selected.source === "waste" && g.waste.length > 0) {
      const src = g.waste[g.waste.length - 1];
      if (src.rank === 12) {
        g.tableau[colIdx].push(src);
        g.waste.pop();
        incrementMoves();
        setGame(g);
        setSelected(null);
        return;
      }
    }

    if (
      selected.source === "tableau" &&
      selected.col !== undefined &&
      selected.cardIndex !== undefined
    ) {
      const srcCards = g.tableau[selected.col].slice(selected.cardIndex);
      if (srcCards[0].rank === 12) {
        g.tableau[selected.col] = g.tableau[selected.col].slice(0, selected.cardIndex);
        g.tableau[colIdx] = srcCards;
        const srcCol = g.tableau[selected.col];
        if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
          srcCol[srcCol.length - 1].faceUp = true;
        }
        incrementMoves();
        setGame(g);
        setSelected(null);
        return;
      }
    }

    setSelected(null);
  };

  /* ---- Double-click tableau card (auto to foundation) ---- */
  const doubleClickTableau = (colIdx: number, cardIdx: number) => {
    startIfNeeded();
    const col = game.tableau[colIdx];
    if (cardIdx !== col.length - 1) return; // only top card
    const card = col[cardIdx];
    if (!card.faceUp) return;

    const g = cloneState(game);
    const fi = tryAutoFoundation(g, card);
    if (fi >= 0) {
      g.foundations[fi].push(cloneCard(card));
      g.tableau[colIdx].pop();
      const srcCol = g.tableau[colIdx];
      if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
        srcCol[srcCol.length - 1].faceUp = true;
      }
      incrementMoves();
      setGame(g);
      setSelected(null);
      if (checkWin(g.foundations)) setWon(true);
    }
  };

  /* ---- Check if a card is part of the current selection ---- */
  const isSelected = (source: string, col?: number, cardIdx?: number) => {
    if (!selected) return false;
    if (selected.source !== source) return false;
    if (source === "waste") return true;
    if (source === "tableau") {
      return (
        selected.col === col &&
        selected.cardIndex !== undefined &&
        cardIdx !== undefined &&
        cardIdx >= selected.cardIndex
      );
    }
    return false;
  };

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  const CARD_W = 72;
  const CARD_H = 100;
  const GAP = 12;
  const TABLEAU_GAP = 10;
  const FACE_DOWN_OFFSET = 16;
  const FACE_UP_OFFSET = 25;

  return (
    <div
      style={{
        width: "100%",
        minWidth: 600,
        minHeight: "100vh",
        background: "#0f5132",
        backgroundImage:
          "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.06) 0%, transparent 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 8px",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "auto",
      }}
      onClick={() => {
        // Click on background clears selection
      }}
    >
      {/* ---- Header bar ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: 620,
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h2
          style={{
            color: "#fff",
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            letterSpacing: 1,
          }}
        >
          Klondike Solitaire
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              gap: 16,
              color: "#d4edda",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span>Moves: {moves}</span>
            <span>Time: {formatTime(timer)}</span>
          </div>
          <button
            onClick={newGame}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(135deg, #28a745, #1e7e34)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            New Game
          </button>
          <button
            onClick={restart}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "#d4edda",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Restart
          </button>
        </div>
      </div>

      {/* ---- Top row: stock, waste, foundations ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 620,
          marginBottom: 20,
          gap: GAP,
        }}
      >
        {/* Stock pile */}
        {game.stock.length > 0 ? (
          <div style={{ position: "relative", cursor: "pointer" }} onClick={drawStock}>
            <CardView card={{ ...game.stock[game.stock.length - 1], faceUp: false }} onClick={drawStock} />
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                background: "rgba(0,0,0,0.5)",
                color: "#ccc",
                fontSize: 10,
                padding: "1px 4px",
                borderRadius: 3,
              }}
            >
              {game.stock.length}
            </div>
          </div>
        ) : (
          <EmptySlot
            label="↻"
            onClick={drawStock}
            style={{ cursor: "pointer" }}
          />
        )}

        {/* Waste pile */}
        {game.waste.length > 0 ? (
          <CardView
            card={game.waste[game.waste.length - 1]}
            onClick={clickWaste}
            onDoubleClick={doubleClickWaste}
            selected={isSelected("waste")}
          />
        ) : (
          <EmptySlot />
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Foundations */}
        {game.foundations.map((f, fi) => (
          <div key={fi} onClick={() => clickFoundation(fi)} style={{ cursor: "pointer" }}>
            {f.length > 0 ? (
              <CardView card={f[f.length - 1]} onClick={() => clickFoundation(fi)} />
            ) : (
              <EmptySlot label={SUITS[fi]} onClick={() => clickFoundation(fi)} />
            )}
          </div>
        ))}
      </div>

      {/* ---- Tableau ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          maxWidth: 620,
          gap: TABLEAU_GAP,
        }}
      >
        {game.tableau.map((col, ci) => {
          const maxOffset =
            col.reduce((acc, c, i) => {
              return acc + (i === 0 ? 0 : c.faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET);
            }, 0) + CARD_H;

          return (
            <div
              key={ci}
              style={{
                position: "relative",
                width: CARD_W,
                minHeight: CARD_H + 200,
                height: maxOffset + 10,
                flex: "1 1 0",
                maxWidth: CARD_W + 10,
              }}
              onClick={() => {
                if (col.length === 0) clickEmptyTableau(ci);
              }}
            >
              {col.length === 0 && (
                <EmptySlot
                  label="K"
                  onClick={() => clickEmptyTableau(ci)}
                  style={{ position: "absolute", top: 0, left: 0 }}
                />
              )}
              {col.map((card, idx) => {
                let top = 0;
                for (let i = 0; i < idx; i++) {
                  top += col[i].faceUp ? FACE_UP_OFFSET : FACE_DOWN_OFFSET;
                }
                const sel = isSelected("tableau", ci, idx);

                return (
                  <div
                    key={card.id}
                    style={{
                      position: "absolute",
                      top,
                      left: 0,
                      zIndex: idx,
                      transition: "transform 0.1s ease",
                      transform: sel ? "translateY(-4px)" : "none",
                    }}
                  >
                    <CardView
                      card={card}
                      onClick={() => clickTableau(ci, idx)}
                      onDoubleClick={() => doubleClickTableau(ci, idx)}
                      selected={sel}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ---- Win overlay ---- */}
      {won && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a5e2e, #0f5132, #1a5e2e)",
              borderRadius: 20,
              padding: "40px 60px",
              textAlign: "center",
              boxShadow: "0 0 60px rgba(40,167,69,0.4)",
              border: "2px solid rgba(255,255,255,0.2)",
              animation: "none",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Animated sparkles */}
            {[...Array(8)].map((_, i) => {
              const angle = (winAnimFrame + i * 45) * (Math.PI / 180);
              const radius = 80 + Math.sin(winAnimFrame * 0.05 + i) * 20;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: ["#ffd700", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8"][i],
                    opacity: 0.8,
                    transform: "translate(-50%,-50%)",
                  }}
                />
              );
            })}

            <div style={{ fontSize: 48, marginBottom: 8 }}>
              {SUITS.map((s, i) => (
                <span
                  key={i}
                  style={{
                    color: i === 1 || i === 2 ? "#e74c3c" : "#ecf0f1",
                    margin: "0 4px",
                    display: "inline-block",
                    transform: `rotate(${Math.sin((winAnimFrame + i * 90) * 0.03) * 15}deg)`,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
            <h2
              style={{
                color: "#ffd700",
                fontSize: 36,
                fontWeight: 800,
                margin: "8px 0",
                textShadow: "0 2px 8px rgba(255,215,0,0.4)",
                letterSpacing: 2,
              }}
            >
              YOU WIN!
            </h2>
            <p style={{ color: "#d4edda", fontSize: 16, margin: "4px 0" }}>
              Completed in {moves} moves
            </p>
            <p style={{ color: "#d4edda", fontSize: 16, margin: "4px 0 20px" }}>
              Time: {formatTime(timer)}
            </p>
            <button
              onClick={newGame}
              style={{
                padding: "12px 32px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg, #ffd700, #ffb700)",
                color: "#1a1a2e",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(255,215,0,0.3)",
                letterSpacing: 1,
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
