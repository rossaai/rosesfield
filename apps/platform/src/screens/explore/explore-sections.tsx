import type { AppListing } from "@rosesfield/contract"
import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { HeroBanner } from "@rosesfield/ui/components/hero"
import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { PresetGrid } from "@rosesfield/ui/components/preset-tile"
import { PromoCard, PromoRow } from "@rosesfield/ui/components/promo-card"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { useRouter } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
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

export function PromoCards({
  entries,
}: {
  entries: readonly VisualEntry[]
}): ReactNode {
  const appHref = useAppHref()
  const promos = promoEntries(entries)
  if (promos.length === 0) {
    return null
  }
  return (
    <PromoRow
      label={t("explore.promo.label")}
      className="-mx-4 mt-2 @regular:mt-6"
    >
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
          />
        ))}
      </AppTileGrid>
    </div>
  )
}

type FeedProps = ResultActions & {
  title: string
  line: string
  href: string
  name: string
  layout: "masonry" | "row"
  entries: readonly VisualEntry[]
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
}: {
  app: AppListing
  presets: readonly PresetEntry[]
}): ReactElement {
  const href = useAppHref()(app.id)
  const name = appName(app)
  return (
    <section
      aria-label={name}
      data-slot="preset-feed"
      className="flex w-full flex-col"
    >
      <div className="mb-5">
        <SectionHeader title={name} line={appLine(app)} href={href} />
      </div>
      <div className="relative max-h-224 overflow-hidden">
        <PresetGrid label={name}>
          {presets.map((preset) => (
            <ExplorePresetTile
              key={preset.key}
              name={preset.name}
              entry={preset.entry}
            />
          ))}
        </PresetGrid>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-52 items-end justify-center bg-linear-to-t from-(--ground) to-transparent pb-9">
          <ViewAll href={href}>{t("explore.viewAll", { name })}</ViewAll>
        </div>
      </div>
    </section>
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

export function SharedFeed({
  entries,
  ...actions
}: ResultActions & { entries: readonly VisualEntry[] }): ReactElement {
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
    />
  )
}
