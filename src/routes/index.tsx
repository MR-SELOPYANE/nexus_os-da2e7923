import { createFileRoute } from "@tanstack/react-router";
import { OSRoot } from "@/components/os/OSRoot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS — A Web-Based Operating System" },
      {
        name: "description",
        content:
          "NEXUS is a simulated operating system in your browser: window manager, virtual file system, terminal, and built-in apps.",
      },
      { property: "og:title", content: "NEXUS — A Web-Based Operating System" },
      {
        property: "og:description",
        content: "A fully simulated desktop OS with windows, a terminal, and a virtual file system.",
      },
    ],
  }),
  component: OSRoot,
});
