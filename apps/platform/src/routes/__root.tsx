import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { Toaster, ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import type { RouterContext } from "@/router-context"
import { ShellNotFound } from "@/screens/not-found-screen"

function RootFrame(): ReactElement {
  return (
    <ToastProvider>
      <TooltipProvider>
        <Outlet />
        <Toaster />
      </TooltipProvider>
    </ToastProvider>
  )
}

function RootError(): ReactElement {
  return (
    <main className="h-dvh bg-canvas text-ink">
      <StateView
        kind="failed"
        mark={<span className="text-title">{t("shell.name")}</span>}
        title={t("shell.crash.title")}
        body={t("shell.crash.body")}
        actions={
          <Button tone="primary" onClick={() => window.location.reload()}>
            {t("shell.offline.action")}
          </Button>
        }
      />
    </main>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootFrame,
  errorComponent: RootError,
  notFoundComponent: ShellNotFound,
})
