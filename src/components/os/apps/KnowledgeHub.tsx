import { useMemo, useState } from "react";
import { BookOpen, GraduationCap, Sprout, Stethoscope, Hammer, Search } from "lucide-react";

interface Article { id: string; title: string; category: string; body: string }

const ARTICLES: Article[] = [
  { id: "a1", category: "Wikipedia", title: "Nelson Mandela", body: "South African anti-apartheid activist and statesman. First democratically elected president (1994–1999). Nobel Peace Prize 1993." },
  { id: "a2", category: "Wikipedia", title: "Table Mountain", body: "Flat-topped mountain overlooking Cape Town. Part of Table Mountain National Park. Iconic South African landmark." },
  { id: "a3", category: "Khan Academy", title: "Algebra: Solving Linear Equations", body: "To solve ax + b = c, isolate x by subtracting b then dividing by a. Practice: 3x + 5 = 20 → x = 5." },
  { id: "a4", category: "Khan Academy", title: "Photosynthesis basics", body: "Plants convert sunlight + CO2 + water into glucose and oxygen using chlorophyll in chloroplasts." },
  { id: "a5", category: "Farming", title: "Maize planting seasons (SA)", body: "Plant in the summer rainfall region between October and December. Row spacing 90cm, seed depth 5cm. Fertilise with LAN after emergence." },
  { id: "a6", category: "Farming", title: "Rainwater harvesting", body: "Divert roof runoff via gutters into JoJo tanks. First-flush diverters remove debris. Store for garden or greywater use." },
  { id: "a7", category: "Medical", title: "CPR — Adult", body: "30 chest compressions (5cm deep, 100-120/min) then 2 rescue breaths. Continue until responders arrive or the person breathes." },
  { id: "a8", category: "Medical", title: "Snake bite first aid", body: "Keep the person calm and still. Immobilise the limb below heart level. Do NOT cut or suck the wound. Call ER24 / 10177 immediately." },
  { id: "a9", category: "DIY", title: "Fix a leaking tap", body: "Shut off water. Remove handle & cartridge. Replace the washer/O-ring. Reassemble and test. Most SA taps use 1/2\" cartridges." },
];

const ICONS: Record<string, typeof BookOpen> = {
  Wikipedia: BookOpen,
  "Khan Academy": GraduationCap,
  Farming: Sprout,
  Medical: Stethoscope,
  DIY: Hammer,
};

export function KnowledgeHub() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Article>(ARTICLES[0]);
  const cats = Array.from(new Set(ARTICLES.map((a) => a.category)));
  const filtered = useMemo(
    () =>
      ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(q.toLowerCase()) ||
          a.body.toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  return (
    <div className="flex h-full bg-background text-foreground">
      <aside className="w-64 border-r border-white/10 bg-black/25 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Offline Knowledge · 2.1 GB
        </div>
        <div className="mb-3 flex items-center gap-1 rounded-md bg-white/5 px-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search offline…"
            className="w-full bg-transparent py-1.5 text-xs outline-none"
          />
        </div>
        {cats.map((c) => {
          const Icon = ICONS[c] ?? BookOpen;
          return (
            <div key={c} className="mb-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="size-3.5" /> {c}
              </div>
              <ul className="space-y-0.5">
                {filtered
                  .filter((a) => a.category === c)
                  .map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => setActive(a)}
                        className={`w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-white/10 ${
                          active.id === a.id ? "bg-primary/20 text-primary" : ""
                        }`}
                      >
                        {a.title}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          {active.category}
        </div>
        <h1 className="mb-4 text-2xl font-bold">{active.title}</h1>
        <p className="leading-relaxed text-foreground/90">{active.body}</p>
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
          ✓ Available offline · No data required · Curated for South Africa
        </div>
      </main>
    </div>
  );
}
