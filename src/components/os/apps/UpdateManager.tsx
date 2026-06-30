import { useOS } from "@/os/store";
import { DownloadCloud, CheckCircle2, RefreshCw, RotateCw } from "lucide-react";

export function UpdateManager() {
  const update = useOS((s) => s.update);
  const check = useOS((s) => s.checkForUpdates);
  const install = useOS((s) => s.installUpdate);
  const apply = useOS((s) => s.applyUpdate);

  const busy = update.status === "checking" || update.status === "downloading" || update.status === "installing";

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm">
        <DownloadCloud className="size-4 text-primary" />
        <span className="font-semibold">Update Manager</span>
        <span className="ml-auto text-xs text-muted-foreground">NEXUS {update.currentVersion}</span>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll p-5">
        {update.status === "idle" && (
          <EmptyState>
            <p className="mb-1 font-medium text-foreground">You're up to date as of last check</p>
            <p className="text-sm">
              {update.lastChecked
                ? `Last checked ${new Date(update.lastChecked).toLocaleString()}`
                : "Press \"Check for updates\" to see what's new."}
            </p>
          </EmptyState>
        )}

        {update.status === "checking" && (
          <EmptyState>
            <RefreshCw className="mx-auto mb-2 size-6 animate-spin text-primary" />
            <p>Checking for updates…</p>
          </EmptyState>
        )}

        {update.status === "uptodate" && (
          <EmptyState>
            <CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-400" />
            <p>NEXUS {update.currentVersion} is the latest version.</p>
          </EmptyState>
        )}

        {(update.status === "available" ||
          update.status === "downloading" ||
          update.status === "installing" ||
          update.status === "ready") &&
          update.available && (
            <div>
              <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div className="text-xs uppercase tracking-wide text-primary">Feature update</div>
                <div className="mt-0.5 text-lg font-semibold">NEXUS {update.available.version}</div>
                <div className="text-xs text-muted-foreground">Download size: {update.available.size}</div>
              </div>

              <h3 className="mb-2 text-sm font-semibold">What's new</h3>
              <ul className="mb-5 space-y-1 text-sm text-muted-foreground">
                {update.available.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>

              {(update.status === "downloading" || update.status === "installing") && (
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{update.status === "downloading" ? "Downloading…" : "Installing…"}</span>
                    <span>{update.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all"
                      style={{ width: `${update.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {update.status === "ready" && (
                <div className="mb-4 rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
                  Restart required to finish installing NEXUS {update.available.version}.
                </div>
              )}
            </div>
          )}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 bg-black/20 px-4 py-3">
        <button
          onClick={() => void check()}
          disabled={busy}
          className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          Check for updates
        </button>
        {update.status === "available" && (
          <button
            onClick={() => void install()}
            className="ml-auto rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            Download & install
          </button>
        )}
        {update.status === "ready" && (
          <button
            onClick={apply}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            <RotateCw className="size-4" /> Restart now
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-sm py-10 text-center text-sm text-muted-foreground">{children}</div>;
}
