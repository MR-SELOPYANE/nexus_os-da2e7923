import { useState } from "react";
import { useOS } from "@/os/store";

const STEPS = [
  { title: "Welcome to NEXUS", body: "NEXUS is a desktop built for Africa — fast, light on data, and ready for load-shedding. Here's a 30-second look around." },
  { title: "Start menu & taskbar", body: "Open apps from the Start button at the bottom. Running apps appear on the taskbar; drag windows to screen edges to snap them." },
  { title: "Search anything", body: "Press Ctrl + K to find apps, files and settings instantly, or open the browser to search the web." },
  { title: "Meet the assistant", body: "The AI assistant can open apps, answer questions and talk to you in your language — just ask." },
  { title: "Made for South Africa", body: "Load-shedding alerts, Data Saver, the Offline Knowledge Hub, Student and Government hubs are all built in." },
  { title: "Your files", body: "File Explorer keeps your documents. On a NEXUS computer it opens your real disk, and 'Sync to disk' saves NEXUS files there." },
];

export function WelcomeTour() {
  const updateSA = useOS((s) => s.updateSA);
  const [i, setI] = useState(0);
  const done = () => updateSA({ tourDone: true });
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9998] grid place-items-center bg-background/60 backdrop-blur-sm">
      <div className="w-[min(440px,92vw)] rounded-2xl border border-glass-border bg-card p-6 shadow-2xl">
        <div className="mb-1 text-xs text-muted-foreground">
          Step {i + 1} of {STEPS.length}
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex gap-1">
          {STEPS.map((_, n) => (
            <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button onClick={done} className="text-sm text-muted-foreground hover:text-foreground">
            Skip tour
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                Back
              </button>
            )}
            <button
              onClick={() => (last ? done() : setI(i + 1))}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
            >
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
