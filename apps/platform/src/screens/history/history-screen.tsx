import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Canvas } from "@rosesfield/ui/components/canvas"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useState } from "react"
import { isWorking, runsOf, runsQuery } from "@/api/queries"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { dayKey, dayLabel } from "@/copy/format"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { useNextPage } from "@/pieces/use-next-page"
import {
  type HistoryFilterProps,
  historyFilterGroups,
  type StateChoice,
  StateTabs,
} from "@/screens/history/history-filters"
import { historyGridItems } from "@/screens/history/history-grid-items"
import { HistoryRow, HistoryRowSkeleton } from "@/screens/history/history-row"
import { GridSkeleton } from "@/screens/library/library-grid"
import { ResultGrid } from "@/screens/library/result-grid"
import {
  type DateChoice,
  isWithinDate,
  tileSizes,
  type ViewLayout,
  ViewMenu,
} from "@/screens/library/view-cluster"
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

export function keepsRun(
  run: Run,
  state: StateChoice,
  kind: string | undefined,
  date: DateChoice = "any",
  now: Date = new Date()
): boolean {
  const stateOk =
    state === "all" ||
    (state === "working" ? isWorking(run) : run.status === "failed")
  return (
    stateOk &&
    (kind === undefined || findCatalogApp(run.appId)?.output.kind === kind) &&
    isWithinDate(run.createdAt, date, now)
  )
}

type HistoryFilters = HistoryFilterProps & {
  isFiltered: boolean
  clear: () => void
}

function useHistoryFilters(): HistoryFilters {
  const search = useSearch({ from: "/_shell/history/" })
  const navigate = useNavigate({ from: "/history/" })
  const [date, setDate] = useState<DateChoice>("any")
  const appId = search.app ?? null
  const state: StateChoice = search.state ?? "all"
  const kind = search.kind
  const go = (
    next: Pick<HistoryFilterProps, "appId" | "state" | "kind">
  ): void => {
    void navigate({
      search: {
        ...(next.appId === null ? {} : { app: next.appId }),
        ...(next.state === "all" ? {} : { state: next.state }),
        ...(next.kind === undefined ? {} : { kind: next.kind }),
      },
      replace: true,
    })
  }
  return {
    appId,
    state,
    kind,
    date,
    isFiltered:
      appId !== null || state !== "all" || kind !== undefined || date !== "any",
    onApp: (app) => go({ appId: app, state, kind }),
    onState: (next) => go({ appId, state: next, kind }),
    onKind: (next) => go({ appId, state, kind: next }),
    onDate: setDate,
    clear: () => {
      setDate("any")
      void navigate({ search: {}, replace: true })
    },
  }
}

function HistoryEmpty({ filters }: { filters: HistoryFilters }): ReactElement {
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

function useHistoryQuery(appId: string | null) {
  const query = useInfiniteQuery(runsQuery(appId))
  const sentinel = useNextPage(
    query.hasNextPage && !query.isFetchingNextPage,
    () => void query.fetchNextPage()
  )
  return { query, runs: runsOf(query.data), sentinel }
}

type HistoryQuery = ReturnType<typeof useHistoryQuery>

function HistoryBody({
  filters,
  history,
  layout,
  size,
}: {
  filters: HistoryFilters
  history: HistoryQuery
  layout: ViewLayout
  size: number
}): ReactNode {
  const { query } = history
  if (query.isPending) {
    return layout === "grid" ? (
      <GridSkeleton size={size} />
    ) : (
      <ul data-slot="history-list">
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
  const now = new Date()
  const runs = history.runs.filter((run) =>
    keepsRun(run, filters.state, filters.kind, filters.date, now)
  )
  if (runs.length === 0) {
    return <HistoryEmpty filters={filters} />
  }
  const sentinel = (
    <span ref={history.sentinel} aria-hidden="true" className="block h-s1" />
  )
  if (layout === "grid") {
    return (
      <ResultGrid items={historyGridItems(runs)} size={size} after={sentinel} />
    )
  }
  return (
    <div data-slot="history-list" className="flex w-full flex-col">
      {groupRuns(runs, now).map((group) => (
        <section key={group.key} className="flex flex-col">
          <h2 className="flex h-tab items-center font-medium text-label text-ink-muted">
            {group.label}
          </h2>
          <ul>
            {group.runs.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </ul>
        </section>
      ))}
      {sentinel}
    </div>
  )
}

export function HistoryScreen(): ReactElement {
  const filters = useHistoryFilters()
  const history = useHistoryQuery(filters.appId)
  const [layout, setLayout] = useState<ViewLayout>("grid")
  const [size, setSize] = useState<number>(tileSizes.initial)
  const isRegular = useIsRegularWindow()
  const hasView =
    history.runs.length > 0 || filters.isFiltered || history.query.isPending
  const viewMenu = hasView ? (
    <ViewMenu
      layout={layout}
      onLayout={setLayout}
      size={size}
      onSize={setSize}
      isLoading={history.query.isPending}
      groups={historyFilterGroups(filters)}
    />
  ) : null
  return (
    <>
      <ScreenHeader title={t("history.title")} />
      <div className="flex w-full flex-1 flex-col px-s5 pb-s12">
        <Canvas
          label={t("history.title")}
          inset="page"
          tabs={
            <div
              data-slot="history-tabs"
              className="flex min-w-0 flex-1 items-center justify-between gap-s3"
            >
              <StateTabs {...filters} />
              {isRegular ? null : viewMenu}
            </div>
          }
          {...(isRegular ? { cluster: viewMenu } : {})}
          hasRuns={isRegular && viewMenu !== null}
        >
          <HistoryBody
            filters={filters}
            history={history}
            layout={layout}
            size={size}
          />
        </Canvas>
      </div>
    </>
  )
}
