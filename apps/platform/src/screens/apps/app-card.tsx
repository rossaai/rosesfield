import type { AppListing, Run } from "@rosesfield/contract"
import { Card } from "@rosesfield/ui/components/card"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  FileAudioIcon,
  FileTextIcon,
  ImageIcon,
  PlayIcon,
  TypeIcon,
  UserRoundIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import {
  appLine,
  appName,
  type OutputKind,
  type TakenKind,
  takenKindsOf,
} from "@/catalog/app-facts"
import { outputKindsOf } from "@/catalog/app-workflows"
import { tCount } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { type ShowcaseItem, showcaseOf } from "@/showcase/showcase"

const frame: MediaAspect = { width: 203, height: 196 }

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

const kindGlyphs = {
  prompt: TypeIcon,
  character: UserRoundIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: FileAudioIcon,
  text: FileTextIcon,
} satisfies Record<TakenKind | OutputKind, typeof ImageIcon>

function KindDisc({
  kind,
  isMade,
}: {
  kind: TakenKind | OutputKind
  isMade: boolean
}): ReactElement {
  const Glyph = kindGlyphs[kind]
  return (
    <span
      data-kind={kind}
      data-made={isMade ? "yes" : "no"}
      className={cn(
        "flex size-10 items-center justify-center rounded-full [&_svg]:glyph",
        isMade ? "bg-ink text-canvas" : "bg-(--ground) text-ink-muted"
      )}
    >
      <Glyph />
    </span>
  )
}

function FlowFrame({ app }: { app: AppListing }): ReactElement {
  const taken = takenKindsOf(app)
  return (
    <span
      aria-hidden="true"
      data-slot="app-card-flow"
      className="flex w-full items-center justify-center gap-s2 bg-(--well) text-ink-muted"
      style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
    >
      {taken.length === 0 ? null : (
        <>
          <span className="flex -space-x-2">
            {taken.map((kind) => (
              <KindDisc key={kind} kind={kind} isMade={false} />
            ))}
          </span>
          <ArrowRightIcon className="glyph-small" />
        </>
      )}
      <span className="flex -space-x-2">
        {outputKindsOf(app).map((kind) => (
          <KindDisc key={kind} kind={kind} isMade={true} />
        ))}
      </span>
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
    />
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
      <FrameMedia app={app} newest={newest} />
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

function WorkingLine({ working }: { working: number }): ReactElement | null {
  return working === 0 ? null : (
    <p className="text-caption text-ink">
      {tCount("apps.card.working", working)}
    </p>
  )
}

export function AppCard({ app, newest, working }: AppCardProps): ReactElement {
  return (
    <Link
      to="/apps/$appId"
      params={{ appId: app.id }}
      data-slot="app-card"
      data-app-card={appCardFormOf(app, newest)}
      className={cn(
        "group/card relative block w-62 shrink-0 snap-start rounded-card @regular:w-auto",
        interaction.ring
      )}
    >
      <Card className={cn("h-full gap-0 p-4", motion.tint, tinted)}>
        <CardMedia app={app} newest={newest} />
        <div className="flex flex-col gap-1 py-4">
          <h3 className="font-medium text-body">{appName(app)}</h3>
          <p className="truncate text-body text-ink-muted">{appLine(app)}</p>
          <WorkingLine working={working} />
        </div>
      </Card>
    </Link>
  )
}
