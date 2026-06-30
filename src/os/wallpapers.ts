import auroraDusk from "@/assets/aurora-dusk.png.asset.json";

export const WALLPAPERS: { id: string; name: string; gradient: string }[] = [
  { id: "dusk", name: "Dusk Ridge", gradient: `url("${auroraDusk.url}") center/cover no-repeat, #0b1722` },
  { id: "nexus", name: "Nexus", gradient: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 40%,#06b6d4 100%)" },
  { id: "sunset", name: "Sunset", gradient: "linear-gradient(135deg,#0c0a09 0%,#7c2d12 50%,#f59e0b 100%)" },
  { id: "midnight", name: "Midnight", gradient: "linear-gradient(135deg,#020617 0%,#1e1b4b 100%)" },
  { id: "forest", name: "Forest", gradient: "linear-gradient(135deg,#022c22 0%,#065f46 50%,#34d399 100%)" },
  { id: "rose", name: "Rose", gradient: "linear-gradient(135deg,#1a0a14 0%,#831843 50%,#fb7185 100%)" },
];
