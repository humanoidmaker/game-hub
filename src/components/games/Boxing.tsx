import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ─── */
type Attack = "jab" | "hook" | "uppercut";
type Action = Attack | "block" | "dodgeLeft" | "dodgeRight" | "idle";
interface FloatingDmg {
  id: number;
  value: number;
  x: number;
  side: "player" | "bot";
  missed?: boolean;
  blocked?: boolean;
}
interface RoundResult {
  playerHits: number;
  botHits: number;
  winner: "player" | "bot" | "draw";
}

/* ─── Constants ─── */
const MAX_HP = 100;
const MAX_STAMINA = 100;
const ROUND_TIME = 60;
const MAX_ROUNDS = 3;
const STAMINA_REGEN = 0.4; // per tick (~60fps)
const ATTACK_DATA: Record<Attack, { damage: [number, number]; staminaCost: number; speed: number; hitWindow: number }> = {
  jab:      { damage: [5, 9],   staminaCost: 10, speed: 200,  hitWindow: 150 },
  hook:     { damage: [12, 20], staminaCost: 20, speed: 400,  hitWindow: 250 },
  uppercut: { damage: [22, 32], staminaCost: 35, speed: 650,  hitWindow: 350 },
};

/* ─── Sound Helpers ─── */
function playSound(type: "punch" | "block" | "crowd" | "bell" | "ko" | "miss") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case "punch":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
        break;
      case "block":
        osc.type = "square";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
        break;
      case "miss":
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
        break;
      case "crowd": {
        // White noise burst for crowd roar
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        src.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        src.start(); src.stop(ctx.currentTime + 0.5);
        return;
      }
      case "bell":
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
        break;
      case "ko":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(); osc.stop(ctx.currentTime + 0.8);
        break;
    }
  } catch (_) {}
}

/* ─── Random Helpers ─── */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/* ─── Component ─── */
export default function Boxing() {
  // Game state
  const [phase, setPhase] = useState<"menu" | "countdown" | "fight" | "roundEnd" | "gameOver">("menu");
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(ROUND_TIME);
  const [countdown, setCountdown] = useState(3);

  // Player state
  const [playerHP, setPlayerHP] = useState(MAX_HP);
  const [playerStamina, setPlayerStamina] = useState(MAX_STAMINA);
  const [playerAction, setPlayerAction] = useState<Action>("idle");
  const [playerPos, setPlayerPos] = useState(0); // -1 left, 0 center, 1 right
  const [playerArmAnim, setPlayerArmAnim] = useState<"idle" | "jabbing" | "hooking" | "uppercutting">("idle");

  // Bot state
  const [botHP, setBotHP] = useState(MAX_HP);
  const [botStamina, setBotStamina] = useState(MAX_STAMINA);
  const [botAction, setBotAction] = useState<Action>("idle");
  const [botPos, setBotPos] = useState(0);
  const [botArmAnim, setBotArmAnim] = useState<"idle" | "jabbing" | "hooking" | "uppercutting">("idle");

  // Floating damage numbers
  const [floatingDmgs, setFloatingDmgs] = useState<FloatingDmg[]>([]);
  const dmgIdRef = useRef(0);

  // Stats
  const [playerHits, setPlayerHits] = useState(0);
  const [botHits, setBotHits] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);

  // Cooldown refs (prevent spam)
  const playerCooldownRef = useRef(false);
  const botCooldownRef = useRef(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mutable refs for bot AI to read latest state
  const playerActionRef = useRef<Action>("idle");
  const playerPosRef = useRef(0);
  const botHPRef = useRef(MAX_HP);
  const playerHPRef = useRef(MAX_HP);
  const botStaminaRef = useRef(MAX_STAMINA);
  const phaseRef = useRef(phase);

  useEffect(() => { playerActionRef.current = playerAction; }, [playerAction]);
  useEffect(() => { playerPosRef.current = playerPos; }, [playerPos]);
  useEffect(() => { botHPRef.current = botHP; }, [botHP]);
  useEffect(() => { playerHPRef.current = playerHP; }, [playerHP]);
  useEffect(() => { botStaminaRef.current = botStamina; }, [botStamina]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const [message, setMessage] = useState("");

  /* ─── Floating Damage ─── */
  const addFloating = useCallback((value: number, side: "player" | "bot", missed?: boolean, blocked?: boolean) => {
    const id = ++dmgIdRef.current;
    const x = side === "bot" ? 60 + Math.random() * 30 : 10 + Math.random() * 30;
    setFloatingDmgs(prev => [...prev, { id, value, x, side, missed, blocked }]);
    setTimeout(() => {
      setFloatingDmgs(prev => prev.filter(d => d.id !== id));
    }, 1000);
  }, []);

  /* ─── Player Attack ─── */
  const playerAttack = useCallback((type: Attack) => {
    if (phaseRef.current !== "fight" || playerCooldownRef.current) return;
    const data = ATTACK_DATA[type];
    if (playerStamina < data.staminaCost) return;

    playerCooldownRef.current = true;
    setPlayerStamina(s => s - data.staminaCost);
    setPlayerAction(type);
    setPlayerArmAnim(type === "jab" ? "jabbing" : type === "hook" ? "hooking" : "uppercutting");

    // Resolve hit after speed delay
    setTimeout(() => {
      if (phaseRef.current !== "fight") { playerCooldownRef.current = false; return; }
      const currentBotAction = botAction;
      const currentBotPos = botPos;

      // Check if bot is dodging the right direction or blocking
      const dodged = (currentBotAction === "dodgeLeft" || currentBotAction === "dodgeRight");
      const blocked = currentBotAction === "block";

      if (dodged) {
        addFloating(0, "bot", true);
        playSound("miss");
        setMessage("Bot dodged!");
      } else if (blocked) {
        const reducedDmg = Math.floor(randInt(...data.damage) * 0.2);
        setBotHP(h => Math.max(0, h - reducedDmg));
        addFloating(reducedDmg, "bot", false, true);
        playSound("block");
        setMessage("Bot blocked! -" + reducedDmg);
      } else {
        const dmg = randInt(...data.damage);
        setBotHP(h => Math.max(0, h - dmg));
        setPlayerHits(h => h + 1);
        addFloating(dmg, "bot");
        playSound("punch");
        setMessage(type.toUpperCase() + "! -" + dmg);
      }

      // Reset animation
      setTimeout(() => {
        setPlayerArmAnim("idle");
        setPlayerAction("idle");
        playerCooldownRef.current = false;
      }, 200);
    }, data.speed);
  }, [playerStamina, botAction, botPos, addFloating]);

  /* ─── Bot Attack ─── */
  const botAttack = useCallback((type: Attack) => {
    if (phaseRef.current !== "fight" || botCooldownRef.current) return;
    const data = ATTACK_DATA[type];
    if (botStaminaRef.current < data.staminaCost) return;

    botCooldownRef.current = true;
    setBotStamina(s => s - data.staminaCost);
    setBotAction(type);
    setBotArmAnim(type === "jab" ? "jabbing" : type === "hook" ? "hooking" : "uppercutting");

    setTimeout(() => {
      if (phaseRef.current !== "fight") { botCooldownRef.current = false; return; }
      const pAction = playerActionRef.current;
      const pPos = playerPosRef.current;

      const dodged = (pAction === "dodgeLeft" || pAction === "dodgeRight");
      const blocked = pAction === "block";

      if (dodged) {
        addFloating(0, "player", true);
        playSound("miss");
        setMessage("You dodged!");
      } else if (blocked) {
        const reducedDmg = Math.floor(randInt(...data.damage) * 0.2);
        setPlayerHP(h => Math.max(0, h - reducedDmg));
        addFloating(reducedDmg, "player", false, true);
        playSound("block");
        setMessage("You blocked! -" + reducedDmg);
      } else {
        const dmg = randInt(...data.damage);
        setPlayerHP(h => Math.max(0, h - dmg));
        setBotHits(h => h + 1);
        addFloating(dmg, "player");
        playSound("punch");
        setMessage("Bot " + type + "! -" + dmg);
      }

      setTimeout(() => {
        setBotArmAnim("idle");
        setBotAction("idle");
        botCooldownRef.current = false;
      }, 200);
    }, data.speed);
  }, [addFloating]);

  /* ─── Player Dodge / Block ─── */
  const playerDodge = useCallback((dir: "left" | "right") => {
    if (phaseRef.current !== "fight" || playerCooldownRef.current) return;
    setPlayerAction(dir === "left" ? "dodgeLeft" : "dodgeRight");
    setPlayerPos(dir === "left" ? -1 : 1);
    setTimeout(() => {
      setPlayerAction("idle");
      setPlayerPos(0);
    }, 400);
  }, []);

  const playerBlock = useCallback(() => {
    if (phaseRef.current !== "fight" || playerCooldownRef.current) return;
    setPlayerAction("block");
    setTimeout(() => {
      setPlayerAction("idle");
    }, 600);
  }, []);

  /* ─── Bot AI ─── */
  const botAI = useCallback(() => {
    if (phaseRef.current !== "fight" || botCooldownRef.current) return;

    const roll = Math.random();
    if (roll < 0.45) {
      // Attack
      const atkRoll = Math.random();
      if (atkRoll < 0.5) botAttack("jab");
      else if (atkRoll < 0.8) botAttack("hook");
      else botAttack("uppercut");
    } else if (roll < 0.65) {
      // Block
      setBotAction("block");
      setTimeout(() => { setBotAction("idle"); }, 500);
    } else if (roll < 0.8) {
      // Dodge
      const dir = Math.random() < 0.5 ? "dodgeLeft" : "dodgeRight";
      setBotAction(dir);
      setBotPos(dir === "dodgeLeft" ? -1 : 1);
      setTimeout(() => { setBotAction("idle"); setBotPos(0); }, 400);
    }
    // else idle
  }, [botAttack]);

  /* ─── Keyboard Controls ─── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (phase !== "fight") return;
      const key = e.key.toLowerCase();
      if (key === "j") playerAttack("jab");
      else if (key === "k") playerAttack("hook");
      else if (key === "l") playerAttack("uppercut");
      else if (key === "a") playerDodge("left");
      else if (key === "d") playerDodge("right");
      else if (key === "s") playerBlock();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, playerAttack, playerDodge, playerBlock]);

  /* ─── KO Detection ─── */
  useEffect(() => {
    if (phase !== "fight") return;
    if (botHP <= 0) {
      playSound("ko");
      playSound("crowd");
      setMessage("KO! You win the round!");
      setPhase("roundEnd");
      setRoundResults(prev => [...prev, { playerHits, botHits, winner: "player" }]);
    } else if (playerHP <= 0) {
      playSound("ko");
      setMessage("KO! Bot wins the round!");
      setPhase("roundEnd");
      setRoundResults(prev => [...prev, { playerHits, botHits, winner: "bot" }]);
    }
  }, [playerHP, botHP, phase, playerHits, botHits]);

  /* ─── Game Loop (stamina regen + bot AI) ─── */
  useEffect(() => {
    if (phase === "fight") {
      gameLoopRef.current = setInterval(() => {
        // Stamina regen
        setPlayerStamina(s => Math.min(MAX_STAMINA, s + STAMINA_REGEN));
        setBotStamina(s => Math.min(MAX_STAMINA, s + STAMINA_REGEN));
      }, 1000 / 60);

      // Bot AI ticks
      const botLoop = setInterval(() => {
        botAI();
      }, 800 + Math.random() * 600);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        clearInterval(botLoop);
      };
    }
  }, [phase, botAI]);

  /* ─── Round Timer ─── */
  useEffect(() => {
    if (phase === "fight") {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            // Time's up — decide by hits
            setPhase("roundEnd");
            const winner = playerHits > botHits ? "player" : botHits > playerHits ? "bot" : "draw";
            setRoundResults(prev => [...prev, { playerHits, botHits, winner }]);
            setMessage(
              winner === "player" ? "Time! You win on points!" :
              winner === "bot" ? "Time! Bot wins on points!" :
              "Time! Round draw!"
            );
            playSound("bell");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [phase, playerHits, botHits]);

  /* ─── Countdown ─── */
  useEffect(() => {
    if (phase === "countdown") {
      setCountdown(3);
      const iv = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(iv);
            setPhase("fight");
            playSound("bell");
            setMessage("FIGHT!");
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(iv);
    }
  }, [phase]);

  /* ─── Start / Next Round / Reset ─── */
  const startGame = () => {
    setRound(1);
    setRoundResults([]);
    resetRound();
    setPhase("countdown");
  };

  const resetRound = () => {
    setPlayerHP(MAX_HP);
    setBotHP(MAX_HP);
    setPlayerStamina(MAX_STAMINA);
    setBotStamina(MAX_STAMINA);
    setPlayerAction("idle");
    setBotAction("idle");
    setPlayerPos(0);
    setBotPos(0);
    setPlayerArmAnim("idle");
    setBotArmAnim("idle");
    setPlayerHits(0);
    setBotHits(0);
    setTimer(ROUND_TIME);
    setFloatingDmgs([]);
    playerCooldownRef.current = false;
    botCooldownRef.current = false;
    setMessage("");
  };

  const nextRound = () => {
    if (round >= MAX_ROUNDS) {
      // Tally overall winner
      const pWins = roundResults.filter(r => r.winner === "player").length;
      const bWins = roundResults.filter(r => r.winner === "bot").length;
      setMessage(
        pWins > bWins ? "You win the match!" :
        bWins > pWins ? "Bot wins the match!" :
        "Match is a draw!"
      );
      if (pWins > bWins) playSound("crowd");
      setPhase("gameOver");
    } else {
      setRound(r => r + 1);
      resetRound();
      setPhase("countdown");
    }
  };

  /* ─── Boxer Drawing ─── */
  const renderBoxer = (
    side: "player" | "bot",
    hp: number,
    armAnim: string,
    action: Action,
    pos: number,
  ) => {
    const isPlayer = side === "player";
    const bodyColor = isPlayer ? "#3b82f6" : "#ef4444";
    const headColor = isPlayer ? "#60a5fa" : "#f87171";
    const shortsColor = isPlayer ? "#1d4ed8" : "#b91c1c";
    const skinColor = "#f5d0a9";
    const gloveColor = isPlayer ? "#2563eb" : "#dc2626";

    const dodgeX = pos * 25;
    const blockShift = action === "block" ? (isPlayer ? -5 : 5) : 0;
    const koSlump = hp <= 0 ? 20 : 0;

    // Arm positions based on animation
    let leadArmX = isPlayer ? 55 : -15;
    let leadArmY = 38;
    let rearArmX = isPlayer ? -10 : 50;
    let rearArmY = 42;

    if (armAnim === "jabbing") {
      leadArmX += isPlayer ? 25 : -25;
      leadArmY -= 5;
    } else if (armAnim === "hooking") {
      leadArmX += isPlayer ? 20 : -20;
      leadArmY -= 12;
      rearArmX += isPlayer ? 8 : -8;
    } else if (armAnim === "uppercutting") {
      rearArmX += isPlayer ? 15 : -15;
      rearArmY -= 25;
    }

    if (action === "block") {
      leadArmX = isPlayer ? 30 : 10;
      leadArmY = 25;
      rearArmX = isPlayer ? 20 : 20;
      rearArmY = 25;
    }

    return (
      <div style={{
        position: "relative",
        width: 80,
        height: 150,
        transform: `translateX(${dodgeX + blockShift}px) translateY(${koSlump}px)`,
        transition: "transform 0.15s ease-out",
        opacity: hp <= 0 ? 0.5 : 1,
      }}>
        {/* Head */}
        <div style={{
          position: "absolute",
          left: 20,
          top: hp <= 0 ? 15 : 0,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: skinColor,
          border: `3px solid ${headColor}`,
          transition: "top 0.3s",
          zIndex: 3,
        }}>
          {/* Eyes */}
          <div style={{ position: "absolute", top: 12, left: isPlayer ? 8 : 18, width: 5, height: hp <= 0 ? 2 : 5, borderRadius: "50%", background: "#333" }} />
          <div style={{ position: "absolute", top: 12, left: isPlayer ? 22 : 8, width: 5, height: hp <= 0 ? 2 : 5, borderRadius: "50%", background: "#333" }} />
          {/* Mouth */}
          {hp <= 0 && (
            <div style={{ position: "absolute", top: 24, left: 13, width: 10, height: 3, borderRadius: 2, background: "#333" }} />
          )}
        </div>

        {/* Body */}
        <div style={{
          position: "absolute",
          left: 18,
          top: 38,
          width: 40,
          height: 50,
          borderRadius: 6,
          background: bodyColor,
          zIndex: 2,
        }} />

        {/* Shorts */}
        <div style={{
          position: "absolute",
          left: 15,
          top: 85,
          width: 46,
          height: 22,
          borderRadius: "0 0 6px 6px",
          background: shortsColor,
          zIndex: 2,
        }} />

        {/* Legs */}
        <div style={{
          position: "absolute",
          left: 20,
          top: 105,
          width: 14,
          height: 38,
          borderRadius: 4,
          background: skinColor,
          zIndex: 1,
        }} />
        <div style={{
          position: "absolute",
          left: 42,
          top: 105,
          width: 14,
          height: 38,
          borderRadius: 4,
          background: skinColor,
          zIndex: 1,
        }} />

        {/* Lead Arm + Glove */}
        <div style={{
          position: "absolute",
          left: leadArmX,
          top: leadArmY,
          width: 28,
          height: 16,
          borderRadius: 8,
          background: gloveColor,
          zIndex: 4,
          transition: "all 0.1s ease-out",
          boxShadow: armAnim !== "idle" ? `0 0 12px ${gloveColor}` : "none",
        }} />

        {/* Rear Arm + Glove */}
        <div style={{
          position: "absolute",
          left: rearArmX,
          top: rearArmY,
          width: 24,
          height: 14,
          borderRadius: 7,
          background: gloveColor,
          zIndex: 1,
          transition: "all 0.1s ease-out",
          opacity: 0.85,
          boxShadow: armAnim === "uppercutting" ? `0 0 12px ${gloveColor}` : "none",
        }} />

        {/* Block Shield Indicator */}
        {action === "block" && (
          <div style={{
            position: "absolute",
            left: isPlayer ? 35 : -5,
            top: 20,
            width: 50,
            height: 55,
            borderRadius: 8,
            border: "3px solid rgba(255,255,100,0.5)",
            background: "rgba(255,255,100,0.08)",
            zIndex: 5,
          }} />
        )}
      </div>
    );
  };

  /* ─── Health Bar ─── */
  const renderHealthBar = (hp: number, label: string, color: string, isReversed?: boolean) => (
    <div style={{ flex: 1, maxWidth: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: "#ccc", fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span style={{ color: "#aaa", fontSize: 12 }}>{hp} HP</span>
      </div>
      <div style={{
        width: "100%",
        height: 16,
        background: "#1a1a2e",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #333",
        display: "flex",
        flexDirection: isReversed ? "row-reverse" : "row",
      }}>
        <div style={{
          width: hp + "%",
          height: "100%",
          background: hp > 60 ? color : hp > 30 ? "#eab308" : "#ef4444",
          borderRadius: 8,
          transition: "width 0.3s, background 0.3s",
          boxShadow: `0 0 8px ${hp > 60 ? color : hp > 30 ? "#eab308" : "#ef4444"}44`,
        }} />
      </div>
    </div>
  );

  /* ─── Stamina Bar ─── */
  const renderStaminaBar = (stamina: number, label: string) => (
    <div style={{ flex: 1, maxWidth: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ color: "#888", fontSize: 10 }}>{label} Stamina</span>
        <span style={{ color: "#888", fontSize: 10 }}>{Math.floor(stamina)}%</span>
      </div>
      <div style={{
        width: "100%",
        height: 8,
        background: "#1a1a2e",
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid #222",
      }}>
        <div style={{
          width: stamina + "%",
          height: "100%",
          background: stamina > 50 ? "#22c55e" : stamina > 25 ? "#eab308" : "#ef4444",
          borderRadius: 4,
          transition: "width 0.15s",
        }} />
      </div>
    </div>
  );

  /* ─── Styles ─── */
  const btnBase: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "2px solid transparent",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
    letterSpacing: 0.5,
    minWidth: 60,
  };

  const arenaStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: 500,
    height: 220,
    background: "linear-gradient(180deg, #0a0a1a 0%, #141428 60%, #1a1a35 100%)",
    borderRadius: 12,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 60,
    padding: "0 30px 20px",
    overflow: "hidden",
    border: "1px solid #222",
  };

  /* ─── Render ─── */
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "16px 12px",
      background: "#0d0d1a",
      borderRadius: 16,
      minHeight: 500,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#fff",
      userSelect: "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: "#f0f0f0" }}>BOXING</span>
        {phase === "fight" && (
          <span style={{
            background: "#ef4444",
            color: "#fff",
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
          }}>ROUND {round}/{MAX_ROUNDS}</span>
        )}
      </div>

      {/* ─── Menu Screen ─── */}
      {phase === "menu" && (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>&#x1F94A;</div>
          <p style={{ color: "#aaa", fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
            <strong style={{ color: "#fff" }}>Keyboard:</strong> J=Jab, K=Hook, L=Uppercut<br />
            A=Dodge Left, D=Dodge Right, S=Block
          </p>
          <p style={{ color: "#777", fontSize: 12, marginBottom: 24 }}>
            3 rounds of 60 seconds. KO or win by points!
          </p>
          <button
            onClick={startGame}
            style={{
              ...btnBase,
              padding: "14px 40px",
              fontSize: 16,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 20px #ef444444",
            }}
          >
            START FIGHT
          </button>
        </div>
      )}

      {/* ─── Countdown ─── */}
      {phase === "countdown" && (
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>Round {round}</p>
          <div style={{
            fontSize: 72,
            fontWeight: 900,
            color: countdown > 0 ? "#eab308" : "#22c55e",
            textShadow: "0 0 30px currentColor",
            animation: "pulse 0.5s ease-in-out",
          }}>
            {countdown > 0 ? countdown : "FIGHT!"}
          </div>
        </div>
      )}

      {/* ─── Fight Screen ─── */}
      {phase === "fight" && (
        <>
          {/* Timer */}
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: timer <= 10 ? "#ef4444" : "#eab308",
            marginBottom: 6,
            fontVariantNumeric: "tabular-nums",
            textShadow: timer <= 10 ? "0 0 12px #ef444488" : "none",
          }}>
            {timer}
          </div>

          {/* Health Bars */}
          <div style={{ display: "flex", gap: 20, width: "100%", maxWidth: 600, marginBottom: 4, alignItems: "center" }}>
            {renderHealthBar(playerHP, "YOU", "#3b82f6")}
            <span style={{ color: "#555", fontWeight: 800, fontSize: 14 }}>VS</span>
            {renderHealthBar(botHP, "BOT", "#ef4444", true)}
          </div>

          {/* Stamina Bars */}
          <div style={{ display: "flex", gap: 20, width: "100%", maxWidth: 600, marginBottom: 10 }}>
            {renderStaminaBar(playerStamina, "Your")}
            <div style={{ width: 30 }} />
            {renderStaminaBar(botStamina, "Bot")}
          </div>

          {/* Arena */}
          <div style={arenaStyle}>
            {/* Ring ropes */}
            <div style={{ position: "absolute", top: 30, left: 0, right: 0, height: 2, background: "#ffffff15" }} />
            <div style={{ position: "absolute", top: 60, left: 0, right: 0, height: 2, background: "#ffffff10" }} />
            {/* Ring floor */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 20, background: "#1a1a35", borderTop: "2px solid #ffffff10" }} />

            {/* Player Boxer */}
            {renderBoxer("player", playerHP, playerArmAnim, playerAction, playerPos)}

            {/* Bot Boxer */}
            {renderBoxer("bot", botHP, botArmAnim, botAction, botPos)}

            {/* Floating Damage Numbers */}
            {floatingDmgs.map(d => (
              <div
                key={d.id}
                style={{
                  position: "absolute",
                  left: d.x + "%",
                  bottom: 120,
                  color: d.missed ? "#888" : d.blocked ? "#eab308" : d.side === "bot" ? "#3b82f6" : "#ef4444",
                  fontSize: d.missed ? 14 : d.blocked ? 16 : 22,
                  fontWeight: 900,
                  textShadow: "0 0 8px currentColor",
                  animation: "floatUp 1s ease-out forwards",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                {d.missed ? "MISS" : d.blocked ? "BLOCKED" : "-" + d.value}
              </div>
            ))}
          </div>

          {/* Message */}
          {message && (
            <p style={{
              color: message.includes("KO") ? "#22c55e" : "#eab308",
              fontWeight: 700,
              fontSize: 15,
              marginTop: 8,
              marginBottom: 4,
              textShadow: "0 0 8px currentColor",
              minHeight: 20,
            }}>{message}</p>
          )}

          {/* Action Buttons (mobile) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 6, width: "100%", maxWidth: 400 }}>
            {/* Attack Row */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => playerAttack("jab")}
                disabled={playerStamina < ATTACK_DATA.jab.staminaCost}
                style={{
                  ...btnBase,
                  background: playerStamina < ATTACK_DATA.jab.staminaCost ? "#1a1a2e" : "#3b82f6",
                  color: playerStamina < ATTACK_DATA.jab.staminaCost ? "#555" : "#fff",
                  borderColor: "#3b82f644",
                }}
              >
                J - Jab
              </button>
              <button
                onClick={() => playerAttack("hook")}
                disabled={playerStamina < ATTACK_DATA.hook.staminaCost}
                style={{
                  ...btnBase,
                  background: playerStamina < ATTACK_DATA.hook.staminaCost ? "#1a1a2e" : "#eab308",
                  color: playerStamina < ATTACK_DATA.hook.staminaCost ? "#555" : "#000",
                  borderColor: "#eab30844",
                }}
              >
                K - Hook
              </button>
              <button
                onClick={() => playerAttack("uppercut")}
                disabled={playerStamina < ATTACK_DATA.uppercut.staminaCost}
                style={{
                  ...btnBase,
                  background: playerStamina < ATTACK_DATA.uppercut.staminaCost ? "#1a1a2e" : "#ef4444",
                  color: playerStamina < ATTACK_DATA.uppercut.staminaCost ? "#555" : "#fff",
                  borderColor: "#ef444444",
                }}
              >
                L - Uppercut
              </button>
            </div>
            {/* Defense Row */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <button
                onClick={() => playerDodge("left")}
                style={{
                  ...btnBase,
                  background: playerAction === "dodgeLeft" ? "#14532d" : "#1e293b",
                  color: playerAction === "dodgeLeft" ? "#22c55e" : "#94a3b8",
                  borderColor: "#334155",
                }}
              >
                A - Dodge L
              </button>
              <button
                onClick={playerBlock}
                style={{
                  ...btnBase,
                  background: playerAction === "block" ? "#14532d" : "#1e293b",
                  color: playerAction === "block" ? "#22c55e" : "#94a3b8",
                  borderColor: playerAction === "block" ? "#22c55e44" : "#334155",
                }}
              >
                S - Block
              </button>
              <button
                onClick={() => playerDodge("right")}
                style={{
                  ...btnBase,
                  background: playerAction === "dodgeRight" ? "#14532d" : "#1e293b",
                  color: playerAction === "dodgeRight" ? "#22c55e" : "#94a3b8",
                  borderColor: "#334155",
                }}
              >
                D - Dodge R
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Round End ─── */}
      {phase === "roundEnd" && (
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#eab308", marginBottom: 8, textShadow: "0 0 12px #eab30844" }}>
            {message}
          </p>
          <div style={{ display: "flex", gap: 30, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#3b82f6", fontWeight: 700 }}>YOU</p>
              <p style={{ color: "#aaa", fontSize: 13 }}>{playerHP} HP</p>
              <p style={{ color: "#aaa", fontSize: 13 }}>{playerHits} hits</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#ef4444", fontWeight: 700 }}>BOT</p>
              <p style={{ color: "#aaa", fontSize: 13 }}>{botHP} HP</p>
              <p style={{ color: "#aaa", fontSize: 13 }}>{botHits} hits</p>
            </div>
          </div>
          <button
            onClick={nextRound}
            style={{
              ...btnBase,
              padding: "12px 36px",
              fontSize: 15,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 16px #22c55e44",
            }}
          >
            {round >= MAX_ROUNDS ? "SEE RESULTS" : "NEXT ROUND"}
          </button>
        </div>
      )}

      {/* ─── Game Over ─── */}
      {phase === "gameOver" && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <p style={{
            fontSize: 28,
            fontWeight: 900,
            color: message.includes("You win") ? "#22c55e" : message.includes("Bot") ? "#ef4444" : "#eab308",
            marginBottom: 16,
            textShadow: "0 0 16px currentColor",
          }}>
            {message}
          </p>

          {/* Round Summary */}
          <div style={{ marginBottom: 20 }}>
            {roundResults.map((r, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 6,
                padding: "6px 16px",
                background: "#1a1a2e",
                borderRadius: 8,
                fontSize: 13,
              }}>
                <span style={{ color: "#888" }}>Round {i + 1}</span>
                <span style={{ color: "#3b82f6" }}>You: {r.playerHits} hits</span>
                <span style={{ color: "#ef4444" }}>Bot: {r.botHits} hits</span>
                <span style={{
                  color: r.winner === "player" ? "#22c55e" : r.winner === "bot" ? "#ef4444" : "#eab308",
                  fontWeight: 700,
                }}>
                  {r.winner === "player" ? "WIN" : r.winner === "bot" ? "LOSS" : "DRAW"}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setPhase("menu"); setMessage(""); }}
            style={{
              ...btnBase,
              padding: "14px 40px",
              fontSize: 16,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 20px #ef444444",
            }}
          >
            REMATCH
          </button>
        </div>
      )}

      {/* CSS Keyframes */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          60% { opacity: 1; transform: translateY(-40px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-70px) scale(0.8); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
