import { useState } from "react";
import { GraduationCap, Calculator, BookOpen, PenLine, Timer, Trophy } from "lucide-react";

const SUBJECTS = [
  { id: "math", name: "Mathematics", grade: "Grade 10-12", progress: 62 },
  { id: "phys", name: "Physical Sciences", grade: "Grade 10-12", progress: 41 },
  { id: "life", name: "Life Sciences", grade: "Grade 10-12", progress: 28 },
  { id: "eng", name: "English HL", grade: "Grade 10-12", progress: 74 },
  { id: "afr", name: "Afrikaans FAL", grade: "Grade 10-12", progress: 12 },
  { id: "his", name: "History", grade: "Grade 10-12", progress: 55 },
];

const PAST_PAPERS = [
  "Maths P1 · Nov 2023 · Memo",
  "Maths P2 · Nov 2023 · Memo",
  "Physical Sci P1 · Nov 2023 · Memo",
  "English HL P2 · Nov 2023 · Memo",
];

export function Student() {
  const [tab, setTab] = useState<"subjects" | "papers" | "tools">("subjects");
  const [focus, setFocus] = useState(25);
  const [running, setRunning] = useState(false);
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/20 px-4 py-3">
        <GraduationCap className="size-6" />
        <div>
          <div className="font-semibold">NEXUS Student Edition</div>
          <div className="text-xs text-muted-foreground">CAPS-aligned · No ads · Works offline</div>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-300">
          <Trophy className="size-3" /> 340 XP
        </div>
      </header>

      <nav className="flex gap-1 border-b border-white/10 bg-black/20 px-3 py-1 text-sm">
        {(["subjects", "papers", "tools"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 capitalize ${tab === t ? "bg-primary/20 text-primary" : "hover:bg-white/10"}`}
          >
            {t === "papers" ? "Past Papers" : t}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto p-4">
        {tab === "subjects" && (
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((s) => (
              <div key={s.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-medium">{s.name}</div>
                  <BookOpen className="size-4 text-muted-foreground" />
                </div>
                <div className="mb-2 text-xs text-muted-foreground">{s.grade}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-primary" style={{ width: `${s.progress}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{s.progress}% complete</div>
              </div>
            ))}
          </div>
        )}
        {tab === "papers" && (
          <ul className="space-y-2">
            {PAST_PAPERS.map((p) => (
              <li key={p} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <span>{p}</span>
                <button className="rounded bg-primary/20 px-3 py-1 text-xs text-primary hover:bg-primary/30">Download</button>
              </li>
            ))}
          </ul>
        )}
        {tab === "tools" && (
          <div className="grid grid-cols-3 gap-3">
            <ToolCard icon={<Calculator className="size-5" />} label="Scientific Calc" />
            <ToolCard icon={<PenLine className="size-5" />} label="Essay Assistant" />
            <ToolCard icon={<BookOpen className="size-5" />} label="Flashcards" />
            <div className="col-span-3 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Timer className="size-4" /> Pomodoro focus timer
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={focus}
                  onChange={(e) => setFocus(+e.target.value)}
                  className="w-20 rounded bg-white/5 px-2 py-1 text-sm"
                />
                <span className="text-xs text-muted-foreground">min</span>
                <button
                  onClick={() => setRunning((r) => !r)}
                  className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
                >
                  {running ? "Pause" : "Start"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10">
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
