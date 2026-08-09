import type { useOS } from "./store";

type Store = ReturnType<typeof useOS.getState>;

export interface CommandContext {
  cwd: string;
  setCwd: (p: string) => void;
  store: Store;
  print: (text: string, kind?: "out" | "err") => void;
  args: string[];
  raw: string;
  /** Piped input from a previous command in the pipeline, if any. */
  stdin?: string;
}

export interface Command {
  name: string;
  description: string;
  run: (ctx: CommandContext) => void | Promise<void>;
}

const REGISTRY = new Map<string, Command>();

export function registerCommand(cmd: Command) {
  REGISTRY.set(cmd.name, cmd);
}

export function unregisterCommand(name: string) {
  REGISTRY.delete(name);
}

export function listCommands(): Command[] {
  return Array.from(REGISTRY.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCommand(name: string): Command | undefined {
  return REGISTRY.get(name);
}
