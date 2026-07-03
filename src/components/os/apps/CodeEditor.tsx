import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { resolvePath, isFile } from "@/os/fs";
import { Save, FilePlus2, Play, X } from "lucide-react";

interface Tab { path: string; content: string; dirty: boolean }

const KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|new|await|async|of|in|null|true|false|this|extends|typeof|=>|try|catch|throw)\b/g;

function highlight(src: string): string {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*`)/g, '<span style="color:#a5f3fc">$1</span>')
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#64748b;font-style:italic">$1</span>')
    .replace(KEYWORDS, '<span style="color:#c084fc">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fbbf24">$1</span>');
}

export function CodeEditor({ winId, payload }: { winId: string; payload?: Record<string, unknown> }) {
  const fs = useOS((s) => s.fs);
  const writeFile = useOS((s) => s.writeFile);
  const setWindowTitle = useOS((s) => s.setWindowTitle);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  const initial = payload?.path as string | undefined;

  useEffect(() => {
    if (initial) openFile(initial);
    else newFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const openFile = (path: string) => {
    const node = resolvePath(fs, path);
    const content = node && isFile(node) ? node.content : "";
    setTabs((t) => {
      const existing = t.findIndex((x) => x.path === path);
      if (existing >= 0) { setActive(existing); return t; }
      const nt = [...t, { path, content, dirty: false }];
      setActive(nt.length - 1);
      return nt;
    });
  };
  const newFile = () => {
    setTabs((t) => {
      const nt = [...t, { path: `/home/Documents/untitled-${t.length + 1}.js`, content: "// New file\n", dirty: true }];
      setActive(nt.length - 1);
      return nt;
    });
  };
  const current = tabs[active];
  useEffect(() => {
    if (current) setWindowTitle(winId, `Code Editor — ${current.path.split("/").pop()}${current.dirty ? " •" : ""}`);
  }, [current, winId, setWindowTitle]);

  const save = () => {
    if (!current) return;
    writeFile(current.path, current.content);
    setTabs((t) => t.map((x, i) => (i === active ? { ...x, dirty: false } : x)));
  };
  const closeTab = (i: number) => {
    setTabs((t) => t.filter((_, idx) => idx !== i));
    setActive((a) => Math.max(0, a - (i <= a ? 1 : 0)));
  };
  const run = () => {
    if (!current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const r = new Function(current.content)();
      alert("Result: " + JSON.stringify(r));
    } catch (e) { alert("Error: " + (e as Error).message); }
  };

  const html = useMemo(() => (current ? highlight(current.content) : ""), [current]);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100">
      <div className="flex items-center gap-1 border-b border-white/10 bg-zinc-900/60 px-2 py-1 text-xs">
        <button onClick={newFile} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"><FilePlus2 className="size-3.5" />New</button>
        <button onClick={save} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"><Save className="size-3.5" />Save</button>
        <button onClick={run} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"><Play className="size-3.5" />Run JS</button>
        <span className="ml-auto text-zinc-500">{current?.path}</span>
      </div>
      <div className="flex overflow-x-auto border-b border-white/10 bg-zinc-900/40 text-xs">
        {tabs.map((t, i) => (
          <div key={t.path} onClick={() => setActive(i)} className={`flex cursor-pointer items-center gap-2 border-r border-white/5 px-3 py-1.5 ${i === active ? "bg-zinc-950 text-primary" : "text-zinc-400 hover:text-zinc-100"}`}>
            <span className="max-w-[140px] truncate">{t.path.split("/").pop()}{t.dirty && " •"}</span>
            <X className="size-3 hover:text-rose-400" onClick={(e) => { e.stopPropagation(); closeTab(i); }} />
          </div>
        ))}
      </div>
      {current && (
        <div className="relative flex-1 overflow-hidden">
          <pre aria-hidden className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[13px] leading-[1.5]" dangerouslySetInnerHTML={{ __html: html + "\n" }} />
          <textarea
            ref={ta}
            spellCheck={false}
            value={current.content}
            onChange={(e) => setTabs((t) => t.map((x, i) => (i === active ? { ...x, content: e.target.value, dirty: true } : x)))}
            className="relative h-full w-full resize-none bg-transparent p-3 font-mono text-[13px] leading-[1.5] text-transparent caret-white outline-none"
          />
        </div>
      )}
    </div>
  );
}
