"use client";
import { useState, useCallback } from "react";

const SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"] as const;
const SUIT_NAMES = ["Spades", "Hearts", "Diamonds", "Clubs"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const isRed = (s: number) => s === 1 || s === 2;

interface Card { rank: number; suit: number }

function createDeck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ rank: r, suit: s });
  return d;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function handRank(cards: Card[]): { rank: number; name: string; highCards: number[] } {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);
  const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isStraight = (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) || (ranks[0] === 12 && ranks[1] === 1 && ranks[2] === 0);
  const isPair = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

  if (isTrail) return { rank: 6, name: "Trail (Three of a Kind)", highCards: ranks };
  if (isStraight && isFlush) return { rank: 5, name: "Pure Sequence", highCards: ranks };
  if (isStraight) return { rank: 4, name: "Sequence (Run)", highCards: ranks };
  if (isFlush) return { rank: 3, name: "Color (Flush)", highCards: ranks };
  if (isPair) {
    // Put the pair first
    const pairRank = ranks[0] === ranks[1] ? ranks[0] : ranks[1];
    const kicker = ranks.find(r => r !== pairRank)!;
    return { rank: 2, name: "Pair", highCards: [pairRank, kicker] };
  }
  return { rank: 1, name: "High Card", highCards: ranks };
}

function compareHands(a: Card[], b: Card[]): number {
  const ha = handRank(a), hb = handRank(b);
  if (ha.rank !== hb.rank) return ha.rank - hb.rank;
  for (let i = 0; i < ha.highCards.length; i++) {
    if (ha.highCards[i] !== hb.highCards[i]) return ha.highCards[i] - hb.highCards[i];
  }
  return 0;
}

function botDecision(hand: Card[], pot: number, currentBet: number, blind: boolean): "fold" | "call" | "raise" {
  const hr = handRank(hand);
  if (blind) {
    if (hr.rank >= 4) return "raise";
    if (hr.rank >= 2 || Math.random() < 0.6) return "call";
    return Math.random() < 0.3 ? "fold" : "call";
  }
  if (hr.rank >= 5) return "raise";
  if (hr.rank >= 3) return Math.random() < 0.7 ? "raise" : "call";
  if (hr.rank >= 2) return "call";
  if (hr.highCards[0] >= 10) return Math.random() < 0.5 ? "call" : "fold";
  return Math.random() < 0.4 ? "call" : "fold";
}

function CardDisplay({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div style={{ width: "60px", height: "85px", borderRadius: "8px", background: "linear-gradient(135deg, #1a1a5a, #2a2a6a)", border: "2px solid #333", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "24px", color: "#555" }}>?</div>
      </div>
    );
  }
  const red = isRed(card.suit);
  return (
    <div style={{ width: "60px", height: "85px", borderRadius: "8px", background: "#fff", border: "2px solid #ccc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: red ? "#d32f2f" : "#222" }}>
      <div style={{ fontSize: "16px", fontWeight: 700 }}>{RANKS[card.rank]}</div>
      <div style={{ fontSize: "22px" }}>{SUITS[card.suit]}</div>
    </div>
  );
}

export default function ThreeCards() {
  const [chips, setChips] = useState(500);
  const [botChips, setBotChips] = useState(500);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(10);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [botHand, setBotHand] = useState<Card[]>([]);
  const [playerBlind, setPlayerBlind] = useState(true);
  const [phase, setPhase] = useState<"idle" | "betting" | "result">("idle");
  const [message, setMessage] = useState("");
  const [showBot, setShowBot] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [wins, setWins] = useState(0);
  const [lastBotAction, setLastBotAction] = useState("");

  const deal = useCallback(() => {
    const deck = shuffle(createDeck());
    setPlayerHand(deck.slice(0, 3));
    setBotHand(deck.slice(3, 6));
    setPlayerBlind(true);
    setShowBot(false);
    setCurrentBet(10);
    const ante = 20;
    setChips(c => c - ante / 2);
    setBotChips(c => c - ante / 2);
    setPot(ante);
    setPhase("betting");
    setMessage("");
    setLastBotAction("");
  }, []);

  const seeCards = () => setPlayerBlind(false);

  const playerBet = (action: "call" | "raise" | "fold") => {
    if (action === "fold") {
      setMessage("You folded! Bot wins the pot.");
      setBotChips(c => c + pot);
      setPhase("result");
      setShowBot(true);
      setRounds(r => r + 1);
      return;
    }

    const betAmt = action === "raise" ? currentBet * 2 : currentBet;
    const actualBet = playerBlind ? Math.floor(betAmt / 2) : betAmt;
    if (chips < actualBet) { setMessage("Not enough chips!"); return; }

    setChips(c => c - actualBet);
    setPot(p => p + actualBet);
    if (action === "raise") setCurrentBet(betAmt);

    // Bot turn
    setTimeout(() => {
      const botAction = botDecision(botHand, pot + actualBet, action === "raise" ? betAmt : currentBet, true);
      setLastBotAction(botAction);
      if (botAction === "fold") {
        setMessage("Bot folded! You win the pot!");
        setChips(c => c + pot + actualBet);
        setPhase("result");
        setShowBot(true);
        setWins(w => w + 1);
        setRounds(r => r + 1);
      } else {
        const botBetAmt = botAction === "raise" ? currentBet * 2 : currentBet;
        setBotChips(c => c - botBetAmt);
        const newPot = pot + actualBet + botBetAmt;
        setPot(newPot);
        if (botAction === "raise") setCurrentBet(botBetAmt);
        // Showdown after a few rounds of betting — simplified to immediate showdown
        const result = compareHands(playerHand, botHand);
        setShowBot(true);
        if (result > 0) {
          setMessage(`You win! ${handRank(playerHand).name} beats ${handRank(botHand).name}`);
          setChips(c => c + newPot);
          setWins(w => w + 1);
        } else if (result < 0) {
          setMessage(`Bot wins! ${handRank(botHand).name} beats ${handRank(playerHand).name}`);
          setBotChips(c => c + newPot);
        } else {
          setMessage("Tie! Pot split.");
          setChips(c => c + Math.floor(newPot / 2));
          setBotChips(c => c + Math.ceil(newPot / 2));
        }
        setPhase("result");
        setRounds(r => r + 1);
      }
    }, 800);
  };

  const resetGame = () => {
    setChips(500); setBotChips(500); setPhase("idle"); setRounds(0); setWins(0); setMessage("");
    setPlayerHand([]); setBotHand([]);
  };

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h1 style={{ color: "#ffd700", fontSize: "28px", marginBottom: "4px" }}>Teen Patti</h1>
      <p style={{ color: "#888", fontSize: "12px", marginBottom: "16px" }}>3-Card Indian Poker</p>

      {/* Chip counts */}
      <div style={{ display: "flex", gap: "30px", marginBottom: "16px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#888" }}>You</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#4ecdc4" }}>{chips}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#888" }}>Pot</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#ffd700" }}>{pot}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#888" }}>Bot</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#ff6b6b" }}>{botChips}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "16px" }}>
        Round {rounds} | Wins: {wins} | Bet: {currentBet}
      </div>

      {/* Bot hand */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", color: "#888", textAlign: "center", marginBottom: "6px" }}>
          Bot {lastBotAction && `(${lastBotAction})`}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {botHand.length > 0 ? botHand.map((c, i) => <CardDisplay key={i} card={c} hidden={!showBot} />) :
            [0, 1, 2].map(i => <div key={i} style={{ width: "60px", height: "85px", borderRadius: "8px", background: "#111", border: "1px solid #222" }} />)}
        </div>
        {showBot && botHand.length > 0 && (
          <div style={{ textAlign: "center", fontSize: "12px", color: "#ff6b6b", marginTop: "4px" }}>{handRank(botHand).name}</div>
        )}
      </div>

      {/* Table */}
      <div style={{ width: "280px", height: "60px", background: "radial-gradient(ellipse, #0a3a0a, #0a1a0a)", borderRadius: "50%", border: "3px solid #2a5a2a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
        <span style={{ color: "#ffd700", fontSize: "14px", fontWeight: 600 }}>{phase === "idle" ? "Deal to start" : phase === "result" ? "Round Over" : `Pot: ${pot}`}</span>
      </div>

      {/* Player hand */}
      <div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
          {playerHand.length > 0 ? playerHand.map((c, i) => <CardDisplay key={i} card={c} hidden={playerBlind} />) :
            [0, 1, 2].map(i => <div key={i} style={{ width: "60px", height: "85px", borderRadius: "8px", background: "#111", border: "1px solid #222" }} />)}
        </div>
        {!playerBlind && playerHand.length > 0 && (
          <div style={{ textAlign: "center", fontSize: "12px", color: "#4ecdc4", marginTop: "2px" }}>{handRank(playerHand).name}</div>
        )}
        <div style={{ fontSize: "12px", color: "#888", textAlign: "center", marginTop: "2px" }}>
          {playerBlind && phase === "betting" ? "Playing Blind" : "Your Hand"}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{ margin: "14px 0", padding: "10px 20px", borderRadius: "10px", background: message.includes("win") || message.includes("Win") ? "#1a3a1a" : message.includes("Bot wins") ? "#3a1a1a" : "#1a1a3a", fontSize: "14px", fontWeight: 600, color: message.includes("You win") ? "#4ecdc4" : message.includes("Bot wins") ? "#ff6b6b" : "#ffd700", textAlign: "center" }}>{message}</div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        {phase === "idle" && (
          <>
            <button onClick={deal} disabled={chips <= 0 || botChips <= 0} style={{ padding: "10px 30px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Deal</button>
            {(chips <= 0 || botChips <= 0) && <button onClick={resetGame} style={{ padding: "10px 24px", background: "#4ecdc4", color: "#0a0a1a", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "14px" }}>Reset</button>}
          </>
        )}
        {phase === "betting" && (
          <>
            {playerBlind && <button onClick={seeCards} style={{ padding: "8px 20px", background: "#a855f7", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "14px" }}>See Cards</button>}
            <button onClick={() => playerBet("call")} style={{ padding: "8px 20px", background: "#4ecdc4", color: "#0a0a1a", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Call ({playerBlind ? Math.floor(currentBet / 2) : currentBet})</button>
            <button onClick={() => playerBet("raise")} style={{ padding: "8px 20px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Raise ({playerBlind ? currentBet : currentBet * 2})</button>
            <button onClick={() => playerBet("fold")} style={{ padding: "8px 20px", background: "#ff6b6b", color: "#fff", border: "none", borderRadius: "20px", cursor: "pointer", fontSize: "14px" }}>Fold</button>
          </>
        )}
        {phase === "result" && (
          <button onClick={deal} disabled={chips <= 0 || botChips <= 0} style={{ padding: "10px 30px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Next Hand</button>
        )}
      </div>

      {/* Rankings reference */}
      <div style={{ marginTop: "24px", padding: "12px", background: "#0d0d2a", borderRadius: "10px", fontSize: "11px", color: "#666", maxWidth: "280px" }}>
        <div style={{ color: "#888", marginBottom: "4px", fontWeight: 600 }}>Hand Rankings (high to low):</div>
        <div>Trail (Three of a Kind) &gt; Pure Sequence &gt; Sequence &gt; Color (Flush) &gt; Pair &gt; High Card</div>
      </div>
    </div>
  );
}
