import { useState } from "react";
import { useOS } from "@/os/store";
import { History, Plus, RotateCcw, Trash2, ShieldAlert } from "lucide-react";

export function Recovery() {
  const points = useOS((s) => s.restorePoints);
  const create = useOS((s) => s.createRestorePoint);
  const restore = useOS((s) => s.restoreToPoint);
  const remove = useOS((s) => s.deleteRestorePoint);
  const reset = useOS((s) => s.resetSystem);
  const notify = useOS((s) => s.notify);
  const [name, setName] = useState("");

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm">
        <History className="size-4 text-emerald-400" />
        <span className="font-semibold">Recovery</span>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll p-5">
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Create a restore point</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Captures your files, packages, and settings so you can roll back later.
          </p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Before customizing"
              className="flex-1 rounded-md border border-border/60 bg-black/30 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => {
                create(name);
                setName("");
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110"
            >
              <Plus className="size-4" /> Create
            </button>
          </div>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Restore points ({points.length})</h3>
          {points.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No restore points yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {points.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-md border border-border/60 bg-black/20 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      v{p.version} · {new Date(p.time).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Restore "${p.name}"? Open windows will close.`)) restore(p.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-white/5"
                  >
                    <RotateCcw className="size-3.5" /> Restore
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-300">
            <ShieldAlert className="size-4" /> Reset this PC
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => {
                if (confirm("Reset settings but keep files & packages?")) {
                  reset(true);
                  notify({ title: "Recovery", message: "Settings restored, files kept." });
                }
              }}
              className="rounded-md border border-border/60 bg-black/20 p-3 text-left text-sm hover:bg-white/5"
            >
              <div className="font-medium">Keep my files</div>
              <div className="text-xs text-muted-foreground">Reset settings, keep documents & packages.</div>
            </button>
            <button
              onClick={() => {
                if (confirm("Wipe everything and reinstall NEXUS? This cannot be undone.")) {
                  reset(false);
                  notify({ title: "Recovery", message: "NEXUS reinstalled." });
                }
              }}
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-left text-sm text-destructive hover:bg-destructive/20"
            >
              <div className="font-medium">Remove everything</div>
              <div className="text-xs opacity-80">Full reinstall. Erases files, settings, and packages.</div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
