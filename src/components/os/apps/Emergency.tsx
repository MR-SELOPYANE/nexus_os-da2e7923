import { useState } from "react";
import { useOS } from "@/os/store";
import { Siren, Phone, MapPin, HeartPulse, Plus, X } from "lucide-react";

export function Emergency() {
  const sa = useOS((s) => s.sa);
  const updateSA = useOS((s) => s.updateSA);
  const addContact = useOS((s) => s.addEmergencyContact);
  const removeContact = useOS((s) => s.removeEmergencyContact);
  const notify = useOS((s) => s.notify);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  const [sos, setSos] = useState(false);

  const triggerSOS = () => {
    setSos(true);
    notify({
      title: "🚨 SOS activated",
      message: `Sharing your location with ${sa.emergencyContacts.length || 0} contacts and ER24.`,
    });
    setTimeout(() => setSos(false), 4000);
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-background text-foreground">
      <header className="border-b border-red-500/40 bg-gradient-to-r from-red-700/30 to-orange-600/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Siren className="size-6 text-red-400" />
          <div>
            <div className="font-semibold">Emergency Mode</div>
            <div className="text-xs text-muted-foreground">
              Works offline · Accessible from the lock screen
            </div>
          </div>
        </div>
      </header>

      <div className="p-4">
        <button
          onClick={triggerSOS}
          className={`w-full rounded-2xl border-2 border-red-500 px-6 py-6 text-lg font-bold uppercase tracking-widest transition ${
            sos ? "animate-pulse bg-red-600 text-white" : "bg-red-600/20 text-red-200 hover:bg-red-600/40"
          }`}
        >
          {sos ? "Sending SOS…" : "🚨 Trigger SOS"}
        </button>

        <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Quick Dial</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "SAPS", n: "10111" },
            { name: "ER24", n: "084 124" },
            { name: "Fire", n: "10177" },
          ].map((c) => (
            <a
              key={c.n}
              href={`tel:${c.n}`}
              className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10"
            >
              <Phone className="size-4 text-red-400" />
              <div className="text-sm font-medium">{c.name}</div>
              <div className="font-mono text-xs text-muted-foreground">{c.n}</div>
            </a>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">
          <HeartPulse className="mr-1 inline size-4" /> Medical ID
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Blood type (e.g. O+)"
            value={sa.bloodType}
            onChange={(e) => updateSA({ bloodType: e.target.value })}
            className="rounded bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <input
            placeholder="Allergies"
            value={sa.allergies}
            onChange={(e) => updateSA({ allergies: e.target.value })}
            className="rounded bg-white/5 px-3 py-2 text-sm outline-none"
          />
        </div>
        <textarea
          placeholder="Medical notes (conditions, medication)…"
          value={sa.medicalNotes}
          onChange={(e) => updateSA({ medicalNotes: e.target.value })}
          className="mt-2 h-20 w-full resize-none rounded bg-white/5 px-3 py-2 text-sm outline-none"
        />

        <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Emergency Contacts</h2>
        <ul className="space-y-1">
          {sa.emergencyContacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.relation} · {c.phone}
                </div>
              </div>
              <button onClick={() => removeContact(c.id)} className="text-muted-foreground hover:text-red-400">
                <X className="size-4" />
              </button>
            </li>
          ))}
          {sa.emergencyContacts.length === 0 && (
            <li className="text-xs text-muted-foreground">No contacts yet.</li>
          )}
        </ul>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded bg-white/5 px-2 py-1.5 text-xs outline-none"
          />
          <input
            placeholder="Relation"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className="rounded bg-white/5 px-2 py-1.5 text-xs outline-none"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded bg-white/5 px-2 py-1.5 text-xs outline-none"
          />
          <button
            disabled={!name || !phone}
            onClick={() => {
              addContact({ name, relation, phone });
              setName("");
              setRelation("");
              setPhone("");
            }}
            className="flex items-center justify-center gap-1 rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
          <MapPin className="size-4" /> When SOS is triggered, your live location is shared with your contacts and emergency services.
        </div>
      </div>
    </div>
  );
}
