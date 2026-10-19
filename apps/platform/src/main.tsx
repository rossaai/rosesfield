import "@fontsource/montserrat/400.css"
import "@fontsource/montserrat/500.css"
import "@fontsource/jetbrains-mono/400.css"
import "@rosesfield/ui/globals.css"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { loadOwnerToken } from "@/api/owner-token"
import { createQueryClient } from "@/api/query-client"
import { loadVisitorKeys } from "@/api/visitor-keys"
import { DeviceProvider } from "@/device/device-context"
import { WebDevice } from "@/device/web-device"
import { registerOfflineShell } from "@/offline-shell"
import { createAppRouter } from "@/router"
import { keepTokenFromLink } from "@/shell/token-link"
import { applyThemeChoice, readThemeChoice } from "@/theme/theme-choice"

async function start(): Promise<void> {
  applyThemeChoice(readThemeChoice())
  await keepTokenFromLink()
  await Promise.all([loadOwnerToken(), loadVisitorKeys()])
  const queryClient = createQueryClient({
    onLocked: () => {
      const next = `${window.location.pathname}${window.location.search}`
      if (window.location.pathname !== "/unlock") {
        void router.navigate({ to: "/unlock", search: { next } })
      }
    },
  })
  const router = createAppRouter(queryClient)
  const root = document.getElementById("root")
  if (root === null) {
    return
  }
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <DeviceProvider device={new WebDevice()}>
          <RouterProvider router={router} />
        </DeviceProvider>
      </QueryClientProvider>
    </StrictMode>
  )
  registerOfflineShell()
}

void start()
