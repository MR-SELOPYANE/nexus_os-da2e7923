import { useMemo, useState } from "react";
import { Clipboard, Pin, PinOff, Trash2, Copy, Search, Eraser } from "lucide-react";
import { useOS } from "@/os/store";
import { cn } from "@/lib/utils";

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function ClipboardManager() {
  const clipboard = useOS((s) => s.clipboard);
  const pasteClip = useOS((s) => s.pasteClip);
  const removeClip = useOS((s) => s.removeClip);
  const pinClip = useOS((s) => s.pinClip);
  const clearClipboard = useOS((s) => s.clearClipboard);
  const notify = useOS((s) => s.notify);
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const list = q.trim()
      ? clipboard.filter((c) => c.text.toLowerCase().includes(q.toLowerCase()))
      : clipboard;
    return [...list].sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return Number(!!b.pinned) - Number(!!a.pinned);
      return b.time - a.time;
    });
  }, [clipboard, q]);

  const onCopy = (id: string) => {
    const text = pasteClip(id);
    if (text != null) notify({ title: "Copied to clipboard", message: text.slice(0, 80) });
  };

  return (
    <div className="flex h-full flex-col bg-background/40">
      <div className="flex items-center gap-2 border-b border-glass-border bg-white/5 px-3 py-2">
        <Clipboard className="size-4 text-primary" />
        <span className="text-sm font-medium">Clipboard History</span>
        <span className="text-xs text-muted-foreground">
          {clipboard.length} item{clipboard.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-7 w-44 rounded-md border border-glass-border bg-white/5 pl-7 pr-2 text-xs outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={clearClipboard}
            className="flex items-center gap-1 rounded-md border border-glass-border bg-white/5 px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
            title="Clear unpinned"
          >
            <Eraser className="size-3.5" /> Clear
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <Clipboard className="size-10 opacity-40" />
          <div className="text-sm">Your clipboard is empty</div>
          <div className="max-w-xs text-xs">
            Copy anything (Ctrl+C) anywhere in NEXUS to capture it here. Open with
            <span className="mx-1 rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">Ctrl+Shift+V</span>.
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {items.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group rounded-lg border border-glass-border bg-white/5 p-2 transition-colors hover:bg-white/10",
                c.pinned && "border-primary/40 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onCopy(c.id)}
                  className="flex-1 text-left text-xs"
                  title="Click to copy"
                >
                  <div className="line-clamp-3 whitespace-pre-wrap break-words font-mono text-foreground">
                    {c.text}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{timeAgo(c.time)}</span>
                    {c.source && <span>· {c.source}</span>}
                    <span>· {c.text.length} chars</span>
                  </div>
                </button>
                <div className="flex shrink-0 flex-col gap-1 opacity-60 group-hover:opacity-100">
                  <button
                    onClick={() => onCopy(c.id)}
                    className="grid size-6 place-items-center rounded hover:bg-white/10"
                    title="Copy"
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    onClick={() => pinClip(c.id)}
                    className="grid size-6 place-items-center rounded hover:bg-white/10"
                    title={c.pinned ? "Unpin" : "Pin"}
                  >
                    {c.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </button>
                  <button
                    onClick={() => removeClip(c.id)}
                    className="grid size-6 place-items-center rounded text-destructive hover:bg-destructive/15"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
