import { interaction } from "@rosesfield/ui/components/interaction"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { AtSignIcon, PencilIcon, PlusIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

type TileButtonProps = {
  label: string
  icon: ReactNode
  onClick: () => void
}

function TileButton({ label, icon, onClick }: TileButtonProps): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={onClick}
            className={cn(
              "relative flex size-8 items-center justify-center rounded-dense text-ink [&_svg]:size-4",
              interaction.light,
              interaction.ring
            )}
          >
            {icon}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

type ReferenceTileProps = {
  referencesLabel: string
  elementsLabel: string
  onReferences: () => void
  onElements: () => void
}

function ReferenceTile(props: ReferenceTileProps): ReactElement {
  return (
    <div
      data-slot="composer-attachments-edge"
      className="flex h-8 w-16.25 shrink-0 items-center rounded-dense bg-(--well)"
    >
      <TileButton
        label={props.referencesLabel}
        icon={<PlusIcon aria-hidden="true" />}
        onClick={props.onReferences}
      />
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-(--line)" />
      <TileButton
        label={props.elementsLabel}
        icon={<AtSignIcon aria-hidden="true" />}
        onClick={props.onElements}
      />
    </div>
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
            "material-thin absolute top-1.5 right-1.5 inline-flex h-6 items-center gap-1 rounded-dense px-2 font-medium text-label text-ink [&_svg]:size-3",
            interaction.light,
            "group-hover/frame:after:opacity-10 group-active/frame:after:opacity-10"
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
  ...props
}: DropZoneProps): ReactElement {
  return (
    <button
      type="button"
      data-slot="composer-attachments-row"
      className={cn(
        "flex min-h-30 w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed border-(--line) bg-(--well) p-4 text-center",
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
            className="flex size-9 items-center justify-center rounded-full bg-(--tint) text-ink-muted [&_svg]:size-4"
          >
            {kind}
          </span>
        ))}
      </span>
      <span className="flex flex-col">
        <span className="font-medium text-body text-ink-muted">{title}</span>
        <span className="font-medium text-caption text-ink-muted">{line}</span>
      </span>
    </button>
  )
}

export type { DropZoneProps, ReferenceTileProps, StartFrameProps }
export { DropZone, ReferenceTile, StartFrame }
