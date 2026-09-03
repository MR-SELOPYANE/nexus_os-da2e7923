import { useState } from "react";
import { useOS, type SAProvince, type SALanguage } from "@/os/store";
import { Sparkles, ChevronRight, Check } from "lucide-react";

const PROVINCES: SAProvince[] = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape",
];

const LANGUAGES: SALanguage[] = [
  "English", "isiZulu", "isiXhosa", "Afrikaans", "Sesotho",
  "Setswana", "Sepedi", "Xitsonga", "Tshivenda", "siSwati", "isiNdebele",
];

const GREETINGS: Record<SALanguage, string> = {
  English: "Welcome to NEXUS",
  isiZulu: "Sawubona! Wamukelekile ku-NEXUS",
  isiXhosa: "Molo! Wamkelekile kwi-NEXUS",
  Afrikaans: "Welkom by NEXUS",
  Sesotho: "Dumela! O amohetswe ho NEXUS",
  Setswana: "Dumela! O amogetswe mo go NEXUS",
  Sepedi: "Dumela! O amogetšwe go NEXUS",
  Xitsonga: "Avuxeni! U amukeriwa eka NEXUS",
  Tshivenda: "Ndaa! No ṱanganedzwa kha NEXUS",
  siSwati: "Sawubona! Wemukelekile ku-NEXUS",
  isiNdebele: "Lotjhani! Wamukelekile ku-NEXUS",
};

export function FirstBootWizard() {
  const updateSA = useOS((s) => s.updateSA);
  const sa = useOS((s) => s.sa);
  const activeProfileId = useOS((s) => s.activeProfileId);
  const updateProfile = useOS((s) => s.updateProfile);
  const setSettings = useOS((s) => s.setSettings);
  const [profileName, setProfileName] = useState("");
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<SALanguage>(sa.language);
  const [province, setProvince] = useState<SAProvince>(sa.province);
  const [dataSaver, setDataSaver] = useState(sa.dataSaver);
  const [ruralMode, setRuralMode] = useState(sa.ruralMode);
  const [cloud, setCloud] = useState(true);

  const next = () => setStep((s) => s + 1);
  const finish = () => {
    const name = profileName.trim() || "Guest";
    updateProfile(activeProfileId, { name });
    setSettings({ username: name.toLowerCase().replace(/\s+/g, "") || "guest" });
    updateSA({
      firstBootDone: true,
      language,
      aiLanguage: language,
      province,
      dataSaver,
      ruralMode,
      cloudSyncEnabled: cloud,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-emerald-950/60 backdrop-blur">
      <div className="w-[560px] max-w-[92vw] rounded-2xl border border-white/10 bg-card/90 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Sparkles className="size-5" />
          <span className="text-xs uppercase tracking-widest">NEXUS · African Edition</span>
        </div>

        {step === 0 && (
          <>
            <h1 className="mb-1 text-3xl font-bold">What should we call you?</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              This name is used for your NEXUS profile and greeting.
            </p>
            <input
              autoFocus
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && profileName.trim()) next();
              }}
              placeholder="Your name"
              maxLength={32}
              className="mb-6 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg outline-none focus:border-primary"
            />
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mb-1 text-3xl font-bold">{GREETINGS[language]}</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Made in Africa, for Africa. Let's set NEXUS up in your language.
            </p>
            <div className="mb-6 grid max-h-64 grid-cols-2 gap-2 overflow-auto">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`rounded border px-3 py-2 text-left text-sm ${
                    language === l ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-1 text-2xl font-bold">Where are you?</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We use this for local weather, load shedding schedules & emergency services.
            </p>
            <div className="mb-6 grid grid-cols-3 gap-2">
              {PROVINCES.map((p) => (
                <button
                  key={p}
                  onClick={() => setProvince(p)}
                  className={`rounded border px-3 py-2 text-xs ${
                    province === p ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mb-1 text-2xl font-bold">Optimise for your network</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              NEXUS can save data & work well in rural areas with slow connections.
            </p>
            <div className="space-y-3">
              <ToggleRow
                label="Data Saver Mode"
                desc="Compress images, block auto-play, disable background sync."
                active={dataSaver}
                onClick={() => setDataSaver((v) => !v)}
              />
              <ToggleRow
                label="Rural Connectivity Mode"
                desc="Aggressive caching, prefer text over media, offline queue."
                active={ruralMode}
                onClick={() => setRuralMode((v) => !v)}
              />
              <ToggleRow
                label="Enable NEXUS Cloud (15 GB free)"
                desc="Encrypted sync of files & settings across your devices."
                active={cloud}
                onClick={() => setCloud((v) => !v)}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="mb-1 text-2xl font-bold">You're all set 🎉</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              NEXUS is ready. Say <span className="text-primary">"Hey Nexus"</span> in {language} anytime, or press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-xs">Ctrl+K</kbd> to open Spotlight.
            </p>
            <ul className="mb-6 space-y-1 text-sm">
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" /> Name: {profileName.trim() || "Guest"}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" /> Language: {language}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" /> Province: {province}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" /> Data Saver: {dataSaver ? "On" : "Off"}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" /> Rural Mode: {ruralMode ? "On" : "Off"}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-400" /> Cloud sync: {cloud ? "On" : "Off"}</li>
            </ul>
          </>
        )}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-primary" : "bg-white/10"}`} />
            ))}
          </div>
          {step < 4 ? (
            <button
              onClick={next}
              disabled={step === 0 && !profileName.trim()}
              className="flex items-center gap-1 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              Continue <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Enter NEXUS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
        active ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className={`h-5 w-9 rounded-full p-0.5 transition ${active ? "bg-primary" : "bg-white/20"}`}>
        <div className={`h-4 w-4 rounded-full bg-white transition ${active ? "translate-x-4" : ""}`} />
      </div>
    </button>
  );
}
