import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useOS } from "@/os/store";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const SUGGESTIONS = [
  "What can NEXUS do?",
  "List terminal commands I should try",
  "How do I create a system restore point?",
  "Open the Files app",
];

export function Assistant() {
  const notify = useOS((s) => s.notify);
  const openApp = useOS((s) => s.openApp);
  const username = useOS((s) => s.settings.username);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: "nexus-assistant",
    transport,
    messages: [] as UIMessage[],
    onError: (e) => notify({ title: "Nexus Assistant", message: e.message || "Request failed" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    void sendMessage({ text: t });
    // tiny intent shortcut
    const m = t.match(/^open\s+(\w+)/i);
    if (m) {
      const id = m[1].toLowerCase();
      const valid = ["files", "notes", "terminal", "calculator", "settings", "taskmanager", "browser", "about", "assistant", "update", "recovery", "network"];
      if (valid.includes(id)) openApp(id as never);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm">
        <Sparkles className="size-4 text-fuchsia-400" />
        <span className="font-semibold">Nexus Assistant</span>
        <span className="ml-auto text-xs text-muted-foreground">powered by Lovable AI</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto os-scroll px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-purple-600 shadow-lg">
              <Sparkles className="size-6 text-white" />
            </div>
            <p className="mb-1 text-foreground">Hi {username}, I'm Nexus.</p>
            <p>Ask me anything about NEXUS, or try a suggestion:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-border/60 bg-black/20 px-3 py-1 text-xs hover:bg-black/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const mine = m.role === "user";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 text-foreground ring-1 ring-white/10"
                  }`}
                >
                  {text || <span className="opacity-60">…</span>}
                </div>
              </div>
            );
          })}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> thinking…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 border-t border-border/60 bg-black/20 p-2.5"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Nexus…"
          disabled={busy}
          className="flex-1 rounded-lg border border-border/60 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}
