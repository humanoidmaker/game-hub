"use client";
import { useState } from "react";

const WEATHERS = [
  { name:"Sunny ☀️", demand:1.2, color:"#eab308" },
  { name:"Hot 🔥", demand:1.5, color:"#ef4444" },
  { name:"Cloudy ☁️", demand:0.9, color:"#94a3b8" },
  { name:"Rainy 🌧️", demand:0.5, color:"#3b82f6" },
  { name:"Stormy ⛈️", demand:0.3, color:"#6366f1" },
  { name:"Windy 💨", demand:0.7, color:"#06b6d4" },
];

type Phase = "setup" | "result" | "final";

export default function LemonadeStand() {
  const [day, setDay] = useState(1);
  const [phase, setPhase] = useState<Phase>("setup");
  const [balance, setBalance] = useState(20);
  const [lemons, setLemons] = useState(10);
  const [sugar, setSugar] = useState(10);
  const [cups, setCups] = useState(10);
  const [recipe, setRecipe] = useState({ lemons: 2, sugar: 3 });
  const [price, setPrice] = useState(1.5);
  const [weather, setWeather] = useState(WEATHERS[0]);
  const [dayResult, setDayResult] = useState({ customers: 0, revenue: 0, costs: 0, profit: 0 });
  const [history, setHistory] = useState<{ day: number; profit: number; weather: string }[]>([]);

  const TOTAL_DAYS = 10;

  const buy = (item: "lemons" | "sugar" | "cups", qty: number, cost: number) => {
    if (balance < cost) return;
    setBalance(b => b - cost);
    if (item === "lemons") setLemons(l => l + qty);
    if (item === "sugar") setSugar(s => s + qty);
    if (item === "cups") setCups(c => c + qty);
  };

  const sellDay = () => {
    const w = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    setWeather(w);
    const quality = Math.min(1, (recipe.lemons * 0.3 + recipe.sugar * 0.2));
    const priceEffect = Math.max(0, 1 - (price - 1) * 0.3);
    const baseDemand = 15 + Math.floor(Math.random() * 10);
    const demand = Math.floor(baseDemand * w.demand * priceEffect * quality);
    const maxCups = Math.min(cups, Math.floor(lemons / recipe.lemons), Math.floor(sugar / recipe.sugar));
    const served = Math.min(demand, maxCups);
    const revenue = +(served * price).toFixed(2);
    const usedLemons = served * recipe.lemons;
    const usedSugar = served * recipe.sugar;
    setLemons(l => l - usedLemons);
    setSugar(s => s - usedSugar);
    setCups(c => c - served);
    const profit = revenue;
    setBalance(b => +(b + revenue).toFixed(2));
    setDayResult({ customers: served, revenue, costs: 0, profit });
    setHistory(h => [...h, { day, profit, weather: w.name }]);
    setPhase("result");
  };

  const nextDay = () => {
    if (day >= TOTAL_DAYS) { setPhase("final"); return; }
    setDay(d => d + 1);
    setPhase("setup");
  };

  const restart = () => { setDay(1); setPhase("setup"); setBalance(20); setLemons(10); setSugar(10); setCups(10); setRecipe({ lemons:2, sugar:3 }); setPrice(1.5); setHistory([]); };

  const totalProfit = history.reduce((s, h) => s + h.profit, 0);

  const s: Record<string, React.CSSProperties> = {
    wrap: { display:"flex", flexDirection:"column", alignItems:"center", padding:20, minHeight:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e0e0e0", background:"#0a0a1a" },
    title: { fontSize:24, fontWeight:800, marginBottom:4, background:"linear-gradient(135deg,#eab308,#22c55e)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
    card: { width:"100%", maxWidth:420, background:"#111", borderRadius:12, padding:16, marginBottom:12, border:"1px solid #222" },
    label: { fontSize:12, color:"#888", marginBottom:6 },
    row: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
    btn: { padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600 },
    bigBtn: { padding:"14px 40px", borderRadius:12, border:"none", cursor:"pointer", fontSize:16, fontWeight:700, background:"#22c55e", color:"#000", width:"100%", maxWidth:420 },
    stat: { textAlign:"center" as const, padding:"8px 16px" },
  };

  return (
    <div style={s.wrap}>
      <div style={s.title}>🍋 Lemonade Stand</div>
      <div style={{ fontSize:12, color:"#666", marginBottom:16 }}>Build your lemonade empire!</div>

      <div style={{ display:"flex", gap:16, marginBottom:12, fontSize:13 }}>
        <span>Day <b style={{ color:"#eab308" }}>{day}/{TOTAL_DAYS}</b></span>
        <span>Balance <b style={{ color:"#22c55e" }}>${balance.toFixed(2)}</b></span>
      </div>

      {phase === "setup" && (
        <>
          <div style={s.card}>
            <div style={s.label}>📦 INVENTORY</div>
            <div style={s.row}><span>🍋 Lemons: {lemons}</span><div><button onClick={() => buy("lemons",5,2)} style={{ ...s.btn, background:"#1e1e2e", color:"#eab308", marginRight:4 }}>+5 ($2)</button><button onClick={() => buy("lemons",15,5)} style={{ ...s.btn, background:"#1e1e2e", color:"#eab308" }}>+15 ($5)</button></div></div>
            <div style={s.row}><span>🍬 Sugar: {sugar}</span><div><button onClick={() => buy("sugar",5,1)} style={{ ...s.btn, background:"#1e1e2e", color:"#ec4899", marginRight:4 }}>+5 ($1)</button><button onClick={() => buy("sugar",15,2.5)} style={{ ...s.btn, background:"#1e1e2e", color:"#ec4899" }}>+15 ($2.50)</button></div></div>
            <div style={s.row}><span>🥤 Cups: {cups}</span><div><button onClick={() => buy("cups",10,1)} style={{ ...s.btn, background:"#1e1e2e", color:"#3b82f6", marginRight:4 }}>+10 ($1)</button><button onClick={() => buy("cups",25,2)} style={{ ...s.btn, background:"#1e1e2e", color:"#3b82f6" }}>+25 ($2)</button></div></div>
          </div>

          <div style={s.card}>
            <div style={s.label}>🧪 RECIPE (per cup)</div>
            <div style={s.row}><span>Lemons: {recipe.lemons}</span><div><button onClick={() => setRecipe(r => ({...r, lemons: Math.max(1, r.lemons-1)}))} style={{ ...s.btn, background:"#1e1e2e", color:"#888" }}>-</button><button onClick={() => setRecipe(r => ({...r, lemons: Math.min(5, r.lemons+1)}))} style={{ ...s.btn, background:"#1e1e2e", color:"#888", marginLeft:4 }}>+</button></div></div>
            <div style={s.row}><span>Sugar: {recipe.sugar}</span><div><button onClick={() => setRecipe(r => ({...r, sugar: Math.max(1, r.sugar-1)}))} style={{ ...s.btn, background:"#1e1e2e", color:"#888" }}>-</button><button onClick={() => setRecipe(r => ({...r, sugar: Math.min(5, r.sugar+1)}))} style={{ ...s.btn, background:"#1e1e2e", color:"#888", marginLeft:4 }}>+</button></div></div>
          </div>

          <div style={s.card}>
            <div style={s.label}>💰 PRICE PER CUP</div>
            <div style={{ textAlign:"center", fontSize:28, fontWeight:800, color:"#22c55e", marginBottom:8 }}>${price.toFixed(2)}</div>
            <input type="range" min={25} max={500} value={price * 100} onChange={e => setPrice(+e.target.value / 100)} style={{ width:"100%" }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#666" }}><span>$0.25</span><span>$5.00</span></div>
          </div>

          <button onClick={sellDay} style={s.bigBtn}>☀️ Open for Business!</button>
        </>
      )}

      {phase === "result" && (
        <div style={{ ...s.card, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>{weather.name}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:24, marginBottom:16 }}>
            <div style={s.stat}><div style={{ fontSize:11, color:"#888" }}>Customers</div><div style={{ fontSize:24, fontWeight:700, color:"#3b82f6" }}>{dayResult.customers}</div></div>
            <div style={s.stat}><div style={{ fontSize:11, color:"#888" }}>Revenue</div><div style={{ fontSize:24, fontWeight:700, color:"#22c55e" }}>${dayResult.revenue.toFixed(2)}</div></div>
          </div>
          <button onClick={nextDay} style={s.bigBtn}>{day >= TOTAL_DAYS ? "📊 See Final Results" : `Day ${day + 1} →`}</button>
        </div>
      )}

      {phase === "final" && (
        <div style={{ textAlign:"center", width:"100%", maxWidth:420 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>{totalProfit >= 50 ? "🏆" : totalProfit >= 20 ? "👍" : "📚"}</div>
          <div style={{ fontSize:28, fontWeight:800, color:"#22c55e", marginBottom:4 }}>Total: ${totalProfit.toFixed(2)}</div>
          <div style={{ fontSize:13, color:"#888", marginBottom:16 }}>{totalProfit >= 50 ? "Lemonade Tycoon!" : totalProfit >= 20 ? "Good work!" : "Try a different strategy!"}</div>
          <div style={{ ...s.card }}>
            {history.map((h, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #222", fontSize:13 }}>
                <span>Day {h.day}</span><span>{h.weather}</span><span style={{ color: h.profit > 0 ? "#22c55e" : "#ef4444", fontWeight:600 }}>${h.profit.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <button onClick={restart} style={{ ...s.bigBtn, marginTop:12 }}>Play Again</button>
        </div>
      )}
    </div>
  );
}
