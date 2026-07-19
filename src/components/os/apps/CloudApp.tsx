import { useOS } from "@/os/store";
import { Cloud, CloudCheck, RefreshCw, FolderSync, Shield } from "lucide-react";

export function CloudApp() {
  const sa = useOS((s) => s.sa);
  const updateSA = useOS((s) => s.updateSA);
  const sync = useOS((s) => s.syncCloud);
  const used = 2.4;
  const total = 15;
  const pct = (used / total) * 100;
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="border-b border-white/10 bg-gradient-to-r from-sky-600/30 to-cyan-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Cloud className="size-6" />
          <div>
            <div className="font-semibold">NEXUS Cloud</div>
            <div className="text-xs text-muted-foreground">15 GB free · Hosted in Johannesburg 🇿🇦</div>
          </div>
          <button
            onClick={() => sync()}
            className="ml-auto flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          >
            <RefreshCw className="size-3.5" /> Sync now
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="mb-1 text-xs text-muted-foreground">Storage</div>
          <div className="mb-2 text-2xl font-bold">
            {used.toFixed(1)} GB <span className="text-sm text-muted-foreground">/ {total} GB</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Toggle
            label="Auto-sync files"
            desc="Documents, Pictures & Notes"
            active={sa.cloudSyncEnabled}
            onToggle={() => updateSA({ cloudSyncEnabled: !sa.cloudSyncEnabled })}
          />
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1 font-medium">
              <CloudCheck className="size-4 text-emerald-400" /> Last sync
            </div>
            <div className="text-muted-foreground">
              {sa.lastCloudSync ? new Date(sa.lastCloudSync).toLocaleString() : "Never synced"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-1 text-sm font-medium">
            <FolderSync className="size-4" /> What syncs
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• System settings, wallpaper & themes</li>
            <li>• Bookmarks, browser history, downloads</li>
            <li>• Notes, Contacts, Calendar & Alarms</li>
            <li>• Emergency Medical ID (encrypted)</li>
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <Shield className="mt-0.5 size-4" /> End-to-end encrypted with your account key. NEXUS cannot read your files.
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, desc, active, onToggle }: { label: string; desc: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`rounded-lg border p-3 text-left transition ${
        active ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className={`h-4 w-8 rounded-full ${active ? "bg-primary" : "bg-white/20"}`}>
          <div className={`h-4 w-4 rounded-full bg-white transition ${active ? "translate-x-4" : ""}`} />
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}
