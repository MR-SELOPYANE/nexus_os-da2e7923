import {
  Calculator as CalcIcon,
  FileText,
  FolderOpen,
  Globe,
  Info,
  Settings as SettingsIcon,
  TerminalSquare,
  Activity,
  Sparkles,
  DownloadCloud,
  History,
  Wifi,
  CalendarDays,
  Music2,
  Image as ImageIcon,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "./store";


export interface AppMeta {
  id: AppId;
  name: string;
  icon: LucideIcon;
  /** tailwind classes for the icon tile gradient */
  tile: string;
  showOnDesktop?: boolean;
}

export const APPS: AppMeta[] = [
  { id: "files", name: "Files", icon: FolderOpen, tile: "from-sky-400 to-blue-600", showOnDesktop: true },
  { id: "terminal", name: "Terminal", icon: TerminalSquare, tile: "from-zinc-600 to-zinc-900", showOnDesktop: true },
  { id: "notes", name: "Notes", icon: FileText, tile: "from-amber-300 to-orange-500", showOnDesktop: true },
  { id: "calculator", name: "Calculator", icon: CalcIcon, tile: "from-emerald-400 to-teal-600", showOnDesktop: true },
  { id: "browser", name: "Browser", icon: Globe, tile: "from-cyan-400 to-indigo-600", showOnDesktop: true },
  { id: "media", name: "Media", icon: Music2, tile: "from-pink-500 to-purple-700", showOnDesktop: true },
  { id: "photos", name: "Photos", icon: ImageIcon, tile: "from-rose-400 to-amber-500", showOnDesktop: true },
  { id: "assistant", name: "Assistant", icon: Sparkles, tile: "from-fuchsia-400 to-purple-600", showOnDesktop: true },
  { id: "clock", name: "Clock", icon: CalendarDays, tile: "from-pink-400 to-rose-600" },
  { id: "network", name: "Network", icon: Wifi, tile: "from-sky-400 to-cyan-600" },
  { id: "update", name: "Update Manager", icon: DownloadCloud, tile: "from-blue-400 to-indigo-600" },
  { id: "recovery", name: "Recovery", icon: History, tile: "from-emerald-400 to-green-700" },
  { id: "settings", name: "Settings", icon: SettingsIcon, tile: "from-slate-400 to-slate-600" },
  { id: "taskmanager", name: "Task Manager", icon: Activity, tile: "from-rose-400 to-red-600" },
  { id: "about", name: "About", icon: Info, tile: "from-violet-400 to-purple-600" },
];

export const APP_MAP: Record<AppId, AppMeta> = APPS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AppId, AppMeta>
);

