import { interaction } from "@rosesfield/ui/components/interaction"
import { useInView } from "@rosesfield/ui/hooks/use-in-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { mergeRefs } from "@rosesfield/ui/lib/merge-refs"
import { prefersReducedMotion } from "@rosesfield/ui/motion"
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
  useRef,
} from "react"

type MediaAspect = {
  readonly width: number
  readonly height: number
}

type MediaTileProps = {
  kind: "image" | "video"
  src: string
  alt: string
  poster?: string
  aspect?: MediaAspect
  fit?: "cover" | "contain"
  caption?: ReactNode
  length?: ReactNode
  onOpen?: (origin: HTMLElement) => void
  onShape?: (shape: MediaAspect) => void
  ref?: Ref<HTMLElement>
  className?: string
}

function aspectStyle(aspect: MediaAspect | undefined): CSSProperties {
  return aspect === undefined
    ? {}
    : { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

function shapeOf(width: number, height: number): MediaAspect | null {
  return width > 0 && height > 0 ? { width, height } : null
}

function TileVideo({
  src,
  poster,
  alt,
  fitClass,
  onShape,
}: {
  src: string
  poster: string | undefined
  alt: string
  fitClass: string
  onShape: ((shape: MediaAspect) => void) | undefined
}): ReactElement {
  const video = useRef<HTMLVideoElement>(null)
  useInView(video, (isInView) => {
    const element = video.current
    if (element === null) {
      return
    }
    if (isInView && !prefersReducedMotion()) {
      element.dataset.playback = "playing"
      element.play()?.catch(() => {
        element.dataset.playback = "paused"
      })
    } else {
      element.dataset.playback = "paused"
      element.pause()
    }
  })
  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      aria-label={alt}
      data-playback="paused"
      muted
      loop
      playsInline
      preload={onShape === undefined ? "none" : "metadata"}
      onLoadedMetadata={(event) => {
        const shape = shapeOf(
          event.currentTarget.videoWidth,
          event.currentTarget.videoHeight
        )
        if (shape !== null) {
          onShape?.(shape)
        }
      }}
      className={fitClass}
    />
  )
}

const badgeClass =
  "max-w-full truncate whitespace-nowrap rounded-full px-s1_5 py-hairline text-caption"

const badgeGrounds = {
  media: "material text-ink",
  plain: "bg-(--well) text-ink-muted",
} as const

const pillClass = `${badgeClass} ${badgeGrounds.media} absolute bottom-s2 left-s2 max-w-[calc(100%-2*var(--spacing-s2))]`

function MediaBadge({
  children,
  ground = "media",
  className,
}: {
  children: ReactNode
  ground?: keyof typeof badgeGrounds
  className?: string
}): ReactElement {
  return (
    <span
      data-slot="media-badge"
      className={cn(badgeClass, badgeGrounds[ground], className)}
    >
      {children}
    </span>
  )
}

function TileCaption({
  caption,
  length,
}: {
  caption: ReactNode
  length: ReactNode
}): ReactElement | null {
  if (caption === undefined && length === undefined) {
    return null
  }
  return (
    <span data-slot="media-tile-caption" className={pillClass}>
      {caption}
      {caption === undefined || length === undefined ? null : ", "}
      {length}
    </span>
  )
}

function TileBody({
  kind,
  src,
  alt,
  poster,
  fit = "cover",
  caption,
  length,
  onShape,
}: MediaTileProps): ReactElement {
  const fitClass = cn(
    "size-full",
    fit === "cover" ? "object-cover" : "object-contain"
  )
  return (
    <>
      {kind === "video" ? (
        <TileVideo
          src={src}
          poster={poster}
          alt={alt}
          fitClass={fitClass}
          onShape={onShape}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={(event) => {
            const shape = shapeOf(
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight
            )
            if (shape !== null) {
              onShape?.(shape)
            }
          }}
          className={fitClass}
        />
      )}
      <TileCaption caption={caption} length={length} />
    </>
  )
}

function MediaTile(props: MediaTileProps): ReactElement {
  const { aspect, onOpen, ref } = props
  const tileClass = cn(
    "relative block overflow-hidden rounded-cell bg-(--well) text-left",
    aspect === undefined ? "size-full" : "w-full",
    props.className
  )
  if (onOpen === undefined) {
    return (
      <figure
        ref={ref}
        data-slot="media-tile"
        className={tileClass}
        style={aspectStyle(aspect)}
      >
        <TileBody {...props} />
      </figure>
    )
  }
  return (
    <button
      type="button"
      ref={mergeRefs(ref)}
      data-slot="media-tile"
      aria-label={props.alt}
      onClick={(event) => onOpen(event.currentTarget)}
      className={cn(tileClass, interaction.light, interaction.ring)}
      style={aspectStyle(aspect)}
    >
      <TileBody {...props} />
    </button>
  )
}

export type { MediaAspect, MediaTileProps }
export { MediaBadge, MediaTile }
