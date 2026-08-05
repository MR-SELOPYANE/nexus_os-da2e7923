/**
 * Registers the NEXUS offline service worker.
 * Only runs in the browser on non-sandbox (published/production) hosts so the
 * dev preview keeps hot-reloading normally.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  const host = window.location.hostname;
  const isSandbox = host.includes("localhost") || host.includes("id-preview--");
  if (isSandbox) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline mode unavailable — non-fatal */
    });
  });
}
