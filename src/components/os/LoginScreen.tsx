import { useEffect, useMemo, useState } from "react";
import { useOS } from "@/os/store";
import { WALLPAPERS } from "@/os/wallpapers";
import { Power, RotateCw, Moon, ArrowLeft, Lock } from "lucide-react";


const COLORS = [
  "from-primary to-cyan-600",
  "from-fuchsia-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-amber-300 to-orange-500",
  "from-rose-400 to-red-600",
  "from-sky-400 to-blue-600",
];

export function LoginScreen() {
  const login = useOS((s) => s.login);
  const shutdown = useOS((s) => s.shutdown);
  const wallpaperId = useOS((s) => s.settings.wallpaperId);
  const locked = useOS((s) => s.locked);
  const bootComplete = useOS((s) => s.bootComplete);
  const setBootComplete = useOS((s) => s.setBootComplete);
  const profiles = useOS((s) => s.profiles);
  const activeProfileId = useOS((s) => s.activeProfileId);
  const switchProfile = useOS((s) => s.switchProfile);
  const addProfile = useOS((s) => s.addProfile);
  const removeProfile = useOS((s) => s.removeProfile);

  const [now, setNow] = useState(() => new Date());
  
  const [selectedId, setSelectedId] = useState<string | null>(
    locked ? activeProfileId : null
  );
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newColor, setNewColor] = useState(COLORS[1]);

  const wp = WALLPAPERS.find((w) => w.id === wallpaperId) ?? WALLPAPERS[0];
  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId]
  );

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 5);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!bootComplete) setBootComplete(true);
  }, [bootComplete, setBootComplete]);

  const trySignIn = (id: string, providedPin?: string) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;
    if (id !== activeProfileId) {
      const ok = switchProfile(id, providedPin);
      if (!ok) {
        setPinError(true);
        return;
      }
    } else if (target.pin && target.pin !== providedPin) {
      setPinError(true);
      return;
    }
    setPin("");
    setPinError(false);
    login();
  };

  const handleSelect = (id: string) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;
    setPinError(false);
    setPin("");
    if (target.pin) {
      setSelectedId(id);
    } else {
      trySignIn(id);
    }
  };


  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center" style={{ background: wp.gradient }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative mb-12 text-center text-white">
        <p className="text-7xl font-extralight tabular-nums drop-shadow-lg">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="mt-1 text-lg font-light drop-shadow">
          {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* PIN entry for selected profile */}
      {selected ? (
        <div className="relative flex flex-col items-center gap-4">
          <span
            className={`grid size-24 place-items-center rounded-full bg-gradient-to-br ${selected.color} text-4xl font-semibold text-primary-foreground shadow-[var(--shadow-glow)]`}
          >
            {selected.name.charAt(0).toUpperCase()}
          </span>
          <p className="text-xl font-medium text-white drop-shadow">{selected.name}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              trySignIn(selected.id, pin);
            }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur-md">
              <Lock className="size-3.5 text-white/70" />
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter PIN"
                className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-white/60"
              />
            </div>
            {pinError && (
              <p className="text-xs text-rose-200">Incorrect PIN. Try again.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setPin("");
                  setPinError(false);
                }}
                className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white hover:bg-white/20"
              >
                <ArrowLeft className="size-3" /> Back
              </button>
              <button
                type="submit"
                className="rounded-full bg-white/25 px-6 py-1.5 text-xs font-medium text-white hover:bg-white/35"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      ) : adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            const id = addProfile({
              name: newName.trim(),
              color: newColor,
              role: "standard",
              pin: newPin || undefined,
            });
            setAdding(false);
            setNewName("");
            setNewPin("");
            // immediately sign in to the new account
            switchProfile(id, newPin || undefined);
            login();
          }}
          className="relative flex w-80 flex-col gap-3 rounded-2xl bg-white/10 p-5 backdrop-blur-md"
        >
          <p className="text-base font-semibold text-white">Add account</p>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="rounded-md bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50"
          />
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="PIN (optional)"
            className="rounded-md bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50"
          />
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`size-7 rounded-full bg-gradient-to-br ${c} ${
                  newColor === c ? "ring-2 ring-white" : "ring-1 ring-white/30"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-white/25 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/35"
            >
              Create &amp; sign in
            </button>
          </div>
        </form>
      ) : (
        <div className="relative flex max-w-3xl flex-wrap items-end justify-center gap-6">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors hover:bg-white/5"
            >
              <span
                className={`grid size-20 place-items-center rounded-full bg-gradient-to-br ${p.color} text-3xl font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105`}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-white drop-shadow">{p.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/60">
                {p.pin ? "PIN required" : p.role}
              </span>
              {p.id !== activeProfileId && profiles.length > 1 && !locked && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete account "${p.name}"? Their data will be lost.`)) {
                      removeProfile(p.id);
                    }
                  }}
                  className="text-[10px] text-white/40 opacity-0 hover:text-rose-300 group-hover:opacity-100"
                >
                  Remove
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Power menu */}
      <div className="absolute bottom-6 right-6 flex gap-2 text-white">
        <button
          onClick={() => window.location.reload()}
          title="Restart"
          className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
        >
          <RotateCw className="size-4" />
        </button>
        <button
          onClick={shutdown}
          title="Shut down"
          className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
        >
          <Power className="size-4" />
        </button>
        <button
          title="Sleep"
          className="grid size-10 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"
        >
          <Moon className="size-4" />
        </button>
      </div>
    </div>
  );
}
