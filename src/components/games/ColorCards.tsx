"use client";
import { useState, useCallback, useRef, useEffect } from "react";

/* ── constants ── */
const COLORS = ["red", "blue", "green", "yellow"] as const;
type Color = (typeof COLORS)[number];
const VALUES = ["0","1","2","3","4","5","6","7","8","9","Skip","Reverse","Draw2"] as const;
type Value = (typeof VALUES)[number] | "Wild" | "WildDraw4";

const COLOR_HEX: Record<string, string> = {
  red: "#e63946",
  blue: "#457b9d",
  green: "#2a9d8f",
  yellow: "#e9c46a",
  wild: "#1d1d2b",
};
const COLOR_GLOW: Record<string, string> = {
  red: "rgba(230,57,70,.45)",
  blue: "rgba(69,123,157,.45)",
  green: "rgba(42,157,143,.45)",
  yellow: "rgba(233,196,106,.45)",
  wild: "rgba(160,100,255,.35)",
};

const SYMBOL: Record<string, string> = {
  Skip: "\u29B8",      // ⦸
  Reverse: "\u21C4",   // ⇄
  Draw2: "+2",
  Wild: "\u2733",      // ✳
  WildDraw4: "+4",
};

/* ── types ── */
interface Card {
  id: number;
  color: string;   // red | blue | green | yellow | wild
  value: Value;
}

/* ── deck builder ── */
let _nextId = 0;
function makeCard(color: string, value: Value): Card {
  return { id: _nextId++, color, value };
}

function buildDeck(): Card[] {
  _nextId = 0;
  const d: Card[] = [];
  for (const c of COLORS) {
    d.push(makeCard(c, "0"));                          // one 0 per color
    for (const v of VALUES) {
      if (v === "0") continue;
      d.push(makeCard(c, v));
      d.push(makeCard(c, v));                          // two of each 1-9, Skip, Reverse, Draw2
    }
  }
  for (let i = 0; i < 4; i++) {
    d.push(makeCard("wild", "Wild"));
    d.push(makeCard("wild", "WildDraw4"));
  }
  return shuffle(d);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── helpers ── */
function canPlay(card: Card, top: Card, activeColor: string): boolean {
  if (card.color === "wild") return true;
  if (card.color === activeColor) return true;
  if (card.value === top.value) return true;
  return false;
}

function isAction(v: Value): boolean {
  return v === "Skip" || v === "Reverse" || v === "Draw2";
}
function isWild(c: Card): boolean {
  return c.color === "wild";
}

/* ── sound ── */
function playSlap() {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    // short noise burst simulating card slap
    const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.value = 0.25;
    src.connect(g).connect(ac.destination);
    src.start();
    src.onended = () => ac.close();
  } catch { /* silence */ }
}

/* ── initial state factory ── */
function initState() {
  const deck = buildDeck();
  const playerHand = deck.splice(0, 7);
  const botHand = deck.splice(0, 7);
  // find first non-wild card for discard pile start
  let startIdx = 0;
  for (let i = 0; i < deck.length; i++) {
    if (deck[i].color !== "wild") { startIdx = i; break; }
  }
  const startCard = deck.splice(startIdx, 1)[0];
  return { deck, playerHand, botHand, pile: [startCard], activeColor: startCard.color };
}

/* ── component ── */
export default function ColorCards() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [botHand, setBotHand] = useState<Card[]>([]);
  const [pile, setPile] = useState<Card[]>([]);
  const [activeColor, setActiveColor] = useState("red");
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = normal, -1 = reversed (cosmetic in 2-player)
  const [status, setStatus] = useState("Your turn — play a card or draw!");
  const [gameOver, setGameOver] = useState(false);
  const [pickingColor, setPickingColor] = useState(false);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [lastPlayed, setLastPlayed] = useState<Card | null>(null);
  const [animating, setAnimating] = useState(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- init on mount -- */
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      resetGame();
    }
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };
  }, []);

  function resetGame() {
    const s = initState();
    setDeck(s.deck);
    setPlayerHand(s.playerHand);
    setBotHand(s.botHand);
    setPile(s.pile);
    setActiveColor(s.activeColor);
    setTurn("player");
    setDirection(1);
    setStatus("Your turn — play a card or draw!");
    setGameOver(false);
    setPickingColor(false);
    setPendingCard(null);
    setLastPlayed(null);
    setAnimating(false);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
  }

  const top = pile.length > 0 ? pile[pile.length - 1] : null;

  /* ── draw from deck (recycle pile if needed) ── */
  function drawCards(n: number, currentDeck: Card[], currentPile: Card[]): { drawn: Card[]; newDeck: Card[]; newPile: Card[] } {
    let d = [...currentDeck];
    let p = [...currentPile];
    const drawn: Card[] = [];
    for (let i = 0; i < n; i++) {
      if (d.length === 0) {
        if (p.length <= 1) break; // nothing to recycle
        const topCard = p[p.length - 1];
        d = shuffle(p.slice(0, -1));
        p = [topCard];
      }
      drawn.push(d.pop()!);
    }
    return { drawn, newDeck: d, newPile: p };
  }

  /* ── player plays a card ── */
  const playCard = useCallback((idx: number) => {
    if (turn !== "player" || gameOver || pickingColor || animating || !top) return;
    const card = playerHand[idx];
    if (!canPlay(card, top, activeColor)) return;

    playSlap();
    const newHand = [...playerHand];
    newHand.splice(idx, 1);
    setPlayerHand(newHand);
    const newPile = [...pile, card];
    setPile(newPile);
    setLastPlayed(card);

    if (isWild(card)) {
      setPendingCard(card);
      setPickingColor(true);
      return;
    }

    resolvePlayerTurn(card, card.color, newHand, newPile);
  }, [playerHand, turn, top, activeColor, pile, gameOver, pickingColor, animating, deck, botHand, direction]);

  function pickColor(color: string) {
    setPickingColor(false);
    setActiveColor(color);
    resolvePlayerTurn(pendingCard!, color, playerHand, pile);
    setPendingCard(null);
  }

  function resolvePlayerTurn(card: Card, color: string, pHand: Card[], currentPile: Card[]) {
    setActiveColor(color);
    if (pHand.length === 0) {
      setStatus("🏆 You win! Well played!");
      setGameOver(true);
      return;
    }

    let skipBot = false;
    let newBotHand = [...botHand];
    let newDeck = [...deck];
    let updatedPile = [...currentPile];

    if (card.value === "Skip") {
      skipBot = true;
      setStatus("Skip! Bot loses a turn.");
    } else if (card.value === "Reverse") {
      setDirection(d => (d === 1 ? -1 : 1) as 1 | -1);
      skipBot = true; // in 2-player, reverse acts like skip
      setStatus("Reverse! Bot loses a turn.");
    } else if (card.value === "Draw2") {
      const r = drawCards(2, newDeck, updatedPile);
      newBotHand = [...newBotHand, ...r.drawn];
      newDeck = r.newDeck;
      updatedPile = r.newPile;
      skipBot = true;
      setStatus(`Draw 2! Bot picks up ${r.drawn.length} cards.`);
    } else if (card.value === "WildDraw4") {
      const r = drawCards(4, newDeck, updatedPile);
      newBotHand = [...newBotHand, ...r.drawn];
      newDeck = r.newDeck;
      updatedPile = r.newPile;
      skipBot = true;
      setStatus(`Wild Draw 4! Bot picks up ${r.drawn.length} cards.`);
    }

    setBotHand(newBotHand);
    setDeck(newDeck);
    setPile(updatedPile);

    if (skipBot) {
      // player goes again
      setTurn("player");
      return;
    }

    setTurn("bot");
    setStatus("Bot is thinking...");
    setAnimating(true);
    botTimerRef.current = setTimeout(() => {
      botPlay(color, newDeck, newBotHand, updatedPile);
    }, 800);
  }

  /* ── bot AI ── */
  function botPlay(color: string, currentDeck: Card[], currentBotHand: Card[], currentPile: Card[]) {
    const topCard = currentPile[currentPile.length - 1];
    const playable = currentBotHand
      .map((c, i) => ({ card: c, idx: i }))
      .filter(({ card }) => canPlay(card, topCard, color));

    if (playable.length > 0) {
      // AI priority: action cards first, then number cards, wilds last
      const sorted = [...playable].sort((a, b) => {
        const aWild = isWild(a.card) ? 1 : 0;
        const bWild = isWild(b.card) ? 1 : 0;
        if (aWild !== bWild) return aWild - bWild; // wilds last
        const aAction = isAction(a.card.value) ? 0 : 1;
        const bAction = isAction(b.card.value) ? 0 : 1;
        return aAction - bAction; // actions first
      });

      const pick = sorted[0];
      playSlap();
      const newBH = [...currentBotHand];
      newBH.splice(pick.idx, 1);
      const newPile = [...currentPile, pick.card];
      setBotHand(newBH);
      setPile(newPile);
      setLastPlayed(pick.card);

      let newColor = color;
      if (isWild(pick.card)) {
        // bot picks the color it has most of
        const counts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        newBH.forEach(c => { if (c.color !== "wild") counts[c.color]++; });
        newColor = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      } else {
        newColor = pick.card.color;
      }
      setActiveColor(newColor);

      if (newBH.length === 0) {
        setStatus("Bot wins! Better luck next time.");
        setGameOver(true);
        setAnimating(false);
        return;
      }

      // handle bot action cards
      let skipPlayer = false;
      let updatedDeck = [...currentDeck];
      let updatedPile = [...newPile];
      let updatedPlayerHand = [...playerHand];

      if (pick.card.value === "Skip" || pick.card.value === "Reverse") {
        skipPlayer = true;
        if (pick.card.value === "Reverse") setDirection(d => (d === 1 ? -1 : 1) as 1 | -1);
        setStatus(`Bot played ${pick.card.value === "Reverse" ? "Reverse" : "Skip"}! Bot goes again...`);
      } else if (pick.card.value === "Draw2") {
        const r = drawCards(2, updatedDeck, updatedPile);
        updatedPlayerHand = [...updatedPlayerHand, ...r.drawn];
        updatedDeck = r.newDeck;
        updatedPile = r.newPile;
        skipPlayer = true;
        setStatus(`Bot played Draw 2! You pick up ${r.drawn.length} cards.`);
        setPlayerHand(updatedPlayerHand);
      } else if (pick.card.value === "WildDraw4") {
        const r = drawCards(4, updatedDeck, updatedPile);
        updatedPlayerHand = [...updatedPlayerHand, ...r.drawn];
        updatedDeck = r.newDeck;
        updatedPile = r.newPile;
        skipPlayer = true;
        setStatus(`Bot played Wild Draw 4! You pick up ${r.drawn.length} cards. Color: ${newColor}`);
        setPlayerHand(updatedPlayerHand);
      } else {
        setStatus(`Bot played ${pick.card.color} ${pick.card.value}. Your turn!`);
      }

      setDeck(updatedDeck);
      setPile(updatedPile);

      if (skipPlayer) {
        // bot goes again
        setAnimating(true);
        botTimerRef.current = setTimeout(() => {
          botPlay(newColor, updatedDeck, newBH, updatedPile);
        }, 1000);
        return;
      }
    } else {
      // draw a card
      const r = drawCards(1, currentDeck, currentPile);
      if (r.drawn.length > 0) {
        const newBH = [...currentBotHand, ...r.drawn];
        setBotHand(newBH);
        setDeck(r.newDeck);
        setPile(r.newPile);
        setStatus("Bot drew a card. Your turn!");
      } else {
        setStatus("No cards left! Your turn.");
      }
    }

    setTurn("player");
    setAnimating(false);
  }

  /* ── player draws ── */
  function handleDraw() {
    if (turn !== "player" || gameOver || pickingColor || animating) return;
    const r = drawCards(1, deck, pile);
    if (r.drawn.length === 0) { setStatus("No cards to draw!"); return; }
    setPlayerHand([...playerHand, ...r.drawn]);
    setDeck(r.newDeck);
    setPile(r.newPile);
    setTurn("bot");
    setStatus("You drew a card. Bot's turn...");
    setAnimating(true);
    botTimerRef.current = setTimeout(() => {
      botPlay(activeColor, r.newDeck, botHand, r.newPile);
    }, 800);
  }

  /* ── card rendering ── */
  function renderCard(card: Card, faceUp: boolean, playable: boolean, onClick?: () => void, style?: React.CSSProperties) {
    const bg = faceUp ? (COLOR_HEX[card.color] || "#1d1d2b") : "#1a1a2e";
    const glow = faceUp && playable ? COLOR_GLOW[card.color] || COLOR_GLOW.wild : "transparent";
    const label = SYMBOL[card.value] || card.value;
    const isLong = label.length > 2;

    return (
      <div
        onClick={onClick}
        style={{
          width: 62,
          height: 90,
          borderRadius: 10,
          background: faceUp ? bg : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          border: faceUp
            ? `3px solid ${playable ? "#fff" : "rgba(255,255,255,.15)"}`
            : "3px solid #2a2a4a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: faceUp && playable && onClick ? "pointer" : "default",
          opacity: faceUp ? (playable || !onClick ? 1 : 0.5) : 1,
          boxShadow: playable && faceUp ? `0 0 12px ${glow}, 0 2px 8px rgba(0,0,0,.4)` : "0 2px 6px rgba(0,0,0,.3)",
          transition: "transform .15s, box-shadow .15s",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
          userSelect: "none",
          ...style,
        }}
      >
        {faceUp ? (
          <>
            {/* top-left mini label */}
            <span style={{ position: "absolute", top: 4, left: 6, fontSize: 10, fontWeight: 700, color: "#fff", opacity: 0.8 }}>
              {label}
            </span>
            {/* center */}
            <span style={{ fontSize: isLong ? 14 : 26, fontWeight: 800, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.5)", lineHeight: 1 }}>
              {label}
            </span>
            {/* bottom-right mini label */}
            <span style={{ position: "absolute", bottom: 4, right: 6, fontSize: 10, fontWeight: 700, color: "#fff", opacity: 0.8, transform: "rotate(180deg)" }}>
              {label}
            </span>
            {/* inner oval */}
            <div style={{
              position: "absolute",
              width: 40,
              height: 60,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,.15)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%) rotate(15deg)",
              pointerEvents: "none",
            }} />
          </>
        ) : (
          <>
            {/* card back pattern */}
            <div style={{
              width: 44,
              height: 66,
              borderRadius: 6,
              border: "2px solid #3a3a5a",
              background: "repeating-linear-gradient(45deg, #1e1e3a, #1e1e3a 4px, #24244a 4px, #24244a 8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#4a4a6a" }}>CC</span>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── fan layout for player hand ── */
  function renderPlayerHand() {
    const count = playerHand.length;
    const maxAngle = Math.min(count * 3, 40);
    const angleStep = count > 1 ? maxAngle / (count - 1) : 0;
    const startAngle = -maxAngle / 2;

    return (
      <div style={{
        position: "relative",
        height: 160,
        width: "100%",
        maxWidth: 600,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}>
        {playerHand.map((card, i) => {
          const angle = count > 1 ? startAngle + angleStep * i : 0;
          const yOffset = Math.abs(angle) * 0.5;
          const playable = !!top && canPlay(card, top, activeColor) && turn === "player" && !gameOver && !pickingColor && !animating;

          return (
            <div
              key={card.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${(i - (count - 1) / 2) * 38}px)`,
                bottom: yOffset,
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: "bottom center",
                transition: "transform .2s, bottom .2s",
                zIndex: i,
              }}
              onMouseEnter={(e) => {
                if (playable) {
                  (e.currentTarget as HTMLElement).style.transform = `translateX(-50%) rotate(${angle}deg) translateY(-18px)`;
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = `translateX(-50%) rotate(${angle}deg)`;
              }}
            >
              {renderCard(card, true, playable, playable ? () => playCard(i) : undefined)}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── bot hand (card backs in arc) ── */
  function renderBotHand() {
    const count = botHand.length;
    const maxAngle = Math.min(count * 2.5, 35);
    const angleStep = count > 1 ? maxAngle / (count - 1) : 0;
    const startAngle = -maxAngle / 2;

    return (
      <div style={{
        position: "relative",
        height: 100,
        width: "100%",
        maxWidth: 500,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}>
        {botHand.map((card, i) => {
          const angle = count > 1 ? startAngle + angleStep * i : 0;
          const yOffset = Math.abs(angle) * 0.3;
          return (
            <div
              key={card.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${(i - (count - 1) / 2) * 24}px)`,
                top: yOffset,
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: "top center",
                zIndex: i,
              }}
            >
              {renderCard(card, false, false, undefined, { width: 42, height: 60, borderRadius: 7 })}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── render ── */
  if (!top) return null; // loading

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)",
      padding: "16px 8px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#fff",
      overflow: "hidden",
    }}>
      {/* status bar */}
      <div style={{
        background: "rgba(255,255,255,.06)",
        borderRadius: 12,
        padding: "8px 20px",
        marginBottom: 8,
        textAlign: "center",
        backdropFilter: "blur(8px)",
        maxWidth: 420,
        width: "100%",
      }}>
        <p style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: gameOver ? "#2dce89" : "#e0e0e0",
        }}>{status}</p>
      </div>

      {/* info row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 6, fontSize: 12, color: "#888" }}>
        <span>Bot: {botHand.length} cards</span>
        <span>Deck: {deck.length}</span>
        <span>Direction: {direction === 1 ? "→" : "←"}</span>
      </div>

      {/* bot hand */}
      {renderBotHand()}

      {/* center area: discard pile + active color */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        margin: "12px 0",
      }}>
        {/* draw pile */}
        <div
          onClick={handleDraw}
          style={{
            cursor: turn === "player" && !gameOver && !pickingColor && !animating ? "pointer" : "default",
            opacity: turn === "player" && !gameOver && !pickingColor && !animating ? 1 : 0.5,
            transition: "opacity .2s",
          }}
          title="Draw a card"
        >
          {renderCard({ id: -1, color: "wild", value: "Wild" }, false, false, undefined, {
            width: 62,
            height: 90,
            boxShadow: "0 0 16px rgba(100,100,255,.15), 0 2px 8px rgba(0,0,0,.4)",
          })}
          <p style={{ textAlign: "center", fontSize: 10, color: "#666", margin: "4px 0 0" }}>DRAW</p>
        </div>

        {/* discard pile */}
        <div style={{ position: "relative" }}>
          {renderCard(top, true, false, undefined, {
            width: 80,
            height: 116,
            borderRadius: 12,
            boxShadow: `0 0 24px ${COLOR_GLOW[top.color] || COLOR_GLOW.wild}, 0 4px 16px rgba(0,0,0,.5)`,
          })}
        </div>

        {/* active color indicator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Color</span>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: COLOR_HEX[activeColor] || "#333",
            border: "3px solid rgba(255,255,255,.2)",
            boxShadow: `0 0 12px ${COLOR_GLOW[activeColor] || "transparent"}`,
          }} />
          <span style={{ fontSize: 10, color: "#aaa", textTransform: "capitalize" }}>{activeColor}</span>
        </div>
      </div>

      {/* color picker overlay */}
      {pickingColor && (
        <div style={{
          display: "flex",
          gap: 12,
          padding: "12px 20px",
          background: "rgba(0,0,0,.7)",
          borderRadius: 16,
          marginBottom: 12,
          backdropFilter: "blur(8px)",
        }}>
          <span style={{ fontSize: 13, color: "#ccc", alignSelf: "center", marginRight: 4 }}>Pick color:</span>
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => pickColor(c)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: COLOR_HEX[c],
                border: "3px solid rgba(255,255,255,.3)",
                cursor: "pointer",
                transition: "transform .15s, border-color .15s",
                boxShadow: `0 0 8px ${COLOR_GLOW[c]}`,
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.transform = "scale(1.15)";
                (e.target as HTMLElement).style.borderColor = "#fff";
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.transform = "scale(1)";
                (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,.3)";
              }}
            />
          ))}
        </div>
      )}

      {/* player hand */}
      {renderPlayerHand()}

      {/* game over controls */}
      {gameOver && (
        <button
          onClick={resetGame}
          style={{
            marginTop: 16,
            padding: "10px 28px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(102,126,234,.4)",
          }}
        >
          Play Again
        </button>
      )}
    </div>
  );
}
