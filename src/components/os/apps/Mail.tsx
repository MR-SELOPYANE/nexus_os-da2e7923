import { useState } from "react";
import { Inbox, Send, Trash2, PenSquare } from "lucide-react";

interface Msg { id: string; from: string; subject: string; body: string; time: string; read: boolean; folder: "inbox" | "sent" | "trash" }

const SEED: Msg[] = [
  { id: "1", from: "Nexus Team <team@nexus>", subject: "Welcome to NEXUS Mail", body: "Thanks for trying Mail! This is a fully-simulated inbox — try composing a message.", time: "9:12 AM", read: false, folder: "inbox" },
  { id: "2", from: "Anton <anton@lovable>", subject: "Weekly digest", body: "5 new features shipped this week. Read more inside.", time: "Yesterday", read: false, folder: "inbox" },
  { id: "3", from: "Store <no-reply@nexus>", subject: "Your receipt", body: "Order #2043 — total $0.00 (free tier).", time: "Mon", read: true, folder: "inbox" },
  { id: "4", from: "Support <help@nexus>", subject: "Tips & tricks", body: "Alt+Space opens Spotlight. Ctrl+Shift+V opens the clipboard manager.", time: "Sun", read: true, folder: "inbox" },
];

export function Mail() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [folder, setFolder] = useState<Msg["folder"]>("inbox");
  const [selected, setSelected] = useState<string | null>(SEED[0].id);
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState(""); const [subj, setSubj] = useState(""); const [body, setBody] = useState("");

  const view = msgs.filter((m) => m.folder === folder);
  const current = msgs.find((m) => m.id === selected && m.folder === folder);

  const send = () => {
    if (!to.trim()) return;
    setMsgs((m) => [...m, { id: Date.now().toString(), from: "you@nexus", subject: subj || "(no subject)", body, time: "Now", read: true, folder: "sent" }]);
    setComposing(false); setTo(""); setSubj(""); setBody("");
  };
  const del = (id: string) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, folder: "trash" } : x)));

  return (
    <div className="flex h-full">
      <aside className="w-40 border-r border-white/10 bg-black/30 p-2 text-sm">
        <button onClick={() => setComposing(true)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-1.5 text-primary-foreground hover:opacity-90">
          <PenSquare className="size-3.5" />Compose
        </button>
        {[
          { id: "inbox" as const, label: "Inbox", Icon: Inbox },
          { id: "sent" as const, label: "Sent", Icon: Send },
          { id: "trash" as const, label: "Trash", Icon: Trash2 },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setFolder(id)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10 ${folder === id ? "bg-white/10 text-primary" : ""}`}>
            <Icon className="size-3.5" />{label}
            <span className="ml-auto text-xs text-muted-foreground">{msgs.filter((m) => m.folder === id).length}</span>
          </button>
        ))}
      </aside>
      <div className="w-64 overflow-y-auto border-r border-white/10">
        {view.map((m) => (
          <button key={m.id} onClick={() => { setSelected(m.id); setMsgs((ms) => ms.map((x) => x.id === m.id ? { ...x, read: true } : x)); }} className={`block w-full border-b border-white/5 px-3 py-2 text-left hover:bg-white/5 ${selected === m.id ? "bg-primary/10" : ""}`}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={m.read ? "" : "font-semibold text-foreground"}>{m.from.split("<")[0]}</span>
              <span>{m.time}</span>
            </div>
            <div className={`truncate text-sm ${m.read ? "text-muted-foreground" : "font-medium"}`}>{m.subject}</div>
            <div className="truncate text-xs text-muted-foreground">{m.body}</div>
          </button>
        ))}
        {view.length === 0 && <p className="p-4 text-xs text-muted-foreground">No messages.</p>}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {composing ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">New Message</h3>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none" />
            <input value={subj} onChange={(e) => setSubj(e.target.value)} placeholder="Subject" className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message…" rows={10} className="w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              <button onClick={send} className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground">Send</button>
              <button onClick={() => setComposing(false)} className="rounded-md bg-white/10 px-4 py-1.5 text-sm">Cancel</button>
            </div>
          </div>
        ) : current ? (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{current.subject}</h2>
                <p className="text-xs text-muted-foreground">From {current.from} · {current.time}</p>
              </div>
              <button onClick={() => del(current.id)} className="rounded-md p-1.5 hover:bg-white/10"><Trash2 className="size-4" /></button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.body}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a message.</p>
        )}
      </div>
    </div>
  );
}
