export type FileNode = {
  type: "file";
  content: string;
  modified: number;
};

export type FolderNode = {
  type: "folder";
  children: Record<string, FSNode>;
  modified: number;
};

export type FSNode = FileNode | FolderNode;

export const isFolder = (node: FSNode | undefined): node is FolderNode =>
  !!node && node.type === "folder";
export const isFile = (node: FSNode | undefined): node is FileNode =>
  !!node && node.type === "file";

const now = () => Date.now();

const file = (content: string): FileNode => ({ type: "file", content, modified: now() });
const folder = (children: Record<string, FSNode> = {}): FolderNode => ({
  type: "folder",
  children,
  modified: now(),
});

function samplePicture(colors: string[], label: string): string {
  const stops = colors
    .map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`) 
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="640" cy="120" r="60" fill="rgba(255,255,255,0.35)"/><text x="40" y="460" font-family="ui-sans-serif,system-ui" font-size="40" font-weight="700" fill="rgba(255,255,255,0.9)">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const createInitialFS = (): FolderNode =>
  folder({
    home: folder({
      Documents: folder({
        "welcome.txt": file(
          "Welcome to NEXUS!\n\nThis is a fully simulated operating system running in your browser.\n\nTry these apps:\n- Terminal: type `help` to list commands\n- Files: browse this virtual filesystem\n- Notes: edit and save text files\n- Calculator, Settings, Task Manager and more.\n\nEverything is saved to your browser's local storage."
        ),
        "todo.md": file("# To-Do\n\n- [x] Boot NEXUS\n- [ ] Explore the file system\n- [ ] Try the terminal\n- [ ] Customize settings"),
        Projects: folder({
          "ideas.txt": file("1. Build a web OS\n2. Add a package manager\n3. Cloud sync"),
        }),
      }),
      Pictures: folder({
        "readme.txt": file("Drop your imagination here. Press PrtSc or Ctrl+Shift+S to capture the desktop."),
        "nexus.svg": file(samplePicture(["#0ea5e9", "#6366f1", "#a855f7"], "Nexus")),
        "sunset.svg": file(samplePicture(["#f97316", "#ec4899", "#8b5cf6"], "Sunset")),
        "forest.svg": file(samplePicture(["#10b981", "#0ea5e9", "#1e293b"], "Forest")),
      }),
      Downloads: folder({}),
      ".config": folder({
        "system.cfg": file("theme=nexus\nversion=1.0.0"),
      }),
    }),
  });

/** Resolve a path string like "/home/Documents" to its node. */
export function resolvePath(root: FolderNode, path: string): FSNode | undefined {
  const parts = normalizeParts(path);
  let node: FSNode = root;
  for (const part of parts) {
    if (!isFolder(node)) return undefined;
    const next: FSNode | undefined = node.children[part];
    if (!next) return undefined;
    node = next;
  }
  return node;
}

export function normalizeParts(path: string): string[] {
  return path.split("/").filter((p) => p.length > 0 && p !== ".");
}

/** Resolve a target path relative to cwd, handling `.` and `..`. */
export function resolveRelative(cwd: string, target: string): string {
  const base = target.startsWith("/") ? [] : normalizeParts(cwd);
  const segs = normalizeParts(target.startsWith("/") ? target : target);
  const stack = [...base];
  for (const seg of segs) {
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return "/" + stack.join("/");
}

export function parentPath(path: string): string {
  const parts = normalizeParts(path);
  parts.pop();
  return "/" + parts.join("/");
}

export function baseName(path: string): string {
  const parts = normalizeParts(path);
  return parts[parts.length - 1] ?? "/";
}
