import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Camera, Image as ImageIcon } from "lucide-react";
import { useOS } from "@/os/store";
import { isFile, isFolder, resolvePath } from "@/os/fs";
import { cn } from "@/lib/utils";

const IMAGE_EXT = /\.(svg|png|jpg|jpeg|gif|webp)$/i;

interface Pic {
  name: string;
  path: string;
  src: string;
}

export function Photos() {
  const fs = useOS((s) => s.fs);
  const deleteNode = useOS((s) => s.deleteNode);
  const captureScreenshot = useOS((s) => s.captureScreenshot);

  const pics = useMemo<Pic[]>(() => {
    const dir = resolvePath(fs, "/home/Pictures");
    if (!dir || !isFolder(dir)) return [];
    return Object.entries(dir.children)
      .filter(([n, node]) => IMAGE_EXT.test(n) && isFile(node))
      .map(([n, node]) => ({
        name: n,
        path: `/home/Pictures/${n}`,
        src: isFile(node) ? node.content : "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [fs]);

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const open = openIdx != null ? pics[openIdx] : null;

  return (
    <div className="flex h-full flex-col bg-background/40">
      <div className="flex items-center justify-between border-b border-glass-border bg-white/5 px-3 py-2">
        <p className="text-sm font-medium">Pictures · {pics.length} item{pics.length === 1 ? "" : "s"}</p>
        <button
          onClick={captureScreenshot}
          className="flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/25"
        >
          <Camera className="size-3.5" /> Capture desktop
        </button>
      </div>

      {pics.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center text-sm text-muted-foreground">
          <div>
            <ImageIcon className="mx-auto mb-2 size-10 opacity-40" />
            No images yet. Click <span className="font-medium text-foreground">Capture desktop</span> or press <kbd className="rounded bg-white/10 px-1">PrtSc</kbd>.
          </div>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-3 os-scroll md:grid-cols-4">
          {pics.map((p, i) => (
            <button
              key={p.path}
              onClick={() => setOpenIdx(i)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-glass-border bg-black/30"
            >
              <img src={p.src} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-1.5 text-left text-[11px] text-white">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur"
          onClick={() => setOpenIdx(null)}
        >
          <button
            className={cn("absolute left-3 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20", openIdx === 0 && "opacity-30")}
            onClick={(e) => { e.stopPropagation(); setOpenIdx((i) => (i! > 0 ? i! - 1 : i)); }}
          >
            <ChevronLeft />
          </button>
          <img
            src={open.src}
            alt={open.name}
            className="max-h-[88%] max-w-[88%] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className={cn("absolute right-3 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20", openIdx === pics.length - 1 && "opacity-30")}
            onClick={(e) => { e.stopPropagation(); setOpenIdx((i) => (i! < pics.length - 1 ? i! + 1 : i)); }}
          >
            <ChevronRight />
          </button>
          <div
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{open.name}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/60">{openIdx! + 1} / {pics.length}</span>
            <button
              onClick={() => {
                deleteNode(open.path);
                setOpenIdx((i) => (pics.length > 1 ? Math.min(i!, pics.length - 2) : null));
              }}
              className="ml-2 grid size-7 place-items-center rounded-full hover:bg-white/15"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
