import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"

export function ServerPart({
  children,
}: {
  children: (settings: GatewaySettings) => ReactNode
}): ReactNode {
  const settings = useQuery(settingsQuery)
  if (settings.isPending) {
    return <Skeleton className="h-s5 w-full" />
  }
  if (settings.isError) {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={t("settings.failed.title")}
        actions={
          <Button onClick={() => void settings.refetch()}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  return children(settings.data)
}
