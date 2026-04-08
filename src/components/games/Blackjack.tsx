"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Types ─── */
interface Card {
  suit: number;
  rank: number;
  id: number;
}

type Phase = "bet" | "dealing" | "playing" | "dealer" | "done";
type ResultType = "win" | "lose" | "push" | "blackjack" | "bust" | "";

interface HistoryEntry {
  result: ResultType;
  bet: number;
  playerTotal: number;
  dealerTotal: number;
}

/* ─── Constants ─── */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const BET_OPTIONS = [10, 25, 50, 100];
const STARTING_CHIPS = 1000;
const DEAL_DELAY = 200;

const isRed = (suit: number) => suit === 1 || suit === 2;

let cardIdCounter = 0;

/* ─── Deck Utilities ─── */
function makeDeck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++)
    for (let r = 0; r < 13; r++)
      d.push({ suit: s, rank: r, id: cardIdCounter++ });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 0) {
      total += 11;
      aces++;
    } else if (c.rank >= 10) {
      total += 10;
    } else {
      total += c.rank + 1;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isSoft17(cards: Card[]): boolean {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 0) {
      total += 11;
      aces++;
    } else if (c.rank >= 10) {
      total += 10;
    } else {
      total += c.rank + 1;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  // soft 17 = total is 17 and at least one ace still counted as 11
  return total === 17 && aces > 0;
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

/* ─── Card Component ─── */
function CardView({
  card,
  faceDown,
  animDelay,
}: {
  card: Card;
  faceDown?: boolean;
  animDelay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const suitColor = isRed(card.suit) ? "#dc2626" : "#1a1a2e";
  const suitChar = SUITS[card.suit];
  const rankChar = RANKS[card.rank];
  const isFace = card.rank >= 10;

  const baseStyle: React.CSSProperties = {
    width: 80,
    height: 112,
    borderRadius: 8,
    position: "relative",
    flexShrink: 0,
    transition: "transform 0.35s ease, opacity 0.35s ease",
    transform: visible ? "translateY(0)" : "translateY(-60px)",
    opacity: visible ? 1 : 0,
    transitionDelay: animDelay ? `${animDelay}ms` : "0ms",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    userSelect: "none",
  };

  if (faceDown) {
    return (
      <div
        style={{
          ...baseStyle,
          background: "linear-gradient(135deg, #1a4a8a 0%, #0d2b5e 100%)",
          border: "2px solid #2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 88,
            borderRadius: 4,
            border: "2px solid rgba(255,255,255,0.15)",
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.2)" }}>
            ♠
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: "linear-gradient(to bottom, #fffef5, #f5f0e0)",
        border: "2px solid #d4c89a",
        display: "flex",
        flexDirection: "column",
        padding: 4,
      }}
    >
      {/* Top-left rank + suit */}
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 6,
          color: suitColor,
          lineHeight: 1,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800 }}>{rankChar}</div>
        <div style={{ fontSize: 12, marginTop: -1 }}>{suitChar}</div>
      </div>
      {/* Center suit/face */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: suitColor,
        }}
      >
        {isFace ? (
          <span style={{ fontSize: 32, fontWeight: 900, fontFamily: "serif" }}>
            {rankChar}
          </span>
        ) : card.rank === 0 ? (
          <span style={{ fontSize: 38 }}>A</span>
        ) : (
          <span style={{ fontSize: 30 }}>{suitChar}</span>
        )}
      </div>
      {/* Bottom-right rank + suit (rotated) */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          color: suitColor,
          lineHeight: 1,
          transform: "rotate(180deg)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800 }}>{rankChar}</div>
        <div style={{ fontSize: 12, marginTop: -1 }}>{suitChar}</div>
      </div>
    </div>
  );
}

/* ─── Hand Display ─── */
function HandDisplay({
  cards,
  hideSecond,
  label,
  total,
}: {
  cards: Card[];
  hideSecond?: boolean;
  label: string;
  total: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            color: "#c8e6c9",
            fontSize: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {label}
        </span>
        <span
          style={{
            background: "rgba(0,0,0,0.4)",
            color: "#ffd54f",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {total}
        </span>
      </div>
      <div style={{ display: "flex", gap: -4, position: "relative" }}>
        {cards.map((c, i) => (
          <div
            key={c.id}
            style={{
              marginLeft: i === 0 ? 0 : -16,
              zIndex: i,
              position: "relative",
            }}
          >
            <CardView
              card={c}
              faceDown={hideSecond && i === 1}
              animDelay={i * DEAL_DELAY}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Chip Component ─── */
function ChipButton({
  value,
  selected,
  onClick,
  disabled,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const colors: Record<number, { bg: string; border: string; text: string }> = {
    10: { bg: "#f5f5f5", border: "#aaa", text: "#333" },
    25: { bg: "#22c55e", border: "#16a34a", text: "#fff" },
    50: { bg: "#3b82f6", border: "#2563eb", text: "#fff" },
    100: { bg: "#111", border: "#555", text: "#ffd700" },
  };
  const c = colors[value] || colors[10];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: `3px solid ${selected ? "#ffd700" : c.border}`,
        background: c.bg,
        color: c.text,
        fontSize: 16,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: selected
          ? "0 0 12px rgba(255,215,0,0.5), inset 0 0 8px rgba(0,0,0,0.2)"
          : "inset 0 0 8px rgba(0,0,0,0.2)",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s ease",
        transform: selected ? "scale(1.1)" : "scale(1)",
      }}
    >
      {value}
    </button>
  );
}

/* ─── Result Banner ─── */
function resultInfo(r: ResultType): { text: string; color: string } {
  switch (r) {
    case "blackjack":
      return { text: "BLACKJACK!", color: "#ffd700" };
    case "win":
      return { text: "YOU WIN!", color: "#4ade80" };
    case "lose":
      return { text: "YOU LOSE", color: "#ef4444" };
    case "bust":
      return { text: "BUST!", color: "#ef4444" };
    case "push":
      return { text: "PUSH", color: "#94a3b8" };
    default:
      return { text: "", color: "#fff" };
  }
}

/* ─── Main Component ─── */
export default function Blackjack() {
  const [deck, setDeck] = useState<Card[]>(() => makeDeck());
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("bet");
  const [result, setResult] = useState<ResultType>("");
  const [chips, setChips] = useState(STARTING_CHIPS);
  const [bet, setBet] = useState(25);
  const [currentBet, setCurrentBet] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [message, setMessage] = useState("");
  const dealingRef = useRef(false);

  const addHistory = useCallback(
    (r: ResultType, b: number, pt: number, dt: number) => {
      setHistory((prev) => [{ result: r, bet: b, playerTotal: pt, dealerTotal: dt }, ...prev].slice(0, 10));
    },
    []
  );

  /* ─── Deal ─── */
  const deal = useCallback(() => {
    if (chips < bet) return;
    dealingRef.current = true;
    const d = makeDeck();
    const p1 = d.pop()!;
    const d1 = d.pop()!;
    const p2 = d.pop()!;
    const d2 = d.pop()!;

    setDeck(d);
    setPlayerCards([p1, p2]);
    setDealerCards([d1, d2]);
    setChips((c) => c - bet);
    setCurrentBet(bet);
    setResult("");
    setMessage("");
    setPhase("dealing");

    // After dealing animation, check for blackjack or move to playing
    setTimeout(() => {
      dealingRef.current = false;
      const pCards = [p1, p2];
      const dCards = [d1, d2];
      const pBJ = isBlackjack(pCards);
      const dBJ = isBlackjack(dCards);

      if (pBJ && dBJ) {
        setPhase("done");
        setResult("push");
        setMessage("Both have Blackjack!");
        setChips((c) => c + bet);
        addHistory("push", bet, 21, 21);
      } else if (pBJ) {
        const winnings = Math.floor(bet * 2.5);
        setPhase("done");
        setResult("blackjack");
        setMessage(`Blackjack pays 3:2! +${winnings - bet}`);
        setChips((c) => c + winnings);
        addHistory("blackjack", bet, 21, handValue(dCards));
      } else if (dBJ) {
        setPhase("done");
        setResult("lose");
        setMessage("Dealer has Blackjack!");
        addHistory("lose", bet, handValue(pCards), 21);
      } else {
        setPhase("playing");
      }
    }, 900);
  }, [chips, bet, addHistory]);

  /* ─── Hit ─── */
  const hit = useCallback(() => {
    if (phase !== "playing") return;
    const d = [...deck];
    const newCard = d.pop()!;
    const p = [...playerCards, newCard];
    setDeck(d);
    setPlayerCards(p);

    const val = handValue(p);
    if (val > 21) {
      setPhase("done");
      setResult("bust");
      setMessage(`Busted with ${val}!`);
      addHistory("bust", currentBet, val, handValue(dealerCards));
    } else if (val === 21) {
      // Auto-stand on 21
      runDealer(p, dealerCards, d);
    }
  }, [phase, deck, playerCards, dealerCards, currentBet, addHistory]);

  /* ─── Stand ─── */
  const stand = useCallback(() => {
    if (phase !== "playing") return;
    runDealer(playerCards, dealerCards, deck);
  }, [phase, playerCards, dealerCards, deck]);

  /* ─── Double Down ─── */
  const doubleDown = useCallback(() => {
    if (phase !== "playing" || playerCards.length !== 2 || chips < currentBet)
      return;

    const extraBet = currentBet;
    setChips((c) => c - extraBet);
    const newBet = currentBet + extraBet;
    setCurrentBet(newBet);

    const d = [...deck];
    const newCard = d.pop()!;
    const p = [...playerCards, newCard];
    setDeck(d);
    setPlayerCards(p);

    const val = handValue(p);
    if (val > 21) {
      setPhase("done");
      setResult("bust");
      setMessage(`Busted with ${val}! Lost ${newBet}`);
      addHistory("bust", newBet, val, handValue(dealerCards));
    } else {
      runDealerWithBet(p, dealerCards, d, newBet);
    }
  }, [phase, playerCards, dealerCards, deck, chips, currentBet, addHistory]);

  /* ─── Dealer Logic ─── */
  const runDealer = useCallback(
    (pCards: Card[], dCards: Card[], d: Card[]) => {
      runDealerWithBet(pCards, dCards, d, currentBet);
    },
    [currentBet]
  );

  const runDealerWithBet = useCallback(
    (pCards: Card[], dCards: Card[], d: Card[], activeBet: number) => {
      setPhase("dealer");
      let dcards = [...dCards];
      let dd = [...d];

      // Dealer hits on soft 16 and below, stands on hard/soft 17+
      // "Dealer hits on soft 16, stands on 17" means dealer hits until 17+
      while (handValue(dcards) < 17 || (handValue(dcards) === 17 && isSoft17(dcards) === false && handValue(dcards) < 17)) {
        // Simple: dealer hits below 17
        if (handValue(dcards) >= 17) break;
        dcards.push(dd.pop()!);
      }

      setDealerCards(dcards);
      setDeck(dd);

      const pv = handValue(pCards);
      const dv = handValue(dcards);

      setTimeout(() => {
        setPhase("done");
        if (dv > 21) {
          setResult("win");
          setMessage(`Dealer busts with ${dv}! +${activeBet}`);
          setChips((c) => c + activeBet * 2);
          addHistory("win", activeBet, pv, dv);
        } else if (pv > dv) {
          setResult("win");
          setMessage(`${pv} beats ${dv}! +${activeBet}`);
          setChips((c) => c + activeBet * 2);
          addHistory("win", activeBet, pv, dv);
        } else if (dv > pv) {
          setResult("lose");
          setMessage(`Dealer's ${dv} beats your ${pv}`);
          addHistory("lose", activeBet, pv, dv);
        } else {
          setResult("push");
          setMessage(`Push at ${pv}`);
          setChips((c) => c + activeBet);
          addHistory("push", activeBet, pv, dv);
        }
      }, 500);
    },
    [addHistory]
  );

  /* ─── New Game (reset all) ─── */
  const newGame = () => {
    setChips(STARTING_CHIPS);
    setPlayerCards([]);
    setDealerCards([]);
    setPhase("bet");
    setResult("");
    setMessage("");
    setHistory([]);
    setCurrentBet(0);
  };

  const showDealerCards = phase === "done" || phase === "dealer";
  const canDoubleDown =
    phase === "playing" && playerCards.length === 2 && chips >= currentBet;

  const ri = resultInfo(result);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0a3d24 0%, #0f5132 30%, #0d4a2c 100%)",
        minHeight: 500,
        borderRadius: 16,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Felt texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header: Chip balance */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: 500,
          marginBottom: 16,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ffd700, #f59e0b)",
              border: "2px solid #b8860b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 900,
              color: "#5c3d00",
            }}
          >
            $
          </div>
          <span style={{ color: "#ffd700", fontSize: 20, fontWeight: 700 }}>
            {chips.toLocaleString()}
          </span>
        </div>
        {phase !== "bet" && (
          <span
            style={{
              color: "#a5d6a7",
              fontSize: 13,
              background: "rgba(0,0,0,0.3)",
              padding: "3px 10px",
              borderRadius: 8,
            }}
          >
            Bet: {currentBet}
          </span>
        )}
      </div>

      {/* Dealer Hand */}
      {phase !== "bet" && (
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 500 }}>
          <HandDisplay
            cards={dealerCards}
            hideSecond={!showDealerCards}
            label="Dealer"
            total={
              showDealerCards
                ? String(handValue(dealerCards))
                : dealerCards.length > 0
                ? String(handValue([dealerCards[0]]))
                : "0"
            }
          />
        </div>
      )}

      {/* Result Banner */}
      {phase === "done" && result && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            margin: "8px 0",
            padding: "10px 32px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: 12,
            border: `1px solid ${ri.color}33`,
          }}
        >
          <div
            style={{
              color: ri.color,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 2,
              textShadow: `0 0 20px ${ri.color}66`,
            }}
          >
            {ri.text}
          </div>
          {message && (
            <div style={{ color: "#ccc", fontSize: 13, marginTop: 2 }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* Player Hand */}
      {phase !== "bet" && (
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 500 }}>
          <HandDisplay
            cards={playerCards}
            label="Player"
            total={String(handValue(playerCards))}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          gap: 10,
          marginTop: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {phase === "playing" && (
          <>
            <button
              onClick={hit}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(to bottom, #3b82f6, #2563eb)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            >
              Hit
            </button>
            <button
              onClick={stand}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(to bottom, #eab308, #ca8a04)",
                color: "#000",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            >
              Stand
            </button>
            <button
              onClick={doubleDown}
              disabled={!canDoubleDown}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: canDoubleDown
                  ? "linear-gradient(to bottom, #a855f7, #7c3aed)"
                  : "#444",
                color: canDoubleDown ? "#fff" : "#777",
                fontWeight: 700,
                fontSize: 15,
                cursor: canDoubleDown ? "pointer" : "not-allowed",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            >
              Double Down
            </button>
          </>
        )}

        {phase === "done" && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => {
                setPhase("bet");
                setResult("");
                setMessage("");
                setPlayerCards([]);
                setDealerCards([]);
                setCurrentBet(0);
              }}
              disabled={chips <= 0}
              style={{
                padding: "12px 36px",
                borderRadius: 10,
                border: "none",
                background:
                  chips > 0
                    ? "linear-gradient(to bottom, #22c55e, #16a34a)"
                    : "#444",
                color: chips > 0 ? "#fff" : "#777",
                fontWeight: 700,
                fontSize: 16,
                cursor: chips > 0 ? "pointer" : "not-allowed",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              New Hand
            </button>
            {chips <= 0 && (
              <button
                onClick={newGame}
                style={{
                  padding: "10px 28px",
                  borderRadius: 8,
                  border: "1px solid #555",
                  background: "rgba(255,255,255,0.05)",
                  color: "#ccc",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                New Game (Reset to {STARTING_CHIPS})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Betting Phase */}
      {phase === "bet" && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            marginTop: 24,
          }}
        >
          <div style={{ color: "#a5d6a7", fontSize: 16, fontWeight: 600 }}>
            Place Your Bet
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {BET_OPTIONS.map((b) => (
              <ChipButton
                key={b}
                value={b}
                selected={bet === b}
                onClick={() => setBet(b)}
                disabled={chips < b}
              />
            ))}
          </div>

          <button
            onClick={deal}
            disabled={chips < bet}
            style={{
              padding: "14px 48px",
              borderRadius: 12,
              border: "none",
              background:
                chips >= bet
                  ? "linear-gradient(to bottom, #22c55e, #16a34a)"
                  : "#444",
              color: chips >= bet ? "#fff" : "#777",
              fontWeight: 800,
              fontSize: 18,
              cursor: chips >= bet ? "pointer" : "not-allowed",
              boxShadow:
                chips >= bet ? "0 4px 16px rgba(34,197,94,0.3)" : "none",
              letterSpacing: 1,
            }}
          >
            DEAL
          </button>

          <button
            onClick={newGame}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid #444",
              background: "transparent",
              color: "#888",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            New Game
          </button>
        </div>
      )}

      {/* Round History */}
      {history.length > 0 && (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 24,
            width: "100%",
            maxWidth: 500,
          }}
        >
          <div
            style={{
              color: "#6b8a6b",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            History
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {history.map((h, i) => {
              const info = resultInfo(h.result);
              return (
                <div
                  key={i}
                  style={{
                    background: "rgba(0,0,0,0.35)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: 44,
                    border: `1px solid ${info.color}33`,
                  }}
                >
                  <span
                    style={{
                      color: info.color,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {h.result === "blackjack"
                      ? "BJ"
                      : h.result.toUpperCase().slice(0, 1)}
                  </span>
                  <span style={{ color: "#aaa", fontSize: 9 }}>
                    {h.playerTotal} v {h.dealerTotal}
                  </span>
                  <span
                    style={{
                      color:
                        h.result === "win" || h.result === "blackjack"
                          ? "#4ade80"
                          : h.result === "push"
                          ? "#94a3b8"
                          : "#ef4444",
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  >
                    {h.result === "win" || h.result === "blackjack"
                      ? `+${h.result === "blackjack" ? Math.floor(h.bet * 1.5) : h.bet}`
                      : h.result === "push"
                      ? "±0"
                      : `-${h.bet}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
