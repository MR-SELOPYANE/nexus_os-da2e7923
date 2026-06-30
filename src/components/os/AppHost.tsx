import type { WindowState } from "@/os/store";
import { Calculator } from "./apps/Calculator";
import { Notes } from "./apps/Notes";
import { Terminal } from "./apps/Terminal";
import { FileExplorer } from "./apps/FileExplorer";
import { Settings } from "./apps/Settings";
import { TaskManager } from "./apps/TaskManager";
import { Browser } from "./apps/Browser";
import { About } from "./apps/About";
import { Assistant } from "./apps/Assistant";
import { UpdateManager } from "./apps/UpdateManager";
import { Recovery } from "./apps/Recovery";
import { Network } from "./apps/Network";
import { Clock } from "./apps/Clock";
import { Media } from "./apps/Media";
import { Photos } from "./apps/Photos";
import { RecycleBin } from "./apps/RecycleBin";


export function AppHost({ win }: { win: WindowState }) {
  switch (win.appId) {
    case "calculator":
      return <Calculator />;
    case "notes":
      return <Notes winId={win.id} payload={win.payload} />;
    case "terminal":
      return <Terminal />;
    case "files":
      return <FileExplorer />;
    case "settings":
      return <Settings />;
    case "taskmanager":
      return <TaskManager />;
    case "browser":
      return <Browser payload={win.payload} />;
    case "about":
      return <About />;
    case "assistant":
      return <Assistant />;
    case "update":
      return <UpdateManager />;
    case "recovery":
      return <Recovery />;
    case "network":
      return <Network />;
    case "clock":
      return <Clock />;
    case "media":
      return <Media />;
    case "photos":
      return <Photos />;
    default:
      return null;
  }
}
