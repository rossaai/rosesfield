import { interaction } from "@rosesfield/ui/components/interaction"
import { useInView } from "@rosesfield/ui/hooks/use-in-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { mergeRefs } from "@rosesfield/ui/lib/merge-refs"
import { motion, prefersReducedMotion } from "@rosesfield/ui/motion"
import {
  type CSSProperties,
  createContext,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  useContext,
  useEffect,
  useRef,
  useState,
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
  index?: number
  onOpen?: (origin: HTMLElement) => void
  onShape?: (shape: MediaAspect) => void
  ref?: Ref<HTMLElement>
  className?: string
}

type Arrival = "waiting" | "loaded"

const ArrivalIndex = createContext<number | null>(null)

const arrivalSteps = [
  "[--arrival-index:0]",
  "[--arrival-index:1]",
  "[--arrival-index:2]",
  "[--arrival-index:3]",
  "[--arrival-index:4]",
  "[--arrival-index:5]",
  "[--arrival-index:6]",
  "[--arrival-index:7]",
  "[--arrival-index:8]",
] as const

function arrivalStepOf(index: number | null): string {
  if (index === null) {
    return ""
  }
  const step = Math.max(0, Math.min(index, arrivalSteps.length - 1))
  return arrivalSteps[step] ?? ""
}

function aspectStyle(aspect: MediaAspect | undefined): CSSProperties {
  return aspect === undefined
    ? {}
    : { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

function shapeOf(width: number, height: number): MediaAspect | null {
  return width > 0 && height > 0 ? { width, height } : null
}

function usePosterArrival(
  poster: string | undefined,
  onLoaded: () => void
): void {
  const latest = useRef(onLoaded)
  useEffect(() => {
    latest.current = onLoaded
  })
  useEffect(() => {
    if (poster === undefined || typeof Image === "undefined") {
      return
    }
    let isCurrent = true
    const picture = new Image()
    picture.src = poster
    const arrive = (): void => {
      if (isCurrent) {
        latest.current()
      }
    }
    if (typeof picture.decode === "function") {
      picture.decode().then(arrive, arrive)
    } else {
      arrive()
    }
    return () => {
      isCurrent = false
    }
  }, [poster])
}

function TileVideo({
  src,
  poster,
  alt,
  mediaClass,
  arrival,
  onShape,
  onLoaded,
}: {
  src: string
  poster: string | undefined
  alt: string
  mediaClass: string
  arrival: Arrival
  onShape: ((shape: MediaAspect) => void) | undefined
  onLoaded: () => void
}): ReactElement {
  const video = useRef<HTMLVideoElement>(null)
  usePosterArrival(poster, onLoaded)
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
      data-arrival={arrival}
      muted
      loop
      playsInline
      preload={
        poster === undefined || onShape !== undefined ? "metadata" : "none"
      }
      onLoadedMetadata={(event) => {
        const shape = shapeOf(
          event.currentTarget.videoWidth,
          event.currentTarget.videoHeight
        )
        if (shape !== null) {
          onShape?.(shape)
        }
        if (poster === undefined) {
          onLoaded()
        }
      }}
      onLoadedData={onLoaded}
      onError={onLoaded}
      className={mediaClass}
    />
  )
}

const badgeClass =
  "inline-flex max-w-full min-w-0 items-center gap-s1 truncate whitespace-nowrap rounded-full px-s1_5 py-hairline text-caption [&_svg]:glyph-small"

const badgeGrounds = {
  media: "material-thin text-ink",
  plain: "bg-(--well) text-ink-muted",
} as const

function MediaBadge({
  children,
  mark,
  ground = "media",
  className,
}: {
  children: ReactNode
  mark?: ReactNode
  ground?: keyof typeof badgeGrounds
  className?: string
}): ReactElement {
  return (
    <span
      data-slot="media-badge"
      className={cn(badgeClass, badgeGrounds[ground], className)}
    >
      {mark === undefined ? null : (
        <span
          aria-hidden="true"
          data-slot="media-badge-mark"
          className="flex shrink-0"
        >
          {mark}
        </span>
      )}
      <span className="min-w-0 truncate">{children}</span>
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
    <span
      data-slot="media-tile-caption"
      className="absolute bottom-s2 left-s2 flex max-w-[calc(100%-2*var(--spacing-s2))]"
    >
      <MediaBadge>
        {caption}
        {caption === undefined || length === undefined ? null : ", "}
        {length}
      </MediaBadge>
    </span>
  )
}

function decodeThen(
  event: SyntheticEvent<HTMLImageElement>,
  done: () => void
): void {
  const picture = event.currentTarget
  if (typeof picture.decode !== "function") {
    done()
    return
  }
  picture.decode().then(done, done)
}

function TileBody(
  props: MediaTileProps & { arrival: Arrival; onLoaded: () => void }
): ReactElement {
  const { kind, src, alt, poster, fit = "cover", onShape, onLoaded } = props
  const mediaClass = cn(
    "size-full",
    fit === "cover" ? "object-cover" : "object-contain",
    motion.enter
  )
  return (
    <>
      {kind === "video" ? (
        <TileVideo
          src={src}
          poster={poster}
          alt={alt}
          mediaClass={mediaClass}
          arrival={props.arrival}
          onShape={onShape}
          onLoaded={onLoaded}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          data-arrival={props.arrival}
          onLoad={(event) => {
            const shape = shapeOf(
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight
            )
            if (shape !== null) {
              onShape?.(shape)
            }
            decodeThen(event, onLoaded)
          }}
          onError={onLoaded}
          className={mediaClass}
        />
      )}
      <TileCaption caption={props.caption} length={props.length} />
    </>
  )
}

function useArrival(): { arrival: Arrival; onLoaded: () => void } {
  const [arrival, setArrival] = useState<Arrival>("waiting")
  return { arrival, onLoaded: () => setArrival("loaded") }
}

function MediaTile(props: MediaTileProps): ReactElement {
  const { aspect, onOpen, ref } = props
  const listed = useContext(ArrivalIndex)
  const { arrival, onLoaded } = useArrival()
  const tileClass = cn(
    "relative block overflow-hidden rounded-cell bg-(--well) text-left",
    aspect === undefined ? "size-full" : "w-full",
    arrival === "waiting" ? motion.pulse : "",
    arrivalStepOf(props.index ?? listed),
    props.className
  )
  const body = <TileBody {...props} arrival={arrival} onLoaded={onLoaded} />
  if (onOpen === undefined) {
    return (
      <figure
        ref={ref}
        data-slot="media-tile"
        data-arrival={arrival}
        className={tileClass}
        style={aspectStyle(aspect)}
      >
        {body}
      </figure>
    )
  }
  return (
    <button
      type="button"
      ref={mergeRefs(ref)}
      data-slot="media-tile"
      data-arrival={arrival}
      aria-label={props.alt}
      onClick={(event) => onOpen(event.currentTarget)}
      className={cn(tileClass, interaction.ring)}
      style={aspectStyle(aspect)}
    >
      {body}
    </button>
  )
}

export type { MediaAspect, MediaTileProps }
export { ArrivalIndex, MediaBadge, MediaTile }
