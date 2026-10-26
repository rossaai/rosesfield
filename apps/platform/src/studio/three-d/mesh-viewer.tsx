import { Button } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { useMutation, useQuery } from "@tanstack/react-query"
import { DownloadIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { tThreeD } from "@/studio/three-d/copy.en"
import type { MeshScene } from "@/studio/three-d/glb"
import { meshQuery, useDownloadMesh } from "@/studio/three-d/mesh-file"
import { MeshRenderer } from "@/studio/three-d/mesh-renderer"
import { useMeshStill, useSeen } from "@/studio/three-d/mesh-still"
import {
  cameraOf,
  type Gesture,
  keyed,
  pointerDown,
  pointerMove,
  pointerUp,
  startGesture,
  wheeled,
} from "@/studio/three-d/orbit"

const frameClass = "aspect-square w-full rounded-cell"

const maxPixelRatio = 2

const lineHeight = 16

type Wheel = {
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
}

export function wheelPixels(event: Wheel, page: number): number {
  const pixels =
    event.deltaMode === 1
      ? event.deltaY * lineHeight
      : event.deltaMode === 2
        ? event.deltaY * page
        : event.deltaY
  return event.ctrlKey ? pixels * 4 : pixels
}

function on<Name extends keyof HTMLElementEventMap>(
  canvas: HTMLCanvasElement,
  name: Name,
  listener: (event: HTMLElementEventMap[Name]) => void
): () => void {
  const options = name === "wheel" ? { passive: false } : undefined
  canvas.addEventListener(name, listener, options)
  return () => canvas.removeEventListener(name, listener)
}

function sizeCanvas(canvas: HTMLCanvasElement): void {
  const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio)
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio))
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio))
}

type Held = {
  gesture: Gesture
  ask: () => void
}

function pointOf(event: PointerEvent): { x: number; y: number } {
  return { x: event.clientX, y: event.clientY }
}

function handOf(canvas: HTMLCanvasElement, held: Held): (() => void)[] {
  const size = (): number => Math.min(canvas.clientWidth, canvas.clientHeight)
  const lift = (event: PointerEvent): void => {
    held.gesture = pointerUp(held.gesture, event.pointerId)
  }
  const move = (event: PointerEvent): void => {
    const point = pointOf(event)
    const next = pointerMove(held.gesture, event.pointerId, point, size())
    if (next !== held.gesture) {
      held.gesture = next
      held.ask()
    }
  }
  return [
    on(canvas, "pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId)
      held.gesture = pointerDown(held.gesture, event.pointerId, pointOf(event))
    }),
    on(canvas, "pointermove", move),
    on(canvas, "pointerup", lift),
    on(canvas, "pointercancel", lift),
    on(canvas, "lostpointercapture", lift),
  ]
}

function keysOf(canvas: HTMLCanvasElement, held: Held): (() => void)[] {
  const turn = (orbit: Gesture["orbit"]): void => {
    held.gesture = { ...held.gesture, orbit }
    held.ask()
  }
  return [
    on(canvas, "wheel", (event) => {
      event.preventDefault()
      const pixels = wheelPixels(event, canvas.clientHeight)
      turn(wheeled(held.gesture.orbit, pixels))
    }),
    on(canvas, "keydown", (event) => {
      const next = keyed(held.gesture.orbit, event.key)
      if (next !== null) {
        event.preventDefault()
        turn(next)
      }
    }),
  ]
}

function mountViewer(
  canvas: HTMLCanvasElement,
  scene: MeshScene,
  renderer: MeshRenderer
): () => void {
  let frame = 0
  const held: Held = { gesture: startGesture(), ask: () => undefined }
  const paint = (): void => {
    frame = 0
    const aspect = canvas.width / Math.max(canvas.height, 1)
    const { center, radius } = scene
    const camera = cameraOf(held.gesture.orbit, center, radius, aspect)
    renderer.draw(camera, canvas.width, canvas.height)
  }
  held.ask = () => {
    if (frame === 0) {
      frame = requestAnimationFrame(paint)
    }
  }
  void renderer.load(scene, held.ask)
  const resize = new ResizeObserver(() => {
    sizeCanvas(canvas)
    held.ask()
  })
  resize.observe(canvas)
  const stops = [...handOf(canvas, held), ...keysOf(canvas, held)]
  return () => {
    for (const stop of stops) {
      stop()
    }
    resize.disconnect()
    cancelAnimationFrame(frame)
    renderer.dispose()
  }
}

type Drawing = "drawing" | "none" | "lost"

function MeshCanvas({ scene }: { scene: MeshScene }): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState<Drawing>("drawing")
  useEffect(() => {
    const canvas = ref.current
    if (drawing !== "drawing" || canvas === null) {
      return
    }
    const renderer = MeshRenderer.of(canvas)
    if (renderer === null) {
      setDrawing("none")
      return
    }
    const lose = (): void => setDrawing("lost")
    canvas.addEventListener("webglcontextlost", lose)
    const stop = mountViewer(canvas, scene, renderer)
    return () => {
      canvas.removeEventListener("webglcontextlost", lose)
      stop()
    }
  }, [scene, drawing])
  if (drawing === "none") {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={tThreeD("threeD.viewer.noDrawing")}
        body={tThreeD("threeD.viewer.download")}
      />
    )
  }
  if (drawing === "lost") {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={tThreeD("threeD.viewer.lost")}
        actions={
          <Button onClick={() => setDrawing("drawing")}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  return (
    <div className="flex flex-col gap-s2">
      {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: the canvas takes the arrow keys and the wheel to turn the model, so it is announced as an application */}
      <canvas
        ref={ref}
        role="application"
        tabIndex={0}
        aria-label={tThreeD("threeD.viewer.label")}
        data-slot="mesh-viewer"
        className={cn(
          frameClass,
          "block cursor-grab touch-none bg-(--well) active:cursor-grabbing",
          interaction.ring
        )}
      />
      <p className="text-caption text-ink-muted">
        {tThreeD("threeD.viewer.hint")}
      </p>
    </div>
  )
}

export function MeshView({ assetId }: { assetId: string }): ReactElement {
  const file = useQuery(meshQuery(assetId))
  if (file.isPending) {
    return <Skeleton className={frameClass} />
  }
  if (file.isError) {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={tThreeD("threeD.viewer.failed")}
        actions={
          <Button onClick={() => void file.refetch()}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  if (file.data.scene === null) {
    return (
      <StateView
        kind="failed"
        density="compact"
        title={tThreeD("threeD.viewer.failed")}
        body={tThreeD("threeD.viewer.download")}
      />
    )
  }
  return <MeshCanvas scene={file.data.scene} />
}

export function MeshDownload({ assetId }: { assetId: string }): ReactElement {
  const download = useDownloadMesh()
  const save = useMutation({ mutationFn: download })
  const words = save.error === null ? null : wordsForError(save.error)
  return (
    <div className="flex flex-col gap-s2">
      <Button
        className="self-start"
        busy={save.isPending}
        onClick={() => save.mutate(assetId)}
      >
        <DownloadIcon aria-hidden="true" />
        {t("output.download")}
      </Button>
      {words === null ? null : (
        <p role="alert" className="text-label text-bug-text">
          {words.title}. {words.body}
        </p>
      )}
    </div>
  )
}

export function MeshOutput({ assetId }: { assetId: string }): ReactElement {
  return (
    <div data-slot="mesh-output" className="flex w-full flex-col gap-s2">
      <MeshView assetId={assetId} />
      <MeshDownload assetId={assetId} />
    </div>
  )
}

export function MeshOnAsk({ assetId }: { assetId: string }): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isSeen = useSeen(ref, !isOpen)
  const still = useMeshStill(assetId, isSeen)
  if (isOpen) {
    return <MeshOutput assetId={assetId} />
  }
  return (
    <div ref={ref} data-slot="mesh-closed" className="flex flex-col gap-s2">
      {still === null ? null : (
        <img
          src={still}
          alt=""
          aria-hidden="true"
          data-slot="mesh-still"
          className={cn(frameClass, "bg-(--well) object-contain")}
        />
      )}
      <div className="flex flex-wrap items-start gap-s2">
        <Button onClick={() => setIsOpen(true)}>
          {tThreeD("threeD.viewer.show")}
        </Button>
        <MeshDownload assetId={assetId} />
      </div>
    </div>
  )
}
