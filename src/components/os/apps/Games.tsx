import { useCallback, useEffect, useState } from "react";
import { Gamepad2, RotateCcw } from "lucide-react";

type Board = number[];

const SIZE = 4;
const empty = (): Board => Array(SIZE * SIZE).fill(0);

function spawn(b: Board): Board {
  const free = b.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (!free.length) return b;
  const idx = free[Math.floor(Math.random() * free.length)];
  const next = [...b];
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else out.push(vals[i]);
  }
  while (out.length < SIZE) out.push(0);
  return { row: out, gained };
}

function move(b: Board, dir: "left" | "right" | "up" | "down") {
  const next = empty();
  let gained = 0;
  for (let i = 0; i < SIZE; i++) {
    const line: number[] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx =
        dir === "left" || dir === "right" ? i * SIZE + j : j * SIZE + i;
      line.push(b[idx]);
    }
    const source = dir === "right" || dir === "down" ? [...line].reverse() : line;
    const res = slideRow(source);
    gained += res.gained;
    const final = dir === "right" || dir === "down" ? res.row.reverse() : res.row;
    for (let j = 0; j < SIZE; j++) {
      const idx =
        dir === "left" || dir === "right" ? i * SIZE + j : j * SIZE + i;
      next[idx] = final[j];
    }
  }
  const changed = next.some((v, i) => v !== b[i]);
  return { board: next, gained, changed };
}

const TILE: Record<number, string> = {
  2: "bg-white/10 text-foreground",
  4: "bg-white/15 text-foreground",
  8: "bg-amber-500/70 text-white",
  16: "bg-orange-500/70 text-white",
  32: "bg-rose-500/70 text-white",
  64: "bg-red-600/70 text-white",
  128: "bg-emerald-500/70 text-white",
  256: "bg-teal-500/70 text-white",
  512: "bg-sky-500/70 text-white",
  1024: "bg-indigo-500/80 text-white",
  2048: "bg-fuchsia-500/80 text-white",
};

export function Games() {
  const [board, setBoard] = useState<Board>(() => spawn(spawn(empty())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const b = Number(localStorage.getItem("nexus.2048.best") ?? 0);
    if (Number.isFinite(b)) setBest(b);
  }, []);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      try {
        localStorage.setItem("nexus.2048.best", String(score));
      } catch {
        /* ignore */
      }
    }
  }, [score, best]);

  const push = useCallback((dir: "left" | "right" | "up" | "down") => {
    setBoard((cur) => {
      const res = move(cur, dir);
      if (!res.changed) return cur;
      setScore((s) => s + res.gained);
      return spawn(res.board);
    });
  }, []);

  const dead =
    board.every((v) => v !== 0) &&
    (["left", "right", "up", "down"] as const).every((d) => !move(board, d).changed);

  const reset = () => {
    setBoard(spawn(spawn(empty())));
    setScore(0);
  };

  return (
    <div
      className="flex h-full flex-col items-center bg-background p-4 text-foreground outline-none"
      tabIndex={0}
      autoFocus
      onKeyDown={(e) => {
        const map = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowUp: "up",
          ArrowDown: "down",
        } as const;
        const dir = map[e.key as keyof typeof map];
        if (dir) {
          e.preventDefault();
          push(dir);
        }
      }}
    >
      <header className="mb-3 flex w-full max-w-sm items-center gap-2">
        <Gamepad2 className="size-5 text-primary" />
        <div className="font-semibold">2048</div>
        <div className="ml-auto flex gap-2 text-center text-xs">
          <div className="rounded bg-white/5 px-3 py-1">
            <div className="text-muted-foreground">Score</div>
            <div className="font-bold">{score}</div>
          </div>
          <div className="rounded bg-white/5 px-3 py-1">
            <div className="text-muted-foreground">Best</div>
            <div className="font-bold">{best}</div>
          </div>
          <button onClick={reset} className="rounded bg-primary px-3 text-primary-foreground">
            <RotateCcw className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative grid w-full max-w-sm grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
        {board.map((v, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-lg text-xl font-bold tabular-nums transition ${
              v === 0 ? "bg-white/5 text-transparent" : TILE[v] ?? "bg-primary text-primary-foreground"
            }`}
          >
            {v || 0}
          </div>
        ))}
        {dead && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/70">
            <div className="text-lg font-bold">Game over</div>
            <button
              onClick={reset}
              className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 sm:hidden">
        <span />
        <button onClick={() => push("up")} className="rounded bg-white/10 px-4 py-2">↑</button>
        <span />
        <button onClick={() => push("left")} className="rounded bg-white/10 px-4 py-2">←</button>
        <button onClick={() => push("down")} className="rounded bg-white/10 px-4 py-2">↓</button>
        <button onClick={() => push("right")} className="rounded bg-white/10 px-4 py-2">→</button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">Use the arrow keys to merge tiles.</div>
    </div>
  );
}
