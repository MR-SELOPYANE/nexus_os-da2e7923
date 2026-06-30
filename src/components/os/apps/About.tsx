import { Cpu, HardDrive, Layers, TerminalSquare } from "lucide-react";

export function About() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-card p-6 text-center">
      <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-cyan-600 shadow-[var(--shadow-glow)]">
        <span className="text-4xl font-bold text-primary-foreground">A</span>
      </div>
      <div>
        <h1 className="text-xl font-bold">NEXUS</h1>
        <p className="text-sm text-muted-foreground">Version 1.0.0 “Glass”</p>
      </div>
      <div className="grid w-full max-w-xs grid-cols-2 gap-2 text-left text-sm">
        <Spec icon={Layers} label="Window Manager" value="Glass WM" />
        <Spec icon={HardDrive} label="File System" value="Virtual FS" />
        <Spec icon={TerminalSquare} label="Shell" value="nexus-sh" />
        <Spec icon={Cpu} label="Runtime" value="Browser" />
      </div>
      <p className="max-w-xs text-xs text-muted-foreground">
        A simulated operating system built with React, TypeScript, Tailwind CSS and Zustand.
      </p>
    </div>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-black/20 p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
