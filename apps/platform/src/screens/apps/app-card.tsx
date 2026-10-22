import type { AppListing, Run } from "@rosesfield/contract"
import { Card } from "@rosesfield/ui/components/card"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { Link } from "@tanstack/react-router"
import { PlayIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { tCount } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { appIcon } from "@/shell/nav-rows"
import { type ShowcaseItem, showcaseOf } from "@/showcase/showcase"

const frame: MediaAspect = { width: 203, height: 196 }

const hovered =
  "group-hover/card:border-(--line) group-hover/card:bg-(--tint) in-data-[gallery=hover]:border-(--line) in-data-[gallery=hover]:bg-(--tint)"

const playShown =
  "group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100 in-data-[gallery=hover]:translate-y-0 in-data-[gallery=hover]:opacity-100"

type AppCardProps = {
  app: AppListing
  newest: Run | null
  working: number
}

function FrameMedia({
  app,
  newest,
  example,
}: Pick<AppCardProps, "app" | "newest"> & {
  example: ShowcaseItem | undefined
}): ReactElement {
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
  if (example !== undefined) {
    return (
      <MediaTile
        kind={example.kind}
        src={example.src}
        alt={appName(app)}
        aspect={frame}
      />
    )
  }
  return (
    <span
      className="flex w-full items-center justify-center bg-(--well) text-ink-muted [&_svg]:size-6"
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
    >
      {appIcon(app)}
    </span>
  )
}

function CardMedia({
  app,
  newest,
}: Pick<AppCardProps, "app" | "newest">): ReactElement {
  return (
    <span
      data-slot="app-card-media"
      className="relative block overflow-hidden rounded-cell"
    >
      <FrameMedia app={app} newest={newest} example={showcaseOf(app.id)[0]} />
      <span
        aria-hidden="true"
        data-slot="app-card-play"
        className={cn(
          "absolute right-2 bottom-2 flex size-8 translate-y-2 items-center justify-center rounded-full bg-ink text-canvas opacity-0 transition-[opacity,translate] duration-(--duration-control) [&_svg]:size-3 [&_svg]:fill-current",
          playShown
        )}
      >
        <PlayIcon />
      </span>
    </span>
  )
}

export function AppCard({ app, newest, working }: AppCardProps): ReactElement {
  return (
    <Link
      to="/apps/$appId"
      params={{ appId: app.id }}
      data-slot="app-card"
      className={cn(
        "group/card relative block w-62 shrink-0 snap-start rounded-card @regular:w-auto",
        interaction.ring
      )}
    >
      <Card
        className={cn(
          "h-full gap-0 border border-transparent p-4 transition-colors duration-(--duration-control)",
          hovered
        )}
      >
        <CardMedia app={app} newest={newest} />
        <div className="flex flex-col gap-1 py-4">
          <h3 className="font-medium text-body">{appName(app)}</h3>
          <p className="line-clamp-2 text-body text-ink-muted">
            {appLine(app)}
          </p>
          {working === 0 ? null : (
            <p className="text-caption text-ink">
              {tCount("apps.card.working", working)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
