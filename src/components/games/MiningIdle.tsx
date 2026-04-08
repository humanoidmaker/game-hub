"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* ─── Types ─── */
interface Resource {
  name: string;
  icon: string;
  color: string;
  baseChance: number;
  value: number;
  minDepth: number;
  amount: number;
}

interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMult: number;
  level: number;
}

interface SaveData {
  coins: number;
  depth: number;
  resources: number[];
  upgrades: number[];
  totalMined: number;
}

/* ─── Constants ─── */
const BG = "#0a0a1a";
const ACCENT = "#f59e0b";
const CARD = "#141428";
const BTN = "#7c3aed";

const INIT_RESOURCES: Resource[] = [
  { name: "Stone", icon: "\u25a0", color: "#94a3b8", baseChance: 0.6, value: 1, minDepth: 0, amount: 0 },
  { name: "Iron", icon: "\u25c6", color: "#a1a1aa", baseChance: 0.25, value: 5, minDepth: 0, amount: 0 },
  { name: "Gold", icon: "\u2605", color: "#f59e0b", baseChance: 0.1, value: 25, minDepth: 10, amount: 0 },
  { name: "Diamond", icon: "\u2666", color: "#06b6d4", baseChance: 0.04, value: 100, minDepth: 30, amount: 0 },
  { name: "Ruby", icon: "\u2764", color: "#ef4444", baseChance: 0.01, value: 500, minDepth: 50, amount: 0 },
];

const INIT_UPGRADES: Upgrade[] = [
  { id: "pickaxe", name: "Better Pickaxe", description: "+1 resource per click", baseCost: 50, costMult: 1.8, level: 0 },
  { id: "automine", name: "Auto-Mine", description: "Mine 1/sec per level", baseCost: 200, costMult: 2.2, level: 0 },
  { id: "depth", name: "Deeper Shaft", description: "+10 depth per level", baseCost: 100, costMult: 1.6, level: 0 },
  { id: "luck", name: "Lucky Charm", description: "+5% rare chance per level", baseCost: 300, costMult: 2.0, level: 0 },
  { id: "value", name: "Appraisal", description: "+20% sell value per level", baseCost: 500, costMult: 2.5, level: 0 },
];

function getUpgradeCost(u: Upgrade): number {
  return Math.floor(u.baseCost * Math.pow(u.costMult, u.level));
}

export default function MiningIdle() {
  const [coins, setCoins] = useState(0);
  const [depth, setDepth] = useState(5);
  const [resources, setResources] = useState<Resource[]>(INIT_RESOURCES.map((r) => ({ ...r })));
  const [upgrades, setUpgrades] = useState<Upgrade[]>(INIT_UPGRADES.map((u) => ({ ...u })));
  const [totalMined, setTotalMined] = useState(0);
  const [clickAnim, setClickAnim] = useState(false);
  const [lastMined, setLastMined] = useState<string | null>(null);
  const [floatingText, setFloatingText] = useState<{ text: string; color: string; id: number }[]>([]);
  const floatIdRef = useRef(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load save
  useEffect(() => {
    try {
      const raw = localStorage.getItem("miningidle_save");
      if (raw) {
        const save: SaveData = JSON.parse(raw);
        setCoins(save.coins);
        setDepth(save.depth);
        setResources((prev) =>
          prev.map((r, i) => ({ ...r, amount: save.resources[i] || 0 }))
        );
        setUpgrades((prev) =>
          prev.map((u, i) => ({ ...u, level: save.upgrades[i] || 0 }))
        );
        setTotalMined(save.totalMined);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-save every 5 seconds
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const save: SaveData = {
          coins,
          depth,
          resources: resources.map((r) => r.amount),
          upgrades: upgrades.map((u) => u.level),
          totalMined,
        };
        localStorage.setItem("miningidle_save", JSON.stringify(save));
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [coins, depth, resources, upgrades, totalMined]);

  const mine = useCallback(
    (multi: number = 1) => {
      const pickLevel = upgrades.find((u) => u.id === "pickaxe")!.level;
      const luckLevel = upgrades.find((u) => u.id === "luck")!.level;
      const perClick = 1 + pickLevel;
      const count = perClick * multi;

      const newResources = resources.map((r) => ({ ...r }));
      let minedName = "";

      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        let cumulative = 0;
        for (let j = newResources.length - 1; j >= 0; j--) {
          const res = newResources[j];
          if (depth < res.minDepth) continue;
          const chance = res.baseChance * (1 + luckLevel * 0.05);
          cumulative += chance;
          if (roll < cumulative || j === 0) {
            res.amount++;
            minedName = res.name;
            break;
          }
        }
      }

      setResources(newResources);
      setTotalMined((t) => t + count);
      if (minedName) setLastMined(minedName);

      const mined = newResources.find((r) => r.name === minedName);
      if (mined) {
        const fid = floatIdRef.current++;
        setFloatingText((prev) => [
          ...prev.slice(-6),
          { text: `+${count} ${mined.icon}`, color: mined.color, id: fid },
        ]);
        setTimeout(() => setFloatingText((prev) => prev.filter((f) => f.id !== fid)), 1200);
      }
    },
    [resources, upgrades, depth]
  );

  // Auto-mine
  useEffect(() => {
    const autoLevel = upgrades.find((u) => u.id === "automine")!.level;
    if (autoRef.current) clearInterval(autoRef.current);
    if (autoLevel > 0) {
      autoRef.current = setInterval(() => mine(autoLevel), 1000);
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [upgrades, mine]);

  const sellAll = () => {
    const valueLevel = upgrades.find((u) => u.id === "value")!.level;
    const mult = 1 + valueLevel * 0.2;
    let total = 0;
    const newRes = resources.map((r) => {
      total += Math.floor(r.amount * r.value * mult);
      return { ...r, amount: 0 };
    });
    setResources(newRes);
    setCoins((c) => c + total);
    if (total > 0) {
      const fid = floatIdRef.current++;
      setFloatingText((prev) => [
        ...prev.slice(-6),
        { text: `+${total} coins`, color: ACCENT, id: fid },
      ]);
      setTimeout(() => setFloatingText((prev) => prev.filter((f) => f.id !== fid)), 1200);
    }
  };

  const buyUpgrade = (idx: number) => {
    const u = upgrades[idx];
    const cost = getUpgradeCost(u);
    if (coins < cost) return;
    setCoins((c) => c - cost);
    setUpgrades((prev) => {
      const next = prev.map((up) => ({ ...up }));
      next[idx].level++;
      return next;
    });
    if (u.id === "depth") {
      setDepth((d) => d + 10);
    }
  };

  const handleMineClick = () => {
    mine(1);
    setClickAnim(true);
    setTimeout(() => setClickAnim(false), 150);
  };

  const depthPct = Math.min(100, (depth / 100) * 100);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#e2e8f0", fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ textAlign: "center", fontSize: 28, color: ACCENT, marginBottom: 4 }}>Mining Idle</h1>
      <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 16 }}>
        Click to mine. Sell resources. Buy upgrades. Go deeper!
      </p>

      {/* Coins */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: "#64748b" }}>Coins: </span>
        <span style={{ fontSize: 28, fontWeight: 700, color: ACCENT }}>{coins.toLocaleString()}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", maxWidth: 700, margin: "0 auto" }}>
        {/* Left: Mine area */}
        <div style={{ textAlign: "center" }}>
          {/* Pickaxe button */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <button
              onClick={handleMineClick}
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: `radial-gradient(circle, #2d1b69, #1a103d)`,
                border: `3px solid ${ACCENT}`,
                cursor: "pointer",
                fontSize: 48,
                color: "#fff",
                transition: "transform 0.1s",
                transform: clickAnim ? "scale(0.9)" : "scale(1)",
                boxShadow: `0 0 30px ${ACCENT}40`,
              }}
            >
              {"\u26cf"}
            </button>
            {/* Floating text */}
            {floatingText.map((f) => (
              <div
                key={f.id}
                style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: f.color,
                  fontWeight: 700,
                  fontSize: 16,
                  animation: "none",
                  pointerEvents: "none",
                  opacity: 0.9,
                }}
              >
                {f.text}
              </div>
            ))}
          </div>

          {/* Depth meter */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
              Depth: {depth}m
            </div>
            <div style={{ width: 160, height: 8, background: "#1e1e3a", borderRadius: 4, margin: "0 auto" }}>
              <div
                style={{
                  width: `${depthPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                  borderRadius: 4,
                  transition: "width 0.3s",
                }}
              />
            </div>
          </div>

          {/* Resources */}
          <div style={{ background: CARD, borderRadius: 12, padding: 12, marginBottom: 12, minWidth: 200 }}>
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              Resources
            </div>
            {resources.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  opacity: depth >= r.minDepth ? 1 : 0.3,
                }}
              >
                <span style={{ color: r.color }}>
                  {r.icon} {r.name}
                </span>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.amount}</span>
              </div>
            ))}
            <button
              onClick={sellAll}
              style={{
                marginTop: 8,
                width: "100%",
                background: ACCENT,
                color: "#0a0a1a",
                border: "none",
                borderRadius: 8,
                padding: "8px 0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sell All
            </button>
          </div>

          <div style={{ color: "#64748b", fontSize: 12 }}>Total Mined: {totalMined.toLocaleString()}</div>
        </div>

        {/* Right: Upgrades */}
        <div style={{ minWidth: 260 }}>
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 14, marginBottom: 8, textAlign: "center" }}>
            Upgrades
          </div>
          {upgrades.map((u, i) => {
            const cost = getUpgradeCost(u);
            const canBuy = coins >= cost;
            return (
              <div
                key={u.id}
                style={{
                  background: CARD,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  border: canBuy ? `1px solid ${ACCENT}40` : "1px solid transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                  <span style={{ color: "#a78bfa", fontSize: 13 }}>Lv.{u.level}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>{u.description}</div>
                <button
                  onClick={() => buyUpgrade(i)}
                  disabled={!canBuy}
                  style={{
                    width: "100%",
                    background: canBuy ? BTN : "#1e1e3a",
                    color: canBuy ? "#fff" : "#64748b",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 0",
                    fontSize: 13,
                    cursor: canBuy ? "pointer" : "default",
                    fontWeight: 600,
                  }}
                >
                  Buy - {cost.toLocaleString()} coins
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
