import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { motion } from "@rosesfield/ui/motion"
import { PauseIcon, PlayIcon } from "lucide-react"
import { type ReactElement, type RefObject, useRef, useState } from "react"
import { tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { runAspect } from "@/pieces/run/run-facts"
import { sourceInput } from "@/studio/recast/recast-modes"

type Side = {
  assetId: string
  label: string
  isOutput: boolean
  frame: RefObject<HTMLDivElement | null>
}

function sourceOf(run: Run): string | null {
  const value = run.inputs[sourceInput]
  return Array.isArray(value) ? (value[0] ?? null) : null
}

function videosIn(
  frames: readonly RefObject<HTMLDivElement | null>[]
): HTMLVideoElement[] {
  return frames
    .map((frame) => frame.current?.querySelector("video") ?? null)
    .filter((video): video is HTMLVideoElement => video !== null)
}

function usePlayBoth(frames: readonly RefObject<HTMLDivElement | null>[]): {
  isPlaying: boolean
  toggle: () => void
} {
  const [isPlaying, setPlaying] = useState(false)
  const toggle = (): void => {
    const videos = videosIn(frames)
    if (isPlaying) {
      for (const video of videos) {
        video.pause()
      }
      setPlaying(false)
      return
    }
    for (const video of videos) {
      video.currentTime = 0
    }
    setPlaying(true)
    void Promise.all(videos.map((video) => video.play())).catch(() =>
      setPlaying(false)
    )
  }
  return { isPlaying, toggle }
}

export function ComparePair({
  run,
  outputId,
}: {
  run: Run
  outputId: string
}): ReactElement | null {
  const yours = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const playback = usePlayBoth([yours, output])
  const sourceId = sourceOf(run)
  if (sourceId === null) {
    return null
  }
  const aspect = runAspect(run)
  const isDemo = run.origin === "demo"
  const sides: Side[] = [
    {
      assetId: sourceId,
      label: tCatalog("recast.compare.yours"),
      isOutput: false,
      frame: yours,
    },
    {
      assetId: outputId,
      label: tCatalog("recast.compare.output"),
      isOutput: true,
      frame: output,
    },
  ]
  return (
    <div className="flex flex-col gap-s2">
      <div className="grid w-full grid-cols-2 gap-s2">
        {sides.map((side) => (
          <figure key={side.label} className="flex min-w-0 flex-col gap-s1_5">
            <div ref={side.frame}>
              <AssetTile
                assetId={side.assetId}
                aspectHint={aspect}
                fit="contain"
                isDemo={side.isOutput && isDemo}
                list={side.isOutput ? run.outputs : [side.assetId]}
                className={motion.enter}
              />
            </div>
            <figcaption className="text-caption text-ink-muted">
              {side.label}
            </figcaption>
          </figure>
        ))}
      </div>
      <div>
        <Button size="small" onClick={playback.toggle}>
          {playback.isPlaying ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
          {playback.isPlaying
            ? tCatalog("recast.compare.pause")
            : tCatalog("recast.compare.play")}
        </Button>
      </div>
    </div>
  )
}
