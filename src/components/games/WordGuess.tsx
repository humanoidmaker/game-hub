"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── 500+ common 5-letter English words ───
const WORDS = [
  "ABOUT","ABOVE","ABUSE","ACTOR","ACUTE","ADMIT","ADOPT","ADULT","AFTER","AGAIN",
  "AGENT","AGREE","AHEAD","ALARM","ALBUM","ALERT","ALIEN","ALIGN","ALIVE","ALLEY",
  "ALLOW","ALONE","ALONG","ALTER","ANGEL","ANGER","ANGLE","ANGRY","APART","APPLE",
  "APPLY","ARENA","ARGUE","ARISE","ARMOR","ARRAY","ARROW","ASIDE","ASSET","AVOID",
  "AWARD","AWARE","BADLY","BASED","BASIC","BASIS","BEACH","BEGIN","BEING","BELOW",
  "BENCH","BILLY","BLACK","BLADE","BLAME","BLAND","BLANK","BLAST","BLAZE","BLEED",
  "BLEND","BLESS","BLIND","BLOCK","BLOOD","BLOOM","BLOWN","BOARD","BOAST","BONUS",
  "BOOTH","BOUND","BRAIN","BRAND","BRAVE","BREAD","BREAK","BREED","BRICK","BRIEF",
  "BRING","BROAD","BROKE","BROOK","BROWN","BRUSH","BUILD","BUNCH","BURST","BUYER",
  "CABIN","CABLE","CARGO","CARRY","CATCH","CAUSE","CEASE","CHAIN","CHAIR","CHAOS",
  "CHARM","CHART","CHASE","CHEAP","CHECK","CHEEK","CHESS","CHEST","CHIEF","CHILD",
  "CHILL","CHINA","CHUNK","CIVIL","CLAIM","CLASS","CLEAN","CLEAR","CLICK","CLIFF",
  "CLIMB","CLING","CLOCK","CLONE","CLOSE","CLOTH","CLOUD","COACH","COAST","CORAL",
  "COULD","COUNT","COURT","COVER","CRACK","CRAFT","CRANE","CRASH","CRAZY","CREAM",
  "CREEK","CREW","CRIME","CRISP","CROSS","CROWD","CROWN","CRUEL","CRUSH","CURVE",
  "CYCLE","DAILY","DANCE","DEATH","DEBUT","DECAY","DECOR","DELAY","DELTA","DEMON",
  "DENSE","DEPOT","DEPTH","DERBY","DEVIL","DIARY","DIRTY","DITCH","DIZZY","DONOR",
  "DOUBT","DOUGH","DRAFT","DRAIN","DRAMA","DRANK","DRAWN","DREAM","DRESS","DRIED",
  "DRIFT","DRILL","DRINK","DRIVE","DROWN","DRYER","DUMMY","DUSTY","DWARF","DWELL",
  "EAGER","EARLY","EARTH","EDICT","EIGHT","ELDER","ELECT","ELITE","EMBER","EMERY",
  "EMPTY","ENEMY","ENJOY","ENTER","ENTRY","EQUAL","ERROR","ESSAY","EVENT","EVERY",
  "EXACT","EXAM","EXILE","EXIST","EXTRA","FABLE","FACET","FAINT","FAIRY","FAITH",
  "FALSE","FANCY","FATAL","FAULT","FEAST","FENCE","FERRY","FETCH","FEVER","FIBER",
  "FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLAGS","FLAME","FLASH",
  "FLESH","FLING","FLOAT","FLOOD","FLOOR","FLORA","FLOUR","FLUID","FLUNK","FLUSH",
  "FLUTE","FOCUS","FORCE","FORGE","FORTH","FORUM","FOUND","FRAME","FRANK","FRAUD",
  "FRESH","FRONT","FROST","FROZE","FRUIT","FULLY","FUNGI","GIANT","GIVEN","GLAND",
  "GLASS","GLAZE","GLEAM","GLIDE","GLOBE","GLOOM","GLORY","GLOSS","GLOVE","GOING",
  "GRACE","GRADE","GRAIN","GRAND","GRANT","GRAPE","GRAPH","GRASP","GRASS","GRAVE",
  "GRAVEL","GREEN","GREET","GRIEF","GRILL","GRIND","GROAN","GROOM","GROSS","GROUP",
  "GROVE","GROWN","GUARD","GUESS","GUEST","GUIDE","GUILD","GUILT","GUISE","GULCH",
  "GULLY","HABIT","HAPPY","HARDY","HARSH","HASTE","HAUNT","HAVEN","HEART","HEAVY",
  "HEDGE","HEIST","HELLO","HENCE","HERBS","HILLY","HINGE","HOBBY","HOMER","HONEY",
  "HONOR","HORSE","HOTEL","HOUSE","HUMAN","HUMOR","HURRY","HYPER","IDEAL","IMAGE",
  "IMPLY","INDEX","INDIE","INFRA","INNER","INPUT","INTER","INTRO","IRONY","IVORY",
  "JAPAN","JEWEL","JIMMY","JOINT","JOKER","JOLLY","JUDGE","JUICE","JUICY","JUMBO",
  "KEBAB","KNACK","KNEEL","KNIFE","KNOCK","KNOWN","LABEL","LABOR","LANCE","LARGE",
  "LASER","LATER","LAUGH","LAYER","LEARN","LEASE","LEAST","LEAVE","LEGAL","LEMON",
  "LEVEL","LIGHT","LIMIT","LINEN","LIVER","LOCAL","LOGIC","LOGIN","LONGE","LOOSE",
  "LOVER","LOWER","LOYAL","LUCKY","LUNCH","LYING","MAGIC","MAJOR","MAKER","MANOR",
  "MAPLE","MARCH","MATCH","MAYOR","MEDAL","MEDIA","MERCY","MERGE","MERIT","METAL",
  "METER","MIGHT","MINER","MINOR","MINUS","MODEL","MONEY","MONTH","MORAL","MOTEL",
  "MOTOR","MOUND","MOUNT","MOURN","MOUSE","MOUTH","MOVED","MOVER","MOVIE","MUDDY",
  "MUSIC","NAIVE","NASTY","NAVAL","NERVE","NEVER","NEWLY","NIGHT","NOBLE","NOISE",
  "NORTH","NOTED","NOVEL","NURSE","NYLON","OASIS","OCCUR","OCEAN","OFFER","OFTEN",
  "OLIVE","ONSET","OPERA","ORBIT","ORDER","OTHER","OUGHT","OUTER","OUTDO","OXIDE",
  "OZONE","PAINT","PANEL","PANIC","PAPER","PARTY","PASTA","PASTE","PATCH","PAUSE",
  "PEACE","PEACH","PEARL","PENNY","PERCH","PHASE","PHONE","PHOTO","PIANO","PIECE",
  "PILOT","PINCH","PIXEL","PIZZA","PLACE","PLAIN","PLANE","PLANT","PLATE","PLAZA",
  "PLEAD","PLUCK","PLUMB","PLUMP","PLUNGE","POINT","POLAR","POKER","POLKA","POPPY",
  "PORCH","POSER","POUND","POWER","PRESS","PRICE","PRIDE","PRIME","PRINCE","PRINT",
  "PRIOR","PRIZE","PROBE","PROOF","PROUD","PROVE","PROXY","PSALM","PULSE","PUNCH",
  "PUPIL","PURGE","PURSE","PUZZL","QUALM","QUEEN","QUERY","QUEST","QUEUE","QUICK",
  "QUIET","QUILT","QUIRK","QUOTA","QUOTE","RADAR","RADIO","RAISE","RALLY","RANGE",
  "RAPID","RATIO","REACH","REACT","READY","REALM","REBEL","REFER","REIGN","RELAX",
  "RELAY","RENAL","RENEW","REPAY","REPLY","RIDER","RIDGE","RIFLE","RIGHT","RIGID",
  "RISKY","RIVAL","RIVER","ROBIN","ROBOT","ROCKY","ROGER","ROMAN","ROOST","ROUTE",
  "ROYAL","RUGBY","RULER","RUMOR","RURAL","RUSTY","SADLY","SAINT","SALAD","SALON",
  "SANDY","SAUCE","SCALE","SCARE","SCENE","SCENT","SCOPE","SCORE","SCOUT","SCRAP",
  "SERVE","SETUP","SEVEN","SHADE","SHAKE","SHALL","SHAME","SHAPE","SHARE","SHARK",
  "SHARP","SHAVE","SHEET","SHELF","SHELL","SHIFT","SHIRE","SHIRT","SHOCK","SHORE",
  "SHORT","SHOUT","SHOWN","SIGHT","SIGMA","SILLY","SINCE","SIXTH","SIXTY","SIZED",
  "SKILL","SKULL","SLASH","SLATE","SLAVE","SLEEP","SLICE","SLIDE","SLOPE","SMALL",
  "SMART","SMELL","SMILE","SMOKE","SNAKE","SOLAR","SOLID","SOLVE","SORRY","SOUND",
  "SOUTH","SPACE","SPARE","SPARK","SPEAK","SPEED","SPELL","SPEND","SPENT","SPICE",
  "SPINE","SPOKE","SPOON","SPORT","SPRAY","SQUAD","STACK","STAFF","STAGE","STAIN",
  "STAKE","STALE","STALL","STAMP","STAND","STARK","START","STATE","STEAL","STEAM",
  "STEEL","STEEP","STEER","STERN","STICK","STIFF","STILL","STOCK","STOMP","STONE",
  "STOOD","STORE","STORM","STORY","STOVE","STRAP","STRAW","STRAY","STRIP","STUCK",
  "STUFF","STUMP","STYLE","SUGAR","SUITE","SUNNY","SUPER","SURGE","SWAMP","SWEAR",
  "SWEAT","SWEEP","SWEET","SWEPT","SWIFT","SWING","SWIRL","SWORD","SWORE","SWORN",
  "TABLE","TASTE","TEACH","TEETH","TEMPO","TENSE","TENTH","THEME","THICK","THIEF",
  "THING","THINK","THIRD","THORN","THOSE","THREE","THREW","THROW","THUMB","TIGHT",
  "TIMER","TIRED","TITLE","TODAY","TOKEN","TOPIC","TOTAL","TOUCH","TOUGH","TOWER",
  "TOXIC","TRACE","TRACK","TRADE","TRAIL","TRAIN","TRAIT","TRASH","TREAT","TREND",
  "TRIAL","TRIBE","TRICK","TRIED","TROOP","TRUCK","TRULY","TRUMP","TRUNK","TRUST",
  "TRUTH","TUMOR","TUNER","TWICE","TWIST","TYING","ULTRA","UNCLE","UNDER","UNFIT",
  "UNION","UNITE","UNITY","UNTIL","UPPER","URBAN","USAGE","USUAL","UTTER","VAGUE",
  "VALID","VALUE","VAPOR","VAULT","VENUE","VERSE","VIDEO","VIGOR","VINYL","VIOLA",
  "VIRAL","VISIT","VITAL","VIVID","VOCAL","VODKA","VOICE","VOTER","VOWEL","WAIST",
  "WASTE","WATCH","WATER","WEARY","WEAVE","WEDGE","WEIRD","WHALE","WHEAT","WHEEL",
  "WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WIDTH","WITCH","WOMAN","WOMEN",
  "WORLD","WORRY","WORSE","WORST","WORTH","WOULD","WOUND","WRATH","WRIST","WRITE",
  "WRONG","WROTE","YACHT","YIELD","YOUNG","YOUTH","ZEBRA"
];

// Filter to exactly 5-letter words
const VALID_WORDS = WORDS.filter(w => w.length === 5);

const ROWS = 6;
const COLS = 5;

type CellState = "empty" | "correct" | "present" | "absent";

interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[];
}

const KEYS_LAYOUT = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["ENTER", ..."ZXCVBNM".split(""), "⌫"],
];

function getDefaultStats(): Stats {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0] };
}

function loadStats(): Stats {
  if (typeof window === "undefined") return getDefaultStats();
  try {
    const raw = localStorage.getItem("wordguess-stats");
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultStats();
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem("wordguess-stats", JSON.stringify(stats));
  } catch {}
}

function evaluateGuess(guess: string, target: string): CellState[] {
  const result: CellState[] = Array(COLS).fill("absent");
  const targetCounts: Record<string, number> = {};

  // First pass: find correct (green) letters
  for (let i = 0; i < COLS; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
    } else {
      targetCounts[target[i]] = (targetCounts[target[i]] || 0) + 1;
    }
  }

  // Second pass: find present (yellow) letters
  for (let i = 0; i < COLS; i++) {
    if (result[i] === "correct") continue;
    if (targetCounts[guess[i]] && targetCounts[guess[i]] > 0) {
      result[i] = "present";
      targetCounts[guess[i]]--;
    }
  }

  return result;
}

export default function WordGuess() {
  const [target, setTarget] = useState(() => VALID_WORDS[Math.floor(Math.random() * VALID_WORDS.length)]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<CellState[][]>([]);
  const [current, setCurrent] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [revealedCols, setRevealedCols] = useState(0);
  const [stats, setStats] = useState<Stats>(getDefaultStats);
  const [showStats, setShowStats] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRevealing = revealingRow >= 0;
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats on mount
  useEffect(() => {
    setStats(loadStats());
  }, []);

  const showMessage = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => setMessage(""), duration);
    }
  }, []);

  const finishGame = useCallback((didWin: boolean, numGuesses: number) => {
    setGameOver(true);
    setWon(didWin);

    const newStats = { ...loadStats() };
    newStats.played++;
    if (didWin) {
      newStats.wins++;
      newStats.currentStreak++;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
      newStats.distribution[numGuesses - 1]++;
      const msgs = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Good!"];
      showMessage(msgs[numGuesses - 1] || "Good!", 0);
    } else {
      newStats.currentStreak = 0;
      showMessage(target, 0);
    }

    saveStats(newStats);
    setStats(newStats);

    setTimeout(() => setShowStats(true), 1800);
  }, [target, showMessage]);

  const revealRow = useCallback((rowIdx: number, guess: string, evaluation: CellState[], cb: () => void) => {
    setRevealingRow(rowIdx);
    setRevealedCols(0);

    for (let c = 0; c <= COLS; c++) {
      setTimeout(() => {
        if (c < COLS) {
          setRevealedCols(c + 1);
        } else {
          setRevealingRow(-1);
          setRevealedCols(0);
          cb();
        }
      }, c * 300);
    }
  }, []);

  const submit = useCallback(() => {
    if (current.length !== COLS || gameOver || isRevealing) return;

    const guess = current;
    const evaluation = evaluateGuess(guess, target);
    const newGuesses = [...guesses, guess];
    const newEvals = [...evaluations, evaluation];

    setGuesses(newGuesses);
    setEvaluations(newEvals);
    setCurrent("");

    revealRow(newGuesses.length - 1, guess, evaluation, () => {
      if (guess === target) {
        finishGame(true, newGuesses.length);
      } else if (newGuesses.length >= ROWS) {
        finishGame(false, newGuesses.length);
      }
    });
  }, [current, gameOver, isRevealing, target, guesses, evaluations, revealRow, finishGame]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || isRevealing) return;

    if (key === "ENTER") {
      if (current.length < COLS) {
        showMessage("Not enough letters", 1500);
        setShakeRow(guesses.length);
        setTimeout(() => setShakeRow(-1), 600);
        return;
      }
      submit();
      return;
    }

    if (key === "⌫" || key === "BACKSPACE") {
      setCurrent(c => c.slice(0, -1));
      return;
    }

    if (/^[A-Z]$/.test(key) && current.length < COLS) {
      setCurrent(c => c + key);
    }
  }, [gameOver, isRevealing, current, submit, guesses.length, showMessage]);

  // Physical keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  // Compute keyboard letter states
  const keyStates = useCallback((): Record<string, CellState> => {
    const map: Record<string, CellState> = {};
    for (let r = 0; r < evaluations.length; r++) {
      // Don't color keys for rows still revealing
      if (r === revealingRow) continue;
      const guess = guesses[r];
      const eval_ = evaluations[r];
      for (let c = 0; c < COLS; c++) {
        const letter = guess[c];
        const state = eval_[c];
        const existing = map[letter];
        if (state === "correct") {
          map[letter] = "correct";
        } else if (state === "present" && existing !== "correct") {
          map[letter] = "present";
        } else if (state === "absent" && !existing) {
          map[letter] = "absent";
        }
      }
    }
    return map;
  }, [guesses, evaluations, revealingRow]);

  const newGame = () => {
    setTarget(VALID_WORDS[Math.floor(Math.random() * VALID_WORDS.length)]);
    setGuesses([]);
    setEvaluations([]);
    setCurrent("");
    setGameOver(false);
    setWon(false);
    setMessage("");
    setShowStats(false);
    setRevealingRow(-1);
    setRevealedCols(0);
    setCopied(false);
  };

  const shareResult = () => {
    const emojiMap: Record<CellState, string> = {
      correct: "🟩",
      present: "🟨",
      absent: "⬛",
      empty: "⬛",
    };
    const rows = evaluations.map(row => row.map(c => emojiMap[c]).join("")).join("\n");
    const text = `Word Guess ${won ? guesses.length : "X"}/${ROWS}\n\n${rows}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const kStates = keyStates();
  const winPct = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxDist = Math.max(...stats.distribution, 1);

  // ─── Colors ───
  const COLORS: Record<CellState, string> = {
    empty: "transparent",
    correct: "#538d4e",
    present: "#b59f3b",
    absent: "#3a3a3c",
  };

  const TILE_BORDER: Record<CellState, string> = {
    empty: "#3a3a3c",
    correct: "#538d4e",
    present: "#b59f3b",
    absent: "#3a3a3c",
  };

  // ─── Keyframes (injected once) ───
  useEffect(() => {
    const id = "wordguess-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes wg-flip {
        0% { transform: scaleY(1); }
        50% { transform: scaleY(0); }
        100% { transform: scaleY(1); }
      }
      @keyframes wg-shake {
        0%, 100% { transform: translateX(0); }
        10%, 50%, 90% { transform: translateX(-4px); }
        30%, 70% { transform: translateX(4px); }
      }
      @keyframes wg-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
      @keyframes wg-pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100%",
      background: "#0a0a1a",
      padding: "16px 8px",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      position: "relative",
      userSelect: "none",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        maxWidth: 360,
        marginBottom: 8,
        borderBottom: "1px solid #3a3a3c",
        paddingBottom: 8,
      }}>
        <div style={{ width: 40 }} />
        <h1 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 800,
          color: "#fff",
          letterSpacing: 2,
          textTransform: "uppercase",
        }}>Word Guess</h1>
        <button
          onClick={() => setShowStats(true)}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
          }}
          title="Statistics"
        >
          📊
        </button>
      </div>

      {/* Toast Message */}
      {message && (
        <div style={{
          position: "absolute",
          top: 70,
          zIndex: 100,
          background: "#fff",
          color: "#0a0a1a",
          padding: "12px 24px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 15,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          {message}
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        marginTop: 16,
        marginBottom: 20,
      }}>
        {Array.from({ length: ROWS }, (_, ri) => {
          const guess = guesses[ri];
          const eval_ = evaluations[ri];
          const isCurrent = ri === guesses.length && !gameOver;
          const isShaking = ri === shakeRow;
          const isThisRowRevealing = ri === revealingRow;
          const isWinRow = won && ri === guesses.length - 1 && !isThisRowRevealing;

          return (
            <div
              key={ri}
              style={{
                display: "flex",
                gap: 5,
                justifyContent: "center",
                animation: isShaking ? "wg-shake 0.6s ease" : undefined,
              }}
            >
              {Array.from({ length: COLS }, (_, ci) => {
                const letter = guess ? guess[ci] : isCurrent ? (current[ci] || "") : "";
                const hasLetter = letter !== "";

                let bgColor = "transparent";
                let borderColor = hasLetter && !guess ? "#565758" : "#3a3a3c";

                if (guess && eval_) {
                  if (isThisRowRevealing) {
                    if (ci < revealedCols) {
                      bgColor = COLORS[eval_[ci]];
                      borderColor = TILE_BORDER[eval_[ci]];
                    }
                  } else {
                    bgColor = COLORS[eval_[ci]];
                    borderColor = TILE_BORDER[eval_[ci]];
                  }
                }

                const isFlipping = isThisRowRevealing && ci < revealedCols && ci === revealedCols - 1;
                const wasRevealed = isThisRowRevealing && ci < revealedCols - 1;
                const justTyped = isCurrent && ci === current.length - 1;

                let animation = "";
                if (isFlipping) animation = "wg-flip 0.5s ease";
                if (isWinRow) animation = `wg-bounce 0.4s ease ${ci * 0.1}s`;
                if (justTyped) animation = "wg-pop 0.1s ease";

                return (
                  <div
                    key={ci}
                    style={{
                      width: 56,
                      height: 56,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#fff",
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      boxSizing: "border-box",
                      animation: animation || undefined,
                      transition: (wasRevealed || (!isThisRowRevealing && guess))
                        ? "background 0.1s, border-color 0.1s"
                        : undefined,
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On-screen Keyboard */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
        width: "100%",
        maxWidth: 500,
      }}>
        {KEYS_LAYOUT.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 5, justifyContent: "center", width: "100%" }}>
            {ri === 2 && <div style={{ flex: 0.5 }} />}
            {row.map(k => {
              const isLetter = k.length === 1;
              const state = isLetter ? (kStates[k] || "empty") : "empty";
              const isWide = k === "ENTER" || k === "⌫";

              let bg = "#818384";
              if (state === "correct") bg = COLORS.correct;
              else if (state === "present") bg = COLORS.present;
              else if (state === "absent") bg = "#3a3a3c";

              return (
                <button
                  key={k}
                  onClick={() => handleKey(k)}
                  style={{
                    flex: isWide ? 1.5 : 1,
                    height: 52,
                    borderRadius: 4,
                    border: "none",
                    background: bg,
                    color: "#fff",
                    fontSize: isLetter ? 16 : 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textTransform: "uppercase",
                    padding: 0,
                    minWidth: 0,
                    transition: "background 0.2s",
                  }}
                >
                  {k}
                </button>
              );
            })}
            {ri === 2 && <div style={{ flex: 0.5 }} />}
          </div>
        ))}
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setShowStats(false)}
        >
          <div
            style={{
              background: "#1a1a2e",
              borderRadius: 12,
              padding: "28px 32px",
              maxWidth: 380,
              width: "90%",
              color: "#fff",
              position: "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowStats(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 16,
                background: "none",
                border: "none",
                color: "#aaa",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            <h2 style={{ textAlign: "center", margin: "0 0 20px", fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>
              Statistics
            </h2>

            {/* Summary Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24 }}>
              {[
                { value: stats.played, label: "Played" },
                { value: winPct, label: "Win %" },
                { value: stats.currentStreak, label: "Current\nStreak" },
                { value: stats.maxStreak, label: "Max\nStreak" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 4, whiteSpace: "pre-line" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Guess Distribution */}
            <h3 style={{ textAlign: "center", margin: "0 0 12px", fontSize: 14, letterSpacing: 1, textTransform: "uppercase", color: "#ccc" }}>
              Guess Distribution
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
              {stats.distribution.map((count, i) => {
                const isLastGuess = won && guesses.length === i + 1;
                const width = Math.max(8, (count / maxDist) * 100);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, width: 12, textAlign: "right" }}>{i + 1}</span>
                    <div style={{
                      width: `${width}%`,
                      background: isLastGuess ? "#538d4e" : "#3a3a3c",
                      padding: "2px 8px",
                      borderRadius: 3,
                      textAlign: "right",
                      fontSize: 13,
                      fontWeight: 700,
                      minWidth: 24,
                    }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            {gameOver && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={shareResult}
                  style={{
                    background: "#538d4e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 24px",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {copied ? "Copied!" : "Share"}
                  {!copied && <span style={{ fontSize: 18 }}>📋</span>}
                </button>
                <button
                  onClick={newGame}
                  style={{
                    background: "#3a3a3c",
                    color: "#fff",
                    border: "1px solid #565758",
                    borderRadius: 8,
                    padding: "12px 24px",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  New Game
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
