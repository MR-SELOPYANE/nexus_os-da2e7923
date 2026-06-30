import { useState } from "react";

const KEYS = [
  "C", "±", "%", "÷",
  "7", "8", "9", "×",
  "4", "5", "6", "−",
  "1", "2", "3", "+",
  "0", ".", "=",
];

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const compute = (a: number, b: number, o: string) => {
    switch (o) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  };

  const press = (k: string) => {
    if (k === "C") {
      setDisplay("0"); setPrev(null); setOp(null); setFresh(true); return;
    }
    if (k === "±") { setDisplay((d) => (parseFloat(d) * -1).toString()); return; }
    if (k === "%") { setDisplay((d) => (parseFloat(d) / 100).toString()); return; }
    if (k === ".") {
      if (fresh) { setDisplay("0."); setFresh(false); return; }
      if (!display.includes(".")) setDisplay(display + ".");
      return;
    }
    if (["+", "−", "×", "÷"].includes(k)) {
      const cur = parseFloat(display);
      if (prev !== null && op && !fresh) {
        const r = compute(prev, cur, op);
        setDisplay(String(r)); setPrev(r);
      } else {
        setPrev(cur);
      }
      setOp(k); setFresh(true); return;
    }
    if (k === "=") {
      if (prev !== null && op) {
        const r = compute(prev, parseFloat(display), op);
        setDisplay(Number.isNaN(r) ? "Error" : String(r));
        setPrev(null); setOp(null); setFresh(true);
      }
      return;
    }
    // digit
    if (fresh) { setDisplay(k); setFresh(false); }
    else setDisplay(display === "0" ? k : display + k);
  };

  return (
    <div className="flex h-full flex-col bg-card p-3">
      <div className="mb-3 flex flex-1 items-end justify-end overflow-hidden rounded-lg bg-black/30 px-4 py-3">
        <span className="truncate font-mono text-4xl font-light tabular-nums">{display}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => {
          const isOp = ["÷", "×", "−", "+", "="].includes(k);
          const isFn = ["C", "±", "%"].includes(k);
          return (
            <button
              key={k}
              onClick={() => press(k)}
              className={[
                "h-12 rounded-lg text-lg font-medium transition-transform active:scale-95",
                k === "0" ? "col-span-2" : "",
                isOp
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : isFn
                    ? "bg-secondary text-secondary-foreground hover:bg-muted"
                    : "bg-white/10 hover:bg-white/15",
              ].join(" ")}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
