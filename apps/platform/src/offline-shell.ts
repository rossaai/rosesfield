export const serviceWorkerPath = "/sw.js"

type ShellContainer = Pick<
  ServiceWorkerContainer,
  "controller" | "addEventListener"
>

export function reloadOnNewShell(
  container: ShellContainer,
  reload: () => void
): void {
  const hadShell = container.controller !== null
  container.addEventListener("controllerchange", () => {
    if (hadShell) {
      reload()
    }
  })
}

export function registerOfflineShell(): void {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return
  }
  reloadOnNewShell(navigator.serviceWorker, () => window.location.reload())
  void navigator.serviceWorker
    .register(serviceWorkerPath, { scope: "/" })
    .catch(() => undefined)
}
