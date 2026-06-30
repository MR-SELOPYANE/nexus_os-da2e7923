import { useMemo, useState } from "react";
import { Search, Download, Check, Trash2, Package, Star } from "lucide-react";
import { useOS } from "@/os/store";
import { cn } from "@/lib/utils";

interface CatalogItem {
  name: string;
  version: string;
  category: "Productivity" | "Development" | "Media" | "Utilities" | "Games";
  tagline: string;
  description: string;
  rating: number;
  size: string;
  gradient: string;
}

const CATALOG: CatalogItem[] = [
  { name: "nexus-code", version: "1.4.0", category: "Development", tagline: "Lightweight code editor", description: "Syntax highlighting, multi-cursor, and an integrated terminal — the editor every developer needs on NEXUS.", rating: 4.8, size: "18.2 MB", gradient: "from-sky-500 to-indigo-700" },
  { name: "nexus-paint", version: "2.1.3", category: "Media", tagline: "Pixel & vector painting", description: "Layered painting app with brushes, shapes, and PNG/SVG export.", rating: 4.5, size: "12.1 MB", gradient: "from-pink-500 to-rose-700" },
  { name: "nexus-mail", version: "0.9.7", category: "Productivity", tagline: "Unified inbox", description: "Plug in any IMAP/Gmail account and triage with keyboard shortcuts.", rating: 4.2, size: "9.4 MB", gradient: "from-amber-400 to-orange-600" },
  { name: "nexus-chess", version: "3.0.0", category: "Games", tagline: "Play chess offline", description: "Built-in Stockfish-class engine with adjustable ELO from 800 to 2800.", rating: 4.9, size: "6.0 MB", gradient: "from-emerald-500 to-teal-700" },
  { name: "nexus-zip", version: "1.0.2", category: "Utilities", tagline: "Archive manager", description: "Open and create zip, tar, and 7z archives directly from Files.", rating: 4.3, size: "3.8 MB", gradient: "from-slate-500 to-zinc-700" },
  { name: "nexus-weather", version: "1.2.0", category: "Productivity", tagline: "Hyperlocal forecast", description: "Live radar, hourly forecast, and a beautiful menu-bar widget.", rating: 4.6, size: "4.7 MB", gradient: "from-cyan-400 to-blue-600" },
  { name: "nexus-tunes", version: "5.5.1", category: "Media", tagline: "Smart music library", description: "Streams local and cloud tracks with AI-curated radio stations.", rating: 4.7, size: "22.5 MB", gradient: "from-fuchsia-500 to-purple-700" },
  { name: "nexus-git", version: "2.40.1", category: "Development", tagline: "Visual git client", description: "Branch graphs, stash UI, and rebase helpers without the command line.", rating: 4.4, size: "14.0 MB", gradient: "from-orange-500 to-red-700" },
  { name: "nexus-podcast", version: "1.1.0", category: "Media", tagline: "Podcast player", description: "Subscribe, sync, and listen at 1.5×.", rating: 4.1, size: "7.2 MB", gradient: "from-purple-500 to-indigo-700" },
  { name: "nexus-pomodoro", version: "1.0.0", category: "Productivity", tagline: "Focus timer", description: "Classic 25/5 cycle with subtle notifications.", rating: 4.5, size: "1.1 MB", gradient: "from-red-400 to-rose-600" },
];

const CATEGORIES = ["All", "Productivity", "Development", "Media", "Utilities", "Games"] as const;

export function AppStore() {
  const packages = useOS((s) => s.packages);
  const install = useOS((s) => s.installPackage);
  const uninstall = useOS((s) => s.uninstallPackage);
  const notify = useOS((s) => s.notify);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [selected, setSelected] = useState<CatalogItem | null>(CATALOG[0]);

  const installedNames = useMemo(() => new Set(packages.map((p) => p.name)), [packages]);

  const filtered = useMemo(() => {
    return CATALOG.filter((c) => {
      if (cat !== "All" && c.category !== cat) return false;
      if (q && !`${c.name} ${c.tagline}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, cat]);

  const onInstall = (item: CatalogItem) => {
    install({ name: item.name, version: item.version });
    notify({ title: "Installed", message: `${item.name} ${item.version}` });
  };
  const onUninstall = (name: string) => {
    uninstall(name);
    notify({ title: "Uninstalled", message: name });
  };

  return (
    <div className="flex h-full bg-background/40">
      <aside className="flex w-44 shrink-0 flex-col gap-1 border-r border-glass-border bg-white/5 p-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Package className="size-4 text-primary" />
          <span className="text-sm font-semibold">Store</span>
        </div>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-xs",
              cat === c ? "bg-primary text-primary-foreground" : "hover:bg-white/10"
            )}
          >
            {c}
          </button>
        ))}
        <div className="mt-3 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Installed ({packages.length})
        </div>
        <div className="space-y-0.5 px-2 text-[11px] text-muted-foreground">
          {packages.slice(0, 6).map((p) => (
            <div key={p.name} className="truncate">{p.name}</div>
          ))}
        </div>
      </aside>

      <div className="flex w-72 shrink-0 flex-col border-r border-glass-border">
        <div className="border-b border-glass-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the store…"
              className="h-8 w-full rounded-md border border-glass-border bg-white/5 pl-7 pr-2 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => {
            const installed = installedNames.has(c.name);
            return (
              <button
                key={c.name}
                onClick={() => setSelected(c)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-glass-border/50 p-2.5 text-left hover:bg-white/5",
                  selected?.name === c.name && "bg-white/10"
                )}
              >
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white", c.gradient)}>
                  <Package className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    {installed && <Check className="size-3 text-emerald-400" />}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{c.tagline}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Star className="size-2.5 fill-amber-400 text-amber-400" /> {c.rating} · {c.size}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No apps match your search.</div>
          )}
        </div>
      </div>

      {selected ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className={cn("flex items-center gap-4 bg-gradient-to-br p-5 text-white", selected.gradient)}>
            <div className="grid size-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <Package className="size-8" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">{selected.name}</div>
              <div className="text-xs opacity-80">{selected.category} · v{selected.version} · {selected.size}</div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <Star className="size-3 fill-amber-300 text-amber-300" /> {selected.rating}
              </div>
            </div>
            {installedNames.has(selected.name) ? (
              <button
                onClick={() => onUninstall(selected.name)}
                className="flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25"
              >
                <Trash2 className="size-3.5" /> Uninstall
              </button>
            ) : (
              <button
                onClick={() => onInstall(selected)}
                className="flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-medium text-black hover:bg-white/90"
              >
                <Download className="size-3.5" /> Install
              </button>
            )}
          </div>
          <div className="space-y-3 p-5 text-sm">
            <div className="font-medium">{selected.tagline}</div>
            <p className="text-muted-foreground">{selected.description}</p>
            <div className="rounded-lg border border-glass-border bg-white/5 p-3 text-xs text-muted-foreground">
              Apps installed here are tracked by NEXUS package manager and appear in <span className="text-foreground">Settings → Packages</span>. This is a simulation — no binaries are downloaded.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select an app</div>
      )}
    </div>
  );
}
