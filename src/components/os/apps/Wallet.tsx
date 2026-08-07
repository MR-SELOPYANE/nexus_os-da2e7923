import { useEffect, useMemo, useState } from "react";
import { Wallet as WalletIcon, Plus, X, TrendingDown, TrendingUp } from "lucide-react";

interface Tx {
  id: string;
  label: string;
  amount: number; // positive = income, negative = expense
  category: string;
  date: string;
}

const KEY = "nexus.wallet.tx";
const CATEGORIES = ["Groceries", "Transport", "Airtime & Data", "Electricity", "Rent", "Income", "Other"];

const zar = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);

export function Wallet() {
  const [tx, setTx] = useState<Tx[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [income, setIncome] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setTx(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const save = (next: Tx[]) => {
    setTx(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const { balance, spent, earned, byCat } = useMemo(() => {
    let spent = 0;
    let earned = 0;
    const byCat: Record<string, number> = {};
    for (const t of tx) {
      if (t.amount < 0) {
        spent += -t.amount;
        byCat[t.category] = (byCat[t.category] ?? 0) + -t.amount;
      } else earned += t.amount;
    }
    return { balance: earned - spent, spent, earned, byCat };
  }, [tx]);

  const maxCat = Math.max(1, ...Object.values(byCat));

  const add = () => {
    const v = parseFloat(amount);
    if (!label.trim() || !Number.isFinite(v) || v <= 0) return;
    save([
      {
        id: crypto.randomUUID(),
        label: label.trim(),
        amount: income ? v : -v,
        category: income ? "Income" : category,
        date: new Date().toISOString(),
      },
      ...tx,
    ]);
    setLabel("");
    setAmount("");
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="border-b border-white/10 bg-gradient-to-r from-emerald-600/30 to-teal-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <WalletIcon className="size-6" />
          <div>
            <div className="font-semibold">Wallet</div>
            <div className="text-xs text-muted-foreground">Rand budget tracker · stored on this device</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Balance</div>
            <div className={`text-xl font-bold ${balance < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {zar(balance)}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-emerald-400" /> Income
          </div>
          <div className="text-lg font-semibold">{zar(earned)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingDown className="size-3.5 text-red-400" /> Spent
          </div>
          <div className="text-lg font-semibold">{zar(spent)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4">
        <input
          placeholder="Description"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="min-w-32 flex-1 rounded bg-white/5 px-2 py-1.5 text-sm outline-none"
        />
        <input
          placeholder="Amount (R)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="w-28 rounded bg-white/5 px-2 py-1.5 text-sm outline-none"
        />
        <select
          value={income ? "Income" : category}
          onChange={(e) => {
            const v = e.target.value;
            setIncome(v === "Income");
            if (v !== "Income") setCategory(v);
          }}
          className="rounded bg-white/5 px-2 py-1.5 text-sm outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-background">
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <ul className="flex-1 space-y-1 overflow-auto">
          {tx.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">
                  {t.category} · {new Date(t.date).toLocaleDateString()}
                </div>
              </div>
              <span className={t.amount < 0 ? "text-red-400" : "text-emerald-400"}>
                {t.amount < 0 ? "-" : "+"}
                {zar(Math.abs(t.amount)).replace("-", "")}
              </span>
              <button
                onClick={() => save(tx.filter((x) => x.id !== t.id))}
                className="text-muted-foreground hover:text-red-400"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {tx.length === 0 && (
            <li className="text-xs text-muted-foreground">No transactions yet.</li>
          )}
        </ul>

        <aside className="w-56 shrink-0 overflow-auto rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">By category</div>
          {Object.entries(byCat).length === 0 && (
            <div className="text-xs text-muted-foreground">Nothing spent yet.</div>
          )}
          {Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([c, v]) => (
              <div key={c} className="mb-2">
                <div className="flex justify-between text-xs">
                  <span>{c}</span>
                  <span className="text-muted-foreground">{zar(v)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-primary" style={{ width: `${(v / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
        </aside>
      </div>
    </div>
  );
}
