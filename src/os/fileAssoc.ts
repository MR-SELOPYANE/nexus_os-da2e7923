import type { AppId } from "./store";

const ASSOC: Record<string, AppId> = {
  txt: "notes",
  md: "notes",
  cfg: "notes",
  json: "notes",
  log: "notes",
  nexus: "browser",
  calc: "calculator",
};

export function getExtension(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function appForFile(path: string): AppId {
  const ext = getExtension(path);
  return ASSOC[ext] ?? "notes";
}

export function openFileWith(
  path: string,
  openApp: (id: AppId, payload?: Record<string, unknown>) => void
) {
  const app = appForFile(path);
  if (app === "browser") openApp("browser", { url: `nexus://${path.split("/").pop()}` });
  else openApp(app, { path });
}
