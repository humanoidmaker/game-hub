import { useState, useEffect, useRef } from "react";

interface CropDef {
  type: string;
  emoji: string;
  growTime: number;
  sellPrice: number;
  seedCost: number;
}

interface Plot {
  planted: string | null;
  plantedAt: number | null;
  ready: boolean;
}

const CROPS: CropDef[] = [
  { type: "wheat", emoji: "\ud83c\udf3e", growTime: 20, sellPrice: 5, seedCost: 2 },
  { type: "corn", emoji: "\ud83c\udf3d", growTime: 35, sellPrice: 10, seedCost: 4 },
  { type: "tomato", emoji: "\ud83c\udf45", growTime: 50, sellPrice: 18, seedCost: 7 },
  { type: "carrot", emoji: "\ud83e\udd55", growTime: 25, sellPrice: 8, seedCost: 3 },
  { type: "eggplant", emoji: "\ud83c\udf46", growTime: 60, sellPrice: 25, seedCost: 10 },
];

interface Upgrade {
  id: string;
  name: string;
  desc: string;
  cost: number;
  bought: boolean;
}

export default function FarmSim() {
  const [coins, setCoins] = useState(20);
  const [totalEarned, setTotalEarned] = useState(0);
  const [day, setDay] = useState(1);
  const [plots, setPlots] = useState<Plot[]>(
    Array(9).fill(null).map(() => ({ planted: null, plantedAt: null, ready: false }))
  );
  const [selectedCrop, setSelectedCrop] = useState<string>("wheat");
  const [message, setMessage] = useState("Welcome to your farm! Plant some crops.");
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    { id: "speed1", name: "Fertilizer", desc: "Crops grow 30% faster", cost: 30, bought: false },
    { id: "auto", name: "Auto-Harvest", desc: "Auto-harvest ready crops", cost: 60, bought: false },
    { id: "speed2", name: "Super Soil", desc: "Crops grow 50% faster", cost: 100, bought: false },
    { id: "plots", name: "Extra Plots", desc: "Expand to 4x4 farm", cost: 80, bought: false },
    { id: "premium", name: "Premium Seeds", desc: "Sell price +50%", cost: 120, bought: false },
  ]);
  const [harvested, setHarvested] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const dayTimerRef = useRef<ReturnType<typeof setInterval>>();

  const getGrowthMultiplier = () => {
    let mult = 1;
    if (upgrades.find(u => u.id === "speed1")?.bought) mult *= 0.7;
    if (upgrades.find(u => u.id === "speed2")?.bought) mult *= 0.5;
    return mult;
  };

  const getSellMultiplier = () => {
    return upgrades.find(u => u.id === "premium")?.bought ? 1.5 : 1;
  };

  const hasAutoHarvest = upgrades.find(u => u.id === "auto")?.bought;
  const hasExtraPlots = upgrades.find(u => u.id === "plots")?.bought;

  useEffect(() => {
    if (hasExtraPlots && plots.length === 9) {
      setPlots(prev => [...prev, ...Array(7).fill(null).map(() => ({ planted: null, plantedAt: null, ready: false }))]);
    }
  }, [hasExtraPlots]);

  // Growth timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setPlots(prev => prev.map(plot => {
        if (!plot.planted || !plot.plantedAt || plot.ready) return plot;
        const crop = CROPS.find(c => c.type === plot.planted);
        if (!crop) return plot;
        const growTime = crop.growTime * 1000 * getGrowthMultiplier();
        if (now - plot.plantedAt >= growTime) {
          return { ...plot, ready: true };
        }
        return plot;
      }));
    }, 500);

    return () => clearInterval(timerRef.current);
  }, [upgrades]);

  // Auto-harvest
  useEffect(() => {
    if (!hasAutoHarvest) return;
    const interval = setInterval(() => {
      setPlots(prev => {
        let earned = 0;
        let count = 0;
        const newPlots = prev.map(plot => {
          if (plot.ready && plot.planted) {
            const crop = CROPS.find(c => c.type === plot.planted);
            if (crop) {
              earned += Math.floor(crop.sellPrice * getSellMultiplier());
              count++;
            }
            return { planted: null, plantedAt: null, ready: false };
          }
          return plot;
        });
        if (earned > 0) {
          setCoins(c => c + earned);
          setTotalEarned(t => t + earned);
          setHarvested(h => h + count);
          setMessage(`Auto-harvested ${count} crops for ${earned} coins!`);
        }
        return newPlots;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [hasAutoHarvest, upgrades]);

  // Day counter
  useEffect(() => {
    dayTimerRef.current = setInterval(() => {
      setDay(d => d + 1);
    }, 30000);
    return () => clearInterval(dayTimerRef.current);
  }, []);

  const plantCrop = (index: number) => {
    const plot = plots[index];
    if (plot.planted && !plot.ready) return;

    if (plot.ready) {
      const crop = CROPS.find(c => c.type === plot.planted);
      if (crop) {
        const earned = Math.floor(crop.sellPrice * getSellMultiplier());
        setCoins(c => c + earned);
        setTotalEarned(t => t + earned);
        setHarvested(h => h + 1);
        setMessage(`Harvested ${crop.emoji} ${crop.type} for ${earned} coins!`);
      }
      setPlots(prev => {
        const n = [...prev];
        n[index] = { planted: null, plantedAt: null, ready: false };
        return n;
      });
      return;
    }

    const crop = CROPS.find(c => c.type === selectedCrop);
    if (!crop) return;
    if (coins < crop.seedCost) {
      setMessage("Not enough coins for seeds!");
      return;
    }
    setCoins(c => c - crop.seedCost);
    setPlots(prev => {
      const n = [...prev];
      n[index] = { planted: crop.type, plantedAt: Date.now(), ready: false };
      return n;
    });
    setMessage(`Planted ${crop.emoji} ${crop.type}!`);
  };

  const buyUpgrade = (id: string) => {
    const upgrade = upgrades.find(u => u.id === id);
    if (!upgrade || upgrade.bought) return;
    if (coins < upgrade.cost) {
      setMessage("Not enough coins!");
      return;
    }
    setCoins(c => c - upgrade.cost);
    setUpgrades(prev => prev.map(u => u.id === id ? { ...u, bought: true } : u));
    setMessage(`Bought ${upgrade.name}!`);
  };

  const getGrowthPercent = (plot: Plot) => {
    if (!plot.planted || !plot.plantedAt || plot.ready) return 100;
    const crop = CROPS.find(c => c.type === plot.planted);
    if (!crop) return 0;
    const growTime = crop.growTime * 1000 * getGrowthMultiplier();
    const elapsed = Date.now() - plot.plantedAt;
    return Math.min(100, (elapsed / growTime) * 100);
  };

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 500);
    return () => clearInterval(interval);
  }, []);

  const gridCols = hasExtraPlots ? 4 : 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, background: "#0a0a1a", minHeight: "100vh", color: "#ccc", fontFamily: "system-ui" }}>
      <h2 style={{ color: "#22c55e", margin: 0, marginBottom: 4, fontSize: 22 }}>{"\ud83c\udf3e"} Farm Simulator</h2>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: "#eab308" }}>{"\ud83e\ude99"} {coins} coins</span>
        <span style={{ color: "#22c55e" }}>{"\ud83c\udf3e"} {harvested} harvested</span>
        <span style={{ color: "#3b82f6" }}>{"\ud83d\udcc5"} Day {day}</span>
        <span style={{ color: "#a855f7" }}>{"\ud83d\udcb0"} {totalEarned} earned</span>
      </div>

      {/* Message */}
      <div style={{
        background: "#111", border: "1px solid #222", borderRadius: 8,
        padding: "6px 14px", marginBottom: 10, fontSize: 13, color: "#aaa",
        maxWidth: 400, textAlign: "center",
      }}>{message}</div>

      {/* Seed selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {CROPS.map(crop => (
          <button key={crop.type} onClick={() => setSelectedCrop(crop.type)} style={{
            background: selectedCrop === crop.type ? "#1a3a1a" : "#111",
            border: selectedCrop === crop.type ? "2px solid #22c55e" : "1px solid #333",
            borderRadius: 8, padding: "6px 10px", cursor: "pointer",
            color: "#ccc", fontSize: 12, display: "flex", flexDirection: "column",
            alignItems: "center", minWidth: 60,
          }}>
            <span style={{ fontSize: 20 }}>{crop.emoji}</span>
            <span>{crop.type}</span>
            <span style={{ color: "#eab308", fontSize: 10 }}>{crop.seedCost}{"\ud83e\ude99"} / {Math.floor(crop.sellPrice * getSellMultiplier())}{"\ud83e\ude99"}</span>
            <span style={{ color: "#666", fontSize: 10 }}>{Math.floor(crop.growTime * getGrowthMultiplier())}s</span>
          </button>
        ))}
      </div>

      {/* Farm grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridCols}, 80px)`,
        gap: 6,
        marginBottom: 12,
      }}>
        {plots.map((plot, i) => {
          const crop = CROPS.find(c => c.type === plot.planted);
          const pct = getGrowthPercent(plot);

          return (
            <button key={i} onClick={() => plantCrop(i)} style={{
              width: 80, height: 80,
              background: plot.ready ? "#1a3a0a" : plot.planted ? "#111a11" : "#0d0d1a",
              border: plot.ready ? "2px solid #22c55e" : "1px solid #222",
              borderRadius: 10, cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
              transition: "all 0.2s",
            }}>
              {plot.planted && !plot.ready && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0,
                  width: `${pct}%`, height: 4,
                  background: "#22c55e", borderRadius: "0 0 10px 10px",
                }} />
              )}

              {plot.planted && crop ? (
                <>
                  <span style={{
                    fontSize: plot.ready ? 32 : 24,
                    filter: plot.ready ? "none" : `grayscale(${100 - pct}%)`,
                    transition: "all 0.3s",
                  }}>
                    {crop.emoji}
                  </span>
                  {plot.ready ? (
                    <span style={{ fontSize: 10, color: "#22c55e", fontWeight: "bold" }}>HARVEST!</span>
                  ) : (
                    <span style={{ fontSize: 9, color: "#666" }}>{Math.floor(pct)}%</span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upgrades */}
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h3 style={{ color: "#a855f7", fontSize: 15, marginBottom: 6 }}>{"\ud83d\udee0\ufe0f"} Upgrades</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {upgrades.map(u => (
            <button key={u.id} onClick={() => buyUpgrade(u.id)} disabled={u.bought || coins < u.cost} style={{
              background: u.bought ? "#0a2a0a" : "#111",
              border: u.bought ? "1px solid #22c55e44" : "1px solid #333",
              borderRadius: 8, padding: "8px 12px", cursor: u.bought ? "default" : "pointer",
              color: "#ccc", fontSize: 12, textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              opacity: u.bought ? 0.6 : coins < u.cost ? 0.5 : 1,
            }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 13 }}>{u.name}</div>
                <div style={{ color: "#888", fontSize: 11 }}>{u.desc}</div>
              </div>
              <span style={{ color: u.bought ? "#22c55e" : "#eab308", fontWeight: "bold", fontSize: 13, minWidth: 50, textAlign: "right" }}>
                {u.bought ? "\u2713 Owned" : `${u.cost}${"\ud83e\ude99"}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p style={{ color: "#444", fontSize: 10, marginTop: 12 }}>Click empty plot to plant, click ready crop to harvest</p>
    </div>
  );
}
