import { useState, useEffect, useCallback } from "react";

const MAP_W = 20, MAP_H = 15;
const TILE = 28;

type CellType = "wall" | "floor" | "stairs";
interface Enemy { x: number; y: number; hp: number; maxHp: number; name: string; dmg: number; symbol: string; }
interface Potion { x: number; y: number; amount: number; }

function generateFloor(floor: number): {
  grid: CellType[][];
  enemies: Enemy[];
  potions: Potion[];
  stairsX: number;
  stairsY: number;
  startX: number;
  startY: number;
} {
  const grid: CellType[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill("wall"));

  // Carve rooms
  const rooms: { x: number; y: number; w: number; h: number }[] = [];
  const numRooms = 5 + Math.floor(Math.random() * 3);

  for (let attempt = 0; attempt < 50 && rooms.length < numRooms; attempt++) {
    const w = 3 + Math.floor(Math.random() * 4);
    const h = 3 + Math.floor(Math.random() * 3);
    const x = 1 + Math.floor(Math.random() * (MAP_W - w - 2));
    const y = 1 + Math.floor(Math.random() * (MAP_H - h - 2));

    const overlap = rooms.some(r =>
      x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y
    );
    if (overlap) continue;

    rooms.push({ x, y, w, h });
    for (let ry = y; ry < y + h; ry++)
      for (let rx = x; rx < x + w; rx++)
        grid[ry][rx] = "floor";
  }

  // Corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    let cx = rooms[i].x + Math.floor(rooms[i].w / 2);
    let cy = rooms[i].y + Math.floor(rooms[i].h / 2);
    const tx = rooms[i + 1].x + Math.floor(rooms[i + 1].w / 2);
    const ty = rooms[i + 1].y + Math.floor(rooms[i + 1].h / 2);

    while (cx !== tx) { cx += cx < tx ? 1 : -1; grid[cy][cx] = "floor"; }
    while (cy !== ty) { cy += cy < ty ? 1 : -1; grid[cy][cx] = "floor"; }
  }

  // Collect floor tiles
  const floors: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      if (grid[y][x] === "floor") floors.push([x, y]);

  // Shuffle
  for (let i = floors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [floors[i], floors[j]] = [floors[j], floors[i]];
  }

  const startX = floors[0][0], startY = floors[0][1];
  const stairsX = floors[1][0], stairsY = floors[1][1];
  grid[stairsY][stairsX] = "stairs";

  // Enemies
  const enemyTypes = [
    { name: "Goblin", hp: 3, dmg: 1, symbol: "G" },
    { name: "Skeleton", hp: 5, dmg: 2, symbol: "S" },
    { name: "Orc", hp: 8, dmg: 3, symbol: "O" },
    { name: "Wraith", hp: 6, dmg: 4, symbol: "W" },
  ];

  const numEnemies = 3 + floor * 2;
  const enemies: Enemy[] = [];
  for (let i = 0; i < numEnemies && i + 2 < floors.length; i++) {
    const spot = floors[i + 2];
    const typeIdx = Math.min(Math.floor(Math.random() * (1 + floor)), enemyTypes.length - 1);
    const et = enemyTypes[typeIdx];
    enemies.push({
      x: spot[0], y: spot[1],
      hp: et.hp + floor, maxHp: et.hp + floor,
      name: et.name, dmg: et.dmg, symbol: et.symbol,
    });
  }

  // Potions
  const potions: Potion[] = [];
  const numPotions = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < numPotions; i++) {
    const idx = numEnemies + 2 + i;
    if (idx < floors.length) {
      potions.push({ x: floors[idx][0], y: floors[idx][1], amount: 5 + Math.floor(Math.random() * 5) });
    }
  }

  return { grid, enemies, potions, stairsX, stairsY, startX, startY };
}

export default function DungeonCrawler() {
  const [floor, setFloor] = useState(1);
  const [playerX, setPlayerX] = useState(1);
  const [playerY, setPlayerY] = useState(1);
  const [playerHp, setPlayerHp] = useState(30);
  const [playerMaxHp, setPlayerMaxHp] = useState(30);
  const [playerDmg, setPlayerDmg] = useState(3);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState<string[]>(["Welcome to the dungeon! Use arrow keys to move."]);
  const [grid, setGrid] = useState<CellType[][]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [potions, setPotions] = useState<Potion[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [turn, setTurn] = useState(0);

  const initFloor = useCallback((floorNum: number) => {
    const f = generateFloor(floorNum);
    setGrid(f.grid);
    setEnemies(f.enemies);
    setPotions(f.potions);
    setPlayerX(f.startX);
    setPlayerY(f.startY);
    setFloor(floorNum);
    setLog(prev => [...prev.slice(-4), `-- Floor ${floorNum} --`]);
  }, []);

  useEffect(() => { initFloor(1); }, [initFloor]);

  const moveEnemies = useCallback((px: number, py: number, currentEnemies: Enemy[]) => {
    const newEnemies = currentEnemies.map(e => {
      if (e.hp <= 0) return e;
      const dx = px - e.x;
      const dy = py - e.y;
      let nx = e.x, ny = e.y;

      if (Math.abs(dx) + Math.abs(dy) <= 1) return e; // Adjacent, will attack in combat

      if (Math.abs(dx) > Math.abs(dy)) {
        nx += dx > 0 ? 1 : -1;
      } else {
        ny += dy > 0 ? 1 : -1;
      }

      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && grid[ny]?.[nx] !== "wall") {
        const blocked = currentEnemies.some(other => other !== e && other.hp > 0 && other.x === nx && other.y === ny);
        if (!blocked && !(nx === px && ny === py)) {
          return { ...e, x: nx, y: ny };
        }
      }
      return e;
    });
    return newEnemies;
  }, [grid]);

  const handleMove = useCallback((dx: number, dy: number) => {
    if (gameOver || won) return;

    const nx = playerX + dx;
    const ny = playerY + dy;
    if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) return;
    if (grid[ny]?.[nx] === "wall") return;

    const messages: string[] = [];
    let newHp = playerHp;
    let newScore = score;
    let newEnemies = [...enemies];

    // Check enemy at target
    const enemyIdx = newEnemies.findIndex(e => e.x === nx && e.y === ny && e.hp > 0);
    if (enemyIdx >= 0) {
      // Attack enemy
      const e = { ...newEnemies[enemyIdx] };
      e.hp -= playerDmg;
      messages.push(`You hit ${e.name} for ${playerDmg} dmg!`);
      if (e.hp <= 0) {
        messages.push(`${e.name} defeated! +${10 + floor * 5} pts`);
        newScore += 10 + floor * 5;
      }
      newEnemies[enemyIdx] = e;

      // Enemy attacks back if alive
      if (e.hp > 0) {
        newHp -= e.dmg;
        messages.push(`${e.name} hits you for ${e.dmg} dmg!`);
      }
    } else {
      setPlayerX(nx);
      setPlayerY(ny);

      // Check potion
      const potionIdx = potions.findIndex(p => p.x === nx && p.y === ny);
      if (potionIdx >= 0) {
        const p = potions[potionIdx];
        newHp = Math.min(playerMaxHp, newHp + p.amount);
        messages.push(`Healed ${p.amount} HP!`);
        const newPotions = potions.filter((_, i) => i !== potionIdx);
        setPotions(newPotions);
      }

      // Check stairs
      if (grid[ny]?.[nx] === "stairs") {
        if (floor >= 5) {
          setWon(true);
          newScore += 100;
          messages.push("You escaped the dungeon! Victory!");
        } else {
          messages.push("Descending to next floor...");
          newScore += 25;
          setScore(newScore);
          setPlayerHp(Math.min(playerMaxHp, newHp + 5));
          setPlayerDmg(d => d + 1);
          initFloor(floor + 1);
          setLog(prev => [...prev.slice(-4), ...messages]);
          return;
        }
      }
    }

    // Enemy turns - adjacent enemies attack
    const aliveEnemies = newEnemies.filter(e => e.hp > 0);
    for (const e of aliveEnemies) {
      if (enemyIdx >= 0 && newEnemies[enemyIdx] === e) continue;
      const dist = Math.abs(e.x - (enemyIdx >= 0 ? playerX : nx)) + Math.abs(e.y - (enemyIdx >= 0 ? playerY : ny));
      if (dist <= 1) {
        newHp -= e.dmg;
        messages.push(`${e.name} hits you for ${e.dmg}!`);
      }
    }

    // Move enemies
    const movedEnemies = moveEnemies(enemyIdx >= 0 ? playerX : nx, enemyIdx >= 0 ? playerY : ny, newEnemies);
    setEnemies(movedEnemies);

    if (newHp <= 0) {
      newHp = 0;
      setGameOver(true);
      messages.push("You died! Game over.");
    }

    setPlayerHp(newHp);
    setScore(newScore);
    setTurn(t => t + 1);
    if (messages.length > 0) setLog(prev => [...prev.slice(-6), ...messages]);
  }, [playerX, playerY, playerHp, playerMaxHp, playerDmg, score, enemies, potions, grid, floor, gameOver, won, moveEnemies, initFloor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (gameOver || won) {
        if (e.key === "Enter" || e.key === " ") {
          setGameOver(false); setWon(false);
          setPlayerHp(30); setPlayerMaxHp(30); setPlayerDmg(3);
          setScore(0); setLog(["New adventure begins..."]);
          initFloor(1);
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp": case "w": handleMove(0, -1); break;
        case "ArrowDown": case "s": handleMove(0, 1); break;
        case "ArrowLeft": case "a": handleMove(-1, 0); break;
        case "ArrowRight": case "d": handleMove(1, 0); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleMove, gameOver, won, initFloor]);

  const getCellStyle = (x: number, y: number): { bg: string; char: string; color: string } => {
    // Player
    if (x === playerX && y === playerY) return { bg: "#1a1a3e", char: "@", color: "#22c55e" };

    // Enemy
    const enemy = enemies.find(e => e.x === x && e.y === y && e.hp > 0);
    if (enemy) return { bg: "#2a0a0a", char: enemy.symbol, color: "#ef4444" };

    // Potion
    const potion = potions.find(p => p.x === x && p.y === y);
    if (potion) return { bg: "#0a1a2a", char: "!", color: "#ec4899" };

    const cell = grid[y]?.[x];
    if (cell === "stairs") return { bg: "#1a1a0a", char: ">", color: "#eab308" };
    if (cell === "wall") return { bg: "#111", char: "#", color: "#333" };
    return { bg: "#1a1a2e", char: ".", color: "#2a2a4e" };
  };

  // Visibility: only show tiles within a radius
  const isVisible = (x: number, y: number) => {
    const dist = Math.abs(x - playerX) + Math.abs(y - playerY);
    return dist <= 7;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 16, background: "#0a0a1a", minHeight: "100vh", color: "#ccc", fontFamily: "monospace" }}>
      {/* HUD */}
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 13, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: "#22c55e" }}>HP: {playerHp}/{playerMaxHp}</span>
        <span style={{ color: "#ef4444" }}>ATK: {playerDmg}</span>
        <span style={{ color: "#eab308" }}>Floor: {floor}/5</span>
        <span style={{ color: "#3b82f6" }}>Score: {score}</span>
        <span style={{ color: "#888" }}>Turn: {turn}</span>
      </div>

      {/* HP Bar */}
      <div style={{ width: MAP_W * TILE, height: 6, background: "#333", borderRadius: 3, marginBottom: 8 }}>
        <div style={{
          width: `${(playerHp / playerMaxHp) * 100}%`,
          height: "100%",
          background: playerHp > playerMaxHp * 0.5 ? "#22c55e" : playerHp > playerMaxHp * 0.25 ? "#eab308" : "#ef4444",
          borderRadius: 3,
          transition: "width 0.2s",
        }} />
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${MAP_W}, ${TILE}px)`,
        gap: 1,
        background: "#000",
        border: "1px solid #222",
        borderRadius: 8,
        padding: 2,
        position: "relative",
      }}>
        {Array.from({ length: MAP_H }, (_, y) =>
          Array.from({ length: MAP_W }, (_, x) => {
            const visible = isVisible(x, y);
            const { bg, char, color } = getCellStyle(x, y);
            return (
              <div key={`${x}-${y}`} style={{
                width: TILE,
                height: TILE,
                background: visible ? bg : "#050510",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: TILE - 8,
                color: visible ? color : "transparent",
                fontWeight: char === "@" ? "bold" : "normal",
                textShadow: char === "@" ? "0 0 6px #22c55e" : undefined,
                transition: "background 0.15s",
              }}>
                {visible ? char : ""}
              </div>
            );
          })
        )}

        {/* Game Over / Win overlay */}
        {(gameOver || won) && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(10,10,26,0.9)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            borderRadius: 8, zIndex: 10,
          }}>
            <div style={{ color: won ? "#22c55e" : "#ef4444", fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
              {won ? "Victory!" : "You Died"}
            </div>
            <div style={{ color: "#eab308", fontSize: 18, marginBottom: 4 }}>Score: {score}</div>
            <div style={{ color: "#888", fontSize: 14, marginBottom: 4 }}>Floor reached: {floor}</div>
            <div style={{ color: "#666", fontSize: 13 }}>Press Enter or Space to restart</div>
          </div>
        )}
      </div>

      {/* Log */}
      <div style={{
        width: MAP_W * TILE,
        marginTop: 8,
        padding: 8,
        background: "#111",
        borderRadius: 6,
        border: "1px solid #222",
        fontSize: 12,
        maxHeight: 80,
        overflow: "hidden",
      }}>
        {log.slice(-4).map((msg, i) => (
          <div key={i} style={{
            color: msg.includes("died") || msg.includes("hits you") ? "#ef4444"
              : msg.includes("defeated") || msg.includes("Healed") ? "#22c55e"
              : msg.includes("Floor") || msg.includes("Victory") ? "#eab308"
              : "#888",
            marginBottom: 2,
          }}>{msg}</div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#555", flexWrap: "wrap", justifyContent: "center" }}>
        <span><span style={{ color: "#22c55e" }}>@</span> You</span>
        <span><span style={{ color: "#ef4444" }}>G/S/O/W</span> Enemies</span>
        <span><span style={{ color: "#ec4899" }}>!</span> Potion</span>
        <span><span style={{ color: "#eab308" }}>&gt;</span> Stairs</span>
        <span>Arrow keys / WASD to move</span>
      </div>
    </div>
  );
}
