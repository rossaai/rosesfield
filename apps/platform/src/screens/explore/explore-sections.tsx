import type { AppListing } from "@rosesfield/contract"
import { HeroBanner, type HeroPortraits } from "@rosesfield/ui/components/hero"
import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { Skeleton, SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { useInView } from "@rosesfield/ui/hooks/use-in-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useRouter } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, useRef, useState } from "react"
import { appLine, appName } from "@/catalog/app-facts"
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
import {
  isHeldStill,
  type ShowcaseItem,
  showcaseItems,
} from "@/showcase/showcase"

export const bannerAppId = "image"

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

export function bannerPortraits(
  items: readonly ShowcaseItem[] = showcaseItems
): HeroPortraits {
  const start = items.find((item) => item.banner === "start")
  const end = items.find((item) => item.banner === "end")
  return {
    ...(start === undefined ? {} : { start: start.src }),
    ...(end === undefined ? {} : { end: end.src }),
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
        action={t("explore.banner.action")}
        portraits={bannerPortraits()}
      />
    </Reveal>
  )
}

function AppMedia({ promo }: { promo: PromoEntry }): ReactElement {
  const src = useEntrySrc(promo.entry)
  const name = appName(promo.app)
  return (
    <a
      href={useAppHref()(promo.app.id)}
      data-slot="explore-app"
      aria-label={t("explore.promo.open", { app: name })}
      className={cn(
        "group/app flex min-w-0 flex-col gap-s3 rounded-cell text-ink no-underline",
        motion.press
      )}
    >
      <span className="relative block aspect-video w-full overflow-hidden rounded-cell bg-(--well) *:size-full *:object-cover">
        {src === null ? null : (
          <MediaTile kind={promo.entry.kind} src={src} alt={name} />
        )}
      </span>
      <span className="truncate font-medium text-body">{name}</span>
    </a>
  )
}

export const appSkeletonCount = 4

function AppMediaSkeleton(): ReactElement {
  return (
    <SkeletonGroup className="flex flex-col gap-s3">
      <Skeleton className="aspect-video w-full" />
      <Skeleton shape="line" text="body" measure="short" />
    </SkeletonGroup>
  )
}

export function AppsRow({
  entries,
  isLoading,
}: {
  entries: readonly VisualEntry[]
  isLoading: boolean
}): ReactNode {
  const router = useRouter()
  const promos = promoEntries(entries)
  if (promos.length === 0 && !isLoading) {
    return null
  }
  return (
    <Reveal>
      <MediaFeed
        label={t("explore.apps.label")}
        layout="row"
        rowLabels={{ previous: t("viewer.previous"), next: t("viewer.next") }}
        header={
          <SectionHeader
            title={t("explore.apps.label")}
            href={router.buildLocation({ to: "/apps" }).href}
          />
        }
      >
        {promos.length === 0
          ? Array.from({ length: appSkeletonCount }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
              <AppMediaSkeleton key={index} />
            ))
          : promos.map((promo) => (
              <AppMedia key={promo.app.id} promo={promo} />
            ))}
      </MediaFeed>
    </Reveal>
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

const rowLabels = (): { previous: string; next: string } => ({
  previous: t("viewer.previous"),
  next: t("viewer.next"),
})

export function ResultFeed(props: FeedProps): ReactElement {
  return (
    <Reveal>
      <MediaFeed
        label={props.title}
        layout={props.layout}
        rowLabels={rowLabels()}
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

function tallness(entry: VisualEntry): number {
  return entry.aspect.height / entry.aspect.width
}

export function heldStills(entries: readonly VisualEntry[]): VisualEntry[] {
  return entries
    .filter((entry) => isHeldStill(entry.run.id))
    .sort((first, second) => tallness(second) - tallness(first))
}

export function ShowcaseFeed({
  entries,
  ...actions
}: ResultActions & { entries: readonly VisualEntry[] }): ReactNode {
  const router = useRouter()
  const stills = heldStills(entries)
  if (stills.length === 0) {
    return null
  }
  return (
    <Reveal>
      <MediaFeed
        label={t("explore.showcase.title")}
        header={
          <SectionHeader
            title={t("explore.showcase.title")}
            actions={
              <ViewAll href={router.buildLocation({ to: "/apps" }).href}>
                {t("explore.showcase.viewAll")}
              </ViewAll>
            }
          />
        }
      >
        {stills.map((entry) => (
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
