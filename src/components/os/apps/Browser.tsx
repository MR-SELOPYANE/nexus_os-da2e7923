import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, RotateCw, Lock, Search, Home, Plus, X, ExternalLink,
  BookOpen, Globe2, Star, Clock, Download as DownloadIcon, Wrench, ZoomIn, ZoomOut,
  Trash2,
} from "lucide-react";

import { useOS, type SearchEngineId } from "@/os/store";

interface Site {
  title: string;
  render: (go: (url: string) => void) => React.ReactNode;
}

const SEARCH_URLS: Record<SearchEngineId, (q: string) => string> = {
  brave: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  nexus: (q) => `nexus://search?q=${encodeURIComponent(q)}`,
};

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
        <p className="text-muted-foreground">Search the web, use Ctrl+F to find in page, bookmark pages with the star, and view your history at nexus://history.</p>
      </article>
    ),
  },
  "nexus://store": { title: "Store", render: () => <PackageStore /> },
  "nexus://bookmarks": { title: "Bookmarks", render: (go) => <BookmarksPage go={go} /> },
  "nexus://history": { title: "History", render: (go) => <HistoryPage go={go} /> },
  "nexus://downloads": { title: "Downloads", render: () => <DownloadsPage /> },
  "nexus://about": {
    title: "About Nexus",
    render: () => (
      <article className="mx-auto max-w-xl p-8 text-sm leading-relaxed">
        <h1 className="mb-3 text-2xl font-bold">About NEXUS</h1>
        <p className="text-muted-foreground">NEXUS Browser — Version 2.0 — Nexus Glass</p>
      </article>
    ),
  },
};

const QUICK_LINKS = [
  { name: "Wikipedia", url: "https://en.wikipedia.org" },
  { name: "MDN", url: "https://developer.mozilla.org" },
  { name: "GitHub", url: "https://github.com" },
  { name: "Hacker News", url: "https://news.ycombinator.com" },
  { name: "Nexus Search", url: "nexus://search" },
  { name: "Store", url: "nexus://store" },
];

function HomePage({ go }: { go: (url: string) => void }) {
  const [q, setQ] = useState("");
  const engine = useOS((s) => s.settings.searchEngine);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    go(SEARCH_URLS[engine](q.trim()));
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
          placeholder={`Search ${engine} or enter URL…`}
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
      <p className="text-xs text-muted-foreground">Default engine: <b className="capitalize text-foreground">{engine}</b> · change in Settings → Browser</p>
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

function BookmarksPage({ go }: { go: (url: string) => void }) {
  const bookmarks = useOS((s) => s.bookmarks);
  const remove = useOS((s) => s.removeBookmark);
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Bookmarks</h1>
      {bookmarks.length === 0 && <p className="text-sm text-muted-foreground">No bookmarks yet. Star any page to save it.</p>}
      <ul className="space-y-1">
        {bookmarks.map((b) => (
          <li key={b.id} className="group flex items-center gap-2 rounded-lg border border-glass-border bg-white/5 px-3 py-2">
            <Star className="size-3.5 text-amber-400" />
            <button onClick={() => go(b.url)} className="flex-1 truncate text-left text-sm hover:text-primary">{b.title}</button>
            <span className="truncate text-xs text-muted-foreground">{b.url}</span>
            <button onClick={() => remove(b.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryPage({ go }: { go: (url: string) => void }) {
  const history = useOS((s) => s.browserHistory);
  const clear = useOS((s) => s.clearHistory);
  const remove = useOS((s) => s.removeHistory);
  const [q, setQ] = useState("");
  const filtered = history.filter((h) => !q || h.url.toLowerCase().includes(q.toLowerCase()) || h.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">History</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search history…" className="rounded-md border border-glass-border bg-black/20 px-3 py-1 text-xs outline-none" />
        <button onClick={clear} className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-destructive">Clear all</button>
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No history entries.</p>}
      <ul className="space-y-1">
        {filtered.map((h) => (
          <li key={h.id} className="group flex items-center gap-2 rounded-lg border border-glass-border bg-white/5 px-3 py-2">
            <Clock className="size-3.5 text-muted-foreground" />
            <button onClick={() => go(h.url)} className="flex-1 truncate text-left text-sm hover:text-primary">{h.title || h.url}</button>
            <span className="text-[10px] text-muted-foreground">{new Date(h.visitedAt).toLocaleString()}</span>
            <button onClick={() => remove(h.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DownloadsPage() {
  const downloads = useOS((s) => s.downloads);
  const clear = useOS((s) => s.clearDownloads);
  const openApp = useOS((s) => s.openApp);
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Downloads</h1>
        <button onClick={clear} className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-destructive">Clear finished</button>
      </div>
      {downloads.length === 0 && <p className="text-sm text-muted-foreground">No downloads yet.</p>}
      <ul className="space-y-2">
        {downloads.map((d) => (
          <li key={d.id} className="rounded-lg border border-glass-border bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <DownloadIcon className="size-4 text-primary" />
              <span className="flex-1 truncate text-sm font-medium">{d.filename}</span>
              <span className="text-xs text-muted-foreground">{(d.size / 1024).toFixed(1)} KB</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{d.url}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full ${d.status === "failed" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${d.progress}%` }} />
              </div>
              <span className="w-16 text-right text-xs capitalize text-muted-foreground">{d.status}</span>
              {d.status === "complete" && d.path && (
                <button onClick={() => openApp("files", { path: d.path!.split("/").slice(0, -1).join("/") || "/" })} className="text-xs text-primary hover:underline">Show</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NexusSearchPage({ query, go }: { query: string; go: (url: string) => void }) {
  const [q, setQ] = useState(query);
  const [results, setResults] = useState<{ title: string; url: string; snippet: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setQ(query);
    if (!query) { setResults(null); return; }
    setLoading(true);
    setErr(null);
    fetch(`/api/public/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) go(`nexus://search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-2 text-3xl font-bold"><span className="text-primary">Nexus</span> Search</div>
      <p className="mb-4 text-xs text-muted-foreground">Meta-search powered by Brave · rendered natively in NEXUS</p>
      <form onSubmit={submit} className="mb-6 flex items-center gap-2 rounded-full border border-glass-border bg-black/20 px-4 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" placeholder="Search the web…" />
      </form>
      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!loading && results?.length === 0 && <p className="text-sm text-muted-foreground">No results.</p>}
      <ul className="space-y-4">
        {results?.map((r, i) => (
          <li key={i}>
            <p className="truncate text-xs text-emerald-400">{r.url}</p>
            <button onClick={() => go(r.url)} className="text-left text-lg text-primary hover:underline">{r.title}</button>
            {r.snippet && <p className="text-sm text-muted-foreground">{r.snippet}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- URL helpers ---
function normalizeUrl(input: string, engine: SearchEngineId): string {
  const s = input.trim();
  if (!s) return "nexus://home";
  if (s.startsWith("nexus://")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[^\s]+\.[^\s]+$/.test(s) && !s.includes(" ")) return `https://${s}`;
  return SEARCH_URLS[engine](s);
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

interface Tab {
  id: string;
  stack: string[];
  idx: number;
  title: string;
  zoom: number;
}

function newTab(url = "nexus://home"): Tab {
  const key = url.split("?")[0];
  return {
    id: Math.random().toString(36).slice(2),
    stack: [url], idx: 0,
    title: AURORA_SITES[key]?.title ?? "New Tab",
    zoom: 1,
  };
}

function proxyUrl(absUrl: string, mode: "raw" | "reader"): string {
  return `/api/public/proxy?mode=${mode}&url=${encodeURIComponent(absUrl)}`;
}

export function Browser({ payload }: { payload?: Record<string, unknown> } = {}) {
  const initial = (payload?.url as string) ?? "nexus://home";
  const online = useOS((s) => s.network.online);
  const engine = useOS((s) => s.settings.searchEngine);
  const bookmarks = useOS((s) => s.bookmarks);
  const addBookmark = useOS((s) => s.addBookmark);
  const removeBookmark = useOS((s) => s.removeBookmark);
  const addHistory = useOS((s) => s.addHistory);
  const addDownload = useOS((s) => s.addDownload);
  const updateDownload = useOS((s) => s.updateDownload);
  const writeFile = useOS((s) => s.writeFile);
  const notify = useOS((s) => s.notify);

  const [tabs, setTabs] = useState<Tab[]>([newTab(initial)]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [readerMode, setReaderMode] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQ, setFindQ] = useState("");
  const [showDevTools, setShowDevTools] = useState(false);
  const [devInfo, setDevInfo] = useState<{ url: string; status?: number; headers?: Record<string, string>; loadedAt?: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const current = active.stack[active.idx];
  const [bar, setBar] = useState(current);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => { setBar(current); }, [current, activeId]);

  // Record history when navigating to non-nexus URL
  useEffect(() => {
    if (current.startsWith("http")) {
      addHistory({ url: current, title: active.title });
      setDevInfo({ url: current, loadedAt: Date.now() });
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTab = (id: string, patch: Partial<Tab>) =>
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const go = (raw: string) => {
    const url = normalizeUrl(raw, engine);
    const key = url.split("?")[0];
    const next = [...active.stack.slice(0, active.idx + 1), url];
    updateTab(active.id, {
      stack: next, idx: next.length - 1,
      title: AURORA_SITES[key]?.title ?? hostnameOf(url),
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

  const setZoom = (z: number) => updateTab(active.id, { zoom: Math.max(0.5, Math.min(2, z)) });

  const isNexus = current.startsWith("nexus://");
  const isHttp = current.startsWith("http");
  const nexusKey = current.split("?")[0];
  const site = isNexus ? AURORA_SITES[nexusKey] : undefined;

  const bookmarked = bookmarks.find((b) => b.url === current);
  const toggleBookmark = () => {
    if (bookmarked) removeBookmark(bookmarked.id);
    else addBookmark({ url: current, title: active.title });
  };

  // Simulated download: fetch page as text and save to /home/Downloads
  const downloadPage = async () => {
    if (!isHttp) return;
    const filename = `${hostnameOf(current).replace(/\W+/g, "_")}-${Date.now()}.html`;
    const dlId = addDownload({ url: current, filename, size: 0 });
    try {
      const res = await fetch(proxyUrl(current, "raw"));
      const text = await res.text();
      const size = text.length;
      // simulate progress
      for (let p = 20; p <= 100; p += 20) {
        await new Promise((r) => setTimeout(r, 60));
        updateDownload(dlId, { progress: p, size });
      }
      const path = `/home/Downloads/${filename}`;
      writeFile(path, text);
      updateDownload(dlId, { status: "complete", progress: 100, size, path });
      notify({ title: "Download complete", message: filename, appId: "browser" });
    } catch (e) {
      updateDownload(dlId, { status: "failed" });
      notify({ title: "Download failed", message: (e as Error).message, appId: "browser" });
    }
  };

  // Keyboard shortcuts within browser
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setShowFind((v) => !v);
    } else if (e.ctrlKey && e.key === "t") {
      e.preventDefault();
      addTab();
    } else if (e.ctrlKey && e.key === "w") {
      e.preventDefault();
      closeTab(active.id);
    } else if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      setZoom(active.zoom + 0.1);
    } else if (e.ctrlKey && e.key === "-") {
      e.preventDefault();
      setZoom(active.zoom - 0.1);
    } else if (e.ctrlKey && e.key === "0") {
      e.preventDefault();
      setZoom(1);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card" onKeyDown={onKeyDown} tabIndex={0}>
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
        <button onClick={back} disabled={active.idx === 0} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"><ArrowLeft className="size-4" /></button>
        <button onClick={fwd} disabled={active.idx >= active.stack.length - 1} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"><ArrowRight className="size-4" /></button>
        <button onClick={reload} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"><RotateCw className="size-3.5" /></button>
        <button onClick={() => go("nexus://home")} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"><Home className="size-3.5" /></button>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-input bg-black/20 px-3 py-1">
          {isHttp ? <Lock className="size-3 text-emerald-400" /> : <Search className="size-3 text-muted-foreground" />}
          <input
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go(bar); }}
            placeholder="Search or type a URL"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button onClick={toggleBookmark} title={bookmarked ? "Remove bookmark" : "Bookmark"} className={`grid size-7 place-items-center rounded-md hover:bg-white/10 ${bookmarked ? "text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>
          <Star className={`size-3.5 ${bookmarked ? "fill-current" : ""}`} />
        </button>
        {isHttp && (
          <>
            <button onClick={() => { setReaderMode((r) => !r); setIframeKey((k) => k + 1); }} title="Reader view" className={`grid size-7 place-items-center rounded-md hover:bg-white/10 ${readerMode ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {readerMode ? <BookOpen className="size-3.5" /> : <Globe2 className="size-3.5" />}
            </button>
            <button onClick={downloadPage} title="Download page" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"><DownloadIcon className="size-3.5" /></button>
            <button onClick={() => setShowDevTools((v) => !v)} title="DevTools" className={`grid size-7 place-items-center rounded-md hover:bg-white/10 ${showDevTools ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}><Wrench className="size-3.5" /></button>
            <a href={current} target="_blank" rel="noreferrer" title="Open in new tab" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"><ExternalLink className="size-3.5" /></a>
          </>
        )}
      </div>

      {/* Bookmarks bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-glass-border px-2 py-1 text-xs">
        {bookmarks.slice(0, 10).map((b) => (
          <button key={b.id} onClick={() => go(b.url)} className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <Star className="size-2.5 text-amber-400" /> {b.title}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => go("nexus://bookmarks")} className="shrink-0 rounded px-2 py-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">All bookmarks</button>
        <button onClick={() => go("nexus://history")} className="shrink-0 rounded px-2 py-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">History</button>
        <button onClick={() => go("nexus://downloads")} className="shrink-0 rounded px-2 py-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">Downloads</button>
      </div>

      {/* Find bar */}
      {showFind && (
        <div className="flex items-center gap-2 border-b border-glass-border bg-black/30 px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input autoFocus value={findQ} onChange={(e) => setFindQ(e.target.value)} placeholder="Find in page…" className="flex-1 bg-transparent text-xs outline-none" />
          <button onClick={() => { setShowFind(false); setFindQ(""); }} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        </div>
      )}

      {/* Zoom indicator */}
      {active.zoom !== 1 && (
        <div className="flex items-center gap-2 border-b border-glass-border bg-black/20 px-3 py-1 text-xs">
          <ZoomIn className="size-3" /> {Math.round(active.zoom * 100)}%
          <button onClick={() => setZoom(active.zoom - 0.1)} className="rounded p-0.5 hover:bg-white/10"><ZoomOut className="size-3" /></button>
          <button onClick={() => setZoom(active.zoom + 0.1)} className="rounded p-0.5 hover:bg-white/10"><ZoomIn className="size-3" /></button>
          <button onClick={() => setZoom(1)} className="rounded px-1.5 text-muted-foreground hover:bg-white/10">Reset</button>
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 overflow-hidden bg-background">
        {!online && isHttp ? (
          <OfflineFallback url={current} />
        ) : isNexus ? (
          <div className="h-full overflow-y-auto os-scroll" style={{ zoom: active.zoom } as React.CSSProperties}>
            {nexusKey === "nexus://search" ? (
              <NexusSearchPage query={new URLSearchParams(current.split("?")[1] ?? "").get("q") ?? ""} go={go} />
            ) : site ? site.render(go) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Page not found</p>
                  <p className="text-sm">{current}</p>
                </div>
              </div>
            )}
            {findQ && <FindHighlighter query={findQ} />}
          </div>
        ) : (
          <div className="relative h-full w-full">
            <iframe
              ref={iframeRef}
              key={`${active.id}-${current}-${readerMode}-${iframeKey}`}
              src={proxyUrl(current, readerMode ? "reader" : "raw")}
              title="browser"
              className="h-full w-full bg-white"
              style={{ zoom: active.zoom } as React.CSSProperties}
              sandbox="allow-forms allow-popups allow-scripts allow-same-origin allow-downloads allow-top-navigation-by-user-activation"
              referrerPolicy="no-referrer"
            />
            {showDevTools && <DevToolsPanel info={devInfo} onClose={() => setShowDevTools(false)} />}
          </div>
        )}
      </div>
    </div>
  );
}

function FindHighlighter({ query }: { query: string }) {
  // Marks the query visually via a floating badge (nexus pages don't have live text-find scanner)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 rounded-md bg-primary/20 px-2 py-1 text-xs text-primary ring-1 ring-primary/40">
      Highlighting: <b>{query}</b>
    </div>
  );
}

function DevToolsPanel({ info, onClose }: { info: { url: string; loadedAt?: number } | null; onClose: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 max-h-[50%] overflow-y-auto border-t-2 border-primary/40 bg-black/85 text-xs text-emerald-300 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-3 py-1.5">
        <span className="font-semibold text-primary">DevTools · Network</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
      </div>
      <div className="p-3 font-mono">
        <p><b className="text-white">Request URL:</b> {info?.url}</p>
        <p><b className="text-white">Loaded at:</b> {info?.loadedAt ? new Date(info.loadedAt).toLocaleTimeString() : "-"}</p>
        <p><b className="text-white">Via:</b> /api/public/proxy (NEXUS server-side fetch)</p>
        <p><b className="text-white">User-Agent:</b> Nexus/2.0 (Chrome 121 spoof)</p>
        <p className="mt-2 text-muted-foreground">Response headers are stripped of X-Frame-Options and CSP by the proxy so pages can render inside the shell.</p>
      </div>
    </div>
  );
}

function OfflineFallback({ url }: { url: string }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-lg font-semibold">You're offline</h2>
        <p className="text-sm text-muted-foreground">Can't reach {hostnameOf(url)} — check Wi-Fi or Airplane mode in the tray.</p>
      </div>
    </div>
  );
}
