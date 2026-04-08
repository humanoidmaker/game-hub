export const GAME_INSTRUCTIONS: Record<string, { en: string; hi: string }> = {
  "chess": {
    en: "Move pieces to checkmate the opponent's king. Each piece moves differently: pawns forward, rooks straight, bishops diagonal, knights in L-shape, queen anywhere, king one step. Click a piece to select, then click where to move.",
    hi: "प्रतिद्वंद्वी के राजा को शह-मात दें। हर मोहरा अलग चलता है: प्यादा आगे, हाथी सीधा, ऊंट तिरछा, घोड़ा L-आकार में, रानी कहीं भी, राजा एक कदम। मोहरा चुनने के लिए click करें, फिर जहां चलना है वहां click करें।"
  },
  "checkers": {
    en: "Move your pieces diagonally forward to capture all opponent pieces. Jump over enemy pieces to capture them. Reach the opposite end to get a king that moves backward too. Click a piece, then click where to move.",
    hi: "अपने मोहरे तिरछे आगे बढ़ाकर सभी दुश्मन के मोहरे capture करें। दुश्मन के मोहरे के ऊपर से कूदकर उसे हटाएं। दूसरे छोर पर पहुंचकर king बनें जो पीछे भी चल सकता है। मोहरा click करें, फिर जहां चलना है वहां click करें।"
  },
  "ludo": {
    en: "Roll the dice and race your four tokens from start to home. Roll a 6 to bring a new token out. Land on an opponent to send them back to base. Click the dice to roll, then click a token to move it.",
    hi: "Dice roll करें और अपने चारों tokens को start से home तक पहुंचाएं। 6 आने पर नया token बाहर निकालें। दुश्मन के token पर पहुंचकर उसे वापस भेजें। Dice पर click करें, फिर token पर click करके चलाएं।"
  },
  "snakes-and-ladders": {
    en: "Roll the dice and move forward on the board. Land on a ladder to climb up, but watch out for snakes that slide you down. First player to reach 100 wins. Click the dice to roll.",
    hi: "Dice roll करें और board पर आगे बढ़ें। Ladder पर पहुंचे तो ऊपर चढ़ें, लेकिन सांप से बचें जो नीचे गिरा देता है। पहले 100 पर पहुंचने वाला जीतता है। Dice पर click करें।"
  },
  "carrom": {
    en: "Flick the striker to pocket your coins (white or black) and the red queen. Pocket the queen before your last coin and follow it with a cover shot. Click and drag to aim the striker, release to shoot.",
    hi: "Striker flick करके अपने coins (white या black) और red queen को pocket करें। Queen को अपने last coin से पहले pocket करें और cover shot लगाएं। Striker को click और drag करके aim करें, छोड़ें तो shoot होगा।"
  },
  "connect-four": {
    en: "Drop colored discs into a vertical grid, trying to connect four in a row horizontally, vertically, or diagonally. Block your opponent while building your line. Click a column to drop your disc.",
    hi: "Vertical grid में colored discs डालें और horizontal, vertical, या diagonal चार एक लाइन में जोड़ें। अपनी line बनाते हुए opponent को block करें। Column पर click करके disc डालें।"
  },
  "tic-tac-toe": {
    en: "Take turns placing X or O on a 3x3 grid. Get three in a row horizontally, vertically, or diagonally to win. Click any empty cell to place your mark.",
    hi: "बारी-बारी से 3x3 grid पर X या O लगाएं। Horizontal, vertical, या diagonal तीन एक लाइन में लाने वाला जीतता है। किसी भी खाली cell पर click करें।"
  },
  "battleship": {
    en: "Place your ships on the grid, then take turns guessing where the opponent's ships are hidden. Hit all parts of a ship to sink it. Click on the opponent's grid to fire a shot.",
    hi: "अपने ships grid पर रखें, फिर बारी-बारी से अंदाज़ा लगाएं कि opponent के ships कहां छुपे हैं। Ship के सभी हिस्सों पर hit करके उसे डुबोएं। Opponent के grid पर click करके shot fire करें।"
  },
  "othello": {
    en: "Place discs to flip your opponent's pieces by trapping them between your discs. The player with the most discs when the board is full wins. Click an empty cell adjacent to opponent's pieces to place your disc.",
    hi: "अपने discs के बीच opponent के pieces फंसाकर उन्हें flip करें। Board भरने पर जिसके सबसे ज़्यादा discs हों वो जीतता है। Opponent के pieces के बगल में खाली cell पर click करें।"
  },
  "dots-and-boxes": {
    en: "Take turns drawing lines between dots. Complete a box to claim it and get another turn. The player with the most boxes at the end wins. Click between two dots to draw a line.",
    hi: "बारी-बारी से dots के बीच lines बनाएं। Box complete करने पर वो आपका हो जाता है और एक और turn मिलता है। सबसे ज़्यादा boxes वाला जीतता है। दो dots के बीच click करके line बनाएं।"
  },
  "mancala": {
    en: "Pick up all stones from one of your pits and distribute them counter-clockwise, one per pit. Land in your store to get an extra turn. Capture opponent's stones by landing in an empty pit on your side. Click a pit to pick up its stones.",
    hi: "अपने किसी pit से सारे stones उठाएं और counter-clockwise एक-एक करके बांटें। अपने store में गिरने पर extra turn मिलता है। अपनी तरफ खाली pit में गिरकर opponent के stones capture करें। Pit पर click करें।"
  },
  "tower-defense": {
    en: "Place defensive towers along the path to stop waves of enemies from reaching your base. Earn coins from defeated enemies to buy more towers. Click on the map to place towers and upgrade them.",
    hi: "रास्ते पर defensive towers लगाकर दुश्मनों की waves को अपने base तक पहुंचने से रोकें। दुश्मनों को हराकर coins कमाएं और towers खरीदें। Map पर click करके towers लगाएं और upgrade करें।"
  },
  "dungeon-crawler": {
    en: "Explore a dungeon room by room, fighting monsters and collecting loot. Manage your health and abilities to survive deeper levels. Use arrow keys or WASD to move, click to attack enemies.",
    hi: "Dungeon को room by room explore करें, monsters से लड़ें और loot इकट्ठा करें। Health और abilities manage करके deeper levels तक पहुंचें। Arrow keys या WASD से चलें, enemies पर click करके attack करें।"
  },
  "farm-sim": {
    en: "Grow crops by planting seeds, watering them, and harvesting when ready. Sell produce to earn coins and expand your farm. Click plots to plant, water, and harvest your crops.",
    hi: "Seeds लगाकर, पानी देकर और तैयार होने पर harvest करके crops उगाएं। Produce बेचकर coins कमाएं और farm बढ़ाएं। Plots पर click करके plant, water, और harvest करें।"
  },
  "lemonade-stand": {
    en: "Run a lemonade business by setting prices, buying supplies, and adjusting your recipe based on weather. Maximize profits over multiple days. Click buttons to set your price, buy ingredients, and start the day.",
    hi: "Lemonade business चलाएं — price set करें, supplies खरीदें, और weather के हिसाब से recipe adjust करें। कई दिनों में ज़्यादा से ज़्यादा profit कमाएं। Buttons click करके price set करें और day शुरू करें।"
  },
  "solitaire": {
    en: "Arrange cards in descending order, alternating colors on the tableau. Move aces to foundations and build up by suit. Click and drag cards to move them between columns or to foundations.",
    hi: "Tableau पर cards को घटते क्रम में alternate colors में लगाएं। Aces को foundations पर रखें और suit के हिसाब से ऊपर बढ़ाएं। Cards को click और drag करके columns या foundations में move करें।"
  },
  "memory-match": {
    en: "Flip two cards at a time to find matching pairs. Remember card positions to make matches faster. Find all pairs to win. Click any face-down card to flip it.",
    hi: "एक बार में दो cards flip करके matching pairs खोजें। Card positions याद रखें ताकि जल्दी match हो। सभी pairs खोजकर जीतें। किसी भी उल्टे card पर click करके flip करें।"
  },
  "blackjack": {
    en: "Get cards totaling as close to 21 as possible without going over. Beat the dealer's hand to win. Face cards are 10, aces are 1 or 11. Click Hit for another card or Stand to hold.",
    hi: "Cards का total 21 के जितना करीब हो सके लाएं, पर ऊपर नहीं जाना चाहिए। Dealer को हराकर जीतें। Face cards 10 हैं, ace 1 या 11। Hit click करें नया card लेने के लिए या Stand click करें रुकने के लिए।"
  },
  "poker": {
    en: "Make the best five-card hand to win the pot. Bet, call, raise, or fold based on your hand strength. Best hand rankings: Royal Flush > Straight Flush > Four of a Kind and so on. Click buttons to bet, call, raise, or fold.",
    hi: "सबसे अच्छा five-card hand बनाकर pot जीतें। अपने hand की strength के हिसाब से bet, call, raise, या fold करें। Buttons click करके bet, call, raise, या fold करें।"
  },
  "color-cards": {
    en: "Match cards by color or number to discard your hand. Play special action cards to skip turns, reverse direction, or make opponents draw. Click a matching card to play it or draw from the deck.",
    hi: "Color या number match करके cards discard करें। Special cards से turns skip करें, direction reverse करें, या opponents को draw कराएं। Matching card click करके खेलें या deck से draw करें।"
  },
  "three-cards": {
    en: "Predict which of three face-down cards is the target after they are shuffled. Watch carefully as the cards move. Click the card you think is the right one after shuffling stops.",
    hi: "तीन उल्टे cards shuffle होने के बाद सही card पहचानें। Cards की movement ध्यान से देखें। Shuffle रुकने पर सही card पर click करें।"
  },
  "card-war": {
    en: "Both players flip a card simultaneously — the higher card wins the round. Win all cards to win the game. In a tie, go to war with extra cards. Click to flip your next card.",
    hi: "दोनों players एक साथ card flip करते हैं — बड़ा card round जीतता है। सारे cards जीतकर game जीतें। Tie होने पर extra cards से war होता है। अगला card flip करने के लिए click करें।"
  },
  "slot-machine": {
    en: "Spin the reels and match symbols to win coins. Three matching symbols in a row give the biggest payouts. Set your bet amount and click Spin to play.",
    hi: "Reels spin करें और symbols match करके coins जीतें। तीन matching symbols एक line में सबसे बड़ा payout देते हैं। Bet amount set करें और Spin click करें।"
  },
  "roulette": {
    en: "Place bets on where the ball will land on the spinning wheel. Bet on specific numbers, colors (red/black), or odd/even for different payouts. Click to place your chips, then click Spin.",
    hi: "Spinning wheel पर ball कहां गिरेगी, उस पर bet लगाएं। Specific numbers, colors (red/black), या odd/even पर bet करें। Chips place करने के लिए click करें, फिर Spin click करें।"
  },
  "sudoku": {
    en: "Fill the 9x9 grid so every row, column, and 3x3 box contains digits 1-9 without repeating. Use logic to deduce the correct numbers. Click an empty cell and type or select a number to fill it.",
    hi: "9x9 grid भरें ताकि हर row, column, और 3x3 box में 1-9 बिना repeat हुए आएं। Logic से सही numbers निकालें। खाली cell click करें और number type या select करें।"
  },
  "minesweeper": {
    en: "Uncover cells without hitting hidden mines. Numbers show how many mines are adjacent. Right-click to flag suspected mines. Left-click to reveal a cell.",
    hi: "Hidden mines से बचते हुए cells खोलें। Numbers बताते हैं कि बगल में कितनी mines हैं। Right-click से suspected mines पर flag लगाएं। Left-click से cell reveal करें।"
  },
  "jigsaw-puzzle": {
    en: "Drag and drop puzzle pieces to assemble the complete picture. Look for matching edges and colors to connect pieces. Click and drag pieces to move them into position.",
    hi: "Puzzle pieces को drag और drop करके पूरी picture बनाएं। Matching edges और colors देखकर pieces जोड़ें। Pieces को click और drag करके सही जगह लगाएं।"
  },
  "word-search": {
    en: "Find hidden words in the letter grid. Words can be horizontal, vertical, or diagonal, forward or backward. Click and drag across letters to select a word.",
    hi: "Letter grid में छुपे हुए words खोजें। Words horizontal, vertical, या diagonal हो सकते हैं, आगे या उल्टे। Letters पर click और drag करके word select करें।"
  },
  "sliding-puzzle": {
    en: "Slide numbered tiles into the correct order using the one empty space. Move tiles one at a time by clicking them to slide into the empty spot.",
    hi: "एक खाली space का use करके numbered tiles को सही order में लगाएं। Tiles को click करके खाली जगह में slide करें।"
  },
  "tower-of-hanoi": {
    en: "Move all discs from the first peg to the last peg. Only move one disc at a time and never place a larger disc on a smaller one. Click a peg to pick up its top disc, then click another peg to place it.",
    hi: "सभी discs को पहले peg से last peg पर ले जाएं। एक बार में एक disc हिलाएं और बड़ी disc छोटी पर न रखें। Peg click करके top disc उठाएं, फिर दूसरे peg पर click करके रखें।"
  },
  "block-stack": {
    en: "Stack blocks as high as possible by dropping them at the right moment. Misaligned portions get trimmed, making the next block smaller. Click or tap to drop the moving block.",
    hi: "सही समय पर blocks गिराकर जितना ऊंचा हो सके stack बनाएं। गलत alignment पर block कट जाता है और अगला block छोटा हो जाता है। Moving block गिराने के लिए click या tap करें।"
  },
  "2048": {
    en: "Slide numbered tiles on a 4x4 grid. When two tiles with the same number collide, they merge into one. Reach the 2048 tile to win. Use arrow keys to slide all tiles.",
    hi: "4x4 grid पर numbered tiles slide करें। एक जैसे number वाली दो tiles टकराने पर merge हो जाती हैं। 2048 tile बनाकर जीतें। Arrow keys से सभी tiles slide करें।"
  },
  "word-guess": {
    en: "Guess the hidden word letter by letter within a limited number of attempts. Green means correct position, yellow means wrong position, gray means not in the word. Type a letter or click the on-screen keyboard.",
    hi: "सीमित attempts में hidden word letter by letter guess करें। Green मतलब सही जगह, yellow मतलब गलत जगह, gray मतलब word में नहीं है। Letter type करें या on-screen keyboard click करें।"
  },
  "pipe-mania": {
    en: "Connect pipe pieces to create a path for water to flow from start to end before the timer runs out. Rotate and place pipes strategically. Click to place pipes and click placed pipes to rotate them.",
    hi: "Timer खत्म होने से पहले pipe pieces जोड़कर start से end तक पानी का रास्ता बनाएं। Pipes को strategically rotate और place करें। Click करके pipes लगाएं और rotate करें।"
  },
  "maze-runner": {
    en: "Navigate through a maze from start to finish as quickly as possible. Find the correct path while avoiding dead ends. Use arrow keys or WASD to move through the maze.",
    hi: "Maze में start से finish तक जितनी जल्दी हो सके पहुंचें। Dead ends से बचते हुए सही रास्ता खोजें। Arrow keys या WASD से maze में चलें।"
  },
  "water-sort": {
    en: "Sort colored water by pouring from one tube to another. You can only pour into a tube that has the same color on top or is empty. Click a tube to pick it up, then click another tube to pour.",
    hi: "एक tube से दूसरी tube में डालकर colored water sort करें। सिर्फ same color वाली या खाली tube में डाल सकते हैं। Tube click करके उठाएं, फिर दूसरी tube click करके डालें।"
  },
  "ball-sort": {
    en: "Sort colored balls by moving them between tubes. Only balls of the same color can stack together, and you can only move the top ball. Click a tube to pick up its top ball, then click another tube to place it.",
    hi: "Tubes के बीच balls move करके colored balls sort करें। सिर्फ same color की balls एक साथ stack हो सकती हैं, और सिर्फ top ball हिला सकते हैं। Tube click करके top ball उठाएं, फिर दूसरी tube पर click करें।"
  },
  "nonogram": {
    en: "Fill in grid cells based on number clues for each row and column. The numbers tell how many consecutive filled cells are in that line. Click a cell to fill it or right-click to mark it empty.",
    hi: "हर row और column के number clues के हिसाब से grid cells भरें। Numbers बताते हैं कि उस line में कितनी consecutive filled cells हैं। Cell click करके भरें या right-click करके empty mark करें।"
  },
  "lights-out": {
    en: "Turn off all the lights on the grid. Clicking a light toggles it and its neighbors on or off. Figure out the right combination of clicks to turn everything off. Click any light to toggle it and its adjacent lights.",
    hi: "Grid पर सारी lights बंद करें। एक light click करने पर वो और उसके neighbors toggle हो जाते हैं। सही combination of clicks निकालकर सब बंद करें। किसी भी light पर click करें।"
  },
  "sokoban": {
    en: "Push boxes onto target spots in a warehouse puzzle. You can only push, not pull, and only one box at a time. Plan your moves carefully. Use arrow keys to move and push boxes.",
    hi: "Warehouse puzzle में boxes को target spots पर push करें। सिर्फ push कर सकते हैं, pull नहीं, और एक बार में एक ही box। Moves ध्यान से plan करें। Arrow keys से चलें और boxes push करें।"
  },
  "rush-hour": {
    en: "Slide cars and trucks to clear a path for your red car to exit the parking lot. Vehicles can only move in their facing direction. Click and drag vehicles to slide them forward or backward.",
    hi: "Cars और trucks slide करके अपनी red car के लिए parking lot से बाहर निकलने का रास्ता बनाएं। Vehicles सिर्फ अपनी direction में चल सकते हैं। Vehicles को click और drag करके slide करें।"
  },
  "flow-free": {
    en: "Connect matching colored dots with pipes that fill the entire board. Pipes cannot cross or overlap. Draw a path by clicking a dot and dragging to its matching pair.",
    hi: "Matching colored dots को pipes से जोड़कर पूरा board भरें। Pipes cross या overlap नहीं हो सकती। Dot पर click करके matching pair तक drag करें।"
  },
  "candy-match": {
    en: "Swap adjacent candies to match three or more of the same color in a row or column. Matches clear and new candies fall in. Click a candy and drag it to swap with a neighbor.",
    hi: "Adjacent candies swap करके तीन या ज़्यादा same color एक row या column में match करें। Match होने पर clear हो जाते हैं और नए candies आ जाते हैं। Candy click करके neighbor से swap करें।"
  },
  "fruit-merge": {
    en: "Drop fruits into the container where same fruits merge into bigger ones. Keep merging to create the biggest fruit possible. Don't let the container overflow. Click to drop a fruit at that position.",
    hi: "Fruits container में गिराएं जहां same fruits merge होकर बड़े बनते हैं। Merge करते रहें और सबसे बड़ा fruit बनाएं। Container overflow न होने दें। Position पर click करके fruit गिराएं।"
  },
  "merge-numbers": {
    en: "Combine same-numbered tiles to create higher numbers. Drop tiles onto matching ones to merge them and keep building up. Click to drop a numbered tile into the grid.",
    hi: "Same number वाली tiles को combine करके बड़े numbers बनाएं। Matching tiles पर drop करके merge करें और बढ़ाते रहें। Grid में numbered tile drop करने के लिए click करें।"
  },
  "math-challenge": {
    en: "Solve math problems as fast as you can. Choose the correct answer from the options before time runs out. Problems get harder as you progress. Click the correct answer from the given choices.",
    hi: "जितनी जल्दी हो सके math problems solve करें। Time खत्म होने से पहले सही answer चुनें। आगे बढ़ने पर problems harder हो जाते हैं। दिए गए choices में से सही answer click करें।"
  },
  "snake": {
    en: "Guide the snake to eat food and grow longer. Don't crash into the walls or your own tail. The snake moves faster as it grows. Use arrow keys to change direction.",
    hi: "Snake को food खिलाकर बड़ा करें। दीवारों या अपनी tail से न टकराएं। बड़ा होने पर snake तेज़ हो जाता है। Arrow keys से direction बदलें।"
  },
  "tap-fly": {
    en: "Tap or click to make the bird fly upward. Release to let it fall. Navigate through gaps in obstacles without hitting them. Click or tap to flap and fly higher.",
    hi: "Click या tap करके bird को ऊपर उड़ाएं। छोड़ने पर नीचे गिरेगा। Obstacles के gaps से बिना टकराए निकलें। Click या tap करके flap करें और ऊपर उड़ें।"
  },
  "block-breaker": {
    en: "Bounce a ball off your paddle to break all the blocks above. Don't let the ball fall below your paddle. Move your paddle left and right using the mouse or arrow keys.",
    hi: "अपने paddle से ball bounce करके ऊपर के सारे blocks तोड़ें। Ball को paddle के नीचे गिरने न दें। Mouse या arrow keys से paddle left-right move करें।"
  },
  "galaxy-defense": {
    en: "Defend your spaceship from waves of alien invaders. Shoot them down before they reach you. Collect power-ups for stronger weapons. Use arrow keys to move and spacebar to shoot.",
    hi: "Alien invaders की waves से अपना spaceship बचाएं। उन्हें आप तक पहुंचने से पहले shoot करें। Power-ups collect करें। Arrow keys से move करें और spacebar से shoot करें।"
  },
  "slice-master": {
    en: "Slice through objects as they fly across the screen. Avoid slicing bombs or you lose points. Swipe or click and drag to slice objects in half.",
    hi: "Screen पर उड़ती objects को slice करें। Bombs slice करने से बचें वरना points कटेंगे। Swipe करें या click और drag करके objects slice करें।"
  },
  "endless-runner": {
    en: "Run endlessly while jumping over obstacles and collecting coins. The speed increases over time. Survive as long as you can for a high score. Click, tap, or press spacebar to jump.",
    hi: "लगातार दौड़ें, obstacles से कूदें और coins collect करें। Speed बढ़ती जाती है। High score के लिए जितनी देर हो सके टिकें। Click, tap, या spacebar से jump करें।"
  },
  "maze-chomper": {
    en: "Navigate through a maze eating all the dots while avoiding ghosts. Power pellets let you eat ghosts temporarily. Eat all dots to complete the level. Use arrow keys to move.",
    hi: "Maze में सारे dots खाएं और ghosts से बचें। Power pellets खाकर कुछ समय के लिए ghosts को खा सकते हैं। सारे dots खाकर level complete करें। Arrow keys से चलें।"
  },
  "paddle-rally": {
    en: "Keep the ball in play by bouncing it off your paddle. Score by getting the ball past your opponent's paddle. First to the target score wins. Move your paddle up and down with the mouse or arrow keys.",
    hi: "अपने paddle से ball bounce करके खेल में रखें। Ball opponent के paddle से निकालकर score करें। Target score पहले पहुंचने वाला जीतता है। Mouse या arrow keys से paddle ऊपर-नीचे करें।"
  },
  "whack-a-mole": {
    en: "Hit the moles as they pop up from their holes. Be quick — they disappear fast! Avoid hitting bombs. Click or tap on moles as soon as they appear.",
    hi: "Moles जैसे ही holes से बाहर आएं उन्हें मारें। जल्दी करें — वो तेज़ी से गायब हो जाते हैं! Bombs से बचें। Moles दिखते ही click या tap करें।"
  },
  "bubble-shooter": {
    en: "Aim and shoot colored bubbles to match three or more of the same color, making them pop. Clear all bubbles to win. Click to aim and release to shoot a bubble.",
    hi: "Colored bubbles aim करके shoot करें और तीन या ज़्यादा same color match करके pop करें। सारे bubbles clear करके जीतें। Aim करने के लिए click करें और shoot करने के लिए release करें।"
  },
  "color-switch": {
    en: "Navigate a ball through rotating color obstacles. You can only pass through sections matching your ball's current color. Collect switches to change your color. Tap or click to jump upward.",
    hi: "Ball को rotating color obstacles से गुज़ारें। सिर्फ अपने ball के color matching sections से गुज़र सकते हैं। Color बदलने के लिए switches collect करें। Jump करने के लिए tap या click करें।"
  },
  "stack-tower": {
    en: "Build the tallest tower by stacking blocks perfectly. Blocks swing back and forth — drop them at the right moment to align. Misaligned parts break off. Click or tap to drop each block.",
    hi: "Blocks को perfectly stack करके सबसे ऊंची tower बनाएं। Blocks आगे-पीछे swing होते हैं — सही moment पर गिराएं। Misaligned हिस्सा टूट जाता है। Block गिराने के लिए click या tap करें।"
  },
  "knife-hit": {
    en: "Throw knives at a rotating wooden target. Stick all your knives without hitting another knife already on the target. Hit apples for bonus points. Click or tap to throw a knife.",
    hi: "Rotating wooden target पर knives फेंकें। पहले से लगी knife पर hit किए बिना सारी knives चिपकाएं। Apples hit करने पर bonus points मिलते हैं। Knife फेंकने के लिए click या tap करें।"
  },
  "piano-tiles": {
    en: "Tap the black tiles as they scroll down. Don't tap the white tiles or miss any black ones. The tiles speed up as you progress. Click or tap only the black tiles.",
    hi: "Black tiles scroll होते हुए उन पर tap करें। White tiles पर tap न करें और कोई black tile miss न करें। आगे बढ़ने पर speed बढ़ती है। सिर्फ black tiles पर click या tap करें।"
  },
  "cookie-clicker": {
    en: "Click the big cookie to earn cookies. Spend cookies on upgrades and auto-clickers to earn more cookies per second. Keep clicking and buying upgrades to grow your cookie empire.",
    hi: "बड़े cookie पर click करके cookies कमाएं। Upgrades और auto-clickers खरीदें ताकि per second ज़्यादा cookies बनें। Click करते रहें और upgrades खरीदकर cookie empire बढ़ाएं।"
  },
  "car-racing": {
    en: "Race your car on the track while avoiding obstacles and other vehicles. Collect speed boosts and coins along the way. Use arrow keys or tilt to steer, up arrow to accelerate.",
    hi: "Track पर car race करें, obstacles और दूसरी गाड़ियों से बचें। Speed boosts और coins collect करें। Arrow keys से steer करें, up arrow से accelerate करें।"
  },
  "asteroid-shooter": {
    en: "Pilot your spaceship and destroy incoming asteroids before they hit you. Larger asteroids break into smaller ones when shot. Use arrow keys to move and spacebar to shoot.",
    hi: "अपना spaceship चलाएं और asteroids को आपसे टकराने से पहले destroy करें। बड़े asteroids shoot करने पर छोटे टुकड़ों में टूटते हैं। Arrow keys से move करें और spacebar से shoot करें।"
  },
  "sky-hop": {
    en: "Jump from platform to platform going upward. Tilt or move left and right to land on the next platform. Don't fall off the bottom of the screen. Use arrow keys or mouse to move left and right.",
    hi: "ऊपर की तरफ एक platform से दूसरे पर कूदें। Left और right move करके अगले platform पर land करें। Screen के नीचे न गिरें। Arrow keys या mouse से left-right move करें।"
  },
  "spiral-drop": {
    en: "Guide a ball down a spiral tower by finding the gaps in each layer. Avoid the colored sections that block your way. Tap or click to change direction as you spiral down.",
    hi: "Ball को spiral tower से नीचे गिराएं, हर layer में gaps खोजकर। Colored sections से बचें जो रास्ता रोकते हैं। Direction बदलने के लिए tap या click करें।"
  },
  "rhythm-dash": {
    en: "Run, jump, and fly through geometric levels synced to music. Time your taps to the beat to avoid obstacles. One hit and you restart. Tap or click to jump and hold to fly through portals.",
    hi: "Music के साथ sync geometric levels में दौड़ें, कूदें और उड़ें। Beat के साथ tap करके obstacles से बचें। एक hit और restart। Tap या click करके jump करें, hold करके portals से उड़ें।"
  },
  "pinball": {
    en: "Launch the ball and use flippers to keep it in play. Hit bumpers and targets to score points. Don't let the ball drain between or past the flippers. Use left and right arrow keys or Z/M to control the flippers.",
    hi: "Ball launch करें और flippers से खेल में रखें। Bumpers और targets hit करके points score करें। Ball को flippers के बीच से गिरने न दें। Left-right arrow keys या Z/M से flippers control करें।"
  },
  "sling-shot": {
    en: "Pull back the slingshot and launch projectiles at structures to knock them down. Destroy all targets with limited shots. Click and drag to pull back, aim, and release to shoot.",
    hi: "Slingshot खींचकर structures पर projectiles launch करें और गिराएं। Limited shots में सारे targets destroy करें। Click और drag करके खींचें, aim करें, और छोड़कर shoot करें।"
  },
  "road-hopper": {
    en: "Help your character cross busy roads and rivers by timing your hops. Avoid cars and hop on logs to cross water. Tap or use arrow keys to hop forward, backward, left, or right.",
    hi: "अपने character को busy roads और rivers पार कराएं, सही timing से hop करें। Cars से बचें और logs पर hop करके पानी पार करें। Tap या arrow keys से hop करें।"
  },
  "star-striker": {
    en: "Kick the soccer ball into the goal past the goalkeeper. Aim carefully and adjust your power. Swipe or click and drag to aim your shot direction and power, then release to kick.",
    hi: "Goalkeeper से बचाकर soccer ball goal में मारें। ध्यान से aim करें और power adjust करें। Swipe करें या click और drag करके direction और power set करें, release करके kick करें।"
  },
  "crossy-run": {
    en: "Cross an endless series of roads, rivers, and train tracks. Time your movements to avoid traffic and obstacles. Tap or use arrow keys to move forward, left, right, or backward.",
    hi: "Roads, rivers, और train tracks की endless series पार करें। Traffic और obstacles से बचने के लिए timing सही रखें। Tap या arrow keys से आगे, पीछे, left, right चलें।"
  },
  "bug-blaster": {
    en: "Shoot down waves of bugs descending toward you. Don't let them reach the bottom. Collect power-ups for rapid fire. Use arrow keys or mouse to move and spacebar or click to shoot.",
    hi: "नीचे आ रहे bugs की waves को shoot करें। उन्हें bottom तक पहुंचने न दें। Rapid fire के लिए power-ups collect करें। Arrow keys या mouse से move करें, spacebar या click से shoot करें।"
  },
  "barrel-climb": {
    en: "Climb ladders and platforms while dodging barrels rolling down. Reach the top to rescue your friend. Jump over barrels for bonus points. Use arrow keys to move and climb, spacebar to jump.",
    hi: "Rolling barrels से बचते हुए ladders और platforms पर चढ़ें। Top पर पहुंचकर अपने friend को rescue करें। Barrels कूदने पर bonus points। Arrow keys से चलें और चढ़ें, spacebar से jump करें।"
  },
  "neon-trail": {
    en: "Guide a neon light trail through a grid without crossing your own path. Fill as much of the grid as possible. Click or use arrow keys to change direction of your trail.",
    hi: "Neon light trail को grid में guide करें बिना अपने रास्ते को cross किए। Grid का ज़्यादा से ज़्यादा हिस्सा भरें। Click या arrow keys से trail की direction बदलें।"
  },
  "balloon-pop": {
    en: "Pop balloons as they float up by tapping or clicking them quickly. Different colored balloons give different points. Don't let too many escape off the top. Click or tap balloons to pop them.",
    hi: "ऊपर उड़ते balloons को जल्दी से tap या click करके pop करें। Different colored balloons अलग-अलग points देते हैं। ज़्यादा balloons ऊपर से escape न होने दें। Balloons पर click या tap करें।"
  },
  "mining-idle": {
    en: "Mine resources by clicking and spend them to buy upgrades and hire workers. Automate your mining operation to earn resources while idle. Click to mine, then buy upgrades from the shop.",
    hi: "Click करके resources mine करें और upgrades खरीदें, workers hire करें। Mining operation automate करें ताकि idle रहते हुए भी resources बनें। Mine करने के लिए click करें, shop से upgrades खरीदें।"
  },
  "zombie-survival": {
    en: "Survive waves of zombies by shooting them before they reach you. Collect ammo and health packs between waves. Use mouse to aim and click to shoot, arrow keys or WASD to move.",
    hi: "Zombies की waves से बचें, उन्हें पहुंचने से पहले shoot करें। Waves के बीच ammo और health packs collect करें। Mouse से aim करें, click से shoot करें, arrow keys या WASD से चलें।"
  },
  "space-race": {
    en: "Race your spaceship through an asteroid field, dodging obstacles and collecting speed boosts. Stay alive as long as possible. Use arrow keys or mouse to steer your ship.",
    hi: "Asteroid field में spaceship race करें, obstacles से बचें और speed boosts collect करें। जितनी देर हो सके टिकें। Arrow keys या mouse से ship steer करें।"
  },
  "color-road": {
    en: "Roll a ball along a road that changes colors. Only roll on sections matching your ball's color or you'll fall off. Tap or click to switch lanes to stay on the right color.",
    hi: "एक road पर ball roll करें जो colors बदलती रहती है। सिर्फ अपने ball के color matching sections पर चलें वरना गिर जाएंगे। Lanes switch करने के लिए tap या click करें।"
  },
  "bike-racing": {
    en: "Race your bike through hilly terrain, performing flips for bonus points. Balance your bike to avoid crashing. Use arrow keys to accelerate, brake, and lean forward or backward.",
    hi: "Hilly terrain पर bike race करें, flips करके bonus points कमाएं। Bike balance करें ताकि crash न हो। Arrow keys से accelerate, brake, और आगे-पीछे lean करें।"
  },
  "paper-toss": {
    en: "Toss crumpled paper into the trash can. Adjust your aim for wind direction and distance. Swipe or click and drag to throw the paper ball toward the bin.",
    hi: "Crumpled paper को dustbin में फेंकें। Wind direction और distance के हिसाब से aim adjust करें। Swipe करें या click और drag करके paper ball bin की तरफ फेंकें।"
  },
  "fishing-game": {
    en: "Cast your line into the water and wait for a bite. Reel in fish at the right time to catch them. Bigger fish earn more points. Click to cast, then click again when a fish bites to reel it in.",
    hi: "पानी में line डालें और fish के काटने का इंतज़ार करें। सही time पर reel करके fish पकड़ें। बड़ी fish ज़्यादा points देती है। Cast करने के लिए click करें, fish काटे तो फिर click करके reel करें।"
  },
  "boxing": {
    en: "Fight your opponent in a boxing match using punches, blocks, and dodges. Reduce their health to zero to win the round. Use arrow keys to move and dodge, Z for jab, X for hook, C to block.",
    hi: "Boxing match में punches, blocks, और dodges से opponent को हराएं। उनकी health zero करके round जीतें। Arrow keys से move और dodge करें, Z से jab, X से hook, C से block करें।"
  },
  "penalty-shootout": {
    en: "Take turns shooting penalties and playing goalkeeper. Aim your shot to a corner and try to save the opponent's shots. Click and drag to aim your shot direction, then release to kick.",
    hi: "बारी-बारी penalty shoot करें और goalkeeper बनें। Corner में aim करके shoot करें और opponent के shots save करें। Click और drag से aim करें, release करके kick करें।"
  },
  "basketball": {
    en: "Shoot hoops by adjusting your angle and power. Score as many baskets as possible before time runs out. Click and drag to set angle and power, release to shoot the ball.",
    hi: "Angle और power adjust करके baskets score करें। Time खत्म होने से पहले ज़्यादा से ज़्यादा baskets लगाएं। Click और drag से angle और power set करें, release करके shoot करें।"
  },
  "bowling": {
    en: "Aim the bowling ball and roll it down the lane to knock down all ten pins. Adjust your position and spin for the best angle. Click and drag to aim, then release to bowl.",
    hi: "Bowling ball aim करके lane पर roll करें और सारी ten pins गिराएं। Position और spin adjust करें। Click और drag से aim करें, release करके bowl करें।"
  },
  "cricket": {
    en: "Bat against the bowler by timing your shots. Hit the ball to score runs while avoiding getting out. Click or tap at the right moment to swing your bat when the ball arrives.",
    hi: "Bowler के खिलाफ batting करें, सही timing से shots खेलें। Ball hit करके runs बनाएं और out होने से बचें। Ball आने पर सही moment पर click या tap करके bat swing करें।"
  },
  "archery": {
    en: "Aim your bow and release the arrow to hit the bullseye. Adjust for wind and distance. Score higher by hitting closer to the center. Click and hold to aim, release to shoot the arrow.",
    hi: "Bow aim करें और arrow छोड़कर bullseye hit करें। Wind और distance adjust करें। Center के करीब hit करने पर ज़्यादा score। Click और hold करके aim करें, release करके arrow shoot करें।"
  },
  "golf-putting": {
    en: "Putt the golf ball into the hole. Read the green for slopes and adjust your power and direction. Fewest strokes wins. Click and drag away from the ball to set power and direction, release to putt.",
    hi: "Golf ball hole में डालें। Green पर slopes देखें और power-direction adjust करें। सबसे कम strokes में जीतें। Ball से दूर click और drag करके power-direction set करें, release करके putt करें।"
  },
  "darts": {
    en: "Throw darts at the dartboard aiming for high-scoring areas like the bullseye and triple ring. Reduce your score to exactly zero. Click and drag to aim, release to throw your dart.",
    hi: "Dartboard पर darts फेंकें, bullseye और triple ring जैसे high-scoring areas पर aim करें। Score exactly zero करें। Click और drag से aim करें, release करके dart फेंकें।"
  },
  "flick-football": {
    en: "Flick the football through the goalposts for field goals. Adjust angle and power to beat the wind. Swipe or click and drag upward to flick the football toward the posts.",
    hi: "Football को goalposts में flick करके field goals लगाएं। Wind को beat करने के लिए angle और power adjust करें। ऊपर swipe करें या click और drag करके football flick करें।"
  },
  "tambola": {
    en: "Listen for called numbers and mark them on your ticket. Complete patterns like early five, top line, or full house to win prizes. Click on the called number on your ticket to mark it.",
    hi: "Numbers announce होने पर अपनी ticket पर mark करें। Early five, top line, या full house जैसे patterns complete करके prizes जीतें। Ticket पर announced number click करके mark करें।"
  },
  "draw-guess": {
    en: "One player draws a word while others guess what it is. Take turns drawing and guessing. Score points for correct guesses and good drawings. Use the mouse to draw on the canvas, type your guess in the chat.",
    hi: "एक player word draw करता है बाकी guess करते हैं। बारी-बारी drawing और guessing करें। सही guess और अच्छी drawing पर points मिलते हैं। Mouse से canvas पर draw करें, chat में guess type करें।"
  },
  "trivia-battle": {
    en: "Answer multiple-choice trivia questions across various categories. Be fast — quicker correct answers earn more points. Click the correct answer from the four options before time runs out.",
    hi: "Different categories में multiple-choice trivia questions का जवाब दें। जल्दी सही answer देने पर ज़्यादा points। Time खत्म होने से पहले चार options में से सही answer click करें।"
  },
  "rock-paper-scissors": {
    en: "Choose rock, paper, or scissors. Rock beats scissors, scissors beats paper, paper beats rock. Best of multiple rounds wins. Click on your choice — rock, paper, or scissors.",
    hi: "Rock, paper, या scissors चुनें। Rock scissors को, scissors paper को, paper rock को हराता है। कई rounds में ज़्यादा जीतने वाला winner। अपनी choice — rock, paper, या scissors — click करें।"
  },
  "color-recall": {
    en: "Watch a sequence of colors light up, then repeat the sequence from memory. The sequence gets longer each round. Click the colored buttons in the same order they lit up.",
    hi: "Colors का sequence light up होते देखें, फिर memory से वही sequence repeat करें। हर round sequence लंबा होता जाता है। Colored buttons उसी order में click करें जिसमें वो light up हुए थे।"
  },
  "hangman": {
    en: "Guess the hidden word one letter at a time before the stick figure is fully drawn. Each wrong guess adds a body part. Click or type letters to guess. Solve the word before running out of guesses.",
    hi: "Stick figure पूरा बनने से पहले hidden word guess करें, एक letter एक बार। हर गलत guess पर body part जुड़ता है। Letters click या type करके guess करें। Guesses खत्म होने से पहले word solve करें।"
  },
  "anagram": {
    en: "Rearrange the jumbled letters to form a valid word. Use all the given letters. Solve as many anagrams as you can before time runs out. Click letters to rearrange them or type the word directly.",
    hi: "Jumbled letters को rearrange करके सही word बनाएं। सभी दिए गए letters use करें। Time से पहले ज़्यादा से ज़्यादा anagrams solve करें। Letters click करके rearrange करें या word directly type करें।"
  },
  "word-board": {
    en: "Form words on the board using letter tiles. Place tiles on premium squares for bonus points. Longer and rarer words score higher. Drag letter tiles onto the board to form words, then click Submit.",
    hi: "Letter tiles use करके board पर words बनाएं। Bonus points के लिए premium squares पर tiles रखें। लंबे और rare words ज़्यादा score देते हैं। Letter tiles board पर drag करें, फिर Submit click करें।"
  },
  "spelling-bee": {
    en: "Make as many words as possible using the given seven letters. Every word must include the center letter. Longer words and pangrams score more. Click the letters to build a word, then press Enter or click Submit.",
    hi: "दिए गए सात letters से ज़्यादा से ज़्यादा words बनाएं। हर word में center letter ज़रूर होना चाहिए। लंबे words और pangrams ज़्यादा score देते हैं। Letters click करके word बनाएं, फिर Enter या Submit दबाएं।"
  },
  "would-you-rather": {
    en: "Choose between two options and see what percentage of other players picked each one. There are no wrong answers — just pick what you prefer! Click on the option you'd rather choose.",
    hi: "दो options में से एक चुनें और देखें कितने percent players ने क्या चुना। कोई गलत answer नहीं — बस अपनी पसंद चुनें! जो option चुनना है उस पर click करें।"
  },
  "truth-or-dare": {
    en: "Choose truth or dare! Pick truth to answer a personal question honestly, or dare to complete a fun challenge. Click Truth or Dare to get your prompt.",
    hi: "Truth या Dare चुनें! Truth चुनें तो honestly personal question का जवाब दें, Dare चुनें तो fun challenge पूरा करें। Truth या Dare click करके prompt पाएं।"
  },
  "charades": {
    en: "Act out the given word or phrase without speaking while others guess. Use gestures, expressions, and body language only. Click Start to get a word, then act it out for others to guess.",
    hi: "दिए गए word या phrase को बिना बोले act करें और बाकी लोग guess करें। सिर्फ gestures, expressions, और body language use करें। Start click करके word पाएं, फिर act करें।"
  },
  "never-have-i-ever": {
    en: "Read a statement starting with 'Never have I ever...' and tap if you've done it. See how your responses compare with others. Click the statement if you have done that thing.",
    hi: "'Never have I ever...' statement पढ़ें और अगर आपने वो किया है तो tap करें। देखें आपके responses दूसरों से कैसे compare करते हैं। अगर वो चीज़ की है तो statement पर click करें।"
  },
  "liars-dice": {
    en: "Bid on how many dice of a certain face value are on the table. Challenge other players if you think they're bluffing. Click to make your bid or click Challenge to call a bluff.",
    hi: "Bid लगाएं कि table पर किसी face value की कितनी dice हैं। अगर लगे कि कोई bluff कर रहा है तो challenge करें। Bid लगाने के लिए click करें या bluff call करने के लिए Challenge click करें।"
  },
  "geo-quiz": {
    en: "Identify countries, capitals, flags, or landmarks from the clues given. Test your geography knowledge across the world. Click the correct answer from the options for each question.",
    hi: "दिए गए clues से countries, capitals, flags, या landmarks पहचानें। पूरी दुनिया की geography knowledge test करें। हर question के लिए options में से सही answer click करें।"
  },
  "typing-speed": {
    en: "Type the displayed text as fast and accurately as you can. Your words per minute and accuracy are measured. Start typing when the text appears — just type on your keyboard to match the words shown.",
    hi: "Screen पर दिखाया गया text जितना तेज़ और सही हो सके type करें। Words per minute और accuracy measure होती है। Text दिखते ही keyboard पर type करना शुरू करें।"
  },
  "reaction-time-game": {
    en: "Wait for the signal, then click as fast as you can. Your reaction time is measured in milliseconds. Don't click too early or you'll get a false start. Click the screen as soon as the color changes.",
    hi: "Signal का इंतज़ार करें, फिर जितनी जल्दी हो सके click करें। Milliseconds में reaction time measure होता है। जल्दी click मत करें वरना false start होगा। Color बदलते ही screen click करें।"
  },
  "rhythm-keys": {
    en: "Hit the correct keys as notes scroll down to the beat of the music. Time your key presses perfectly for the best score. Press the corresponding keys (D, F, J, K or arrow keys) as notes reach the bottom line.",
    hi: "Music की beat पर notes scroll होते हुए सही keys hit करें। Best score के लिए perfect timing से keys press करें। Notes bottom line पर आने पर corresponding keys (D, F, J, K या arrow keys) press करें।"
  },
  "beat-catcher": {
    en: "Catch or tap beats as they appear on screen in sync with the music. Stay on rhythm to build your combo and score. Click or tap the beats when they reach the target zone.",
    hi: "Music के sync में screen पर दिखने वाले beats को catch या tap करें। Rhythm में रहकर combo और score बढ़ाएं। Beats target zone पर पहुंचने पर click या tap करें।"
  },
  "music-memory": {
    en: "Listen to a melody, then replay it by pressing the correct keys or buttons in order. The melody gets longer each round. Click the instrument keys or buttons in the same order you heard the melody.",
    hi: "Melody सुनें, फिर सही order में keys या buttons press करके replay करें। हर round melody लंबी होती जाती है। जिस order में melody सुनी, उसी order में instrument keys या buttons click करें।"
  }
};
