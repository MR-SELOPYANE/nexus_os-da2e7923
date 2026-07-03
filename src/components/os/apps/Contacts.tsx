import { useState } from "react";
import { UserPlus, Phone, Mail as MailIcon, Trash2 } from "lucide-react";

interface Contact { id: string; name: string; email: string; phone: string; color: string }

const COLORS = ["from-sky-400 to-blue-600", "from-fuchsia-400 to-purple-600", "from-emerald-400 to-teal-600", "from-amber-300 to-orange-500", "from-rose-400 to-red-600"];

const SEED: Contact[] = [
  { id: "1", name: "Alice Chen", email: "alice@nexus", phone: "+1 555 0100", color: COLORS[0] },
  { id: "2", name: "Bruno Silva", email: "bruno@nexus", phone: "+55 11 90000", color: COLORS[1] },
  { id: "3", name: "Camila Ortiz", email: "camila@nexus", phone: "+34 600 100", color: COLORS[2] },
];

export function Contacts() {
  const [list, setList] = useState<Contact[]>(SEED);
  const [selId, setSel] = useState<string | null>(SEED[0].id);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const sel = list.find((c) => c.id === selId);

  const add = () => {
    if (!form.name.trim()) return;
    const c = { ...form, id: Date.now().toString(), color: COLORS[list.length % COLORS.length] };
    setList((l) => [...l, c]); setSel(c.id); setAdding(false); setForm({ name: "", email: "", phone: "" });
  };

  return (
    <div className="flex h-full">
      <aside className="w-56 border-r border-white/10 bg-black/30">
        <div className="border-b border-white/10 p-2">
          <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-1.5 text-sm text-primary-foreground"><UserPlus className="size-3.5" />Add</button>
        </div>
        <ul>
          {list.map((c) => (
            <li key={c.id}>
              <button onClick={() => { setSel(c.id); setAdding(false); }} className={`flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left hover:bg-white/5 ${selId === c.id && !adding ? "bg-primary/10" : ""}`}>
                <span className={`grid size-8 place-items-center rounded-full bg-gradient-to-br ${c.color} text-xs font-bold text-white`}>{c.name[0]}</span>
                <span className="text-sm">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex-1 p-6">
        {adding ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">New Contact</h3>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none" />
            <button onClick={add} className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground">Save</button>
          </div>
        ) : sel ? (
          <div className="flex flex-col items-center gap-4">
            <span className={`grid size-20 place-items-center rounded-full bg-gradient-to-br ${sel.color} text-3xl font-bold text-white`}>{sel.name[0]}</span>
            <h2 className="text-xl font-semibold">{sel.name}</h2>
            <div className="w-full max-w-sm space-y-2 rounded-lg bg-white/5 p-4 text-sm">
              <div className="flex items-center gap-2"><MailIcon className="size-4 text-primary" />{sel.email || "—"}</div>
              <div className="flex items-center gap-2"><Phone className="size-4 text-primary" />{sel.phone || "—"}</div>
            </div>
            <button onClick={() => { setList((l) => l.filter((x) => x.id !== sel.id)); setSel(null); }} className="mt-2 flex items-center gap-1 rounded-md bg-white/5 px-3 py-1.5 text-xs text-rose-300 hover:bg-white/10"><Trash2 className="size-3" />Delete</button>
          </div>
        ) : <p className="text-sm text-muted-foreground">Select a contact.</p>}
      </div>
    </div>
  );
}
