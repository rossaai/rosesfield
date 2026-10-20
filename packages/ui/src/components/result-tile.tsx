import { Button, IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  CopyIcon,
  EllipsisIcon,
  ImageIcon,
  MaximizeIcon,
  VideoIcon,
} from "lucide-react"
import type { CSSProperties, ReactElement, ReactNode } from "react"

type Corners = {
  topLeft: string
  topRight: string
  bottomRight: string
  besideSound: string
}

const cardCorners: Corners = {
  topLeft: "top-2 left-2",
  topRight: "top-2 right-2",
  bottomRight: "right-2 bottom-2",
  besideSound: "right-14 bottom-2",
}

const libraryCorners: Corners = {
  topLeft: "top-3 left-3",
  topRight: "top-3 right-3",
  bottomRight: "right-3 bottom-3",
  besideSound: "right-14 bottom-3",
}

type ResultTileProps = {
  kind: "image" | "video"
  src: string
  alt: string
  poster?: string
  aspect: MediaAspect
  app: string
  model?: string
  openLabel: string
  expandLabel: string
  moreLabel: string
  recreateLabel: string
  recreateName: string
  onOpen: (origin: HTMLElement) => void
  onRecreate: () => void
  onMore?: () => void
  sound?: ReactNode
  form?: "card" | "library"
  narrow?: boolean
  className?: string
}

function aspectStyle(aspect: MediaAspect): CSSProperties {
  return { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

function isCompact(props: ResultTileProps): boolean {
  return props.form !== "library" && props.narrow !== false
}

function Actions(props: ResultTileProps & { corners: Corners }): ReactElement {
  const compact = isCompact(props)
  return (
    <span
      data-slot="result-tile-actions"
      className={cn(
        "absolute z-20 hidden flex-col @regular:flex",
        props.corners.topRight,
        compact ? "gap-3" : "gap-2",
        interaction.reveal,
        interaction.revealPointer
      )}
    >
      <IconButton
        label={props.expandLabel}
        place={compact ? "card" : "cardWide"}
        tone="glass"
        onClick={(event) => props.onOpen(event.currentTarget)}
      >
        <MaximizeIcon aria-hidden="true" />
      </IconButton>
      <IconButton
        label={props.moreLabel}
        aria-haspopup="menu"
        place={compact ? "card" : "cardWide"}
        tone="glass"
        onClick={() => props.onMore?.()}
      >
        <EllipsisIcon aria-hidden="true" />
      </IconButton>
    </span>
  )
}

const veilClass =
  "pointer-events-none absolute z-20 hidden max-w-[calc(100%-var(--spacing)*24)] items-center gap-1 truncate font-medium text-caption text-ink @regular:flex"

function Recreate(props: ResultTileProps & { corners: Corners }): ReactElement {
  const compact = isCompact(props)
  return (
    <span
      className={cn(
        "absolute z-30 hidden @regular:flex",
        props.sound === undefined
          ? props.corners.bottomRight
          : props.corners.besideSound,
        interaction.reveal,
        interaction.revealPointer
      )}
    >
      <Button
        tone="accent"
        size={compact ? "recreateSmall" : "recreate"}
        aria-label={props.recreateName}
        onClick={props.onRecreate}
        className="rounded-dense"
      >
        <CopyIcon aria-hidden="true" />
        {props.recreateLabel}
      </Button>
    </span>
  )
}

function ResultTile(props: ResultTileProps): ReactElement {
  const corners = props.form === "library" ? libraryCorners : cardCorners
  return (
    <figure
      data-slot="media"
      data-form={props.form ?? "card"}
      className={cn(
        "group/reveal relative m-0 w-full overflow-hidden rounded-cell bg-(--well)",
        props.className
      )}
      style={aspectStyle(props.aspect)}
    >
      <MediaTile
        kind={props.kind}
        src={props.src}
        alt={props.alt}
        {...(props.poster === undefined ? {} : { poster: props.poster })}
        className="absolute inset-0 rounded-none"
      />
      <button
        type="button"
        aria-label={props.openLabel}
        onClick={(event) => props.onOpen(event.currentTarget)}
        className={cn("absolute inset-0 z-10 rounded-cell", interaction.ring)}
      />
      <span
        data-slot="media-veil"
        className={cn(veilClass, corners.topLeft, interaction.reveal)}
      >
        {props.kind === "video" ? (
          <VideoIcon aria-hidden="true" className="size-3 shrink-0" />
        ) : (
          <ImageIcon aria-hidden="true" className="size-3 shrink-0" />
        )}
        <span className="truncate">
          {props.model === undefined || props.model === ""
            ? props.app
            : `${props.app} · ${props.model}`}
        </span>
      </span>
      <Actions {...props} corners={corners} />
      {props.sound === undefined ? null : (
        <span
          data-slot="result-tile-sound"
          className="absolute right-2 bottom-2 z-20 flex"
        >
          {props.sound}
        </span>
      )}
      <Recreate {...props} corners={corners} />
    </figure>
  )
}

export type { ResultTileProps }
export { ResultTile }
