"use client";
import { useState, useEffect, useRef, useCallback } from "react";

function genTicket(): (number | null)[][] {
  const ticket: (number | null)[][] = [Array(9).fill(null), Array(9).fill(null), Array(9).fill(null)];
  // Each column i holds numbers from i*10+1 to (i+1)*10 (col 0: 1-9, col 8: 80-90)
  for (let col = 0; col < 9; col++) {
    const lo = col === 0 ? 1 : col * 10;
    const hi = col === 8 ? 90 : col * 10 + 9;
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    // Decide how many numbers this col gets (1 to 3 but row needs 5 filled)
    const count = Math.min(pool.length, 1 + Math.floor(Math.random() * 2));
    const rows = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count);
    rows.forEach((r, idx) => { ticket[r][col] = pool[idx]; });
  }
  // Ensure each row has exactly 5 numbers
  for (let r = 0; r < 3; r++) {
    let filled = ticket[r].filter(v => v !== null).length;
    while (filled < 5) {
      const emptyCols = ticket[r].map((v, i) => v === null ? i : -1).filter(i => i >= 0);
      const col = emptyCols[Math.floor(Math.random() * emptyCols.length)];
      const lo = col === 0 ? 1 : col * 10;
      const hi = col === 8 ? 90 : col * 10 + 9;
      const used = [ticket[0][col], ticket[1][col], ticket[2][col]].filter(v => v !== null) as number[];
      const pool = [];
      for (let n = lo; n <= hi; n++) { if (!used.includes(n)) pool.push(n); }
      if (pool.length > 0) {
        ticket[r][col] = pool[Math.floor(Math.random() * pool.length)];
        filled++;
      }
    }
    while (filled > 5) {
      const filledCols = ticket[r].map((v, i) => v !== null ? i : -1).filter(i => i >= 0);
      // Only remove from cols that have more than 1 entry
      const removable = filledCols.filter(col => {
        const cnt = [ticket[0][col], ticket[1][col], ticket[2][col]].filter(v => v !== null).length;
        return cnt > 1;
      });
      if (removable.length === 0) break;
      const col = removable[Math.floor(Math.random() * removable.length)];
      ticket[r][col] = null;
      filled--;
    }
  }
  // Sort numbers in each column
  for (let col = 0; col < 9; col++) {
    const vals = [0, 1, 2].map(r => ticket[r][col]).filter(v => v !== null) as number[];
    vals.sort((a, b) => a - b);
    let idx = 0;
    for (let r = 0; r < 3; r++) { if (ticket[r][col] !== null) { ticket[r][col] = vals[idx++]; } }
  }
  return ticket;
}

export default function Tambola() {
  const [tickets, setTickets] = useState<(number | null)[][][]>([]);
  const [ticketCount, setTicketCount] = useState(1);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [markedCells, setMarkedCells] = useState<Set<string>[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [autoCall, setAutoCall] = useState(false);
  const [wins, setWins] = useState<Record<string, boolean>>({ early5: false, topLine: false, middleLine: false, bottomLine: false, fullHouse: false });
  const [winMessages, setWinMessages] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allNumbers = useRef<number[]>([]);

  const startGame = useCallback(() => {
    const ts = Array.from({ length: ticketCount }, () => genTicket());
    setTickets(ts);
    setMarkedCells(ts.map(() => new Set<string>()));
    const nums = Array.from({ length: 90 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
    allNumbers.current = nums;
    setCalledNumbers([]);
    setWins({ early5: false, topLine: false, middleLine: false, bottomLine: false, fullHouse: false });
    setWinMessages([]);
    setGameStarted(true);
    setAutoCall(false);
  }, [ticketCount]);

  const callNext = useCallback(() => {
    setCalledNumbers(prev => {
      if (prev.length >= 90) return prev;
      return [...prev, allNumbers.current[prev.length]];
    });
  }, []);

  useEffect(() => {
    if (autoCall && gameStarted) {
      intervalRef.current = setInterval(callNext, 2000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoCall, gameStarted, callNext]);

  const toggleMark = (tIdx: number, row: number, col: number) => {
    const ticket = tickets[tIdx];
    const num = ticket[row][col];
    if (num === null || !calledNumbers.includes(num)) return;
    const key = `${row}-${col}`;
    setMarkedCells(prev => {
      const next = prev.map((s, i) => i === tIdx ? new Set(s) : s);
      if (next[tIdx].has(key)) next[tIdx].delete(key);
      else next[tIdx].add(key);
      return next;
    });
  };

  // Check wins
  useEffect(() => {
    if (!gameStarted || tickets.length === 0) return;
    const newWins = { ...wins };
    const msgs: string[] = [];

    tickets.forEach((ticket, tIdx) => {
      const marked = markedCells[tIdx] || new Set();
      // Count marked
      let totalMarked = 0;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
        if (ticket[r][c] !== null && marked.has(`${r}-${c}`)) totalMarked++;
      }
      // Early 5
      if (!newWins.early5 && totalMarked >= 5) { newWins.early5 = true; msgs.push(`Ticket ${tIdx + 1}: Early 5!`); }
      // Lines
      for (let r = 0; r < 3; r++) {
        const lineFilled = ticket[r].every((v, c) => v === null || marked.has(`${r}-${c}`));
        const lineKey = r === 0 ? "topLine" : r === 1 ? "middleLine" : "bottomLine";
        const lineName = r === 0 ? "Top Line" : r === 1 ? "Middle Line" : "Bottom Line";
        if (!newWins[lineKey] && lineFilled) { newWins[lineKey] = true; msgs.push(`Ticket ${tIdx + 1}: ${lineName}!`); }
      }
      // Full house
      if (!newWins.fullHouse && totalMarked >= 15) { newWins.fullHouse = true; msgs.push(`Ticket ${tIdx + 1}: FULL HOUSE!`); }
    });

    if (msgs.length > 0) {
      setWins(newWins);
      setWinMessages(prev => [...prev, ...msgs]);
    }
  }, [markedCells, gameStarted]);

  const lastCalled = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null;

  if (!gameStarted) {
    return (
      <div style={{ background: "#0a0a1a", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", color: "#e0e0e0" }}>
        <h1 style={{ color: "#ffd700", fontSize: "32px", marginBottom: "8px" }}>Tambola</h1>
        <p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>Indian Housie / Bingo</p>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#ccc", marginRight: "10px" }}>Tickets:</label>
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => setTicketCount(n)} style={{ padding: "8px 16px", margin: "0 4px", background: ticketCount === n ? "#ffd700" : "#1a1a3a", color: ticketCount === n ? "#0a0a1a" : "#ccc", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: ticketCount === n ? 700 : 400 }}>{n}</button>
          ))}
        </div>
        <button onClick={startGame} style={{ padding: "12px 40px", background: "#ffd700", color: "#0a0a1a", border: "none", borderRadius: "25px", fontSize: "18px", fontWeight: 700, cursor: "pointer" }}>Start Game</button>
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a1a", minHeight: "100vh", color: "#e0e0e0", fontFamily: "system-ui", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h1 style={{ color: "#ffd700", fontSize: "24px", margin: "0 0 8px" }}>Tambola</h1>

      {/* Last called */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
        <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: lastCalled ? "#ffd700" : "#1a1a3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 700, color: "#0a0a1a" }}>
          {lastCalled || "?"}
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#888" }}>Called: {calledNumbers.length}/90</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <button onClick={callNext} disabled={calledNumbers.length >= 90} style={{ padding: "6px 16px", background: "#4ecdc4", color: "#0a0a1a", border: "none", borderRadius: "15px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Next</button>
            <button onClick={() => setAutoCall(!autoCall)} style={{ padding: "6px 16px", background: autoCall ? "#ff6b6b" : "#1a1a3a", color: autoCall ? "#fff" : "#ccc", border: "1px solid #333", borderRadius: "15px", cursor: "pointer", fontSize: "12px" }}>{autoCall ? "Stop" : "Auto"}</button>
          </div>
        </div>
      </div>

      {/* Win conditions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px", justifyContent: "center" }}>
        {[["early5", "Early 5"], ["topLine", "Top Line"], ["middleLine", "Mid Line"], ["bottomLine", "Bot Line"], ["fullHouse", "Full House"]].map(([key, label]) => (
          <span key={key} style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", background: wins[key] ? "#4ecdc4" : "#1a1a3a", color: wins[key] ? "#0a0a1a" : "#888", fontWeight: wins[key] ? 700 : 400 }}>{label} {wins[key] ? "✓" : ""}</span>
        ))}
      </div>

      {/* Win messages */}
      {winMessages.length > 0 && (
        <div style={{ marginBottom: "12px", padding: "8px 16px", background: "#1a3a1a", borderRadius: "8px", maxHeight: "60px", overflowY: "auto" }}>
          {winMessages.map((m, i) => <div key={i} style={{ color: "#4ecdc4", fontSize: "12px" }}>{m}</div>)}
        </div>
      )}

      {/* Tickets */}
      {tickets.map((ticket, tIdx) => (
        <div key={tIdx} style={{ marginBottom: "16px", background: "#0d0d2a", borderRadius: "10px", padding: "10px", border: "1px solid #222" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Ticket {tIdx + 1}</div>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {ticket.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    const isCalled = cell !== null && calledNumbers.includes(cell);
                    const isMarked = markedCells[tIdx]?.has(`${r}-${c}`);
                    return (
                      <td key={c} onClick={() => toggleMark(tIdx, r, c)} style={{
                        width: "36px", height: "36px", textAlign: "center", border: "1px solid #222",
                        background: isMarked ? "#ffd700" : isCalled ? "#1a2a3a" : cell !== null ? "#111133" : "#0a0a1a",
                        color: isMarked ? "#0a0a1a" : isCalled ? "#4ecdc4" : "#ccc",
                        fontWeight: isMarked ? 700 : 400, cursor: cell !== null && isCalled ? "pointer" : "default",
                        fontSize: "14px", borderRadius: "3px", transition: "all 0.2s",
                      }}>
                        {cell ?? ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Called numbers board */}
      <div style={{ background: "#0d0d2a", borderRadius: "10px", padding: "10px", maxWidth: "360px" }}>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Number Board</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "3px" }}>
          {Array.from({ length: 90 }, (_, i) => i + 1).map(n => (
            <div key={n} style={{
              width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", borderRadius: "4px",
              background: calledNumbers.includes(n) ? (n === lastCalled ? "#ffd700" : "#4ecdc4") : "#111133",
              color: calledNumbers.includes(n) ? "#0a0a1a" : "#555",
              fontWeight: n === lastCalled ? 700 : 400,
            }}>{n}</div>
          ))}
        </div>
      </div>

      <button onClick={() => { setGameStarted(false); setAutoCall(false); }} style={{ marginTop: "16px", padding: "8px 24px", background: "transparent", color: "#888", border: "1px solid #333", borderRadius: "15px", cursor: "pointer", fontSize: "12px" }}>New Game</button>
    </div>
  );
}
