import type {
  SkeletonCorner,
  SkeletonGround,
  SkeletonMeasure,
  SkeletonSize,
  SkeletonText,
} from "@rosesfield/ui/contracts/skeleton.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  useContext,
} from "react"

type SkeletonShape =
  | "block"
  | "line"
  | "circle"
  | "chip"
  | "thumbnail"
  | "frame"
  | "track"

const grounds = {
  canvas: "bg-surface",
  surface: "bg-surface-2",
  surface2: "bg-surface",
  layer: "bg-layer-tint",
  layerWell: "bg-layer",
} satisfies Record<SkeletonGround, string>

const lineHeights = {
  display: "h-[calc(var(--text-display--line-height)-2*var(--spacing-s1))]",
  title: "h-[calc(var(--text-title--line-height)-2*var(--spacing-s1))]",
  body: "h-[calc(var(--text-body--line-height)-2*var(--spacing-s1))]",
  label: "h-[calc(var(--text-label--line-height)-2*var(--spacing-s1))]",
  caption: "h-[calc(var(--text-caption--line-height)-2*var(--spacing-s1))]",
  legal: "h-[calc(var(--text-legal--line-height)-2*var(--spacing-s1))]",
} satisfies Record<SkeletonText, string>

const measures = {
  full: "w-full",
  long: "w-[88%]",
  mid: "w-[64%]",
  short: "w-[40%]",
  tail: "w-[24%]",
  sentence: "w-[calc(6*var(--spacing-s8))]",
  phrase: "w-[calc(4*var(--spacing-s8))]",
  word: "w-[calc(2*var(--spacing-s8))]",
} satisfies Record<SkeletonMeasure, string>

const sizes = {
  mark: "size-(--text-caption)",
  glyphSm: "size-glyph-small",
  glyph: "size-glyph",
  rail: "size-icon-small",
  dense: "size-icon-dense",
  touch: "size-icon",
  value: "h-(--text-caption--line-height) w-[calc(2*var(--spacing-s8))]",
  chip: "h-button-small w-[calc(3*var(--spacing-s8))]",
  control: "h-icon-dense w-[calc(4*var(--spacing-s8))]",
  switch: "h-switch-height w-switch-width",
} satisfies Record<SkeletonSize, string>

const corners = {
  tile: "rounded-cell",
  flush: "rounded-none",
} satisfies Record<SkeletonCorner, string>

type SkeletonProps = Omit<ComponentProps<"div">, "children"> & {
  shape?: SkeletonShape
  text?: SkeletonText
  measure?: SkeletonMeasure
  size?: SkeletonSize
  corner?: SkeletonCorner
  ground?: SkeletonGround
}

type ShapeOptions = {
  [Key in "shape" | "text" | "measure" | "size" | "corner"]:
    | SkeletonProps[Key]
    | undefined
}

function shapeClass({
  shape = "block",
  text = "body",
  measure = "mid",
  size = "glyph",
  corner = "tile",
}: ShapeOptions): string {
  switch (shape) {
    case "line":
      return cn(
        "my-s1 max-w-full shrink-0 rounded-full",
        lineHeights[text],
        measures[measure]
      )
    case "circle":
    case "chip":
      return cn("shrink-0 rounded-full", sizes[size])
    case "thumbnail":
      return "aspect-square w-full shrink-0 rounded-cell"
    case "frame":
      return cn("min-h-0 w-full flex-1 self-stretch", corners[corner])
    case "track":
      return "h-track w-full shrink-0 self-stretch rounded-full"
    case "block":
      return "rounded-cell"
  }
}

const InGroup = createContext(false)

function Skeleton({
  shape,
  text,
  measure,
  size,
  corner,
  ground,
  className,
  ...props
}: SkeletonProps): ReactElement {
  const isGrouped = useContext(InGroup)
  return (
    <div
      data-slot="skeleton"
      data-shape={shape ?? "block"}
      aria-hidden="true"
      className={cn(
        ground === undefined ? "bg-(--tint)" : grounds[ground],
        shapeClass({ shape, text, measure, size, corner }),
        isGrouped ? "" : motion.pulse,
        className
      )}
      {...props}
    />
  )
}

function SkeletonGroup({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <InGroup.Provider value={true}>
      <div
        {...props}
        data-slot="skeleton-group"
        aria-busy="true"
        className={cn(motion.pulse, className)}
      />
    </InGroup.Provider>
  )
}

const masonryRatios = ["aspect-3/4", "aspect-square", "aspect-9/16"] as const

const masonryDepth = 3

function SkeletonMasonry({
  columns,
  className,
}: {
  columns: number
  className?: string
}): ReactElement {
  const stacks = Array.from({ length: columns }, (_, column) => column)
  return (
    <SkeletonGroup
      data-columns={columns}
      className={cn("grid items-start gap-s2", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {stacks.map((column) => (
        <div
          key={column}
          data-slot="skeleton-stack"
          className="flex min-w-0 flex-col gap-s2"
        >
          {Array.from({ length: masonryDepth }, (_, row) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: a tile's place in its stack is its identity
              key={row}
              data-ratio={masonryRatios[(column + row) % masonryRatios.length]}
              className={cn(
                "w-full rounded-cell",
                masonryRatios[(column + row) % masonryRatios.length]
              )}
            />
          ))}
        </div>
      ))}
    </SkeletonGroup>
  )
}

function SkeletonRow({ className }: { className?: string }): ReactElement {
  return (
    <SkeletonGroup
      data-shape="row"
      className={cn("flex items-center gap-s3 py-s3", className)}
    >
      <Skeleton className="size-thumb shrink-0 rounded-cell" />
      <Skeleton shape="line" text="body" measure="full" className="flex-1" />
    </SkeletonGroup>
  )
}

function SkeletonCard({
  aspect,
  className,
}: {
  aspect: { readonly width: number; readonly height: number }
  className?: string
}): ReactElement {
  return (
    <Skeleton
      data-shape="card"
      className={cn("w-full rounded-card", className)}
      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
    />
  )
}

export type { SkeletonProps, SkeletonShape }
export { Skeleton, SkeletonCard, SkeletonGroup, SkeletonMasonry, SkeletonRow }
