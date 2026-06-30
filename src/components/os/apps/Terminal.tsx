import { useEffect, useRef, useState } from "react";
import { useOS } from "@/os/store";
import { getCommand, listCommands } from "@/os/commands";

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
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [history]);

  const prompt = `${store.settings.username}@nexus:${cwd}$`;

  const print = (text: string, kind: "out" | "err" = "out") =>
    setHistory((h) => [...h, { type: kind, text }]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    setHistory((h) => [...h, { type: "in", text: `${prompt} ${cmd}` }]);
    if (!cmd) return;
    setPast((p) => [...p, cmd]);
    const [name, ...args] = cmd.split(/\s+/);
    if (name === "clear") return setHistory([]);
    const c = getCommand(name);
    if (!c) {
      print(`${name}: command not found`, "err");
      return;
    }
    // build fresh ctx with the latest store snapshot
    void c.run({
      cwd,
      setCwd,
      store: useOS.getState(),
      print,
      args,
      raw: cmd,
    });
  };

  void listCommands;

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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          className="flex-1 bg-transparent text-zinc-100 caret-primary outline-none"
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}
