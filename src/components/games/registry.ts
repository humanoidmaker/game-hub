export interface GameInfo {
  slug: string;
  name: string;
  icon: string;
  description: string;
  category: "Board" | "Card" | "Puzzle" | "Arcade" | "Sports" | "Party" | "Strategy" | "Music" | "Idle";
  file: string; // component file name without .tsx
}

export const GAMES: GameInfo[] = [
  // Board
  { slug: "chess", name: "Chess", icon: "♚", description: "Classic chess vs AI opponent", category: "Board", file: "Chess" },
  { slug: "checkers", name: "Checkers", icon: "⛀", description: "Draughts with AI opponent", category: "Board", file: "Checkers" },
  { slug: "ludo", name: "Ludo", icon: "🎲", description: "Classic board game with dice", category: "Board", file: "Ludo" },
  { slug: "snakes-and-ladders", name: "Snakes & Ladders", icon: "🐍", description: "Roll dice, climb ladders, avoid snakes", category: "Board", file: "SnakesAndLadders" },
  { slug: "carrom", name: "Carrom", icon: "🎯", description: "Physics-based carrom board", category: "Board", file: "Carrom" },
  { slug: "connect-four", name: "Connect Four", icon: "🔴", description: "Drop discs, connect 4 to win", category: "Board", file: "ConnectFour" },
  { slug: "tic-tac-toe", name: "Tic Tac Toe", icon: "✖", description: "X and O with AI levels", category: "Board", file: "TicTacToe" },
  { slug: "battleship", name: "Battleship", icon: "🚢", description: "Sink the enemy fleet", category: "Board", file: "Battleship" },
  { slug: "othello", name: "Othello", icon: "⚫", description: "Flip discs to dominate the board", category: "Board", file: "Othello" },
  { slug: "dots-and-boxes", name: "Dots & Boxes", icon: "⬜", description: "Connect dots, claim boxes", category: "Board", file: "DotsAndBoxes" },
  { slug: "mancala", name: "Mancala", icon: "🥜", description: "Sow seeds, capture stones", category: "Board", file: "Mancala" },
  { slug: "tower-defense", name: "Tower Defense", icon: "🏰", description: "Build towers, stop the waves", category: "Strategy", file: "TowerDefense" },
  { slug: "dungeon-crawler", name: "Dungeon Crawler", icon: "🗡", description: "Explore roguelike dungeons", category: "Strategy", file: "DungeonCrawler" },
  { slug: "farm-sim", name: "Farm Simulator", icon: "🌾", description: "Plant, grow, harvest crops", category: "Idle", file: "FarmSim" },
  { slug: "lemonade-stand", name: "Lemonade Stand", icon: "🍋", description: "Buy, make, sell lemonade", category: "Idle", file: "LemonadeStand" },

  // Card
  { slug: "solitaire", name: "Solitaire", icon: "🃏", description: "Klondike solitaire card game", category: "Card", file: "Solitaire" },
  { slug: "memory-match", name: "Memory Match", icon: "🧠", description: "Flip cards to find emoji pairs", category: "Card", file: "MemoryMatch" },
  { slug: "blackjack", name: "Blackjack", icon: "🃏", description: "Beat the dealer to 21", category: "Card", file: "Blackjack" },
  { slug: "poker", name: "Poker", icon: "🃏", description: "Texas Hold'em vs bot", category: "Card", file: "Poker" },
  { slug: "color-cards", name: "Color Cards", icon: "🎴", description: "Match colors and numbers vs bot", category: "Card", file: "ColorCards" },
  { slug: "three-cards", name: "Three Cards", icon: "🎴", description: "Indian 3-card game vs bot", category: "Card", file: "ThreeCards" },
  { slug: "card-war", name: "Card War", icon: "⚔", description: "Highest card wins the pile", category: "Card", file: "CardWar" },
  { slug: "slot-machine", name: "Slot Machine", icon: "🎰", description: "Spin reels, match symbols", category: "Card", file: "SlotMachine" },
  { slug: "roulette", name: "Roulette", icon: "🔴", description: "Bet on colors and numbers", category: "Card", file: "Roulette" },

  // Puzzle
  { slug: "sudoku", name: "Sudoku", icon: "🔢", description: "Number puzzle, 3 difficulty levels", category: "Puzzle", file: "Sudoku" },
  { slug: "minesweeper", name: "Minesweeper", icon: "💣", description: "Clear mines without detonating", category: "Puzzle", file: "Minesweeper" },
  { slug: "jigsaw-puzzle", name: "Jigsaw Puzzle", icon: "🧩", description: "Tile-swapping puzzle", category: "Puzzle", file: "JigsawPuzzle" },
  { slug: "word-search", name: "Word Search", icon: "🔤", description: "Find hidden words in grid", category: "Puzzle", file: "Crossword" },
  { slug: "sliding-puzzle", name: "Sliding Puzzle", icon: "🔲", description: "Classic 15-puzzle tile slider", category: "Puzzle", file: "SlidingPuzzle" },
  { slug: "tower-of-hanoi", name: "Tower of Hanoi", icon: "🏛", description: "Move disk tower between pegs", category: "Puzzle", file: "TowerOfHanoi" },
  { slug: "block-stack", name: "Block Stack", icon: "🟦", description: "Stack blocks, clear lines", category: "Puzzle", file: "BlockStack" },
  { slug: "2048", name: "2048", icon: "💯", description: "Slide tiles, merge to 2048", category: "Puzzle", file: "Game2048" },
  { slug: "word-guess", name: "Word Guess", icon: "🟩", description: "Guess the 5-letter word in 6 tries", category: "Puzzle", file: "WordGuess" },
  { slug: "pipe-mania", name: "Pipe Mania", icon: "🚰", description: "Connect pipes from start to end", category: "Puzzle", file: "PipeMania" },
  { slug: "maze-runner", name: "Maze Runner", icon: "🏁", description: "Navigate random mazes", category: "Puzzle", file: "MazeRunner" },
  { slug: "water-sort", name: "Water Sort", icon: "💧", description: "Sort colors into tubes", category: "Puzzle", file: "WaterSort" },
  { slug: "ball-sort", name: "Ball Sort", icon: "⚽", description: "Sort colored balls into tubes", category: "Puzzle", file: "BallSort" },
  { slug: "nonogram", name: "Nonogram", icon: "🖼", description: "Grid logic picture puzzle", category: "Puzzle", file: "Nonogram" },
  { slug: "lights-out", name: "Lights Out", icon: "💡", description: "Toggle all lights off", category: "Puzzle", file: "LightsOut" },
  { slug: "sokoban", name: "Sokoban", icon: "📦", description: "Push boxes to targets", category: "Puzzle", file: "Sokoban" },
  { slug: "rush-hour", name: "Rush Hour", icon: "🚗", description: "Slide cars to free the exit", category: "Puzzle", file: "RushHour" },
  { slug: "flow-free", name: "Flow Free", icon: "🌐", description: "Connect matching colored dots", category: "Puzzle", file: "FlowFree" },
  { slug: "candy-match", name: "Candy Match", icon: "🍬", description: "Match 3 candies to clear", category: "Puzzle", file: "CandyMatch" },
  { slug: "fruit-merge", name: "Fruit Merge", icon: "🍉", description: "Drop and merge same fruits", category: "Puzzle", file: "FruitMerge" },
  { slug: "merge-numbers", name: "Merge Numbers", icon: "🔢", description: "Merge adjacent same numbers", category: "Puzzle", file: "MergeNumbers" },
  { slug: "math-challenge", name: "Math Challenge", icon: "📊", description: "Solve equations fast", category: "Puzzle", file: "MathChallenge" },

  // Arcade
  { slug: "snake", name: "Snake", icon: "🐍", description: "Classic Nokia snake game", category: "Arcade", file: "Snake" },
  { slug: "tap-fly", name: "Tap Fly", icon: "🐦", description: "Tap to fly through pipes", category: "Arcade", file: "TapFly" },
  { slug: "block-breaker", name: "Block Breaker", icon: "🧱", description: "Break blocks with ball & paddle", category: "Arcade", file: "BlockBreaker" },
  { slug: "galaxy-defense", name: "Galaxy Defense", icon: "👾", description: "Shoot alien invaders", category: "Arcade", file: "GalaxyDefense" },
  { slug: "slice-master", name: "Slice Master", icon: "🍉", description: "Slice flying fruits", category: "Arcade", file: "SliceMaster" },
  { slug: "endless-runner", name: "Endless Runner", icon: "🏃", description: "Jump and duck, run forever", category: "Arcade", file: "EndlessRunner" },
  { slug: "maze-chomper", name: "Maze Chomper", icon: "🟡", description: "Eat dots, avoid ghosts", category: "Arcade", file: "MazeChomper" },
  { slug: "paddle-rally", name: "Paddle Rally", icon: "🏓", description: "Classic table tennis vs bot", category: "Arcade", file: "PaddleRally" },
  { slug: "whack-a-mole", name: "Whack-a-Mole", icon: "🐹", description: "Whack moles before they hide", category: "Arcade", file: "WhackAMole" },
  { slug: "bubble-shooter", name: "Bubble Shooter", icon: "🔴", description: "Match 3+ bubbles to pop", category: "Arcade", file: "BubbleShooter" },
  { slug: "color-switch", name: "Color Switch", icon: "🌈", description: "Match your color through obstacles", category: "Arcade", file: "ColorSwitch" },
  { slug: "stack-tower", name: "Stack Tower", icon: "🏗", description: "Stack blocks perfectly", category: "Arcade", file: "StackTower" },
  { slug: "knife-hit", name: "Knife Hit", icon: "🔪", description: "Throw knives into spinning log", category: "Arcade", file: "KnifeHit" },
  { slug: "piano-tiles", name: "Piano Tiles", icon: "🎹", description: "Tap the black tiles fast", category: "Arcade", file: "PianoTiles" },
  { slug: "cookie-clicker", name: "Cookie Clicker", icon: "🍪", description: "Click cookies, buy upgrades", category: "Arcade", file: "CookieClicker" },
  { slug: "car-racing", name: "Car Racing", icon: "🏎", description: "Dodge traffic on the highway", category: "Arcade", file: "CarRacing" },
  { slug: "asteroid-shooter", name: "Asteroids", icon: "☄", description: "Destroy asteroids in space", category: "Arcade", file: "AsteroidShooter" },
  { slug: "sky-hop", name: "Sky Hop", icon: "💨", description: "Jump higher and higher", category: "Arcade", file: "SkyHop" },
  { slug: "spiral-drop", name: "Spiral Drop", icon: "🌀", description: "Ball drops through spiral", category: "Arcade", file: "SpiralDrop" },
  { slug: "rhythm-dash", name: "Rhythm Dash", icon: "◼", description: "Jump over spikes and gaps", category: "Arcade", file: "RhythmDash" },
  { slug: "pinball", name: "Pinball", icon: "🎱", description: "Flipper pinball with bumpers", category: "Arcade", file: "Pinball" },
  { slug: "sling-shot", name: "Sling Shot", icon: "🐦", description: "Launch birds at targets", category: "Arcade", file: "SlingShot" },
  { slug: "road-hopper", name: "Road Hopper", icon: "🐸", description: "Cross roads and rivers safely", category: "Arcade", file: "RoadHopper" },
  { slug: "star-striker", name: "Star Striker", icon: "🚀", description: "Shoot diving alien ships", category: "Arcade", file: "StarStriker" },
  { slug: "crossy-run", name: "Crossy Run", icon: "🚶", description: "Cross roads and rivers", category: "Arcade", file: "CrossyRun" },
  { slug: "bug-blaster", name: "Bug Blaster", icon: "🐛", description: "Shoot the centipede segments", category: "Arcade", file: "BugBlaster" },
  { slug: "barrel-climb", name: "Barrel Climb", icon: "🦸", description: "Climb ladders, dodge barrels", category: "Arcade", file: "BarrelClimb" },
  { slug: "neon-trail", name: "Neon Trail", icon: "⚡", description: "Don't crash into light trails", category: "Arcade", file: "NeonTrail" },
  { slug: "balloon-pop", name: "Balloon Pop", icon: "🎈", description: "Pop balloons before they fly away", category: "Arcade", file: "BalloonPop" },
  { slug: "mining-idle", name: "Mining Idle", icon: "⛏", description: "Mine resources and upgrade", category: "Idle", file: "MiningIdle" },
  { slug: "zombie-survival", name: "Zombie Survival", icon: "🧟", description: "Survive waves of zombies", category: "Arcade", file: "ZombieSurvival" },
  { slug: "space-race", name: "Space Race", icon: "🛸", description: "Dodge asteroids in space", category: "Arcade", file: "SpaceRace" },
  { slug: "color-road", name: "Color Road", icon: "🌈", description: "Match your color on the road", category: "Arcade", file: "ColorRoad" },
  { slug: "bike-racing", name: "Bike Racing", icon: "🚲", description: "Side-scroll bike with ramps", category: "Arcade", file: "BikeRacing" },
  { slug: "paper-toss", name: "Paper Toss", icon: "📄", description: "Throw paper into the bin", category: "Arcade", file: "PaperToss" },
  { slug: "fishing-game", name: "Fishing Game", icon: "🎣", description: "Cast, wait, reel — catch fish", category: "Arcade", file: "FishingGame" },
  { slug: "boxing", name: "Boxing", icon: "🥊", description: "Jab, hook, uppercut — KO the bot", category: "Arcade", file: "Boxing" },

  // Sports
  { slug: "penalty-shootout", name: "Penalty Shootout", icon: "⚽", description: "Score goals past the keeper", category: "Sports", file: "PenaltyShootout" },
  { slug: "basketball", name: "Basketball", icon: "🏀", description: "Free throw shooting game", category: "Sports", file: "BasketballFreeThrow" },
  { slug: "bowling", name: "Bowling", icon: "🎳", description: "Knock down all 10 pins", category: "Sports", file: "Bowling" },
  { slug: "cricket", name: "Cricket", icon: "🏏", description: "Bat timing game — score runs", category: "Sports", file: "Cricket" },
  { slug: "archery", name: "Archery", icon: "🏹", description: "Charge and shoot at the target", category: "Sports", file: "Archery" },
  { slug: "golf-putting", name: "Golf Putting", icon: "⛳", description: "Putt the ball into the hole", category: "Sports", file: "GolfPutting" },
  { slug: "darts", name: "Darts", icon: "🎯", description: "301 game — hit the bullseye", category: "Sports", file: "Darts" },
  { slug: "flick-football", name: "Flick Football", icon: "⚽", description: "Shoot past the goalkeeper", category: "Sports", file: "FlickFootball" },
  { slug: "tambola", name: "Tambola", icon: "🎰", description: "Indian Housie / Bingo", category: "Party", file: "Tambola" },

  // Party
  { slug: "draw-guess", name: "Draw & Guess", icon: "🎨", description: "Draw and guess words", category: "Party", file: "DrawGuess" },
  { slug: "trivia-battle", name: "Trivia Battle", icon: "❓", description: "2-player quiz battle", category: "Party", file: "TriviaBattle" },
  { slug: "rock-paper-scissors", name: "Rock Paper Scissors", icon: "✊", description: "Best of 5 vs bot", category: "Party", file: "RockPaperScissors" },
  { slug: "color-recall", name: "Color Recall", icon: "🟢", description: "Memory pattern game", category: "Party", file: "ColorRecall" },
  { slug: "hangman", name: "Hangman", icon: "👤", description: "Guess the word letter by letter", category: "Party", file: "Hangman" },
  { slug: "anagram", name: "Anagram", icon: "🔠", description: "Rearrange letters into words", category: "Party", file: "Anagram" },
  { slug: "word-board", name: "Word Board", icon: "📝", description: "Form words from letter rack", category: "Party", file: "WordBoard" },
  { slug: "spelling-bee", name: "Spelling Bee", icon: "🐝", description: "Unscramble tech words", category: "Party", file: "SpellingBee" },
  { slug: "would-you-rather", name: "Would You Rather", icon: "🤔", description: "Choose between two options", category: "Party", file: "WouldYouRather" },
  { slug: "truth-or-dare", name: "Truth or Dare", icon: "🔥", description: "Party game for 2-6 players", category: "Party", file: "TruthOrDare" },
  { slug: "charades", name: "Charades", icon: "🎭", description: "Act out words with timer", category: "Party", file: "Charades" },
  { slug: "never-have-i-ever", name: "Never Have I Ever", icon: "🎻", description: "Reveal secrets party game", category: "Party", file: "NeverHaveIEver" },
  { slug: "liars-dice", name: "Liar's Dice", icon: "🎲", description: "Bluff and call liars", category: "Party", file: "LiarsDice" },
  { slug: "geo-quiz", name: "Geography Quiz", icon: "🌍", description: "Guess flags and capitals", category: "Party", file: "GeoQuiz" },
  { slug: "typing-speed", name: "Typing Speed", icon: "⌨", description: "Test your WPM", category: "Party", file: "TypingTest" },
  { slug: "reaction-time-game", name: "Reaction Time", icon: "⚡", description: "Test your reflexes", category: "Party", file: "ReactionTime" },

  // Music
  { slug: "rhythm-keys", name: "Rhythm Keys", icon: "🎸", description: "Hit notes on the highway", category: "Music", file: "RhythmKeys" },
  { slug: "beat-catcher", name: "Beat Catcher", icon: "🎶", description: "Click falling beats to music", category: "Music", file: "BeatCatcher" },
  { slug: "music-memory", name: "Music Memory", icon: "🎹", description: "Repeat the melody sequence", category: "Music", file: "MusicMemory" },
];

export const GAME_CATEGORIES = [...new Set(GAMES.map(g => g.category))];
export const GAME_MAP = new Map(GAMES.map(g => [g.slug, g]));
