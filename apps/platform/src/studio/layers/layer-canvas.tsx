import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  type PointerEvent,
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
} from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t, tCatalog } from "@/copy/t"
import type { PixelSize } from "@/studio/layers/stack-images"

export type Brush = {
  canvas: RefObject<HTMLCanvasElement | null>
  size: number
  layerNumber: number
  onPaint: () => void
}

type LayerCanvasProps = {
  shown: readonly string[]
  size: PixelSize | null
  brush: Brush | null
  isDemo: boolean
  fit?: "width" | "box"
}

export function boxWidthOf(size: PixelSize): string {
  return `min(100cqw, 100cqh * ${size.width} / ${size.height})`
}

function LayerImage({ assetId }: { assetId: string }): ReactElement | null {
  const source = useAssetSource(assetId)
  if (source.state !== "ready") {
    return null
  }
  return (
    <img
      src={source.src}
      alt=""
      draggable={false}
      className="absolute inset-0 size-full object-contain"
    />
  )
}

function pointOf(
  event: PointerEvent<HTMLCanvasElement>
): { x: number; y: number } | null {
  const canvas = event.currentTarget
  const box = canvas.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) {
    return null
  }
  return {
    x: ((event.clientX - box.left) / box.width) * canvas.width,
    y: ((event.clientY - box.top) / box.height) * canvas.height,
  }
}

function BrushLayer({
  brush,
  size,
}: {
  brush: Brush
  size: PixelSize
}): ReactElement {
  const last = useRef<{ x: number; y: number } | null>(null)
  const { canvas } = brush
  useEffect(() => {
    const element = canvas.current
    if (element !== null && element.width !== size.width) {
      element.width = size.width
      element.height = size.height
    }
  }, [canvas, size])
  const paint = (event: PointerEvent<HTMLCanvasElement>): void => {
    const point = pointOf(event)
    const context = event.currentTarget.getContext("2d")
    if (point === null || context === null) {
      return
    }
    context.strokeStyle = "#ffffff"
    context.lineCap = "round"
    context.lineJoin = "round"
    context.lineWidth = brush.size
    context.beginPath()
    const from = last.current ?? point
    context.moveTo(from.x, from.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    last.current = point
    brush.onPaint()
  }
  return (
    <canvas
      ref={canvas}
      aria-label={tCatalog("layers.brush.label", { number: brush.layerNumber })}
      className="absolute inset-0 size-full cursor-crosshair touch-none opacity-60"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        last.current = null
        paint(event)
      }}
      onPointerMove={(event) => {
        if (last.current !== null) {
          paint(event)
        }
      }}
      onPointerUp={() => {
        last.current = null
      }}
      onPointerCancel={() => {
        last.current = null
      }}
    />
  )
}

export function LayerCanvas({
  shown,
  size,
  brush,
  isDemo,
  fit = "width",
}: LayerCanvasProps): ReactElement {
  if (size === null) {
    return <Skeleton className="aspect-square w-full max-w-field-max" />
  }
  return (
    <figure
      aria-label={tCatalog("layers.canvas.label")}
      className={cn(
        "relative mx-auto overflow-hidden rounded-cell bg-(--well)",
        fit === "width" ? "max-h-full w-full" : "shrink-0"
      )}
      style={{
        aspectRatio: `${size.width} / ${size.height}`,
        ...(fit === "box" ? { width: boxWidthOf(size) } : {}),
      }}
    >
      {shown.map((assetId) => (
        <LayerImage key={assetId} assetId={assetId} />
      ))}
      {brush === null ? null : <BrushLayer brush={brush} size={size} />}
      {isDemo ? (
        <span className="material pointer-events-none absolute bottom-s2 left-s2 max-w-[calc(100%-2*var(--spacing-s2))] truncate whitespace-nowrap rounded-full px-s2 py-hairline text-caption text-ink">
          {t("run.demoCaption")}
        </span>
      ) : null}
    </figure>
  )
}
