import { useState } from "react";
import {
  Folder,
  FileText,
  ChevronRight,
  Home,
  Trash2,
  FolderPlus,
  FilePlus,
  ArrowLeft,
} from "lucide-react";
import { useOS } from "@/os/store";
import { resolvePath, isFolder, isFile, parentPath, normalizeParts } from "@/os/fs";
import { openFileWith } from "@/os/fileAssoc";

export function FileExplorer() {
  const fs = useOS((s) => s.fs);
  const openApp = useOS((s) => s.openApp);
  const createFolder = useOS((s) => s.createFolder);
  const writeFile = useOS((s) => s.writeFile);
  const deleteNode = useOS((s) => s.deleteNode);

  const [cwd, setCwd] = useState("/home");
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
        {entries.map(([name, child]) => (
          <div
            key={name}
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
        ))}
      </div>

      <div className="border-t border-glass-border px-3 py-1 text-xs text-muted-foreground">
        {entries.length} item{entries.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
