import {
  resolvePath,
  resolveRelative,
  isFolder,
  isFile,
} from "./fs";
import {
  registerCommand,
  unregisterCommand,
  listCommands,
  getCommand,
  type Command,
  type CommandContext,
} from "./registry";

export { registerCommand, unregisterCommand, listCommands, getCommand };
export type { Command, CommandContext };


// ---- Built-in commands ----------------------------------------------------

registerCommand({
  name: "help",
  description: "List available commands",
  run: ({ print }) => {
    const lines = ["Available commands:"];
    for (const c of listCommands()) {
      lines.push(`  ${c.name.padEnd(14)} ${c.description}`);
    }
    print(lines.join("\n"));
  },
});

registerCommand({
  name: "ls",
  description: "List directory contents",
  run: ({ cwd, store, args, print }) => {
    const target = args[0] ? resolveRelative(cwd, args[0]) : cwd;
    const node = resolvePath(store.fs, target);
    if (!isFolder(node)) return print(`ls: cannot access '${args[0] ?? target}'`, "err");
    const names = Object.entries(node.children)
      .map(([n, c]) => (isFolder(c) ? `${n}/` : n))
      .sort();
    print(names.join("  ") || "(empty)");
  },
});

registerCommand({
  name: "cd",
  description: "Change directory",
  run: ({ cwd, setCwd, store, args, print }) => {
    const target = args[0] ? resolveRelative(cwd, args[0]) : "/home";
    if (!isFolder(resolvePath(store.fs, target))) return print(`cd: ${args[0]}: No such directory`, "err");
    setCwd(target === "/" ? "/" : target);
  },
});

registerCommand({
  name: "pwd",
  description: "Print working directory",
  run: ({ cwd, print }) => print(cwd),
});

registerCommand({
  name: "cat",
  description: "Print file contents",
  run: ({ cwd, store, args, print }) => {
    if (!args[0]) return print("cat: missing operand", "err");
    const node = resolvePath(store.fs, resolveRelative(cwd, args[0]));
    if (!isFile(node)) return print(`cat: ${args[0]}: No such file`, "err");
    print(node.content);
  },
});

registerCommand({
  name: "echo",
  description: "Print text",
  run: ({ args, print }) => print(args.join(" ")),
});

registerCommand({
  name: "mkdir",
  description: "Create a directory",
  run: ({ cwd, store, args, print }) => {
    if (!args[0]) return print("mkdir: missing operand", "err");
    store.createFolder(resolveRelative(cwd, args[0]));
  },
});

registerCommand({
  name: "touch",
  description: "Create an empty file",
  run: ({ cwd, store, args, print }) => {
    if (!args[0]) return print("touch: missing operand", "err");
    store.writeFile(resolveRelative(cwd, args[0]), "");
  },
});

registerCommand({
  name: "write",
  description: "Write text to a file",
  run: ({ cwd, store, args, print }) => {
    if (args.length < 2) return print("usage: write <file> <text>", "err");
    store.writeFile(resolveRelative(cwd, args[0]), args.slice(1).join(" "));
    print(`wrote ${args[0]}`);
  },
});

registerCommand({
  name: "rm",
  description: "Remove a file or folder (use -f to bypass Recycle Bin)",
  run: ({ cwd, store, args, print }) => {
    const flags = args.filter((a) => a.startsWith("-"));
    const rest = args.filter((a) => !a.startsWith("-"));
    if (!rest[0]) return print("rm: missing operand", "err");
    const p = resolveRelative(cwd, rest[0]);
    if (!resolvePath(store.fs, p)) return print(`rm: ${rest[0]}: No such file`, "err");
    const permanent = flags.includes("-f") || flags.includes("-rf") || flags.includes("-fr");
    store.deleteNode(p, { permanent });
    print(permanent ? `removed ${rest[0]}` : `moved ${rest[0]} to Recycle Bin`);
  },
});


registerCommand({
  name: "tree",
  description: "Show directory tree",
  run: ({ cwd, store, print }) => {
    const lines: string[] = [];
    const walk = (path: string, depth: number) => {
      const node = resolvePath(store.fs, path);
      if (!isFolder(node)) return;
      for (const [n, c] of Object.entries(node.children)) {
        lines.push(`${"  ".repeat(depth)}${isFolder(c) ? "📁" : "📄"} ${n}`);
        if (isFolder(c)) walk(`${path}/${n}`, depth + 1);
      }
    };
    walk(cwd, 0);
    print(lines.join("\n") || "(empty)");
  },
});

registerCommand({
  name: "open",
  description: "Launch an app",
  run: ({ store, args, print }) => {
    const valid = ["files", "notes", "terminal", "calculator", "settings", "taskmanager", "browser", "about", "assistant", "update", "recovery", "network"];
    if (!args[0] || !valid.includes(args[0])) return print(`open: unknown app '${args[0] ?? ""}'`, "err");
    store.openApp(args[0] as never);
    print(`launching ${args[0]}...`);
  },
});

registerCommand({
  name: "whoami",
  description: "Print current user",
  run: ({ store, print }) => print(store.settings.username),
});

registerCommand({
  name: "date",
  description: "Print current date/time",
  run: ({ print }) => print(new Date().toString()),
});

registerCommand({
  name: "clear",
  description: "Clear the screen",
  run: () => {
    /* handled specially by terminal */
  },
});

// ---- Process & system commands -------------------------------------------

registerCommand({
  name: "ps",
  description: "List running processes",
  run: ({ store, print }) => {
    const lines = ["  PID  CPU%  MEM(MB)  STATUS    NAME"];
    for (const p of store.processes) {
      lines.push(
        `  ${String(p.pid).padStart(3)} ${String(p.cpu).padStart(5)}  ${String(p.memory).padStart(6)}  ${p.status.padEnd(8)}  ${p.name}`
      );
    }
    print(lines.join("\n"));
  },
});

registerCommand({
  name: "kill",
  description: "Terminate a process by PID",
  run: ({ store, args, print }) => {
    const pid = Number(args[0]);
    if (!pid) return print("kill: usage: kill <pid>", "err");
    const p = store.processes.find((x) => x.pid === pid);
    if (!p) return print(`kill: no such process ${pid}`, "err");
    if (p.system) return print(`kill: cannot terminate system process ${p.name}`, "err");
    store.killProcess(pid);
    print(`terminated ${p.name} (${pid})`);
  },
});

registerCommand({
  name: "top",
  description: "Show resource usage summary",
  run: ({ store, print }) => {
    const totalCpu = store.processes.reduce((a, p) => a + p.cpu, 0);
    const totalMem = store.processes.reduce((a, p) => a + p.memory, 0);
    const sorted = [...store.processes].sort((a, b) => b.cpu - a.cpu).slice(0, 8);
    const lines = [
      `Tasks: ${store.processes.length}  CPU: ${totalCpu.toFixed(1)}%  Mem: ${(totalMem / 1024).toFixed(2)} GB / 4 GB`,
      "  PID  CPU%  MEM(MB)  NAME",
      ...sorted.map(
        (p) => `  ${String(p.pid).padStart(3)} ${String(p.cpu).padStart(5)}  ${String(p.memory).padStart(6)}  ${p.name}`
      ),
    ];
    print(lines.join("\n"));
  },
});

registerCommand({
  name: "logs",
  description: "Show recent system logs",
  run: ({ store, print }) => {
    if (store.logs.length === 0) return print("(no logs)");
    print(
      store.logs
        .slice(-30)
        .map((l) => `${new Date(l.time).toLocaleTimeString()} [${l.level}] ${l.message}`)
        .join("\n")
    );
  },
});

registerCommand({
  name: "notify",
  description: "Send a notification: notify <title> <body>",
  run: ({ store, args, print }) => {
    if (args.length === 0) return print("usage: notify <title> [body...]", "err");
    store.notify({ title: args[0], message: args.slice(1).join(" ") || "(no body)" });
    print("notification sent");
  },
});

registerCommand({
  name: "ping",
  description: "Measure a real round-trip to a host",
  run: async ({ store, args, print }) => {
    const host = args[0] ?? window.location.host;
    if (!store.network.online) {
      return print(`ping: ${host}: Network is unreachable`, "err");
    }
    const url = args[0] ? `/api/public/proxy?url=${encodeURIComponent(`https://${host}`)}` : "/favicon.ico";
    const times: number[] = [];
    for (let i = 0; i < 4; i++) {
      const t0 = performance.now();
      try {
        await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}${i}`, { cache: "no-store" });
        const ms = performance.now() - t0;
        times.push(ms);
        print(`reply from ${host}: seq=${i} time=${ms.toFixed(1)} ms`);
      } catch {
        print(`request to ${host}: seq=${i} timed out`, "err");
      }
    }
    const loss = ((4 - times.length) / 4) * 100;
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    print(`--- ${host} ping statistics ---\n4 requests, ${times.length} replies, ${loss.toFixed(1)}% loss, avg ${avg.toFixed(1)} ms`);
  },
});

registerCommand({
  name: "netstat",
  description: "Show simulated network connections",
  run: ({ store, print }) => {
    if (!store.network.online) return print("netstat: no active connections (offline)");
    print(
      [
        "Proto Local Address      Foreign Address    State",
        "tcp   127.0.0.1:8080     0.0.0.0:*          LISTEN",
        "tcp   127.0.0.1:54312    nexus-cdn:443     ESTABLISHED",
        "tcp   127.0.0.1:54318    nexus-store:443   ESTABLISHED",
        "udp   0.0.0.0:53         *:*                ",
      ].join("\n")
    );
  },
});

registerCommand({
  name: "curl",
  description: "Fetch an nexus:// page",
  run: ({ store, args, print }) => {
    const url = args[0] ?? "";
    if (!url.startsWith("nexus://")) return print("curl: only nexus:// URLs are routable", "err");
    if (!store.network.online) return print("curl: (6) Could not resolve host (offline)", "err");
    print(`HTTP/1.1 200 OK\nContent-Type: text/nexus\n\n<page url="${url}">simulated content body</page>`);
  },
});

registerCommand({
  name: "wifi",
  description: "Wi-Fi: wifi <status|scan|connect <ssid>|disconnect|airplane>",
  run: async ({ store, args, print }) => {
    const [sub, ssid] = args;
    if (!sub || sub === "status") {
      const n = store.network;
      const detail = [
        n.connectionType ? `link: ${n.connectionType}` : null,
        n.downlink !== undefined ? `downlink: ${n.downlink} Mbit/s` : null,
        n.rtt !== undefined ? `rtt: ${n.rtt} ms` : null,
        `source: ${n.native ? "NetworkManager" : "browser"}`,
      ].filter(Boolean).join("\n");
      print(
        [
          n.airplane
            ? "airplane mode: on"
            : n.ssid
              ? `connected: ${n.ssid}`
              : n.online
                ? "online"
                : "offline",
          detail,
        ].join("\n")
      );
      return;
    }
    if (sub === "scan") {
      print("scanning...");
      await store.scanWifi();
      const found = store.network.networks;
      if (found.length === 0)
        return print("no networks: Wi-Fi radios are only reachable on a NEXUS device", "err");
      print(found.map((x) => `  ${x.ssid.padEnd(20)} ${"▮".repeat(x.signal)}${x.secured ? "  🔒" : ""}`).join("\n"));
      return;
    }
    if (sub === "connect") {
      if (!ssid) return print("usage: wifi connect <ssid>", "err");
      await store.connectWifi(ssid);
      print(store.network.ssid === ssid ? `connected to ${ssid}` : `wifi: could not connect to ${ssid}`);
      return;
    }
    if (sub === "disconnect") {
      store.disconnectWifi();
      print("disconnected");
      return;
    }
    if (sub === "airplane") {
      store.toggleAirplane();
      print(`airplane mode ${store.network.airplane ? "on" : "off"}`);
      return;
    }
    print("usage: wifi <status|scan|connect <ssid>|disconnect|airplane>");
  },
});

registerCommand({
  name: "sysupdate",
  description: "System update: sysupdate <check|install|apply|status>",
  run: async ({ store, args, print }) => {
    const sub = args[0] ?? "status";
    if (sub === "check") {
      print("checking for updates...");
      await store.checkForUpdates();
      const u = store.update;
      if (u.status === "available" && u.available)
        print(`update available: NEXUS ${u.available.version} (${u.available.size})`);
      else print(`NEXUS ${u.currentVersion} is up to date`);
      return;
    }
    if (sub === "install") {
      if (!store.update.available) return print("sysupdate: no update pending; run `sysupdate check` first", "err");
      print("installing... (see Update Manager for progress)");
      await store.installUpdate();
      print("install complete; run `sysupdate apply` to restart");
      return;
    }
    if (sub === "apply") {
      if (store.update.status !== "ready") return print("sysupdate: nothing to apply", "err");
      store.applyUpdate();
      return;
    }
    const u = store.update;
    print(`current: ${u.currentVersion} · status: ${u.status}${u.available ? ` · available: ${u.available.version}` : ""}`);
  },
});

registerCommand({
  name: "restore",
  description: "Restore points: restore <list|create [name]|apply <id>>",
  run: ({ store, args, print }) => {
    const [sub, ...rest] = args;
    if (!sub || sub === "list") {
      if (store.restorePoints.length === 0) return print("(no restore points)");
      print(store.restorePoints.map((p) => `  ${p.id.slice(0, 6)}  ${new Date(p.time).toLocaleString().padEnd(22)}  ${p.name}`).join("\n"));
      return;
    }
    if (sub === "create") {
      store.createRestorePoint(rest.join(" "));
      print("restore point created");
      return;
    }
    if (sub === "apply") {
      const id = rest[0];
      const p = store.restorePoints.find((x) => x.id.startsWith(id ?? ""));
      if (!p) return print(`restore: no such point '${id}'`, "err");
      store.restoreToPoint(p.id);
      print(`restored: ${p.name}`);
      return;
    }
    print("usage: restore <list|create [name]|apply <id>>");
  },
});

registerCommand({
  name: "ai",
  description: "Open the Nexus Assistant",
  run: ({ store, print }) => {
    store.openApp("assistant" as never);
    print("opening Nexus Assistant...");
  },
});

registerCommand({
  name: "neofetch",
  description: "System information",
  run: ({ store, print }) => {
    print(
      [
        `       ▲       ${store.settings.username}@nexus`,
        `      ▲▲▲      -----------------`,
        `     ▲▲▲▲▲     OS: NEXUS 1.0.0`,
        `    ▲▲▲▲▲▲▲    Shell: nexus-sh`,
        `   ▲▲▲▲▲▲▲▲▲   Theme: Nexus Glass`,
        `               Procs: ${store.processes.length}`,
      ].join("\n")
    );
  },
});

// ---- Package manager (virtual) -------------------------------------------

registerCommand({
  name: "pkg",
  description: "Virtual package manager: pkg <list|install|uninstall> [name]",
  run: ({ store, args, print }) => {
    const [sub, name] = args;
    if (sub === "list") {
      if (store.packages.length === 0) return print("(no packages installed)");
      print(store.packages.map((p) => `  ${p.name.padEnd(16)} v${p.version}`).join("\n"));
      return;
    }
    if (sub === "install") {
      if (!name) return print("pkg: missing package name", "err");
      if (store.packages.some((p) => p.name === name))
        return print(`pkg: ${name} is already installed`);
      store.installPackage({ name, version: "1.0.0" });
      print(`installed ${name} v1.0.0`);
      return;
    }
    if (sub === "uninstall") {
      if (!name) return print("pkg: missing package name", "err");
      if (!store.packages.some((p) => p.name === name))
        return print(`pkg: ${name} is not installed`, "err");
      store.uninstallPackage(name);
      print(`uninstalled ${name}`);
      return;
    }
    print("usage: pkg <list|install|uninstall> [name]");
  },
});

// ---- Easter eggs ----------------------------------------------------------

registerCommand({
  name: "fortune",
  description: "Print a fortune",
  run: ({ print }) => {
    const fortunes = [
      "The best way to predict the future is to invent it.",
      "Talk is cheap. Show me the code.",
      "Stay hungry. Stay foolish.",
      "There is no place like 127.0.0.1.",
      "It works on my machine.",
    ];
    print(fortunes[Math.floor(Math.random() * fortunes.length)]);
  },
});

registerCommand({
  name: "cowsay",
  description: "An ASCII cow says something",
  run: ({ args, print }) => {
    const msg = args.join(" ") || "moo";
    const bar = "-".repeat(msg.length + 2);
    print(
      [
        ` ${bar}`,
        `< ${msg} >`,
        ` ${bar}`,
        "        \\   ^__^",
        "         \\  (oo)\\_______",
        "            (__)\\       )\\/\\",
        "                ||----w |",
        "                ||     ||",
      ].join("\n")
    );
  },
});

// Real GNU/Linux userland commands (side-effect registration).
import "./commands-unix";
