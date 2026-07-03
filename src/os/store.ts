import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createInitialFS,
  type FolderNode,
  type FSNode,
  isFolder,
  normalizeParts,
  parentPath,
} from "./fs";

export type AppId =
  | "files"
  | "notes"
  | "terminal"
  | "calculator"
  | "settings"
  | "taskmanager"
  | "browser"
  | "about"
  | "assistant"
  | "update"
  | "recovery"
  | "network"
  | "clock"
  | "media"
  | "photos"
  | "recyclebin"
  | "clipboard"
  | "accessibility"
  | "recorder"
  | "appstore"
  | "codeeditor"
  | "maps"
  | "mail"
  | "contacts"
  | "imageeditor"
  | "pdf"
  | "firewall"
  | "ssh";


export interface Desktop {
  id: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  notes?: string;
}

export interface Alarm {
  id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
}

export interface TrashEntry {
  id: string;
  name: string;
  originalPath: string;
  deletedAt: number;
  node: FSNode;
}

export interface ClipEntry {
  id: string;
  text: string;
  time: number;
  source?: string;
  pinned?: boolean;
}

export type ColorBlindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export interface AccessibilityState {
  highContrast: boolean;
  colorBlind: ColorBlindMode;
  magnifier: boolean;
  magnifierZoom: number; // 1.5 - 4
  largeCursor: boolean;
  stickyKeys: boolean;
  perfHud: boolean;
  ttsRate: number; // 0.5 - 2
  onScreenKeyboard: boolean;
}



export type FocusMode = "off" | "focus" | "gaming";

export interface QuickSettings {
  doNotDisturb: boolean;
  nightLight: boolean;
  brightness: number; // 30-100
  volume: number; // 0-100
  widgetsVisible: boolean;
  focusMode: FocusMode;
}

export type WidgetId = "clock" | "weather" | "system" | "events" | "note";


export interface WindowState {
  id: string;
  pid: number;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  desktopId: string;
  payload?: Record<string, unknown>;
  prevRect?: { x: number; y: number; width: number; height: number };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: number;
  appId?: AppId;
}

export interface Process {
  pid: number;
  name: string;
  status: "running" | "sleeping";
  cpu: number;
  memory: number; // MB
  windowId?: string;
  appId?: AppId;
  system: boolean;
}

export interface LogEntry {
  id: string;
  time: number;
  level: "INFO" | "WARN" | "ERR";
  message: string;
}

export interface InstalledPackage {
  name: string;
  version: string;
}

export interface Settings {
  accent: string;
  wallpaperDim: number;
  username: string;
  reduceTransparency: boolean;
  wallpaperId: string;
  clock24h: boolean;
  largeText: boolean;
  animationsEnabled: boolean;
  taskbarPosition: "bottom" | "top";
  pinnedApps: AppId[];
  enabledWidgets: WidgetId[];
  stickyNote: string;
}


export interface WifiNetwork {
  ssid: string;
  signal: number; // 0-4
  secured: boolean;
}

export interface NetworkState {
  online: boolean;
  airplane: boolean;
  ssid: string | null;
  signal: number;
  scanning: boolean;
  networks: WifiNetwork[];
}

export interface UpdateInfo {
  version: string;
  size: string;
  notes: string[];
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "ready"
  | "uptodate";

export interface UpdateState {
  currentVersion: string;
  available: UpdateInfo | null;
  status: UpdateStatus;
  progress: number;
  lastChecked: number | null;
}

export interface RestorePoint {
  id: string;
  name: string;
  time: number;
  version: string;
  fsSnapshot: FolderNode;
  settings: Settings;
  packages: InstalledPackage[];
}

export interface Profile {
  id: string;
  name: string;
  color: string; // tailwind gradient classes for avatar
  role: "admin" | "standard";
  pin?: string;
  createdAt: number;
}

export interface ProfileSlice {
  fs: FolderNode;
  settings: Settings;
  packages: InstalledPackage[];
  events: CalendarEvent[];
  alarms: Alarm[];
  restorePoints: RestorePoint[];
  notifications: NotificationItem[];
  quick: QuickSettings;
}

interface OSState {
  bootComplete: boolean;
  loggedIn: boolean;
  locked: boolean;
  shuttingDown: null | "shutdown" | "restart";
  setBootComplete: (v: boolean) => void;
  login: () => void;
  logout: () => void;
  lock: () => void;
  shutdown: () => void;
  restart: () => void;
  cancelShutdown: () => void;

  windows: WindowState[];
  zCounter: number;
  startMenuOpen: boolean;
  toggleStartMenu: (v?: boolean) => void;

  openApp: (appId: AppId, payload?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string, screen: { w: number; h: number }) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number, x?: number, y?: number) => void;
  setWindowTitle: (id: string, title: string) => void;
  cycleWindow: () => void;
  snapWindow: (id: string, zone: SnapZone, screen: { w: number; h: number }) => void;

  fs: FolderNode;
  writeFile: (path: string, content: string) => void;
  createFolder: (path: string) => void;
  deleteNode: (path: string, opts?: { permanent?: boolean }) => void;
  renameNode: (path: string, newName: string) => void;

  // recycle bin
  trash: TrashEntry[];
  restoreFromTrash: (id: string) => void;
  permanentlyDeleteTrash: (id: string) => void;
  emptyTrash: () => void;


  notifications: NotificationItem[];
  notify: (n: Omit<NotificationItem, "id" | "time">) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // processes
  processes: Process[];
  tickProcesses: () => void;
  killProcess: (pid: number) => void;

  // logs
  logs: LogEntry[];
  log: (level: LogEntry["level"], message: string) => void;
  clearLogs: () => void;

  // packages
  packages: InstalledPackage[];
  installPackage: (p: InstalledPackage) => void;
  uninstallPackage: (name: string) => void;

  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSystem: (keepFiles?: boolean) => void;

  // network
  network: NetworkState;
  toggleAirplane: () => void;
  scanWifi: () => Promise<void>;
  connectWifi: (ssid: string) => void;
  disconnectWifi: () => void;

  // updates
  update: UpdateState;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  applyUpdate: () => void;

  // recovery
  restorePoints: RestorePoint[];
  createRestorePoint: (name: string) => void;
  restoreToPoint: (id: string) => void;
  deleteRestorePoint: (id: string) => void;

  // quick settings (action center)
  quick: QuickSettings;
  setQuick: (patch: Partial<QuickSettings>) => void;

  // calendar
  events: CalendarEvent[];
  addEvent: (e: Omit<CalendarEvent, "id">) => void;
  removeEvent: (id: string) => void;

  // alarms
  alarms: Alarm[];
  addAlarm: (a: Omit<Alarm, "id">) => void;
  toggleAlarm: (id: string) => void;
  removeAlarm: (id: string) => void;

  // profiles (multi-user)
  profiles: Profile[];
  activeProfileId: string;
  profileData: Record<string, ProfileSlice>;
  addProfile: (p: Omit<Profile, "id" | "createdAt">) => string;
  removeProfile: (id: string) => void;
  updateProfile: (id: string, patch: Partial<Omit<Profile, "id" | "createdAt">>) => void;
  switchProfile: (id: string, pin?: string) => boolean;

  // virtual desktops
  desktops: Desktop[];
  activeDesktopId: string;
  addDesktop: () => string;
  removeDesktop: (id: string) => void;
  switchDesktop: (id: string) => void;
  cycleDesktop: (dir: 1 | -1) => void;
  moveWindowToDesktop: (windowId: string, desktopId: string) => void;

  // audio mixer (per-app volume 0-100)
  appVolumes: Record<string, number>;
  setAppVolume: (appId: AppId, value: number) => void;

  // screenshots
  captureScreenshot: () => void;

  // clipboard manager
  clipboard: ClipEntry[];
  copyToClipboard: (text: string, source?: string) => void;
  pasteClip: (id: string) => string | null;
  removeClip: (id: string) => void;
  pinClip: (id: string) => void;
  clearClipboard: () => void;

  // accessibility
  accessibility: AccessibilityState;
  setAccessibility: (patch: Partial<AccessibilityState>) => void;
}

export type SnapZone = "left" | "right" | "top" | "tl" | "tr" | "bl" | "br";

const APP_TITLES: Record<AppId, string> = {
  files: "Files",
  notes: "Notes",
  terminal: "Terminal",
  calculator: "Calculator",
  settings: "Settings",
  taskmanager: "Task Manager",
  browser: "Nexus Browser",
  about: "About NEXUS",
  assistant: "Nexus Assistant",
  update: "Update Manager",
  recovery: "Recovery",
  network: "Network",
  clock: "Clock & Calendar",
  media: "Media Player",
  photos: "Photos",
  recyclebin: "Recycle Bin",
  clipboard: "Clipboard Manager",
  accessibility: "Accessibility",
  recorder: "Screen Recorder",
  appstore: "App Store",
  codeeditor: "Code Editor",
  maps: "Maps",
  mail: "Mail",
  contacts: "Contacts",
  imageeditor: "Image Editor",
  pdf: "PDF Viewer",
  firewall: "Firewall",
  ssh: "SSH Terminal",
};

const DEFAULT_SIZE: Record<AppId, { w: number; h: number }> = {
  files: { w: 760, h: 500 },
  notes: { w: 620, h: 480 },
  terminal: { w: 680, h: 420 },
  calculator: { w: 320, h: 460 },
  settings: { w: 820, h: 580 },
  taskmanager: { w: 600, h: 460 },
  browser: { w: 820, h: 560 },
  about: { w: 460, h: 420 },
  assistant: { w: 520, h: 600 },
  update: { w: 560, h: 520 },
  recovery: { w: 600, h: 500 },
  network: { w: 520, h: 480 },
  clock: { w: 620, h: 520 },
  media: { w: 640, h: 520 },
  photos: { w: 760, h: 540 },
  recyclebin: { w: 680, h: 480 },
  clipboard: { w: 560, h: 520 },
  accessibility: { w: 640, h: 580 },
  recorder: { w: 540, h: 460 },
  appstore: { w: 820, h: 600 },
  codeeditor: { w: 860, h: 580 },
  maps: { w: 820, h: 560 },
  mail: { w: 820, h: 560 },
  contacts: { w: 620, h: 520 },
  imageeditor: { w: 780, h: 560 },
  pdf: { w: 720, h: 620 },
  firewall: { w: 640, h: 520 },
  ssh: { w: 720, h: 460 },
};

const DEFAULT_PINNED: AppId[] = [
  "files", "browser", "assistant", "notes", "terminal", "media", "photos", "settings",
];
const DEFAULT_WIDGETS: WidgetId[] = ["clock", "weather", "system", "events"];

const DEFAULT_SETTINGS: Settings = {
  accent: "0.72 0.13 195",
  wallpaperDim: 20,
  username: "guest",
  reduceTransparency: false,
  wallpaperId: "dusk",
  clock24h: false,
  largeText: false,
  animationsEnabled: true,
  taskbarPosition: "bottom",
  pinnedApps: DEFAULT_PINNED,
  enabledWidgets: DEFAULT_WIDGETS,
  stickyNote: "",
};

const DEFAULT_QUICK: QuickSettings = {
  doNotDisturb: false,
  nightLight: false,
  brightness: 100,
  volume: 70,
  widgetsVisible: true,
  focusMode: "off",
};


const SYSTEM_PROCESSES: Omit<Process, "cpu" | "memory">[] = [
  { pid: 1, name: "nexus-kernel", status: "running", system: true },
  { pid: 2, name: "window-server", status: "running", system: true },
  { pid: 3, name: "fs-daemon", status: "sleeping", system: true },
  { pid: 4, name: "notification-hub", status: "sleeping", system: true },
  { pid: 5, name: "nexus-shell", status: "running", system: true },
];

let idSeq = 0;
const uid = () => `w${Date.now().toString(36)}${(idSeq++).toString(36)}`;
let pidSeq = 100;
const nextPid = () => ++pidSeq;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function ensureFolder(root: FolderNode, parts: string[]): FolderNode {
  let node: FolderNode = root;
  for (const part of parts) {
    const child = node.children[part];
    if (child && isFolder(child)) {
      node = child;
    } else {
      const created: FolderNode = { type: "folder", children: {}, modified: Date.now() };
      node.children[part] = created;
      node = created;
    }
  }
  return node;
}

const seededRand = (seed: number) => Math.abs(Math.sin(seed * 12.9898 + Date.now() * 0.00001));

function initialProcesses(): Process[] {
  return SYSTEM_PROCESSES.map((p, i) => ({
    ...p,
    cpu: +(1 + seededRand(i) * 2).toFixed(1),
    memory: Math.floor(40 + seededRand(i + 7) * 80),
  }));
}

const TASKBAR_H = 64;

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      bootComplete: false,
      loggedIn: false,
      locked: false,
      shuttingDown: null,
      setBootComplete: (v) => set({ bootComplete: v }),
      login: () => {
        set({ loggedIn: true, locked: false });
        get().log("INFO", "User signed in");
      },
      lock: () => {
        set({ locked: true, startMenuOpen: false });
        get().log("INFO", "Session locked");
      },
      logout: () => {
        set({ loggedIn: false, locked: false, windows: [], startMenuOpen: false });
        get().log("INFO", "User signed out");
        set({ processes: initialProcesses() });
      },
      shutdown: () => {
        get().log("INFO", "Shutting down…");
        set({ shuttingDown: "shutdown" });
      },
      restart: () => {
        get().log("INFO", "Restarting…");
        set({ shuttingDown: "restart" });
      },
      cancelShutdown: () => {
        set({
          shuttingDown: null,
          loggedIn: false,
          locked: false,
          windows: [],
          startMenuOpen: false,
          bootComplete: false,
          processes: initialProcesses(),
        });
      },

      windows: [],
      zCounter: 10,
      startMenuOpen: false,
      toggleStartMenu: (v) =>
        set((s) => ({ startMenuOpen: v === undefined ? !s.startMenuOpen : v })),

      openApp: (appId, payload) => {
        const s = get();
        const existing = s.windows.find(
          (w) =>
            w.appId === appId &&
            JSON.stringify(w.payload ?? {}) === JSON.stringify(payload ?? {})
        );
        const z = s.zCounter + 1;
        if (existing) {
          set({
            startMenuOpen: false,
            zCounter: z,
            windows: s.windows.map((w) =>
              w.id === existing.id ? { ...w, zIndex: z, minimized: false } : w
            ),
          });
          return;
        }
        const size = DEFAULT_SIZE[appId];
        const offset = (s.windows.length % 6) * 28;
        const pid = nextPid();
        const win: WindowState = {
          id: uid(),
          pid,
          appId,
          title: APP_TITLES[appId],
          x: 120 + offset,
          y: 80 + offset,
          width: size.w,
          height: size.h,
          zIndex: z,
          minimized: false,
          maximized: false,
          desktopId: s.activeDesktopId,
          payload,
        };
        const proc: Process = {
          pid,
          name: APP_TITLES[appId],
          status: "running",
          cpu: +(seededRand(pid) * 8 + 1).toFixed(1),
          memory: Math.floor(80 + seededRand(pid + 1) * 240),
          windowId: win.id,
          appId,
          system: false,
        };
        set({
          startMenuOpen: false,
          zCounter: z,
          windows: [...s.windows, win],
          processes: [...s.processes, proc],
        });
        get().log("INFO", `${APP_TITLES[appId]} launched (pid ${pid})`);
      },

      closeWindow: (id) => {
        const w = get().windows.find((x) => x.id === id);
        set((s) => ({
          windows: s.windows.filter((x) => x.id !== id),
          processes: s.processes.filter((p) => p.windowId !== id),
        }));
        if (w) get().log("INFO", `${APP_TITLES[w.appId]} closed (pid ${w.pid})`);
      },

      focusWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, zIndex: z, minimized: false } : w
            ),
          };
        }),

      minimizeWindow: (id) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
        })),

      toggleMaximize: (id, screen) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            windows: s.windows.map((w) => {
              if (w.id !== id) return w;
              if (w.maximized) {
                const r = w.prevRect ?? { x: 120, y: 80, width: 700, height: 480 };
                return { ...w, maximized: false, zIndex: z, ...r };
              }
              return {
                ...w,
                maximized: true,
                zIndex: z,
                prevRect: { x: w.x, y: w.y, width: w.width, height: w.height },
                x: 0,
                y: 0,
                width: screen.w,
                height: screen.h,
              };
            }),
          };
        }),

      restoreWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, minimized: false, zIndex: z } : w
            ),
          };
        }),

      moveWindow: (id, x, y) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),

      resizeWindow: (id, width, height, x, y) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, width, height, x: x ?? w.x, y: y ?? w.y } : w
          ),
        })),

      setWindowTitle: (id, title) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)),
        })),

      cycleWindow: () => {
        const s = get();
        const open = s.windows.filter((w) => !w.minimized).sort((a, b) => a.zIndex - b.zIndex);
        if (open.length < 2) return;
        get().focusWindow(open[0].id);
      },

      snapWindow: (id, zone, screen) => {
        const sw = screen.w;
        const sh = screen.h;
        const half = Math.floor(sw / 2);
        const halfH = Math.floor(sh / 2);
        let x = 0, y = 0, w = sw, h = sh;
        switch (zone) {
          case "left": x = 0; y = 0; w = half; h = sh; break;
          case "right": x = half; y = 0; w = sw - half; h = sh; break;
          case "top": x = 0; y = 0; w = sw; h = sh; break;
          case "tl": x = 0; y = 0; w = half; h = halfH; break;
          case "tr": x = half; y = 0; w = sw - half; h = halfH; break;
          case "bl": x = 0; y = halfH; w = half; h = sh - halfH; break;
          case "br": x = half; y = halfH; w = sw - half; h = sh - halfH; break;
        }
        set((s) => ({
          windows: s.windows.map((win) =>
            win.id === id
              ? {
                  ...win,
                  prevRect: win.prevRect ?? {
                    x: win.x,
                    y: win.y,
                    width: win.width,
                    height: win.height,
                  },
                  x, y, width: w, height: h, maximized: zone === "top",
                }
              : win
          ),
        }));
      },

      fs: createInitialFS(),

      writeFile: (path, content) =>
        set((s) => {
          const root = clone(s.fs);
          const parts = normalizeParts(path);
          const name = parts.pop();
          if (!name) return {};
          const dir = ensureFolder(root, parts);
          dir.children[name] = { type: "file", content, modified: Date.now() };
          return { fs: root };
        }),

      createFolder: (path) =>
        set((s) => {
          const root = clone(s.fs);
          ensureFolder(root, normalizeParts(path));
          return { fs: root };
        }),

      deleteNode: (path, opts) =>
        set((s) => {
          const root = clone(s.fs);
          const parts = normalizeParts(path);
          const name = parts.pop();
          if (!name) return {};
          // Prevent recycling things that already live in the trash
          const inTrash = parts[0] === "home" && parts[1] === ".Trash";
          const parent = ensureFolder(root, parts);
          const node = parent.children[name];
          if (!node) return {};
          delete parent.children[name];
          if (opts?.permanent || inTrash) {
            return { fs: root };
          }
          const entry: TrashEntry = {
            id: uid(),
            name,
            originalPath: "/" + [...parts, name].join("/"),
            deletedAt: Date.now(),
            node: clone(node),
          };
          return { fs: root, trash: [entry, ...s.trash] };
        }),

      trash: [],
      restoreFromTrash: (id) =>
        set((s) => {
          const entry = s.trash.find((t) => t.id === id);
          if (!entry) return {};
          const root = clone(s.fs);
          const parts = normalizeParts(entry.originalPath);
          const name = parts.pop()!;
          const dir = ensureFolder(root, parts);
          let finalName = name;
          let n = 1;
          while (dir.children[finalName]) {
            const dot = name.lastIndexOf(".");
            finalName =
              dot > 0
                ? `${name.slice(0, dot)} (${n})${name.slice(dot)}`
                : `${name} (${n})`;
            n++;
          }
          dir.children[finalName] = clone(entry.node);
          return { fs: root, trash: s.trash.filter((t) => t.id !== id) };
        }),
      permanentlyDeleteTrash: (id) =>
        set((s) => ({ trash: s.trash.filter((t) => t.id !== id) })),
      emptyTrash: () => set({ trash: [] }),




      renameNode: (path, newName) =>
        set((s) => {
          const root = clone(s.fs);
          const parts = normalizeParts(path);
          const name = parts.pop();
          if (!name) return {};
          const parent = ensureFolder(root, parts);
          const node: FSNode | undefined = parent.children[name];
          if (!node) return {};
          delete parent.children[name];
          parent.children[newName] = node;
          return { fs: root };
        }),

      notifications: [],
      notify: (n) => {
        const q = get().quick;
        if (!q.doNotDisturb) {
          set((s) => ({
            notifications: [{ ...n, id: uid(), time: Date.now() }, ...s.notifications].slice(0, 30),
          }));
        }
        get().log("INFO", `notify: ${n.title}`);
      },
      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      clearNotifications: () => set({ notifications: [] }),

      processes: initialProcesses(),
      tickProcesses: () =>
        set((s) => ({
          processes: s.processes.map((p) => ({
            ...p,
            cpu: +(Math.max(
              0.1,
              p.system
                ? 0.5 + seededRand(p.pid) * 3
                : seededRand(p.pid) * 14
            ).toFixed(1)),
            memory: Math.max(
              16,
              Math.floor(p.memory + (seededRand(p.pid + 3) - 0.5) * 30)
            ),
          })),
        })),
      killProcess: (pid) => {
        const s = get();
        const p = s.processes.find((x) => x.pid === pid);
        if (!p || p.system) return;
        if (p.windowId) {
          get().closeWindow(p.windowId);
        } else {
          set({ processes: s.processes.filter((x) => x.pid !== pid) });
        }
      },

      logs: [],
      log: (level, message) =>
        set((s) => ({
          logs: [
            ...s.logs,
            { id: uid(), time: Date.now(), level, message },
          ].slice(-200),
        })),
      clearLogs: () => set({ logs: [] }),

      packages: [
        { name: "nexus-core", version: "1.0.0" },
        { name: "notes", version: "1.0.0" },
        { name: "browser", version: "1.0.0" },
      ],
      installPackage: (p) => {
        set((s) => ({ packages: [...s.packages, p] }));
        get().notify({ title: "Package installed", message: `${p.name} v${p.version}` });
        get().log("INFO", `pkg install ${p.name}`);
      },
      uninstallPackage: (name) => {
        set((s) => ({ packages: s.packages.filter((p) => p.name !== name) }));
        get().log("INFO", `pkg uninstall ${name}`);
      },

      settings: { ...DEFAULT_SETTINGS },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetSystem: (keepFiles = false) =>
        set((s) => ({
          fs: keepFiles ? s.fs : createInitialFS(),
          windows: [],
          notifications: [],
          logs: [],
          processes: initialProcesses(),
          packages: keepFiles
            ? s.packages
            : [{ name: "nexus-core", version: "1.0.0" }],
          settings: {
            ...DEFAULT_SETTINGS,
            username: keepFiles ? s.settings.username : "guest",
          },

          restorePoints: keepFiles ? s.restorePoints : [],
        })),

      // ----- network -----
      network: {
        online: true,
        airplane: false,
        ssid: "Nexus-Home",
        signal: 4,
        scanning: false,
        networks: [
          { ssid: "Nexus-Home", signal: 4, secured: true },
          { ssid: "CloudCafe Guest", signal: 3, secured: false },
          { ssid: "FiberNet 5G", signal: 3, secured: true },
          { ssid: "NeighborNet", signal: 2, secured: true },
          { ssid: "xfinitywifi", signal: 1, secured: false },
        ],
      },
      toggleAirplane: () => {
        const a = !get().network.airplane;
        set((s) => ({
          network: { ...s.network, airplane: a, online: !a && !!s.network.ssid, ssid: a ? null : s.network.ssid },
        }));
        get().notify({ title: "Network", message: a ? "Airplane mode on" : "Airplane mode off" });
        get().log("INFO", `airplane mode ${a ? "on" : "off"}`);
      },
      scanWifi: async () => {
        if (get().network.airplane) return;
        set((s) => ({ network: { ...s.network, scanning: true } }));
        await new Promise((r) => setTimeout(r, 900));
        set((s) => ({ network: { ...s.network, scanning: false } }));
        get().log("INFO", "wifi scan complete");
      },
      connectWifi: (ssid) => {
        const n = get().network.networks.find((x) => x.ssid === ssid);
        if (!n) return;
        set((s) => ({
          network: { ...s.network, ssid, signal: n.signal, online: !s.network.airplane },
        }));
        get().notify({ title: "Wi-Fi", message: `Connected to ${ssid}` });
        get().log("INFO", `wifi connected: ${ssid}`);
      },
      disconnectWifi: () => {
        set((s) => ({ network: { ...s.network, ssid: null, online: false, signal: 0 } }));
        get().log("INFO", "wifi disconnected");
      },

      // ----- updates -----
      update: {
        currentVersion: "1.0.0",
        available: null,
        status: "idle",
        progress: 0,
        lastChecked: null,
      },
      checkForUpdates: async () => {
        set((s) => ({ update: { ...s.update, status: "checking", progress: 0 } }));
        await new Promise((r) => setTimeout(r, 1200));
        const cur = get().update.currentVersion;
        if (cur === "2.1.0") {
          set((s) => ({ update: { ...s.update, status: "uptodate", lastChecked: Date.now() } }));
          get().notify({ title: "Updates", message: "NEXUS is up to date." });
          return;
        }
        const info: UpdateInfo = {
          version: "2.1.0",
          size: "284 MB",
          notes: [
            "Redesigned glassy window chrome",
            "Faster terminal renderer & new commands",
            "Nexus Assistant (AI) is now built-in",
            "Wi-Fi panel with airplane mode",
            "System Restore points & one-click recovery",
            "Stability and security fixes",
          ],
        };
        set((s) => ({
          update: { ...s.update, status: "available", available: info, lastChecked: Date.now() },
        }));
        get().notify({ title: "NEXUS 2.1 available", message: `${info.size} — ready to download.` });
      },
      installUpdate: async () => {
        const info = get().update.available;
        if (!info) return;
        // Download
        set((s) => ({ update: { ...s.update, status: "downloading", progress: 0 } }));
        for (let p = 0; p <= 100; p += 4) {
          await new Promise((r) => setTimeout(r, 60));
          set((s) => ({ update: { ...s.update, progress: p } }));
        }
        // Install
        set((s) => ({ update: { ...s.update, status: "installing", progress: 0 } }));
        for (let p = 0; p <= 100; p += 5) {
          await new Promise((r) => setTimeout(r, 80));
          set((s) => ({ update: { ...s.update, progress: p } }));
        }
        set((s) => ({ update: { ...s.update, status: "ready", progress: 100 } }));
        get().notify({ title: "Restart required", message: `NEXUS ${info.version} is ready to install.` });
      },
      applyUpdate: () => {
        const info = get().update.available;
        if (!info) return;
        set((s) => ({
          update: {
            currentVersion: info.version,
            available: null,
            status: "idle",
            progress: 0,
            lastChecked: Date.now(),
          },
          bootComplete: false,
          loggedIn: false,
          windows: [],
        }));
        get().log("INFO", `system updated to ${info.version}`);
      },

      // ----- recovery -----
      restorePoints: [],
      createRestorePoint: (name) => {
        const s = get();
        const point: RestorePoint = {
          id: uid(),
          name: name || `Restore point ${s.restorePoints.length + 1}`,
          time: Date.now(),
          version: s.update.currentVersion,
          fsSnapshot: clone(s.fs),
          settings: { ...s.settings },
          packages: [...s.packages],
        };
        set((st) => ({ restorePoints: [point, ...st.restorePoints].slice(0, 10) }));
        get().notify({ title: "Recovery", message: `Created restore point "${point.name}"` });
        get().log("INFO", `restore point created: ${point.name}`);
      },
      restoreToPoint: (id) => {
        const p = get().restorePoints.find((x) => x.id === id);
        if (!p) return;
        set({
          fs: clone(p.fsSnapshot),
          settings: { ...p.settings },
          packages: [...p.packages],
          windows: [],
          processes: initialProcesses(),
        });
        get().notify({ title: "Recovery", message: `Restored "${p.name}"` });
        get().log("INFO", `restored to: ${p.name}`);
      },
      deleteRestorePoint: (id) =>
        set((s) => ({ restorePoints: s.restorePoints.filter((p) => p.id !== id) })),

      // ----- quick settings -----
      quick: { ...DEFAULT_QUICK },

      setQuick: (patch) =>
        set((s) => {
          const next = { ...s.quick, ...patch };
          // Focus/Gaming mode implies Do Not Disturb
          if (patch.focusMode !== undefined) {
            next.doNotDisturb = patch.focusMode !== "off" ? true : s.quick.doNotDisturb;
          }
          return { quick: next };
        }),


      // ----- calendar -----
      events: [],
      addEvent: (e) =>
        set((s) => ({ events: [...s.events, { ...e, id: uid() }] })),
      removeEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      // ----- alarms -----
      alarms: [],
      addAlarm: (a) => set((s) => ({ alarms: [...s.alarms, { ...a, id: uid() }] })),
      toggleAlarm: (id) =>
        set((s) => ({
          alarms: s.alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
        })),
      removeAlarm: (id) => set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) })),

      // ----- profiles -----
      profiles: [
        {
          id: "guest",
          name: "Guest",
          color: "from-primary to-cyan-600",
          role: "admin",
          createdAt: Date.now(),
        },
      ],
      activeProfileId: "guest",
      profileData: {},
      addProfile: (p) => {
        const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const profile: Profile = { ...p, id, createdAt: Date.now() };
        set((s) => ({ profiles: [...s.profiles, profile] }));
        get().log("INFO", `account created: ${p.name}`);
        return id;
      },
      removeProfile: (id) => {
        const s = get();
        if (id === s.activeProfileId) return;
        if (s.profiles.length <= 1) return;
        const rest = { ...s.profileData };
        delete rest[id];
        set({ profiles: s.profiles.filter((p) => p.id !== id), profileData: rest });
        get().log("INFO", `account removed: ${id}`);
      },
      updateProfile: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      switchProfile: (id, pin) => {
        const s = get();
        const target = s.profiles.find((p) => p.id === id);
        if (!target) return false;
        if (target.pin && target.pin !== pin) return false;
        // snapshot current
        const snapshot: ProfileSlice = {
          fs: clone(s.fs),
          settings: { ...s.settings },
          packages: [...s.packages],
          events: [...s.events],
          alarms: [...s.alarms],
          restorePoints: [...s.restorePoints],
          notifications: [...s.notifications],
          quick: { ...s.quick },
        };
        const nextData = { ...s.profileData, [s.activeProfileId]: snapshot };
        const loaded = nextData[id];
        if (loaded) {
          set({
            activeProfileId: id,
            profileData: nextData,
            fs: clone(loaded.fs),
            settings: { ...loaded.settings, username: target.name },
            packages: [...loaded.packages],
            events: [...loaded.events],
            alarms: [...loaded.alarms],
            restorePoints: [...loaded.restorePoints],
            notifications: [...loaded.notifications],
            quick: { ...loaded.quick },
            windows: [],
            processes: initialProcesses(),
          });
        } else {
          // fresh slice
          set({
            activeProfileId: id,
            profileData: nextData,
            fs: createInitialFS(),
            settings: { ...DEFAULT_SETTINGS, username: target.name },
            packages: [{ name: "nexus-core", version: "1.0.0" }],
            events: [],
            alarms: [],
            restorePoints: [],
            notifications: [],
            quick: { ...DEFAULT_QUICK },

            windows: [],
            processes: initialProcesses(),
          });
        }
        get().log("INFO", `switched to account: ${target.name}`);
        return true;
      },

      // ----- virtual desktops -----
      desktops: [
        { id: "d1", name: "Desktop 1" },
        { id: "d2", name: "Desktop 2" },
      ],
      activeDesktopId: "d1",
      addDesktop: () => {
        const id = `d${Date.now().toString(36)}`;
        set((s) => ({
          desktops: [...s.desktops, { id, name: `Desktop ${s.desktops.length + 1}` }],
        }));
        return id;
      },
      removeDesktop: (id) => {
        const s = get();
        if (s.desktops.length <= 1) return;
        const fallback = s.desktops.find((d) => d.id !== id)?.id ?? s.activeDesktopId;
        set({
          desktops: s.desktops.filter((d) => d.id !== id),
          activeDesktopId: s.activeDesktopId === id ? fallback : s.activeDesktopId,
          windows: s.windows.map((w) =>
            w.desktopId === id ? { ...w, desktopId: fallback } : w
          ),
        });
      },
      switchDesktop: (id) => {
        if (!get().desktops.find((d) => d.id === id)) return;
        set({ activeDesktopId: id, startMenuOpen: false });
      },
      cycleDesktop: (dir) => {
        const s = get();
        const idx = s.desktops.findIndex((d) => d.id === s.activeDesktopId);
        if (idx === -1) return;
        const next = s.desktops[(idx + dir + s.desktops.length) % s.desktops.length];
        set({ activeDesktopId: next.id });
      },
      moveWindowToDesktop: (windowId, desktopId) =>
        set((s) => ({
          windows: s.windows.map((w) =>
            w.id === windowId ? { ...w, desktopId } : w
          ),
        })),

      // ----- audio mixer -----
      appVolumes: {},
      setAppVolume: (appId, value) =>
        set((s) => ({ appVolumes: { ...s.appVolumes, [appId]: value } })),

      // ----- screenshots -----
      captureScreenshot: () => {
        const s = get();
        const ts = new Date();
        const stamp = ts.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const name = `screenshot-${stamp}.svg`;
        const W = 1280;
        const H = 800;
        const wins = s.windows
          .filter((w) => !w.minimized && w.desktopId === s.activeDesktopId)
          .slice(-6);
        const winRects = wins
          .map((w, i) => {
            const x = Math.max(0, Math.min(W - 200, Math.round((w.x / window.innerWidth) * W)));
            const y = Math.max(0, Math.min(H - 120, Math.round((w.y / window.innerHeight) * H)));
            const ww = Math.min(W - x, Math.round((w.width / window.innerWidth) * W));
            const wh = Math.min(H - y, Math.round((w.height / window.innerHeight) * H));
            return `<g><rect x="${x}" y="${y}" width="${ww}" height="${wh}" rx="14" fill="rgba(20,28,46,0.78)" stroke="rgba(255,255,255,0.18)"/><rect x="${x}" y="${y}" width="${ww}" height="28" rx="14" fill="rgba(255,255,255,0.06)"/><text x="${x + 14}" y="${y + 19}" font-family="ui-sans-serif,system-ui" font-size="13" fill="#cbd5f5">${w.title}</text></g>`;
          })
          .join("");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="50%" stop-color="#312e81"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${winRects}<text x="${W - 24}" y="${H - 24}" text-anchor="end" font-family="ui-sans-serif,system-ui" font-size="14" fill="rgba(255,255,255,0.55)">NEXUS · ${ts.toLocaleString()}</text></svg>`;
        const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        get().writeFile(`/home/Pictures/${name}`, dataUri);
        get().notify({
          title: "Screenshot saved",
          message: `Pictures/${name}`,
          appId: "photos",
        });
      },

      // ----- clipboard manager -----
      clipboard: [],
      copyToClipboard: (text, source) => {
        const trimmed = text?.toString() ?? "";
        if (!trimmed.trim()) return;
        set((s) => {
          const existing = s.clipboard.find((c) => c.text === trimmed);
          if (existing) {
            return {
              clipboard: [
                { ...existing, time: Date.now(), source: source ?? existing.source },
                ...s.clipboard.filter((c) => c.id !== existing.id),
              ],
            };
          }
          const entry: ClipEntry = {
            id: `clip${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            text: trimmed,
            time: Date.now(),
            source,
          };
          const pinned = s.clipboard.filter((c) => c.pinned);
          const unpinned = s.clipboard.filter((c) => !c.pinned).slice(0, 49);
          return { clipboard: [entry, ...pinned, ...unpinned] };
        });
      },
      pasteClip: (id) => {
        const entry = get().clipboard.find((c) => c.id === id);
        if (!entry) return null;
        try {
          navigator.clipboard?.writeText(entry.text).catch(() => {});
        } catch {
          /* ignore */
        }
        set((s) => ({
          clipboard: [
            { ...entry, time: Date.now() },
            ...s.clipboard.filter((c) => c.id !== id),
          ],
        }));
        return entry.text;
      },
      removeClip: (id) =>
        set((s) => ({ clipboard: s.clipboard.filter((c) => c.id !== id) })),
      pinClip: (id) =>
        set((s) => ({
          clipboard: s.clipboard.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c
          ),
        })),
      clearClipboard: () =>
        set((s) => ({ clipboard: s.clipboard.filter((c) => c.pinned) })),

      // ----- accessibility -----
      accessibility: {
        highContrast: false,
        colorBlind: "none",
        magnifier: false,
        magnifierZoom: 2,
        largeCursor: false,
        stickyKeys: false,
        perfHud: false,
        ttsRate: 1,
        onScreenKeyboard: false,
      },
      setAccessibility: (patch) =>
        set((s) => ({ accessibility: { ...s.accessibility, ...patch } })),
    }),
    {
      name: "nexus-os-v7",
      version: 2,
      migrate: (persisted: unknown, _version: number) => {
        const p = (persisted as { settings?: Partial<Settings>; quick?: Partial<QuickSettings> } | null) ?? {};
        const s = p.settings ?? {};
        const q = p.quick ?? {};
        return {
          ...(persisted as object),
          settings: {
            ...DEFAULT_SETTINGS,
            ...s,
            pinnedApps: s.pinnedApps ?? DEFAULT_SETTINGS.pinnedApps,
            enabledWidgets: s.enabledWidgets ?? DEFAULT_SETTINGS.enabledWidgets,
            stickyNote: s.stickyNote ?? "",
          },
          quick: {
            ...DEFAULT_QUICK,
            ...q,
            focusMode: q.focusMode ?? "off",
          },
        };
      },
      partialize: (s) => ({
        fs: s.fs,
        settings: s.settings,
        notifications: s.notifications,
        packages: s.packages,
        logs: s.logs,
        network: s.network,
        update: s.update,
        restorePoints: s.restorePoints,
        quick: s.quick,
        events: s.events,
        alarms: s.alarms,
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        profileData: s.profileData,
        desktops: s.desktops,
        activeDesktopId: s.activeDesktopId,
        appVolumes: s.appVolumes,
        trash: s.trash,
        clipboard: s.clipboard,
        accessibility: s.accessibility,
      }),
    }

  )
);

export { APP_TITLES, parentPath, TASKBAR_H };
