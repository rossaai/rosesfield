import type { AppListing, Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Input } from "@rosesfield/ui/components/input"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useNavigate, useSearch } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { isWorking } from "@/api/queries"
import {
  appKeywords,
  appLine,
  appName,
  type OutputKind,
  outputKinds,
} from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t, tCount } from "@/copy/t"
import { AppCard } from "@/screens/apps/app-card"
import { ScreenHeader } from "@/shell/screen-header"
import { useRecentRuns } from "@/shell/use-working-runs"

type KindChoice = OutputKind | "all"

const presentKinds = outputKinds.filter((kind) =>
  catalogApps.some((app) => app.output.kind === kind)
)

function matches(app: AppListing, query: string): boolean {
  const text =
    `${appName(app)} ${appLine(app)} ${appKeywords(app)}`.toLowerCase()
  return text.includes(query.trim().toLowerCase())
}

function KindControl({
  value,
  onChange,
}: {
  value: KindChoice
  onChange: (kind: KindChoice) => void
}): ReactElement | null {
  const items: Array<{ value: KindChoice; label: string }> = [
    { value: "all", label: t("kind.all") },
    ...presentKinds.map((kind) => ({ value: kind, label: t(`kind.${kind}`) })),
  ]
  if (items.length < 3) {
    return null
  }
  if (items.length <= 4) {
    return (
      <SegmentedControl
        items={items}
        value={value}
        onValueChange={onChange}
        label={t("apps.kind.label")}
      />
    )
  }
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) =>
        onChange(items.find((item) => item.value === next)?.value ?? "all")
      }
    >
      <SelectTrigger aria-label={t("apps.kind.label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AppGroup({
  kind,
  apps,
  runs,
}: {
  kind: OutputKind
  apps: readonly AppListing[]
  runs: readonly Run[]
}): ReactElement {
  return (
    <section className="flex flex-col gap-s3">
      <div className="flex items-baseline gap-s2">
        <h2 className="text-title">{t(`kind.${kind}`)}</h2>
        <span className="text-caption text-ink-muted">
          {tCount("apps.group.count", apps.length)}
        </span>
      </div>
      <div
        data-slot="app-cards"
        className="-mx-s5 flex snap-x scroll-px-s5 gap-4 overflow-x-auto px-s5 [scrollbar-width:none] @regular:mx-0 @regular:grid @regular:grid-cols-[repeat(auto-fill,minmax(--spacing(59.25),1fr))] @regular:overflow-visible @regular:px-0"
      >
        {apps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            newest={
              runs.find(
                (run) => run.appId === app.id && run.status === "done"
              ) ?? null
            }
            working={
              runs.filter((run) => run.appId === app.id && isWorking(run))
                .length
            }
          />
        ))}
      </div>
    </section>
  )
}

function useAppsSearch(): {
  query: string
  kind: KindChoice
  setSearch: (next: { q?: string; kind?: KindChoice }) => void
  clear: () => void
} {
  const search = useSearch({ from: "/_shell/apps/" })
  const navigate = useNavigate({ from: "/apps/" })
  const query = search.q ?? ""
  const kind: KindChoice = search.kind ?? "all"
  return {
    query,
    kind,
    setSearch: (next) => {
      const q = next.q ?? query
      const k = next.kind ?? kind
      void navigate({
        search: {
          ...(q === "" ? {} : { q }),
          ...(k === "all" ? {} : { kind: k }),
        },
        replace: true,
      })
    },
    clear: () => void navigate({ search: {}, replace: true }),
  }
}

function AppGroups({
  apps,
  kind,
}: {
  apps: readonly AppListing[]
  kind: KindChoice
}): ReactElement[] {
  const runs = useRecentRuns()
  return presentKinds
    .filter((one) => kind === "all" || one === kind)
    .map((one) => ({
      kind: one,
      apps: apps.filter((app) => app.output.kind === one),
    }))
    .filter((group) => group.apps.length > 0)
    .map((group) => (
      <AppGroup
        key={group.kind}
        kind={group.kind}
        apps={group.apps}
        runs={runs}
      />
    ))
}

export function AppsScreen(): ReactElement {
  const { query, kind, setSearch, clear } = useAppsSearch()
  const found = catalogApps.filter(
    (app) => matches(app, query) && (kind === "all" || app.output.kind === kind)
  )
  return (
    <>
      <ScreenHeader title={t("apps.title")} />
      <div className="flex w-full flex-col gap-s8 px-s5 pb-s12 @regular:px-4">
        <div className="flex flex-col gap-s3 @regular:flex-row @regular:items-center">
          <Input
            type="search"
            aria-label={t("apps.search.label")}
            placeholder={t("apps.search.placeholder")}
            value={query}
            onChange={(event) => setSearch({ q: event.target.value })}
            className="max-w-none @regular:max-w-field-max"
          />
          <KindControl
            value={kind}
            onChange={(next) => setSearch({ kind: next })}
          />
        </div>
        {found.length === 0 && query !== "" ? (
          <StateView
            kind="empty"
            title={t("apps.empty.title", { query })}
            actions={<Button onClick={clear}>{t("apps.empty.action")}</Button>}
          />
        ) : (
          <AppGroups apps={found} kind={kind} />
        )}
      </div>
    </>
  )
}
