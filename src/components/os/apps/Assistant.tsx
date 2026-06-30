import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Loader2, Mic, MicOff, Volume2, VolumeX, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOS } from "@/os/store";
import { executeAssistantTool } from "@/lib/assistant-runtime";
import { speak, stopSpeaking, useSpeechRecognition } from "@/lib/voice";

const SUGGESTIONS = [
  "Open Files and read welcome.txt",
  "Take a screenshot",
  "What's open right now?",
  "Set wallpaper to forest",
];

const STORAGE_KEY = "nexus.assistant.history.v1";

function loadHistory(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function Assistant() {
  const notify = useOS((s) => s.notify);
  const username = useOS((s) => s.settings.username);
  const openWindows = useOS((s) => s.windows);

  const [input, setInput] = useState("");
  const [voiceOut, setVoiceOut] = useState(true);
  const [initialMessages] = useState<UIMessage[]>(() => loadHistory());
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenIds = useRef<Set<string>>(new Set());

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            id,
            messages,
            ...body,
            context: {
              username,
              time: new Date().toLocaleString(),
              openApps: openWindows.map((w) => w.appId),
            },
          },
        }),
      }),
    [username, openWindows],
  );

  const { messages, sendMessage, status, error, addToolResult } = useChat({
    id: "nexus-assistant",
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (e) => notify({ title: "Nexus Assistant", message: e.message || "Request failed" }),
    onToolCall: async ({ toolCall }) => {
      const output = await executeAssistantTool({
        name: toolCall.toolName,
        input: toolCall.input as Record<string, unknown>,
      });
      addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output,
      });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Voice input
  const { supported: micSupported, listening, transcript, start, stop } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Speak finished assistant messages once
  useEffect(() => {
    if (!voiceOut || status === "streaming") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (spokenIds.current.has(last.id)) return;
    const text = last.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (text) {
      spokenIds.current.add(last.id);
      speak(text);
    }
  }, [messages, status, voiceOut]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    stopSpeaking();
    void sendMessage({ text: t });
  };

  const toggleMic = () => {
    if (listening) {
      stop();
      if (input.trim()) submit(input);
    } else {
      stopSpeaking();
      start();
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm">
        <Sparkles className="size-4 text-fuchsia-400" />
        <span className="font-semibold">Nexus Assistant</span>
        <span className="ml-auto flex items-center gap-1">
          <button
            onClick={() => {
              setVoiceOut((v) => !v);
              if (voiceOut) stopSpeaking();
            }}
            title={voiceOut ? "Mute voice output" : "Enable voice output"}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            {voiceOut ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>
          <span className="text-xs text-muted-foreground">Lovable AI</span>
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto os-scroll px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-purple-600 shadow-lg">
              <Sparkles className="size-6 text-white" />
            </div>
            <p className="mb-1 text-foreground">At your service, {username}.</p>
            <p>I can run commands, open apps, and manage your files. Try one:</p>
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
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
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
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            title={listening ? "Stop listening" : "Hold or click to talk"}
            className={`grid size-9 place-items-center rounded-lg ${
              listening
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
        )}
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "Listening…" : "Ask Nexus, or hit the mic…"}
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

function MessageBubble({ message }: { message: UIMessage }) {
  const mine = message.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] space-y-1 rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          mine
            ? "bg-primary text-primary-foreground"
            : "bg-white/5 text-foreground ring-1 ring-white/10"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return mine ? (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : (
              <div key={i} className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:bg-black/40">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              </div>
            );
          }
          // Tool calls / results
          if (part.type?.startsWith?.("tool-")) {
            const t = part as unknown as {
              type: string;
              state?: string;
              input?: unknown;
              output?: unknown;
            };
            const toolName = t.type.replace(/^tool-/, "");
            const done = t.state === "output-available";
            return (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-muted-foreground"
              >
                <Wrench className="mt-0.5 size-3 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">
                    {done ? "✓" : "…"} {toolName}
                  </div>
                  {done && typeof t.output === "string" && t.output.length > 0 && (
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] opacity-80">
                      {t.output}
                    </pre>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
