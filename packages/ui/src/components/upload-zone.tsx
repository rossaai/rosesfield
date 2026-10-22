import { buttonVariants, IconButton } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { AtSignIcon, PencilIcon, PlusIcon } from "lucide-react"
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useState,
} from "react"

type ReferenceTileProps = {
  referencesLabel: string
  elementsLabel: string
  onReferences: () => void
  onElements: () => void
}

function ReferenceTile(props: ReferenceTileProps): ReactElement {
  return (
    <span
      data-slot="composer-attachments-edge"
      className="flex shrink-0 items-center gap-s2"
    >
      <IconButton
        label={props.referencesLabel}
        tone="quiet"
        size="dense"
        onClick={props.onReferences}
      >
        <PlusIcon aria-hidden="true" />
      </IconButton>
      <IconButton
        label={props.elementsLabel}
        tone="quiet"
        size="dense"
        onClick={props.onElements}
      >
        <AtSignIcon aria-hidden="true" />
      </IconButton>
    </span>
  )
}

type StartFrameProps = {
  src: string
  poster?: string
  alt: string
  title: string
  line: string
  changeLabel: string
  onChange: () => void
}

function StartFrame(props: StartFrameProps): ReactElement {
  return (
    <figure
      data-slot="composer-attachments-tiles"
      className={cn(
        "group/frame relative m-0 h-32.5 w-full shrink-0 overflow-hidden rounded-cell bg-(--well)",
        interaction.ringHost
      )}
    >
      <video
        src={props.src}
        poster={props.poster}
        aria-label={props.alt}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        className="size-full object-cover"
      />
      <span
        aria-hidden="true"
        data-slot="start-frame-scrim"
        data-theme="dark"
        className="absolute inset-0 bg-linear-to-b from-transparent to-scrim to-50%"
      />
      <figcaption
        data-theme="dark"
        className="absolute inset-x-3 bottom-3 flex min-w-0 flex-col"
      >
        <span className="truncate font-medium text-title text-ink">
          {props.title}
        </span>
        <span className="truncate text-caption text-ink-muted">
          {props.line}
        </span>
      </figcaption>
      <button
        type="button"
        data-cover=""
        onClick={props.onChange}
        className={cn("absolute inset-0 rounded-cell", interaction.cover)}
      >
        <span
          data-slot="start-frame-change"
          className={cn(
            buttonVariants({ tone: "glass", size: "small" }),
            "absolute top-s2 right-s2 text-label"
          )}
        >
          <PencilIcon aria-hidden="true" />
          {props.changeLabel}
        </span>
      </button>
    </figure>
  )
}

type DropZoneProps = Omit<ComponentProps<"button">, "children"> & {
  title: string
  line: string
  kinds: ReadonlyArray<ReactNode>
}

function DropZone({
  title,
  line,
  kinds,
  className,
  onDragEnter,
  onDragLeave,
  onDrop,
  ...props
}: DropZoneProps): ReactElement {
  const [isOver, setOver] = useState(false)
  return (
    <button
      type="button"
      data-slot="composer-attachments-row"
      data-drop={isOver ? "over" : "rest"}
      onDragEnter={(event) => {
        setOver(true)
        onDragEnter?.(event)
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node && event.currentTarget.contains(next))) {
          setOver(false)
        }
        onDragLeave?.(event)
      }}
      onDrop={(event) => {
        setOver(false)
        onDrop?.(event)
      }}
      className={cn(
        "flex min-h-30 w-full flex-col items-center justify-center gap-s3 rounded-card bg-(--well) p-s5 text-center hover:bg-(--tint) data-[drop=over]:bg-(--tint)",
        motion.tint,
        interaction.ring,
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className="flex -space-x-2">
        {kinds.map((kind, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the discs are a fixed row of glyphs
            key={index}
            className="flex size-icon items-center justify-center rounded-full bg-(--ground) text-ink-muted [&_svg]:glyph"
          >
            {kind}
          </span>
        ))}
      </span>
      <span className="flex flex-col">
        <span className="font-medium text-body text-ink">{title}</span>{" "}
        <span className="text-caption text-ink-muted">{line}</span>
      </span>
    </button>
  )
}

export type { DropZoneProps, ReferenceTileProps, StartFrameProps }
export { DropZone, ReferenceTile, StartFrame }
