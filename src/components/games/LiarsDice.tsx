"use client";
import { useState, useCallback, useEffect } from "react";

/* ─── Types ─── */
interface Bid {
  quantity: number;
  face: number;
}

type Phase = "rolling" | "bidding" | "challenging" | "roundEnd" | "gameOver";

/* ─── Helpers ─── */
function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

function countFace(dice: number[], face: number): number {
  return dice.filter((d) => d === face).length;
}

function botDecide(
  currentBid: Bid | null,
  botDice: number[],
  playerDiceCount: number
): { action: "bid"; bid: Bid } | { action: "challenge" } {
  const totalDice = botDice.length + playerDiceCount;
  if (!currentBid) {
    const face = botDice.length > 0 ? botDice[Math.floor(Math.random() * botDice.length)] : 1;
    return { action: "bid", bid: { quantity: 1, face } };
  }
  const myCount = countFace(botDice, currentBid.face);
  const expectedOther = (playerDiceCount * 1) / 6;
  const likely = myCount + expectedOther;
  if (currentBid.quantity > likely + 1.5) {
    return { action: "challenge" };
  }
  if (Math.random() < 0.2 && currentBid.quantity >= totalDice * 0.6) {
    return { action: "challenge" };
  }
  let newQty = currentBid.quantity;
  let newFace = currentBid.face;
  if (newFace < 6) {
    newFace++;
  } else {
    newQty++;
    const bestFace = [1, 2, 3, 4, 5, 6].reduce((a, b) =>
      countFace(botDice, b) > countFace(botDice, a) ? b : a
    );
    newFace = bestFace;
  }
  if (Math.random() < 0.2) {
    newQty = currentBid.quantity + 1;
    const bestFace = [1, 2, 3, 4, 5, 6].reduce((a, b) =>
      countFace(botDice, b) > countFace(botDice, a) ? b : a
    );
    newFace = bestFace;
  }
  return { action: "bid", bid: { quantity: newQty, face: newFace } };
}

/* ─── Styles ─── */
const BG = "#0a0a1a";
const ACCENT = "#f59e0b";
const CARD = "#141428";
const BTN = "#7c3aed";
const DANGER = "#ef4444";
const SUCCESS = "#22c55e";

const Die = ({ value, hidden }: { value: number; hidden?: boolean }) => {
  const dots: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        background: hidden ? "#333" : "#fff",
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gridTemplateRows: "repeat(3,1fr)",
        padding: 4,
        margin: 3,
      }}
    >
      {hidden ? (
        <span
          style={{
            gridColumn: "1/4",
            gridRow: "1/4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            fontSize: 20,
          }}
        >
          ?
        </span>
      ) : (
        Array.from({ length: 9 }, (_, i) => {
          const r = Math.floor(i / 3);
          const c = i % 3;
          const show = (dots[value] || []).some(([dr, dc]) => dr === r && dc === c);
          return (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: show ? "#1a1a2e" : "transparent",
                margin: "auto",
              }}
            />
          );
        })
      )}
    </div>
  );
};

export default function LiarsDice() {
  const [playerDice, setPlayerDice] = useState<number[]>([]);
  const [botDice, setBotDice] = useState<number[]>([]);
  const [playerDiceCount, setPlayerDiceCount] = useState(5);
  const [botDiceCount, setBotDiceCount] = useState(5);
  const [currentBid, setCurrentBid] = useState<Bid | null>(null);
  const [bidder, setBidder] = useState<"player" | "bot">("player");
  const [phase, setPhase] = useState<Phase>("rolling");
  const [bidQty, setBidQty] = useState(1);
  const [bidFace, setBidFace] = useState(1);
  const [message, setMessage] = useState("");
  const [playerWins, setPlayerWins] = useState(0);
  const [botWins, setBotWins] = useState(0);
  const [showBotDice, setShowBotDice] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => setLog((p) => [msg, ...p].slice(0, 20)), []);

  const startRound = useCallback(() => {
    const pd = rollDice(playerDiceCount);
    const bd = rollDice(botDiceCount);
    setPlayerDice(pd);
    setBotDice(bd);
    setCurrentBid(null);
    setShowBotDice(false);
    setMessage("");
    setBidQty(1);
    setBidFace(1);
    const starter = Math.random() < 0.5 ? "player" : "bot";
    setBidder(starter);
    setPhase("bidding");
    addLog(`New round! ${starter === "player" ? "You" : "Bot"} starts.`);
    if (starter === "bot") {
      setTimeout(() => {
        const decision = botDecide(null, bd, playerDiceCount);
        if (decision.action === "bid") {
          setCurrentBid(decision.bid);
          setBidder("player");
          setBidQty(decision.bid.quantity);
          setBidFace(decision.bid.face);
          addLog(`Bot bids: ${decision.bid.quantity}x ${decision.bid.face}'s`);
        }
      }, 800);
    }
  }, [playerDiceCount, botDiceCount, addLog]);

  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidBid = (qty: number, face: number): boolean => {
    if (!currentBid) return qty >= 1 && face >= 1 && face <= 6;
    if (qty > currentBid.quantity) return true;
    if (qty === currentBid.quantity && face > currentBid.face) return true;
    return false;
  };

  const handlePlayerBid = () => {
    if (!isValidBid(bidQty, bidFace)) {
      setMessage("Bid must be higher than current!");
      return;
    }
    const bid: Bid = { quantity: bidQty, face: bidFace };
    setCurrentBid(bid);
    setBidder("bot");
    addLog(`You bid: ${bid.quantity}x ${bid.face}'s`);
    setMessage("");
    setTimeout(() => {
      const decision = botDecide(bid, botDice, playerDiceCount);
      if (decision.action === "challenge") {
        addLog("Bot challenges your bid!");
        resolveChallenge("bot", bid);
      } else {
        setCurrentBid(decision.bid);
        setBidder("player");
        setBidQty(Math.max(decision.bid.quantity, bidQty));
        addLog(`Bot bids: ${decision.bid.quantity}x ${decision.bid.face}'s`);
      }
    }, 1000);
  };

  const handlePlayerChallenge = () => {
    if (!currentBid) return;
    addLog("You challenge the bot's bid!");
    resolveChallenge("player", currentBid);
  };

  const resolveChallenge = (challenger: "player" | "bot", bid: Bid) => {
    setShowBotDice(true);
    const allDice = [...playerDice, ...botDice];
    const actual = countFace(allDice, bid.face);
    const bidWasTrue = actual >= bid.quantity;
    addLog(`Actual ${bid.face}'s: ${actual}. Bid was ${bid.quantity}. ${bidWasTrue ? "Bid was true!" : "Bid was a lie!"}`);

    let loser: "player" | "bot";
    if (challenger === "player") {
      loser = bidWasTrue ? "player" : "bot";
    } else {
      loser = bidWasTrue ? "bot" : "player";
    }

    if (loser === "player") {
      const newCount = playerDiceCount - 1;
      setPlayerDiceCount(newCount);
      addLog("You lose a die!");
      if (newCount <= 0) {
        setPhase("gameOver");
        setBotWins((w) => w + 1);
        setMessage("Bot wins the game!");
        return;
      }
    } else {
      const newCount = botDiceCount - 1;
      setBotDiceCount(newCount);
      addLog("Bot loses a die!");
      if (newCount <= 0) {
        setPhase("gameOver");
        setPlayerWins((w) => w + 1);
        setMessage("You win the game!");
        return;
      }
    }
    setPhase("roundEnd");
    setMessage(`${loser === "player" ? "You" : "Bot"} lost a die! Click to continue.`);
  };

  const resetGame = () => {
    setPlayerDiceCount(5);
    setBotDiceCount(5);
    setLog([]);
    setPhase("rolling");
    setTimeout(() => startRound(), 100);
  };

  const totalDice = playerDiceCount + botDiceCount;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ textAlign: "center", fontSize: 28, color: ACCENT, marginBottom: 4 }}>
        Liar&apos;s Dice
      </h1>
      <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: 20, fontSize: 14 }}>
        Bluff and call bluffs! Last player with dice wins.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ background: CARD, borderRadius: 12, padding: 16, minWidth: 180, textAlign: "center" }}>
          <div style={{ color: ACCENT, fontWeight: 700, marginBottom: 8 }}>Your Dice ({playerDiceCount})</div>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            {playerDice.map((d, i) => (
              <Die key={i} value={d} />
            ))}
          </div>
        </div>
        <div style={{ background: CARD, borderRadius: 12, padding: 16, minWidth: 180, textAlign: "center" }}>
          <div style={{ color: "#f87171", fontWeight: 700, marginBottom: 8 }}>Bot Dice ({botDiceCount})</div>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            {botDice.map((d, i) => (
              <Die key={i} value={d} hidden={!showBotDice} />
            ))}
          </div>
        </div>
      </div>

      {currentBid && (
        <div
          style={{
            textAlign: "center",
            background: "#1e1e3a",
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            maxWidth: 400,
            margin: "0 auto 16px",
          }}
        >
          <span style={{ color: "#94a3b8" }}>Current Bid: </span>
          <span style={{ color: ACCENT, fontSize: 20, fontWeight: 700 }}>
            {currentBid.quantity} x {currentBid.face}&apos;s
          </span>
          <span style={{ color: "#64748b", marginLeft: 8 }}>
            (by {bidder === "player" ? "Bot" : "You"})
          </span>
        </div>
      )}

      {phase === "bidding" && bidder === "player" && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label style={{ color: "#94a3b8" }}>Quantity:</label>
            <select
              value={bidQty}
              onChange={(e) => setBidQty(Number(e.target.value))}
              style={{
                background: "#1e1e3a",
                color: "#fff",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 16,
              }}
            >
              {Array.from({ length: totalDice }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <label style={{ color: "#94a3b8" }}>Face:</label>
            <select
              value={bidFace}
              onChange={(e) => setBidFace(Number(e.target.value))}
              style={{
                background: "#1e1e3a",
                color: "#fff",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 16,
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={handlePlayerBid}
              style={{
                background: BTN,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontSize: 16,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Place Bid
            </button>
            {currentBid && (
              <button
                onClick={handlePlayerChallenge}
                style={{
                  background: DANGER,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 28px",
                  fontSize: 16,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Challenge!
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "bidding" && bidder === "bot" && (
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 16 }}>Bot is thinking...</p>
      )}

      {message && (
        <div
          style={{
            textAlign: "center",
            padding: 12,
            background: "#1e1e3a",
            borderRadius: 10,
            maxWidth: 400,
            margin: "0 auto 16px",
            color: ACCENT,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {message}
        </div>
      )}

      {phase === "roundEnd" && (
        <div style={{ textAlign: "center" }}>
          <button
            onClick={startRound}
            style={{
              background: SUCCESS,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Next Round
          </button>
        </div>
      )}

      {phase === "gameOver" && (
        <div style={{ textAlign: "center" }}>
          <button
            onClick={resetGame}
            style={{
              background: BTN,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 28px",
              fontSize: 16,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            New Game
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 32, margin: "20px 0" }}>
        <div style={{ color: SUCCESS, fontWeight: 700 }}>Your Wins: {playerWins}</div>
        <div style={{ color: DANGER, fontWeight: 700 }}>Bot Wins: {botWins}</div>
      </div>

      <div
        style={{
          maxWidth: 440,
          margin: "0 auto",
          background: CARD,
          borderRadius: 12,
          padding: 16,
          maxHeight: 180,
          overflowY: "auto",
        }}
      >
        <div style={{ color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>Game Log</div>
        {log.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: i === 0 ? "#e2e8f0" : "#64748b", padding: "2px 0" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
