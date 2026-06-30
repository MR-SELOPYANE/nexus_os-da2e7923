import { useMemo, useState } from "react";
import { Save, FileText } from "lucide-react";
import { useOS } from "@/os/store";
import { resolvePath, isFile, isFolder } from "@/os/fs";

export function Notes({ winId, payload }: { winId: string; payload?: Record<string, unknown> }) {
  const fs = useOS((s) => s.fs);
  const writeFile = useOS((s) => s.writeFile);
  const notify = useOS((s) => s.notify);
  const setWindowTitle = useOS((s) => s.setWindowTitle);

  const initialPath = (payload?.path as string) ?? "/home/Documents/welcome.txt";
  const [path, setPath] = useState(initialPath);

  const node = resolvePath(fs, path);
  const initialContent = isFile(node) ? node.content : "";
  const [text, setText] = useState(initialContent);
  const [dirty, setDirty] = useState(false);

  // list available text files for quick open
  const docs = useMemo(() => {
    const out: string[] = [];
    const walk = (n: ReturnType<typeof resolvePath>, base: string) => {
      if (!n || !isFolder(n)) return;
      for (const [name, child] of Object.entries(n.children)) {
        const p = `${base}/${name}`;
        if (isFile(child)) out.push(p);
        else walk(child, p);
      }
    };
    walk(resolvePath(fs, "/home"), "/home");
    return out;
  }, [fs]);

  const open = (p: string) => {
    const n = resolvePath(fs, p);
    setPath(p);
    setText(isFile(n) ? n.content : "");
    setDirty(false);
    setWindowTitle(winId, `Notes — ${p.split("/").pop()}`);
  };

  const save = () => {
    writeFile(path, text);
    setDirty(false);
    notify({ title: "Notes", message: `Saved ${path.split("/").pop()}`, appId: "notes" });
  };

  return (
    <div className="flex h-full bg-card">
      <aside className="w-44 shrink-0 overflow-y-auto border-r border-glass-border bg-black/15 p-2 os-scroll">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Files
        </p>
        {docs.map((p) => (
          <button
            key={p}
            onClick={() => open(p)}
            className={[
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              p === path ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-white/5",
            ].join(" ")}
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">{p.split("/").pop()}</span>
          </button>
        ))}
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-glass-border px-3 py-1.5">
          <span className="truncate text-xs text-muted-foreground">{path}</span>
          <button
            onClick={save}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <Save className="size-3.5" /> Save
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setDirty(true); }}
          spellCheck={false}
          className="flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none os-scroll selection:bg-primary/30"
          placeholder="Start typing…"
        />
      </div>
    </div>
  );
}
