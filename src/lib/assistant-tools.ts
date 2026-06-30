/**
 * Shared tool catalog for the Nexus assistant.
 * Tools execute client-side (they manipulate the OS store / DOM),
 * so the server only declares schemas; the client runs `execute`
 * via the AI SDK's onToolCall hook.
 */
import { z } from "zod";

export const TOOLS = {
  open_app: {
    description:
      "Open a NEXUS application window. Use this when the user asks to launch, show, or start an app.",
    inputSchema: z.object({
      app: z
        .enum([
          "files",
          "notes",
          "terminal",
          "calculator",
          "settings",
          "taskmanager",
          "browser",
          "about",
          "assistant",
          "update",
          "recovery",
          "network",
          "clock",
          "media",
          "photos",
          "recyclebin",
        ])
        .describe("The app id to open"),
    }),
  },
  close_app: {
    description: "Close all open windows of a given app.",
    inputSchema: z.object({
      app: z.string().describe("App id to close"),
    }),
  },
  run_terminal: {
    description:
      "Execute a NEXUS terminal command and return its output. Useful for ls, cat, ps, kill, neofetch, ping, etc.",
    inputSchema: z.object({
      command: z.string().describe("The full command line, e.g. 'ls /home'"),
    }),
  },
  read_file: {
    description: "Read a text file from the virtual file system.",
    inputSchema: z.object({
      path: z.string().describe("Absolute path, e.g. /home/Documents/welcome.txt"),
    }),
  },
  write_file: {
    description: "Create or overwrite a text file in the virtual file system.",
    inputSchema: z.object({
      path: z.string(),
      content: z.string(),
    }),
  },
  list_dir: {
    description: "List the contents of a folder in the virtual file system.",
    inputSchema: z.object({
      path: z.string().describe("Absolute folder path"),
    }),
  },
  search_files: {
    description: "Search file names or contents for a query string.",
    inputSchema: z.object({
      query: z.string(),
    }),
  },
  set_wallpaper: {
    description: "Change the desktop wallpaper.",
    inputSchema: z.object({
      wallpaperId: z
        .string()
        .describe(
          "One of the wallpaper ids (e.g. 'aurora', 'nebula', 'cyber', 'mint', 'sunset', 'forest')",
        ),
    }),
  },
  set_volume: {
    description: "Set the system master volume (0-100).",
    inputSchema: z.object({ value: z.number().min(0).max(100) }),
  },
  set_brightness: {
    description: "Set the screen brightness (30-100).",
    inputSchema: z.object({ value: z.number().min(30).max(100) }),
  },
  take_screenshot: {
    description: "Capture the desktop and save it to Pictures.",
    inputSchema: z.object({}),
  },
  empty_recycle_bin: {
    description: "Permanently delete every item in the Recycle Bin.",
    inputSchema: z.object({}),
  },
  add_calendar_event: {
    description: "Add an event to the calendar.",
    inputSchema: z.object({
      title: z.string(),
      date: z.string().describe("YYYY-MM-DD"),
      time: z.string().optional().describe("HH:MM, 24h"),
      notes: z.string().optional(),
    }),
  },
  set_alarm: {
    description: "Create an alarm.",
    inputSchema: z.object({
      time: z.string().describe("HH:MM, 24h"),
      label: z.string(),
    }),
  },
  notify: {
    description: "Show a desktop notification.",
    inputSchema: z.object({
      title: z.string(),
      message: z.string(),
    }),
  },
  open_url: {
    description: "Open a URL in the NEXUS browser app.",
    inputSchema: z.object({ url: z.string() }),
  },
  get_system_status: {
    description:
      "Get a snapshot of the current system: time, open windows, recent notifications, online status, installed packages.",
    inputSchema: z.object({}),
  },
} as const;

export type ToolName = keyof typeof TOOLS;
