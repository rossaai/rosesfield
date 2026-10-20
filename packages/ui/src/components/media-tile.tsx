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
  ref?: Ref<HTMLElement>
  className?: string
}

function aspectStyle(aspect: MediaAspect | undefined): CSSProperties {
  return aspect === undefined
    ? {}
    : { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

function TileVideo({
  src,
  poster,
  alt,
  fitClass,
}: {
  src: string
  poster: string | undefined
  alt: string
  fitClass: string
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
      preload="none"
      className={fitClass}
    />
  )
}

const pillClass =
  "material absolute bottom-s2 left-s2 max-w-[calc(100%-2*var(--spacing-s2))] truncate whitespace-nowrap rounded-full px-s1_5 py-hairline text-caption text-ink"

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
}: MediaTileProps): ReactElement {
  const fitClass = cn(
    "size-full",
    fit === "cover" ? "object-cover" : "object-contain"
  )
  return (
    <>
      {kind === "video" ? (
        <TileVideo src={src} poster={poster} alt={alt} fitClass={fitClass} />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
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
export { MediaTile }
