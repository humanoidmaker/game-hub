"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_VALUES: Record<string, number> = {};
RANKS.forEach((r, i) => (RANK_VALUES[r] = i + 2));

interface Card {
  rank: string;
  suit: string;
  value: number;
}

function isRed(suit: string): boolean {
  return suit === "♥" || suit === "♦";
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: RANK_VALUES[rank] });
    }
  }
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function CardDisplay({ card, faceDown, size = 1, glow }: { card?: Card; faceDown?: boolean; size?: number; glow?: string }) {
  const w = 80 * size;
  const h = 112 * size;
  if (!card || faceDown) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 8 * size, border: "2px solid #333",
        background: faceDown ? "linear-gradient(135deg, #1e3a5f, #0f1f3a)" : "#0d0d24",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: glow ? `0 0 12px ${glow}` : "0 2px 8px rgba(0,0,0,0.4)",
      }}>
        {faceDown && (
          <div style={{ width: w - 12, height: h - 12, borderRadius: 4, border: "1px solid #2a4a6a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#2a4a6a", fontSize: 20 * size, fontWeight: 700 }}>?</span>
          </div>
        )}
      </div>
    );
  }
  const color = isRed(card.suit) ? "#ef4444" : "#fff";
  return (
    <div style={{
      width: w, height: h, borderRadius: 8 * size, border: "2px solid #444",
      background: "linear-gradient(145deg, #1a1a40, #12122e)",
      display: "flex", flexDirection: "column", padding: 6 * size,
      boxShadow: glow ? `0 0 15px ${glow}` : "0 2px 8px rgba(0,0,0,0.4)",
      position: "relative",
      transition: "transform 0.3s, box-shadow 0.3s",
    }}>
      <div style={{ color, fontSize: 16 * size, fontWeight: 800, lineHeight: 1 }}>
        {card.rank}
      </div>
      <div style={{ color, fontSize: 12 * size, lineHeight: 1 }}>
        {card.suit}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color, fontSize: 32 * size }}>{card.suit}</span>
      </div>
      <div style={{ color, fontSize: 14 * size, fontWeight: 800, textAlign: "right", lineHeight: 1 }}>
        {card.rank}
      </div>
    </div>
  );
}

export default function CardWar() {
  const [screen, setScreen] = useState<"menu" | "play" | "over">("menu");
  const [playerDeck, setPlayerDeck] = useState<Card[]>([]);
  const [cpuDeck, setCpuDeck] = useState<Card[]>([]);
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [cpuCard, setCpuCard] = useState<Card | null>(null);
  const [warPile, setWarPile] = useState<Card[]>([]);
  const [message, setMessage] = useState("");
  const [isWar, setIsWar] = useState(false);
  const [warStep, setWarStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [battleCount, setBattleCount] = useState(0);
  const [playerWins, setPlayerWins] = useState(0);
  const [cpuWins, setCpuWins] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = () => {
    const deck = shuffle(createDeck());
    setPlayerDeck(deck.slice(0, 26));
    setCpuDeck(deck.slice(26));
    setPlayerCard(null);
    setCpuCard(null);
    setWarPile([]);
    setMessage("Click Battle to flip cards!");
    setIsWar(false);
    setWarStep(0);
    setAutoPlay(false);
    setBattleCount(0);
    setPlayerWins(0);
    setCpuWins(0);
    setScreen("play");
  };

  const battle = useCallback(() => {
    setPlayerDeck((pd) => {
      setCpuDeck((cd) => {
        if (pd.length === 0 || cd.length === 0) {
          setScreen("over");
          return cd;
        }

        const pCard = pd[0];
        const cCard = cd[0];
        const newPd = pd.slice(1);
        const newCd = cd.slice(1);

        setPlayerCard(pCard);
        setCpuCard(cCard);
        setBattleCount((b) => b + 1);

        setWarPile((pile) => {
          const allCards = [...pile, pCard, cCard];

          if (pCard.value > cCard.value) {
            setMessage(`You win! ${pCard.rank}${pCard.suit} beats ${cCard.rank}${cCard.suit}`);
            setPlayerWins((w) => w + 1);
            setIsWar(false);
            setWarPile([]);
            const won = shuffle(allCards);
            setPlayerDeck([...newPd, ...won]);
            setCpuDeck(newCd);
            return [];
          } else if (pCard.value < cCard.value) {
            setMessage(`CPU wins! ${cCard.rank}${cCard.suit} beats ${pCard.rank}${pCard.suit}`);
            setCpuWins((w) => w + 1);
            setIsWar(false);
            setWarPile([]);
            const won = shuffle(allCards);
            setCpuDeck([...newCd, ...won]);
            setPlayerDeck(newPd);
            return [];
          } else {
            setMessage("WAR! Cards are equal - 3 face-down + 1 face-up!");
            setIsWar(true);
            // War: take 3 face-down from each
            const warCards = [...allCards];
            const pWar = newPd.slice(0, 3);
            const cWar = newCd.slice(0, 3);
            warCards.push(...pWar, ...cWar);
            const afterPd = newPd.slice(3);
            const afterCd = newCd.slice(3);

            if (afterPd.length === 0) {
              setMessage("You ran out of cards during war!");
              setPlayerDeck([]);
              setCpuDeck([...afterCd, ...shuffle(warCards)]);
              setScreen("over");
              return [];
            }
            if (afterCd.length === 0) {
              setMessage("CPU ran out of cards during war!");
              setPlayerDeck([...afterPd, ...shuffle(warCards)]);
              setCpuDeck([]);
              setScreen("over");
              return [];
            }

            setPlayerDeck(afterPd);
            setCpuDeck(afterCd);
            return warCards;
          }
        });

        return cd; // This return won't matter since we set it inside
      });
      return pd;
    });
  }, []);

  // Auto-play
  useEffect(() => {
    if (autoPlay && screen === "play") {
      autoRef.current = setInterval(() => {
        battle();
      }, 800);
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [autoPlay, screen, battle]);

  const bg = "#0a0a1a";
  const accent = "#00e5ff";
  const card = "#141430";
  const winner = playerDeck.length > cpuDeck.length ? "You" : playerDeck.length < cpuDeck.length ? "CPU" : "Tie";

  if (screen === "menu") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 42, color: accent, marginBottom: 8, textShadow: "0 0 20px rgba(0,229,255,0.4)" }}>Card War</h1>
        <p style={{ color: "#888", marginBottom: 24 }}>Classic card game - higher card wins!</p>
        <div style={{ background: card, borderRadius: 12, padding: 20, marginBottom: 24, maxWidth: 340 }}>
          <p style={{ color: "#aaa", fontSize: 14, margin: 0 }}>52 cards split evenly. Each round, both flip top card. Higher card wins both. On tie, it's WAR: 3 face-down + 1 face-up decides.</p>
        </div>
        <button onClick={startGame} style={{ padding: "14px 48px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${accent}, #7c3aed)`, color: "#fff", fontSize: 20, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,229,255,0.3)" }}>
          Deal Cards
        </button>
      </div>
    );
  }

  if (screen === "over") {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", color: "#fff" }}>
        <h1 style={{ fontSize: 38, color: winner === "You" ? "#22c55e" : winner === "CPU" ? "#ef4444" : "#f59e0b" }}>
          {winner === "You" ? "You Win!" : winner === "CPU" ? "CPU Wins!" : "It's a Tie!"}
        </h1>
        <div style={{ background: card, borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 20, minWidth: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16 }}>
            <div>
              <p style={{ color: "#888", fontSize: 12, margin: 0 }}>YOUR CARDS</p>
              <p style={{ color: "#22c55e", fontSize: 28, fontWeight: 800, margin: 0 }}>{playerDeck.length}</p>
            </div>
            <div>
              <p style={{ color: "#888", fontSize: 12, margin: 0 }}>CPU CARDS</p>
              <p style={{ color: "#ef4444", fontSize: 28, fontWeight: 800, margin: 0 }}>{cpuDeck.length}</p>
            </div>
          </div>
          <p style={{ color: "#aaa", fontSize: 14, margin: 0 }}>Battles: {battleCount} | Your wins: {playerWins} | CPU wins: {cpuWins}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startGame} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: accent, color: "#000", fontWeight: 700, cursor: "pointer" }}>Play Again</button>
          <button onClick={() => setScreen("menu")} style={{ padding: "12px 32px", borderRadius: 10, border: "2px solid #444", background: "transparent", color: "#ccc", fontWeight: 600, cursor: "pointer" }}>Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
      {/* Card counts */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 500, marginBottom: 16 }}>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888" }}>YOUR DECK</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{playerDeck.length}</div>
        </div>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888" }}>BATTLES</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{battleCount}</div>
        </div>
        <div style={{ background: card, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#888" }}>CPU DECK</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{cpuDeck.length}</div>
        </div>
      </div>

      {/* Message */}
      <div style={{
        background: isWar ? "rgba(239,68,68,0.15)" : card,
        borderRadius: 10, padding: "8px 20px", marginBottom: 16,
        border: isWar ? "2px solid #ef4444" : "2px solid transparent",
        textAlign: "center", minWidth: 300,
      }}>
        <p style={{ margin: 0, color: isWar ? "#ef4444" : "#ccc", fontWeight: 600 }}>{message}</p>
      </div>

      {/* Battle area */}
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 24 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>YOU</p>
          <CardDisplay
            card={playerCard || undefined}
            glow={playerCard && cpuCard && playerCard.value > cpuCard.value ? "#22c55e" : undefined}
          />
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#444" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>CPU</p>
          <CardDisplay
            card={cpuCard || undefined}
            glow={playerCard && cpuCard && cpuCard.value > playerCard.value ? "#ef4444" : undefined}
          />
        </div>
      </div>

      {/* War pile indicator */}
      {warPile.length > 0 && (
        <div style={{ background: "rgba(139,92,246,0.15)", borderRadius: 8, padding: "6px 16px", marginBottom: 12 }}>
          <span style={{ color: "#8b5cf6", fontSize: 14 }}>War pile: {warPile.length} cards</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => { if (!autoPlay) battle(); }}
          disabled={autoPlay}
          style={{
            padding: "12px 36px", borderRadius: 10, border: "none",
            background: autoPlay ? "#333" : `linear-gradient(135deg, ${accent}, #7c3aed)`,
            color: autoPlay ? "#666" : "#fff", fontWeight: 700, fontSize: 16,
            cursor: autoPlay ? "default" : "pointer",
          }}
        >
          Battle!
        </button>
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          style={{
            padding: "12px 24px", borderRadius: 10, border: "2px solid",
            borderColor: autoPlay ? "#ef4444" : "#444",
            background: autoPlay ? "rgba(239,68,68,0.1)" : "transparent",
            color: autoPlay ? "#ef4444" : "#ccc", fontWeight: 600,
            cursor: "pointer", fontSize: 14,
          }}
        >
          {autoPlay ? "Stop Auto" : "Auto-Play"}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ marginTop: 16, display: "flex", gap: 20, fontSize: 13, color: "#666" }}>
        <span>Wins: <span style={{ color: "#22c55e" }}>{playerWins}</span></span>
        <span>Losses: <span style={{ color: "#ef4444" }}>{cpuWins}</span></span>
      </div>

      {/* Deck strength bar */}
      <div style={{ width: "100%", maxWidth: 400, marginTop: 16 }}>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${(playerDeck.length / 52) * 100}%`, background: "#22c55e", transition: "width 0.3s" }} />
          <div style={{ flex: 1, background: "#ef4444", transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginTop: 2 }}>
          <span>You: {Math.round((playerDeck.length / 52) * 100)}%</span>
          <span>CPU: {Math.round((cpuDeck.length / 52) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
