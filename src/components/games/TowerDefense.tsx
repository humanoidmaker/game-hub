import { useRef, useEffect, useState, useCallback } from "react";

// --- Types ---
type TowerType = "arrow" | "cannon" | "ice" | "laser";
type EnemyType = "small" | "medium" | "large" | "boss";

interface Vec2 {
  x: number;
  y: number;
}

interface Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  pathIdx: number;
  reward: number;
  type: EnemyType;
  slowTimer: number;
  radius: number;
}

interface Tower {
  col: number;
  row: number;
  x: number;
  y: number;
  range: number;
  damage: number;
  cooldown: number;
  timer: number;
  type: TowerType;
  level: number;
}

interface Bullet {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  type: TowerType;
}

// --- Constants ---
const W = 500;
const H = 400;
const COLS = 25;
const ROWS = 20;
const CS = W / COLS; // 20px cells

const MAX_WAVES = 20;
const STARTING_GOLD = 150;
const STARTING_LIVES = 20;

// Snake path defined as grid cells (col, row) going left-to-right in a snake pattern
const PATH_CELLS: [number, number][] = (() => {
  const cells: [number, number][] = [];
  // Row 3: left to right
  for (let c = 0; c <= 22; c++) cells.push([c, 3]);
  // Down from row 3 to row 7
  for (let r = 4; r <= 7; r++) cells.push([22, r]);
  // Row 7: right to left
  for (let c = 21; c >= 2; c--) cells.push([c, 7]);
  // Down from row 7 to row 11
  for (let r = 8; r <= 11; r++) cells.push([2, r]);
  // Row 11: left to right
  for (let c = 3; c <= 22; c++) cells.push([c, 11]);
  // Down from row 11 to row 15
  for (let r = 12; r <= 15; r++) cells.push([22, r]);
  // Row 15: right to left then exit
  for (let c = 21; c >= 0; c--) cells.push([c, 15]);
  return cells;
})();

// Pixel waypoints for enemy movement (center of each path cell)
const PATH_PX: Vec2[] = PATH_CELLS.map(([c, r]) => ({
  x: c * CS + CS / 2,
  y: r * CS + CS / 2,
}));

// Set of path cell keys for quick lookup
const PATH_SET = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

const TOWER_DEFS: Record<
  TowerType,
  {
    cost: number;
    range: number;
    damage: number;
    cooldown: number;
    color: string;
    label: string;
    upgradeCost: number;
  }
> = {
  arrow: {
    cost: 50,
    range: 70,
    damage: 8,
    cooldown: 12,
    color: "#22d3ee",
    label: "Arrow",
    upgradeCost: 40,
  },
  cannon: {
    cost: 100,
    range: 80,
    damage: 30,
    cooldown: 40,
    color: "#f97316",
    label: "Cannon",
    upgradeCost: 75,
  },
  ice: {
    cost: 75,
    range: 75,
    damage: 4,
    cooldown: 20,
    color: "#a5f3fc",
    label: "Ice",
    upgradeCost: 55,
  },
  laser: {
    cost: 150,
    range: 100,
    damage: 3,
    cooldown: 2,
    color: "#f43f5e",
    label: "Laser",
    upgradeCost: 100,
  },
};

export default function TowerDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI state managed via React
  const [gold, setGold] = useState(STARTING_GOLD);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [wave, setWave] = useState(0);
  const [waveActive, setWaveActive] = useState(false);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(
    null
  );
  const [selectedPlacedTower, setSelectedPlacedTower] = useState<Tower | null>(
    null
  );
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    col: number;
    row: number;
  } | null>(null);

  // Game state refs (mutable, used inside animation loop)
  const stateRef = useRef({
    enemies: [] as Enemy[],
    towers: [] as Tower[],
    bullets: [] as Bullet[],
    gold: STARTING_GOLD,
    lives: STARTING_LIVES,
    wave: 0,
    waveActive: false,
    spawnTimer: 0,
    enemiesLeft: 0,
    gameOver: false,
    gameWon: false,
    selectedTowerType: null as TowerType | null,
    selectedPlacedTower: null as Tower | null,
    hoveredCell: null as { col: number; row: number } | null,
    mouseX: -1,
    mouseY: -1,
  });

  // Sync React state into ref
  useEffect(() => {
    stateRef.current.selectedTowerType = selectedTowerType;
  }, [selectedTowerType]);
  useEffect(() => {
    stateRef.current.selectedPlacedTower = selectedPlacedTower;
  }, [selectedPlacedTower]);

  const startWave = useCallback(() => {
    const s = stateRef.current;
    if (s.waveActive || s.gameOver || s.gameWon) return;
    if (s.wave >= MAX_WAVES) return;
    s.wave++;
    s.waveActive = true;
    s.spawnTimer = 0;
    // Number of enemies per wave
    s.enemiesLeft = 4 + s.wave * 2 + (s.wave % 5 === 0 ? 1 : 0); // boss wave adds 1 boss
    setWave(s.wave);
    setWaveActive(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let animId = 0;
    const s = stateRef.current;

    // --- Enemy spawning helper ---
    const spawnEnemy = () => {
      const w = s.wave;
      const isBossWave = w % 5 === 0;

      // Determine type: on boss wave, last enemy is boss
      let type: EnemyType;
      if (isBossWave && s.enemiesLeft === 1) {
        type = "boss";
      } else {
        const roll = Math.random();
        if (w < 5) {
          type = roll < 0.7 ? "small" : "medium";
        } else if (w < 10) {
          type = roll < 0.4 ? "small" : roll < 0.8 ? "medium" : "large";
        } else {
          type = roll < 0.2 ? "small" : roll < 0.5 ? "medium" : "large";
        }
      }

      const baseHp: Record<EnemyType, number> = {
        small: 25,
        medium: 50,
        large: 100,
        boss: 300,
      };
      const baseSpeed: Record<EnemyType, number> = {
        small: 1.6,
        medium: 1.0,
        large: 0.6,
        boss: 0.45,
      };
      const baseReward: Record<EnemyType, number> = {
        small: 5,
        medium: 10,
        large: 20,
        boss: 75,
      };
      const radius: Record<EnemyType, number> = {
        small: 5,
        medium: 7,
        large: 10,
        boss: 13,
      };

      const scaleFactor = 1 + (w - 1) * 0.18;
      const hp = Math.round(baseHp[type] * scaleFactor);
      const spd = baseSpeed[type] + w * 0.02;

      s.enemies.push({
        x: PATH_PX[0].x,
        y: PATH_PX[0].y,
        hp,
        maxHp: hp,
        speed: spd,
        baseSpeed: spd,
        pathIdx: 0,
        reward: baseReward[type] + Math.floor(w / 2),
        type,
        slowTimer: 0,
        radius: radius[type],
      });
      s.enemiesLeft--;
    };

    // --- Distance helper ---
    const dist = (a: Vec2, b: Vec2) =>
      Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

    // --- Main game loop ---
    const loop = () => {
      // --- Clear ---
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);

      // --- Draw grid cells ---
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const isPath = PATH_SET.has(`${c},${r}`);
          ctx.fillStyle = isPath ? "#2d6a1e" : "#2a2a3e";
          ctx.fillRect(c * CS + 0.5, r * CS + 0.5, CS - 1, CS - 1);
        }
      }

      // --- Hover highlight & range preview ---
      const hc = s.hoveredCell;
      if (hc && !s.gameOver && !s.gameWon) {
        const isPath = PATH_SET.has(`${hc.col},${hc.row}`);
        const hasTower = s.towers.some(
          (t) => t.col === hc.col && t.row === hc.row
        );
        const hoveredTower = s.towers.find(
          (t) => t.col === hc.col && t.row === hc.row
        );

        if (hoveredTower) {
          // Show range of existing tower
          ctx.beginPath();
          ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (!isPath && !hasTower && s.selectedTowerType) {
          // Show placement preview with range
          const def = TOWER_DEFS[s.selectedTowerType];
          const cx = hc.col * CS + CS / 2;
          const cy = hc.row * CS + CS / 2;
          ctx.fillStyle = s.gold >= def.cost ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)";
          ctx.fillRect(hc.col * CS, hc.row * CS, CS, CS);
          ctx.beginPath();
          ctx.arc(cx, cy, def.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // --- Spawn enemies ---
      if (s.waveActive && s.enemiesLeft > 0) {
        s.spawnTimer++;
        if (s.spawnTimer >= 25) {
          s.spawnTimer = 0;
          spawnEnemy();
        }
      }
      if (s.waveActive && s.enemiesLeft <= 0 && s.enemies.length === 0) {
        s.waveActive = false;
        setWaveActive(false);
        // Check win
        if (s.wave >= MAX_WAVES) {
          s.gameWon = true;
          setGameWon(true);
        }
      }

      // --- Move enemies ---
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];

        // Slow effect
        if (e.slowTimer > 0) {
          e.slowTimer--;
          e.speed = e.baseSpeed * 0.4;
        } else {
          e.speed = e.baseSpeed;
        }

        const target = PATH_PX[e.pathIdx + 1];
        if (!target) {
          // Reached end
          s.enemies.splice(i, 1);
          s.lives--;
          setLives(s.lives);
          if (s.lives <= 0) {
            s.gameOver = true;
            setGameOver(true);
          }
          continue;
        }
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < e.speed + 1) {
          e.pathIdx++;
        } else {
          e.x += (dx / d) * e.speed;
          e.y += (dy / d) * e.speed;
        }

        // Draw enemy
        const eColors: Record<EnemyType, string> = {
          small: "#ef4444",
          medium: "#f59e0b",
          large: "#a855f7",
          boss: "#dc2626",
        };
        ctx.fillStyle = eColors[e.type];
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        if (e.type === "boss") {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Slow tint
        if (e.slowTimer > 0) {
          ctx.fillStyle = "rgba(165,243,252,0.35)";
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // HP bar
        const barW = e.radius * 2.4;
        ctx.fillStyle = "#111";
        ctx.fillRect(e.x - barW / 2, e.y - e.radius - 6, barW, 3);
        ctx.fillStyle =
          e.hp / e.maxHp > 0.5
            ? "#22c55e"
            : e.hp / e.maxHp > 0.25
              ? "#eab308"
              : "#ef4444";
        ctx.fillRect(
          e.x - barW / 2,
          e.y - e.radius - 6,
          barW * (e.hp / e.maxHp),
          3
        );
      }

      // --- Tower shooting & drawing ---
      for (const t of s.towers) {
        const def = TOWER_DEFS[t.type];

        // Draw tower base
        const halfSize = CS / 2 - 2;
        ctx.fillStyle = def.color;
        ctx.fillRect(t.x - halfSize, t.y - halfSize, halfSize * 2, halfSize * 2);

        // Level indicator dots
        for (let l = 0; l < t.level - 1; l++) {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(t.x - 4 + l * 5, t.y + halfSize + 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Selected tower highlight
        if (
          s.selectedPlacedTower &&
          s.selectedPlacedTower.col === t.col &&
          s.selectedPlacedTower.row === t.row
        ) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            t.x - halfSize - 1,
            t.y - halfSize - 1,
            halfSize * 2 + 2,
            halfSize * 2 + 2
          );
          // Draw range circle for selected
          ctx.beginPath();
          ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(251,191,36,0.06)";
          ctx.fill();
          ctx.strokeStyle = "rgba(251,191,36,0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Shooting logic
        t.timer--;
        if (t.timer <= 0) {
          let closest: Enemy | null = null;
          let closestDist = Infinity;
          for (const e of s.enemies) {
            const d = dist(t, e);
            if (d <= t.range && d < closestDist) {
              closest = e;
              closestDist = d;
            }
          }
          if (closest) {
            if (t.type === "laser") {
              // Laser: constant beam, direct damage
              closest.hp -= t.damage;
              // Draw beam
              ctx.strokeStyle = "rgba(244,63,94,0.7)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(t.x, t.y);
              ctx.lineTo(closest.x, closest.y);
              ctx.stroke();
              ctx.strokeStyle = "rgba(255,255,255,0.4)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(t.x, t.y);
              ctx.lineTo(closest.x, closest.y);
              ctx.stroke();

              if (closest.hp <= 0) {
                s.gold += closest.reward;
                setGold(s.gold);
                const idx = s.enemies.indexOf(closest);
                if (idx >= 0) s.enemies.splice(idx, 1);
              }
              t.timer = t.cooldown;
            } else if (t.type === "ice") {
              // Ice: shoot projectile that slows
              s.bullets.push({
                x: t.x,
                y: t.y,
                tx: closest.x,
                ty: closest.y,
                speed: 4,
                damage: t.damage,
                type: "ice",
              });
              t.timer = t.cooldown;
            } else {
              // Arrow / Cannon: shoot projectile
              s.bullets.push({
                x: t.x,
                y: t.y,
                tx: closest.x,
                ty: closest.y,
                speed: t.type === "arrow" ? 6 : 3.5,
                damage: t.damage,
                type: t.type,
              });
              t.timer = t.cooldown;
            }
          }
        }
      }

      // --- Move bullets ---
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < b.speed + 2) {
          // Hit: find enemy near impact point
          for (let j = s.enemies.length - 1; j >= 0; j--) {
            const e = s.enemies[j];
            if (dist(e, { x: b.tx, y: b.ty }) < e.radius + 8) {
              e.hp -= b.damage;
              if (b.type === "ice") {
                e.slowTimer = 60; // ~1 second slow
              }
              if (b.type === "cannon") {
                // Splash: damage nearby enemies
                for (const other of s.enemies) {
                  if (other !== e && dist(other, e) < 25) {
                    other.hp -= Math.floor(b.damage * 0.4);
                  }
                }
              }
              if (e.hp <= 0) {
                s.gold += e.reward;
                setGold(s.gold);
                s.enemies.splice(j, 1);
              }
              break;
            }
          }
          s.bullets.splice(i, 1);
        } else {
          b.x += (dx / d) * b.speed;
          b.y += (dy / d) * b.speed;

          // Draw bullet
          const bColors: Record<TowerType, string> = {
            arrow: "#22d3ee",
            cannon: "#f97316",
            ice: "#a5f3fc",
            laser: "#f43f5e",
          };
          ctx.fillStyle = bColors[b.type];
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.type === "cannon" ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Game over / win overlay ---
      if (s.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "16px system-ui";
        ctx.fillText(`Reached wave ${s.wave}`, W / 2, H / 2 + 18);
      }
      if (s.gameWon) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 28px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("YOU WIN!", W / 2, H / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "16px system-ui";
        ctx.fillText("All 20 waves defeated!", W / 2, H / 2 + 18);
      }

      animId = requestAnimationFrame(loop);
    };

    // --- Click handler ---
    const onClick = (e: MouseEvent) => {
      if (s.gameOver || s.gameWon) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const col = Math.floor(mx / CS);
      const row = Math.floor(my / CS);

      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

      const existingTower = s.towers.find(
        (t) => t.col === col && t.row === row
      );

      if (existingTower) {
        // Select this tower for upgrade
        s.selectedPlacedTower = existingTower;
        setSelectedPlacedTower({ ...existingTower });
        setSelectedTowerType(null);
        s.selectedTowerType = null;
        return;
      }

      // Deselect placed tower
      s.selectedPlacedTower = null;
      setSelectedPlacedTower(null);

      // Try to place tower
      const isPath = PATH_SET.has(`${col},${row}`);
      if (isPath) return;
      if (!s.selectedTowerType) return;

      const def = TOWER_DEFS[s.selectedTowerType];
      if (s.gold < def.cost) return;

      s.gold -= def.cost;
      setGold(s.gold);

      const newTower: Tower = {
        col,
        row,
        x: col * CS + CS / 2,
        y: row * CS + CS / 2,
        range: def.range,
        damage: def.damage,
        cooldown: def.cooldown,
        timer: 0,
        type: s.selectedTowerType,
        level: 1,
      };
      s.towers.push(newTower);
    };

    // --- Mouse move handler ---
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      s.mouseX = mx;
      s.mouseY = my;
      const col = Math.floor(mx / CS);
      const row = Math.floor(my / CS);
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
        s.hoveredCell = { col, row };
        setHoveredCell({ col, row });
      } else {
        s.hoveredCell = null;
        setHoveredCell(null);
      }
    };

    const onMouseLeave = () => {
      s.hoveredCell = null;
      setHoveredCell(null);
    };

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  const upgradeTower = useCallback(() => {
    const s = stateRef.current;
    const st = s.selectedPlacedTower;
    if (!st) return;
    const def = TOWER_DEFS[st.type];
    const cost = def.upgradeCost * st.level;
    if (s.gold < cost) return;
    if (st.level >= 3) return;

    s.gold -= cost;
    setGold(s.gold);

    // Find the actual tower in the array
    const tower = s.towers.find(
      (t) => t.col === st.col && t.row === st.row
    );
    if (!tower) return;

    tower.level++;
    tower.damage = Math.round(def.damage * (1 + (tower.level - 1) * 0.5));
    tower.range = Math.round(def.range * (1 + (tower.level - 1) * 0.15));

    s.selectedPlacedTower = tower;
    setSelectedPlacedTower({ ...tower });
  }, []);

  const sellTower = useCallback(() => {
    const s = stateRef.current;
    const st = s.selectedPlacedTower;
    if (!st) return;
    const def = TOWER_DEFS[st.type];
    const refund = Math.floor(
      def.cost * 0.6 +
        (st.level > 1
          ? def.upgradeCost * (st.level - 1) * 0.4
          : 0)
    );
    s.gold += refund;
    setGold(s.gold);
    s.towers = s.towers.filter(
      (t) => !(t.col === st.col && t.row === st.row)
    );
    s.selectedPlacedTower = null;
    setSelectedPlacedTower(null);
  }, []);

  const towerTypes: TowerType[] = ["arrow", "cannon", "ice", "laser"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 16,
        fontFamily: "system-ui, sans-serif",
        userSelect: "none",
      }}
    >
      {/* Top HUD */}
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          width: W,
          justifyContent: "space-between",
          fontSize: 14,
          color: "#e2e8f0",
          background: "#1e1e2e",
          padding: "6px 12px",
          borderRadius: 6,
        }}
      >
        <span style={{ color: "#fbbf24", fontWeight: 700 }}>
          Gold: {gold}
        </span>
        <span style={{ color: "#f87171", fontWeight: 700 }}>
          Lives: {lives}
        </span>
        <span style={{ color: "#60a5fa" }}>
          Wave: {wave} / {MAX_WAVES}
        </span>
        {!waveActive && !gameOver && !gameWon && wave < MAX_WAVES && (
          <button
            onClick={startWave}
            style={{
              padding: "4px 14px",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {wave === 0 ? "Start" : "Next Wave"}
          </button>
        )}
        {waveActive && (
          <span style={{ color: "#facc15", fontSize: 12 }}>
            Wave in progress...
          </span>
        )}
      </div>

      {/* Tower selection bar */}
      <div
        style={{
          display: "flex",
          gap: 6,
          width: W,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {towerTypes.map((t) => {
          const def = TOWER_DEFS[t];
          const selected = selectedTowerType === t;
          const canAfford = gold >= def.cost;
          return (
            <button
              key={t}
              onClick={() => {
                setSelectedTowerType(selected ? null : t);
                setSelectedPlacedTower(null);
                stateRef.current.selectedPlacedTower = null;
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "4px 10px",
                background: selected ? "#334155" : "#1e1e2e",
                border: selected ? `2px solid ${def.color}` : "2px solid #333",
                borderRadius: 6,
                color: canAfford ? "#e2e8f0" : "#666",
                cursor: canAfford ? "pointer" : "not-allowed",
                fontSize: 11,
                minWidth: 72,
                opacity: canAfford ? 1 : 0.6,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: def.color,
                  display: "inline-block",
                  borderRadius: 2,
                  marginBottom: 2,
                }}
              />
              <span style={{ fontWeight: 700 }}>{def.label}</span>
              <span style={{ color: "#fbbf24", fontSize: 10 }}>
                {def.cost}g
              </span>
              <span style={{ color: "#888", fontSize: 9 }}>
                DMG:{def.damage} RNG:{def.range}
              </span>
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          borderRadius: 6,
          border: "2px solid #333",
          cursor:
            selectedTowerType && !gameOver && !gameWon ? "crosshair" : "default",
        }}
      />

      {/* Selected tower info / upgrade panel */}
      {selectedPlacedTower && !gameOver && !gameWon && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            background: "#1e1e2e",
            padding: "6px 14px",
            borderRadius: 6,
            color: "#e2e8f0",
            fontSize: 13,
            border: "1px solid #fbbf24",
            width: W,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span
              style={{
                width: 14,
                height: 14,
                background: TOWER_DEFS[selectedPlacedTower.type].color,
                display: "inline-block",
                borderRadius: 2,
              }}
            />
            <span style={{ fontWeight: 700 }}>
              {TOWER_DEFS[selectedPlacedTower.type].label} Lv.
              {selectedPlacedTower.level}
            </span>
            <span style={{ color: "#aaa", fontSize: 11 }}>
              DMG:{selectedPlacedTower.damage} | RNG:{selectedPlacedTower.range}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {selectedPlacedTower.level < 3 && (
              <button
                onClick={upgradeTower}
                disabled={
                  gold <
                  TOWER_DEFS[selectedPlacedTower.type].upgradeCost *
                    selectedPlacedTower.level
                }
                style={{
                  padding: "3px 10px",
                  background:
                    gold >=
                    TOWER_DEFS[selectedPlacedTower.type].upgradeCost *
                      selectedPlacedTower.level
                      ? "#3b82f6"
                      : "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor:
                    gold >=
                    TOWER_DEFS[selectedPlacedTower.type].upgradeCost *
                      selectedPlacedTower.level
                      ? "pointer"
                      : "not-allowed",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Upgrade (
                {TOWER_DEFS[selectedPlacedTower.type].upgradeCost *
                  selectedPlacedTower.level}
                g)
              </button>
            )}
            {selectedPlacedTower.level >= 3 && (
              <span style={{ color: "#fbbf24", fontSize: 11 }}>MAX LEVEL</span>
            )}
            <button
              onClick={sellTower}
              style={{
                padding: "3px 10px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Sell (
              {Math.floor(
                TOWER_DEFS[selectedPlacedTower.type].cost * 0.6 +
                  (selectedPlacedTower.level > 1
                    ? TOWER_DEFS[selectedPlacedTower.type].upgradeCost *
                      (selectedPlacedTower.level - 1) *
                      0.4
                    : 0)
              )}
              g)
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          color: "#666",
          fontSize: 11,
          textAlign: "center",
          maxWidth: W,
        }}
      >
        Select a tower type above, then click an empty (gray) cell to build.
        Click a placed tower to upgrade or sell. Hover over cells/towers to see
        range.
      </div>
    </div>
  );
}
