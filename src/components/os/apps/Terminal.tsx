import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { listCommands } from "@/os/commands";
import { execLine } from "@/os/shell";
import {
  detectNativeShell,
  resetNativeProbe,
  runNative,
  type NativeInfo,
} from "@/os/native-shell";

interface Line {
  type: "in" | "out" | "err";
  text: string;
}

const BANNER = `NEXUS Terminal v1.0.0 — type 'help' for commands`;

export function Terminal() {
  const store = useOS();
  const [cwd, setCwd] = useState("/home");
  const [history, setHistory] = useState<Line[]>([{ type: "out", text: BANNER }]);
  const [input, setInput] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [pastIdx, setPastIdx] = useState(-1);
  const [native, setNative] = useState<NativeInfo | null>(null);
  const [useNative, setUseNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [history]);

  // Detect a real shell on the device (only present on the booted NEXUS OS).
  useEffect(() => {
    let alive = true;
    void detectNativeShell().then((info) => {
      if (!alive) return;
      setNative(info);
      if (info.available) {
        setUseNative(true);
        setCwd(info.home || "/home/nexus");
        setHistory((h) => [
          ...h,
          {
            type: "out",
            text: `real shell detected: ${info.shell || "bash"} on ${info.os || "Linux"} (${info.kernel || "kernel"})\nrunning real Linux commands — 'native off' switches back to the simulated userland`,
          },
        ]);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const host = useNative && native?.host ? native.host : "nexus";
  const user = useNative && native?.user ? native.user : store.settings.username;
  const prompt = `${user}@${host}:${cwd}${useNative && user === "root" ? "#" : "$"}`;

  const print = (text: string, kind: "out" | "err" = "out") =>
    setHistory((h) => [...h, { type: kind, text }]);

  const runRealShell = async (cmd: string) => {
    setBusy(true);
    try {
      const res = await runNative(cmd, cwd);
      if (res.stdout) print(res.stdout.replace(/\n$/, ""));
      if (res.stderr) print(res.stderr.replace(/\n$/, ""), "err");
      if (res.truncated) print("[output truncated]", "err");
      if (res.timedOut) print("[command timed out]", "err");
      if (res.cwd && res.cwd !== cwd) setCwd(res.cwd);
    } catch (err) {
      print(`shell bridge error: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      setBusy(false);
    }
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    setHistory((h) => [...h, { type: "in", text: `${prompt} ${cmd}` }]);
    if (!cmd) return;
    setPast((p) => [...p, cmd]);

    // Bridge control commands work in both modes.
    if (cmd === "native" || cmd.startsWith("native ")) {
      const arg = cmd.slice(6).trim();
      if (arg === "off") {
        setUseNative(false);
        setCwd("/home");
        print("switched to the simulated NEXUS userland");
      } else if (arg === "on") {
        resetNativeProbe();
        void detectNativeShell().then((info) => {
          setNative(info);
          if (info.available) {
            setUseNative(true);
            setCwd(info.home || "/home/nexus");
            print(`switched to the real shell (${info.shell || "bash"})`);
          } else {
            print(`no real shell available here (${info.reason || "unreachable"})`, "err");
          }
        });
      } else {
        print(
          useNative
            ? `native: on — ${native?.shell || "bash"} on ${native?.os || "Linux"}`
            : `native: off — simulated userland${native?.available ? " (real shell available: 'native on')" : ""}`,
        );
      }
      return;
    }

    if (useNative) {
      if (cmd === "clear") {
        setHistory([]);
        return;
      }
      void runRealShell(cmd);
      return;
    }

    void execLine(cmd, {
      cwd,
      setCwd,
      getStore: () => useOS.getState(),
      print,
      clear: () => setHistory([]),
    });
  };



  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(input);
      setInput("");
      setPastIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (past.length === 0) return;
      const idx = pastIdx === -1 ? past.length - 1 : Math.max(0, pastIdx - 1);
      setPastIdx(idx);
      setInput(past[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (pastIdx === -1) return;
      const idx = pastIdx + 1;
      if (idx >= past.length) {
        setPastIdx(-1);
        setInput("");
      } else {
        setPastIdx(idx);
        setInput(past[idx]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (useNative) return; // the real shell owns completion
      const matches = listCommands().filter((c) => c.name.startsWith(input));
      if (matches.length === 1) setInput(matches[0].name + " ");
      else if (matches.length > 1) print(matches.map((m) => m.name).join("  "));
    }
  };

  return (
    <div
      className="h-full overflow-y-auto bg-[#0c1118] p-3 font-mono text-[13px] leading-relaxed os-scroll"
      onClick={() => inputRef.current?.focus()}
    >
      {history.map((l, i) => (
        <div
          key={i}
          className={
            l.type === "err"
              ? "whitespace-pre-wrap text-rose-400"
              : l.type === "in"
                ? "whitespace-pre-wrap text-primary"
                : "whitespace-pre-wrap text-zinc-300"
          }
        >
          {l.text}
        </div>
      ))}
      <div className="flex">
        <span className="shrink-0 text-primary">{prompt}&nbsp;</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          className="flex-1 bg-transparent text-zinc-100 caret-primary outline-none disabled:opacity-60"
        />
      </div>
      {busy && <div className="text-zinc-500">…running</div>}
      <div ref={endRef} />
    </div>
  );
}
