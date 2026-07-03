import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { Upload, Download, RotateCw } from "lucide-react";

export function ImageEditor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [f, setF] = useState({ bright: 100, contrast: 100, sat: 100, blur: 0, hue: 0, invert: 0, sepia: 0, rot: 0 });
  const writeFile = useOS((s) => s.writeFile);
  const notify = useOS((s) => s.notify);

  useEffect(() => {
    const c = canvas.current; if (!c || !img) return;
    const size = 400;
    c.width = size; c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.filter = `brightness(${f.bright}%) contrast(${f.contrast}%) saturate(${f.sat}%) blur(${f.blur}px) hue-rotate(${f.hue}deg) invert(${f.invert}%) sepia(${f.sepia}%)`;
    ctx.translate(size / 2, size / 2);
    ctx.rotate((f.rot * Math.PI) / 180);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }, [img, f]);

  const onFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = url;
  };

  const save = () => {
    const c = canvas.current; if (!c) return;
    const dataUri = c.toDataURL("image/png");
    const name = `edited-${Date.now()}.png`;
    writeFile(`/home/Pictures/${name}`, dataUri);
    notify({ title: "Image saved", message: `Pictures/${name}` });
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 items-center justify-center bg-black/40 p-4">
        {img ? (
          <canvas ref={canvas} className="max-h-full max-w-full rounded-lg shadow-lg" />
        ) : (
          <label className="cursor-pointer rounded-lg border-2 border-dashed border-white/20 p-12 text-center text-sm text-muted-foreground hover:border-primary">
            <Upload className="mx-auto mb-2 size-8" />
            Click to load an image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
          </label>
        )}
      </div>
      <aside className="w-56 space-y-3 border-l border-white/10 bg-black/30 p-3 text-xs">
        <p className="text-sm font-semibold">Filters</p>
        {([
          ["bright", "Brightness", 0, 200],
          ["contrast", "Contrast", 0, 200],
          ["sat", "Saturation", 0, 200],
          ["hue", "Hue", 0, 360],
          ["blur", "Blur", 0, 10],
          ["invert", "Invert", 0, 100],
          ["sepia", "Sepia", 0, 100],
        ] as const).map(([key, label, min, max]) => (
          <label key={key} className="block">
            <div className="flex justify-between text-muted-foreground"><span>{label}</span><span>{f[key]}</span></div>
            <input type="range" min={min} max={max} value={f[key]} onChange={(e) => setF({ ...f, [key]: Number(e.target.value) })} className="w-full accent-[color:hsl(var(--primary))]" />
          </label>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={() => setF({ ...f, rot: (f.rot + 90) % 360 })} className="flex flex-1 items-center justify-center gap-1 rounded bg-white/5 py-1.5 hover:bg-white/10"><RotateCw className="size-3" />Rotate</button>
          <button onClick={() => setF({ bright: 100, contrast: 100, sat: 100, blur: 0, hue: 0, invert: 0, sepia: 0, rot: 0 })} className="flex-1 rounded bg-white/5 py-1.5 hover:bg-white/10">Reset</button>
        </div>
        <button onClick={save} disabled={!img} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-primary-foreground disabled:opacity-40"><Download className="size-3.5" />Save to Pictures</button>
      </aside>
    </div>
  );
}
