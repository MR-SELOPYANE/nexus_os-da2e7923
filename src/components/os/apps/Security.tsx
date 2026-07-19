import { useEffect, useState } from "react";
import { useOS } from "@/os/store";
import { Shield, ShieldCheck, ShieldAlert, Eye, Lock, Bot } from "lucide-react";

interface Finding {
  id: string;
  severity: "low" | "med" | "high";
  title: string;
  detail: string;
  status: "open" | "fixed";
}

const INITIAL: Finding[] = [
  { id: "f1", severity: "high", title: "3 apps still request microphone access", detail: "Recorder, Assistant, SSH — review permissions.", status: "open" },
  { id: "f2", severity: "med", title: "Password reuse detected in saved passwords", detail: "Nexus AI checked against Have-I-Been-Pwned patterns.", status: "open" },
  { id: "f3", severity: "low", title: "System updates 4 days old", detail: "Install pending security update 24.10.02.", status: "open" },
];

export function Security() {
  const notify = useOS((s) => s.notify);
  const [findings, setFindings] = useState<Finding[]>(INITIAL);
  const [scanning, setScanning] = useState(false);
  const [score, setScore] = useState(72);

  useEffect(() => {
    const open = findings.filter((f) => f.status === "open");
    setScore(100 - open.reduce((a, f) => a + (f.severity === "high" ? 18 : f.severity === "med" ? 8 : 3), 0));
  }, [findings]);

  const scan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 1400));
    setScanning(false);
    notify({ title: "AI Security scan complete", message: `Score: ${score}/100. ${findings.filter((f) => f.status === "open").length} open issues.` });
  };

  const fix = (id: string) =>
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, status: "fixed" } : f)));

  const color = score >= 85 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="border-b border-white/10 bg-gradient-to-r from-indigo-700/30 to-fuchsia-600/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="size-6" />
          <div>
            <div className="font-semibold">AI Security Center</div>
            <div className="text-xs text-muted-foreground">Powered by Nexus Assistant · Continuous threat modelling</div>
          </div>
          <button
            onClick={scan}
            disabled={scanning}
            className="ml-auto flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
          >
            <Bot className="size-3.5" /> {scanning ? "Scanning…" : "Run AI scan"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 border-b border-white/10 bg-black/20 p-4">
        <div className="col-span-1 flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4">
          <div className={`text-5xl font-bold ${color}`}>{score}</div>
          <div className="text-xs text-muted-foreground">Security score</div>
        </div>
        <Stat icon={<ShieldCheck className="size-4 text-emerald-400" />} label="Firewall" value="Active" />
        <Stat icon={<Lock className="size-4 text-primary" />} label="Disk encrypted" value="Yes · AES-256" />
        <Stat icon={<Eye className="size-4 text-amber-400" />} label="Privacy monitor" value="On" />
        <Stat icon={<ShieldAlert className="size-4 text-red-400" />} label="Open issues" value={String(findings.filter((f) => f.status === "open").length)} />
        <Stat icon={<Bot className="size-4 text-fuchsia-400" />} label="AI monitor" value="24/7" />
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h2 className="mb-2 text-sm font-semibold">Findings</h2>
        <ul className="space-y-2">
          {findings.map((f) => (
            <li
              key={f.id}
              className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                f.status === "fixed"
                  ? "border-emerald-500/30 bg-emerald-500/10 opacity-70"
                  : f.severity === "high"
                    ? "border-red-500/40 bg-red-500/10"
                    : f.severity === "med"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{f.severity}</span>
                  <span className="font-medium">{f.title}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{f.detail}</div>
              </div>
              {f.status === "open" ? (
                <button onClick={() => fix(f.id)} className="rounded bg-primary/20 px-3 py-1 text-xs text-primary hover:bg-primary/30">
                  Fix with AI
                </button>
              ) : (
                <span className="text-xs text-emerald-400">Resolved</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
