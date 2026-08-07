/**
 * A small POSIX-ish shell: quoting, variable expansion, aliases, pipes,
 * output redirection and `&&` / `||` / `;` command chaining.
 */
import { getCommand } from "./commands";
import { ENV, ALIASES } from "./commands-unix";
import { resolveRelative, resolvePath, isFile } from "./fs";
import type { useOS } from "./store";

type Store = ReturnType<typeof useOS.getState>;

export interface ShellIO {
  cwd: string;
  setCwd: (p: string) => void;
  getStore: () => Store;
  print: (text: string, kind?: "out" | "err") => void;
  clear: () => void;
}

/** Split on a separator while respecting quotes. */
function splitTop(input: string, seps: string[]): { text: string; sep: string }[] {
  const out: { text: string; sep: string }[] = [];
  let buf = "";
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      buf += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    const sep = seps.find((s) => input.startsWith(s, i));
    if (sep) {
      out.push({ text: buf, sep });
      buf = "";
      i += sep.length - 1;
      continue;
    }
    buf += ch;
  }
  out.push({ text: buf, sep: "" });
  return out;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  let quote: string | null = null;
  let has = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (buf || has) tokens.push(buf);
      buf = "";
      has = false;
      continue;
    }
    buf += ch;
  }
  if (buf || has) tokens.push(buf);
  return tokens;
}

function expand(token: string, io: ShellIO): string {
  return token.replace(/\$(\w+)|\$\{(\w+)\}/g, (_m, a, b) => {
    const key = a ?? b;
    if (key === "PWD") return io.cwd;
    if (key === "USER") return io.getStore().settings.username;
    if (key === "RANDOM") return String(Math.floor(Math.random() * 32768));
    return ENV[key] ?? "";
  });
}

/** Execute one full command line. */
export async function execLine(line: string, io: ShellIO): Promise<void> {
  const trimmed = line.trim();
  if (!trimmed) return;

  const hist = (globalThis as { __nexusHistory?: string[] }).__nexusHistory ?? [];
  hist.push(trimmed);
  (globalThis as { __nexusHistory?: string[] }).__nexusHistory = hist.slice(-200);

  let lastOk = true;
  for (const { text, sep } of splitTop(trimmed, ["&&", "||", ";"])) {
    const segment = text.trim();
    if (!segment) continue;
    const prev = lastOk;
    lastOk = await execPipeline(segment, io);
    void prev;
    if (sep === "&&" && !lastOk) break;
    if (sep === "||" && lastOk) break;
  }
}

/** Execute a single pipeline (`a | b | c`), returning success. */
async function execPipeline(segment: string, io: ShellIO): Promise<boolean> {
  const stages = splitTop(segment, ["|"]).map((s) => s.text.trim()).filter(Boolean);
  let stdin: string | undefined;
  let ok = true;

  for (let i = 0; i < stages.length; i++) {
    const isLast = i === stages.length - 1;
    let stage = stages[i];

    // Redirection (last stage only): >, >>, <
    let redirect: { file: string; append: boolean } | null = null;
    const redirMatch = /\s(>>|>)\s*("[^"]+"|'[^']+'|\S+)\s*$/.exec(stage);
    if (redirMatch) {
      redirect = { file: redirMatch[2].replace(/^['"]|['"]$/g, ""), append: redirMatch[1] === ">>" };
      stage = stage.slice(0, redirMatch.index);
    }
    const inMatch = /\s<\s*(\S+)\s*$/.exec(stage);
    if (inMatch) {
      const node = resolvePath(io.getStore().fs, resolveRelative(io.cwd, inMatch[1]));
      stdin = isFile(node) ? node.content : "";
      stage = stage.slice(0, inMatch.index);
    }

    let tokens = tokenize(stage).map((t) => expand(t, io));
    if (!tokens.length) continue;

    // Alias expansion (one level)
    const alias = ALIASES[tokens[0]];
    if (alias) tokens = [...tokenize(alias), ...tokens.slice(1)];

    const [name, ...args] = tokens;
    if (name === "clear") {
      io.clear();
      continue;
    }

    const cmd = getCommand(name);
    if (!cmd) {
      io.print(`${name}: command not found`, "err");
      return false;
    }

    const buffered = !isLast || !!redirect;
    const chunks: string[] = [];
    const print = (text: string, kind: "out" | "err" = "out") => {
      if (kind === "err") {
        ok = false;
        io.print(text, "err");
        return;
      }
      if (buffered) chunks.push(text);
      else if (text !== "") io.print(text);
    };

    await cmd.run({
      cwd: io.cwd,
      setCwd: io.setCwd,
      store: io.getStore(),
      print,
      args,
      raw: stage.trim(),
      stdin,
    });

    const output = chunks.join("\n");
    if (redirect) {
      const path = resolveRelative(io.cwd, redirect.file);
      const existing = resolvePath(io.getStore().fs, path);
      const base = redirect.append && isFile(existing) ? existing.content : "";
      io.getStore().writeFile(path, redirect.append && base ? `${base}\n${output}` : output);
      stdin = undefined;
    } else {
      stdin = output;
    }
  }
  return ok;
}
