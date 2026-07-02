import { Focus, Gamepad2, X } from "lucide-react";
import { useOS } from "@/os/store";
import { cn } from "@/lib/utils";

export function FocusModeBanner() {
  const focusMode = useOS((s) => s.quick.focusMode);
  const setQuick = useOS((s) => s.setQuick);
  if (focusMode === "off") return null;
  const isGaming = focusMode === "gaming";
  const Icon = isGaming ? Gamepad2 : Focus;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[9998] flex justify-center">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md animate-fade-up",
          isGaming
            ? "border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-100"
            : "border-primary/40 bg-primary/20 text-primary"
        )}
      >
        <Icon className="size-3.5" />
        <span>{isGaming ? "Gaming Mode" : "Focus Mode"} · Notifications silenced</span>
        <button
          onClick={() => setQuick({ focusMode: "off" })}
          className="ml-1 grid size-5 place-items-center rounded-full hover:bg-white/10"
          aria-label="Exit focus mode"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
