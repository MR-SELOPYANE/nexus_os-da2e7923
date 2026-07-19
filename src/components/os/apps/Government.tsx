import { Landmark, FileText, CreditCard, HeartPulse, Car, Vote, ExternalLink } from "lucide-react";

const SERVICES = [
  { id: "sars", name: "SARS eFiling", desc: "Submit your tax return, get IRP5, check refund status.", icon: FileText, url: "https://www.sars.gov.za" },
  { id: "nsfas", name: "NSFAS", desc: "Apply for student funding, check allowance status.", icon: CreditCard, url: "https://www.nsfas.org.za" },
  { id: "homeaffairs", name: "Home Affairs", desc: "Renew Smart ID, apply for passport, book an appointment.", icon: Landmark, url: "https://www.dha.gov.za" },
  { id: "sassa", name: "SASSA Grants", desc: "Check SRD R370 status, apply for child support grant.", icon: HeartPulse, url: "https://www.sassa.gov.za" },
  { id: "ntcelic", name: "eNaTIS / Licences", desc: "Renew driver's licence, book learner's test, pay traffic fines.", icon: Car, url: "https://online.natis.gov.za" },
  { id: "iec", name: "IEC (Elections)", desc: "Check registration, find your voting station.", icon: Vote, url: "https://www.elections.org.za" },
];

const EMERGENCY = [
  { name: "Police (SAPS)", number: "10111" },
  { name: "Ambulance (ER24)", number: "084 124" },
  { name: "Fire", number: "10177" },
  { name: "Gender-Based Violence Command", number: "0800 428 428" },
  { name: "Childline SA", number: "116" },
];

export function Government() {
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="border-b border-white/10 bg-gradient-to-r from-yellow-500/25 via-green-600/20 to-blue-600/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Landmark className="size-6" />
          <div>
            <div className="font-semibold">Government Hub · South Africa</div>
            <div className="text-xs text-muted-foreground">One-stop access to all national e-services</div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">e-Services</h2>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:border-primary/40 hover:bg-white/10"
            >
              <s.icon className="mt-0.5 size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-medium">
                  {s.name}
                  <ExternalLink className="size-3 opacity-0 group-hover:opacity-70" />
                </div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </a>
          ))}
        </div>

        <h2 className="mb-3 mt-6 text-sm font-semibold text-muted-foreground">Emergency Numbers</h2>
        <div className="rounded-lg border border-white/10 bg-white/5">
          {EMERGENCY.map((e, i) => (
            <div
              key={e.number}
              className={`flex items-center justify-between px-3 py-2 text-sm ${
                i > 0 ? "border-t border-white/10" : ""
              }`}
            >
              <span>{e.name}</span>
              <a href={`tel:${e.number}`} className="font-mono text-primary">{e.number}</a>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          🇿🇦 All links open on the official government portal. NEXUS never asks for your ID number.
        </div>
      </div>
    </div>
  );
}
