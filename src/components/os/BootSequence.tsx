import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { sfx } from "@/lib/sounds";

const POST_LINES = [
  "NEXUS BIOS v3.14 · Copyright (c) NEXUS Systems",
  "CPU: Nexus Quantum Core @ 4.20GHz  x8",
  "Memory Test: 4096 MB OK",
  "Detecting IDE drives .......... [OK]",
  "Detecting USB devices .......... [OK]",
  "Initializing PCI Bus ........... [OK]",
  "Loading nexus-kernel v1.0.0 .... [OK]",
  "Mounting virtual filesystem .... [OK]",
  "Starting window-server ......... [OK]",
  "Starting notification-hub ...... [OK]",
  "Starting network stack ......... [OK]",
  "Loading nexus-shell ............ [OK]",
  "Boot complete. Handing off to login manager.",
];

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"bios" | "logo">("bios");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (phase !== "bios") return;
    if (shown >= POST_LINES.length) {
      const t = setTimeout(() => setPhase("logo"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), 120 + Math.random() * 90);
    return () => clearTimeout(t);
  }, [phase, shown]);

  useEffect(() => {
    if (phase === "logo") {
      try { sfx.startup(); } catch { /* ignore */ }
      const t = setTimeout(onDone, 1600);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  if (phase === "bios") {
    return (
      <div className="h-full w-full bg-black text-emerald-300 font-mono text-xs p-4 overflow-hidden">
        <pre className="whitespace-pre-wrap leading-relaxed">
{POST_LINES.slice(0, shown).map((l, i) => `${l}\n`).join("")}
{shown < POST_LINES.length ? <span className="animate-pulse">▮</span> : null}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white">
      <div className="mb-8 grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-cyan-400 via-primary to-fuchsia-500 shadow-[0_0_60px_rgba(94,234,212,0.6)] animate-pulse">
        <span className="text-4xl font-black tracking-tight">N</span>
      </div>
      <p className="text-3xl font-extralight tracking-widest">NEXUS</p>
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  );
}

export function ShutdownScreen() {
  const mode = useOS((s) => s.shuttingDown);
  const cancel = useOS((s) => s.cancelShutdown);

  useEffect(() => {
    try { sfx.shutdown(); } catch { /* ignore */ }
    const t = setTimeout(() => {
      if (mode === "restart") {
        cancel();
      } else {
        // stay on shutdown screen; user can click power to reboot
      }
    }, mode === "restart" ? 2200 : 1800);
    return () => clearTimeout(t);
  }, [mode, cancel]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white">
      <div className="mb-6 size-14 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
      <p className="text-lg font-light tracking-wide">
        {mode === "restart" ? "Restarting NEXUS…" : "Shutting down NEXUS…"}
      </p>
      {mode === "shutdown" && (
        <button
          onClick={cancel}
          className="mt-10 rounded-full bg-white/10 px-5 py-2 text-xs text-white/70 hover:bg-white/20"
        >
          Press power to boot again
        </button>
      )}
    </div>
  );
}
