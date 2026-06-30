import { useEffect, useRef } from "react";
import {
  RefreshCw,
  FolderPlus,
  FilePlus,
  Image,
  TerminalSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import { useOS } from "@/os/store";

interface Props {
  x: number;
  y: number;
  onClose: () => void;
}

export function DesktopContextMenu({ x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const openApp = useOS((s) => s.openApp);
  const createFolder = useOS((s) => s.createFolder);
  const writeFile = useOS((s) => s.writeFile);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const item = (icon: React.ReactNode, label: string, onClick: () => void, accent?: boolean) => (
    <button
      key={label}
      onClick={() => {
        onClick();
        onClose();
      }}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-white/10 ${
        accent ? "text-primary" : "text-foreground"
      }`}
    >
      <span className="grid size-4 place-items-center text-muted-foreground">{icon}</span>
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute z-[10000] w-56 rounded-xl glass-strong p-1.5 shadow-[var(--shadow-window)]"
      style={{ left: Math.min(x, window.innerWidth - 240), top: Math.min(y, window.innerHeight - 320) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {item(<RefreshCw className="size-4" />, "Refresh", () => window.location.reload())}
      <div className="my-1 h-px bg-glass-border" />
      {item(
        <FolderPlus className="size-4" />,
        "New folder",
        () => {
          const name = prompt("Folder name:");
          if (name) createFolder(`/home/Desktop/${name}`);
        }
      )}
      {item(
        <FilePlus className="size-4" />,
        "New text file",
        () => {
          const name = prompt("File name:", "untitled.txt");
          if (name) {
            writeFile(`/home/Desktop/${name}`, "");
            openApp("notes", { path: `/home/Desktop/${name}` });
          }
        }
      )}
      <div className="my-1 h-px bg-glass-border" />
      {item(<TerminalSquare className="size-4" />, "Open Terminal here", () => openApp("terminal"))}
      {item(<Image className="size-4" />, "Change wallpaper", () => openApp("settings"))}
      {item(<SettingsIcon className="size-4" />, "Personalize", () => openApp("settings"), true)}
    </div>
  );
}
