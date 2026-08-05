import { useRef, useState } from "react";
import { useOS, THEME_PRESETS, type ThemeId, type ThemeTokens, type SearchEngineId } from "@/os/store";
import { WALLPAPERS } from "@/os/wallpapers";
import {
  Palette,
  Image as ImageIcon,
  User,
  Eye,
  RotateCcw,
  Monitor,
  Volume2,
  Bell,
  Wifi,
  Clock as ClockIcon,
  Layout,
  Info,
  Search,
  Moon,
  Plane,
  Paintbrush,
  Download,
  Upload,
  Lock,
  type LucideIcon,
} from "lucide-react";

type SectionId =
  | "personalization"
  | "themes"
  | "wallpaper"
  | "browser"
  | "display"
  | "sound"
  | "notifications"
  | "network"
  | "datetime"
  | "taskbar"
  | "accessibility"
  | "account"
  | "about"
  | "system";

interface NavItem {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  group: "Personal" | "System" | "Account";
}

const NAV: NavItem[] = [
  { id: "personalization", label: "Personalization", icon: Palette, group: "Personal" },
  { id: "themes", label: "Themes", icon: Paintbrush, group: "Personal" },
  { id: "wallpaper", label: "Wallpaper", icon: ImageIcon, group: "Personal" },
  { id: "taskbar", label: "Taskbar & Dock", icon: Layout, group: "Personal" },
  { id: "browser", label: "Browser", icon: Search, group: "System" },
  { id: "display", label: "Display", icon: Monitor, group: "System" },
  { id: "sound", label: "Sound", icon: Volume2, group: "System" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "System" },
  { id: "network", label: "Network", icon: Wifi, group: "System" },
  { id: "datetime", label: "Date & Time", icon: ClockIcon, group: "System" },
  { id: "accessibility", label: "Accessibility", icon: Eye, group: "System" },
  { id: "account", label: "Account", icon: User, group: "Account" },
  { id: "about", label: "About", icon: Info, group: "Account" },
  { id: "system", label: "Reset", icon: RotateCcw, group: "Account" },
];

const ACCENTS = [
  { name: "Nexus", value: "0.72 0.13 195" },
  { name: "Coral", value: "0.7 0.18 25" },
  { name: "Lime", value: "0.78 0.18 135" },
  { name: "Violet", value: "0.65 0.2 295" },
  { name: "Gold", value: "0.8 0.15 85" },
  { name: "Sky", value: "0.7 0.15 240" },
];

export function Settings() {
  const settings = useOS((s) => s.settings);
  const update = useOS((s) => s.updateSettings);
  const reset = useOS((s) => s.resetSystem);
  const notify = useOS((s) => s.notify);
  const quick = useOS((s) => s.quick);
  const setQuick = useOS((s) => s.setQuick);
  const network = useOS((s) => s.network);
  const toggleAirplane = useOS((s) => s.toggleAirplane);

  const [active, setActive] = useState<SectionId>("personalization");
  const [query, setQuery] = useState("");

  const filtered = NAV.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = ["Personal", "System", "Account"] as const;

  return (
    <div className="flex h-full bg-card">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-black/20">
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-md border border-input bg-black/30 py-1.5 pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <nav className="os-scroll flex-1 overflow-y-auto px-2 pb-3">
          {groups.map((g) => {
            const items = filtered.filter((n) => n.group === g);
            if (!items.length) return null;
            return (
              <div key={g} className="mb-3">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g}
                </div>
                {items.map((n) => {
                  const Icon = n.icon;
                  const isActive = active === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setActive(n.id)}
                      className={[
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/20 text-foreground"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                      ].join(" ")}
                    >
                      <Icon className="size-4" />
                      {n.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="os-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-6">
          {active === "personalization" && (
            <Panel title="Personalization" description="Make NEXUS feel like yours.">
              <Row label="Accent color">
                <div className="flex flex-wrap gap-3">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => update({ accent: a.value })}
                      title={a.name}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className="size-9 rounded-full transition-all"
                        style={{
                          backgroundColor: `oklch(${a.value})`,
                          boxShadow:
                            settings.accent === a.value
                              ? `0 0 0 2px var(--card), 0 0 0 4px oklch(${a.value})`
                              : "none",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">{a.name}</span>
                    </button>
                  ))}
                </div>
              </Row>
              <Toggle
                label="Reduce transparency"
                description="Use solid surfaces instead of blur."
                checked={settings.reduceTransparency}
                onChange={(v) => update({ reduceTransparency: v })}
              />
              <Toggle
                label="Enable animations"
                description="Window and menu motion."
                checked={settings.animationsEnabled}
                onChange={(v) => update({ animationsEnabled: v })}
              />
            </Panel>
          )}

          {active === "themes" && <ThemesPanel />}

          {active === "browser" && (
            <Panel title="Browser" description="Default search engine and privacy for Nexus Browser.">
              <div className="space-y-2">
                <p className="text-sm font-medium">Default search engine</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "brave", label: "Brave", desc: "Privacy-focused, no tracking" },
                    { id: "duckduckgo", label: "DuckDuckGo", desc: "Anonymous search" },
                    { id: "google", label: "Google", desc: "Comprehensive results" },
                    { id: "nexus", label: "Nexus Search", desc: "Native meta-search page" },
                  ] as { id: SearchEngineId; label: string; desc: string }[]).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => update({ searchEngine: e.id })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        settings.searchEngine === e.id
                          ? "border-primary bg-primary/10"
                          : "border-glass-border bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <p className="text-sm font-medium">{e.label}</p>
                      <p className="text-xs text-muted-foreground">{e.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Nexus Browser fetches pages through a server-side proxy that strips X-Frame-Options and CSP, letting most sites render inside the shell. It's a real browsing surface — not a real browser engine (that would need native code, not JavaScript).
                </p>
              </div>
            </Panel>
          )}




          {active === "wallpaper" && (
            <Panel title="Wallpaper" description="Choose a background for the desktop.">
              <div className="grid grid-cols-3 gap-3">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => update({ wallpaperId: w.id })}
                    className={`group relative aspect-video overflow-hidden rounded-lg ring-2 transition-all ${
                      settings.wallpaperId === w.id
                        ? "ring-primary"
                        : "ring-transparent hover:ring-white/30"
                    }`}
                    style={{ background: w.gradient }}
                  >
                    <span className="absolute bottom-1 left-1.5 text-[10px] font-medium text-white drop-shadow">
                      {w.name}
                    </span>
                  </button>
                ))}
              </div>
              <Row label="Dim overlay">
                <input
                  type="range"
                  min={0}
                  max={70}
                  value={settings.wallpaperDim}
                  onChange={(e) => update({ wallpaperDim: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">{settings.wallpaperDim}%</p>
              </Row>
            </Panel>
          )}

          {active === "taskbar" && (
            <Panel title="Taskbar & Dock" description="Where the dock lives.">
              <Row label="Position">
                <div className="flex gap-2">
                  {(["bottom", "top"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => update({ taskbarPosition: p })}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
                        settings.taskbarPosition === p
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Row>
            </Panel>
          )}

          {active === "display" && (
            <Panel title="Display" description="Brightness and screen comfort.">
              <Row label="Brightness">
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={quick.brightness}
                  onChange={(e) => setQuick({ brightness: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">{quick.brightness}%</p>
              </Row>
              <Toggle
                label="Night light"
                description="Warm the screen to reduce blue light."
                icon={Moon}
                checked={quick.nightLight}
                onChange={(v) => setQuick({ nightLight: v })}
              />
            </Panel>
          )}

          {active === "sound" && (
            <Panel title="Sound" description="System volume.">
              <Row label="Output volume">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={quick.volume}
                  onChange={(e) => setQuick({ volume: Number(e.target.value) })}
                  className="w-full accent-[var(--primary)]"
                />
                <p className="mt-1 text-xs text-muted-foreground">{quick.volume}%</p>
              </Row>
            </Panel>
          )}

          {active === "notifications" && (
            <Panel title="Notifications" description="How NEXUS interrupts you.">
              <Toggle
                label="Do not disturb"
                description="Silence pop-up toasts."
                checked={quick.doNotDisturb}
                onChange={(v) => setQuick({ doNotDisturb: v })}
              />
              <Toggle
                label="Show desktop widgets"
                description="Calendar, weather and mini-apps on the desktop."
                checked={quick.widgetsVisible}
                onChange={(v) => setQuick({ widgetsVisible: v })}
              />
            </Panel>
          )}

          {active === "network" && (
            <Panel title="Network" description="Wi-Fi and connectivity.">
              <Row label="Status">
                <div className="rounded-md border border-border bg-black/20 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Connection</span>
                    <span className={network.online ? "text-emerald-400" : "text-rose-400"}>
                      {network.online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Network</span>
                    <span>{network.ssid ?? "—"}</span>
                  </div>
                </div>
              </Row>
              <Toggle
                label="Airplane mode"
                description="Turn off all wireless."
                icon={Plane}
                checked={network.airplane}
                onChange={() => toggleAirplane()}
              />
            </Panel>
          )}

          {active === "datetime" && (
            <Panel title="Date & Time" description="Clock format and locale.">
              <Toggle
                label="Use 24-hour clock"
                description="Display time as 14:30 instead of 2:30 PM."
                checked={settings.clock24h}
                onChange={(v) => update({ clock24h: v })}
              />
              <Row label="Current time">
                <div className="rounded-md border border-border bg-black/20 px-3 py-2 text-sm">
                  {new Date().toLocaleString([], { hour12: !settings.clock24h })}
                </div>
              </Row>
            </Panel>
          )}

          {active === "accessibility" && (
            <Panel title="Accessibility" description="Make NEXUS easier to use.">
              <Toggle
                label="Larger text"
                description="Increase base font size across the system."
                checked={settings.largeText}
                onChange={(v) => update({ largeText: v })}
              />
              <Toggle
                label="Reduce transparency"
                description="Solid surfaces are easier to read."
                checked={settings.reduceTransparency}
                onChange={(v) => update({ reduceTransparency: v })}
              />
              <Toggle
                label="Reduce motion"
                description="Disable window and menu animations."
                checked={!settings.animationsEnabled}
                onChange={(v) => update({ animationsEnabled: !v })}
              />
            </Panel>
          )}

          {active === "account" && (
            <Panel title="Account" description="Your NEXUS profile.">
              <Row label="Display name">
                <input
                  value={settings.username}
                  onChange={(e) => update({ username: e.target.value || "guest" })}
                  className="w-full rounded-md border border-input bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </Row>
            </Panel>
          )}

          {active === "about" && (
            <Panel title="About" description="System information.">
              <InfoRow label="Operating system" value="NEXUS" />
              <InfoRow label="Version" value="1.0.0" />
              <InfoRow label="Build" value="nexus-stable-2026.06" />
              <InfoRow label="User" value={settings.username} />
              <InfoRow label="Wallpaper" value={settings.wallpaperId} />
            </Panel>
          )}

          {active === "system" && (
            <Panel title="Reset" description="Restore NEXUS to factory defaults.">
              <p className="mb-3 text-sm text-muted-foreground">
                This wipes your files, settings, restore points and installed packages. It cannot be
                undone.
              </p>
              <button
                onClick={() => {
                  if (confirm("Reset NEXUS to factory defaults? This wipes your files.")) {
                    reset();
                    notify({ title: "System", message: "NEXUS was reset to defaults." });
                  }
                }}
                className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:brightness-110"
              >
                Reset system & wipe files
              </button>
            </Panel>
          )}
        </div>
      </main>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mb-5 mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-black/10 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: LucideIcon;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-black/10 p-3 transition-colors hover:bg-black/20">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 size-4 text-primary" />}
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-white/15"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 opacity-0"
        />
        <span
          className={`size-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-black/10 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const THEME_META: { id: ThemeId; label: string; desc: string }[] = [
  { id: "dark", label: "Dark", desc: "Default deep navy surfaces." },
  { id: "light", label: "Light", desc: "Bright, high-legibility." },
  { id: "midnight", label: "Midnight", desc: "Near-black with violet tint." },
  { id: "custom", label: "Custom", desc: "Your own tokens." },
];

const TOKEN_FIELDS: { key: keyof ThemeTokens; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "card", label: "Card" },
  { key: "muted", label: "Muted" },
  { key: "mutedForeground", label: "Muted text" },
  { key: "border", label: "Border" },
  { key: "window", label: "Window" },
  { key: "taskbar", label: "Taskbar" },
  { key: "glass", label: "Glass" },
];

function ThemesPanel() {
  const settings = useOS((s) => s.settings);
  const update = useOS((s) => s.updateSettings);
  const notify = useOS((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);
  const active = settings.theme;
  const custom = settings.customTheme;

  const applyPreset = (id: ThemeId) => {
    if (id === "custom") {
      update({ theme: "custom" });
    } else {
      update({ theme: id, customTheme: THEME_PRESETS[id] });
    }
  };

  const setToken = (k: keyof ThemeTokens, v: string) => {
    update({ theme: "custom", customTheme: { ...custom, [k]: v } });
  };

  const exportTheme = () => {
    const payload = { name: settings.theme, accent: settings.accent, tokens: custom };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-theme-${settings.theme}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify({ title: "Theme exported", message: a.download });
  };

  const importTheme = (file: File) => {
    file.text().then((t) => {
      try {
        const j = JSON.parse(t);
        if (j.tokens && typeof j.tokens.background === "string") {
          update({ theme: "custom", customTheme: j.tokens, ...(typeof j.accent === "string" ? { accent: j.accent } : {}) });
          notify({ title: "Theme imported", message: "Custom theme applied." });
        } else {
          notify({ title: "Invalid theme file", message: "Missing tokens." });
        }
      } catch {
        notify({ title: "Invalid theme file", message: "Could not parse JSON." });
      }
    });
  };

  return (
    <Panel title="Themes" description="Change base colors and surfaces across NEXUS.">
      <Row label="Preset">
        <div className="grid grid-cols-2 gap-2">
          {THEME_META.map((t) => {
            const isActive = active === t.id;
            const tokens = t.id === "custom" ? custom : THEME_PRESETS[t.id];
            return (
              <button
                key={t.id}
                onClick={() => applyPreset(t.id)}
                className={`overflow-hidden rounded-lg border text-left transition-all ${isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-white/40"}`}
              >
                <div
                  className="flex h-14 items-center justify-end gap-1 px-3"
                  style={{ backgroundColor: `oklch(${tokens.background})` }}
                >
                  <span className="size-3 rounded-full" style={{ backgroundColor: `oklch(${tokens.card})` }} />
                  <span className="size-3 rounded-full" style={{ backgroundColor: `oklch(${tokens.muted})` }} />
                  <span className="size-3 rounded-full" style={{ backgroundColor: `oklch(${settings.accent})` }} />
                </div>
                <div className="px-3 py-1.5">
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Row>

      <Row label="Custom tokens (oklch — L C H or L C H / alpha)">
        <div className="grid grid-cols-2 gap-2">
          {TOKEN_FIELDS.map((f) => (
            <label key={f.key} className="block text-xs">
              <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-3 rounded-sm border border-white/20"
                  style={{ backgroundColor: `oklch(${custom[f.key]})` }}
                />
                {f.label}
              </div>
              <input
                value={custom[f.key]}
                onChange={(e) => setToken(f.key, e.target.value)}
                className="w-full rounded-md border border-input bg-black/30 px-2 py-1 font-mono text-[11px] outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          ))}
        </div>
      </Row>

      <div className="flex gap-2">
        <button
          onClick={exportTheme}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-black/20 px-3 py-2 text-sm hover:bg-white/5"
        >
          <Download className="size-3.5" /> Export theme
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-black/20 px-3 py-2 text-sm hover:bg-white/5"
        >
          <Upload className="size-3.5" /> Import theme
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => e.target.files && importTheme(e.target.files[0])}
        />
      </div>
    </Panel>
  );
}

