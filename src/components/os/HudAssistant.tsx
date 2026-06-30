import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Mic, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useOS } from "@/os/store";
import { executeAssistantTool } from "@/lib/assistant-runtime";
import { speak, stopSpeaking, useSpeechRecognition } from "@/lib/voice";

/**
 * A floating, always-on-top Jarvis-style HUD that lets the user talk to
 * Nexus without opening the full Assistant window. Toggle from the taskbar
 * (or click the orb at the bottom-right edge).
 */
export function HudAssistant({ onClose }: { onClose: () => void }) {
  const username = useOS((s) => s.settings.username);
  const openWindows = useOS((s) => s.windows);
  const notify = useOS((s) => s.notify);
  const [input, setInput] = useState("");
  const spokenIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

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
    id: "nexus-hud",
    transport,
    messages: [] as UIMessage[],
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (e) => notify({ title: "Nexus HUD", message: e.message || "Request failed" }),
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
  const { supported: micSupported, listening, transcript, start, stop } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (status === "streaming") return;
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
  }, [messages, status]);

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
    <div className="pointer-events-none fixed inset-0 z-[10001] flex items-end justify-end p-6">
      <div className="pointer-events-auto flex w-[380px] flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-black/70 shadow-[0_0_60px_rgba(34,211,238,0.25)] backdrop-blur-xl">
        {/* Header / orb */}
        <div className="flex items-center gap-3 border-b border-cyan-400/20 px-4 py-3">
          <div
            className={`relative grid size-10 place-items-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/20 ${
              busy || listening ? "animate-pulse" : ""
            }`}
          >
            <Sparkles className="size-5 text-cyan-200" />
            {(busy || listening) && (
              <span className="absolute inset-0 animate-ping rounded-full border border-cyan-300/40" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-cyan-100">NEXUS</p>
            <p className="text-[11px] uppercase tracking-widest text-cyan-300/70">
              {listening ? "Listening" : busy ? "Working" : "Standing by"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-md text-cyan-200/70 hover:bg-white/10 hover:text-cyan-100"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="max-h-72 min-h-[80px] flex-1 overflow-y-auto os-scroll px-4 py-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-cyan-200/60">
              At your service, {username}. Tap the mic and tell me what to do.
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const tools = m.parts.filter((p) => p.type?.startsWith?.("tool-"));
                if (!text && tools.length === 0) return null;
                const mine = m.role === "user";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-xl px-3 py-1.5 text-[13px] leading-snug ${
                        mine
                          ? "bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-300/30"
                          : "bg-white/5 text-cyan-50/90 ring-1 ring-white/10"
                      }`}
                    >
                      {mine ? (
                        <p className="whitespace-pre-wrap">{text}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || "…"}</ReactMarkdown>
                        </div>
                      )}
                      {tools.length > 0 && (
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-cyan-300/70">
                          {tools.length} action{tools.length !== 1 ? "s" : ""} executed
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {error && (
                <p className="text-center text-[11px] text-rose-300">{error.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 border-t border-cyan-400/20 bg-black/40 p-2"
        >
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              className={`grid size-8 place-items-center rounded-full ${
                listening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
              }`}
            >
              <Mic className="size-4" />
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : "Speak to Nexus…"}
            disabled={busy}
            className="flex-1 rounded-md border border-cyan-400/20 bg-black/50 px-3 py-1.5 text-sm text-cyan-50 outline-none placeholder:text-cyan-300/40 focus:border-cyan-300/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="grid size-8 place-items-center rounded-full bg-cyan-400 text-black disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

/** The floating button that toggles the HUD. */
export function HudLauncher({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Summon Nexus"
      className={`fixed bottom-[88px] right-5 z-[10000] grid size-12 place-items-center rounded-full border border-cyan-300/50 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/20 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.35)] backdrop-blur-md transition hover:scale-105 ${
        active ? "ring-2 ring-cyan-300" : ""
      }`}
    >
      <Sparkles className="size-5" />
    </button>
  );
}
