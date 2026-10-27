import { useEffect, useState } from "react";
import { Package, Search, RefreshCw, Download, Trash2, ArrowUpCircle, Loader2 } from "lucide-react";
import { hostPkg, useNativeSystem, formatBytes, type DebPackage } from "@/os/native-system";

/** Real apt/dpkg package manager. Off-device it explains itself instead of faking. */
export function Packages() {
  const native = useNativeSystem();
  const available = Boolean(native?.available && native.capabilities?.packages);
  const [tab, setTab] = useState<"installed" | "search" | "updates">("installed");
  const [installed, setInstalled] = useState<RpmPackage[]>([]);
  const [results, setResults] = useState<RpmPackage[]>([]);
  const [updates, setUpdates] = useState<RpmPackage[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [log, setLog] = useState("");

  const loadInstalled = async () => {
    setBusy(true);
    try {
      setInstalled(await hostPkg.installed());
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (available) void loadInstalled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (!available) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-card p-8 text-center">
        <Package className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Package management is device-only</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          On the NEXUS ISO this app drives real <code>dnf</code> and <code>rpm</code>: installed packages,
          searches against the Fedora repos and the NEXUS channel, and system upgrades authorised through polkit.
        </p>
      </div>
    );
  }

  const runAction = async (name: string, fn: () => Promise<{ ok: boolean; log: string }>) => {
    setWorking(name);
    setLog("");
    try {
      const res = await fn();
      setLog(res.log);
      await loadInstalled();
    } finally {
      setWorking(null);
    }
  };

  const rows = tab === "installed" ? installed.filter((p) => p.name.includes(query)) : tab === "search" ? results : updates;

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-1 border-b border-glass-border px-3 py-2 text-[11px]">
        {(["installed", "search", "updates"] as const).map((t) => (
          <button
            key={t}
            onClick={async () => {
              setTab(t);
              if (t === "updates") {
                setBusy(true);
                try {
                  setUpdates((await hostPkg.updates()).packages);
                } finally {
                  setBusy(false);
                }
              }
            }}
            className={`rounded px-2 py-1 capitalize ${tab === t ? "bg-primary/25 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
          >
            {t}
          </button>
        ))}
        <form
          className="ml-2 flex flex-1 items-center gap-2 rounded-md bg-black/30 px-2 py-1"
          onSubmit={async (e) => {
            e.preventDefault();
            if (tab !== "search") setTab("search");
            setBusy(true);
            try {
              setResults(await hostPkg.search(query));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or filter packages…"
            className="flex-1 bg-transparent text-xs outline-none"
          />
        </form>
        <button onClick={loadInstalled} className="rounded p-1 text-muted-foreground hover:bg-white/10">
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        </button>
        {tab === "updates" && updates.length > 0 && (
          <button
            onClick={() => runAction("__all__", () => hostPkg.upgradeAll())}
            className="ml-1 flex items-center gap-1 rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
          >
            <ArrowUpCircle className="size-3.5" /> Upgrade all
          </button>
        )}
      </div>

      <div className="os-scroll flex-1 overflow-y-auto">
        {rows.map((p) => (
          <div key={`${p.name}-${p.version ?? ""}`} className="flex items-center gap-2 border-b border-glass-border/40 px-3 py-1.5 text-sm hover:bg-white/5">
            <Package className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{p.name}</span>
              {p.summary && <span className="block truncate text-[11px] text-muted-foreground">{p.summary}</span>}
            </span>
            <span className="w-32 truncate text-right text-[11px] text-muted-foreground">{p.version ?? p.repo ?? ""}</span>
            <span className="w-20 text-right text-[11px] text-muted-foreground">{p.size ? formatBytes(p.size) : ""}</span>
            {working === p.name ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : tab === "installed" ? (
              <button
                onClick={() => runAction(p.name, () => hostPkg.remove(p.name))}
                className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                title="dnf remove"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : (
              <button
                onClick={() => runAction(p.name, () => hostPkg.install(p.name))}
                className="rounded p-1 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                title="dnf install"
              >
                <Download className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && !busy && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {tab === "updates" ? "System is up to date." : "Nothing to show."}
          </p>
        )}
      </div>

      {log && (
        <pre className="os-scroll max-h-40 overflow-auto border-t border-glass-border bg-black/40 p-2 font-mono text-[11px] text-muted-foreground">
          {log}
        </pre>
      )}
      <div className="border-t border-glass-border px-3 py-1 text-[11px] text-emerald-300">
        dnf · {installed.length} packages installed on {native?.host}
      </div>
    </div>
  );
}
