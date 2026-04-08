"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const DB: { country: string; capital: string; flag: string }[] = [
  {country:"India",capital:"New Delhi",flag:"🇮🇳"},{country:"United States",capital:"Washington D.C.",flag:"🇺🇸"},{country:"United Kingdom",capital:"London",flag:"🇬🇧"},{country:"France",capital:"Paris",flag:"🇫🇷"},{country:"Germany",capital:"Berlin",flag:"🇩🇪"},{country:"Japan",capital:"Tokyo",flag:"🇯🇵"},{country:"China",capital:"Beijing",flag:"🇨🇳"},{country:"Russia",capital:"Moscow",flag:"🇷🇺"},{country:"Brazil",capital:"Brasília",flag:"🇧🇷"},{country:"Canada",capital:"Ottawa",flag:"🇨🇦"},{country:"Australia",capital:"Canberra",flag:"🇦🇺"},{country:"Italy",capital:"Rome",flag:"🇮🇹"},{country:"Spain",capital:"Madrid",flag:"🇪🇸"},{country:"Mexico",capital:"Mexico City",flag:"🇲🇽"},{country:"South Korea",capital:"Seoul",flag:"🇰🇷"},{country:"Indonesia",capital:"Jakarta",flag:"🇮🇩"},{country:"Turkey",capital:"Ankara",flag:"🇹🇷"},{country:"Saudi Arabia",capital:"Riyadh",flag:"🇸🇦"},{country:"Argentina",capital:"Buenos Aires",flag:"🇦🇷"},{country:"South Africa",capital:"Pretoria",flag:"🇿🇦"},{country:"Thailand",capital:"Bangkok",flag:"🇹🇭"},{country:"Egypt",capital:"Cairo",flag:"🇪🇬"},{country:"Nigeria",capital:"Abuja",flag:"🇳🇬"},{country:"Pakistan",capital:"Islamabad",flag:"🇵🇰"},{country:"Bangladesh",capital:"Dhaka",flag:"🇧🇩"},{country:"Vietnam",capital:"Hanoi",flag:"🇻🇳"},{country:"Philippines",capital:"Manila",flag:"🇵🇭"},{country:"Malaysia",capital:"Kuala Lumpur",flag:"🇲🇾"},{country:"Singapore",capital:"Singapore",flag:"🇸🇬"},{country:"Nepal",capital:"Kathmandu",flag:"🇳🇵"},{country:"Sri Lanka",capital:"Colombo",flag:"🇱🇰"},{country:"Kenya",capital:"Nairobi",flag:"🇰🇪"},{country:"Ethiopia",capital:"Addis Ababa",flag:"🇪🇹"},{country:"Colombia",capital:"Bogotá",flag:"🇨🇴"},{country:"Chile",capital:"Santiago",flag:"🇨🇱"},{country:"Peru",capital:"Lima",flag:"🇵🇪"},{country:"Venezuela",capital:"Caracas",flag:"🇻🇪"},{country:"Cuba",capital:"Havana",flag:"🇨🇺"},{country:"Jamaica",capital:"Kingston",flag:"🇯🇲"},{country:"Portugal",capital:"Lisbon",flag:"🇵🇹"},{country:"Netherlands",capital:"Amsterdam",flag:"🇳🇱"},{country:"Belgium",capital:"Brussels",flag:"🇧🇪"},{country:"Switzerland",capital:"Bern",flag:"🇨🇭"},{country:"Austria",capital:"Vienna",flag:"🇦🇹"},{country:"Sweden",capital:"Stockholm",flag:"🇸🇪"},{country:"Norway",capital:"Oslo",flag:"🇳🇴"},{country:"Denmark",capital:"Copenhagen",flag:"🇩🇰"},{country:"Finland",capital:"Helsinki",flag:"🇫🇮"},{country:"Poland",capital:"Warsaw",flag:"🇵🇱"},{country:"Greece",capital:"Athens",flag:"🇬🇷"},{country:"Czech Republic",capital:"Prague",flag:"🇨🇿"},{country:"Hungary",capital:"Budapest",flag:"🇭🇺"},{country:"Romania",capital:"Bucharest",flag:"🇷🇴"},{country:"Ireland",capital:"Dublin",flag:"🇮🇪"},{country:"New Zealand",capital:"Wellington",flag:"🇳🇿"},{country:"Ukraine",capital:"Kyiv",flag:"🇺🇦"},{country:"Iran",capital:"Tehran",flag:"🇮🇷"},{country:"Iraq",capital:"Baghdad",flag:"🇮🇶"},{country:"Israel",capital:"Jerusalem",flag:"🇮🇱"},{country:"UAE",capital:"Abu Dhabi",flag:"🇦🇪"},{country:"Qatar",capital:"Doha",flag:"🇶🇦"},{country:"Morocco",capital:"Rabat",flag:"🇲🇦"},{country:"Algeria",capital:"Algiers",flag:"🇩🇿"},{country:"Tanzania",capital:"Dodoma",flag:"🇹🇿"},{country:"Ghana",capital:"Accra",flag:"🇬🇭"},{country:"Uganda",capital:"Kampala",flag:"🇺🇬"},{country:"Myanmar",capital:"Naypyidaw",flag:"🇲🇲"},{country:"Afghanistan",capital:"Kabul",flag:"🇦🇫"},{country:"Cambodia",capital:"Phnom Penh",flag:"🇰🇭"},{country:"Laos",capital:"Vientiane",flag:"🇱🇦"},{country:"Mongolia",capital:"Ulaanbaatar",flag:"🇲🇳"},{country:"North Korea",capital:"Pyongyang",flag:"🇰🇵"},{country:"Iceland",capital:"Reykjavik",flag:"🇮🇸"},{country:"Croatia",capital:"Zagreb",flag:"🇭🇷"},{country:"Serbia",capital:"Belgrade",flag:"🇷🇸"},{country:"Bulgaria",capital:"Sofia",flag:"🇧🇬"},{country:"Slovakia",capital:"Bratislava",flag:"🇸🇰"},{country:"Lithuania",capital:"Vilnius",flag:"🇱🇹"},{country:"Latvia",capital:"Riga",flag:"🇱🇻"},{country:"Estonia",capital:"Tallinn",flag:"🇪🇪"},{country:"Luxembourg",capital:"Luxembourg City",flag:"🇱🇺"},{country:"Malta",capital:"Valletta",flag:"🇲🇹"},{country:"Cyprus",capital:"Nicosia",flag:"🇨🇾"},{country:"Jordan",capital:"Amman",flag:"🇯🇴"},{country:"Lebanon",capital:"Beirut",flag:"🇱🇧"},{country:"Kuwait",capital:"Kuwait City",flag:"🇰🇼"},{country:"Oman",capital:"Muscat",flag:"🇴🇲"},{country:"Bahrain",capital:"Manama",flag:"🇧🇭"},{country:"Bolivia",capital:"Sucre",flag:"🇧🇴"},{country:"Paraguay",capital:"Asunción",flag:"🇵🇾"},{country:"Uruguay",capital:"Montevideo",flag:"🇺🇾"},{country:"Ecuador",capital:"Quito",flag:"🇪🇨"},{country:"Costa Rica",capital:"San José",flag:"🇨🇷"},{country:"Panama",capital:"Panama City",flag:"🇵🇦"},{country:"Guatemala",capital:"Guatemala City",flag:"🇬🇹"},{country:"Honduras",capital:"Tegucigalpa",flag:"🇭🇳"},{country:"Dominican Republic",capital:"Santo Domingo",flag:"🇩🇴"},{country:"Haiti",capital:"Port-au-Prince",flag:"🇭🇹"},{country:"Fiji",capital:"Suva",flag:"🇫🇯"},{country:"Bhutan",capital:"Thimphu",flag:"🇧🇹"},{country:"Maldives",capital:"Malé",flag:"🇲🇻"},
];

type Mode = "flags" | "capitals";
type Phase = "menu" | "playing" | "results";

function shuffle<T>(arr: T[]): T[] { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function genOptions(correct: string, all: string[]): string[] {
  const opts = new Set([correct]);
  const pool = all.filter(x => x !== correct);
  while (opts.size < 4 && pool.length > 0) { const idx = Math.floor(Math.random() * pool.length); opts.add(pool.splice(idx, 1)[0]); }
  return shuffle([...opts]);
}

export default function GeoQuiz() {
  const [mode, setMode] = useState<Mode>("flags");
  const [phase, setPhase] = useState<Phase>("menu");
  const [questions, setQuestions] = useState<typeof DB>([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const TOTAL = 20;
  const q = questions[qIdx];
  const allCountries = DB.map(d => d.country);
  const allCapitals = DB.map(d => d.capital);

  const startGame = (m: Mode) => {
    setMode(m);
    setQuestions(shuffle(DB).slice(0, TOTAL));
    setQIdx(0); setScore(0); setStreak(0); setBestStreak(0); setResults([]); setSelected(null); setTimeLeft(15);
    setPhase("playing");
  };

  const correctAnswer = q ? (mode === "flags" ? q.country : q.capital) : "";
  const options = q ? genOptions(correctAnswer, mode === "flags" ? allCountries : allCapitals) : [];

  const nextQ = useCallback(() => {
    if (qIdx + 1 >= TOTAL) { setPhase("results"); } else { setQIdx(i => i + 1); setSelected(null); setTimeLeft(15); }
  }, [qIdx]);

  const answer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    clearInterval(timerRef.current);
    const correct = opt === correctAnswer;
    if (correct) { setScore(s => s + 1); setStreak(s => { const n = s + 1; if (n > bestStreak) setBestStreak(n); return n; }); }
    else setStreak(0);
    setResults(r => [...r, { correct }]);
    setTimeout(nextQ, 1000);
  };

  useEffect(() => {
    if (phase !== "playing" || selected) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setSelected("__timeout__"); setStreak(0); setResults(r => [...r, { correct: false }]); setTimeout(nextQ, 1000); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, qIdx, selected, nextQ]);

  const accuracy = results.length > 0 ? Math.round((score / results.length) * 100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:20, minHeight:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e0e0e0", background:"#0a0a1a" }}>
      <div style={{ fontSize:24, fontWeight:800, marginBottom:4, background:"linear-gradient(135deg,#22c55e,#3b82f6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>GeoQuiz</div>
      <div style={{ fontSize:12, color:"#666", marginBottom:20 }}>{DB.length} countries</div>

      {phase === "menu" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🌍</div>
          <button onClick={() => startGame("flags")} style={{ padding:"14px 40px", borderRadius:12, border:"none", background:"#22c55e", color:"#000", fontWeight:700, fontSize:16, cursor:"pointer", width:260 }}>🏴 Guess Country from Flag</button>
          <button onClick={() => startGame("capitals")} style={{ padding:"14px 40px", borderRadius:12, border:"none", background:"#3b82f6", color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", width:260 }}>🏛️ Guess the Capital</button>
        </div>
      )}

      {phase === "playing" && q && (
        <div style={{ width:"100%", maxWidth:420 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:"#888" }}>
            <span>Q {qIdx + 1}/{TOTAL}</span>
            <span>Score: <b style={{ color:"#22c55e" }}>{score}</b></span>
            <span>Streak: <b style={{ color:"#eab308" }}>{streak}</b>🔥</span>
          </div>
          {/* Timer bar */}
          <div style={{ height:6, borderRadius:3, background:"#222", marginBottom:16 }}>
            <div style={{ height:6, borderRadius:3, background: timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#eab308" : "#ef4444", width:`${(timeLeft/15)*100}%`, transition:"width 1s linear" }} />
          </div>
          {/* Question */}
          <div style={{ textAlign:"center", marginBottom:20 }}>
            {mode === "flags" ? (
              <>
                <div style={{ fontSize:64, marginBottom:8 }}>{q.flag}</div>
                <div style={{ fontSize:16, color:"#aaa" }}>Which country is this?</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:18, fontWeight:600, color:"#fff", marginBottom:4 }}>{q.country} {q.flag}</div>
                <div style={{ fontSize:16, color:"#aaa" }}>What is the capital?</div>
              </>
            )}
          </div>
          {/* Options */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {options.map(opt => {
              const isCorrect = opt === correctAnswer;
              const isSelected = opt === selected;
              const showResult = selected !== null;
              let bg = "#1a1a2e";
              if (showResult) { if (isCorrect) bg = "#14532d"; else if (isSelected) bg = "#7f1d1d"; }
              let color = "#fff";
              if (showResult) { if (isCorrect) color = "#22c55e"; else if (isSelected) color = "#ef4444"; else color = "#666"; }
              return (
                <button key={opt} onClick={() => answer(opt)} style={{ padding:16, borderRadius:10, border: showResult && isCorrect ? "2px solid #22c55e" : "1px solid #333", background:bg, color, fontSize:14, fontWeight:600, cursor: selected ? "default" : "pointer", transition:"all 0.2s" }}>{opt}</button>
              );
            })}
          </div>
          {selected === "__timeout__" && <div style={{ textAlign:"center", color:"#eab308", marginTop:12, fontWeight:600 }}>⏰ Time's up! Answer: {correctAnswer}</div>}
        </div>
      )}

      {phase === "results" && (
        <div style={{ textAlign:"center", width:"100%", maxWidth:420 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>{accuracy >= 80 ? "🏆" : accuracy >= 50 ? "👍" : "📚"}</div>
          <div style={{ fontSize:28, fontWeight:800, color: accuracy >= 80 ? "#22c55e" : accuracy >= 50 ? "#eab308" : "#ef4444", marginBottom:4 }}>{score}/{TOTAL}</div>
          <div style={{ fontSize:14, color:"#888", marginBottom:16 }}>{accuracy}% accuracy · Best streak: {bestStreak}🔥</div>
          <div style={{ display:"flex", justifyContent:"center", gap:4, flexWrap:"wrap" as const, marginBottom:20 }}>
            {results.map((r, i) => <div key={i} style={{ width:16, height:16, borderRadius:4, background: r.correct ? "#22c55e" : "#ef4444" }} />)}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button onClick={() => startGame(mode)} style={{ padding:"12px 28px", borderRadius:10, border:"none", background:"#22c55e", color:"#000", fontWeight:700, cursor:"pointer" }}>Play Again</button>
            <button onClick={() => setPhase("menu")} style={{ padding:"12px 28px", borderRadius:10, border:"1px solid #333", background:"#1a1a2e", color:"#aaa", cursor:"pointer" }}>Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
