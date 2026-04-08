"use client";
import { useState, useCallback, useMemo } from "react";

const LETTER_VALUES: Record<string, number> = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 };

const DICTIONARY = new Set([
  "CAT","DOG","BAT","RAT","HAT","SAT","MAT","FAT","RUN","SUN","FUN","GUN","BUN","THE","AND","FOR","ARE","BUT","NOT","YOU","ALL","CAN","HER","WAS","ONE","OUR","OUT","DAY","GET","HAS","HIM","HIS","HOW","ITS","LET","MAY","NEW","NOW","OLD","SEE","WAY","WHO","BOY","DID","SET","TOP","RED","BIG","END","FAR","TRY","ASK","MEN","READ","CODE","GAME","PLAY","WORD","FIRE","LAND","HOME","HAND","HIGH","LONG","MAKE","MANY","SOME","TIME","VERY","COME","FIND","GIVE","GOOD","HAVE","JUST","KNOW","LIKE","LIVE","LOOK","LOVE","MUCH","MUST","NAME","ONLY","PART","TAKE","TELL","THAN","THEM","THEN","THIS","TURN","WANT","WELL","WORK","YEAR",
  "ABLE","ALSO","AREA","ARMY","AWAY","BACK","BALL","BAND","BANK","BASE","BATH","BEAR","BEAT","BEEN","BEER","BELL","BEST","BILL","BIRD","BITE","BLOW","BLUE","BOAT","BODY","BOMB","BOND","BONE","BOOK","BOOT","BORN","BOSS","BOTH","BURN","BUSY","CAFE","CAKE","CALL","CALM","CAME","CAMP","CARD","CARE","CASE","CASH","CAST","CELL","CHAT","CHIP","CITY","CLAD","CLAM","CLAN","CLAP","CLAW","CLAY","CLIP","CLUB","CLUE","COAT","COIN","COLD","COME","COOK","COOL","COPE","COPY","CORD","CORE","CORN","COST","COUP","CREW","CROP","CROW","CURE","CUTE","DALE","DAME","DAMN","DAMP","DARE","DARK","DASH","DATA","DATE","DAWN","DEAD","DEAF","DEAL","DEAR","DEBT","DEED","DEEM","DEEP","DEER","DEMO","DENY","DESK","DIAL","DICE","DIET","DIRT","DISH","DISK","DOCK","DOES","DOME","DONE","DOOM","DOOR","DOSE","DOWN","DRAG","DRAW","DREW","DROP","DRUG","DRUM","DUAL","DULL","DUMB","DUMP","DUNE","DUST","DUTY","EACH","EARL","EARN","EASE","EAST","EASY","EDGE","EDIT","ELSE","EPIC","EURO","EVEN","EVER","EVIL","EXAM","FACE","FACT","FADE","FAIL","FAIR","FAKE","FALL","FAME","FANG","FARM","FAST","FATE","FEAR","FEAT","FEED","FEEL","FELL","FELT","FILE","FILL","FILM","FIND","FINE","FIRE","FIRM","FISH","FIST","FLAG","FLAN","FLAP","FLAT","FLAW","FLED","FLEW","FLIP","FLOCK","FLOW","FOAM","FOIL","FOLD","FOLK","FOND","FONT","FOOD","FOOL","FOOT","FORD","FORE","FORK","FORM","FORT","FOUL","FOUR","FREE","FROM","FUEL","FULL","FUND","FURY","FUSE","FUSS","GAIN","GALE","GANG","GATE","GAVE","GAZE","GEAR","GENE","GIFT","GIRL","GLAD","GLOW","GLUE","GOAT","GOES","GOLD","GOLF","GONE","GRAB","GRAM","GRAY","GREW","GREY","GRID","GRIM","GRIN","GRIP","GROW","GULF","GURU","GUST","GUYS","HACK","HAIL","HAIR","HALF","HALL","HALT","HANG","HARD","HARM","HARP","HATE","HAUL","HEAD","HEAL","HEAP","HEAR","HEAT","HEEL","HELD","HELL","HELP","HERB","HERE","HERO","HIDE","HILL","HINT","HIRE","HOLD","HOLE","HOLY","HOOK","HOPE","HORN","HOST","HOUR","HUGE","HULL","HUNG","HUNT","HURT","HYMN","ICON","IDEA","INCH","INFO","INTO","IRON","ISLE","ITEM","JACK","JAIL","JAZZ","JEAN","JERK","JEST","JOBS","JOIN","JOKE","JUMP","JUNE","JURY","KEEN","KEEP","KEPT","KICK","KIDS","KILL","KIND","KING","KISS","KNEE","KNEW","KNIT","KNOB","KNOT","KNOW","LACE","LACK","LADS","LADY","LAID","LAKE","LAMP","LANE","LARK","LAST","LATE","LAWN","LEAD","LEAF","LEAN","LEAP","LEFT","LEND","LENS","LESS","LIAR","LICK","LIFT","LIKE","LIMB","LIME","LIMP","LINE","LINK","LION","LIST","LIVE","LOAD","LOAN","LOCK","LOFT","LONE","LONG","LOOP","LORD","LOSE","LOSS","LOST","LOTS","LUCK","LUMP","LUNG","LURE","LURK","LUSH","MACE","MADE","MAID","MAIL","MAIN","MALE","MALL","MALT","MANE","MANY","MARE","MARK","MARS","MASH","MASK","MASS","MAST","MATE","MAZE","MEAL","MEAN","MEAT","MEET","MELT","MEMO","MEND","MENU","MERE","MESH","MESS","MICE","MILD","MILE","MILK","MILL","MIME","MIND","MINE","MINT","MISS","MIST","MODE","MOLD","MOOD","MOON","MORE","MOSS","MOST","MOTH","MOVE","MUCH","MULE","MUSE","MUST","MYTH","NAIL","NAVY","NEAR","NEAT","NECK","NEED","NEST","NEWS","NEXT","NICE","NINE","NODE","NONE","NOON","NORM","NOSE","NOTE","NOUN","NUDE","NULL","NUTS","OATH","OBEY","ODDS","OKAY","OMEN","ONCE","ONLY","ONTO","OPAL","OPEN","ORAL","OVEN","OVER","OWED","OWNS","PACE","PACK","PAGE","PAID","PAIN","PAIR","PALE","PALM","PANE","PARK","PASS","PAST","PATH","PEAK","PEAR","PECK","PEEL","PEER","PILE","PILL","PINE","PINK","PIPE","PITY","PLAN","PLAY","PLEA","PLOT","PLOY","PLUG","PLUM","PLUS","POEM","POET","POLE","POLL","POLO","POND","POOL","POOR","POPE","PORK","PORT","POSE","POST","POUR","PRAY","PREY","PROP","PULL","PUMP","PURE","PUSH","QUIT","RACE","RACK","RAGE","RAID","RAIL","RAIN","RANK","RARE","RASH","RATE","READ","REAL","REAP","REAR","REEF","REIN","RELY","RENT","REST","RICE","RICH","RIDE","RIFT","RING","RIOT","RISE","RISK","ROAD","ROAM","ROBE","ROCK","RODE","ROLE","ROLL","ROOF","ROOM","ROOT","ROPE","ROSE","RUIN","RULE","RUSH","RUST","RUTH","SACK","SAFE","SAGA","SAGE","SAID","SAKE","SALE","SALT","SAME","SAND","SANE","SANG","SANK","SAVE","SCAR","SEAL","SEAM","SEAT","SECT","SEED","SEEK","SEEM","SEEN","SELF","SELL","SEMI","SEND","SENT","SHED","SHIP","SHOP","SHOT","SHOW","SHUT","SICK","SIDE","SIGH","SIGN","SILK","SING","SINK","SITE","SIZE","SLAM","SLAP","SLEW","SLID","SLIM","SLIP","SLOT","SLOW","SNAP","SNOW","SOAK","SOAR","SOCK","SOFA","SOFT","SOIL","SOLD","SOLE","SOME","SONG","SOON","SORT","SOUL","SOUR","SPAN","SPAR","SPEC","SPED","SPIN","SPIT","SPOT","SPUR","STAB","STAR","STAY","STEM","STEP","STEW","STIR","STOP","STUB","STUD","SUCH","SUCK","SUIT","SUNG","SUNK","SURE","SURF","SWAN","SWAP","SWIM","SWOP","TABS","TACK","TACT","TAIL","TALE","TALK","TALL","TAME","TANK","TAPE","TAPS","TASK","TAXI","TEAM","TEEM","TELL","TEND","TENT","TERM","TEST","TEXT","THEE","THEM","THEY","THIN","THUS","TICK","TIDE","TIDY","TIED","TIES","TILL","TILT","TINY","TIPS","TIRE","TOAD","TOED","TOES","TOIL","TOLD","TOLL","TOMB","TONE","TONS","TOOK","TOOL","TOPS","TORE","TORN","TOSS","TOUR","TOWN","TRAP","TRAY","TREE","TREK","TRIM","TRIO","TRIP","TROT","TRUE","TUBE","TUCK","TUNA","TUNE","TURF","TWIN","TYPE","UGLY","UNDO","UNIT","UNTO","UPON","URGE","USED","USER","VAIN","VALE","VARY","VASE","VAST","VEIL","VEIN","VENT","VERB","VERY","VEST","VICE","VIEW","VINE","VISA","VOID","VOLT","VOTE","WADE","WAGE","WAIF","WAIT","WAKE","WALK","WALL","WAND","WANT","WARD","WARM","WARN","WARP","WARS","WARY","WASH","WAVE","WEAK","WEAR","WEBS","WEED","WEEK","WELD","WELL","WENT","WERE","WEST","WHAT","WHEN","WHOM","WICK","WIDE","WIFE","WILD","WILL","WILT","WILY","WIND","WINE","WING","WIPE","WIRE","WISE","WISH","WITH","WITS","WOKE","WOLF","WOMB","WOOD","WOOL","WORE","WORM","WORN","WOVE","WRAP","YARD","YAWN","YEAR","YOUR","ZEAL","ZERO","ZINC","ZONE","ZOOM",
  "ABOUT","ABOVE","ABUSE","ADMIT","ADOPT","AFTER","AGAIN","AGENT","AGREE","AHEAD","ALARM","ALIEN","ALIGN","ALIVE","ALLOW","ALONE","ALONG","ALTER","AMONG","ANGEL","ANGER","ANGLE","ANGRY","APART","APPLE","APPLY","ARENA","ARGUE","ARISE","ASIDE","AVOID","AWARD","AWARE","BADLY","BASED","BASIC","BEACH","BEGIN","BEING","BELOW","BLACK","BLADE","BLAME","BLAST","BLAZE","BLEED","BLEND","BLESS","BLIND","BLOCK","BLOOD","BLOOM","BLOWN","BOARD","BOOST","BOUND","BRAIN","BRAND","BRAVE","BREAD","BREAK","BREED","BRICK","BRIEF","BRING","BROAD","BROKE","BROWN","BRUSH","BUILD","BUNCH","BURST","BUYER","CABIN","CAMEL","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHARM","CHART","CHASE","CHEAP","CHECK","CHEEK","CHEST","CHIEF","CHILD","CHINA","CLAIM","CLASS","CLEAN","CLEAR","CLIMB","CLING","CLOCK","CLONE","CLOSE","CLOUD","COACH","COAST","COLOR","COMIC","CORAL","COUCH","COULD","COUNT","COURT","COVER","CRACK","CRAFT","CRASH","CRAZY","CREAM","CRIME","CROSS","CROWD","CROWN","CRUEL","CRUSH","CURVE","CYCLE","DAILY","DANCE","DEATH","DEBUT","DELAY","DEPTH","DIRTY","DOUBT","DRAFT","DRAIN","DRAMA","DRANK","DREAM","DRESS","DRIFT","DRINK","DRIVE","DROVE","EAGER","EARLY","EARTH","EIGHT","ELECT","ELITE","EMPTY","ENEMY","ENJOY","ENTER","EQUAL","ERROR","EVENT","EVERY","EXACT","EXIST","EXTRA","FAITH","FALSE","FANCY","FATAL","FAULT","FEAST","FEVER","FIBER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLAME","FLASH","FLESH","FLOAT","FLOOD","FLOOR","FLOUR","FLUID","FLUSH","FOCUS","FORCE","FOUND","FRAME","FRANK","FRAUD","FRESH","FRONT","FROST","FRUIT","FULLY","GIANT","GIVEN","GLASS","GLOBE","GLORY","GOING","GRACE","GRADE","GRAIN","GRAND","GRANT","GRASS","GRAVE","GREAT","GREEN","GREET","GRIEF","GROSS","GROUP","GROWN","GUARD","GUESS","GUEST","GUIDE","GUILT","HAPPY","HARSH","HEART","HEAVY","HELLO","HENCE","HOBBY","HONEY","HONOR","HORSE","HOTEL","HOUSE","HUMAN","HUMOR","HURRY","IDEAL","IMAGE","IMPLY","INDEX","INDIE","INNER","INPUT","ISSUE","IVORY","JEWEL","JOINT","JUDGE","JUICE","KNIFE","KNOCK","KNOWN","LABEL","LARGE","LASER","LATER","LAUGH","LAYER","LEARN","LEAST","LEAVE","LEGAL","LEVEL","LIGHT","LIMIT","LINEN","LIVER","LOCAL","LOGIC","LOOSE","LOVER","LOWER","LOYAL","LUCKY","LUNCH","LUNAR","LYRIC","MAGIC","MAJOR","MAKER","MANOR","MAPLE","MARCH","MATCH","MAYOR","MEDIA","MERCY","METAL","MIGHT","MINOR","MINUS","MODEL","MONEY","MONTH","MORAL","MOTOR","MOUNT","MOUSE","MOUTH","MOVED","MOVIE","MUSIC","NAKED","NERVE","NEVER","NEWLY","NIGHT","NOBLE","NOISE","NORTH","NOTED","NOVEL","NURSE","OCCUR","OCEAN","OFFER","OFTEN","ORDER","OTHER","OUTER","OWING","OWNER","PAINT","PANEL","PANIC","PAPER","PATCH","PAUSE","PEACE","PEACH","PEARL","PENNY","PHASE","PHONE","PHOTO","PIANO","PIECE","PILOT","PITCH","PIXEL","PLACE","PLAIN","PLANE","PLANT","PLATE","PLAZA","PLEAD","PLUCK","PLUMB","POINT","POLAR","PORCH","POSER","POUND","POWER","PRESS","PRICE","PRIDE","PRIME","PRINT","PRIOR","PROBE","PROOF","PROUD","PROVE","PSALM","PUNCH","PUPIL","QUEEN","QUEST","QUEUE","QUICK","QUIET","QUITE","QUOTA","QUOTE","RADAR","RADIO","RALLY","RANCH","RANGE","RAPID","RATIO","REACH","REACT","REALM","REBEL","REFER","REIGN","RELAX","REPLY","RIGHT","RIGID","RISKY","RIVAL","RIVER","ROBIN","ROBOT","ROCKY","ROMAN","ROUGH","ROUND","ROUTE","ROYAL","RUGBY","RULER","RURAL","SADLY","SAINT","SALAD","SAUCE","SCALE","SCARE","SCENE","SCOPE","SCORE","SENSE","SERVE","SETUP","SEVEN","SHALL","SHAME","SHAPE","SHARE","SHARP","SHEER","SHELF","SHELL","SHIFT","SHINE","SHIRT","SHOCK","SHOOT","SHORT","SHOUT","SIGHT","SINCE","SIXTH","SIXTY","SIZED","SKILL","SKULL","SLASH","SLAVE","SLEEP","SLICE","SLIDE","SLOPE","SMALL","SMART","SMELL","SMILE","SMOKE","SOLAR","SOLID","SOLVE","SORRY","SOUND","SOUTH","SPACE","SPARE","SPEAK","SPEED","SPELL","SPEND","SPICE","SPINE","SPLIT","SPOKE","SPOON","SPORT","SPRAY","SQUAD","STACK","STAFF","STAGE","STAIR","STAKE","STALE","STALL","STAMP","STAND","STARK","START","STATE","STAVE","STEAL","STEAM","STEEL","STEEP","STEER","STERN","STICK","STILL","STOCK","STONE","STOOD","STORE","STORM","STORY","STOUT","STOVE","STRAP","STRAW","STRIP","STUCK","STUDY","STUFF","STYLE","SUGAR","SUITE","SUNNY","SUPER","SURGE","SWEAR","SWEEP","SWEET","SWIFT","SWING","SWORD","TABLE","TASTE","TEACH","TEETH","TEMPO","THANK","THEME","THERE","THICK","THIEF","THING","THINK","THIRD","THOSE","THREE","THREW","THROW","THUMB","TIGER","TIGHT","TIMER","TIRED","TITLE","TODAY","TOKEN","TOTAL","TOUCH","TOUGH","TOWEL","TOWER","TRACE","TRACK","TRADE","TRAIL","TRAIN","TRAIT","TRASH","TREAT","TREND","TRIAL","TRIBE","TRICK","TROOP","TRUCK","TRULY","TRUMP","TRUNK","TRUST","TRUTH","TUMOR","TWICE","TWIST","ULTRA","UNDER","UNION","UNITE","UNITY","UNTIL","UPPER","UPSET","URBAN","USAGE","USUAL","UTTER","VALID","VALUE","VIDEO","VIGOR","VIRUS","VISIT","VITAL","VIVID","VOCAL","VOICE","VOTER","WAGER","WAGON","WASTE","WATCH","WATER","WEAVE","WEDGE","WEIGH","WEIRD","WHALE","WHEAT","WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WIDOW","WIDTH","WOMAN","WOMEN","WORLD","WORRY","WORSE","WORST","WORTH","WOULD","WOUND","WRITE","WRONG","WROTE","YIELD","YOUNG","YOUTH",
]);

const TILE_POOL = "AAABCDDEEEEEFGHHIIIJKLLLMNNOOOPQRRRSSSTTTUUVWXYZ";

type Cell = { letter: string; owner: "player" | "bot" | null; premium: "none" | "2L" | "3L" | "2W" | "3W" };

const PREMIUM_MAP: Record<string, "2L" | "3L" | "2W" | "3W"> = {
  "0,0": "3W", "0,6": "3W", "6,0": "3W", "6,6": "3W", "3,3": "2W",
  "1,1": "2L", "1,5": "2L", "5,1": "2L", "5,5": "2L",
  "2,2": "3L", "2,4": "3L", "4,2": "3L", "4,4": "3L",
  "0,3": "2W", "3,0": "2W", "3,6": "2W", "6,3": "2W",
};

function drawTiles(count: number): string[] {
  const tiles: string[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push(TILE_POOL[Math.floor(Math.random() * TILE_POOL.length)]);
  }
  return tiles;
}

function scoreWord(word: string, positions: [number, number][], board: Cell[][]): number {
  let total = 0;
  let wordMult = 1;
  for (let i = 0; i < word.length; i++) {
    const [r, c] = positions[i];
    let lv = LETTER_VALUES[word[i]] || 1;
    const prem = board[r][c].premium;
    if (prem === "2L") lv *= 2;
    else if (prem === "3L") lv *= 3;
    else if (prem === "2W") wordMult *= 2;
    else if (prem === "3W") wordMult *= 3;
    total += lv;
  }
  return total * wordMult;
}

function initBoard(): Cell[][] {
  return Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => ({
      letter: "",
      owner: null,
      premium: PREMIUM_MAP[`${r},${c}`] || "none",
    }))
  );
}

export default function WordBoard() {
  const [board, setBoard] = useState<Cell[][]>(initBoard);
  const [playerTiles, setPlayerTiles] = useState<string[]>(drawTiles(7));
  const [botTiles, setBotTiles] = useState<string[]>(drawTiles(7));
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [message, setMessage] = useState("Place tiles on the board to form words");
  const [placedThisTurn, setPlacedThisTurn] = useState<{ row: number; col: number; tileIdx: number }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [turnCount, setTurnCount] = useState(0);

  const placeTile = (row: number, col: number) => {
    if (turn !== "player" || selectedTile === null || board[row][col].letter || gameOver) return;
    const letter = playerTiles[selectedTile];
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    newBoard[row][col] = { ...newBoard[row][col], letter, owner: "player" };
    setBoard(newBoard);
    setPlacedThisTurn(prev => [...prev, { row, col, tileIdx: selectedTile }]);
    const newTiles = [...playerTiles];
    newTiles[selectedTile] = "";
    setPlayerTiles(newTiles);
    setSelectedTile(null);
  };

  const undoPlace = () => {
    if (placedThisTurn.length === 0) return;
    const last = placedThisTurn[placedThisTurn.length - 1];
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    const letter = newBoard[last.row][last.col].letter;
    newBoard[last.row][last.col].letter = "";
    newBoard[last.row][last.col].owner = null;
    setBoard(newBoard);
    const newTiles = [...playerTiles];
    newTiles[last.tileIdx] = letter;
    setPlayerTiles(newTiles);
    setPlacedThisTurn(prev => prev.slice(0, -1));
  };

  const findWordsOnBoard = useCallback((b: Cell[][]): { word: string; positions: [number, number][]; }[] => {
    const found: { word: string; positions: [number, number][] }[] = [];
    // Horizontal
    for (let r = 0; r < 7; r++) {
      let word = "", positions: [number, number][] = [];
      for (let c = 0; c < 7; c++) {
        if (b[r][c].letter) {
          word += b[r][c].letter;
          positions.push([r, c]);
        } else {
          if (word.length >= 2 && DICTIONARY.has(word)) found.push({ word, positions: [...positions] });
          word = ""; positions = [];
        }
      }
      if (word.length >= 2 && DICTIONARY.has(word)) found.push({ word, positions });
    }
    // Vertical
    for (let c = 0; c < 7; c++) {
      let word = "", positions: [number, number][] = [];
      for (let r = 0; r < 7; r++) {
        if (b[r][c].letter) {
          word += b[r][c].letter;
          positions.push([r, c]);
        } else {
          if (word.length >= 2 && DICTIONARY.has(word)) found.push({ word, positions: [...positions] });
          word = ""; positions = [];
        }
      }
      if (word.length >= 2 && DICTIONARY.has(word)) found.push({ word, positions });
    }
    return found;
  }, []);

  const submitTurn = () => {
    if (placedThisTurn.length === 0) { setMessage("Place at least one tile!"); return; }
    const words = findWordsOnBoard(board);
    if (words.length === 0) {
      setMessage("No valid words formed! Undo and try again.");
      return;
    }
    let pts = 0;
    const wordNames: string[] = [];
    words.forEach(w => {
      const s = scoreWord(w.word, w.positions, board);
      pts += s;
      wordNames.push(`${w.word}(${s})`);
    });
    setPlayerScore(prev => prev + pts);
    setMessage(`+${pts} pts: ${wordNames.join(", ")}`);

    // Refill tiles
    const newTiles = playerTiles.map(t => t || TILE_POOL[Math.floor(Math.random() * TILE_POOL.length)]);
    setPlayerTiles(newTiles);
    setPlacedThisTurn([]);
    setTurnCount(tc => tc + 1);

    // Bot turn
    setTurn("bot");
    setTimeout(() => botPlay(), 1000);
  };

  const botPlay = useCallback(() => {
    const b = board.map(r => r.map(c => ({ ...c })));
    const tiles = [...botTiles];
    let bestScore = 0;
    let bestPlacement: { row: number; col: number; letter: string; tileIdx: number }[] = [];

    // Simple bot: try placing single tiles and 2-tile combos
    for (let ti = 0; ti < tiles.length; ti++) {
      if (!tiles[ti]) continue;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (b[r][c].letter) continue;
          b[r][c].letter = tiles[ti];
          b[r][c].owner = "bot";
          const words = findWordsOnBoard(b);
          let sc = 0;
          words.forEach(w => { sc += scoreWord(w.word, w.positions, b); });
          if (sc > bestScore) {
            bestScore = sc;
            bestPlacement = [{ row: r, col: c, letter: tiles[ti], tileIdx: ti }];
          }
          // Try adding second tile
          for (let ti2 = 0; ti2 < tiles.length; ti2++) {
            if (ti2 === ti || !tiles[ti2]) continue;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
                const r2 = r + dr, c2 = c + dc;
                if (r2 < 0 || r2 >= 7 || c2 < 0 || c2 >= 7 || b[r2][c2].letter) continue;
                b[r2][c2].letter = tiles[ti2];
                b[r2][c2].owner = "bot";
                const words2 = findWordsOnBoard(b);
                let sc2 = 0;
                words2.forEach(w => { sc2 += scoreWord(w.word, w.positions, b); });
                if (sc2 > bestScore) {
                  bestScore = sc2;
                  bestPlacement = [{ row: r, col: c, letter: tiles[ti], tileIdx: ti }, { row: r2, col: c2, letter: tiles[ti2], tileIdx: ti2 }];
                }
                b[r2][c2].letter = "";
                b[r2][c2].owner = null;
              }
            }
          }
          b[r][c].letter = "";
          b[r][c].owner = null;
        }
      }
    }

    if (bestScore > 0) {
      const newBoard = board.map(r => r.map(c => ({ ...c })));
      const newTiles = [...botTiles];
      bestPlacement.forEach(p => {
        newBoard[p.row][p.col] = { ...newBoard[p.row][p.col], letter: p.letter, owner: "bot" };
        newTiles[p.tileIdx] = "";
      });
      setBoard(newBoard);
      setBotScore(prev => prev + bestScore);
      setMessage(`Bot scored +${bestScore} pts`);
      setBotTiles(newTiles.map(t => t || TILE_POOL[Math.floor(Math.random() * TILE_POOL.length)]));
    } else {
      // Pass — swap tiles
      setBotTiles(drawTiles(7));
      setMessage("Bot passed (no valid moves)");
    }
    setTurnCount(tc => tc + 1);
    setTurn("player");
    if (turnCount >= 20) setGameOver(true);
  }, [board, botTiles, findWordsOnBoard, turnCount]);

  const passTurn = () => {
    setPlacedThisTurn([]);
    // Undo any placed tiles
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    placedThisTurn.forEach(p => {
      newBoard[p.row][p.col].letter = "";
      newBoard[p.row][p.col].owner = null;
    });
    const newTiles = [...playerTiles];
    placedThisTurn.forEach(p => {
      newTiles[p.tileIdx] = board[p.row][p.col].letter;
    });
    setBoard(newBoard);
    setPlayerTiles(drawTiles(7));
    setMessage("Passed — new tiles drawn");
    setTurn("bot");
    setTimeout(() => botPlay(), 800);
  };

  const premiumColors: Record<string, string> = { "2L": "#4ecdc433", "3L": "#4ecdc466", "2W": "#ff6b6b33", "3W": "#ff6b6b66", "none": "transparent" };
  const premiumLabels: Record<string, string> = { "2L": "2xL", "3L": "3xL", "2W": "2xW", "3W": "3xW", "none": "" };

  if (gameOver) {
    const winner = playerScore > botScore ? "You win!" : botScore > playerScore ? "Bot wins!" : "Tie!";
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0" }}>
        <h2 style={{ color: "#ffd700", fontSize: "28px", marginBottom: "16px" }}>Game Over</h2>
        <p style={{ fontSize: "20px", color: "#4ecdc4" }}>You: {playerScore} | Bot: {botScore}</p>
        <p style={{ fontSize: "22px", color: "#ffd700", fontWeight: 700, margin: "12px 0" }}>{winner}</p>
        <button onClick={() => { setBoard(initBoard()); setPlayerTiles(drawTiles(7)); setBotTiles(drawTiles(7)); setPlayerScore(0); setBotScore(0); setTurn("player"); setTurnCount(0); setGameOver(false); setMessage("Place tiles to form words"); setPlacedThisTurn([]); }} style={{ padding: "12px 36px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>New Game</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px" }}>
      <h1 style={{ color: "#ffd700", fontSize: "24px", margin: "0 0 8px" }}>Word Board</h1>

      {/* Scores */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
        <div style={{ textAlign: "center", padding: "4px 16px", borderRadius: "8px", background: turn === "player" ? "#4ecdc422" : "transparent" }}>
          <div style={{ fontSize: "11px", color: "#4ecdc4" }}>You</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{playerScore}</div>
        </div>
        <div style={{ textAlign: "center", padding: "4px 16px", borderRadius: "8px", background: turn === "bot" ? "#ff6b6b22" : "transparent" }}>
          <div style={{ fontSize: "11px", color: "#ff6b6b" }}>Bot</div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{botScore}</div>
        </div>
      </div>

      {/* Message */}
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px", textAlign: "center", minHeight: "16px" }}>{message}</div>

      {/* Board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 42px)", gap: "2px", marginBottom: "14px" }}>
        {board.map((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} onClick={() => placeTile(r, c)} style={{
            width: "42px", height: "42px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: cell.letter ? (cell.owner === "player" ? "#1a3a3a" : cell.owner === "bot" ? "#3a1a1a" : "#1a1a3a") : premiumColors[cell.premium] || "#111133",
            border: `1px solid ${cell.letter ? "#444" : "#222"}`, borderRadius: "4px",
            cursor: turn === "player" && !cell.letter && selectedTile !== null ? "pointer" : "default",
            fontSize: cell.letter ? "16px" : "8px", fontWeight: cell.letter ? 700 : 400,
            color: cell.letter ? "#fff" : "#555", position: "relative",
          }}>
            {cell.letter || premiumLabels[cell.premium]}
            {cell.letter && <span style={{ position: "absolute", bottom: "1px", right: "3px", fontSize: "8px", color: "#888" }}>{LETTER_VALUES[cell.letter]}</span>}
          </div>
        )))}
      </div>

      {/* Player tiles */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", textAlign: "center" }}>Your Tiles (click to select, then click board)</div>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
          {playerTiles.map((t, i) => (
            <div key={i} onClick={() => t && turn === "player" && setSelectedTile(i)} style={{
              width: "38px", height: "38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: selectedTile === i ? "#ffd700" : t ? "#1a1a3a" : "#0a0a1a",
              color: selectedTile === i ? "#0a0a1a" : "#e0e0e0",
              border: `2px solid ${selectedTile === i ? "#ffd700" : t ? "#333" : "#111"}`,
              borderRadius: "6px", cursor: t && turn === "player" ? "pointer" : "default",
              fontSize: "16px", fontWeight: 700,
            }}>
              {t}
              {t && <span style={{ fontSize: "8px", color: selectedTile === i ? "#0a0a1a88" : "#666" }}>{LETTER_VALUES[t]}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={submitTurn} disabled={turn !== "player" || placedThisTurn.length === 0} style={{ padding: "8px 20px", background: turn === "player" && placedThisTurn.length > 0 ? "#4ecdc4" : "#333", color: "#0a0a1a", border: "none", borderRadius: "15px", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Submit</button>
        <button onClick={undoPlace} disabled={placedThisTurn.length === 0} style={{ padding: "8px 16px", background: "#1a1a3a", color: "#ccc", border: "1px solid #333", borderRadius: "15px", cursor: "pointer", fontSize: "12px" }}>Undo</button>
        <button onClick={passTurn} disabled={turn !== "player"} style={{ padding: "8px 16px", background: "#1a1a3a", color: "#ccc", border: "1px solid #333", borderRadius: "15px", cursor: "pointer", fontSize: "12px" }}>Pass</button>
      </div>

      <div style={{ marginTop: "12px", fontSize: "10px", color: "#444" }}>Turn {turnCount + 1}/20 | {turn === "player" ? "Your turn" : "Bot thinking..."}</div>
    </div>
  );
}
