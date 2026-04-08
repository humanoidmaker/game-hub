"use client";
import { useState, useMemo } from "react";

type Category = "funny" | "gross" | "deep" | "impossible";
interface WYRQuestion { a: string; b: string; category: Category }

const QUESTIONS: WYRQuestion[] = [
  { a: "Have the ability to fly", b: "Have the ability to be invisible", category: "deep" },
  { a: "Live without music", b: "Live without movies", category: "deep" },
  { a: "Always be 10 minutes late", b: "Always be 20 minutes early", category: "funny" },
  { a: "Have unlimited money", b: "Have unlimited time", category: "deep" },
  { a: "Be able to talk to animals", b: "Be able to speak every language", category: "deep" },
  { a: "Never use social media again", b: "Never watch another movie or show", category: "deep" },
  { a: "Always have to say what you think", b: "Never speak again", category: "impossible" },
  { a: "Be famous but unhappy", b: "Be unknown but happy", category: "deep" },
  { a: "Eat only pizza forever", b: "Eat only ice cream forever", category: "funny" },
  { a: "Live in the past", b: "Live in the future", category: "deep" },
  { a: "Have a rewind button for your life", b: "Have a pause button for your life", category: "deep" },
  { a: "Be the funniest person in the room", b: "Be the smartest person in the room", category: "deep" },
  { a: "Never have to sleep", b: "Never have to eat", category: "impossible" },
  { a: "Have a personal chef", b: "Have a personal driver", category: "funny" },
  { a: "Be able to read minds", b: "Be able to see the future", category: "deep" },
  { a: "Always be slightly cold", b: "Always be slightly hot", category: "funny" },
  { a: "Eat a live spider", b: "Eat a dead cockroach", category: "gross" },
  { a: "Lick the floor of a public restroom", b: "Lick the bottom of your shoe", category: "gross" },
  { a: "Swim in a pool of chocolate syrup", b: "Swim in a pool of maple syrup", category: "funny" },
  { a: "Never brush your teeth again", b: "Never wash your hair again", category: "gross" },
  { a: "Be 4 feet tall", b: "Be 8 feet tall", category: "funny" },
  { a: "Have hands for feet", b: "Have feet for hands", category: "impossible" },
  { a: "Live in a treehouse", b: "Live in a houseboat", category: "funny" },
  { a: "Fight 100 duck-sized horses", b: "Fight 1 horse-sized duck", category: "funny" },
  { a: "Only eat canned food", b: "Only eat frozen food", category: "funny" },
  { a: "Drink sour milk", b: "Eat expired yogurt", category: "gross" },
  { a: "Have a permanent clown face", b: "Have a permanent clown laugh", category: "funny" },
  { a: "Be stranded on a deserted island", b: "Be stranded in a big city with no money", category: "deep" },
  { a: "Know when you will die", b: "Know how you will die", category: "deep" },
  { a: "Be able to teleport", b: "Be able to time travel", category: "impossible" },
  { a: "Never age physically", b: "Never age mentally", category: "deep" },
  { a: "Eat only raw food", b: "Eat only overcooked food", category: "gross" },
  { a: "Have no elbows", b: "Have no knees", category: "impossible" },
  { a: "Always smell bad to yourself", b: "Always smell bad to others", category: "gross" },
  { a: "Only wear formal clothes", b: "Only wear pajamas", category: "funny" },
  { a: "Have super speed", b: "Have super strength", category: "impossible" },
  { a: "Give up your phone for a year", b: "Give up showering for a month", category: "gross" },
  { a: "Be the best player on a losing team", b: "Be the worst player on a winning team", category: "deep" },
  { a: "Have a tail", b: "Have horns", category: "funny" },
  { a: "Live in a world with no technology", b: "Live in a world with no nature", category: "deep" },
  { a: "Eat a raw onion like an apple", b: "Drink a glass of pickle juice", category: "gross" },
  { a: "Be covered in fur", b: "Be covered in scales", category: "impossible" },
  { a: "Never be able to use a toilet again", b: "Never be able to use a shower again", category: "gross" },
  { a: "Always have a song stuck in your head", b: "Always have an itch you cannot scratch", category: "funny" },
  { a: "Only be able to whisper", b: "Only be able to shout", category: "funny" },
  { a: "Have a photographic memory", b: "Have the ability to forget anything at will", category: "deep" },
  { a: "Walk on Legos for a mile", b: "Sit on a wet chair for a day", category: "gross" },
  { a: "Be a famous actor", b: "Be a famous musician", category: "deep" },
  { a: "Live without heating or AC", b: "Live without internet", category: "deep" },
  { a: "Have a dragon", b: "Be a dragon", category: "impossible" },
  { a: "Know every language", b: "Know every instrument", category: "deep" },
  { a: "Eat a tablespoon of wasabi", b: "Eat a tablespoon of hot sauce", category: "gross" },
  { a: "Be the hero", b: "Be the villain", category: "deep" },
  { a: "Have 10 siblings", b: "Be an only child", category: "funny" },
  { a: "Be stuck in an elevator for 12 hours", b: "Be stuck in traffic for 12 hours", category: "funny" },
  { a: "Only be able to walk backwards", b: "Only be able to walk sideways", category: "funny" },
  { a: "Have uncontrollable laughter", b: "Have uncontrollable crying", category: "impossible" },
  { a: "Eat food that always tastes like dirt", b: "Drink liquids that always taste like vinegar", category: "gross" },
  { a: "Have the ability to shrink", b: "Have the ability to grow", category: "impossible" },
  { a: "Live on the moon", b: "Live under the ocean", category: "impossible" },
  { a: "Be the funniest comedian", b: "Be the greatest scientist", category: "deep" },
  { a: "Sneeze nonstop for a day", b: "Hiccup nonstop for a week", category: "gross" },
  { a: "Live without mirrors", b: "Live without photos", category: "deep" },
  { a: "Win the lottery but lose all friends", b: "Keep friends but stay broke", category: "deep" },
  { a: "Be the oldest person alive", b: "Be the youngest person alive", category: "deep" },
  { a: "Have a third arm", b: "Have a third eye", category: "impossible" },
  { a: "Never get stuck in traffic", b: "Never get a cold again", category: "funny" },
  { a: "Have free WiFi everywhere", b: "Have free food everywhere", category: "funny" },
  { a: "Be able to control fire", b: "Be able to control water", category: "impossible" },
  { a: "Only eat breakfast food", b: "Only eat dinner food", category: "funny" },
  { a: "Live in a mansion in the middle of nowhere", b: "Live in a tiny apartment in NYC", category: "deep" },
  { a: "Have your search history made public", b: "Have your text messages made public", category: "deep" },
  { a: "Eat a bowl of live worms", b: "Drink blended fish smoothie", category: "gross" },
  { a: "Be a genius everyone thinks is dumb", b: "Be dumb but everyone thinks you are a genius", category: "deep" },
  { a: "Have all traffic lights green", b: "Never wait in a queue again", category: "funny" },
  { a: "Be locked in a zoo overnight", b: "Be locked in a museum overnight", category: "funny" },
  { a: "Only communicate via singing", b: "Only communicate via dancing", category: "funny" },
  { a: "Eat only spicy food forever", b: "Eat only bland food forever", category: "gross" },
  { a: "Be a time traveler", b: "Be a space explorer", category: "deep" },
  { a: "Never lose your phone", b: "Never lose your keys", category: "funny" },
  { a: "Have the power of elasticity", b: "Have the power of magnetism", category: "impossible" },
  { a: "Relive the same day forever", b: "Fast forward through life", category: "deep" },
  { a: "Smell like garlic forever", b: "Smell like onions forever", category: "gross" },
  { a: "Ride a roller coaster for 24 hours", b: "Spin in a teacup ride for 24 hours", category: "funny" },
  { a: "Be immune to all diseases", b: "Be immune to all injuries", category: "impossible" },
  { a: "Always have a runny nose", b: "Always have a dry cough", category: "gross" },
  { a: "Lose all your money", b: "Lose all your memories", category: "deep" },
  { a: "Have a pet dinosaur", b: "Have a pet unicorn", category: "impossible" },
  { a: "Only be able to sit", b: "Only be able to stand", category: "impossible" },
  { a: "Eat cereal with water", b: "Eat cereal with orange juice", category: "gross" },
  { a: "Be Batman", b: "Be Spider-Man", category: "funny" },
  { a: "Have the perfect body but bad face", b: "Have the perfect face but bad body", category: "deep" },
  { a: "Live in a world without color", b: "Live in a world without sound", category: "deep" },
  { a: "Have every wish granted except one", b: "Have one wish absolutely guaranteed", category: "deep" },
  { a: "Know every secret of the universe", b: "Be the richest person ever", category: "deep" },
  { a: "Drink ketchup like a smoothie", b: "Eat mayonnaise with a spoon", category: "gross" },
  { a: "Always have slow internet", b: "Always have a low battery", category: "funny" },
  { a: "Be able to breathe underwater", b: "Be able to survive in space", category: "impossible" },
  { a: "Give up coffee forever", b: "Give up chocolate forever", category: "funny" },
  { a: "Have X-ray vision", b: "Have night vision", category: "impossible" },
  { a: "Eat only what you cook", b: "Eat only what others cook for you", category: "funny" },
  { a: "Have no fingers", b: "Have no toes", category: "impossible" },
  { a: "Lick the bottom of a public bus seat", b: "Chew a stranger's used gum", category: "gross" },
  { a: "Know every fact", b: "Have every skill", category: "deep" },
  { a: "Be stuck in a horror movie", b: "Be stuck in a romantic comedy", category: "funny" },
  { a: "Always wear wet socks", b: "Always have a pebble in your shoe", category: "gross" },
  { a: "Control gravity", b: "Control time", category: "impossible" },
  { a: "Have no sense of humor", b: "Have no common sense", category: "deep" },
  { a: "Eat only with chopsticks", b: "Eat only with your hands", category: "funny" },
  { a: "Have a pause button for arguments", b: "Have a mute button for people", category: "funny" },
  { a: "Be a world-class chef", b: "Be a world-class athlete", category: "deep" },
  { a: "Never cut your nails again", b: "Never cut your hair again", category: "gross" },
  { a: "Explore the deep ocean", b: "Explore deep space", category: "deep" },
  { a: "Sleep on a bed of nails", b: "Sleep on a bed of ice", category: "gross" },
  { a: "Control all electronics with your mind", b: "Control all animals with your mind", category: "impossible" },
  { a: "Walk for 10 hours", b: "Run for 2 hours", category: "funny" },
  { a: "Have a flying carpet", b: "Have a time machine", category: "impossible" },
  { a: "Hear every thought around you", b: "Broadcast every thought you have", category: "impossible" },
  { a: "Live without privacy", b: "Live without company", category: "deep" },
  { a: "Never eat sweets again", b: "Never eat savory food again", category: "gross" },
  { a: "Be the author of a best seller", b: "Be the director of a blockbuster", category: "deep" },
  { a: "Have an extra finger on each hand", b: "Have an extra toe on each foot", category: "impossible" },
  { a: "Only travel by bicycle", b: "Only travel by foot", category: "funny" },
  { a: "Have your dream job with low pay", b: "Have a boring job with high pay", category: "deep" },
  { a: "Be permanently sunburned", b: "Be permanently frozen", category: "gross" },
  { a: "Talk to your future self", b: "Talk to your past self", category: "deep" },
  { a: "Eat a crayon", b: "Drink a bottle of ink", category: "gross" },
  { a: "Be a wizard", b: "Be a superhero", category: "impossible" },
  { a: "Have a perfect singing voice", b: "Have perfect dance moves", category: "funny" },
  { a: "Forget who you are every morning", b: "Forget everyone else every morning", category: "deep" },
  { a: "Be trapped in a video game", b: "Be trapped in a book", category: "funny" },
  { a: "Never feel physical pain", b: "Never feel emotional pain", category: "deep" },
  { a: "Be able to change your age at will", b: "Be able to change your appearance at will", category: "impossible" },
  { a: "Eat a whole lemon without making a face", b: "Eat a whole jalapeño without drinking water", category: "gross" },
  { a: "Be the last person on Earth", b: "Be stuck in a crowd forever", category: "deep" },
  { a: "Always dream in nightmares", b: "Never dream again", category: "deep" },
  { a: "Have a clone of yourself", b: "Have a robot assistant", category: "impossible" },
  { a: "Never use emojis again", b: "Only communicate using emojis", category: "funny" },
  { a: "Be an expert in one thing", b: "Be average at everything", category: "deep" },
  { a: "Have fingers as long as your legs", b: "Have legs as long as your fingers", category: "impossible" },
  { a: "Live without a phone for a year", b: "Live without a bed for a year", category: "deep" },
  { a: "Bathe in tomato sauce", b: "Bathe in mustard", category: "gross" },
  { a: "Be immortal and alone", b: "Live a short life with loved ones", category: "deep" },
];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const catColors: Record<Category, string> = { funny: "#ffd700", gross: "#22c55e", deep: "#4ecdc4", impossible: "#a855f7" };

export default function WouldYouRather() {
  const shuffled = useMemo(() => shuffleArr(QUESTIONS), []);
  const [qIdx, setQIdx] = useState(0);
  const [stats, setStats] = useState<Record<number, { a: number; b: number }>>({});
  const [chosen, setChosen] = useState<"a" | "b" | null>(null);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [totalAnswered, setTotalAnswered] = useState(0);

  const filtered = useMemo(() => filter === "all" ? shuffled : shuffled.filter(q => q.category === filter), [shuffled, filter]);
  const q = filtered[qIdx % filtered.length];
  const globalIdx = shuffled.indexOf(q);

  const choose = (choice: "a" | "b") => {
    if (chosen) return;
    setChosen(choice);
    setStats(prev => {
      const old = prev[globalIdx] || { a: 0, b: 0 };
      // Add some simulated "other player" votes for variety
      const simA = Math.floor(Math.random() * 30) + 20;
      const simB = Math.floor(Math.random() * 30) + 20;
      return { ...prev, [globalIdx]: { a: old.a + (choice === "a" ? 1 : 0) + simA, b: old.b + (choice === "b" ? 1 : 0) + simB } };
    });
    setTotalAnswered(t => t + 1);
  };

  const next = () => {
    setQIdx(i => i + 1);
    setChosen(null);
  };

  const st = stats[globalIdx] || { a: 0, b: 0 };
  const total = st.a + st.b;
  const pctA = total > 0 ? Math.round((st.a / total) * 100) : 50;
  const pctB = total > 0 ? 100 - pctA : 50;

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h1 style={{ color: "#ffd700", fontSize: "28px", marginBottom: "4px" }}>Would You Rather</h1>
      <p style={{ color: "#888", fontSize: "12px", marginBottom: "16px" }}>Answered: {totalAnswered}</p>

      {/* Category filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        {(["all", "funny", "gross", "deep", "impossible"] as const).map(cat => (
          <button key={cat} onClick={() => { setFilter(cat); setQIdx(0); setChosen(null); }} style={{
            padding: "5px 12px", borderRadius: "15px", fontSize: "11px", cursor: "pointer", border: "none",
            background: filter === cat ? (cat === "all" ? "#ffd700" : catColors[cat]) : "#1a1a3a",
            color: filter === cat ? "#0a0a1a" : "#888", fontWeight: filter === cat ? 700 : 400,
          }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
        ))}
      </div>

      {/* Category badge */}
      <span style={{ padding: "3px 10px", borderRadius: "10px", fontSize: "10px", background: catColors[q.category] + "22", color: catColors[q.category], marginBottom: "16px" }}>{q.category}</span>

      <h2 style={{ color: "#e0e0e0", fontSize: "18px", marginBottom: "20px", textAlign: "center" }}>Would you rather...</h2>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "380px", width: "100%", marginBottom: "20px" }}>
        {/* Option A */}
        <button onClick={() => choose("a")} style={{
          padding: "20px", borderRadius: "12px", cursor: chosen ? "default" : "pointer",
          background: chosen === "a" ? "#4ecdc422" : "#1a1a3a",
          border: chosen === "a" ? "2px solid #4ecdc4" : "2px solid #222",
          color: "#e0e0e0", fontSize: "16px", textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          {chosen && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pctA}%`, background: "#4ecdc411", transition: "width 0.5s" }} />}
          <span style={{ position: "relative", zIndex: 1 }}>{q.a}</span>
          {chosen && <div style={{ position: "relative", zIndex: 1, fontSize: "22px", fontWeight: 700, color: "#4ecdc4", marginTop: "8px" }}>{pctA}%</div>}
        </button>

        <div style={{ textAlign: "center", color: "#555", fontSize: "14px", fontWeight: 700 }}>OR</div>

        {/* Option B */}
        <button onClick={() => choose("b")} style={{
          padding: "20px", borderRadius: "12px", cursor: chosen ? "default" : "pointer",
          background: chosen === "b" ? "#ff6b6b22" : "#1a1a3a",
          border: chosen === "b" ? "2px solid #ff6b6b" : "2px solid #222",
          color: "#e0e0e0", fontSize: "16px", textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          {chosen && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pctB}%`, background: "#ff6b6b11", transition: "width 0.5s" }} />}
          <span style={{ position: "relative", zIndex: 1 }}>{q.b}</span>
          {chosen && <div style={{ position: "relative", zIndex: 1, fontSize: "22px", fontWeight: 700, color: "#ff6b6b", marginTop: "8px" }}>{pctB}%</div>}
        </button>
      </div>

      {/* Next */}
      {chosen && (
        <button onClick={next} style={{ padding: "10px 36px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "20px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>Next</button>
      )}

      <div style={{ marginTop: "20px", fontSize: "11px", color: "#444" }}>
        {qIdx + 1} / {filtered.length} questions
      </div>
    </div>
  );
}
