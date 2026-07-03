import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { useOS } from "@/os/store";
import { LoginScreen } from "./LoginScreen";
import { DesktopIcons } from "./DesktopIcons";
import { WindowFrame } from "./WindowFrame";
import { AppHost } from "./AppHost";
import { Taskbar } from "./Taskbar";
import { StartMenu } from "./StartMenu";
import { NotificationCenter } from "./NotificationCenter";
import { DesktopContextMenu } from "./DesktopContextMenu";
import { Widgets } from "./Widgets";
import { Spotlight } from "./Spotlight";
import { HudAssistant, HudLauncher } from "./HudAssistant";
import { AccessibilityOverlays, OnScreenKeyboard } from "./AccessibilityOverlays";
import { PerfHUD } from "./PerfHUD";
import { FocusModeBanner } from "./FocusModeBanner";
import { BootSequence, ShutdownScreen } from "./BootSequence";
import { WALLPAPERS } from "@/os/wallpapers";
import { sfx } from "@/lib/sounds";


function PerfHudGate() {
  const on = useOS((s) => s.accessibility.perfHud);
  return on ? <PerfHUD /> : null;
}

export function OSRoot() {
  const loggedIn = useOS((s) => s.loggedIn);
  const bootComplete = useOS((s) => s.bootComplete);
  const setBootComplete = useOS((s) => s.setBootComplete);
  const shuttingDown = useOS((s) => s.shuttingDown);
  const locked = useOS((s) => s.locked);
  const windows = useOS((s) => s.windows);
  const activeDesktopId = useOS((s) => s.activeDesktopId);
  const settings = useOS((s) => s.settings);
  const quick = useOS((s) => s.quick);
  const notifications = useOS((s) => s.notifications);
  const notify = useOS((s) => s.notify);
  const openApp = useOS((s) => s.openApp);
  const tickProcesses = useOS((s) => s.tickProcesses);
  const minimizeWindow = useOS((s) => s.minimizeWindow);
  const focusWindow = useOS((s) => s.focusWindow);
  const cycleDesktop = useOS((s) => s.cycleDesktop);
  const captureScreenshot = useOS((s) => s.captureScreenshot);
  const [hydrated, setHydrated] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);

  const lastNotifId = useRef<string | null>(null);

  useEffect(() => setHydrated(true), []);

  // Toast on new notifications (respect DND)
  useEffect(() => {
    const latest = notifications[0];
    if (!latest) return;
    if (lastNotifId.current === latest.id) return;
    const first = lastNotifId.current === null;
    lastNotifId.current = latest.id;
    if (first) return;
    if (quick.doNotDisturb) return;
    toast(latest.title, { description: latest.message });
  }, [notifications, quick.doNotDisturb]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", `oklch(${settings.accent})`);
    root.style.setProperty("--accent", `oklch(${settings.accent})`);
    root.style.setProperty("--ring", `oklch(${settings.accent})`);
    root.style.fontSize = settings.largeText ? "18px" : "";
    // Gaming mode also implies animations off for perf.
    const animOn = settings.animationsEnabled && quick.focusMode !== "gaming";
    root.dataset.animations = animOn ? "on" : "off";
    root.dataset.focusMode = quick.focusMode;
  }, [settings.accent, settings.largeText, settings.animationsEnabled, quick.focusMode]);


  useEffect(() => {
    if (loggedIn) {
      const t = setTimeout(
        () =>
          notify({
            title: "Welcome to NEXUS",
            message: "Try right-clicking the desktop or running 'help' in Terminal.",
          }),
        800
      );
      return () => clearTimeout(t);
    }
  }, [loggedIn, notify]);

  // Process ticker
  useEffect(() => {
    if (!loggedIn) return;
    const t = setInterval(tickProcesses, 1500);
    return () => clearInterval(t);
  }, [loggedIn, tickProcesses]);

  // Global clipboard capture — listen for copy/cut anywhere in NEXUS
  useEffect(() => {
    if (!loggedIn) return;
    const onCopy = () => {
      const sel = window.getSelection()?.toString() ?? "";
      const text = sel.trim()
        ? sel
        : (document.activeElement as HTMLInputElement | HTMLTextAreaElement | null)
            ?.value?.toString
          ? (() => {
              const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
              const s = el.selectionStart ?? 0;
              const e = el.selectionEnd ?? 0;
              return s !== e ? el.value.slice(s, e) : "";
            })()
          : "";
      if (text && text.trim()) {
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        useOS.getState().copyToClipboard(text, tag || "selection");
      }
    };
    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCopy);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCopy);
    };
  }, [loggedIn]);


  // Keyboard shortcuts
  useEffect(() => {
    if (!loggedIn) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.altKey;
      // Screenshot: PrtSc or Ctrl+Shift+S
      if (e.key === "PrintScreen" || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s")) {
        e.preventDefault();
        captureScreenshot();
        return;
      }
      // Virtual desktop switching: Ctrl+Alt+Left/Right
      if (e.ctrlKey && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        cycleDesktop(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      // Spotlight: Ctrl+K or Alt+Space
      if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.altKey && e.code === "Space")) {
        e.preventDefault();
        setSpotlightOpen((v) => !v);
        return;
      }
      // Summon Nexus HUD: Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setHudOpen((v) => !v);
        return;
      }
      // Clipboard manager: Ctrl+Shift+V
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        openApp("clipboard");
        return;
      }


      if (e.ctrlKey && e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        openApp("taskmanager");
      } else if (meta && e.key.toLowerCase() === "e") {
        e.preventDefault();
        openApp("files");
      } else if (meta && e.key.toLowerCase() === "t") {
        e.preventDefault();
        openApp("terminal");
      } else if (meta && e.key.toLowerCase() === "r") {
        e.preventDefault();
        const cmd = prompt("Run command:");
        if (cmd) {
          if (["files", "notes", "terminal", "calculator", "settings", "taskmanager", "browser", "about", "media", "photos"].includes(cmd)) {
            openApp(cmd as never);
          } else {
            openApp("terminal");
          }
        }
      } else if (meta && e.key.toLowerCase() === "l") {
        e.preventDefault();
        useOS.getState().lock();
      } else if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        const open = windows.filter((w) => !w.minimized && w.desktopId === activeDesktopId);
        if (open.length < 2) return;
        const sorted = [...open].sort((a, b) => b.zIndex - a.zIndex);
        focusWindow(sorted[1].id);
      } else if (e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const top = [...windows]
          .filter((w) => w.desktopId === activeDesktopId)
          .sort((a, b) => b.zIndex - a.zIndex)[0];
        if (top) minimizeWindow(top.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loggedIn, openApp, windows, focusWindow, minimizeWindow, activeDesktopId, cycleDesktop, captureScreenshot]);

  if (!hydrated) return <div className="h-full w-full bg-background" />;

  if (!loggedIn || locked) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <LoginScreen />
      </div>
    );
  }

  const wp = WALLPAPERS.find((w) => w.id === settings.wallpaperId) ?? WALLPAPERS[0];

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: wp.gradient }}
      onClick={() => {
        if (notifOpen) setNotifOpen(false);
        if (menu) setMenu(null);
      }}
      onContextMenu={(e) => {
        // only when context-menuing the bare desktop (not a window)
        const t = e.target as HTMLElement;
        if (t.closest("[data-window]") || t.closest("[data-taskbar]")) return;
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${settings.wallpaperDim / 100})` }}
      />

      <DesktopIcons />
      <Widgets />

      {windows
        .filter((w) => w.desktopId === activeDesktopId)
        .map((win) => (
          <WindowFrame key={win.id} win={win}>
            <AppHost win={win} />
          </WindowFrame>
        ))}

      <StartMenu onOpenSpotlight={() => setSpotlightOpen(true)} />
      <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
      <Taskbar onToggleNotifications={() => setNotifOpen((v) => !v)} />
      <Spotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />

      <HudLauncher onClick={() => setHudOpen((v) => !v)} active={hudOpen} />
      {hudOpen && <HudAssistant onClose={() => setHudOpen(false)} />}

      {menu && <DesktopContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}

      <AccessibilityOverlays />
      <OnScreenKeyboard />
      <PerfHudGate />
      <FocusModeBanner />







      {/* Brightness overlay */}
      {quick.brightness < 100 && (
        <div
          className="pointer-events-none absolute inset-0 z-[9997] bg-black transition-opacity"
          style={{ opacity: (100 - quick.brightness) / 140 }}
        />
      )}

      {/* Night light overlay */}
      {quick.nightLight && (
        <div
          className="pointer-events-none absolute inset-0 z-[9997] mix-blend-multiply"
          style={{ background: "rgba(255, 170, 70, 0.22)" }}
        />
      )}

      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          className:
            "!bg-card/95 !backdrop-blur !border-glass-border !text-foreground !rounded-xl",
        }}
      />
    </div>
  );
}
