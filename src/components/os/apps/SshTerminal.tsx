import { useEffect, useRef, useState } from "react";

interface Line { text: string; kind: "in" | "out" | "err" | "sys" }

const HOSTS: Record<string, { motd: string; files: Record<string, string> }> = {
  "root@nexus-prod": {
    motd: "Welcome to NEXUS Production Server · Ubuntu 24.04 LTS · load 0.42\nLast login: today from 127.0.0.1",
    files: { "readme.txt": "This is a simulated remote box. Try: ls, cat readme.txt, uptime, whoami, exit" },
  },
  "admin@nebula": {
    motd: "Nebula Cluster · 12 nodes · all healthy",
    files: { "cluster.yaml": "nodes: 12\nregion: eu-west\nstatus: green" },
  },
};

export function SshTerminal() {
  const [host, setHost] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([{ text: "nexus-ssh 1.0 — type: ssh <user@host>  (e.g. ssh root@nexus-prod)", kind: "sys" }]);
  const [input, setInput] = useState("");
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight }); }, [lines]);

  const submit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setInput("");
    setLines((l) => [...l, { text: (host ? `${host}:~$ ` : "$ ") + cmd, kind: "in" }]);
    if (!host) {
      if (cmd.startsWith("ssh ")) {
        const target = cmd.slice(4).trim();
        const box = HOSTS[target];
        if (!box) { setLines((l) => [...l, { text: `ssh: could not resolve hostname ${target}`, kind: "err" }]); return; }
        setHost(target);
        setLines((l) => [...l, { text: `Connecting to ${target}…`, kind: "sys" }, { text: box.motd, kind: "out" }]);
      } else setLines((l) => [...l, { text: "not connected. Try: ssh root@nexus-prod", kind: "err" }]);
      return;
    }
    const box = HOSTS[host];
    const [c, ...args] = cmd.split(/\s+/);
    switch (c) {
      case "ls": setLines((l) => [...l, { text: Object.keys(box.files).join("  "), kind: "out" }]); break;
      case "cat": setLines((l) => [...l, { text: box.files[args[0]] ?? `cat: ${args[0]}: No such file`, kind: box.files[args[0]] ? "out" : "err" }]); break;
      case "whoami": setLines((l) => [...l, { text: host.split("@")[0], kind: "out" }]); break;
      case "uptime": setLines((l) => [...l, { text: `up 42 days, load average: 0.42, 0.38, 0.35`, kind: "out" }]); break;
      case "pwd": setLines((l) => [...l, { text: "/root", kind: "out" }]); break;
      case "clear": setLines([]); break;
      case "exit":
        setLines((l) => [...l, { text: "Connection to " + host + " closed.", kind: "sys" }]);
        setHost(null);
        break;
      default: setLines((l) => [...l, { text: `bash: ${c}: command not found`, kind: "err" }]);
    }
  };

  return (
    <div className="flex h-full flex-col bg-black text-emerald-300 font-mono text-[13px]">
      <div className="border-b border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
        {host ? `● connected: ${host}` : "○ disconnected"}
      </div>
      <div ref={scroll} className="flex-1 overflow-y-auto p-3 leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "err" ? "text-rose-400" : l.kind === "sys" ? "text-cyan-400" : l.kind === "in" ? "text-white" : ""}>
            {l.text.split("\n").map((t, j) => <div key={j}>{t}</div>)}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center border-t border-white/10 px-3 py-2">
        <span className="mr-2 text-cyan-400">{host ? `${host}:~$` : "$"}</span>
        <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent outline-none" />
      </form>
    </div>
  );
}
