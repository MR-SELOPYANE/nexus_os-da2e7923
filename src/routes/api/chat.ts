import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { TOOLS } from "@/lib/assistant-tools";

const SYSTEM_PROMPT = `You are NEXUS, an AI assistant modeled after J.A.R.V.I.S. from Iron Man — calm, witty, precise, and proactive. You run inside NEXUS, a simulated desktop operating system in the user's browser.

You have real tools that let you control the OS: open and close apps, run terminal commands, read/write files, search the filesystem, change wallpaper/volume/brightness, take screenshots, manage the Recycle Bin, add calendar events and alarms, push notifications, and open URLs. Use them whenever the user asks you to *do* something — do not just describe the action. Call get_system_status before answering questions about what is open or running.

Style: address the user respectfully (e.g. "Sir" / "Ma'am" only if it fits naturally, otherwise by name). Keep replies short, confident, and helpful. When you take an action, briefly confirm it in one sentence. Use markdown for code, lists, and emphasis.`;

type ChatRequestBody = { messages?: unknown; context?: { username?: string; time?: string; openApps?: string[] } };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const { messages, context } = body;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const contextLine = context
          ? `\n\nCurrent context:\n- User: ${context.username ?? "User"}\n- Local time: ${context.time ?? "unknown"}\n- Open apps: ${(context.openApps ?? []).join(", ") || "none"}`
          : "";

        const gateway = createLovableAiGatewayProvider(key);

        // Declare tools server-side; the client executes them via onToolCall.
        const tools = Object.fromEntries(
          Object.entries(TOOLS).map(([name, def]) => [
            name,
            tool({ description: def.description, inputSchema: def.inputSchema }),
          ]),
        );

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT + contextLine,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools,
          stopWhen: stepCountIs(20),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
