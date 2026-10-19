export const serviceWorkerPath = "/sw.js"

export function registerOfflineShell(): void {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return
  }
  void navigator.serviceWorker
    .register(serviceWorkerPath, { scope: "/" })
    .catch(() => undefined)
}
