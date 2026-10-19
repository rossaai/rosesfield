import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { isWorking, runsOf, runsQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { dayKey, dayLabel } from "@/copy/format"
import { t } from "@/copy/t"
import { useNextPage } from "@/pieces/use-next-page"
import {
  type HistoryFilterProps,
  HistoryFilters,
  PhoneFilters,
  type StateChoice,
} from "@/screens/history/history-filters"
import { HistoryRow, HistoryRowSkeleton } from "@/screens/history/history-row"
import { ScreenHeader } from "@/shell/screen-header"

type DayRuns = { key: number; label: string; runs: Run[] }

function groupRuns(runs: readonly Run[], now: Date): DayRuns[] {
  const groups: DayRuns[] = []
  for (const run of runs) {
    const key = dayKey(run.createdAt)
    const last = groups.at(-1)
    if (last?.key === key) {
      last.runs.push(run)
    } else {
      groups.push({ key, label: dayLabel(run.createdAt, now), runs: [run] })
    }
  }
  return groups
}

function keeps(
  run: Run,
  state: StateChoice,
  kind: string | undefined
): boolean {
  const stateOk =
    state === "all" ||
    (state === "working" ? isWorking(run) : run.status === "failed")
  return (
    stateOk &&
    (kind === undefined || findCatalogApp(run.appId)?.output.kind === kind)
  )
}

function useHistoryFilters(): HistoryFilterProps & {
  kind: string | undefined
  isFiltered: boolean
  clear: () => void
} {
  const search = useSearch({ from: "/_shell/history/" })
  const navigate = useNavigate({ from: "/history/" })
  const appId = search.app ?? null
  const state: StateChoice = search.state ?? "all"
  const go = (next: { app: string | null; state: StateChoice }): void => {
    void navigate({
      search: {
        ...(next.app === null ? {} : { app: next.app }),
        ...(next.state === "all" ? {} : { state: next.state }),
        ...(search.kind === undefined ? {} : { kind: search.kind }),
      },
      replace: true,
    })
  }
  return {
    appId,
    state,
    kind: search.kind,
    isFiltered: appId !== null || state !== "all" || search.kind !== undefined,
    onApp: (app) => go({ app, state }),
    onState: (next) => go({ app: appId, state: next }),
    clear: () => void navigate({ search: {}, replace: true }),
  }
}

function HistoryEmpty({
  filters,
}: {
  filters: ReturnType<typeof useHistoryFilters>
}): ReactElement {
  return filters.isFiltered ? (
    <StateView
      kind="empty"
      title={t("history.filterEmpty.title")}
      actions={
        <Button onClick={filters.clear}>
          {t("history.filterEmpty.action")}
        </Button>
      }
    />
  ) : (
    <StateView
      kind="empty"
      title={t("history.empty.title")}
      body={t("history.empty.body")}
      actions={
        <Button
          tone="primary"
          render={<Link to="/apps" />}
          nativeButton={false}
        >
          {t("history.empty.action")}
        </Button>
      }
    />
  )
}

function HistoryBody({
  filters,
}: {
  filters: ReturnType<typeof useHistoryFilters>
}): ReactNode {
  const query = useInfiniteQuery(runsQuery(filters.appId))
  const sentinel = useNextPage(
    query.hasNextPage && !query.isFetchingNextPage,
    () => void query.fetchNextPage()
  )
  if (query.isPending) {
    return (
      <ul>
        {[0, 1, 2, 3].map((index) => (
          <HistoryRowSkeleton key={index} />
        ))}
      </ul>
    )
  }
  if (query.isError) {
    return (
      <StateView
        kind="failed"
        title={t("history.failed.title")}
        actions={
          <Button onClick={() => void query.refetch()}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  const runs = runsOf(query.data).filter((run) =>
    keeps(run, filters.state, filters.kind)
  )
  if (runs.length === 0) {
    return <HistoryEmpty filters={filters} />
  }
  return (
    <>
      {groupRuns(runs, new Date()).map((group) => (
        <section key={group.key} className="flex flex-col">
          <h2 className="pt-s4 text-body font-medium">{group.label}</h2>
          <ul>
            {group.runs.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </ul>
        </section>
      ))}
      <span ref={sentinel} aria-hidden="true" className="block h-s1" />
    </>
  )
}

export function HistoryScreen(): ReactElement {
  const filters = useHistoryFilters()
  return (
    <>
      <ScreenHeader
        title={t("history.title")}
        phoneAction={<PhoneFilters {...filters} />}
      />
      <div className="flex w-full flex-col gap-s3 px-s5 pb-s12 @regular:px-s4">
        <div className="hidden w-full max-w-prompt-max @regular:block">
          <HistoryFilters {...filters} />
        </div>
        <div className="flex w-full max-w-prompt-max flex-col">
          <HistoryBody filters={filters} />
        </div>
      </div>
    </>
  )
}
