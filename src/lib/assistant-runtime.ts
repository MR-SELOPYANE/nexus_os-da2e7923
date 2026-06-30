/**
 * Executes assistant tool calls against the OS store on the client.
 */
import { useOS } from "@/os/store";
import { resolvePath, resolveRelative, isFile, isFolder } from "@/os/fs";
import { getCommand } from "@/os/commands";
import { WALLPAPERS } from "@/os/wallpapers";

export interface ToolCallContext {
  name: string;
  input: Record<string, unknown>;
}

function summarize(node: unknown): string {
  return JSON.stringify(node).slice(0, 800);
}

export async function executeAssistantTool({ name, input }: ToolCallContext): Promise<string> {
  const s = useOS.getState();
  try {
    switch (name) {
      case "open_app": {
        const app = String(input.app);
        s.openApp(app as never);
        return `Opened ${app}.`;
      }
      case "close_app": {
        const app = String(input.app);
        const wins = s.windows.filter((w) => w.appId === app);
        wins.forEach((w) => s.closeWindow(w.id));
        return `Closed ${wins.length} window(s) of ${app}.`;
      }
      case "run_terminal": {
        const raw = String(input.command).trim();
        if (!raw) return "Empty command.";
        const [cmdName, ...args] = raw.split(/\s+/);
        const c = getCommand(cmdName);
        if (!c) return `Unknown command: ${cmdName}`;
        const out: string[] = [];
        await c.run({
          cwd: "/home",
          setCwd: () => {},
          store: useOS.getState(),
          print: (t: string) => out.push(t),
          args,
          raw,
        });
        return out.join("\n") || `Executed ${cmdName}.`;
      }
      case "read_file": {
        const path = resolveRelative("/", String(input.path));
        const node = resolvePath(s.fs, path);
        if (!node) return `Not found: ${path}`;
        if (!isFile(node)) return `${path} is a folder.`;
        return node.content.slice(0, 4000);
      }
      case "write_file": {
        const path = resolveRelative("/", String(input.path));
        s.writeFile(path, String(input.content ?? ""));
        return `Wrote ${path}.`;
      }
      case "list_dir": {
        const path = resolveRelative("/", String(input.path));
        const node = resolvePath(s.fs, path);
        if (!node) return `Not found: ${path}`;
        if (!isFolder(node)) return `${path} is a file.`;
        return Object.entries(node.children)
          .map(([n, c]) => `${isFolder(c) ? "📁" : "📄"} ${n}`)
          .join("\n");
      }
      case "search_files": {
        const q = String(input.query).toLowerCase();
        const hits: string[] = [];
        const walk = (path: string) => {
          const node = resolvePath(s.fs, path);
          if (!isFolder(node)) return;
          for (const [name, child] of Object.entries(node.children)) {
            const p = `${path}/${name}`.replace("//", "/");
            if (name.toLowerCase().includes(q)) hits.push(p);
            else if (isFile(child) && child.content.toLowerCase().includes(q)) hits.push(p + " (match in content)");
            if (isFolder(child)) walk(p);
          }
        };
        walk("/home");
        return hits.length ? hits.slice(0, 20).join("\n") : `No matches for "${q}".`;
      }
      case "set_wallpaper": {
        const id = String(input.wallpaperId).toLowerCase();
        const match = WALLPAPERS.find((w) => w.id === id || w.name.toLowerCase() === id);
        if (!match) return `Unknown wallpaper. Try: ${WALLPAPERS.map((w) => w.id).join(", ")}.`;
        s.updateSettings({ wallpaperId: match.id });
        return `Wallpaper set to ${match.name}.`;
      }
      case "set_volume": {
        const v = Math.max(0, Math.min(100, Number(input.value)));
        s.setQuick({ volume: v });
        return `Volume set to ${v}%.`;
      }
      case "set_brightness": {
        const v = Math.max(30, Math.min(100, Number(input.value)));
        s.setQuick({ brightness: v });
        return `Brightness set to ${v}%.`;
      }
      case "take_screenshot": {
        s.captureScreenshot();
        return "Screenshot saved to Pictures.";
      }
      case "empty_recycle_bin": {
        const n = s.trash.length;
        s.emptyTrash();
        return `Emptied ${n} item(s) from the Recycle Bin.`;
      }
      case "add_calendar_event": {
        s.addEvent({
          title: String(input.title),
          date: String(input.date),
          time: input.time ? String(input.time) : undefined,
          notes: input.notes ? String(input.notes) : undefined,
        });
        return `Added "${input.title}" on ${input.date}${input.time ? ` at ${input.time}` : ""}.`;
      }
      case "set_alarm": {
        s.addAlarm({ time: String(input.time), label: String(input.label), enabled: true });
        return `Alarm set for ${input.time} — ${input.label}.`;
      }
      case "notify": {
        s.notify({ title: String(input.title), message: String(input.message) });
        return `Notification sent.`;
      }
      case "open_url": {
        s.openApp("browser", { url: String(input.url) });
        return `Opening ${input.url} in the browser.`;
      }
      case "get_system_status": {
        const now = new Date().toLocaleString();
        return summarize({
          time: now,
          username: s.settings.username,
          online: s.network.online,
          ssid: s.network.ssid,
          openWindows: s.windows.map((w) => ({ app: w.appId, title: w.title, minimized: w.minimized })),
          notifications: s.notifications.slice(0, 5).map((n) => `${n.title}: ${n.message}`),
          installedPackages: s.packages.map((p) => `${p.name}@${p.version}`),
          trashCount: s.trash.length,
        });
      }
      default:
        return `Tool ${name} is not implemented.`;
    }
  } catch (e) {
    return `Tool ${name} failed: ${(e as Error).message}`;
  }
}
