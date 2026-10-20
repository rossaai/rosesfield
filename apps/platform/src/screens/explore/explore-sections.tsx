import type { AppListing } from "@rosesfield/contract"
import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { buttonVariants } from "@rosesfield/ui/components/button"
import { HeroBanner } from "@rosesfield/ui/components/hero"
import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import {
  PromoCard,
  PromoRow,
  PromoSkeleton,
} from "@rosesfield/ui/components/promo-card"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { useRouter } from "@tanstack/react-router"
import { VideoIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { catalogApps, findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import {
  type ExploreRow,
  type PresetEntry,
  type PromoEntry,
  promoEntries,
} from "@/screens/explore/explore-rows"
import {
  ExplorePresetTile,
  type OpenResult,
  ResultCard,
  useEntrySrc,
  useRecreateHref,
  type VisualEntry,
} from "@/screens/explore/explore-tile"
import { appIcon, navGroups } from "@/shell/nav-rows"

export const bannerAppId = "image"
export const appTileCount = 6

export type ResultActions = {
  onOpen: OpenResult
  onMore: (entry: VisualEntry) => void
}

function useAppHref(): (appId: string) => string {
  const router = useRouter()
  return (appId) =>
    router.buildLocation({ to: "/apps/$appId", params: { appId } }).href
}

export function ExploreBanner(): ReactElement {
  const appHref = useAppHref()
  return (
    <HeroBanner
      href={appHref(bannerAppId)}
      kicker={t("explore.banner.kicker")}
      headline={t("explore.banner.headline")}
      lead={t("explore.banner.lead")}
      action={t("explore.banner.action")}
    />
  )
}

function PromoClip({ promo }: { promo: PromoEntry }): ReactNode {
  const src = useEntrySrc(promo.entry)
  if (src === null) {
    return null
  }
  return (
    <MediaTile kind={promo.entry.kind} src={src} alt={appName(promo.app)} />
  )
}

export const promoSkeletonCount = 4

export function PromoCards({
  entries,
  isLoading,
}: {
  entries: readonly VisualEntry[]
  isLoading: boolean
}): ReactNode {
  const appHref = useAppHref()
  const promos = promoEntries(entries)
  if (promos.length === 0 && !isLoading) {
    return null
  }
  return (
    <PromoRow
      label={t("explore.promo.label")}
      nextLabel={t("viewer.next")}
      className="-mx-4 mt-2 @regular:mt-6"
    >
      {isLoading
        ? Array.from({ length: promoSkeletonCount }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
            <PromoSkeleton key={index} />
          ))
        : null}
      {promos.map((promo) => (
        <PromoCard
          key={promo.app.id}
          name={appName(promo.app)}
          line={appLine(promo.app)}
          href={appHref(promo.app.id)}
          openLabel={t("explore.promo.open", { app: appName(promo.app) })}
          clip={<PromoClip promo={promo} />}
        />
      ))}
    </PromoRow>
  )
}

export function tileApps(
  apps: readonly AppListing[] = catalogApps
): Array<{ app: AppListing; icon: ReactElement }> {
  const areas = navGroups(apps).areas
  const depth = Math.max(0, ...areas.map((area) => area.apps.length))
  return Array.from({ length: depth }, (_, index) =>
    areas.flatMap((area) => area.apps.slice(index, index + 1))
  )
    .flat()
    .slice(0, appTileCount)
    .map((app) => ({ app, icon: appIcon(app) }))
}

export function AppTiles(): ReactElement {
  const appHref = useAppHref()
  return (
    <div className="mt-6 w-full @regular:mt-10 @regular:w-186.75">
      <AppTileGrid label={t("explore.apps.label")}>
        {tileApps().map(({ app, icon }) => (
          <AppTile
            key={app.id}
            href={appHref(app.id)}
            name={appName(app)}
            line={appLine(app)}
            icon={icon}
            {...(app.output.kind === "video"
              ? { mode: { label: t("kind.video"), icon: <VideoIcon /> } }
              : {})}
          />
        ))}
      </AppTileGrid>
    </div>
  )
}

function RowActions({
  appId,
  entry,
}: {
  appId: string
  entry: VisualEntry
}): ReactElement {
  const appHref = useAppHref()
  const recreateHref = useRecreateHref(entry)
  const app = findCatalogApp(appId)
  return (
    <>
      <a
        href={appHref(appId)}
        data-slot="button"
        className={buttonVariants({ tone: "primary", size: "hero" })}
      >
        {t("explore.promo.open", {
          app: app === null ? appId : appName(app),
        })}
      </a>
      <a
        href={recreateHref}
        data-slot="button"
        className={buttonVariants({ size: "hero" })}
      >
        {t("explore.tile.recreate")}
      </a>
    </>
  )
}

type FeedProps = ResultActions & {
  title: string
  line: string
  href: string
  name: string
  layout: "masonry" | "row"
  entries: readonly VisualEntry[]
  actions?: ReactNode
}

export function ResultFeed(props: FeedProps): ReactElement {
  return (
    <MediaFeed
      label={props.title}
      layout={props.layout}
      header={
        <SectionHeader
          title={props.title}
          line={props.line}
          href={props.href}
          {...(props.actions === undefined ? {} : { actions: props.actions })}
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
          narrow={props.layout === "masonry"}
          onOpen={props.onOpen}
          onMore={props.onMore}
        />
      ))}
    </MediaFeed>
  )
}

function PresetFeed({
  app,
  presets,
  actions,
}: {
  app: AppListing
  presets: readonly PresetEntry[]
  actions: ReactNode
}): ReactElement {
  const href = useAppHref()(app.id)
  const name = appName(app)
  return (
    <MediaFeed
      label={name}
      layout="row"
      content="presets"
      header={
        <SectionHeader
          title={name}
          line={appLine(app)}
          href={href}
          {...(actions === undefined ? {} : { actions })}
        />
      }
      viewAll={<ViewAll href={href}>{t("explore.viewAll", { name })}</ViewAll>}
    >
      {presets.map((preset) => (
        <ExplorePresetTile
          key={preset.key}
          name={preset.name}
          entry={preset.entry}
        />
      ))}
    </MediaFeed>
  )
}

export function leadOf(
  row: ExploreRow
): { appId: string; entry: VisualEntry } | null {
  switch (row.kind) {
    case "presets": {
      const [first] = row.presets
      return first === undefined
        ? null
        : { appId: row.app.id, entry: first.entry }
    }
    case "model": {
      const [first] = row.entries
      return first === undefined ? null : { appId: row.appId, entry: first }
    }
    case "app": {
      const [first] = row.entries
      return first === undefined ? null : { appId: row.app.id, entry: first }
    }
  }
}

export function ExploreRowView({
  row,
  isLead,
  ...actions
}: ResultActions & { row: ExploreRow; isLead: boolean }): ReactElement {
  const appHref = useAppHref()
  const lead = isLead ? leadOf(row) : null
  const buttons =
    lead === null ? undefined : (
      <RowActions appId={lead.appId} entry={lead.entry} />
    )
  switch (row.kind) {
    case "presets":
      return (
        <PresetFeed app={row.app} presets={row.presets} actions={buttons} />
      )
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
          {...(buttons === undefined ? {} : { actions: buttons })}
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
          {...(buttons === undefined ? {} : { actions: buttons })}
        />
      )
  }
}

export function SharedFeed({
  entries,
  isLead,
  ...actions
}: ResultActions & {
  entries: readonly VisualEntry[]
  isLead: boolean
}): ReactElement {
  const router = useRouter()
  const [first] = entries
  return (
    <ResultFeed
      {...actions}
      title={t("explore.shared.title")}
      line={t("explore.shared.line")}
      href={router.buildLocation({ to: "/history" }).href}
      name={t("explore.shared.name")}
      layout="masonry"
      entries={entries}
      {...(isLead && first !== undefined
        ? {
            actions: <RowActions appId={first.run.appId} entry={first} />,
          }
        : {})}
    />
  )
}
