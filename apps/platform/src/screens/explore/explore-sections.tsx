import type { AppListing } from "@rosesfield/contract"
import {
  HeroBanner,
  type HeroPortrait,
  type HeroPortraits,
} from "@rosesfield/ui/components/hero"
import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { useInView } from "@rosesfield/ui/hooks/use-in-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useRouter } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useRef, useState } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { catalogApps, findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { AppCard, appCardFormOf } from "@/screens/apps/app-card"
import type { ExploreRow, PresetEntry } from "@/screens/explore/explore-rows"
import {
  ExplorePresetTile,
  type OpenResult,
  ResultCard,
  type VisualEntry,
} from "@/screens/explore/explore-tile"
import { navGroups } from "@/shell/nav-rows"
import {
  exampleGroupOf,
  isFeedExample,
  type ShowcaseItem,
  showcaseItems,
} from "@/showcase/showcase"

export function bannerAppIdOf(
  items: readonly ShowcaseItem[] = showcaseItems
): string {
  return items.find((item) => item.banner === "end")?.appId ?? "image"
}

export const bannerAppId = bannerAppIdOf()

function bannerActionOf(appId: string): string {
  const app = findCatalogApp(appId)
  return t("explore.banner.action", {
    app: app === null ? appId : appName(app),
  })
}

export type ResultActions = {
  onOpen: OpenResult
  onMore: (entry: VisualEntry) => void
}

function useAppHref(): (appId: string) => string {
  const router = useRouter()
  return (appId) =>
    router.buildLocation({ to: "/apps/$appId", params: { appId } }).href
}

export function Reveal({ children }: { children: ReactNode }): ReactElement {
  const box = useRef<HTMLDivElement>(null)
  const [isShown, setShown] = useState(
    () => typeof IntersectionObserver === "undefined"
  )
  useInView(box, (isInView) => {
    if (isInView) {
      setShown(true)
    }
  })
  return (
    <div
      ref={box}
      data-slot="explore-reveal"
      data-arrival={isShown ? "shown" : "waiting"}
      className={cn("w-full", motion.enter)}
    >
      {children}
    </div>
  )
}

function portraitOf(item: ShowcaseItem): HeroPortrait {
  return {
    src: item.src,
    ...(item.focus === undefined ? {} : { focus: item.focus }),
    ...(item.mirror === undefined ? {} : { mirror: item.mirror }),
  }
}

export function bannerPortraits(
  items: readonly ShowcaseItem[] = showcaseItems
): HeroPortraits {
  const start = items.find((item) => item.banner === "start")
  const end = items.find((item) => item.banner === "end")
  return {
    ...(start === undefined ? {} : { start: portraitOf(start) }),
    ...(end === undefined ? {} : { end: portraitOf(end) }),
  }
}

export function ExploreBanner(): ReactElement {
  const appHref = useAppHref()
  return (
    <Reveal>
      <HeroBanner
        href={appHref(bannerAppId)}
        headline={t("explore.banner.headline")}
        lead={t("welcome.terms.body.1")}
        action={bannerActionOf(bannerAppId)}
        portraits={bannerPortraits()}
      />
    </Reveal>
  )
}

export function exploreApps(): AppListing[] {
  return navGroups(catalogApps)
    .areas.flatMap((area) => area.apps)
    .filter((app) => appCardFormOf(app, null) === "media")
}

export function AppsHeader(): ReactElement {
  const router = useRouter()
  return (
    <SectionHeader
      title={t("explore.apps.label")}
      actions={
        <ViewAll href={router.buildLocation({ to: "/apps" }).href}>
          {t("explore.showcase.viewAll")}
        </ViewAll>
      }
    />
  )
}

export function AppsRow({
  apps,
  cardWidth,
}: {
  apps: readonly AppListing[]
  cardWidth: number
}): ReactElement {
  return (
    <MediaFeed
      label={t("explore.apps.label")}
      layout="row"
      rowLabels={rowLabels()}
      cellWidth={cardWidth}
    >
      {apps.map((app) => (
        <AppCard
          key={app.id}
          app={app}
          newest={null}
          working={0}
          width={cardWidth}
        />
      ))}
    </MediaFeed>
  )
}

type FeedProps = ResultActions & {
  title: string
  line: string
  href: string
  name: string
  layout: "masonry" | "row"
  entries: readonly VisualEntry[]
  cellWidth?: number
}

function rowLabels(): { previous: string; next: string } {
  return { previous: t("viewer.previous"), next: t("viewer.next") }
}

export function ResultFeed(props: FeedProps): ReactElement {
  return (
    <Reveal>
      <MediaFeed
        label={props.title}
        layout={props.layout}
        rowLabels={rowLabels()}
        {...(props.cellWidth === undefined
          ? {}
          : { cellWidth: props.cellWidth })}
        header={
          <SectionHeader
            title={props.title}
            line={props.line}
            href={props.href}
          />
        }
        viewAll={
          <ViewAll href={props.href}>
            {t("explore.viewAll", { name: props.name })}
          </ViewAll>
        }
      >
        {props.entries.map((entry) => (
          <ResultCard
            key={entry.key}
            entry={entry}
            aspect={entry.aspect}
            onOpen={props.onOpen}
            onMore={props.onMore}
          />
        ))}
      </MediaFeed>
    </Reveal>
  )
}

function PresetFeed({
  app,
  presets,
}: {
  app: AppListing
  presets: readonly PresetEntry[]
}): ReactElement {
  const href = useAppHref()(app.id)
  const name = appName(app)
  return (
    <Reveal>
      <MediaFeed
        label={name}
        layout="row"
        content="presets"
        header={<SectionHeader title={name} href={href} />}
        viewAll={
          <ViewAll href={href}>{t("explore.viewAll", { name })}</ViewAll>
        }
      >
        {presets.map((preset) => (
          <ExplorePresetTile
            key={preset.key}
            name={preset.name}
            entry={preset.entry}
          />
        ))}
      </MediaFeed>
    </Reveal>
  )
}

export function ExploreRowView({
  row,
  ...actions
}: ResultActions & { row: ExploreRow }): ReactElement {
  const appHref = useAppHref()
  switch (row.kind) {
    case "presets":
      return <PresetFeed app={row.app} presets={row.presets} />
    case "model":
      return (
        <ResultFeed
          {...actions}
          title={row.model}
          line={t("explore.model.line", { model: row.model })}
          href={appHref(row.appId)}
          name={row.model}
          layout="row"
          entries={row.entries}
        />
      )
    case "app":
      return (
        <ResultFeed
          {...actions}
          title={appName(row.app)}
          line={appLine(row.app)}
          href={appHref(row.app.id)}
          name={appName(row.app)}
          layout="row"
          entries={row.entries}
        />
      )
  }
}

const sourceGap = 6

function groupsAround(placed: readonly VisualEntry[], at: number): Set<string> {
  return new Set(
    placed
      .slice(Math.max(0, at - sourceGap + 1), at + sourceGap - 1)
      .map((entry) => exampleGroupOf(entry.run.id))
  )
}

function placeApart(placed: VisualEntry[], entry: VisualEntry): boolean {
  const group = exampleGroupOf(entry.run.id)
  for (let at = placed.length; at >= 0; at -= 1) {
    if (!groupsAround(placed, at).has(group)) {
      placed.splice(at, 0, entry)
      return true
    }
  }
  return false
}

function spreadSources(entries: readonly VisualEntry[]): VisualEntry[] {
  const placed: VisualEntry[] = []
  const deferred: VisualEntry[] = []
  for (const entry of entries) {
    const near = groupsAround(placed, placed.length)
    if (near.has(exampleGroupOf(entry.run.id))) {
      deferred.push(entry)
    } else {
      placed.push(entry)
    }
  }
  for (const entry of deferred) {
    if (!placeApart(placed, entry)) {
      placed.push(entry)
    }
  }
  return placed
}

export function feedExamples(entries: readonly VisualEntry[]): VisualEntry[] {
  return spreadSources(entries.filter((entry) => isFeedExample(entry.run.id)))
}

type SizedFeedProps = ResultActions & {
  entries: readonly VisualEntry[]
  cellWidth?: number
}

export function ShowcaseFeed({
  entries,
  cellWidth,
  ...actions
}: SizedFeedProps): ReactNode {
  const isRegular = useIsRegularWindow()
  const examples = feedExamples(entries)
  if (examples.length === 0) {
    return null
  }
  return (
    <Reveal>
      <MediaFeed
        label={t("explore.showcase.title")}
        isClipped={isRegular}
        {...(cellWidth === undefined ? {} : { cellWidth })}
        header={<SectionHeader title={t("explore.showcase.title")} />}
      >
        {examples.map((entry) => (
          <ResultCard
            key={entry.key}
            entry={entry}
            aspect={entry.aspect}
            onOpen={actions.onOpen}
            onMore={actions.onMore}
          />
        ))}
      </MediaFeed>
    </Reveal>
  )
}

export function SharedFeed({
  entries,
  cellWidth,
  ...actions
}: SizedFeedProps): ReactElement {
  const router = useRouter()
  return (
    <ResultFeed
      {...actions}
      title={t("explore.shared.title")}
      line={t("explore.shared.line")}
      href={router.buildLocation({ to: "/history" }).href}
      name={t("explore.shared.name")}
      layout="masonry"
      entries={entries}
      {...(cellWidth === undefined ? {} : { cellWidth })}
    />
  )
}
