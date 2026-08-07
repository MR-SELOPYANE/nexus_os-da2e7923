/**
 * Real(istic) GNU/Linux userland commands for the NEXUS terminal.
 * Everything here operates on the virtual filesystem in the OS store and
 * supports stdin (from pipes) the way the real coreutils do.
 */
import { registerCommand, type CommandContext } from "./commands";
import { resolvePath, resolveRelative, isFolder, isFile, baseName, parentPath } from "./fs";
import type { FSNode, FolderNode } from "./fs";

/** Shell environment variables (shared with the shell parser). */
export const ENV: Record<string, string> = {
  SHELL: "/bin/nsh",
  TERM: "xterm-256color",
  LANG: "en_ZA.UTF-8",
  PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
  HOME: "/home",
  PWD: "/home",
};

export const ALIASES: Record<string, string> = {
  ll: "ls -l",
  la: "ls -a",
  "..": "cd ..",
};

/** Read the operands' contents, falling back to stdin when there are none. */
function readInput(ctx: CommandContext, files: string[]): string | null {
  if (files.length === 0) return ctx.stdin ?? "";
  const chunks: string[] = [];
  for (const f of files) {
    const node = resolvePath(ctx.store.fs, resolveRelative(ctx.cwd, f));
    if (!isFile(node)) {
      ctx.print(`${ctx.args[0] ?? "cat"}: ${f}: No such file or directory`, "err");
      return null;
    }
    chunks.push(node.content);
  }
  return chunks.join("\n");
}

const lines = (s: string) => (s.length ? s.replace(/\n$/, "").split("\n") : []);
const flagsOf = (args: string[]) => args.filter((a) => a.startsWith("-") && a !== "-");
const operandsOf = (args: string[]) => args.filter((a) => !a.startsWith("-") || a === "-");
const hasFlag = (args: string[], ...f: string[]) =>
  flagsOf(args).some((a) => f.some((x) => (x.length === 2 ? a.startsWith("-") && !a.startsWith("--") && a.includes(x[1]) : a === x)));

function walk(root: FolderNode, path: string, fn: (p: string, n: FSNode) => void) {
  for (const [name, node] of Object.entries(root.children)) {
    const p = path === "/" ? `/${name}` : `${path}/${name}`;
    fn(p, node);
    if (isFolder(node)) walk(node, p, fn);
  }
}

function sizeOf(node: FSNode): number {
  if (isFile(node)) return node.content.length;
  return Object.values(node.children).reduce((a, n) => a + sizeOf(n), 0);
}

const modeOf = (node: FSNode) => (isFolder(node) ? "drwxr-xr-x" : "-rw-r--r--");

// ---------------------------------------------------------------- text tools

registerCommand({
  name: "grep",
  description: "Search text with a pattern (-i -v -n -c -r)",
  run: (ctx) => {
    const { args, print } = ctx;
    const ops = operandsOf(args);
    const pattern = ops.shift();
    if (!pattern) return print("usage: grep [-ivnc] PATTERN [FILE...]", "err");
    let re: RegExp;
    try {
      re = new RegExp(pattern, hasFlag(args, "-i") ? "i" : "");
    } catch {
      return print(`grep: ${pattern}: invalid regular expression`, "err");
    }
    const invert = hasFlag(args, "-v");
    const showNum = hasFlag(args, "-n");
    const countOnly = hasFlag(args, "-c");

    if (hasFlag(args, "-r")) {
      const dir = resolveRelative(ctx.cwd, ops[0] ?? ".");
      const node = resolvePath(ctx.store.fs, dir);
      if (!isFolder(node)) return print(`grep: ${dir}: Not a directory`, "err");
      const out: string[] = [];
      walk(node, dir, (p, n) => {
        if (!isFile(n)) return;
        lines(n.content).forEach((l, i) => {
          if (re.test(l) !== invert) out.push(`${p}:${showNum ? `${i + 1}:` : ""}${l}`);
        });
      });
      return print(out.join("\n"));
    }

    const multi = ops.length > 1;
    const out: string[] = [];
    let total = 0;
    if (ops.length === 0) {
      lines(ctx.stdin ?? "").forEach((l, i) => {
        if (re.test(l) !== invert) {
          total++;
          out.push(showNum ? `${i + 1}:${l}` : l);
        }
      });
    } else {
      for (const f of ops) {
        const node = resolvePath(ctx.store.fs, resolveRelative(ctx.cwd, f));
        if (!isFile(node)) {
          print(`grep: ${f}: No such file or directory`, "err");
          continue;
        }
        lines(node.content).forEach((l, i) => {
          if (re.test(l) !== invert) {
            total++;
            out.push(`${multi ? `${f}:` : ""}${showNum ? `${i + 1}:` : ""}${l}`);
          }
        });
      }
    }
    print(countOnly ? String(total) : out.join("\n"));
  },
});

registerCommand({
  name: "head",
  description: "Output the first lines of input (-n N)",
  run: (ctx) => {
    const args = ctx.args;
    const nIdx = args.indexOf("-n");
    const n = nIdx >= 0 ? parseInt(args[nIdx + 1] ?? "10", 10) : 10;
    const ops = operandsOf(args).filter((a) => a !== String(n));
    const data = readInput(ctx, ops);
    if (data == null) return;
    ctx.print(lines(data).slice(0, n).join("\n"));
  },
});

registerCommand({
  name: "tail",
  description: "Output the last lines of input (-n N)",
  run: (ctx) => {
    const args = ctx.args;
    const nIdx = args.indexOf("-n");
    const n = nIdx >= 0 ? parseInt(args[nIdx + 1] ?? "10", 10) : 10;
    const ops = operandsOf(args).filter((a) => a !== String(n));
    const data = readInput(ctx, ops);
    if (data == null) return;
    ctx.print(lines(data).slice(-n).join("\n"));
  },
});

registerCommand({
  name: "wc",
  description: "Count lines, words and bytes (-l -w -c)",
  run: (ctx) => {
    const ops = operandsOf(ctx.args);
    const data = readInput(ctx, ops);
    if (data == null) return;
    const l = lines(data).length;
    const w = data.split(/\s+/).filter(Boolean).length;
    const c = data.length;
    if (hasFlag(ctx.args, "-l")) return ctx.print(String(l));
    if (hasFlag(ctx.args, "-w")) return ctx.print(String(w));
    if (hasFlag(ctx.args, "-c")) return ctx.print(String(c));
    ctx.print(`${String(l).padStart(7)} ${String(w).padStart(7)} ${String(c).padStart(7)} ${ops.join(" ")}`.trimEnd());
  },
});

registerCommand({
  name: "sort",
  description: "Sort lines (-r reverse, -n numeric, -u unique)",
  run: (ctx) => {
    const ops = operandsOf(ctx.args);
    const data = readInput(ctx, ops);
    if (data == null) return;
    let out = lines(data);
    out = hasFlag(ctx.args, "-n")
      ? out.sort((a, b) => parseFloat(a) - parseFloat(b))
      : out.sort((a, b) => a.localeCompare(b));
    if (hasFlag(ctx.args, "-r")) out.reverse();
    if (hasFlag(ctx.args, "-u")) out = Array.from(new Set(out));
    ctx.print(out.join("\n"));
  },
});

registerCommand({
  name: "uniq",
  description: "Filter adjacent duplicate lines (-c counts)",
  run: (ctx) => {
    const data = readInput(ctx, operandsOf(ctx.args));
    if (data == null) return;
    const out: string[] = [];
    let prev: string | null = null;
    let count = 0;
    const flush = () => {
      if (prev !== null) out.push(hasFlag(ctx.args, "-c") ? `${String(count).padStart(4)} ${prev}` : prev);
    };
    for (const l of lines(data)) {
      if (l === prev) count++;
      else {
        flush();
        prev = l;
        count = 1;
      }
    }
    flush();
    ctx.print(out.join("\n"));
  },
});

registerCommand({
  name: "cut",
  description: "Extract fields: cut -d DELIM -f N",
  run: (ctx) => {
    const args = ctx.args;
    const d = args.includes("-d") ? args[args.indexOf("-d") + 1] ?? "\t" : "\t";
    const fRaw = args.includes("-f") ? args[args.indexOf("-f") + 1] ?? "1" : "1";
    const fields = fRaw.split(",").map((x) => parseInt(x, 10));
    const ops = operandsOf(args).filter((a) => a !== d && a !== fRaw);
    const data = readInput(ctx, ops);
    if (data == null) return;
    ctx.print(
      lines(data)
        .map((l) => fields.map((f) => l.split(d)[f - 1] ?? "").join(d))
        .join("\n"),
    );
  },
});

registerCommand({
  name: "tr",
  description: "Translate or delete characters: tr SET1 SET2",
  run: (ctx) => {
    const ops = operandsOf(ctx.args);
    const del = hasFlag(ctx.args, "-d");
    const [set1, set2] = ops;
    if (!set1) return ctx.print("usage: tr [-d] SET1 [SET2]", "err");
    const data = ctx.stdin ?? "";
    const map = (ch: string) => {
      const i = set1.indexOf(ch);
      if (i === -1) return ch;
      if (del) return "";
      return set2 ? set2[Math.min(i, set2.length - 1)] : ch;
    };
    ctx.print(Array.from(data).map(map).join(""));
  },
});

registerCommand({
  name: "sed",
  description: "Stream editor: sed 's/find/replace/g'",
  run: (ctx) => {
    const ops = operandsOf(ctx.args);
    const expr = ops.shift() ?? "";
    const m = /^s(.)(.*?)\1(.*?)\1([gi]*)$/.exec(expr);
    if (!m) return ctx.print("sed: only s/find/replace/flags is supported", "err");
    const data = readInput(ctx, ops);
    if (data == null) return;
    let re: RegExp;
    try {
      re = new RegExp(m[2], m[4] || "");
    } catch {
      return ctx.print(`sed: bad expression: ${m[2]}`, "err");
    }
    ctx.print(
      lines(data)
        .map((l) => l.replace(re, m[3]))
        .join("\n"),
    );
  },
});

registerCommand({
  name: "rev",
  description: "Reverse each line of input",
  run: (ctx) => {
    const data = readInput(ctx, operandsOf(ctx.args));
    if (data == null) return;
    ctx.print(
      lines(data)
        .map((l) => Array.from(l).reverse().join(""))
        .join("\n"),
    );
  },
});

registerCommand({
  name: "tee",
  description: "Write stdin to a file and pass it through",
  run: (ctx) => {
    const target = operandsOf(ctx.args)[0];
    const data = ctx.stdin ?? "";
    if (target) ctx.store.writeFile(resolveRelative(ctx.cwd, target), data);
    ctx.print(data);
  },
});

registerCommand({
  name: "diff",
  description: "Compare two files line by line",
  run: (ctx) => {
    const [a, b] = operandsOf(ctx.args);
    if (!a || !b) return ctx.print("usage: diff FILE1 FILE2", "err");
    const na = resolvePath(ctx.store.fs, resolveRelative(ctx.cwd, a));
    const nb = resolvePath(ctx.store.fs, resolveRelative(ctx.cwd, b));
    if (!isFile(na) || !isFile(nb)) return ctx.print("diff: both operands must be files", "err");
    const la = lines(na.content);
    const lb = lines(nb.content);
    const out: string[] = [];
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (la[i] !== lb[i]) {
        if (la[i] !== undefined) out.push(`${i + 1}< ${la[i]}`);
        if (lb[i] !== undefined) out.push(`${i + 1}> ${lb[i]}`);
      }
    }
    ctx.print(out.join("\n") || "(files are identical)");
  },
});

registerCommand({
  name: "base64",
  description: "Base64 encode or decode (-d)",
  run: (ctx) => {
    const data = readInput(ctx, operandsOf(ctx.args));
    if (data == null) return;
    try {
      ctx.print(hasFlag(ctx.args, "-d") ? atob(data.trim()) : btoa(data));
    } catch {
      ctx.print("base64: invalid input", "err");
    }
  },
});

registerCommand({
  name: "xargs",
  description: "Run a command once per line of stdin",
  run: async (ctx) => {
    const ops = operandsOf(ctx.args);
    if (!ops.length) return ctx.print("usage: <cmd> | xargs <command>", "err");
    const { getCommand } = await import("./commands");
    const cmd = getCommand(ops[0]);
    if (!cmd) return ctx.print(`xargs: ${ops[0]}: command not found`, "err");
    for (const l of lines(ctx.stdin ?? "")) {
      if (!l.trim()) continue;
      await cmd.run({ ...ctx, args: [...ops.slice(1), l.trim()], stdin: undefined });
    }
  },
});

// ------------------------------------------------------------ file utilities

registerCommand({
  name: "cp",
  description: "Copy a file or directory (-r)",
  run: ({ cwd, store, args, print }) => {
    const [src, dst] = operandsOf(args);
    if (!src || !dst) return print("usage: cp [-r] SOURCE DEST", "err");
    const from = resolveRelative(cwd, src);
    const node = resolvePath(store.fs, from);
    if (!node) return print(`cp: ${src}: No such file or directory`, "err");
    let to = resolveRelative(cwd, dst);
    const dstNode = resolvePath(store.fs, to);
    if (isFolder(dstNode)) to = `${to === "/" ? "" : to}/${baseName(from)}`;
    const copy = (n: FSNode, path: string) => {
      if (isFile(n)) return store.writeFile(path, n.content);
      store.createFolder(path);
      for (const [name, child] of Object.entries(n.children)) copy(child, `${path}/${name}`);
    };
    if (isFolder(node) && !hasFlag(args, "-r")) return print(`cp: -r not specified; omitting directory '${src}'`, "err");
    copy(node, to);
    print("");
  },
});

registerCommand({
  name: "mv",
  description: "Move or rename a file or directory",
  run: ({ cwd, store, args, print }) => {
    const [src, dst] = operandsOf(args);
    if (!src || !dst) return print("usage: mv SOURCE DEST", "err");
    const from = resolveRelative(cwd, src);
    const node = resolvePath(store.fs, from);
    if (!node) return print(`mv: ${src}: No such file or directory`, "err");
    let to = resolveRelative(cwd, dst);
    if (isFolder(resolvePath(store.fs, to))) to = `${to === "/" ? "" : to}/${baseName(from)}`;
    const copy = (n: FSNode, path: string) => {
      if (isFile(n)) return store.writeFile(path, n.content);
      store.createFolder(path);
      for (const [name, child] of Object.entries(n.children)) copy(child, `${path}/${name}`);
    };
    copy(node, to);
    store.deleteNode(from, { permanent: true });
    print("");
  },
});

registerCommand({
  name: "find",
  description: "Find files: find [PATH] [-name PATTERN] [-type f|d]",
  run: ({ cwd, store, args, print }) => {
    const ops = operandsOf(args);
    const start = resolveRelative(cwd, ops[0] && !ops[0].startsWith("-") ? ops[0] : ".");
    const nameIdx = args.indexOf("-name");
    const pattern = nameIdx >= 0 ? args[nameIdx + 1] : undefined;
    const typeIdx = args.indexOf("-type");
    const type = typeIdx >= 0 ? args[typeIdx + 1] : undefined;
    const node = resolvePath(store.fs, start);
    if (!isFolder(node)) return print(`find: '${start}': No such directory`, "err");
    const re = pattern ? new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`) : null;
    const out: string[] = [];
    walk(node, start, (p, n) => {
      if (type === "f" && !isFile(n)) return;
      if (type === "d" && !isFolder(n)) return;
      if (re && !re.test(baseName(p))) return;
      out.push(p);
    });
    print(out.join("\n") || "");
  },
});

registerCommand({
  name: "stat",
  description: "Display file status",
  run: ({ cwd, store, args, print }) => {
    const t = operandsOf(args)[0];
    if (!t) return print("usage: stat FILE", "err");
    const p = resolveRelative(cwd, t);
    const node = resolvePath(store.fs, p);
    if (!node) return print(`stat: cannot stat '${t}': No such file or directory`, "err");
    print(
      [
        `  File: ${p}`,
        `  Size: ${sizeOf(node)}\tBlocks: ${Math.ceil(sizeOf(node) / 512)}\t${isFolder(node) ? "directory" : "regular file"}`,
        `Access: (0${isFolder(node) ? "755" : "644"}/${modeOf(node)})  Uid: (1000/${store.settings.username})  Gid: (1000/users)`,
        `Modify: ${new Date(node.modified).toISOString()}`,
      ].join("\n"),
    );
  },
});

registerCommand({
  name: "du",
  description: "Estimate file space usage (-h)",
  run: ({ cwd, store, args, print }) => {
    const p = resolveRelative(cwd, operandsOf(args)[0] ?? ".");
    const node = resolvePath(store.fs, p);
    if (!node) return print(`du: cannot access '${p}'`, "err");
    const human = hasFlag(args, "-h");
    const fmt = (b: number) => (human ? (b > 1024 ? `${(b / 1024).toFixed(1)}K` : `${b}B`) : String(Math.ceil(b / 1024) || 1));
    const out: string[] = [];
    if (isFolder(node)) walk(node, p, (cp, n) => isFolder(n) && out.push(`${fmt(sizeOf(n))}\t${cp}`));
    out.push(`${fmt(sizeOf(node))}\t${p}`);
    print(out.join("\n"));
  },
});

registerCommand({
  name: "df",
  description: "Report filesystem disk space usage",
  run: ({ store, print }) => {
    const used = Math.ceil(sizeOf(store.fs) / 1024);
    const total = 8 * 1024 * 1024;
    print(
      [
        "Filesystem      1K-blocks      Used Available Use% Mounted on",
        `/dev/nexus0      ${String(total).padStart(9)} ${String(used).padStart(9)} ${String(total - used).padStart(9)}   ${Math.max(1, Math.round((used / total) * 100))}% /`,
        "tmpfs             1048576         0   1048576    0% /tmp",
      ].join("\n"),
    );
  },
});

registerCommand({
  name: "chmod",
  description: "Change file mode bits (simulated)",
  run: ({ cwd, store, args, print }) => {
    const [mode, target] = operandsOf(args);
    if (!mode || !target) return print("usage: chmod MODE FILE", "err");
    if (!resolvePath(store.fs, resolveRelative(cwd, target)))
      return print(`chmod: cannot access '${target}': No such file or directory`, "err");
    print(`mode of '${target}' changed to ${mode}`);
  },
});

registerCommand({
  name: "chown",
  description: "Change file owner (simulated)",
  run: ({ cwd, store, args, print }) => {
    const [owner, target] = operandsOf(args);
    if (!owner || !target) return print("usage: chown OWNER FILE", "err");
    if (!resolvePath(store.fs, resolveRelative(cwd, target)))
      return print(`chown: cannot access '${target}'`, "err");
    print(`owner of '${target}' changed to ${owner}`);
  },
});

registerCommand({
  name: "basename",
  description: "Strip directory from a path",
  run: ({ args, print }) => print(baseName(operandsOf(args)[0] ?? "")),
});

registerCommand({
  name: "dirname",
  description: "Strip the last component from a path",
  run: ({ args, print }) => print(parentPath(operandsOf(args)[0] ?? "") || "/"),
});

registerCommand({
  name: "file",
  description: "Determine file type",
  run: ({ cwd, store, args, print }) => {
    const t = operandsOf(args)[0];
    if (!t) return print("usage: file NAME", "err");
    const node = resolvePath(store.fs, resolveRelative(cwd, t));
    if (!node) return print(`${t}: cannot open (No such file or directory)`, "err");
    if (isFolder(node)) return print(`${t}: directory`);
    const ext = t.split(".").pop()?.toLowerCase();
    const kind =
      ext === "svg" ? "SVG Scalable Vector Graphics image"
      : ext === "md" ? "Markdown document, UTF-8 text"
      : ext === "json" ? "JSON text data"
      : ext === "js" || ext === "ts" ? "JavaScript source, UTF-8 text"
      : "ASCII text";
    print(`${t}: ${kind}`);
  },
});

// -------------------------------------------------------------- system info

registerCommand({
  name: "uname",
  description: "Print system information (-a)",
  run: ({ args, print }) => {
    const kernel = "6.9.0-nexus";
    if (hasFlag(args, "-a"))
      return print(`NexusOS nexus ${kernel} #1 SMP PREEMPT_DYNAMIC ${new Date().toDateString()} wasm64 GNU/Nexus`);
    if (hasFlag(args, "-r")) return print(kernel);
    if (hasFlag(args, "-m")) return print("wasm64");
    print("NexusOS");
  },
});

registerCommand({
  name: "uptime",
  description: "Show how long the system has been running",
  run: ({ store, print }) => {
    const secs = Math.floor(performance.now() / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const load = (Math.random() * 0.8 + 0.1).toFixed(2);
    print(
      `${new Date().toLocaleTimeString()} up ${h}:${String(m).padStart(2, "0")}, 1 user (${store.settings.username}), load average: ${load}, ${load}, ${load}`,
    );
  },
});

registerCommand({
  name: "free",
  description: "Display memory usage (-h)",
  run: ({ args, print }) => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
    const usedMB = Math.round((perf.memory?.usedJSHeapSize ?? 380 * 1048576) / 1048576);
    const totalMB = Math.round((perf.memory?.jsHeapSizeLimit ?? 4096 * 1048576) / 1048576);
    const h = hasFlag(args, "-h");
    const f = (mb: number) => (h ? `${(mb / 1024).toFixed(1)}Gi` : String(mb * 1024));
    print(
      [
        "               total        used        free",
        `Mem:     ${f(totalMB).padStart(11)} ${f(usedMB).padStart(11)} ${f(totalMB - usedMB).padStart(11)}`,
        `Swap:    ${f(2048).padStart(11)} ${f(0).padStart(11)} ${f(2048).padStart(11)}`,
      ].join("\n"),
    );
  },
});

registerCommand({
  name: "hostname",
  description: "Show the system hostname",
  run: ({ print }) => print("nexus"),
});

registerCommand({
  name: "id",
  description: "Print user and group IDs",
  run: ({ store, print }) =>
    print(`uid=1000(${store.settings.username}) gid=1000(users) groups=1000(users),27(sudo),44(video),4(adm)`),
});

registerCommand({
  name: "groups",
  description: "Show group memberships",
  run: ({ print }) => print("users sudo video adm netdev"),
});

registerCommand({
  name: "env",
  description: "Print the environment",
  run: ({ cwd, store, print }) => {
    ENV.PWD = cwd;
    ENV.USER = store.settings.username;
    print(
      Object.entries(ENV)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n"),
    );
  },
});

registerCommand({
  name: "printenv",
  description: "Print one environment variable",
  run: ({ args, print }) => {
    const k = operandsOf(args)[0];
    print(k ? ENV[k] ?? "" : Object.entries(ENV).map(([a, b]) => `${a}=${b}`).join("\n"));
  },
});

registerCommand({
  name: "export",
  description: "Set an environment variable (KEY=value)",
  run: ({ args, print }) => {
    const pair = operandsOf(args)[0];
    if (!pair?.includes("=")) return print("usage: export KEY=value", "err");
    const [k, ...rest] = pair.split("=");
    ENV[k] = rest.join("=");
    print("");
  },
});

registerCommand({
  name: "alias",
  description: "List or define command aliases",
  run: ({ raw, print }) => {
    const body = raw.replace(/^alias\s*/, "").trim();
    if (!body)
      return print(
        Object.entries(ALIASES)
          .map(([k, v]) => `alias ${k}='${v}'`)
          .join("\n"),
      );
    const eq = body.indexOf("=");
    if (eq === -1) return print("usage: alias name='command'", "err");
    ALIASES[body.slice(0, eq).trim()] = body.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    print("");
  },
});

registerCommand({
  name: "unalias",
  description: "Remove a command alias",
  run: ({ args, print }) => {
    delete ALIASES[operandsOf(args)[0] ?? ""];
    print("");
  },
});

registerCommand({
  name: "which",
  description: "Locate a command",
  run: async ({ args, print }) => {
    const n = operandsOf(args)[0];
    const { getCommand } = await import("./commands");
    if (!n || !getCommand(n)) return print(`which: no ${n ?? ""} in (${ENV.PATH})`, "err");
    print(`/usr/bin/${n}`);
  },
});

registerCommand({
  name: "man",
  description: "Show the manual page for a command",
  run: async ({ args, print }) => {
    const n = operandsOf(args)[0];
    const { getCommand } = await import("./commands");
    const c = n ? getCommand(n) : undefined;
    if (!c) return print(`No manual entry for ${n ?? ""}`, "err");
    print(
      [
        `${c.name.toUpperCase()}(1)                     NEXUS Manual`,
        "",
        "NAME",
        `    ${c.name} - ${c.description}`,
        "",
        "SYNOPSIS",
        `    ${c.name} [OPTION]... [FILE]...`,
        "",
        "DESCRIPTION",
        `    ${c.description}. Part of the NEXUS coreutils.`,
      ].join("\n"),
    );
  },
});

registerCommand({
  name: "sudo",
  description: "Execute a command as the superuser",
  run: async (ctx) => {
    const ops = ctx.args;
    if (!ops.length) return ctx.print("usage: sudo <command>", "err");
    const { getCommand } = await import("./commands");
    const c = getCommand(ops[0]);
    if (!c) return ctx.print(`sudo: ${ops[0]}: command not found`, "err");
    ctx.print(`[sudo] password for ${ctx.store.settings.username}: ****`);
    await c.run({ ...ctx, args: ops.slice(1), raw: ops.join(" ") });
  },
});

registerCommand({
  name: "sleep",
  description: "Delay for a number of seconds",
  run: async ({ args, print }) => {
    const s = Math.min(parseFloat(operandsOf(args)[0] ?? "1") || 1, 10);
    await new Promise((r) => setTimeout(r, s * 1000));
    print("");
  },
});

registerCommand({
  name: "seq",
  description: "Print a sequence of numbers",
  run: ({ args, print }) => {
    const ops = operandsOf(args).map(Number);
    const [a, b] = ops.length > 1 ? ops : [1, ops[0] ?? 1];
    const out: string[] = [];
    for (let i = a; i <= b && out.length < 1000; i++) out.push(String(i));
    print(out.join("\n"));
  },
});

registerCommand({
  name: "history",
  description: "Show shell command history",
  run: ({ print }) => {
    const h = (globalThis as { __nexusHistory?: string[] }).__nexusHistory ?? [];
    print(h.map((c, i) => `${String(i + 1).padStart(5)}  ${c}`).join("\n") || "(no history)");
  },
});

registerCommand({
  name: "yes",
  description: "Repeat a string 10 times",
  run: ({ args, print }) => print(Array.from({ length: 10 }, () => operandsOf(args).join(" ") || "y").join("\n")),
});

registerCommand({
  name: "exit",
  description: "Close the terminal session",
  run: ({ store, print }) => {
    print("logout");
    setTimeout(() => store.closeApp?.("terminal"), 200);
  },
});
