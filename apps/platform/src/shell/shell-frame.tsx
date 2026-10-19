import { Button } from "@rosesfield/ui/components/button"
import { ShellLayout } from "@rosesfield/ui/components/shell-layout"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { BottomBar } from "@/shell/bottom-bar"
import { HeaderSlotsProvider, useHeaderSlotTargets } from "@/shell/header-slots"
import { KeyDialogProvider } from "@/shell/key-dialog-context"
import { NavSidebar } from "@/shell/nav-sidebar"
import { RunWatcher } from "@/shell/run-watcher"
import { ScreenHeader } from "@/shell/screen-header"
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
  const header = useHeaderSlotTargets()
  return (
    <ViewerProvider>
      <HeaderSlotsProvider slots={header.slots}>
        <KeyDialogProvider>
          <div className="@container flex h-dvh flex-col">
            <div className="min-h-0 flex-1">
              <ShellLayout
                sidebar={<NavSidebar />}
                title={header.titleTarget}
                action={header.actionTarget}
                menuLabel={t("shell.menu.open")}
                closeMenuLabel={t("shell.menu.close")}
                storageKey="rosesfield.sidebar"
              >
                <ShellContent>{children}</ShellContent>
              </ShellLayout>
            </div>
            <BottomBar />
          </div>
          <RunWatcher />
          <AssetViewer />
        </KeyDialogProvider>
      </HeaderSlotsProvider>
    </ViewerProvider>
  )
}
