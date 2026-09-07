import { useEffect, useState } from "react";
import {
  BatteryCharging,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  Bluetooth,
  RefreshCw,
  Cpu,
  Loader2,
} from "lucide-react";
import {
  hostHw,
  useNativePoll,
  useNativeSystem,
  type HwStatus,
  type WifiNetwork,
} from "@/os/native-system";

/** Real hardware control: UPower battery, brightness, PipeWire volume, Wi-Fi, Bluetooth. */
export function DeviceCenter() {
  const native = useNativeSystem();
  const available = Boolean(native?.available);
  const status = useNativePoll<HwStatus>(available, () => hostHw.status(), 5000);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(80);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    if (status?.brightness) setBrightness(status.brightness.percent);
    if (status?.volume) setVolume(status.volume.percent);
  }, [status?.brightness?.percent, status?.volume?.percent]);

  const scan = async () => {
    setScanning(true);
    try {
      setNetworks(await hostHw.wifi());
    } catch {
      /* ignore */
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (available && native?.capabilities?.wifi) void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (!available) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-card p-8 text-center">
        <Cpu className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Hardware control is device-only</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Battery, brightness, audio, Wi-Fi and Bluetooth are wired to UPower, brightnessctl, PipeWire,
          NetworkManager and BlueZ. They come alive when NEXUS runs as the desktop session on the ISO.
        </p>
      </div>
    );
  }

  const caps = native?.capabilities;

  return (
    <div className="os-scroll h-full space-y-4 overflow-y-auto bg-card p-4">
      <section className="rounded-xl border border-glass-border bg-black/20 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BatteryCharging className="size-4 text-emerald-400" /> Power
        </h2>
        {status?.battery ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{status.battery.state}</span>
              <span className="tabular-nums">{status.battery.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${status.battery.percent < 20 ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${status.battery.percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {status.battery.timeToEmpty
                ? `${status.battery.timeToEmpty} remaining`
                : status.battery.timeToFull
                  ? `${status.battery.timeToFull} until full`
                  : "On AC power"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No battery detected (desktop or VM).</p>
        )}
      </section>

      <section className="rounded-xl border border-glass-border bg-black/20 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sun className="size-4 text-amber-400" /> Display brightness
        </h2>
        {caps?.brightness ? (
          <input
            type="range"
            min={5}
            max={100}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            onPointerUp={() => hostHw.setBrightness(brightness)}
            className="w-full accent-primary"
          />
        ) : (
          <p className="text-xs text-muted-foreground">brightnessctl not installed.</p>
        )}
      </section>

      <section className="rounded-xl border border-glass-border bg-black/20 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          {status?.volume?.muted ? (
            <VolumeX className="size-4 text-rose-400" />
          ) : (
            <Volume2 className="size-4 text-sky-400" />
          )}
          Audio (PipeWire)
        </h2>
        {caps?.volume ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => hostHw.setVolume(volume, !status?.volume?.muted)}
              className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            >
              {status?.volume?.muted ? "Unmute" : "Mute"}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              onPointerUp={() => hostHw.setVolume(volume)}
              className="flex-1 accent-primary"
            />
            <span className="w-10 text-right text-xs tabular-nums">{volume}%</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">wpctl (PipeWire) not available.</p>
        )}
      </section>

      <section className="rounded-xl border border-glass-border bg-black/20 p-4">
        <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Wifi className="size-4 text-primary" /> Wi-Fi
          </span>
          <button onClick={scan} className="rounded p-1 text-muted-foreground hover:bg-white/10">
            <RefreshCw className={`size-4 ${scanning ? "animate-spin" : ""}`} />
          </button>
        </h2>
        {caps?.wifi ? (
          <div className="space-y-1">
            {networks.map((n) => (
              <button
                key={n.ssid}
                disabled={connecting !== null}
                onClick={async () => {
                  const password =
                    n.security && n.security !== "Open" ? prompt(`Password for ${n.ssid}`) : "";
                  if (password === null) return;
                  setConnecting(n.ssid);
                  const res = await hostHw.wifiConnect(n.ssid, password || undefined);
                  setConnecting(null);
                  if (!res.ok) alert(res.error || "Connection failed");
                  void scan();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10 ${n.active ? "bg-primary/15" : ""}`}
              >
                <Wifi className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{n.ssid}</span>
                {connecting === n.ssid && <Loader2 className="size-3.5 animate-spin" />}
                <span className="text-[11px] text-muted-foreground">{n.security || "Open"}</span>
                <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                  {n.signal}%
                </span>
              </button>
            ))}
            {networks.length === 0 && (
              <p className="text-xs text-muted-foreground">No networks found yet.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">NetworkManager not available.</p>
        )}
        {status?.network && status.network.length > 0 && (
          <div className="mt-3 space-y-0.5 border-t border-white/10 pt-2 text-[11px] text-muted-foreground">
            {status.network.map((d) => (
              <div key={d.device} className="flex justify-between">
                <span>
                  {d.device} · {d.type}
                </span>
                <span>{d.connection ?? d.state}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-glass-border bg-black/20 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Bluetooth className="size-4 text-sky-400" /> Bluetooth
        </h2>
        {caps?.bluetooth && status?.bluetooth ? (
          <>
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => hostHw.bluetooth({ powered: !status.bluetooth?.powered })}
                className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              >
                {status.bluetooth.powered ? "Turn off" : "Turn on"}
              </button>
              <button
                onClick={() => hostHw.bluetooth({ scan: true })}
                className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              >
                Scan
              </button>
            </div>
            <div className="space-y-1">
              {status.bluetooth.devices.map((d) => (
                <div
                  key={d.mac}
                  className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/5"
                >
                  <span className="flex-1 truncate">{d.name}</span>
                  <button
                    onClick={() => hostHw.bluetooth({ connect: d.mac })}
                    className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    connect
                  </button>
                  <button
                    onClick={() => hostHw.bluetooth({ disconnect: d.mac })}
                    className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  >
                    disconnect
                  </button>
                </div>
              ))}
              {status.bluetooth.devices.length === 0 && (
                <p className="text-xs text-muted-foreground">No paired devices.</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">BlueZ not available.</p>
        )}
      </section>
    </div>
  );
}
