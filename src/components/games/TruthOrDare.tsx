"use client";
import { useState, useCallback } from "react";

const TRUTHS = [
  "What is your biggest fear?","What is the most embarrassing thing you have done?","What is a secret talent you have?","Who was your first crush?","What is the weirdest dream you have had?","Have you ever lied to your best friend?","What is something you have never told anyone?","What is the most childish thing you still do?","If you could change one thing about yourself what would it be?","What is the last lie you told?",
  "What is the most awkward thing that happened to you?","What is your guilty pleasure?","Have you ever cheated on a test?","What is the silliest thing you have cried about?","What is your worst habit?","What would you do if you were invisible for a day?","What is the meanest thing you have ever said to someone?","Who in this room would you least want to be stuck on an island with?","What is your most embarrassing nickname?","Have you ever pretended to like a gift you hated?",
  "What is the longest you have gone without showering?","What is the most ridiculous thing you have an opinion on?","What is the worst date you have been on?","Who do you stalk on social media?","If you had to marry someone in this room, who would it be?","Have you ever broken someone's heart?","What is the biggest misconception about you?","What is the pettiest thing you have done?","What is the worst fashion choice you have ever made?","Have you ever had a wardrobe malfunction?",
  "What is something that always makes you cry?","What is your most unpopular opinion?","What is the weirdest food combination you enjoy?","Have you ever walked into a glass door?","What song do you sing in the shower?","What is your screen time average?","Have you ever lied about your age?","What is the most useless skill you have?","What emoji best represents your life?","Have you ever pretended to be sick to skip something?",
  "What is the most money you have wasted?","Who is your secret celebrity crush?","What is something you are irrationally afraid of?","What is the worst advice you have ever given?","Have you ever eavesdropped on someone?","What would you do with a million dollars?","What is the bravest thing you have ever done?","Who in this group would survive a zombie apocalypse?","What is your biggest regret?","Have you ever said I love you and not meant it?",
  "What is the most trouble you have been in?","What white lie do you tell most often?","What is your most embarrassing autocorrect?","Have you ever accidentally sent a text to the wrong person?","What is the worst thing you have googled?","If your life was a movie what genre would it be?","What app do you spend too much time on?","Have you ever been caught talking to yourself?","What is the grossest thing you have ever eaten?","What childhood show do you still watch?",
  "Have you ever had a paranormal experience?","What is the weirdest thing in your search history?","If you could read minds for a day whose mind would you read?","What is the most cringe thing you have done for a crush?","What talent do you wish you had?","Have you ever danced alone in public?","What is the funniest injury you have had?","What is your hidden obsession?","Have you ever forgotten someone's name while talking to them?","What would your autobiography be titled?",
  "What is the silliest argument you have had?","Have you ever re-gifted something?","What is the most out of character thing you have done?","What do your friends complain about you the most?","Have you ever eaten food off the floor?","What is the worst haircut you have had?","Have you ever been caught in a lie?","What is your comfort movie?","What would you do if you woke up as the opposite gender?","What is the longest grudge you have held?",
  "Have you ever laughed at a completely inappropriate time?","What is the weirdest compliment you have received?","What childhood belief did you hold on to the longest?","Have you ever accidentally called a teacher mom or dad?","What is the most awkward thing in your camera roll?","If you had to delete all social media except one which would you keep?","What is the most childish thing that makes you happy?","Have you ever pretended to understand something you did not?","What is your go-to excuse for being late?","Who is someone you pretend to like but actually do not?",
  "What is your most embarrassing public moment?","Have you ever walked out of a movie?","What would be the worst thing to hear as you go under anesthesia?","Have you ever accidentally liked a very old photo while stalking someone?","What is the weirdest thing you have done when no one was watching?","If you could swap lives with someone for a day who would it be?","What is a rule you always break?","Have you ever faked being good at something?","What is the most embarrassing thing your parents caught you doing?","What would you do if you found out you were adopted?",
];

const DARES = [
  "Do 10 push-ups right now","Speak in an accent for the next 3 rounds","Let someone go through your phone for 30 seconds","Post an embarrassing photo on social media","Sing the chorus of your favorite song","Do your best impression of a celebrity","Talk without closing your mouth for 1 minute","Let the group give you a new hairstyle","Eat a spoonful of hot sauce","Call a friend and sing Happy Birthday",
  "Do a silly dance for 30 seconds","Speak in reverse for the next round","Do your best animal impression","Text your crush something embarrassing","Let the person to your right draw on your face","Wear your clothes inside out for 3 rounds","Do 20 jumping jacks","Pretend to be a robot for 2 minutes","Let someone tickle you for 10 seconds","Talk in slow motion for the next round",
  "Imitate your favorite emoji","Give a motivational speech about a spoon","Do a fashion show with items from your bag","Whisper everything for the next 2 rounds","Do your best baby impression","Try to lick your elbow","Hold an ice cube until it melts","Let the group pick your profile picture for 24 hours","Do a plank for 30 seconds","Speak only in questions for 2 rounds",
  "Serenade the person to your left","Act out a scene from your favorite movie","Try to do a cartwheel","Eat something without using your hands","Let someone style your hair","Make up a rap about the person across from you","Do your best old person impression","Pretend to be a news anchor reporting a silly story","Walk like a crab for 1 minute","Say the alphabet backwards",
  "Balance a book on your head for 1 minute","Do your best chicken dance","Call a random contact and ask if their refrigerator is running","Describe yourself in third person for 3 rounds","Act like a waiter serving everyone","Make animal sounds for everything you say for 2 rounds","Pretend the floor is lava","Do 10 squats while singing a song","Talk with your eyes closed for 1 round","Stack 5 objects on your head",
  "Moonwalk across the room","Do an impression of each player","Speak in a foreign accent for 2 rounds","Pretend you are a mime for 1 minute","Let someone send a text from your phone","Show the last 5 photos in your camera roll","Do the worm on the floor","Pretend to be a cat for 1 minute","Say a tongue twister 5 times fast","Do air guitar for 30 seconds",
  "Hop on one foot for 30 seconds","Draw a self-portrait blindfolded","Yell out the window a silly phrase","Hold a funny face for 1 minute straight","Try to juggle any 3 objects","Do your best superhero pose","Talk like a pirate for 2 rounds","Make up a jingle about someone in the group","Do a handstand or attempt one","Wear socks on your hands for 2 rounds",
  "Keep a straight face while others try to make you laugh for 30 seconds","Read the last text you sent out loud","Dramatically act out your morning routine","Bark like a dog every time someone says your name for 3 rounds","Invent a new dance move and teach it to everyone","Do 5 burpees","Walk backwards everywhere for the next 2 rounds","Speak only using movie quotes for 2 rounds","Try to touch your toes without bending your knees","Close your eyes and draw a portrait of someone in the group",
  "Let someone draw a mustache on you","Skip instead of walking for 2 rounds","Try to make everyone laugh in 30 seconds","Do a trust fall","Hold your breath for 20 seconds","Prank call a pizza place","Freestyle dance for 15 seconds","Give a dramatic reading of a random text message","Try to do the splits","Make your most ridiculous face and let someone take a photo",
  "Act out the last dream you remember","Pretend to be a tree for 30 seconds","Do jumping jacks while reciting the pledge","Gargle water and try to sing","Act like you just won an Oscar","Make a hat out of something nearby and wear it","Do your best Bollywood dance","Tell a joke and if no one laughs do 10 push-ups","Let the group decide your lock screen for 24 hours","Read everything backwards for the next round",
];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export default function TruthOrDare() {
  const [phase, setPhase] = useState<"setup" | "spin" | "choice" | "reveal">("setup");
  const [players, setPlayers] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const [selectedType, setSelectedType] = useState<"truth" | "dare" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [round, setRound] = useState(1);
  const [usedTruths, setUsedTruths] = useState<number[]>([]);
  const [usedDares, setUsedDares] = useState<number[]>([]);

  const addPlayer = () => {
    const name = nameInput.trim();
    if (name && players.length < 8 && !players.includes(name)) {
      setPlayers([...players, name]);
      setNameInput("");
    }
  };

  const removePlayer = (idx: number) => setPlayers(players.filter((_, i) => i !== idx));

  const startGame = () => {
    if (players.length >= 2) {
      setPhase("spin");
      setRound(1);
      setUsedTruths([]);
      setUsedDares([]);
    }
  };

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    const target = Math.floor(Math.random() * players.length);
    const rotations = 3 + Math.random() * 3;
    const targetAngle = rotations * 360 + (target / players.length) * 360;
    let current = 0;
    const duration = 2000;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current = targetAngle * eased;
      setSpinAngle(current);
      if (progress < 1) { requestAnimationFrame(animate); }
      else {
        setCurrentPlayer(target);
        setSpinning(false);
        setPhase("choice");
      }
    };
    animate();
  }, [spinning, players]);

  const chooseType = (type: "truth" | "dare") => {
    setSelectedType(type);
    const pool = type === "truth" ? TRUTHS : DARES;
    const used = type === "truth" ? usedTruths : usedDares;
    const available = pool.map((_, i) => i).filter(i => !used.includes(i));
    if (available.length === 0) {
      type === "truth" ? setUsedTruths([]) : setUsedDares([]);
      const idx = Math.floor(Math.random() * pool.length);
      setPrompt(pool[idx]);
    } else {
      const idx = available[Math.floor(Math.random() * available.length)];
      setPrompt(pool[idx]);
      if (type === "truth") setUsedTruths([...used, idx]);
      else setUsedDares([...used, idx]);
    }
    setPhase("reveal");
  };

  const nextRound = () => {
    setRound(r => r + 1);
    setSelectedType(null);
    setPrompt("");
    setPhase("spin");
  };

  if (phase === "setup") {
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0", padding: "20px" }}>
        <h1 style={{ color: "#ffd700", fontSize: "32px", marginBottom: "4px" }}>Truth or Dare</h1>
        <p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>Add 2-8 players to start</p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addPlayer()} placeholder="Enter name" maxLength={15} style={{ padding: "10px 14px", background: "#1a1a3a", border: "1px solid #333", borderRadius: "8px", color: "#e0e0e0", fontSize: "14px", outline: "none", width: "180px" }} />
          <button onClick={addPlayer} disabled={players.length >= 8} style={{ padding: "10px 16px", background: "#4ecdc4", color: "#0a0a1a", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>Add</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px", justifyContent: "center" }}>
          {players.map((p, i) => (
            <div key={i} style={{ padding: "6px 12px", background: "#1a1a3a", borderRadius: "15px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              {p} <span onClick={() => removePlayer(i)} style={{ cursor: "pointer", color: "#ff6b6b" }}>x</span>
            </div>
          ))}
        </div>

        <button onClick={startGame} disabled={players.length < 2} style={{ padding: "12px 40px", background: players.length >= 2 ? "#ffd700" : "#333", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: players.length >= 2 ? "pointer" : "default" }}>Start</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0", padding: "20px" }}>
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>Round {round}</div>

      {phase === "spin" && (
        <>
          <h2 style={{ color: "#ffd700", fontSize: "22px", marginBottom: "20px" }}>Spin to pick a player!</h2>
          {/* Spin wheel */}
          <div style={{ position: "relative", width: "250px", height: "250px", marginBottom: "20px" }}>
            <svg width="250" height="250" style={{ transform: `rotate(${spinAngle}deg)`, transition: spinning ? "none" : "transform 0.1s" }}>
              {players.map((p, i) => {
                const angle = (360 / players.length) * i;
                const endAngle = (360 / players.length) * (i + 1);
                const midAngle = ((angle + endAngle) / 2) * (Math.PI / 180);
                const colors = ["#ff6b6b", "#4ecdc4", "#ffd700", "#a855f7", "#22c55e", "#f97316", "#06b6d4", "#ec4899"];
                const startRad = (angle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);
                const r = 120;
                const x1 = 125 + r * Math.cos(startRad);
                const y1 = 125 + r * Math.sin(startRad);
                const x2 = 125 + r * Math.cos(endRad);
                const y2 = 125 + r * Math.sin(endRad);
                const largeArc = endAngle - angle > 180 ? 1 : 0;
                const tx = 125 + 70 * Math.cos(midAngle - Math.PI / 2);
                const ty = 125 + 70 * Math.sin(midAngle - Math.PI / 2);
                return (
                  <g key={i}>
                    <path d={`M125,125 L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`} fill={colors[i % colors.length]} stroke="#0a0a1a" strokeWidth="2" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="11" fontWeight="600" transform={`rotate(${(angle + endAngle) / 2}, ${tx}, ${ty})`}>{p}</text>
                  </g>
                );
              })}
            </svg>
            {/* Arrow */}
            <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "20px solid #ffd700" }} />
          </div>
          <button onClick={spin} disabled={spinning} style={{ padding: "12px 40px", background: spinning ? "#555" : "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: spinning ? "default" : "pointer" }}>
            {spinning ? "Spinning..." : "Spin!"}
          </button>
        </>
      )}

      {phase === "choice" && (
        <>
          <h2 style={{ color: "#ffd700", fontSize: "22px", marginBottom: "8px" }}>{players[currentPlayer]}</h2>
          <p style={{ color: "#888", marginBottom: "24px", fontSize: "14px" }}>Choose wisely...</p>
          <div style={{ display: "flex", gap: "16px" }}>
            <button onClick={() => chooseType("truth")} style={{ padding: "20px 36px", background: "linear-gradient(135deg, #4ecdc4, #2a9d8f)", color: "#fff", border: "none", borderRadius: "15px", fontSize: "20px", fontWeight: 700, cursor: "pointer" }}>Truth</button>
            <button onClick={() => chooseType("dare")} style={{ padding: "20px 36px", background: "linear-gradient(135deg, #ff6b6b, #d32f2f)", color: "#fff", border: "none", borderRadius: "15px", fontSize: "20px", fontWeight: 700, cursor: "pointer" }}>Dare</button>
          </div>
        </>
      )}

      {phase === "reveal" && (
        <>
          <div style={{ padding: "6px 16px", borderRadius: "15px", background: selectedType === "truth" ? "#4ecdc433" : "#ff6b6b33", color: selectedType === "truth" ? "#4ecdc4" : "#ff6b6b", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
            {selectedType === "truth" ? "TRUTH" : "DARE"}
          </div>
          <h2 style={{ color: "#ffd700", fontSize: "20px", marginBottom: "16px" }}>{players[currentPlayer]}</h2>
          <div style={{ background: "#0d0d2a", borderRadius: "16px", padding: "24px 20px", maxWidth: "340px", textAlign: "center", marginBottom: "24px", border: `2px solid ${selectedType === "truth" ? "#4ecdc444" : "#ff6b6b44"}` }}>
            <p style={{ fontSize: "18px", lineHeight: 1.6, margin: 0 }}>{prompt}</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={nextRound} style={{ padding: "10px 30px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Next Round</button>
            <button onClick={() => { chooseType(selectedType === "truth" ? "truth" : "dare"); }} style={{ padding: "10px 20px", background: "transparent", color: "#888", border: "1px solid #333", borderRadius: "20px", fontSize: "13px", cursor: "pointer" }}>Skip</button>
          </div>
        </>
      )}

      <button onClick={() => setPhase("setup")} style={{ marginTop: "24px", padding: "6px 16px", background: "transparent", color: "#555", border: "1px solid #222", borderRadius: "15px", cursor: "pointer", fontSize: "11px" }}>Reset Game</button>
    </div>
  );
}
