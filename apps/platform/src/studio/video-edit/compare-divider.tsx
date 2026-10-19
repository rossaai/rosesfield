import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Slider } from "@rosesfield/ui/components/slider"
import { PauseIcon, PlayIcon } from "lucide-react"
import { type ReactElement, type RefObject, useRef, useState } from "react"
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
}

function sourceOf(run: Run): string | null {
  const value = run.inputs[sourceInput]
  return Array.isArray(value) ? (value[0] ?? null) : null
}

function LayerVideo({
  layer,
  onEnded,
}: {
  layer: Layer
  onEnded: () => void
}): ReactElement {
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
      onEnded={onEnded}
      className="absolute inset-0 h-full w-full object-contain"
      style={layer.clip === null ? undefined : { clipPath: layer.clip }}
    />
  )
}

function usePlayBoth(videos: readonly RefObject<HTMLVideoElement | null>[]): {
  isPlaying: boolean
  toggle: () => void
  ended: () => void
} {
  const [isPlaying, setPlaying] = useState(false)
  const toggle = (): void => {
    const present = videos
      .map((video) => video.current)
      .filter((video): video is HTMLVideoElement => video !== null)
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
  return { isPlaying, toggle, ended: () => setPlaying(false) }
}

function PlayBoth({
  playback,
}: {
  playback: ReturnType<typeof usePlayBoth>
}): ReactElement {
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

export function CompareDivider({
  run,
  outputId,
}: {
  run: Run
  outputId: string
}): ReactElement | null {
  const yours = useRef<HTMLVideoElement>(null)
  const output = useRef<HTMLVideoElement>(null)
  const playback = usePlayBoth([yours, output])
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
    },
    {
      assetId: sourceId,
      label: tCatalog("videoEdit.compare.yours"),
      isMuted: true,
      video: yours,
      clip: `inset(0 ${100 - split}% 0 0)`,
    },
  ]
  return (
    <div className="flex flex-col gap-s2">
      <div
        className="relative w-full overflow-hidden rounded-cell bg-(--well)"
        style={aspectStyle(runAspect(run))}
      >
        {layers.map((layer) => (
          <LayerVideo
            key={layer.label}
            layer={layer}
            onEnded={playback.ended}
          />
        ))}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-ink"
          style={{ left: `${split}%` }}
        />
        {run.origin === "demo" ? (
          <span className="material absolute right-s2 bottom-s2 max-w-[calc(100%-2*var(--spacing-s2))] truncate whitespace-nowrap rounded-full px-s2 py-hairline text-caption text-ink">
            {t("run.demoCaption")}
          </span>
        ) : null}
      </div>
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
