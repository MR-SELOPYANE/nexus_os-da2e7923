import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, Plus, Trash2 } from "lucide-react";

interface Rule { id: string; app: string; direction: "in" | "out"; action: "allow" | "block" }

export function Firewall() {
  const [enabled, setEnabled] = useState(true);
  const [stealthMode, setStealth] = useState(false);
  const [vpn, setVpn] = useState(false);
  const [rules, setRules] = useState<Rule[]>([
    { id: "1", app: "nexus-browser", direction: "out", action: "allow" },
    { id: "2", app: "ssh", direction: "out", action: "allow" },
    { id: "3", app: "unknown-daemon", direction: "in", action: "block" },
  ]);
  const [newApp, setNewApp] = useState("");

  const add = () => {
    if (!newApp.trim()) return;
    setRules((r) => [...r, { id: Date.now().toString(), app: newApp, direction: "out", action: "allow" }]);
    setNewApp("");
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={`grid size-14 place-items-center rounded-2xl ${enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
          {enabled ? <ShieldCheck className="size-7" /> : <ShieldOff className="size-7" />}
        </div>
        <div>
          <p className="text-lg font-semibold">Firewall {enabled ? "active" : "disabled"}</p>
          <p className="text-xs text-muted-foreground">{rules.length} rules · {vpn ? "VPN routed via nexus-vpn.io" : "Direct connection"}</p>
        </div>
        <button onClick={() => setEnabled((e) => !e)} className="ml-auto rounded-md bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <label className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
          Stealth mode
          <input type="checkbox" checked={stealthMode} onChange={(e) => setStealth(e.target.checked)} className="accent-[color:hsl(var(--primary))]" />
        </label>
        <label className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2">
          VPN (Nexus Cloud)
          <input type="checkbox" checked={vpn} onChange={(e) => setVpn(e.target.checked)} className="accent-[color:hsl(var(--primary))]" />
        </label>
      </div>

      <p className="mb-2 text-sm font-semibold">Rules</p>
      <div className="mb-2 flex gap-2">
        <input value={newApp} onChange={(e) => setNewApp(e.target.value)} placeholder="App or port…" className="flex-1 rounded-md bg-white/5 px-3 py-1.5 text-xs outline-none" />
        <button onClick={add} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"><Plus className="size-3" />Add</button>
      </div>
      <div className="space-y-1">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm">
            <Shield className={`size-3.5 ${r.action === "allow" ? "text-emerald-400" : "text-rose-400"}`} />
            <span className="flex-1">{r.app}</span>
            <select value={r.direction} onChange={(e) => setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, direction: e.target.value as Rule["direction"] } : x))} className="rounded bg-black/30 px-2 py-0.5 text-xs">
              <option value="in">Inbound</option><option value="out">Outbound</option>
            </select>
            <select value={r.action} onChange={(e) => setRules((rs) => rs.map((x) => x.id === r.id ? { ...x, action: e.target.value as Rule["action"] } : x))} className="rounded bg-black/30 px-2 py-0.5 text-xs">
              <option value="allow">Allow</option><option value="block">Block</option>
            </select>
            <button onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))} className="rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-rose-400"><Trash2 className="size-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
