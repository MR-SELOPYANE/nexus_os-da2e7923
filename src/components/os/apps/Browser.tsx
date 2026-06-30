import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Lock, Search, Home, Plus, X, ExternalLink, BookOpen, Globe2 } from "lucide-react";

import { useOS } from "@/os/store";

interface Site {
  title: string;
  render: (go: (url: string) => void) => React.ReactNode;
}

const AURORA_SITES: Record<string, Site> = {
  "nexus://home": {
    title: "Home",
    render: (go) => <HomePage go={go} />,
  },
  "nexus://help": {
    title: "Help",
    render: () => (
      <article className="mx-auto max-w-xl p-8 text-sm leading-relaxed">
        <h1 className="mb-4 text-2xl font-bold">NEXUS Help</h1>
        <h2 className="mt-4 mb-2 text-base font-semibold">Keyboard shortcuts</h2>
        <ul className="space-y-1 text-muted-foreground">
          <li><kbd className="rounded bg-white/10 px-1">Alt + Tab</kbd> — switch windows</li>
          <li><kbd className="rounded bg-white/10 px-1">Alt + E</kbd> — open Files</li>
          <li><kbd className="rounded bg-white/10 px-1">Alt + T</kbd> — open Terminal</li>
          <li><kbd className="rounded bg-white/10 px-1">Alt + R</kbd> — Run dialog</li>
          <li><kbd className="rounded bg-white/10 px-1">Alt + L</kbd> — Lock screen</li>
          <li><kbd className="rounded bg-white/10 px-1">Ctrl + Shift + Esc</kbd> — Task Manager</li>
        </ul>
      </article>
    ),
  },
  "nexus://store": { title: "Store", render: () => <PackageStore /> },
  "nexus://about": {
    title: "About Nexus",
    render: () => (
      <article className="mx-auto max-w-xl p-8 text-sm leading-relaxed">
        <h1 className="mb-3 text-2xl font-bold">About NEXUS</h1>
        <p className="text-muted-foreground">NEXUS — Version 1.0.0 — Nexus Glass</p>
      </article>
    ),
  },
};

const QUICK_LINKS = [
  { name: "Wikipedia", url: "https://en.wikipedia.org" },
  { name: "DuckDuckGo", url: "https://duckduckgo.com" },
  { name: "MDN", url: "https://developer.mozilla.org" },
  { name: "GitHub", url: "https://github.com" },
  { name: "Hacker News", url: "https://news.ycombinator.com" },
  { name: "Nexus Store", url: "nexus://store" },
];

function HomePage({ go }: { go: (url: string) => void }) {
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    go(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`);
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-5xl font-bold tracking-tight">
        <span className="text-primary">Nexus</span> Search
      </div>
      <form onSubmit={submit} className="flex w-full max-w-md items-center gap-2 rounded-full border border-glass-border bg-black/20 px-4 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the web or enter URL…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
      <div className="grid grid-cols-3 gap-3">
        {QUICK_LINKS.map((l) => (
          <button
            key={l.url}
            onClick={() => go(l.url)}
            className="w-28 rounded-lg border border-glass-border bg-white/5 p-3 text-xs hover:bg-white/10"
          >
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function PackageStore() {
  const packages = useOS((s) => s.packages);
  const install = useOS((s) => s.installPackage);
  const uninstall = useOS((s) => s.uninstallPackage);
  const catalog = [
    { name: "weather", version: "1.2.0", desc: "Local forecasts" },
    { name: "music", version: "0.9.1", desc: "Audio player" },
    { name: "paint", version: "2.0.0", desc: "Doodling app" },
    { name: "chess", version: "1.0.0", desc: "Play vs. yourself" },
    { name: "code-editor", version: "0.5.0", desc: "Syntax-highlighted editor" },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-6">
      <h1 className="text-2xl font-bold">Nexus Store</h1>
      <p className="text-sm text-muted-foreground">Install demo packages into your system.</p>
      <div className="space-y-2">
        {catalog.map((p) => {
          const installed = packages.some((x) => x.name === p.name);
          return (
            <div key={p.name} className="flex items-center gap-3 rounded-lg border border-glass-border bg-white/5 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name} <span className="text-xs text-muted-foreground">v{p.version}</span></p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
              {installed ? (
                <button onClick={() => uninstall(p.name)} className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-destructive">Uninstall</button>
              ) : (
                <button onClick={() => install({ name: p.name, version: p.version })} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">Install</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- URL helpers ---
function normalizeUrl(input: string): string {
  const s = input.trim();
  if (!s) return "nexus://home";
  if (s.startsWith("nexus://")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  // Looks like a domain (has dot, no spaces)
  if (/^[^\s]+\.[^\s]+$/.test(s) && !s.includes(" ")) return `https://${s}`;
  // Otherwise treat as search
  return `https://duckduckgo.com/?q=${encodeURIComponent(s)}`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// --- Tabs ---
interface Tab {
  id: string;
  stack: string[];
  idx: number;
  title: string;
}

function newTab(url = "nexus://home"): Tab {
  return { id: Math.random().toString(36).slice(2), stack: [url], idx: 0, title: AURORA_SITES[url]?.title ?? "New Tab" };
}

// Domains known to block iframe embedding (X-Frame-Options / frame-ancestors).
// Match these immediately and show the BlockedFallback instead of an iframe.
const BLOCKED_HOSTS = [
  "google.", "youtube.", "youtu.be", "twitter.", "x.com", "facebook.",
  "instagram.", "linkedin.", "reddit.", "tiktok.", "amazon.", "netflix.",
  "spotify.", "discord.com", "twitch.tv", "openai.com", "chatgpt.com",
  "apple.com", "microsoft.com", "bing.com", "yahoo.com", "pinterest.",
];

function isLikelyBlocked(url: string): boolean {
  const host = hostnameOf(url).toLowerCase();
  return BLOCKED_HOSTS.some((b) => host.includes(b));
}

export function Browser({ payload }: { payload?: Record<string, unknown> } = {}) {
  const initial = (payload?.url as string) ?? "nexus://home";
  const online = useOS((s) => s.network.online);
  const [tabs, setTabs] = useState<Tab[]>([newTab(initial)]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const current = active.stack[active.idx];
  const [bar, setBar] = useState(current);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setBar(current);
  }, [current, activeId]);

  const updateTab = (id: string, patch: Partial<Tab>) =>
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const go = (raw: string) => {
    const url = normalizeUrl(raw);
    const next = [...active.stack.slice(0, active.idx + 1), url];
    updateTab(active.id, {
      stack: next,
      idx: next.length - 1,
      title: AURORA_SITES[url]?.title ?? hostnameOf(url),
    });
  };

  const back = () => active.idx > 0 && updateTab(active.id, { idx: active.idx - 1 });
  const fwd = () => active.idx < active.stack.length - 1 && updateTab(active.id, { idx: active.idx + 1 });
  const reload = () => setIframeKey((k) => k + 1);

  const closeTab = (id: string) => {
    setTabs((ts) => {
      const filtered = ts.filter((t) => t.id !== id);
      if (filtered.length === 0) return [newTab()];
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
  };

  const addTab = () => {
    const t = newTab();
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
  };

  const isNexus = current.startsWith("nexus://");
  const isHttp = current.startsWith("http");
  const site = isNexus ? AURORA_SITES[current] : undefined;
  const blocked = isHttp && isLikelyBlocked(current);

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tab strip */}
      <div className="flex items-end gap-1 border-b border-glass-border bg-black/20 px-2 pt-1.5">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`group flex max-w-[180px] cursor-pointer items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs ${
              t.id === activeId ? "bg-card text-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <span className="truncate">{t.title || "New Tab"}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
              className="grid size-4 place-items-center rounded opacity-0 hover:bg-white/10 group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <button onClick={addTab} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground">
          <Plus className="size-4" />
        </button>
      </div>

      {/* Address bar */}
      <div className="flex items-center gap-1.5 border-b border-glass-border px-2 py-1.5">
        <button onClick={back} disabled={active.idx === 0} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30">
          <ArrowLeft className="size-4" />
        </button>
        <button onClick={fwd} disabled={active.idx >= active.stack.length - 1} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30">
          <ArrowRight className="size-4" />
        </button>
        <button onClick={reload} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground">
          <RotateCw className="size-3.5" />
        </button>
        <button onClick={() => go("nexus://home")} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground">
          <Home className="size-3.5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-input bg-black/20 px-3 py-1">
          {isHttp ? <Lock className="size-3 text-emerald-400" /> : <Search className="size-3 text-muted-foreground" />}
          <input
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go(bar)}
            placeholder="Search or type a URL"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        {isHttp && (
          <a
            href={current}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden bg-background">
        {!online && isHttp ? (
          <OfflineFallback url={current} />
        ) : isNexus ? (
          <div className="h-full overflow-y-auto os-scroll">
            {site ? site.render(go) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Page not found</p>
                  <p className="text-sm">{current}</p>
                </div>
              </div>
            )}
          </div>
        ) : blocked ? (
          <BlockedFallback url={current} />
        ) : (
          <IframeView key={`${active.id}-${current}-${iframeKey}`} url={current} />
        )}
      </div>
    </div>
  );
}

function IframeView({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="browser"
      className="h-full w-full bg-white"
      sandbox="allow-forms allow-popups allow-scripts allow-same-origin allow-downloads"
      referrerPolicy="no-referrer"
    />
  );
}

function BlockedFallback({ url }: { url: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background p-8">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-amber-400" />
        <h2 className="mb-2 text-lg font-semibold">This site refused to connect</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {hostnameOf(url)} can't be displayed inside another page. Most major sites (Google, YouTube, X) block embedding for security.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <ExternalLink className="size-4" /> Open in new tab
        </a>
      </div>
    </div>
  );
}

function OfflineFallback({ url }: { url: string }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-lg font-semibold">You're offline</h2>
        <p className="text-sm text-muted-foreground">
          Can't reach {hostnameOf(url)} — check Wi-Fi or Airplane mode in the tray.
        </p>
      </div>
    </div>
  );
}
