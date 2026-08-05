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
  Clipboard as ClipboardIcon,
  Accessibility as A11yIcon,
  Video,
  Store,
  Code2,
  MapPin,
  Mail as MailIcon,
  Users,
  Paintbrush,
  FileType2,
  Shield,
  ServerCog,
  GraduationCap,
  Landmark,
  Siren,
  ShieldCheck,
  Cloud,
  BookOpen,
  CloudSun,
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
  { id: "codeeditor", name: "Code Editor", icon: Code2, tile: "from-sky-500 to-indigo-700", showOnDesktop: true },
  { id: "calculator", name: "Calculator", icon: CalcIcon, tile: "from-emerald-400 to-teal-600", showOnDesktop: true },
  { id: "browser", name: "Browser", icon: Globe, tile: "from-cyan-400 to-indigo-600", showOnDesktop: true },
  { id: "mail", name: "Mail", icon: MailIcon, tile: "from-blue-500 to-cyan-600", showOnDesktop: true },
  { id: "maps", name: "Maps", icon: MapPin, tile: "from-green-500 to-emerald-700", showOnDesktop: true },
  { id: "contacts", name: "Contacts", icon: Users, tile: "from-orange-400 to-rose-600", showOnDesktop: true },
  { id: "media", name: "Media", icon: Music2, tile: "from-pink-500 to-purple-700", showOnDesktop: true },
  { id: "photos", name: "Photos", icon: ImageIcon, tile: "from-rose-400 to-amber-500", showOnDesktop: true },
  { id: "imageeditor", name: "Image Editor", icon: Paintbrush, tile: "from-fuchsia-500 to-pink-700", showOnDesktop: true },
  { id: "pdf", name: "PDF Viewer", icon: FileType2, tile: "from-red-500 to-rose-700", showOnDesktop: true },
  { id: "assistant", name: "Assistant", icon: Sparkles, tile: "from-fuchsia-400 to-purple-600", showOnDesktop: true },
  { id: "recyclebin", name: "Recycle Bin", icon: Trash2, tile: "from-slate-500 to-zinc-700", showOnDesktop: true },
  { id: "clipboard", name: "Clipboard", icon: ClipboardIcon, tile: "from-teal-400 to-emerald-600" },
  { id: "appstore", name: "App Store", icon: Store, tile: "from-indigo-400 to-purple-600", showOnDesktop: true },
  { id: "recorder", name: "Recorder", icon: Video, tile: "from-red-500 to-rose-700" },
  { id: "firewall", name: "Firewall", icon: Shield, tile: "from-orange-500 to-red-700" },
  { id: "ssh", name: "SSH", icon: ServerCog, tile: "from-slate-600 to-slate-900" },
  { id: "accessibility", name: "Accessibility", icon: A11yIcon, tile: "from-sky-400 to-blue-700" },
  { id: "clock", name: "Clock", icon: CalendarDays, tile: "from-pink-400 to-rose-600" },
  { id: "network", name: "Network", icon: Wifi, tile: "from-sky-400 to-cyan-600" },
  { id: "update", name: "Update Manager", icon: DownloadCloud, tile: "from-blue-400 to-indigo-600" },
  { id: "recovery", name: "Recovery", icon: History, tile: "from-emerald-400 to-green-700" },
  { id: "settings", name: "Settings", icon: SettingsIcon, tile: "from-slate-400 to-slate-600" },
  { id: "taskmanager", name: "Task Manager", icon: Activity, tile: "from-rose-400 to-red-600" },
  { id: "about", name: "About", icon: Info, tile: "from-violet-400 to-purple-600" },
  // African Edition flagships
  { id: "knowledge", name: "Knowledge Hub", icon: BookOpen, tile: "from-amber-500 to-orange-700", showOnDesktop: true },
  { id: "student", name: "Student", icon: GraduationCap, tile: "from-emerald-500 to-teal-700", showOnDesktop: true },
  { id: "government", name: "Government Hub", icon: Landmark, tile: "from-yellow-500 to-green-700", showOnDesktop: true },
  { id: "emergency", name: "Emergency", icon: Siren, tile: "from-red-600 to-orange-700", showOnDesktop: true },
  { id: "security", name: "AI Security", icon: ShieldCheck, tile: "from-indigo-500 to-fuchsia-700", showOnDesktop: true },
  { id: "cloud", name: "NEXUS Cloud", icon: Cloud, tile: "from-sky-500 to-cyan-700", showOnDesktop: true },
  { id: "weather", name: "Weather", icon: CloudSun, tile: "from-sky-400 to-indigo-600", showOnDesktop: true },
];

export const APP_MAP: Record<AppId, AppMeta> = APPS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {} as Record<AppId, AppMeta>
);

