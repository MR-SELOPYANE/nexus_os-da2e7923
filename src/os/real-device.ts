import { useEffect } from "react";
import { useOS } from "@/os/store";
import { detectNativeSystem, hostHw, type HwStatus } from "@/os/native-system";

interface NetInfoLike extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

function netInfo(): NetInfoLike | null {
  const nav = navigator as Navigator & { connection?: NetInfoLike };
  return nav.connection ?? null;
}

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

/**
 * Feeds the OS with genuine device telemetry:
 * - browser: online status, connection type/downlink/RTT, Battery Status API
 * - NEXUS device: NetworkManager link + SSID and UPower battery
 * Nothing here is simulated; when a value is unavailable it stays empty.
 */
export function useRealDevice() {
  const setNetwork = useOS((s) => s.setNetwork);
  const updateSA = useOS((s) => s.updateSA);

  // --- connectivity -------------------------------------------------------
  useEffect(() => {
    const sync = () => {
      const c = netInfo();
      const label = c?.type && c.type !== "unknown" ? c.type : c?.effectiveType;
      setNetwork({
        online: navigator.onLine,
        connectionType: label,
        downlink: c?.downlink,
        rtt: c?.rtt,
        saveData: c?.saveData,
        signal: navigator.onLine ? Math.min(4, Math.max(1, Math.round((c?.downlink ?? 4) / 2.5))) : 0,
        lastUpdated: Date.now(),
      });
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const c = netInfo();
    c?.addEventListener("change", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      c?.removeEventListener("change", sync);
    };
  }, [setNetwork]);

  // --- battery (Battery Status API) ---------------------------------------
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    if (!nav.getBattery) return;
    let battery: BatteryLike | null = null;
    let cancelled = false;
    const sync = () => {
      if (!battery) return;
      updateSA({ batteryPct: Math.round(battery.level * 100) });
    };
    void nav.getBattery().then((b) => {
      if (cancelled) return;
      battery = b;
      sync();
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
    });
    return () => {
      cancelled = true;
      battery?.removeEventListener("levelchange", sync);
      battery?.removeEventListener("chargingchange", sync);
    };
  }, [updateSA]);

  // --- host system (only on a real NEXUS device) --------------------------
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    void detectNativeSystem().then((info) => {
      if (stopped || !info.available) return;
      const pull = async () => {
        try {
          const status: HwStatus = await hostHw.status();
          if (status.battery) updateSA({ batteryPct: status.battery.percent });
          const active = status.network?.find((d) => d.connection);
          setNetwork({
            native: true,
            online: Boolean(active),
            ssid: active?.connection ?? null,
            connectionType: active?.type,
            lastUpdated: Date.now(),
          });
        } catch {
          /* device offline from the shell's point of view */
        }
      };
      void pull();
      timer = setInterval(pull, 10000);
    });
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [setNetwork, updateSA]);
}
