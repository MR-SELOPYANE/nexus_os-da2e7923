import { useOS } from "@/os/store";
import { Wifi, WifiOff, Plane, Lock, RefreshCw, Loader2 } from "lucide-react";

function SignalBars({ level }: { level: number }) {
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-sm ${i <= level ? "bg-foreground" : "bg-foreground/20"}`}
          style={{ height: `${i * 3 + 3}px` }}
        />
      ))}
    </div>
  );
}

export function Network() {
  const network = useOS((s) => s.network);
  const toggleAirplane = useOS((s) => s.toggleAirplane);
  const scan = useOS((s) => s.scanWifi);
  const connect = useOS((s) => s.connectWifi);
  const disconnect = useOS((s) => s.disconnectWifi);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm">
        {network.online ? (
          <Wifi className="size-4 text-emerald-400" />
        ) : (
          <WifiOff className="size-4 text-muted-foreground" />
        )}
        <span className="font-semibold">Network</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {network.airplane
            ? "Airplane mode"
            : network.ssid
              ? `Connected · ${network.ssid}`
              : "Not connected"}
        </span>
      </div>

      <div className="border-b border-border/60 p-4">
        <button
          onClick={toggleAirplane}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
            network.airplane
              ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
              : "border-border/60 bg-black/20 hover:bg-white/5"
          }`}
        >
          <span className="flex items-center gap-2">
            <Plane className="size-4" /> Airplane mode
          </span>
          <span
            className={`grid h-5 w-9 place-items-end rounded-full p-0.5 transition-colors ${
              network.airplane ? "bg-amber-400/60" : "bg-white/20"
            }`}
          >
            <span
              className={`size-4 rounded-full bg-white transition-transform ${
                network.airplane ? "translate-x-0" : "-translate-x-4"
              }`}
            />
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 text-sm">
        <h3 className="font-semibold">Available networks</h3>
        <button
          onClick={() => void scan()}
          disabled={network.airplane || network.scanning}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
        >
          {network.scanning ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Scan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto os-scroll p-3">
        {network.airplane ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Airplane mode is on. Turn it off to see networks.
          </p>
        ) : (
          <ul className="space-y-1">
            {network.networks.map((n) => {
              const active = n.ssid === network.ssid;
              return (
                <li
                  key={n.ssid}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    active ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-white/5"
                  }`}
                >
                  <SignalBars level={n.signal} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 truncate font-medium">
                      {n.ssid}
                      {n.secured && <Lock className="size-3 text-muted-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {active ? "Connected" : n.secured ? "Secured" : "Open"}
                    </div>
                  </div>
                  {active ? (
                    <button
                      onClick={disconnect}
                      className="rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-white/5"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connect(n.ssid)}
                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:brightness-110"
                    >
                      Connect
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
