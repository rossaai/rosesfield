import type { Run } from "@rosesfield/contract"
import { useToast } from "@rosesfield/ui/components/toast"
import { type QueryClient, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { isWorking } from "@/api/queries"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { useRecentRuns } from "@/shell/use-working-runs"

function endedRuns(
  runs: readonly Run[],
  seen: Map<string, Run["status"]>
): Run[] {
  const ended: Run[] = []
  for (const run of runs) {
    const before = seen.get(run.id)
    if (before !== undefined && isWorkingStatus(before) && !isWorking(run)) {
      ended.push(run)
    }
    seen.set(run.id, run.status)
  }
  return ended
}

function isWorkingStatus(status: Run["status"]): boolean {
  return status === "queued" || status === "running"
}

type Place = { pathname: string; searchStr: string }

const charactersApp = "characters"

export function isRunPlaceOpen(place: Place, run: Run): boolean {
  if (place.pathname === `/apps/${run.appId}`) {
    return true
  }
  if (place.pathname === `/history/${run.id}`) {
    return true
  }
  return (
    run.appId === charactersApp &&
    place.pathname === "/characters/new" &&
    new URLSearchParams(place.searchStr).get("mode") === "traits"
  )
}

function refresh(client: QueryClient, run: Run): void {
  void client.invalidateQueries({ queryKey: ["run", run.id] })
  if (run.status === "done") {
    void client.invalidateQueries({ queryKey: ["assets"] })
  }
}

export function RunWatcher(): null {
  const runs = useRecentRuns()
  const seen = useRef(new Map<string, Run["status"]>())
  const client = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const searchStr = useRouterState({
    select: (state) => state.location.searchStr,
  })
  useEffect(() => {
    for (const run of endedRuns(runs, seen.current)) {
      refresh(client, run)
      if (
        run.status !== "failed" ||
        isRunPlaceOpen({ pathname, searchStr }, run)
      ) {
        continue
      }
      const app = findCatalogApp(run.appId)
      toast.add({
        title: t("toast.runFailed", {
          app: app === null ? run.appId : appName(app),
        }),
        actionProps: {
          children: t("toast.open"),
          onClick: () =>
            void navigate({ to: "/history/$runId", params: { runId: run.id } }),
        },
      })
    }
  }, [runs, client, toast, navigate, pathname, searchStr])
  return null
}
