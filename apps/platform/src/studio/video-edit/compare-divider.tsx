import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Slider } from "@rosesfield/ui/components/slider"
import { PauseIcon, PlayIcon } from "lucide-react"
import {
  type PointerEvent,
  type ReactElement,
  type RefObject,
  useRef,
  useState,
} from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t, tCatalog } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { runAspect } from "@/pieces/run/run-facts"
import { sourceInput } from "@/studio/video-edit/video-edit-modes"

type Layer = {
  assetId: string
  label: string
  isMuted: boolean
  video: RefObject<HTMLVideoElement | null>
  clip: string | null
  onEnded: () => void
  onTime: () => void
}

export type Playback = {
  isPlaying: boolean
  toggle: () => void
  ended: () => void
  follow: () => void
}

export const stepGapSeconds = 0.1

const videoName = /video/i

function firstOf(value: unknown): string | null {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : null
}

export function sourceOf(run: Run): string | null {
  const placed = firstOf(run.inputs[sourceInput])
  if (placed !== null) {
    return placed
  }
  const named = Object.entries(run.inputs).find(
    ([name, value]) => videoName.test(name) && firstOf(value) !== null
  )
  return named === undefined ? null : firstOf(named[1])
}

export function splitAt(clientX: number, left: number, width: number): number {
  if (width <= 0) {
    return 50
  }
  const share = ((clientX - left) / width) * 100
  return Math.min(100, Math.max(0, Math.round(share)))
}

export function followLead(
  lead: HTMLVideoElement,
  follower: HTMLVideoElement
): void {
  const time = lead.currentTime
  if (time > follower.duration) {
    return
  }
  if (Math.abs(follower.currentTime - time) > stepGapSeconds) {
    follower.currentTime = time
  }
}

function LayerVideo({ layer }: { layer: Layer }): ReactElement {
  const source = useAssetSource(layer.assetId)
  if (source.state !== "ready") {
    return <Skeleton className="absolute inset-0" />
  }
  return (
    <video
      ref={layer.video}
      src={source.src}
      aria-label={layer.label}
      muted={layer.isMuted}
      playsInline
      preload="metadata"
      onEnded={layer.onEnded}
      onTimeUpdate={layer.onTime}
      onSeeked={layer.onTime}
      className="absolute inset-0 h-full w-full object-contain"
      style={layer.clip === null ? undefined : { clipPath: layer.clip }}
    />
  )
}

export function usePlayBoth(
  lead: RefObject<HTMLVideoElement | null>,
  follower: RefObject<HTMLVideoElement | null>
): Playback {
  const [isPlaying, setPlaying] = useState(false)
  const toggle = (): void => {
    const present = [lead.current, follower.current].filter(
      (video): video is HTMLVideoElement => video !== null
    )
    if (isPlaying) {
      for (const video of present) {
        video.pause()
      }
      setPlaying(false)
      return
    }
    for (const video of present) {
      video.currentTime = 0
    }
    setPlaying(true)
    void Promise.all(present.map((video) => video.play())).catch(() =>
      setPlaying(false)
    )
  }
  return {
    isPlaying,
    toggle,
    ended: () => setPlaying(false),
    follow: () => {
      if (lead.current !== null && follower.current !== null) {
        followLead(lead.current, follower.current)
      }
    },
  }
}

function PlayBoth({ playback }: { playback: Playback }): ReactElement {
  return (
    <div>
      <Button size="small" onClick={playback.toggle}>
        {playback.isPlaying ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
        {playback.isPlaying
          ? tCatalog("videoEdit.compare.pause")
          : tCatalog("videoEdit.compare.play")}
      </Button>
    </div>
  )
}

function useDrag(setSplit: (split: number) => void) {
  const isDragging = useRef(false)
  const place = (event: PointerEvent<HTMLDivElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    setSplit(splitAt(event.clientX, box.left, box.width))
  }
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      isDragging.current = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      place(event)
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (isDragging.current) {
        place(event)
      }
    },
    onPointerUp: () => {
      isDragging.current = false
    },
    onPointerCancel: () => {
      isDragging.current = false
    },
  }
}

function Stage({
  run,
  layers,
  split,
  setSplit,
}: {
  run: Run
  layers: readonly Layer[]
  split: number
  setSplit: (split: number) => void
}): ReactElement {
  const drag = useDrag(setSplit)
  return (
    <div
      data-slot="compare-stage"
      {...drag}
      className="relative w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-cell bg-(--well)"
      style={aspectStyle(runAspect(run))}
    >
      {layers.map((layer) => (
        <LayerVideo key={layer.label} layer={layer} />
      ))}
      <div
        aria-hidden="true"
        data-slot="compare-divider"
        className="pointer-events-none absolute inset-y-0 w-px bg-ink"
        style={{ left: `${split}%` }}
      >
        <span className="absolute top-1/2 left-1/2 block h-knob-height w-knob-width -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
      </div>
      {run.origin === "demo" ? (
        <span className="material absolute right-s2 bottom-s2 max-w-[calc(100%-2*var(--spacing-s2))] truncate whitespace-nowrap rounded-full px-s2 py-hairline text-caption text-ink">
          {t("run.demoCaption")}
        </span>
      ) : null}
    </div>
  )
}

export function CompareDivider({
  run,
  outputId,
}: {
  run: Run
  outputId: string
}): ReactElement | null {
  const yours = useRef<HTMLVideoElement>(null)
  const output = useRef<HTMLVideoElement>(null)
  const playback = usePlayBoth(output, yours)
  const [split, setSplit] = useState(50)
  const sourceId = sourceOf(run)
  if (sourceId === null) {
    return null
  }
  const layers: Layer[] = [
    {
      assetId: outputId,
      label: tCatalog("videoEdit.compare.output"),
      isMuted: false,
      video: output,
      clip: null,
      onEnded: playback.ended,
      onTime: playback.follow,
    },
    {
      assetId: sourceId,
      label: tCatalog("videoEdit.compare.yours"),
      isMuted: true,
      video: yours,
      clip: `inset(0 ${100 - split}% 0 0)`,
      onEnded: () => undefined,
      onTime: () => undefined,
    },
  ]
  return (
    <div className="flex flex-col gap-s2">
      <Stage run={run} layers={layers} split={split} setSplit={setSplit} />
      <div className="flex justify-between text-caption text-ink-muted">
        <span>{tCatalog("videoEdit.compare.yours")}</span>
        <span>{tCatalog("videoEdit.compare.output")}</span>
      </div>
      <Slider
        className="max-w-none"
        value={split}
        min={0}
        max={100}
        aria-label={tCatalog("videoEdit.compare.divider")}
        onValueChange={(value) => {
          setSplit(typeof value === "number" ? value : (value[0] ?? 50))
        }}
      />
      <PlayBoth playback={playback} />
    </div>
  )
}
