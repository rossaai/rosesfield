import { Button } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { StateView } from "@rosesfield/ui/components/state-view"
import { tabBarCover } from "@rosesfield/ui/components/tab-bar"
import { cn } from "@rosesfield/ui/lib/cn"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { BottomBar } from "@/shell/bottom-bar"
import { KeyDialogProvider } from "@/shell/key-dialog-context"
import { hasFooter } from "@/shell/page-kind"
import { RunWatcher } from "@/shell/run-watcher"
import { ScreenHeader } from "@/shell/screen-header"
import { ShellFooter } from "@/shell/shell-footer"
import { TopBar } from "@/shell/top-bar"
import { AssetViewer } from "@/viewer/asset-viewer"
import { ViewerProvider } from "@/viewer/viewer-context"

function ShellContent({ children }: { children: ReactNode }): ReactNode {
  const settings = useQuery(settingsQuery)
  const client = useQueryClient()
  const isOffline =
    settings.data === undefined &&
    settings.error instanceof GatewayUnreachableError
  if (!isOffline) {
    return children
  }
  return (
    <>
      <ScreenHeader title={t("shell.name")} />
      <StateView
        kind="failed"
        mark={<span className="text-title">{t("shell.name")}</span>}
        title={t("shell.offline.title")}
        body={t("shell.offline.body")}
        actions={
          <Button
            tone="primary"
            busy={settings.isFetching}
            onClick={() => void client.refetchQueries()}
          >
            {t("shell.offline.action")}
          </Button>
        }
      />
    </>
  )
}

export function ShellFrame({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const footer = hasFooter(pathname)
  return (
    <ViewerProvider>
      <KeyDialogProvider>
        <div
          data-slot="shell"
          className="@container flex h-dvh flex-col bg-canvas"
        >
          <TopBar />
          <main
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              interaction.ringScroll,
              tabBarCover,
              footer ? "flex flex-col *:shrink-0" : ""
            )}
          >
            <ShellContent>{children}</ShellContent>
            {footer ? (
              <div data-slot="shell-footer" className="mt-auto">
                <ShellFooter />
              </div>
            ) : null}
          </main>
          <BottomBar />
        </div>
        <RunWatcher />
        <AssetViewer />
      </KeyDialogProvider>
    </ViewerProvider>
  )
}
