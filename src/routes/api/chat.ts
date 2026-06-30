import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Nexus, the built-in AI assistant of NEXUS — a simulated desktop operating system in the browser.

You can help users with:
- Explaining how NEXUS works (apps, terminal, file system, settings).
- Suggesting terminal commands (ps, kill, top, ls, cd, cat, ping, curl, pkg, wifi, sysupdate, restore, neofetch, etc.).
- Recommending apps to open: Files, Notes, Terminal, Calculator, Browser, Settings, Task Manager, Update Manager, Recovery, Network, About.
- Light coding help, summarising text, and general chat.

Keep replies concise and friendly. Use short paragraphs and bullet points where helpful. You're running inside the user's browser — there is no real internet or hardware behind the OS.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
