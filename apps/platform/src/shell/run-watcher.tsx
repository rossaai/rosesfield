import type { Run } from "@rosesfield/contract"
import { useToast } from "@rosesfield/ui/components/toast"
import { type QueryClient, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { isWorking, keepRun } from "@/api/queries"
import { watchRunStream } from "@/api/run-stream"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { accountQuery } from "@/screens/settings/account-query"
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
  void client.invalidateQueries({ queryKey: accountQuery.queryKey })
  if (run.status === "done") {
    void client.invalidateQueries({ queryKey: ["assets"] })
  }
}

export function useRunStreams(runs: readonly Run[]): void {
  const client = useQueryClient()
  const streams = useRef(new Map<string, AbortController>())
  const working = runs
    .filter(isWorking)
    .map((run) => run.id)
    .join(" ")
  useEffect(() => {
    const held = streams.current
    const wanted = new Set(working === "" ? [] : working.split(" "))
    for (const [runId, stop] of held) {
      if (!wanted.has(runId)) {
        stop.abort()
        held.delete(runId)
      }
    }
    for (const runId of wanted) {
      if (held.has(runId)) {
        continue
      }
      const stop = new AbortController()
      held.set(runId, stop)
      void watchRunStream({
        runId,
        signal: stop.signal,
        onRun: (run) => keepRun(client, run),
      }).finally(() => {
        if (held.get(runId) === stop) {
          held.delete(runId)
        }
      })
    }
  }, [working, client])
  useEffect(() => {
    const held = streams.current
    return () => {
      for (const stop of held.values()) {
        stop.abort()
      }
      held.clear()
    }
  }, [])
}

export function RunWatcher(): null {
  const runs = useRecentRuns()
  useRunStreams(runs)
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
