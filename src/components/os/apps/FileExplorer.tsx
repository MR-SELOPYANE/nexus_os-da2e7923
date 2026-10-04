import { useCallback, useEffect, useState } from "react";
import {
  Folder,
  FileText,
  ChevronRight,
  Home,
  Trash2,
  FolderPlus,
  FilePlus,
  ArrowLeft,
  HardDrive,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { useOS } from "@/os/store";
import { resolvePath, isFolder, isFile, parentPath, normalizeParts, type FSNode } from "@/os/fs";
import { openFileWith } from "@/os/fileAssoc";
import { hostFs, useNativeSystem, formatBytes, type HostEntry } from "@/os/native-system";

export function FileExplorer() {
  const fs = useOS((s) => s.fs);
  const openApp = useOS((s) => s.openApp);
  const createFolder = useOS((s) => s.createFolder);
  const writeFile = useOS((s) => s.writeFile);
  const deleteNode = useOS((s) => s.deleteNode);

  const native = useNativeSystem();
  const hostAvailable = Boolean(native?.available && native.capabilities?.fs);
  const [mode, setMode] = useState<"virtual" | "host">("virtual");
  const [cwd, setCwd] = useState("/home");

  // switch automatically to the real home directory on a NEXUS device
  useEffect(() => {
    if (hostAvailable) setMode("host");
  }, [hostAvailable]);

  if (mode === "host" && hostAvailable) {
    const root = native?.fsRoot || native?.home || "/home/nexus";
    return <HostExplorer root={root} onLeave={() => setMode("virtual")} onSync={() => syncVirtualToDisk(fs, "NEXUS")} />;
  }
  const node = resolvePath(fs, cwd);
  const entries = isFolder(node)
    ? Object.entries(node.children).sort(([a, ca], [b, cb]) => {
        const af = isFolder(ca) ? 0 : 1;
        const bf = isFolder(cb) ? 0 : 1;
        return af - bf || a.localeCompare(b);
      })
    : [];

  const crumbs = normalizeParts(cwd);

  const openEntry = (name: string) => {
    const p = `${cwd}/${name}`.replace("//", "/");
    const target = resolvePath(fs, p);
    if (isFolder(target)) setCwd(p);
    else if (isFile(target)) openFileWith(p, openApp);
  };

  const newFolder = () => {
    const name = prompt("Folder name:");
    if (name) createFolder(`${cwd}/${name}`);
  };
  const newFile = () => {
    const name = prompt("File name:");
    if (name) writeFile(`${cwd}/${name}`, "");
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-glass-border px-2 py-1.5">
        <button
          onClick={() => setCwd(parentPath(cwd) || "/")}
          disabled={cwd === "/" || cwd === ""}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          onClick={() => setCwd("/home")}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <Home className="size-4" />
        </button>
        <div className="mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto text-sm">
          <button onClick={() => setCwd("/")} className="rounded px-1 hover:bg-white/10">/</button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <ChevronRight className="size-3 text-muted-foreground" />
              <button
                onClick={() => setCwd("/" + crumbs.slice(0, i + 1).join("/"))}
                className="rounded px-1 hover:bg-white/10"
              >
                {c}
              </button>
            </span>
          ))}
        </div>
        {hostAvailable && (
          <button
            onClick={() => setMode("host")}
            title="Browse the real disk"
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <HardDrive className="size-4" />
          </button>
        )}
        <button onClick={newFolder} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground" title="New folder">
          <FolderPlus className="size-4" />
        </button>
        <button onClick={newFile} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground" title="New file">
          <FilePlus className="size-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(96px,1fr))] content-start gap-1 overflow-y-auto p-3 os-scroll">
        {entries.length === 0 && (
          <p className="col-span-full mt-8 text-center text-sm text-muted-foreground">
            This folder is empty
          </p>
        )}
        {entries.map(([name, child]) => {
          const fullPath = `${cwd}/${name}`.replace("//", "/");
          return (
          <div
            key={name}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-nexus-file", fullPath);
              e.dataTransfer.setData("text/plain", fullPath);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onDoubleClick={() => openEntry(name)}
            onClick={(e) => {
              if (e.detail === 1) return;
            }}
            className="group relative flex cursor-default flex-col items-center gap-1.5 rounded-lg p-2 text-center hover:bg-white/8"
          >
            {isFolder(child) ? (
              <Folder className="size-10 text-sky-400" />
            ) : (
              <FileText className="size-10 text-zinc-300" />
            )}
            <span className="line-clamp-2 w-full break-words text-xs">{name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const permanent = e.shiftKey;
                const msg = permanent
                  ? `Permanently delete ${name}? This bypasses the Recycle Bin.`
                  : `Move ${name} to the Recycle Bin?`;
                if (confirm(msg)) deleteNode(`${cwd}/${name}`, { permanent });
              }}
              title="Delete (hold Shift to delete permanently)"
              className="absolute right-1 top-1 hidden rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:block"
            >
              <Trash2 className="size-3" />
            </button>

          </div>
          );
        })}
      </div>

      <div className="border-t border-glass-border px-3 py-1 text-xs text-muted-foreground">
        {entries.length} item{entries.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

/** Mirror the virtual filesystem onto the real disk (paths relative to the device fs root). */
async function syncVirtualToDisk(fs: FSNode, target: string): Promise<number> {
  let count = 0;
  const walk = async (node: FSNode, path: string) => {
    if (isFolder(node)) {
      await hostFs.mkdir(path);
      for (const [name, child] of Object.entries(node.children)) await walk(child, `${path}/${name}`);
    } else if (isFile(node)) {
      await hostFs.write(path, node.content);
      count++;
    }
  };
  await walk(fs, target);
  return count;
}

/** Real on-disk browser — backed by the device API (/home/nexus and below). */
function HostExplorer({ root, onLeave, onSync }: { root: string; onLeave: () => void; onSync: () => Promise<number> }) {
  const openApp = useOS((s) => s.openApp);
  const [path, setPath] = useState("");
  const [items, setItems] = useState<HostEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const load = useCallback(
    async (target: string) => {
      setBusy(true);
      try {
        const res = await hostFs.list(target || ".");
        if (res.error) setError(res.error);
        else {
          setError(null);
          setItems(res.items);
          setPath(res.path);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "read failed");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load("");
  }, [load]);

  const crumbs = path ? path.split("/") : [];
  const visible = items.filter((i) => showHidden || !i.hidden);

  const open = async (entry: HostEntry) => {
    if (entry.type === "folder") return load(entry.path);
    const res = await hostFs.read(entry.path);
    if (res.error) return alert(res.error);
    openApp("notes", { hostPath: entry.path, content: res.content, name: entry.name });
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-1 border-b border-glass-border px-2 py-1.5">
        <button
          onClick={() => load(path.split("/").slice(0, -1).join("/"))}
          disabled={!path}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 disabled:opacity-30"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button onClick={() => load("")} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10">
          <Home className="size-4" />
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const n = await onSync();
              alert(`Saved ${n} files from NEXUS to the NEXUS folder on this computer.`);
              await load(path);
            } catch (err) {
              alert(err instanceof Error ? err.message : "sync failed");
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10"
          title="Copy your NEXUS files to the real disk"
        >
          Sync to disk
        </button>
        <div className="mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto text-sm">
          <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300">
            <Cpu className="size-3" /> {root}
          </span>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <ChevronRight className="size-3 text-muted-foreground" />
              <button onClick={() => load(crumbs.slice(0, i + 1).join("/"))} className="rounded px-1 hover:bg-white/10">
                {c}
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowHidden((v) => !v)}
          className={`rounded px-2 py-1 text-[11px] ${showHidden ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/10"}`}
        >
          .hidden
        </button>
        <button onClick={() => load(path)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10">
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={async () => {
            const name = prompt("Folder name:");
            if (name) {
              await hostFs.mkdir(path ? `${path}/${name}` : name);
              void load(path);
            }
          }}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10"
          title="New folder"
        >
          <FolderPlus className="size-4" />
        </button>
        <button
          onClick={async () => {
            const name = prompt("File name:");
            if (name) {
              await hostFs.write(path ? `${path}/${name}` : name, "");
              void load(path);
            }
          }}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10"
          title="New file"
        >
          <FilePlus className="size-4" />
        </button>
        <button onClick={onLeave} className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10">
          NEXUS FS
        </button>
      </div>

      {error && <div className="border-b border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">{error}</div>}

      <div className="flex-1 overflow-auto os-scroll">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 font-medium">Name</th>
              <th className="px-3 py-1.5 font-medium">Size</th>
              <th className="px-3 py-1.5 font-medium">Modified</th>
              <th className="px-3 py-1.5 font-medium">Mode</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr key={entry.path} onDoubleClick={() => open(entry)} className="group cursor-default border-b border-white/5 hover:bg-white/5">
                <td className="flex items-center gap-2 px-3 py-1.5">
                  {entry.type === "folder" ? <Folder className="size-4 text-sky-400" /> : <FileText className="size-4 text-zinc-300" />}
                  <span className={entry.hidden ? "opacity-60" : ""}>{entry.name}</span>
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{entry.type === "folder" ? "—" : formatBytes(entry.size)}</td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {entry.modified ? new Date(entry.modified).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{entry.mode.toString(8).padStart(3, "0")}</td>
                <td className="px-2">
                  <button
                    onClick={async (e) => {
                      const permanent = e.shiftKey;
                      const msg = permanent
                        ? `Permanently delete ${entry.name}?`
                        : `Move ${entry.name} to Trash?`;
                      if (!confirm(msg)) return;
                      await hostFs.remove(entry.path, permanent);
                      void load(path);
                    }}
                    className="hidden rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:block"
                    title="Delete (Shift = permanent)"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && !busy && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  This folder is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-glass-border px-3 py-1 text-xs text-muted-foreground">
        Real filesystem · {visible.length} item{visible.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
