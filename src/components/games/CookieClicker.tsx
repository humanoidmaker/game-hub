"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Upgrade {
  name: string;
  baseCost: number;
  cps: number;
  owned: number;
  emoji: string;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  opacity: number;
}

interface SaveData {
  cookies: number;
  totalCookies: number;
  upgrades: Upgrade[];
  prestigeMultiplier: number;
  prestigeCount: number;
}

const INITIAL_UPGRADES: Upgrade[] = [
  { name: "Cursor", baseCost: 15, cps: 0.1, owned: 0, emoji: "\u{1F5B1}" },
  { name: "Grandma", baseCost: 100, cps: 1, owned: 0, emoji: "\u{1F475}" },
  { name: "Farm", baseCost: 500, cps: 5, owned: 0, emoji: "\u{1F33E}" },
  { name: "Factory", baseCost: 2000, cps: 20, owned: 0, emoji: "\u{1F3ED}" },
  { name: "Mine", baseCost: 10000, cps: 100, owned: 0, emoji: "\u26CF\uFE0F" },
];

const STORAGE_KEY = "cookieClicker_save";

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toString();
}

function getUpgradeCost(baseCost: number, owned: number): number {
  return Math.floor(baseCost * Math.pow(1.15, owned));
}

function loadSave(): SaveData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function CookieClicker() {
  const saved = useRef<SaveData | null>(null);
  if (saved.current === null) {
    saved.current = loadSave();
  }

  const [cookies, setCookies] = useState(saved.current?.cookies ?? 0);
  const [totalCookies, setTotalCookies] = useState(saved.current?.totalCookies ?? 0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(saved.current?.upgrades ?? INITIAL_UPGRADES.map(u => ({ ...u })));
  const [prestigeMultiplier, setPrestigeMultiplier] = useState(saved.current?.prestigeMultiplier ?? 1);
  const [prestigeCount, setPrestigeCount] = useState(saved.current?.prestigeCount ?? 0);

  const [cookieScale, setCookieScale] = useState(1);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [goldenCookie, setGoldenCookie] = useState<{ x: number; y: number; visible: boolean }>({ x: 50, y: 50, visible: false });
  const [goldenFlash, setGoldenFlash] = useState(false);
  const [showPrestige, setShowPrestige] = useState(false);

  const floatIdRef = useRef(0);
  const cookieRef = useRef<HTMLDivElement>(null);

  const cps = upgrades.reduce((sum, u) => sum + u.cps * u.owned, 0) * prestigeMultiplier;

  // CPS tick
  useEffect(() => {
    if (cps <= 0) return;
    const iv = setInterval(() => {
      setCookies(c => c + cps / 20);
      setTotalCookies(t => t + cps / 20);
    }, 50);
    return () => clearInterval(iv);
  }, [cps]);

  // Save every 10 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      writeSave({ cookies, totalCookies, upgrades, prestigeMultiplier, prestigeCount });
    }, 10000);
    return () => clearInterval(iv);
  }, [cookies, totalCookies, upgrades, prestigeMultiplier, prestigeCount]);

  // Save on unload
  useEffect(() => {
    const handler = () => {
      writeSave({ cookies, totalCookies, upgrades, prestigeMultiplier, prestigeCount });
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [cookies, totalCookies, upgrades, prestigeMultiplier, prestigeCount]);

  // Golden cookie spawner
  useEffect(() => {
    const spawn = () => {
      const delay = 15000 + Math.random() * 45000;
      setTimeout(() => {
        setGoldenCookie({
          x: 10 + Math.random() * 70,
          y: 10 + Math.random() * 60,
          visible: true,
        });
        setTimeout(() => {
          setGoldenCookie(g => (g.visible ? { ...g, visible: false } : g));
        }, 6000);
        spawn();
      }, delay);
    };
    spawn();
  }, []);

  // Clean up floating texts
  useEffect(() => {
    const iv = setInterval(() => {
      setFloatingTexts(ft => ft.filter(t => t.opacity > 0));
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const addFloatingText = (text: string, xOff: number, yOff: number) => {
    const id = ++floatIdRef.current;
    const newFloat: FloatingText = { id, x: xOff, y: yOff, text, opacity: 1 };
    setFloatingTexts(prev => [...prev.slice(-15), newFloat]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.map(f => (f.id === id ? { ...f, opacity: 0 } : f)));
    }, 50);
  };

  const clickCookie = (e: React.MouseEvent) => {
    const earned = 1 * prestigeMultiplier;
    setCookies(c => c + earned);
    setTotalCookies(t => t + earned);
    setCookieScale(1.18);
    setTimeout(() => setCookieScale(1), 100);

    const rect = cookieRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      addFloatingText(`+${formatNumber(earned)}`, x, y - 20);
    }
  };

  const buyUpgrade = (idx: number) => {
    const u = upgrades[idx];
    const cost = getUpgradeCost(u.baseCost, u.owned);
    if (cookies < cost) return;
    setCookies(c => c - cost);
    setUpgrades(prev => {
      const next = [...prev];
      next[idx] = { ...u, owned: u.owned + 1 };
      return next;
    });
  };

  const clickGolden = () => {
    if (!goldenCookie.visible) return;
    const burst = Math.max(cps * 10, 100) * prestigeMultiplier;
    setCookies(c => c + burst);
    setTotalCookies(t => t + burst);
    setGoldenCookie(g => ({ ...g, visible: false }));
    setGoldenFlash(true);
    setTimeout(() => setGoldenFlash(false), 400);
  };

  const canPrestige = totalCookies >= 1_000_000;
  const nextMultiplier = 1 + Math.floor(totalCookies / 1_000_000) * 0.5;

  const doPrestige = () => {
    if (!canPrestige) return;
    const newMult = nextMultiplier;
    setCookies(0);
    setTotalCookies(0);
    setUpgrades(INITIAL_UPGRADES.map(u => ({ ...u })));
    setPrestigeMultiplier(newMult);
    setPrestigeCount(p => p + 1);
    setShowPrestige(false);
    writeSave({
      cookies: 0,
      totalCookies: 0,
      upgrades: INITIAL_UPGRADES.map(u => ({ ...u })),
      prestigeMultiplier: newMult,
      prestigeCount: prestigeCount + 1,
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1008 0%, #2a1a0a 50%, #1a1008 100%)",
      color: "#f5e6d0",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 16px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Golden flash overlay */}
      {goldenFlash && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 100,
          animation: "fadeOut 0.4s ease-out forwards",
        }} />
      )}

      {/* Header stats */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{
          fontSize: 42,
          fontWeight: 800,
          color: "#f5c542",
          textShadow: "0 2px 20px rgba(245,197,66,0.4)",
          letterSpacing: -1,
        }}>
          {formatNumber(cookies)} cookies
        </div>
        <div style={{ fontSize: 15, color: "#c4a060", marginTop: 4 }}>
          {cps.toFixed(1)} cookies per second
        </div>
        {prestigeMultiplier > 1 && (
          <div style={{ fontSize: 12, color: "#d4a0ff", marginTop: 2 }}>
            Prestige x{prestigeMultiplier.toFixed(1)} (#{prestigeCount})
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        display: "flex",
        gap: 32,
        justifyContent: "center",
        flexWrap: "wrap",
        width: "100%",
        maxWidth: 700,
        marginTop: 8,
      }}>
        {/* Cookie area */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: "1 1 280px",
          position: "relative",
        }}>
          <div
            ref={cookieRef}
            onClick={clickCookie}
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #d4943a, #8B4513 60%, #5a2d0a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 110,
              userSelect: "none",
              transform: `scale(${cookieScale})`,
              transition: "transform 0.1s cubic-bezier(0.2, 0, 0.2, 1)",
              boxShadow: "0 0 40px rgba(212,148,58,0.35), 0 8px 30px rgba(0,0,0,0.5), inset 0 -4px 12px rgba(0,0,0,0.3)",
              border: "3px solid #a0652d",
              position: "relative",
            }}
          >
            {"\u{1F36A}"}
          </div>

          {/* Floating +1 texts */}
          {floatingTexts.map(ft => (
            <div
              key={ft.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${ft.x}px)`,
                top: `calc(50% + ${ft.y}px)`,
                color: "#f5c542",
                fontSize: 22,
                fontWeight: 800,
                pointerEvents: "none",
                textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                transition: "all 0.8s ease-out",
                transform: ft.opacity < 1 ? "translateY(-60px)" : "translateY(0)",
                opacity: ft.opacity < 1 ? 0 : 1,
              }}
            >
              {ft.text}
            </div>
          ))}

          {/* Prestige button */}
          <button
            onClick={() => setShowPrestige(true)}
            style={{
              marginTop: 24,
              padding: "10px 24px",
              borderRadius: 10,
              border: canPrestige ? "2px solid #d4a0ff" : "2px solid #444",
              background: canPrestige
                ? "linear-gradient(135deg, #3a1a5e, #5a2d8e)"
                : "#222",
              color: canPrestige ? "#e8c8ff" : "#666",
              fontSize: 14,
              fontWeight: 700,
              cursor: canPrestige ? "pointer" : "default",
              opacity: canPrestige ? 1 : 0.5,
              transition: "all 0.2s",
            }}
          >
            Prestige {canPrestige ? `(x${nextMultiplier.toFixed(1)})` : "(need 1M total)"}
          </button>
        </div>

        {/* Shop */}
        <div style={{
          flex: "1 1 260px",
          maxWidth: 320,
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#c4a060",
            marginBottom: 10,
            textTransform: "uppercase",
            letterSpacing: 2,
            borderBottom: "1px solid #3a2a1a",
            paddingBottom: 6,
          }}>
            Shop
          </h3>
          {upgrades.map((u, i) => {
            const cost = getUpgradeCost(u.baseCost, u.owned);
            const canBuy = cookies >= cost;
            return (
              <div
                key={u.name}
                onClick={() => buyUpgrade(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 6,
                  background: canBuy
                    ? "linear-gradient(135deg, #2a1f0a, #3a2a10)"
                    : "#1a1208",
                  border: canBuy
                    ? "1px solid rgba(245,197,66,0.3)"
                    : "1px solid #2a2010",
                  cursor: canBuy ? "pointer" : "default",
                  opacity: canBuy ? 1 : 0.45,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 28, width: 36, textAlign: "center" }}>{u.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f5e0c0" }}>
                    {u.name}
                    {u.owned > 0 && (
                      <span style={{ color: "#8a7a5a", fontWeight: 500, marginLeft: 6, fontSize: 12 }}>
                        x{u.owned}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7a5a" }}>
                    +{u.cps} CPS each
                  </div>
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: canBuy ? "#f5c542" : "#6a5a3a",
                  textAlign: "right",
                  minWidth: 50,
                }}>
                  {formatNumber(cost)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Golden cookie */}
      {goldenCookie.visible && (
        <div
          onClick={clickGolden}
          style={{
            position: "fixed",
            left: `${goldenCookie.x}%`,
            top: `${goldenCookie.y}%`,
            width: 60,
            height: 60,
            fontSize: 48,
            cursor: "pointer",
            zIndex: 50,
            animation: "goldenBob 1s ease-in-out infinite alternate, goldenShine 0.6s ease-in-out infinite alternate",
            filter: "drop-shadow(0 0 16px rgba(255,215,0,0.8))",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Golden Cookie! Click me!"
        >
          {"\u{1F31F}"}
        </div>
      )}

      {/* Prestige modal */}
      {showPrestige && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
        }}
          onClick={() => setShowPrestige(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #1a1028, #2a1a3e)",
              border: "2px solid #6a3aaa",
              borderRadius: 16,
              padding: "32px 36px",
              maxWidth: 380,
              textAlign: "center",
              boxShadow: "0 0 60px rgba(130,80,200,0.3)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u2728"}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#d4a0ff", marginBottom: 8 }}>
              Prestige
            </h2>
            <p style={{ fontSize: 14, color: "#b8a0d0", lineHeight: 1.6, marginBottom: 16 }}>
              Reset all cookies and upgrades for a <strong style={{ color: "#e8c8ff" }}>permanent
              multiplier</strong> on all cookie production.
            </p>
            <div style={{
              background: "#180e28",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: "#8a7aaa" }}>Total cookies earned</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f5c542" }}>{formatNumber(totalCookies)}</div>
              <div style={{ fontSize: 13, color: "#8a7aaa", marginTop: 8 }}>New multiplier</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#d4a0ff" }}>x{nextMultiplier.toFixed(1)}</div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setShowPrestige(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "1px solid #444",
                  background: "#2a2a2a",
                  color: "#aaa",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={doPrestige}
                disabled={!canPrestige}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "2px solid #8a4ae0",
                  background: canPrestige
                    ? "linear-gradient(135deg, #6a2ad0, #8a4ae0)"
                    : "#333",
                  color: canPrestige ? "#fff" : "#666",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: canPrestige ? "pointer" : "default",
                }}
              >
                Prestige Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes goldenBob {
          from { transform: translateY(-6px) rotate(-5deg); }
          to { transform: translateY(6px) rotate(5deg); }
        }
        @keyframes goldenShine {
          from { filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)); }
          to { filter: drop-shadow(0 0 24px rgba(255,215,0,1)); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
