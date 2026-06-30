import { useState } from "react";
import { Trash2, RotateCcw, X, Folder, FileText } from "lucide-react";
import { useOS } from "@/os/store";
import { isFolder } from "@/os/fs";

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function RecycleBin() {
  const trash = useOS((s) => s.trash);
  const restoreFromTrash = useOS((s) => s.restoreFromTrash);
  const permanentlyDeleteTrash = useOS((s) => s.permanentlyDeleteTrash);
  const emptyTrash = useOS((s) => s.emptyTrash);
  const notify = useOS((s) => s.notify);
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = [...trash].sort((a, b) => b.deletedAt - a.deletedAt);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-glass-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Trash2 className="size-4 text-muted-foreground" />
          <span className="font-medium">Recycle Bin</span>
          <span className="text-muted-foreground">· {trash.length} item{trash.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!selected) return;
              restoreFromTrash(selected);
              setSelected(null);
            }}
            disabled={!selected}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-foreground hover:bg-white/10 disabled:opacity-30"
          >
            <RotateCcw className="size-3.5" /> Restore
          </button>
          <button
            onClick={() => {
              if (!selected) return;
              if (confirm("Permanently delete this item?")) {
                permanentlyDeleteTrash(selected);
                setSelected(null);
              }
            }}
            disabled={!selected}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-foreground hover:bg-white/10 disabled:opacity-30"
          >
            <X className="size-3.5" /> Delete
          </button>
          <button
            onClick={() => {
              if (trash.length === 0) return;
              if (confirm(`Empty Recycle Bin? This will permanently delete ${trash.length} item${trash.length !== 1 ? "s" : ""}.`)) {
                emptyTrash();
                setSelected(null);
                notify({ title: "Recycle Bin emptied", message: "All items were permanently removed." });
              }
            }}
            disabled={trash.length === 0}
            className="rounded-md bg-destructive/80 px-2.5 py-1 text-xs text-destructive-foreground hover:bg-destructive disabled:opacity-30"
          >
            Empty bin
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll" onClick={() => setSelected(null)}>
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Trash2 className="size-10 opacity-40" />
            <p className="text-sm">Recycle Bin is empty</p>
            <p className="text-xs opacity-70">Deleted files appear here. Hold Shift while deleting to skip the bin.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Original location</th>
                <th className="px-3 py-2 font-medium">Deleted</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const folder = isFolder(t.node);
                return (
                  <tr
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(t.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      restoreFromTrash(t.id);
                    }}
                    className={`cursor-default border-t border-glass-border ${selected === t.id ? "bg-primary/15" : "hover:bg-white/5"}`}
                  >
                    <td className="flex items-center gap-2 px-3 py-2">
                      {folder ? (
                        <Folder className="size-4 text-sky-400" />
                      ) : (
                        <FileText className="size-4 text-zinc-300" />
                      )}
                      <span className="truncate">{t.name}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.originalPath}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatTime(t.deletedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
