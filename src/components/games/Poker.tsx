"use client";
import { useState, useCallback, useRef, useEffect } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const SUIT_COLORS = ["#111", "#dc2626", "#dc2626", "#111"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
const RANK_VALUES: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_CHIPS = 1000;
const BOT_BLUFF_CHANCE = 0.15;

const HAND_NAMES = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
  "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush",
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Card {
  suit: number;   // 0=♠ 1=♥ 2=♦ 3=♣
  rank: number;   // 0..12 => "2".."A"
}

interface HandResult {
  tier: number;       // 0..9
  kickers: number[];  // tiebreaker values, descending
  name: string;
}

type Phase = "idle" | "preflop" | "flop" | "turn" | "river" | "showdown";
type BotAction = "fold" | "check" | "call" | "raise";

// ─── Deck helpers ────────────────────────────────────────────────────────────

function makeDeck(): Card[] {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++)
    for (let r = 0; r < 13; r++)
      d.push({ suit: s, rank: r });
  // Fisher-Yates shuffle
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ─── Hand evaluation (full) ─────────────────────────────────────────────────

function evaluateHand(five: Card[]): HandResult {
  const vals = five.map((c) => c.rank + 2).sort((a, b) => b - a); // 2..14
  const suits = five.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // check straight (including A-low: A-2-3-4-5)
  let isStraight = false;
  let straightHigh = 0;
  if (new Set(vals).size === 5) {
    if (vals[0] - vals[4] === 4) {
      isStraight = true;
      straightHigh = vals[0];
    } else if (
      vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5; // wheel
    }
  }

  // frequency map
  const freq: Record<number, number> = {};
  for (const v of vals) freq[v] = (freq[v] || 0) + 1;
  const groups = Object.entries(freq)
    .map(([v, c]) => ({ val: +v, count: c }))
    .sort((a, b) => b.count - a.count || b.val - a.val);

  const counts = groups.map((g) => g.count);

  // determine tier + kickers
  if (isFlush && isStraight && straightHigh === 14) {
    return { tier: 9, kickers: [14], name: "Royal Flush" };
  }
  if (isFlush && isStraight) {
    return { tier: 8, kickers: [straightHigh], name: "Straight Flush" };
  }
  if (counts[0] === 4) {
    return {
      tier: 7,
      kickers: [groups[0].val, groups[1].val],
      name: "Four of a Kind",
    };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return {
      tier: 6,
      kickers: [groups[0].val, groups[1].val],
      name: "Full House",
    };
  }
  if (isFlush) {
    return { tier: 5, kickers: vals, name: "Flush" };
  }
  if (isStraight) {
    return { tier: 4, kickers: [straightHigh], name: "Straight" };
  }
  if (counts[0] === 3) {
    return {
      tier: 3,
      kickers: [groups[0].val, groups[1].val, groups[2].val],
      name: "Three of a Kind",
    };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return {
      tier: 2,
      kickers: [groups[0].val, groups[1].val, groups[2].val],
      name: "Two Pair",
    };
  }
  if (counts[0] === 2) {
    return {
      tier: 1,
      kickers: [groups[0].val, groups[1].val, groups[2].val, groups[3].val],
      name: "Pair",
    };
  }
  return { tier: 0, kickers: vals, name: "High Card" };
}

/** Pick the best 5-card hand from 7 (or fewer) cards. */
function bestHand(hole: Card[], community: Card[]): HandResult {
  const all = [...hole, ...community];
  let best: HandResult = { tier: -1, kickers: [], name: "" };

  const n = all.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        for (let l = k + 1; l < n; l++)
          for (let m = l + 1; m < n; m++) {
            const h = evaluateHand([all[i], all[j], all[k], all[l], all[m]]);
            if (compareHands(h, best) > 0) best = h;
          }
  return best;
}

/** Returns >0 if a beats b, <0 if b beats a, 0 if tie. */
function compareHands(a: HandResult, b: HandResult): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const ak = a.kickers[i] ?? 0;
    const bk = b.kickers[i] ?? 0;
    if (ak !== bk) return ak - bk;
  }
  return 0;
}

// ─── Bot AI ──────────────────────────────────────────────────────────────────

function holeStrength(hole: Card[]): number {
  // Simple pre-flop strength: 0..1
  const r1 = hole[0].rank + 2;
  const r2 = hole[1].rank + 2;
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const paired = r1 === r2;
  const suited = hole[0].suit === hole[1].suit;

  let score = (hi + lo) / 28; // base 0..1
  if (paired) score += 0.25;
  if (suited) score += 0.05;
  if (hi >= 12) score += 0.1; // broadway
  if (hi - lo <= 2 && !paired) score += 0.05; // connectors
  return Math.min(score, 1);
}

function decideBotAction(
  botHole: Card[],
  community: Card[],
  phase: Phase,
  potSize: number,
  currentBet: number,
  botCurrentBet: number,
  botChips: number,
): { action: BotAction; raiseAmount: number } {
  const toCall = currentBet - botCurrentBet;

  // Pre-flop: use hole strength
  if (phase === "preflop" || community.length === 0) {
    const s = holeStrength(botHole);
    const bluff = Math.random() < BOT_BLUFF_CHANCE;

    if (s < 0.3 && !bluff) {
      return toCall > 0 ? { action: "fold", raiseAmount: 0 } : { action: "check", raiseAmount: 0 };
    }
    if (s < 0.5 || bluff) {
      return toCall > 0 ? { action: "call", raiseAmount: 0 } : { action: "check", raiseAmount: 0 };
    }
    // strong hand
    const raise = Math.min(Math.max(BIG_BLIND, Math.floor(potSize * 0.5)), botChips);
    return { action: "raise", raiseAmount: raise };
  }

  // Post-flop: evaluate actual hand
  const hand = bestHand(botHole, community);
  const tier = hand.tier;
  const bluff = Math.random() < BOT_BLUFF_CHANCE;

  if (tier <= 0 && !bluff) {
    // nothing — fold if facing bet, else check
    return toCall > 0 ? { action: "fold", raiseAmount: 0 } : { action: "check", raiseAmount: 0 };
  }
  if (tier <= 1) {
    // pair or bluff: call
    return toCall > 0 ? { action: "call", raiseAmount: 0 } : { action: "check", raiseAmount: 0 };
  }
  if (tier <= 3) {
    // two pair / trips: sometimes raise
    if (Math.random() < 0.5) {
      const raise = Math.min(Math.max(BIG_BLIND, Math.floor(potSize * 0.4)), botChips);
      return { action: "raise", raiseAmount: raise };
    }
    return toCall > 0 ? { action: "call", raiseAmount: 0 } : { action: "check", raiseAmount: 0 };
  }
  // strong hand (straight+)
  const raise = Math.min(Math.max(BIG_BLIND * 2, Math.floor(potSize * 0.7)), botChips);
  return { action: "raise", raiseAmount: raise };
}

// ─── Card rendering ──────────────────────────────────────────────────────────

function CardView({ card, hidden, highlight }: { card: Card; hidden?: boolean; highlight?: boolean }) {
  if (hidden) {
    return (
      <div
        style={{
          width: 64,
          height: 90,
          background: "linear-gradient(135deg, #1a3a6e 0%, #0e2240 100%)",
          borderRadius: 8,
          border: "2px solid #335",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 60,
            border: "1px solid #4466aa",
            borderRadius: 4,
            background: "repeating-linear-gradient(45deg, #1a3a6e, #1a3a6e 4px, #16325e 4px, #16325e 8px)",
          }}
        />
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  return (
    <div
      style={{
        width: 64,
        height: 90,
        background: "#fff",
        borderRadius: 8,
        border: highlight ? "2px solid #fbbf24" : "1px solid #bbb",
        boxShadow: highlight
          ? "0 0 12px rgba(251,191,36,0.6)"
          : "0 2px 6px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontFamily: "'Segoe UI', Arial, sans-serif",
        position: "relative",
        userSelect: "none",
      }}
    >
      {/* Top-left rank + suit */}
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 6,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: "center",
        }}
      >
        <div>{RANKS[card.rank]}</div>
        <div style={{ fontSize: 10 }}>{SUITS[card.suit]}</div>
      </div>
      {/* Center suit large */}
      <div style={{ fontSize: 28, lineHeight: 1 }}>{SUITS[card.suit]}</div>
      {/* Bottom-right rank + suit (inverted) */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: "center",
          transform: "rotate(180deg)",
        }}
      >
        <div>{RANKS[card.rank]}</div>
        <div style={{ fontSize: 10 }}>{SUITS[card.suit]}</div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Poker() {
  // Deck & cards
  const deckRef = useRef<Card[]>([]);
  const dealIdx = useRef(0);

  const [playerHole, setPlayerHole] = useState<Card[]>([]);
  const [botHole, setBotHole] = useState<Card[]>([]);
  const [community, setCommunity] = useState<Card[]>([]);

  // Chips & pot
  const [playerChips, setPlayerChips] = useState(STARTING_CHIPS);
  const [botChips, setBotChips] = useState(STARTING_CHIPS);
  const [pot, setPot] = useState(0);

  // Betting state
  const [phase, setPhase] = useState<Phase>("idle");
  const [playerBetThisRound, setPlayerBetThisRound] = useState(0);
  const [botBetThisRound, setBotBetThisRound] = useState(0);
  const [currentBet, setCurrentBet] = useState(0); // highest bet this round
  const [playerActed, setPlayerActed] = useState(false);

  // Results
  const [result, setResult] = useState("");
  const [playerHandName, setPlayerHandName] = useState("");
  const [botHandName, setBotHandName] = useState("");
  const [winnerHighlight, setWinnerHighlight] = useState<"player" | "bot" | "tie" | "">("");

  // Message log
  const [message, setMessage] = useState("Welcome to Texas Hold'em! Click New Hand to begin.");

  // Dealer button alternates
  const [dealerIsPlayer, setDealerIsPlayer] = useState(true);

  // ─── Deal new hand ─────────────────────────────────────────────────────────

  const dealNewHand = useCallback(() => {
    if (playerChips <= 0 || botChips <= 0) {
      // Reset chips if someone is busted
      setPlayerChips(STARTING_CHIPS);
      setBotChips(STARTING_CHIPS);
    }

    const pChips = playerChips <= 0 ? STARTING_CHIPS : playerChips;
    const bChips = botChips <= 0 ? STARTING_CHIPS : botChips;

    const deck = makeDeck();
    deckRef.current = deck;
    dealIdx.current = 0;

    const draw = () => deck[dealIdx.current++];

    const p1 = draw();
    const p2 = draw();
    const b1 = draw();
    const b2 = draw();

    setPlayerHole([p1, p2]);
    setBotHole([b1, b2]);
    setCommunity([]);
    setResult("");
    setPlayerHandName("");
    setBotHandName("");
    setWinnerHighlight("");
    setPlayerActed(false);

    // Blinds: dealer posts small, other posts big
    // For simplicity: player = small blind when dealerIsPlayer
    const nextDealer = !dealerIsPlayer;
    setDealerIsPlayer(nextDealer);

    let pBlind: number;
    let bBlind: number;
    if (nextDealer) {
      // player is dealer = small blind
      pBlind = Math.min(SMALL_BLIND, pChips);
      bBlind = Math.min(BIG_BLIND, bChips);
    } else {
      pBlind = Math.min(BIG_BLIND, pChips);
      bBlind = Math.min(SMALL_BLIND, bChips);
    }

    setPlayerChips(pChips - pBlind);
    setBotChips(bChips - bBlind);
    setPot(pBlind + bBlind);
    setCurrentBet(BIG_BLIND);
    setPlayerBetThisRound(pBlind);
    setBotBetThisRound(bBlind);

    setPhase("preflop");
    setMessage(
      `Blinds posted. ${nextDealer ? "You" : "Bot"}: SB ${SMALL_BLIND}, ${nextDealer ? "Bot" : "You"}: BB ${BIG_BLIND}. Your action.`
    );
  }, [playerChips, botChips, dealerIsPlayer]);

  // ─── Advance community cards ───────────────────────────────────────────────

  const dealCommunity = useCallback(
    (nextPhase: Phase) => {
      const deck = deckRef.current;
      const idx = dealIdx.current;

      if (nextPhase === "flop") {
        const flop = [deck[idx], deck[idx + 1], deck[idx + 2]];
        dealIdx.current = idx + 3;
        setCommunity(flop);
      } else if (nextPhase === "turn") {
        const card = deck[idx];
        dealIdx.current = idx + 1;
        setCommunity((prev) => [...prev, card]);
      } else if (nextPhase === "river") {
        const card = deck[idx];
        dealIdx.current = idx + 1;
        setCommunity((prev) => [...prev, card]);
      }

      // Reset round betting
      setCurrentBet(0);
      setPlayerBetThisRound(0);
      setBotBetThisRound(0);
      setPlayerActed(false);
      setPhase(nextPhase);
    },
    [],
  );

  // ─── Showdown ──────────────────────────────────────────────────────────────

  const doShowdown = useCallback(
    (comm: Card[], currentPot: number) => {
      const pHand = bestHand(playerHole, comm);
      const bHand = bestHand(botHole, comm);
      const cmp = compareHands(pHand, bHand);

      setPlayerHandName(pHand.name);
      setBotHandName(bHand.name);

      if (cmp > 0) {
        setPlayerChips((c) => c + currentPot);
        setResult(`You win with ${pHand.name}!`);
        setWinnerHighlight("player");
      } else if (cmp < 0) {
        setBotChips((c) => c + currentPot);
        setResult(`Bot wins with ${bHand.name}!`);
        setWinnerHighlight("bot");
      } else {
        const half = Math.floor(currentPot / 2);
        setPlayerChips((c) => c + half);
        setBotChips((c) => c + (currentPot - half));
        setResult(`Split pot! Both have ${pHand.name}.`);
        setWinnerHighlight("tie");
      }
      setPhase("showdown");
      setMessage("Hand complete. Click New Hand to continue.");
    },
    [playerHole, botHole],
  );

  // ─── Advance to next street or showdown ────────────────────────────────────

  const advancePhase = useCallback(
    (currentPot: number) => {
      if (phase === "preflop") {
        dealCommunity("flop");
        setMessage("Flop dealt. Your action.");
      } else if (phase === "flop") {
        dealCommunity("turn");
        setMessage("Turn dealt. Your action.");
      } else if (phase === "turn") {
        dealCommunity("river");
        setMessage("River dealt. Your action.");
      } else if (phase === "river") {
        // need updated community for showdown
        setCommunity((prev) => {
          // small delay to let state settle then showdown
          setTimeout(() => doShowdown(prev, currentPot), 50);
          return prev;
        });
      }
    },
    [phase, dealCommunity, doShowdown],
  );

  // ─── Bot takes action ──────────────────────────────────────────────────────

  const botTurn = useCallback(
    (afterPlayerBet: number, afterPot: number, afterCurrentBet: number, bChips: number) => {
      const decision = decideBotAction(
        botHole,
        community,
        phase,
        afterPot,
        afterCurrentBet,
        botBetThisRound,
        bChips,
      );

      if (decision.action === "fold") {
        setPlayerChips((c) => c + afterPot);
        setResult("Bot folded. You win the pot!");
        setPhase("showdown");
        setMessage("Bot folded. Click New Hand to continue.");
        return;
      }

      if (decision.action === "check") {
        setMessage("Bot checks.");
        advancePhase(afterPot);
        return;
      }

      if (decision.action === "call") {
        const toCall = Math.min(afterCurrentBet - botBetThisRound, bChips);
        setBotChips(bChips - toCall);
        const newPot = afterPot + toCall;
        setPot(newPot);
        setBotBetThisRound((prev) => prev + toCall);
        setMessage(`Bot calls ${toCall}.`);
        advancePhase(newPot);
        return;
      }

      if (decision.action === "raise") {
        const toCall = Math.min(afterCurrentBet - botBetThisRound, bChips);
        const raiseTotal = Math.min(toCall + decision.raiseAmount, bChips);
        setBotChips(bChips - raiseTotal);
        const newPot = afterPot + raiseTotal;
        setPot(newPot);
        const newBotBet = botBetThisRound + raiseTotal;
        setBotBetThisRound(newBotBet);
        setCurrentBet(newBotBet);
        setMessage(`Bot raises to ${newBotBet}. Your action.`);
        setPlayerActed(false); // player needs to respond
        return;
      }
    },
    [botHole, community, phase, botBetThisRound, advancePhase],
  );

  // ─── Player actions ────────────────────────────────────────────────────────

  const canCheck = currentBet <= playerBetThisRound;
  const toCall = Math.min(currentBet - playerBetThisRound, playerChips);

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    setPlayerActed(true);
    setMessage("You check.");

    // bot's turn
    setTimeout(() => {
      botTurn(playerBetThisRound, pot, currentBet, botChips);
    }, 600);
  }, [canCheck, playerBetThisRound, pot, currentBet, botChips, botTurn]);

  const handleCall = useCallback(() => {
    if (toCall <= 0) return;
    const newPlayerChips = playerChips - toCall;
    setPlayerChips(newPlayerChips);
    const newPot = pot + toCall;
    setPot(newPot);
    const newPlayerBet = playerBetThisRound + toCall;
    setPlayerBetThisRound(newPlayerBet);
    setPlayerActed(true);
    setMessage(`You call ${toCall}.`);

    // Both have matched — advance
    setTimeout(() => {
      advancePhase(newPot);
    }, 600);
  }, [toCall, playerChips, pot, playerBetThisRound, advancePhase]);

  const handleRaise = useCallback(() => {
    const raiseAmount = Math.min(BIG_BLIND * 2, playerChips);
    if (raiseAmount <= 0) return;

    const totalPut = toCall + raiseAmount;
    const actualPut = Math.min(totalPut, playerChips);
    const newPlayerChips = playerChips - actualPut;
    setPlayerChips(newPlayerChips);
    const newPot = pot + actualPut;
    setPot(newPot);
    const newPlayerBet = playerBetThisRound + actualPut;
    setPlayerBetThisRound(newPlayerBet);
    setCurrentBet(newPlayerBet);
    setPlayerActed(true);
    setMessage(`You raise to ${newPlayerBet}.`);

    // Bot responds
    setTimeout(() => {
      botTurn(newPlayerBet, newPot, newPlayerBet, botChips);
    }, 600);
  }, [toCall, playerChips, pot, playerBetThisRound, botChips, botTurn]);

  const handleFold = useCallback(() => {
    setBotChips((c) => c + pot);
    setResult("You folded. Bot wins the pot.");
    setPhase("showdown");
    setMessage("You folded. Click New Hand to continue.");
  }, [pot]);

  // ─── Styles ────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    background: "#0f5132",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    color: "#e8e8e8",
    padding: 20,
    position: "relative",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 750,
    background: "radial-gradient(ellipse at center, #1a7a4a 0%, #0f5132 70%, #0a3d25 100%)",
    border: "8px solid #3a2a1a",
    borderRadius: 180,
    padding: "40px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    boxShadow: "inset 0 0 60px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)",
    position: "relative",
    minHeight: 520,
  };

  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 14px",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 14,
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 22px",
    borderRadius: 8,
    border: "none",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "opacity 0.15s",
    letterSpacing: 0.5,
  };

  const cardRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const isActive = phase !== "idle" && phase !== "showdown";

  return (
    <div style={containerStyle}>
      {/* Title */}
      <h1
        style={{
          margin: "0 0 16px 0",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 1,
          color: "#fbbf24",
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        Texas Hold&apos;em Poker
      </h1>

      <div style={tableStyle}>
        {/* ── Chip counts ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 500,
          }}
        >
          <div style={{ ...chipStyle, background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
            Bot: ${botChips}
          </div>
          <div
            style={{
              ...chipStyle,
              background: "rgba(251,191,36,0.25)",
              color: "#fbbf24",
              fontSize: 16,
            }}
          >
            Pot: ${pot}
          </div>
          <div style={{ ...chipStyle, background: "rgba(59,130,246,0.2)", color: "#93c5fd" }}>
            You: ${playerChips}
          </div>
        </div>

        {/* ── Bot hand ── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Bot&apos;s Hand
            {phase === "showdown" && botHandName && (
              <span style={{ color: winnerHighlight === "bot" ? "#fbbf24" : "#ccc", marginLeft: 8 }}>
                — {botHandName}
              </span>
            )}
          </div>
          <div style={cardRowStyle}>
            {botHole.length > 0 ? (
              botHole.map((c, i) => (
                <CardView
                  key={`bot-${i}`}
                  card={c}
                  hidden={phase !== "showdown"}
                  highlight={phase === "showdown" && (winnerHighlight === "bot" || winnerHighlight === "tie")}
                />
              ))
            ) : (
              <>
                <div style={{ width: 64, height: 90, borderRadius: 8, border: "1px dashed #2a6b45" }} />
                <div style={{ width: 64, height: 90, borderRadius: 8, border: "1px dashed #2a6b45" }} />
              </>
            )}
          </div>
        </div>

        {/* ── Community cards ── */}
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Community Cards
          </div>
          <div style={{ ...cardRowStyle, minHeight: 90 }}>
            {community.length > 0
              ? community.map((c, i) => <CardView key={`comm-${i}`} card={c} />)
              : Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={`ph-${i}`}
                    style={{
                      width: 64,
                      height: 90,
                      borderRadius: 8,
                      border: "1px dashed #2a6b45",
                    }}
                  />
                ))}
          </div>
        </div>

        {/* ── Player hand ── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Your Hand
            {phase !== "idle" && playerHole.length === 2 && (
              <span style={{ color: "#93c5fd", marginLeft: 8 }}>
                — {bestHand(playerHole, community).name}
              </span>
            )}
          </div>
          <div style={cardRowStyle}>
            {playerHole.length > 0 ? (
              playerHole.map((c, i) => (
                <CardView
                  key={`player-${i}`}
                  card={c}
                  highlight={phase === "showdown" && (winnerHighlight === "player" || winnerHighlight === "tie")}
                />
              ))
            ) : (
              <>
                <div style={{ width: 64, height: 90, borderRadius: 8, border: "1px dashed #2a6b45" }} />
                <div style={{ width: 64, height: 90, borderRadius: 8, border: "1px dashed #2a6b45" }} />
              </>
            )}
          </div>
        </div>

        {/* ── Result message ── */}
        {result && (
          <div
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: winnerHighlight === "player"
                ? "rgba(16,185,129,0.2)"
                : winnerHighlight === "bot"
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(251,191,36,0.2)",
              color: winnerHighlight === "player"
                ? "#6ee7b7"
                : winnerHighlight === "bot"
                  ? "#fca5a5"
                  : "#fde68a",
              fontWeight: 700,
              fontSize: 16,
              textAlign: "center",
            }}
          >
            {result}
          </div>
        )}

        {/* ── Action message ── */}
        <div style={{ fontSize: 13, color: "#b0c4a8", textAlign: "center", minHeight: 20 }}>
          {message}
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {(phase === "idle" || phase === "showdown") && (
            <button
              onClick={dealNewHand}
              style={{
                ...btnBase,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                padding: "12px 36px",
                fontSize: 16,
                boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
              }}
            >
              {phase === "idle" ? "New Hand" : "New Hand"}
            </button>
          )}

          {isActive && (
            <>
              {canCheck && (
                <button
                  onClick={handleCheck}
                  style={{
                    ...btnBase,
                    background: "#374151",
                    color: "#d1d5db",
                  }}
                >
                  Check
                </button>
              )}

              {!canCheck && (
                <button
                  onClick={handleCall}
                  style={{
                    ...btnBase,
                    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "#fff",
                  }}
                >
                  Call {toCall}
                </button>
              )}

              <button
                onClick={handleRaise}
                style={{
                  ...btnBase,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#000",
                }}
              >
                Raise {BIG_BLIND * 2}
              </button>

              <button
                onClick={handleFold}
                style={{
                  ...btnBase,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                }}
              >
                Fold
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Rules hint ── */}
      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          color: "#5a7a5a",
          textAlign: "center",
          maxWidth: 500,
          lineHeight: 1.5,
        }}
      >
        Texas Hold'em: Make the best 5-card hand from your 2 hole cards and 5 community cards.
        Hand ranks: Royal Flush &gt; Straight Flush &gt; Four of a Kind &gt; Full House &gt; Flush &gt; Straight &gt; Three of a Kind &gt; Two Pair &gt; Pair &gt; High Card
      </div>
    </div>
  );
}
