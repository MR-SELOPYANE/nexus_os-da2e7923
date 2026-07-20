import { useOS } from "@/os/store";
import type { SALanguage } from "@/os/store";

type Key =
  | "start"
  | "search"
  | "signIn"
  | "signOut"
  | "lock"
  | "shutdown"
  | "restart"
  | "welcome"
  | "settings"
  | "files"
  | "notes"
  | "terminal"
  | "sos"
  | "medicalId"
  | "emergency"
  | "loadShedding"
  | "nextOutage"
  | "noOutage"
  | "installed"
  | "install"
  | "uninstall";

type Dict = Record<Key, string>;

const en: Dict = {
  start: "Start",
  search: "Search NEXUS…",
  signIn: "Sign in",
  signOut: "Sign out",
  lock: "Lock",
  shutdown: "Shut down",
  restart: "Restart",
  welcome: "Welcome",
  settings: "Settings",
  files: "Files",
  notes: "Notes",
  terminal: "Terminal",
  sos: "SOS",
  medicalId: "Medical ID",
  emergency: "Emergency",
  loadShedding: "Load shedding",
  nextOutage: "Next outage",
  noOutage: "No outages scheduled",
  installed: "Installed",
  install: "Install",
  uninstall: "Uninstall",
};

// Partial dicts — fall back to English for missing keys.
const DICTS: Partial<Record<SALanguage, Partial<Dict>>> = {
  English: en,
  isiZulu: {
    start: "Qalisa",
    search: "Sesha ku-NEXUS…",
    signIn: "Ngena",
    signOut: "Phuma",
    lock: "Khiya",
    shutdown: "Cisha",
    restart: "Qalisa kabusha",
    welcome: "Sawubona",
    settings: "Izilungiselelo",
    files: "Amafayela",
    notes: "Amanothi",
    terminal: "Itheminali",
    sos: "SOS",
    medicalId: "I-ID Yezokwelapha",
    emergency: "Isimo esiphuthumayo",
    loadShedding: "Ukucishwa kukagesi",
    nextOutage: "Ukucinywa okulandelayo",
    noOutage: "Akukho ukucinywa okuhleliwe",
    installed: "Kufakiwe",
    install: "Faka",
    uninstall: "Susa",
  },
  isiXhosa: {
    start: "Qalisa",
    search: "Khangela kwi-NEXUS…",
    signIn: "Ngena",
    signOut: "Phuma",
    lock: "Tshixa",
    shutdown: "Cima",
    restart: "Qalisa kwakhona",
    welcome: "Wamkelekile",
    settings: "Iisethingi",
    files: "Iifayile",
    notes: "Amanqaku",
    terminal: "Ithemninali",
    sos: "SOS",
    medicalId: "I-ID yezoNyango",
    emergency: "Ingxaki ekhawulezayo",
    loadShedding: "Ukucinywa kombane",
    nextOutage: "Ukucinywa okulandelayo",
    noOutage: "Akukho kucinywa kucwangcisiweyo",
    installed: "Kufakiwe",
    install: "Faka",
    uninstall: "Susa",
  },
  Afrikaans: {
    start: "Begin",
    search: "Soek NEXUS…",
    signIn: "Meld aan",
    signOut: "Meld af",
    lock: "Sluit",
    shutdown: "Skakel af",
    restart: "Herbegin",
    welcome: "Welkom",
    settings: "Instellings",
    files: "Lêers",
    notes: "Notas",
    terminal: "Terminaal",
    sos: "SOS",
    medicalId: "Mediese ID",
    emergency: "Noodgeval",
    loadShedding: "Beurtkrag",
    nextOutage: "Volgende afskakeling",
    noOutage: "Geen afskakelings beplan nie",
    installed: "Geïnstalleer",
    install: "Installeer",
    uninstall: "Verwyder",
  },
  Sesotho: {
    start: "Qala",
    search: "Batla NEXUS…",
    signIn: "Kena",
    signOut: "Tsoa",
    lock: "Notlela",
    shutdown: "Tima",
    restart: "Qala hape",
    welcome: "Amohela",
    settings: "Ditlhophiso",
    files: "Difaele",
    notes: "Dintlha",
    terminal: "Terminale",
    sos: "SOS",
    medicalId: "ID ya Bongaka",
    emergency: "Tšohanyetso",
    loadShedding: "Ho khaotsoa ha motlakase",
    nextOutage: "Ho khaotsoa ho latelang",
    noOutage: "Ha ho khaotso e reriloeng",
    installed: "E kentsoe",
    install: "Kenya",
    uninstall: "Tlosa",
  },
};

export function t(key: Key, lang: SALanguage): string {
  const dict = DICTS[lang];
  return (dict && dict[key]) || en[key];
}

/** React hook: reactive translation bound to the current UI language. */
export function useT() {
  const lang = useOS((s) => s.sa.language);
  return (key: Key) => t(key, lang);
}
