import { Button, IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaBadge,
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

type MediaChromeForm = "card" | "library"

const insets = {
  card: {
    top: "top-s2",
    start: "start-s2",
    end: "end-s2",
    bottom: "bottom-s2",
  },
  library: {
    top: "top-s3",
    start: "start-s3",
    end: "end-s3",
    bottom: "bottom-s3",
  },
} satisfies Record<MediaChromeForm, Record<string, string>>

type MediaChromeProps = {
  facts?: ReactNode
  actions?: ReactNode
  action?: ReactNode
  form?: MediaChromeForm
}

function MediaChrome({
  facts,
  actions,
  action,
  form = "card",
}: MediaChromeProps): ReactElement {
  const inset = insets[form]
  return (
    <>
      {facts === undefined ? null : (
        <span
          data-slot="media-chrome-facts"
          className={cn(
            "pointer-events-none absolute z-20 hidden max-w-[calc(100%-var(--spacing-icon-dense)*2-var(--spacing-s2)*3)] flex-wrap gap-s1 @regular:flex",
            inset.top,
            inset.start,
            interaction.reveal
          )}
        >
          {facts}
        </span>
      )}
      {actions === undefined ? null : (
        <span
          data-slot="media-chrome-actions"
          data-density="composer"
          className={cn(
            "absolute z-20 hidden gap-s1 @regular:flex",
            inset.top,
            inset.end,
            interaction.reveal,
            interaction.revealPointer
          )}
        >
          {actions}
        </span>
      )}
      {action === undefined ? null : (
        <span
          data-slot="media-chrome-action"
          data-density="row"
          className={cn(
            "absolute z-30 hidden @regular:flex",
            inset.bottom,
            inset.end,
            interaction.reveal,
            interaction.revealPointer
          )}
        >
          {action}
        </span>
      )}
    </>
  )
}

type ResultTileProps = {
  kind: "image" | "video"
  src: string
  alt: string
  poster?: string
  aspect: MediaAspect
  app: string
  model?: string
  mark?: ReactNode
  openLabel: string
  expandLabel: string
  moreLabel: string
  recreateLabel: string
  recreateName: string
  onOpen: (origin: HTMLElement) => void
  onRecreate: () => void
  onMore?: () => void
  sound?: ReactNode
  form?: MediaChromeForm
  className?: string
}

function aspectStyle(aspect: MediaAspect): CSSProperties {
  return { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

function Facts(props: ResultTileProps): ReactElement {
  const named =
    props.model === undefined || props.model === ""
      ? props.app
      : `${props.app} · ${props.model}`
  return (
    <MediaBadge
      mark={
        props.mark ??
        (props.kind === "video" ? (
          <VideoIcon aria-hidden="true" />
        ) : (
          <ImageIcon aria-hidden="true" />
        ))
      }
    >
      {named}
    </MediaBadge>
  )
}

function ResultTile(props: ResultTileProps): ReactElement {
  const form = props.form ?? "card"
  return (
    <figure
      data-slot="media"
      data-form={form}
      className={cn(
        "group/reveal relative m-0 w-full overflow-hidden rounded-cell bg-(--well)",
        interaction.ringHost,
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
        data-cover=""
        aria-label={props.openLabel}
        onClick={(event) => props.onOpen(event.currentTarget)}
        className={cn("absolute inset-0 z-10 rounded-cell", interaction.cover)}
      />
      <MediaChrome
        form={form}
        facts={<Facts {...props} />}
        actions={
          <>
            <IconButton
              label={props.expandLabel}
              tone="glass"
              onClick={(event) => props.onOpen(event.currentTarget)}
            >
              <MaximizeIcon aria-hidden="true" />
            </IconButton>
            <IconButton
              label={props.moreLabel}
              aria-haspopup="menu"
              tone="glass"
              onClick={() => props.onMore?.()}
            >
              <EllipsisIcon aria-hidden="true" />
            </IconButton>
          </>
        }
        action={
          <Button
            tone="glass"
            aria-label={props.recreateName}
            onClick={props.onRecreate}
          >
            <CopyIcon aria-hidden="true" />
            {props.recreateLabel}
          </Button>
        }
      />
      {props.sound === undefined ? null : (
        <span
          data-slot="result-tile-sound"
          className="absolute start-s2 bottom-s2 z-20 flex"
        >
          {props.sound}
        </span>
      )}
    </figure>
  )
}

export type { MediaChromeForm, MediaChromeProps, ResultTileProps }
export { MediaChrome, ResultTile }
