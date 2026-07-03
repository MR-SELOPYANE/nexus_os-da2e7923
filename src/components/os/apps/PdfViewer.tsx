import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText } from "lucide-react";

const PAGES = [
  { title: "NEXUS Handbook", body: "Welcome to the NEXUS operating system. This document is a simulated PDF rendered natively — no plugin required." },
  { title: "Chapter 1 — Windows", body: "Drag any title bar to move a window. Snap to screen edges to tile. Ctrl+Alt+←/→ switches virtual desktops." },
  { title: "Chapter 2 — Apps", body: "The App Store contains a curated set of installable packages. The Terminal exposes the full command shell (type 'help')." },
  { title: "Chapter 3 — Shortcuts", body: "Ctrl+K opens Spotlight. Ctrl+Shift+V opens the clipboard. Alt+Tab cycles windows. Ctrl+Shift+S takes a screenshot." },
  { title: "Chapter 4 — Accessibility", body: "The Accessibility Center enables high contrast, color-blind filters, an on-screen magnifier, and text-to-speech." },
];

export function PdfViewer() {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const p = PAGES[page];

  return (
    <div className="flex h-full flex-col bg-zinc-800">
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900 px-3 py-1.5 text-xs">
        <FileText className="size-3.5" />
        <span>handbook.pdf</span>
        <span className="ml-auto text-muted-foreground">Page {page + 1} of {PAGES.length}</span>
        <button onClick={() => setPage((n) => Math.max(0, n - 1))} className="rounded p-1 hover:bg-white/10"><ChevronLeft className="size-3.5" /></button>
        <button onClick={() => setPage((n) => Math.min(PAGES.length - 1, n + 1))} className="rounded p-1 hover:bg-white/10"><ChevronRight className="size-3.5" /></button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="rounded p-1 hover:bg-white/10"><ZoomOut className="size-3.5" /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="rounded p-1 hover:bg-white/10"><ZoomIn className="size-3.5" /></button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} className="mx-auto max-w-lg rounded-sm bg-white p-10 text-zinc-900 shadow-2xl transition-transform">
          <h1 className="mb-4 border-b pb-2 text-2xl font-bold">{p.title}</h1>
          <p className="leading-relaxed">{p.body}</p>
          <p className="mt-6 text-xs text-zinc-400">— NEXUS Docs · Page {page + 1}</p>
        </div>
      </div>
    </div>
  );
}
