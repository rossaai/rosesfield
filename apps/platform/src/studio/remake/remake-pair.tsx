import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { motion } from "@rosesfield/ui/motion"
import { PauseIcon, PlayIcon } from "lucide-react"
import { type ReactElement, type RefObject, useRef, useState } from "react"
import { tCatalog } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { runAspect } from "@/pieces/run/run-facts"
import { RunOutputs } from "@/pieces/run/run-outputs"
import type { RemakePlan } from "@/studio/remake/remake-plan"
import { ShotDetails } from "@/studio/remake/shot-details"
import { ShotTimeline } from "@/studio/remake/shot-timeline"
import { referenceInput } from "@/studio/remake/use-remake-screen"

type Side = {
  assetId: string
  label: string
  isOutput: boolean
  frame: RefObject<HTMLDivElement | null>
}

function referenceOf(run: Run): string | null {
  const value = run.inputs[referenceInput]
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
  seek: (seconds: number) => void
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
    const from = videos[0]?.currentTime ?? 0
    for (const video of videos) {
      video.currentTime = from
    }
    setPlaying(true)
    void Promise.all(videos.map((video) => video.play())).catch(() =>
      setPlaying(false)
    )
  }
  const seek = (seconds: number): void => {
    for (const video of videosIn(frames)) {
      video.currentTime = seconds
    }
  }
  return { isPlaying, toggle, seek }
}

export function RemakePair({
  run,
  outputId,
  plan,
}: {
  run: Run
  outputId: string
  plan: RemakePlan | null
}): ReactElement {
  const yours = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const playback = usePlayBoth([yours, output])
  const referenceId = referenceOf(run)
  if (referenceId === null) {
    return <RunOutputs run={run} />
  }
  const aspect = runAspect(run)
  const isDemo = run.origin === "demo"
  const sides: Side[] = [
    {
      assetId: referenceId,
      label: tCatalog("remake.compare.yours"),
      isOutput: false,
      frame: yours,
    },
    {
      assetId: outputId,
      label: tCatalog("remake.compare.output"),
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
      {plan === null ? null : (
        <ShotTimeline
          shots={plan.shots}
          onSeek={(shot) => playback.seek(shot.startSeconds)}
        />
      )}
      <div>
        <Button size="small" onClick={playback.toggle}>
          {playback.isPlaying ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
          {playback.isPlaying
            ? tCatalog("remake.compare.pause")
            : tCatalog("remake.compare.play")}
        </Button>
      </div>
      {plan === null ? null : <ShotDetails plan={plan} />}
    </div>
  )
}
