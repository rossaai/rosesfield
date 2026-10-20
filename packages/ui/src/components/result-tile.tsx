import { Button, IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  type MediaAspect,
  MediaTile,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { CopyIcon, EllipsisIcon, MaximizeIcon } from "lucide-react"
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

const narrowMax = 320

type Corners = { topLeft: string; topRight: string; bottomRight: string }

const cardCorners: Corners = {
  topLeft: "top-2 left-2",
  topRight: "top-2 right-2",
  bottomRight: "right-2 bottom-2",
}

const libraryCorners: Corners = {
  topLeft: "top-3 left-3",
  topRight: "top-3 right-3",
  bottomRight: "right-3 bottom-3",
}

type ResultTileProps = {
  kind: "image" | "video"
  src: string
  alt: string
  poster?: string
  aspect: MediaAspect
  app: string
  model: string
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
  className?: string
}

function useIsNarrow(ref: RefObject<HTMLElement | null>): boolean {
  const [isNarrow, setNarrow] = useState(true)
  useEffect(() => {
    const element = ref.current
    if (element === null || typeof ResizeObserver === "undefined") {
      return
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setNarrow(entry.contentRect.width <= narrowMax)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return isNarrow
}

function aspectStyle(aspect: MediaAspect): CSSProperties {
  return { aspectRatio: `${aspect.width} / ${aspect.height}` }
}

function Actions(
  props: ResultTileProps & { isNarrow: boolean; corners: Corners }
): ReactElement {
  const isCompact = props.isNarrow && props.form !== "library"
  return (
    <span
      data-slot="result-tile-actions"
      className={cn(
        "absolute z-20 hidden flex-col @regular:flex",
        props.corners.topRight,
        isCompact ? "gap-3" : "gap-2",
        interaction.reveal
      )}
    >
      <IconButton
        label={props.expandLabel}
        place={isCompact ? "card" : "cardWide"}
        tone="glass"
        onClick={(event) => props.onOpen(event.currentTarget)}
      >
        <MaximizeIcon aria-hidden="true" />
      </IconButton>
      <IconButton
        label={props.moreLabel}
        aria-haspopup="menu"
        place={isCompact ? "card" : "cardWide"}
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

function Recreate(
  props: ResultTileProps & { isNarrow: boolean; corners: Corners }
): ReactElement {
  const isCompact = props.isNarrow && props.form !== "library"
  return (
    <span
      className={cn(
        "absolute z-30 hidden @regular:flex",
        props.corners.bottomRight,
        interaction.reveal
      )}
    >
      <Button
        tone="accent"
        size={isCompact ? "recreateSmall" : "recreate"}
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
  const frame = useRef<HTMLElement>(null)
  const isNarrow = useIsNarrow(frame)
  const corners = props.form === "library" ? libraryCorners : cardCorners
  return (
    <figure
      ref={frame}
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
        {`${props.app} · ${props.model}`}
      </span>
      <Actions {...props} isNarrow={isNarrow} corners={corners} />
      {props.sound === undefined ? null : (
        <span className="absolute right-2 bottom-2 z-20 flex">{props.sound}</span>
      )}
      <Recreate {...props} isNarrow={isNarrow} corners={corners} />
    </figure>
  )
}

export type { ResultTileProps }
export { ResultTile }
