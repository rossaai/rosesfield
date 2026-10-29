import type { AppListing, Run } from "@rosesfield/contract"
import { Card } from "@rosesfield/ui/components/card"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaBadge,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link } from "@tanstack/react-router"
import { PlayIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { tCount } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { KindFlow } from "@/pieces/kind-discs"
import { type ShowcaseItem, showcaseOf } from "@/showcase/showcase"

const frame: MediaAspect = { width: 1, height: 1 }

const tinted =
  "group-hover/card:bg-(--tint) in-data-[gallery=hover]:bg-(--tint)"

const playShown =
  "group-hover/card:opacity-100 group-focus-visible/card:opacity-100 in-data-[gallery=hover]:opacity-100"

type AppCardProps = {
  app: AppListing
  newest: Run | null
  working: number
}

export type AppCardForm = "media" | "compact"

export function appCardFormOf(
  app: AppListing,
  newest: Run | null,
  examples: readonly ShowcaseItem[] = showcaseOf(app.id)
): AppCardForm {
  const hasRun = newest !== null && newest.outputs[0] !== undefined
  return hasRun || examples.length > 0 ? "media" : "compact"
}

function FlowFrame({ app }: { app: AppListing }): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="app-card-flow"
      className="flex w-full items-center justify-center gap-s2 bg-(--well) text-ink-muted"
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
    >
      <KindFlow app={app} />
    </span>
  )
}

function FrameMedia({
  app,
  newest,
}: Pick<AppCardProps, "app" | "newest">): ReactElement {
  const media = newest?.outputs[0]
  if (media !== undefined && newest !== null) {
    return (
      <AssetTile
        assetId={media}
        shape="frame"
        aspectHint={frame}
        isDemo={newest.origin === "demo"}
        isStatic={true}
      />
    )
  }
  const example = showcaseOf(app.id)[0]
  return example === undefined ? (
    <FlowFrame app={app} />
  ) : (
    <MediaTile
      kind={example.kind}
      src={example.src}
      alt={appName(app)}
      aspect={frame}
      {...(example.focus === undefined ? {} : { focus: example.focus })}
    />
  )
}

function WorkingBadge({ working }: { working: number }): ReactElement | null {
  return working === 0 ? null : (
    <span data-slot="app-card-working" className="absolute top-2 left-2 flex">
      <MediaBadge>{tCount("apps.card.working", working)}</MediaBadge>
    </span>
  )
}

function CardMedia({ app, newest, working }: AppCardProps): ReactElement {
  return (
    <span
      data-slot="app-card-media"
      className="relative block overflow-hidden rounded-cell"
    >
      <FrameMedia app={app} newest={newest} />
      <WorkingBadge working={working} />
      {appCardFormOf(app, newest) === "compact" ? null : (
        <span
          aria-hidden="true"
          data-slot="app-card-play"
          className={cn(
            "absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-ink text-canvas opacity-0 [&_svg]:size-3 [&_svg]:fill-current",
            motion.tint,
            playShown
          )}
        >
          <PlayIcon />
        </span>
      )}
    </span>
  )
}

function CardLine({ text }: { text: string }): ReactElement {
  return (
    <p
      data-slot="app-card-line"
      className="line-clamp-2 min-h-[calc(2*var(--text-body--line-height))] text-body text-ink-muted"
    >
      {text}
    </p>
  )
}

export function AppCard({
  app,
  newest,
  working,
  width,
}: AppCardProps & { width?: number }): ReactElement {
  return (
    <Link
      to="/apps/$appId"
      params={{ appId: app.id }}
      data-slot="app-card"
      data-app-card={appCardFormOf(app, newest)}
      className={cn(
        "group/card relative block shrink-0 snap-start rounded-card",
        width === undefined ? "w-62 @regular:w-auto" : "",
        interaction.ring
      )}
      style={width === undefined ? undefined : { width }}
    >
      <Card className={cn("h-full gap-0 p-4", motion.tint, tinted)}>
        <CardMedia app={app} newest={newest} working={working} />
        <div className="flex flex-col gap-1 py-4">
          <h3 className="font-medium text-body">{appName(app)}</h3>
          <CardLine text={appLine(app)} />
        </div>
      </Card>
    </Link>
  )
}
