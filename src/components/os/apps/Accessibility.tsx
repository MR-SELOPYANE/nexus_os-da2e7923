import { Accessibility as A11yIcon, Contrast, Eye, MousePointer2, Keyboard, Volume2, Activity, Type } from "lucide-react";
import { useOS, type ColorBlindMode } from "@/os/store";
import { speak } from "@/lib/voice";

const COLOR_BLIND: { value: ColorBlindMode; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "protanopia", label: "Protanopia (red-blind)" },
  { value: "deuteranopia", label: "Deuteranopia (green-blind)" },
  { value: "tritanopia", label: "Tritanopia (blue-blind)" },
  { value: "achromatopsia", label: "Achromatopsia (mono)" },
];

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-glass-border bg-white/5 p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-white/15"}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export function Accessibility() {
  const a = useOS((s) => s.accessibility);
  const set = useOS((s) => s.setAccessibility);

  const speakSelection = () => {
    const sel = window.getSelection()?.toString() || "Hello. This is the Nexus screen reader.";
    speak(sel, { rate: a.ttsRate });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background/40 p-4">
      <div className="mb-4 flex items-center gap-2">
        <A11yIcon className="size-5 text-primary" />
        <div>
          <div className="text-base font-semibold">Accessibility Center</div>
          <div className="text-xs text-muted-foreground">Make NEXUS easier to see, hear, and control.</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vision</div>

        <Row label="High contrast" desc="Boost contrast across the UI">
          <Switch checked={a.highContrast} onChange={(v) => set({ highContrast: v })} />
        </Row>

        <Row label="Color-blind filter" desc="Adjust colors for common vision differences">
          <select
            value={a.colorBlind}
            onChange={(e) => set({ colorBlind: e.target.value as ColorBlindMode })}
            className="h-8 rounded-md border border-glass-border bg-white/5 px-2 text-xs"
          >
            {COLOR_BLIND.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Row>

        <Row label="Screen magnifier" desc="Hold lens near cursor (Win+= toggle)">
          <Switch checked={a.magnifier} onChange={(v) => set({ magnifier: v })} />
        </Row>

        {a.magnifier && (
          <Row label="Magnifier zoom" desc={`${a.magnifierZoom.toFixed(1)}×`}>
            <input
              type="range" min={1.5} max={4} step={0.1}
              value={a.magnifierZoom}
              onChange={(e) => set({ magnifierZoom: parseFloat(e.target.value) })}
              className="w-32"
            />
          </Row>
        )}

        <Row label="Large cursor" desc="Bigger pointer for visibility">
          <Switch checked={a.largeCursor} onChange={(v) => set({ largeCursor: v })} />
        </Row>

        <div className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Input</div>

        <Row label="Sticky keys" desc="Press modifier keys one at a time">
          <Switch checked={a.stickyKeys} onChange={(v) => set({ stickyKeys: v })} />
        </Row>

        <Row label="On-screen keyboard" desc="Floating virtual keyboard">
          <Switch checked={a.onScreenKeyboard} onChange={(v) => set({ onScreenKeyboard: v })} />
        </Row>

        <div className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Audio</div>

        <Row label="Text-to-Speech rate" desc={`${a.ttsRate.toFixed(1)}× — reads selected text`}>
          <input
            type="range" min={0.5} max={2} step={0.1}
            value={a.ttsRate}
            onChange={(e) => set({ ttsRate: parseFloat(e.target.value) })}
            className="w-32"
          />
        </Row>

        <Row label="Read selection aloud" desc="Speak currently highlighted text">
          <button
            onClick={speakSelection}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Volume2 className="size-3.5" /> Speak
          </button>
        </Row>

        <div className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Performance</div>

        <Row label="Performance HUD" desc="Show live FPS / frame time overlay">
          <Switch checked={a.perfHud} onChange={(v) => set({ perfHud: v })} />
        </Row>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><Contrast className="size-3" /> Contrast</div>
        <div className="flex items-center gap-1"><Eye className="size-3" /> Vision</div>
        <div className="flex items-center gap-1"><MousePointer2 className="size-3" /> Cursor</div>
        <div className="flex items-center gap-1"><Keyboard className="size-3" /> Input</div>
        <div className="flex items-center gap-1"><Type className="size-3" /> Reader</div>
        <div className="flex items-center gap-1"><Activity className="size-3" /> Perf</div>
      </div>
    </div>
  );
}
