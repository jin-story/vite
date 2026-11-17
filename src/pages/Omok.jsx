import { useEffect, useState } from "react";
import "./Omok.css";

const SIZE = 15;
const BLACK = 1;
const WHITE = 2;
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];
const STARS = [3, 7, 11];

const emptyBoard = () => Array(SIZE * SIZE).fill(0);
const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

// 방금 둔 돌 기준으로 5개 이상 이어졌는지 확인하고, 이어진 칸 목록을 돌려준다.
function findWin(board, idx) {
  const color = board[idx];
  const r0 = Math.floor(idx / SIZE);
  const c0 = idx % SIZE;
  for (const [dr, dc] of DIRS) {
    const line = [idx];
    for (const s of [1, -1]) {
      let r = r0 + dr * s;
      let c = c0 + dc * s;
      while (inside(r, c) && board[r * SIZE + c] === color) {
        line.push(r * SIZE + c);
        r += dr * s;
        c += dc * s;
      }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

// 빈 칸에 color 돌을 놓았다고 가정했을 때의 가치
function scoreAt(board, idx, color) {
  const r0 = Math.floor(idx / SIZE);
  const c0 = idx % SIZE;
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let count = 1;
    let open = 0;
    for (const s of [1, -1]) {
      let r = r0 + dr * s;
      let c = c0 + dc * s;
      while (inside(r, c) && board[r * SIZE + c] === color) {
        count++;
        r += dr * s;
        c += dc * s;
      }
      if (inside(r, c) && board[r * SIZE + c] === 0) open++;
    }
    if (count >= 5) total += 1000000;
    else if (open === 0) continue;
    else if (count === 4) total += open === 2 ? 100000 : 10000;
    else if (count === 3) total += open === 2 ? 8000 : 500;
    else if (count === 2) total += open === 2 ? 300 : 40;
    else total += open === 2 ? 10 : 2;
  }
  return total;
}

function aiMove(board, me) {
  const opp = me === BLACK ? WHITE : BLACK;
  if (board.every((v) => v === 0)) return 7 * SIZE + 7;
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== 0) continue;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++)
      for (let dc = -2; dc <= 2 && !near; dc++)
        if (inside(r + dr, c + dc) && board[(r + dr) * SIZE + c + dc] !== 0)
          near = true;
    if (!near) continue;
    const center = 14 - Math.abs(r - 7) - Math.abs(c - 7);
    const s =
      scoreAt(board, i, me) * 1.1 + scoreAt(board, i, opp) + center + Math.random();
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

function loadWins() {
  try {
    return JSON.parse(localStorage.getItem("omok-record")) ?? { win: 0, lose: 0 };
  } catch {
    return { win: 0, lose: 0 };
  }
}

export default function Omok() {
  const [mode, setMode] = useState("ai"); // "ai" | "pvp"
  const [board, setBoard] = useState(emptyBoard);
  const [history, setHistory] = useState([]);
  const [winLine, setWinLine] = useState(null);
  const [record, setRecord] = useState(loadWins);

  const turn = history.length % 2 === 0 ? BLACK : WHITE;
  const last = history[history.length - 1];
  const winner = winLine ? board[winLine[0]] : 0;
  const draw = !winner && history.length === SIZE * SIZE;
  const aiThinking = mode === "ai" && turn === WHITE && !winner && !draw;

  function place(idx) {
    if (board[idx] !== 0 || winner) return;
    const next = board.slice();
    next[idx] = turn;
    const line = findWin(next, idx);
    setBoard(next);
    setHistory((h) => [...h, idx]);
    if (line) {
      setWinLine(line);
      if (mode === "ai") {
        const key = turn === BLACK ? "win" : "lose";
        const updated = { ...record, [key]: record[key] + 1 };
        setRecord(updated);
        try {
          localStorage.setItem("omok-record", JSON.stringify(updated));
        } catch {
          /* 저장이 안 돼도 게임은 계속 */
        }
      }
    }
  }

  useEffect(() => {
    if (!aiThinking) return;
    const t = setTimeout(() => place(aiMove(board, WHITE)), 350);
    return () => clearTimeout(t);
  });

  function reset(nextMode = mode) {
    setMode(nextMode);
    setBoard(emptyBoard());
    setHistory([]);
    setWinLine(null);
  }

  function undo() {
    // AI 대전에서는 내 수와 AI 수를 함께 무른다.
    const steps = mode === "ai" ? (history.length % 2 === 0 ? 2 : 1) : 1;
    const n = Math.min(steps, history.length);
    if (n === 0) return;
    const next = board.slice();
    history.slice(-n).forEach((i) => (next[i] = 0));
    setBoard(next);
    setHistory(history.slice(0, -n));
    setWinLine(null);
  }

  const name = (color) =>
    mode === "ai" ? (color === BLACK ? "나" : "컴퓨터") : color === BLACK ? "흑" : "백";

  let status;
  if (winner) status = mode === "ai" ? (winner === BLACK ? "이겼어요! 🎉" : "컴퓨터가 이겼어요") : `${name(winner)} 승리!`;
  else if (draw) status = "무승부";
  else if (aiThinking) status = "컴퓨터가 생각 중…";
  else status = `${name(turn)} 차례 (${turn === BLACK ? "흑" : "백"})`;

  const cell = 32;
  const pad = cell;
  const span = cell * (SIZE - 1);
  const dim = span + pad * 2;
  const winSet = new Set(winLine ?? []);

  return (
    <div className="omok">
      <h1>오목</h1>

      <div className="omok-bar">
        <div className="omok-modes" role="group" aria-label="게임 모드">
          <button className={mode === "ai" ? "on" : ""} onClick={() => reset("ai")}>
            컴퓨터와 대전
          </button>
          <button className={mode === "pvp" ? "on" : ""} onClick={() => reset("pvp")}>
            둘이서
          </button>
        </div>
        {mode === "ai" && (
          <span className="omok-record">
            전적 {record.win}승 {record.lose}패
          </span>
        )}
      </div>

      <p className={`omok-status ${winner ? "done" : ""}`} aria-live="polite">
        {status}
      </p>

      <div className="omok-board-wrap">
        <svg
          className="omok-board"
          viewBox={`0 0 ${dim} ${dim}`}
          role="grid"
          aria-label="오목판"
        >
          <rect width={dim} height={dim} rx="10" className="wood" />
          {Array.from({ length: SIZE }, (_, i) => (
            <g key={i} className="line">
              <line x1={pad} y1={pad + i * cell} x2={pad + span} y2={pad + i * cell} />
              <line x1={pad + i * cell} y1={pad} x2={pad + i * cell} y2={pad + span} />
            </g>
          ))}
          {STARS.flatMap((r) =>
            STARS.map((c) => (
              <circle key={`${r}-${c}`} cx={pad + c * cell} cy={pad + r * cell} r="3.5" className="star" />
            )),
          )}
          {board.map((v, i) => {
            const x = pad + (i % SIZE) * cell;
            const y = pad + Math.floor(i / SIZE) * cell;
            const playable = v === 0 && !winner && !aiThinking;
            return (
              <g key={i}>
                {playable && (
                  <circle
                    cx={x}
                    cy={y}
                    r={cell * 0.43}
                    className={`ghost ${turn === BLACK ? "b" : "w"}`}
                  />
                )}
                {v !== 0 && (
                  <circle
                    cx={x}
                    cy={y}
                    r={cell * 0.45}
                    className={`stone ${v === BLACK ? "b" : "w"} ${winSet.has(i) ? "win" : ""}`}
                  />
                )}
                {i === last && !winner && (
                  <circle cx={x} cy={y} r="4" className={`last ${v === BLACK ? "on-b" : "on-w"}`} />
                )}
                <rect
                  x={x - cell / 2}
                  y={y - cell / 2}
                  width={cell}
                  height={cell}
                  className={`hit ${playable ? "can" : ""}`}
                  onClick={() => playable && place(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="omok-actions">
        <button onClick={undo} disabled={history.length === 0 || aiThinking}>
          무르기
        </button>
        <button onClick={() => reset()} className="primary">
          새 게임
        </button>
      </div>
      <p className="omok-help">
        가로, 세로, 대각선으로 돌 5개를 먼저 이으면 이깁니다. 흑이 먼저 둡니다.
      </p>
    </div>
  );
}
