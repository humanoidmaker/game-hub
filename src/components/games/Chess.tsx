import { useState, useCallback, useEffect, useRef } from "react";

// --- Types ---
type PieceChar = "K" | "Q" | "R" | "B" | "N" | "P" | "k" | "q" | "r" | "b" | "n" | "p";
type Cell = PieceChar | null;
type Board = Cell[][];
type Pos = [number, number];

interface GameState {
  board: Board;
  turn: "white" | "black";
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean };
  enPassant: Pos | null; // square that can be captured en passant
  halfMoves: number;
  moveHistory: string[];
  capturedWhite: PieceChar[]; // white pieces captured by black
  capturedBlack: PieceChar[]; // black pieces captured by white
  status: "playing" | "check" | "checkmate" | "stalemate" | "draw";
  winner: "white" | "black" | null;
}

// --- Constants ---
const INIT_BOARD: Board = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

const SYMBOLS: Record<PieceChar, string> = {
  K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
};

// Center control bonus table (symmetric for simplicity)
const CENTER_BONUS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 2, 3, 3, 2, 0, 0],
  [0, 0, 2, 3, 3, 2, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const FILE_LETTERS = "abcdefgh";

// --- Helpers ---
function isWhite(p: PieceChar): boolean {
  return p === p.toUpperCase();
}

function isColor(p: Cell, white: boolean): boolean {
  return p !== null && isWhite(p) === white;
}

function cloneBoard(b: Board): Board {
  return b.map((r) => [...r]);
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board: Board, white: boolean): Pos | null {
  const king: PieceChar = white ? "K" : "k";
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === king) return [r, c];
  return null;
}

// --- Attack detection (is a square attacked by 'attackerWhite' side?) ---
function isSquareAttacked(board: Board, row: number, col: number, attackerWhite: boolean): boolean {
  // Knight attacks
  for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
    const nr = row + dr, nc = col + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && isWhite(p) === attackerWhite && p.toLowerCase() === "n") return true;
    }
  }
  // King attacks
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr, nc = col + dc;
      if (inBounds(nr, nc)) {
        const p = board[nr][nc];
        if (p && isWhite(p) === attackerWhite && p.toLowerCase() === "k") return true;
      }
    }
  // Pawn attacks
  const pawnDir = attackerWhite ? 1 : -1; // white pawns attack upward (row-1), so from attacker perspective
  const pr = row + pawnDir;
  for (const pc of [col - 1, col + 1]) {
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && isWhite(p) === attackerWhite && p.toLowerCase() === "p") return true;
    }
  }
  // Rook/Queen (straight lines)
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as Pos[]) {
    let nr = row + dr, nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (isWhite(p) === attackerWhite && (p.toLowerCase() === "r" || p.toLowerCase() === "q")) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  // Bishop/Queen (diagonals)
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as Pos[]) {
    let nr = row + dr, nc = col + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (isWhite(p) === attackerWhite && (p.toLowerCase() === "b" || p.toLowerCase() === "q")) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

function isInCheck(board: Board, white: boolean): boolean {
  const king = findKing(board, white);
  if (!king) return false;
  return isSquareAttacked(board, king[0], king[1], !white);
}

// --- Move generation (pseudo-legal, then filtered for legality) ---
interface Move {
  from: Pos;
  to: Pos;
  promotion?: PieceChar;
  castle?: "K" | "Q" | "k" | "q";
  enPassant?: boolean;
}

function getPseudoLegalMoves(
  board: Board,
  white: boolean,
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
  enPassant: Pos | null
): Move[] {
  const moves: Move[] = [];

  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || isWhite(p) !== white) continue;
      const type = p.toLowerCase();

      if (type === "p") {
        const dir = white ? -1 : 1;
        const startRow = white ? 6 : 1;
        const promoRow = white ? 0 : 7;
        // Forward
        if (inBounds(r + dir, c) && !board[r + dir][c]) {
          if (r + dir === promoRow) {
            moves.push({ from: [r, c], to: [r + dir, c], promotion: (white ? "Q" : "q") as PieceChar });
          } else {
            moves.push({ from: [r, c], to: [r + dir, c] });
          }
          // Double push
          if (r === startRow && !board[r + 2 * dir][c]) {
            moves.push({ from: [r, c], to: [r + 2 * dir, c] });
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const nr = r + dir, nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (target && isWhite(target) !== white) {
            if (nr === promoRow) {
              moves.push({ from: [r, c], to: [nr, nc], promotion: (white ? "Q" : "q") as PieceChar });
            } else {
              moves.push({ from: [r, c], to: [nr, nc] });
            }
          }
          // En passant
          if (enPassant && enPassant[0] === nr && enPassant[1] === nc) {
            moves.push({ from: [r, c], to: [nr, nc], enPassant: true });
          }
        }
      } else if (type === "n") {
        for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && !isColor(board[nr][nc], white)) {
            moves.push({ from: [r, c], to: [nr, nc] });
          }
        }
      } else if (type === "k") {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc) && !isColor(board[nr][nc], white)) {
              moves.push({ from: [r, c], to: [nr, nc] });
            }
          }
        // Castling
        const row = white ? 7 : 0;
        if (r === row && c === 4) {
          // King-side
          const ck = white ? "K" : "k";
          if (castling[ck as keyof typeof castling] && !board[row][5] && !board[row][6] && board[row][7]?.toLowerCase() === "r") {
            if (
              !isSquareAttacked(board, row, 4, !white) &&
              !isSquareAttacked(board, row, 5, !white) &&
              !isSquareAttacked(board, row, 6, !white)
            ) {
              moves.push({ from: [r, c], to: [row, 6], castle: ck as "K" | "Q" | "k" | "q" });
            }
          }
          // Queen-side
          const cq = white ? "Q" : "q";
          if (castling[cq as keyof typeof castling] && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0]?.toLowerCase() === "r") {
            if (
              !isSquareAttacked(board, row, 4, !white) &&
              !isSquareAttacked(board, row, 3, !white) &&
              !isSquareAttacked(board, row, 2, !white)
            ) {
              moves.push({ from: [r, c], to: [row, 2], castle: cq as "K" | "Q" | "k" | "q" });
            }
          }
        }
      } else {
        // Sliding pieces: rook, bishop, queen
        const dirs: Pos[] =
          type === "r"
            ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
            : type === "b"
            ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
            : [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from: [r, c], to: [nr, nc] });
            } else {
              if (isWhite(target) !== white) moves.push({ from: [r, c], to: [nr, nc] });
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  return moves;
}

function applyMove(
  board: Board,
  move: Move,
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
  enPassant: Pos | null
): { board: Board; castling: typeof castling; enPassant: Pos | null; captured: Cell } {
  const nb = cloneBoard(board);
  const nc = { ...castling };
  let newEp: Pos | null = null;
  const piece = nb[move.from[0]][move.from[1]]!;
  let captured: Cell = nb[move.to[0]][move.to[1]];

  // En passant capture
  if (move.enPassant) {
    const capRow = move.from[0]; // the captured pawn is on the same row as the moving pawn
    captured = nb[capRow][move.to[1]];
    nb[capRow][move.to[1]] = null;
  }

  // Move piece
  nb[move.to[0]][move.to[1]] = move.promotion || piece;
  nb[move.from[0]][move.from[1]] = null;

  // Castling move rook
  if (move.castle) {
    const row = move.to[0];
    if (move.castle === "K" || move.castle === "k") {
      nb[row][5] = nb[row][7];
      nb[row][7] = null;
    } else {
      nb[row][3] = nb[row][0];
      nb[row][0] = null;
    }
  }

  // Update castling rights
  if (piece.toLowerCase() === "k") {
    if (isWhite(piece)) {
      nc.K = false;
      nc.Q = false;
    } else {
      nc.k = false;
      nc.q = false;
    }
  }
  if (piece.toLowerCase() === "r") {
    if (move.from[0] === 7 && move.from[1] === 7) nc.K = false;
    if (move.from[0] === 7 && move.from[1] === 0) nc.Q = false;
    if (move.from[0] === 0 && move.from[1] === 7) nc.k = false;
    if (move.from[0] === 0 && move.from[1] === 0) nc.q = false;
  }
  // If rook captured
  if (move.to[0] === 0 && move.to[1] === 7) nc.k = false;
  if (move.to[0] === 0 && move.to[1] === 0) nc.q = false;
  if (move.to[0] === 7 && move.to[1] === 7) nc.K = false;
  if (move.to[0] === 7 && move.to[1] === 0) nc.Q = false;

  // En passant square
  if (piece.toLowerCase() === "p" && Math.abs(move.to[0] - move.from[0]) === 2) {
    newEp = [(move.from[0] + move.to[0]) / 2, move.from[1]] as Pos;
  }

  return { board: nb, castling: nc, enPassant: newEp, captured };
}

function getLegalMoves(
  board: Board,
  white: boolean,
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
  enPassant: Pos | null
): Move[] {
  const pseudo = getPseudoLegalMoves(board, white, castling, enPassant);
  return pseudo.filter((move) => {
    const result = applyMove(board, move, castling, enPassant);
    return !isInCheck(result.board, white);
  });
}

// --- Algebraic notation ---
function moveToAlgebraic(board: Board, move: Move, legalMoves: Move[]): string {
  const piece = board[move.from[0]][move.from[1]]!;
  const type = piece.toLowerCase();
  const isCapture = !!board[move.to[0]][move.to[1]] || move.enPassant;
  const toStr = FILE_LETTERS[move.to[1]] + (8 - move.to[0]);

  if (move.castle) {
    return move.castle === "K" || move.castle === "k" ? "O-O" : "O-O-O";
  }

  if (type === "p") {
    let s = "";
    if (isCapture) s = FILE_LETTERS[move.from[1]] + "x";
    s += toStr;
    if (move.promotion) s += "=" + move.promotion.toUpperCase();
    return s;
  }

  const pieceLetter = type.toUpperCase();
  // Disambiguation
  const sameType = legalMoves.filter(
    (m) =>
      m.to[0] === move.to[0] &&
      m.to[1] === move.to[1] &&
      board[m.from[0]][m.from[1]]?.toLowerCase() === type &&
      (m.from[0] !== move.from[0] || m.from[1] !== move.from[1])
  );
  let disambig = "";
  if (sameType.length > 0) {
    const sameFile = sameType.some((m) => m.from[1] === move.from[1]);
    const sameRank = sameType.some((m) => m.from[0] === move.from[0]);
    if (!sameFile) disambig = FILE_LETTERS[move.from[1]];
    else if (!sameRank) disambig = String(8 - move.from[0]);
    else disambig = FILE_LETTERS[move.from[1]] + (8 - move.from[0]);
  }

  return pieceLetter + disambig + (isCapture ? "x" : "") + toStr;
}

// --- AI (minimax with alpha-beta) ---
function evaluateBoard(board: Board): number {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const val = PIECE_VALUES[p.toLowerCase()];
        const centerBonus = CENTER_BONUS[r][c] * 0.1;
        score += (isWhite(p) ? 1 : -1) * (val + centerBonus);
      }
    }
  return score;
}

function minimax(
  board: Board,
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
  enPassant: Pos | null,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  if (depth === 0) return evaluateBoard(board);

  const moves = getLegalMoves(board, maximizing, castling, enPassant);
  if (moves.length === 0) {
    if (isInCheck(board, maximizing)) return maximizing ? -9999 : 9999;
    return 0; // stalemate
  }

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, castling, enPassant);
      const ev = minimax(result.board, result.castling, result.enPassant, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const result = applyMove(board, move, castling, enPassant);
      const ev = minimax(result.board, result.castling, result.enPassant, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function findBestMove(
  board: Board,
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
  enPassant: Pos | null
): Move | null {
  const moves = getLegalMoves(board, false, castling, enPassant);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = Infinity;

  for (const move of moves) {
    const result = applyMove(board, move, castling, enPassant);
    const score = minimax(result.board, result.castling, result.enPassant, 2, -Infinity, Infinity, true);
    if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

// --- Initial state ---
function createInitialState(): GameState {
  return {
    board: cloneBoard(INIT_BOARD),
    turn: "white",
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null,
    halfMoves: 0,
    moveHistory: [],
    capturedWhite: [],
    capturedBlack: [],
    status: "playing",
    winner: null,
  };
}

// --- Component ---
export default function Chess() {
  const [game, setGame] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [highlightMoves, setHighlightMoves] = useState<Move[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute all legal moves for current side
  const allLegalMoves = useCallback(
    () => getLegalMoves(game.board, game.turn === "white", game.castling, game.enPassant),
    [game.board, game.turn, game.castling, game.enPassant]
  );

  // Check game status after a move
  function checkGameStatus(
    board: Board,
    nextWhite: boolean,
    castling: { K: boolean; Q: boolean; k: boolean; q: boolean },
    enPassant: Pos | null
  ): { status: GameState["status"]; winner: GameState["winner"] } {
    const moves = getLegalMoves(board, nextWhite, castling, enPassant);
    const inCheck = isInCheck(board, nextWhite);
    if (moves.length === 0) {
      if (inCheck) return { status: "checkmate", winner: nextWhite ? "black" : "white" };
      return { status: "stalemate", winner: null };
    }
    if (inCheck) return { status: "check", winner: null };
    return { status: "playing", winner: null };
  }

  // AI move
  useEffect(() => {
    if (game.turn === "black" && game.status !== "checkmate" && game.status !== "stalemate" && !aiThinking) {
      setAiThinking(true);
      aiTimeout.current = setTimeout(() => {
        setGame((prev) => {
          const bestMove = findBestMove(prev.board, prev.castling, prev.enPassant);
          if (!bestMove) return prev;

          const currentLegal = getLegalMoves(prev.board, false, prev.castling, prev.enPassant);
          const notation = moveToAlgebraic(prev.board, bestMove, currentLegal);
          const result = applyMove(prev.board, bestMove, prev.castling, prev.enPassant);
          const { status, winner } = checkGameStatus(result.board, true, result.castling, result.enPassant);

          const newCapturedBlack = [...prev.capturedBlack];
          // AI is black, so captured pieces go to capturedWhite (white captured by black) — wait no:
          // capturedBlack = black pieces captured by white. If AI (black) captures a white piece:
          const newCapturedWhite = [...prev.capturedWhite];
          if (result.captured) {
            if (isWhite(result.captured)) {
              newCapturedWhite.push(result.captured);
            } else {
              newCapturedBlack.push(result.captured);
            }
          }

          let notationFinal = notation;
          if (status === "checkmate") notationFinal += "#";
          else if (status === "check") notationFinal += "+";

          return {
            ...prev,
            board: result.board,
            turn: "white",
            castling: result.castling,
            enPassant: result.enPassant,
            moveHistory: [...prev.moveHistory, notationFinal],
            capturedWhite: newCapturedWhite,
            capturedBlack: newCapturedBlack,
            status,
            winner,
          };
        });
        setAiThinking(false);
      }, 500);
    }
    return () => {
      if (aiTimeout.current) clearTimeout(aiTimeout.current);
    };
  }, [game.turn, game.status, aiThinking]);

  const handleClick = useCallback(
    (r: number, c: number) => {
      if (game.turn !== "white" || game.status === "checkmate" || game.status === "stalemate" || aiThinking)
        return;

      const piece = game.board[r][c];

      if (selected) {
        // Check if clicked square is a valid move destination
        const move = highlightMoves.find((m) => m.to[0] === r && m.to[1] === c);
        if (move) {
          // Execute move
          const currentLegal = getLegalMoves(game.board, true, game.castling, game.enPassant);
          const notation = moveToAlgebraic(game.board, move, currentLegal);
          const result = applyMove(game.board, move, game.castling, game.enPassant);
          const { status, winner } = checkGameStatus(result.board, false, result.castling, result.enPassant);

          const newCapturedWhite = [...game.capturedWhite];
          const newCapturedBlack = [...game.capturedBlack];
          if (result.captured) {
            if (isWhite(result.captured)) {
              newCapturedWhite.push(result.captured);
            } else {
              newCapturedBlack.push(result.captured);
            }
          }

          let notationFinal = notation;
          if (status === "checkmate") notationFinal += "#";
          else if (status === "check") notationFinal += "+";

          setGame((prev) => ({
            ...prev,
            board: result.board,
            turn: "black",
            castling: result.castling,
            enPassant: result.enPassant,
            moveHistory: [...prev.moveHistory, notationFinal],
            capturedWhite: newCapturedWhite,
            capturedBlack: newCapturedBlack,
            status,
            winner,
          }));
          setSelected(null);
          setHighlightMoves([]);
          return;
        }

        // If clicking own piece, re-select
        if (piece && isWhite(piece)) {
          const moves = allLegalMoves().filter((m) => m.from[0] === r && m.from[1] === c);
          setSelected([r, c]);
          setHighlightMoves(moves);
          return;
        }

        // Deselect
        setSelected(null);
        setHighlightMoves([]);
      } else {
        if (piece && isWhite(piece)) {
          const moves = allLegalMoves().filter((m) => m.from[0] === r && m.from[1] === c);
          setSelected([r, c]);
          setHighlightMoves(moves);
        }
      }
    },
    [game, selected, highlightMoves, aiThinking, allLegalMoves]
  );

  const reset = () => {
    if (aiTimeout.current) clearTimeout(aiTimeout.current);
    setGame(createInitialState());
    setSelected(null);
    setHighlightMoves([]);
    setAiThinking(false);
  };

  // Find king position for check highlighting
  const whiteKing = findKing(game.board, true);
  const blackKing = findKing(game.board, false);
  const whiteInCheck = isInCheck(game.board, true);
  const blackInCheck = isInCheck(game.board, false);

  // Status text
  let statusText = "";
  if (game.status === "checkmate") statusText = `Checkmate! ${game.winner === "white" ? "White" : "Black"} wins!`;
  else if (game.status === "stalemate") statusText = "Stalemate! Draw.";
  else if (game.status === "check") statusText = `${game.turn === "white" ? "White" : "Black"} is in check!`;
  else if (aiThinking) statusText = "AI is thinking...";
  else statusText = `${game.turn === "white" ? "White" : "Black"}'s turn`;

  // Board rendering order
  const rows = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const rankLabels = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const fileLabels = flipped ? "hgfedcba" : "abcdefgh";

  const SQ = 56;
  const boardSize = SQ * 8;

  // Captured pieces display helper
  const renderCaptured = (pieces: PieceChar[], label: string) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, minHeight: 28 }}>
        {pieces
          .sort((a, b) => PIECE_VALUES[b.toLowerCase()] - PIECE_VALUES[a.toLowerCase()])
          .map((p, i) => (
            <span key={i} style={{ fontSize: 22 }}>
              {SYMBOLS[p]}
            </span>
          ))}
      </div>
    </div>
  );

  // Move history pairs
  const movePairs: { num: number; white: string; black?: string }[] = [];
  for (let i = 0; i < game.moveHistory.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: game.moveHistory[i],
      black: game.moveHistory[i + 1],
    });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        background: "#0a0a1a",
        minHeight: "100vh",
        color: "#e0e0e0",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>Chess</h2>

      {/* Status */}
      <div
        style={{
          fontSize: 16,
          marginBottom: 16,
          padding: "8px 20px",
          borderRadius: 8,
          background:
            game.status === "checkmate"
              ? "#b91c1c"
              : game.status === "stalemate"
              ? "#92400e"
              : game.status === "check"
              ? "#dc2626"
              : "#1e293b",
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {statusText}
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
        {/* Left panel: captured pieces */}
        <div
          style={{
            width: 140,
            background: "#111827",
            borderRadius: 10,
            padding: 12,
            minHeight: 200,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginBottom: 10, borderBottom: "1px solid #374151", paddingBottom: 6 }}>
            Captured
          </div>
          {renderCaptured(game.capturedWhite, "White pieces")}
          {renderCaptured(game.capturedBlack, "Black pieces")}
        </div>

        {/* Board */}
        <div>
          <div style={{ display: "flex" }}>
            {/* Rank labels */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginRight: 4 }}>
              {rankLabels.map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: SQ,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    fontSize: 12,
                    color: "#6b7280",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Board grid */}
            <div
              style={{
                border: "3px solid #374151",
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {rows.map((ri, rowIdx) => (
                <div key={rowIdx} style={{ display: "flex" }}>
                  {cols.map((ci, colIdx) => {
                    const isDark = (ri + ci) % 2 === 1;
                    const isSel = selected && selected[0] === ri && selected[1] === ci;
                    const isValidDest = highlightMoves.some((m) => m.to[0] === ri && m.to[1] === ci);
                    const cell = game.board[ri][ci];
                    const isCaptureDest = isValidDest && cell !== null;

                    // Check highlight
                    const isKingInCheck =
                      (whiteInCheck && whiteKing && whiteKing[0] === ri && whiteKing[1] === ci) ||
                      (blackInCheck && blackKing && blackKing[0] === ri && blackKing[1] === ci);

                    let bg = isDark ? "#779952" : "#edeed1";
                    if (isSel) bg = "#3b82f6";
                    else if (isKingInCheck) bg = "#ef4444";
                    else if (isCaptureDest) bg = isDark ? "#b45309" : "#f59e0b";
                    else if (isValidDest) bg = isDark ? "#4ade80aa" : "#bbf7d0";

                    return (
                      <div
                        key={colIdx}
                        onClick={() => handleClick(ri, ci)}
                        style={{
                          width: SQ,
                          height: SQ,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: bg,
                          cursor: "pointer",
                          fontSize: 40,
                          lineHeight: 1,
                          userSelect: "none",
                          position: "relative",
                        }}
                      >
                        {cell ? (
                          <span
                            style={{
                              textShadow: isWhite(cell)
                                ? "0 1px 3px rgba(0,0,0,0.5)"
                                : "0 1px 3px rgba(0,0,0,0.3)",
                              filter: isWhite(cell) ? "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" : "none",
                            }}
                          >
                            {SYMBOLS[cell]}
                          </span>
                        ) : isValidDest ? (
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.2)",
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* File labels */}
          <div style={{ display: "flex", marginLeft: 24 }}>
            {fileLabels.split("").map((f, i) => (
              <div
                key={i}
                style={{
                  width: SQ,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#6b7280",
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: move history */}
        <div
          style={{
            width: 180,
            background: "#111827",
            borderRadius: 10,
            padding: 12,
            maxHeight: boardSize + 40,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginBottom: 10, borderBottom: "1px solid #374151", paddingBottom: 6 }}>
            Moves
          </div>
          {movePairs.length === 0 && (
            <div style={{ fontSize: 12, color: "#4b5563", fontStyle: "italic" }}>No moves yet</div>
          )}
          {movePairs.map((pair, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 13,
                padding: "2px 0",
                borderBottom: "1px solid #1f2937",
                fontFamily: "monospace",
              }}
            >
              <span style={{ width: 30, color: "#6b7280", flexShrink: 0 }}>{pair.num}.</span>
              <span style={{ width: 60, color: "#e5e7eb", flexShrink: 0 }}>{pair.white}</span>
              <span style={{ width: 60, color: "#9ca3af" }}>{pair.black || ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button
          onClick={reset}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "none",
            background: "#10b981",
            color: "#000",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#10b981")}
        >
          New Game
        </button>
        <button
          onClick={() => setFlipped(!flipped)}
          style={{
            padding: "10px 28px",
            borderRadius: 8,
            border: "1px solid #374151",
            background: "#1e293b",
            color: "#e5e7eb",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1e293b")}
        >
          Flip Board
        </button>
      </div>
    </div>
  );
}
