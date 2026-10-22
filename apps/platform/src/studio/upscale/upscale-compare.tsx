import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { Run } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Slider } from "@rosesfield/ui/components/slider"
import { PauseIcon, PlayIcon } from "lucide-react"
import {
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { aspectStyle } from "@/pieces/asset-tile"
import { runAspect } from "@/pieces/run/run-facts"
import type { UpscaleMode } from "@/studio/upscale/upscale-limits"
import {
  modeInput,
  modelInput,
  wellNameOf,
} from "@/studio/upscale/upscale-models"
import { modeOf } from "@/studio/upscale/use-upscale-screen"

export type CompareSides = {
  inputId: string
  outputId: string
  kind: UpscaleMode
}

export type Playable = {
  currentTime: number
  ended: boolean
  play: () => Promise<void>
  pause: () => void
}

export const stepTolerance = 0.1

export function compareSidesOf(
  run: Run,
  models: readonly CatalogModel[]
): CompareSides | null {
  const [outputId] = run.outputs
  if (run.status !== "done" || outputId === undefined) {
    return null
  }
  const kind = modeOf(run.inputs[modeInput])
  const model = models.find((one) => one.id === run.inputs[modelInput]) ?? null
  const value = run.inputs[wellNameOf(model, kind)]
  const inputId = Array.isArray(value) ? (value[0] ?? null) : null
  return inputId === null ? null : { inputId, outputId, kind }
}

export function keepInStep(lead: Playable, follower: Playable): boolean {
  if (Math.abs(follower.currentTime - lead.currentTime) <= stepTolerance) {
    return false
  }
  follower.currentTime = lead.currentTime
  return true
}

export function playTogether(
  lead: Playable,
  follower: Playable
): Promise<void> {
  if (lead.ended) {
    lead.currentTime = 0
  }
  follower.currentTime = lead.currentTime
  return Promise.all([lead.play(), follower.play()]).then(() => undefined)
}

export function pauseTogether(lead: Playable, follower: Playable): void {
  lead.pause()
  follower.pause()
  follower.currentTime = lead.currentTime
}

type Pair = {
  output: RefObject<HTMLVideoElement | null>
  yours: RefObject<HTMLVideoElement | null>
}

function useStepPlayback(pair: Pair): {
  isPlaying: boolean
  toggle: () => void
  ended: () => void
} {
  const [isPlaying, setPlaying] = useState(false)
  useEffect(() => {
    const lead = pair.output.current
    const follower = pair.yours.current
    if (!isPlaying || lead === null || follower === null) {
      return
    }
    const step = (): void => {
      keepInStep(lead, follower)
    }
    lead.addEventListener("timeupdate", step)
    return () => lead.removeEventListener("timeupdate", step)
  }, [isPlaying, pair])
  const toggle = (): void => {
    const lead = pair.output.current
    const follower = pair.yours.current
    if (lead === null || follower === null) {
      return
    }
    if (isPlaying) {
      pauseTogether(lead, follower)
      setPlaying(false)
      return
    }
    setPlaying(true)
    void playTogether(lead, follower).catch(() => {
      pauseTogether(lead, follower)
      setPlaying(false)
    })
  }
  const ended = (): void => {
    pair.yours.current?.pause()
    setPlaying(false)
  }
  return { isPlaying, toggle, ended }
}

const layerClass = "absolute inset-0 size-full object-contain"

const pillClass =
  "material absolute top-s2 max-w-[calc(50%-2*var(--spacing-s2))] truncate whitespace-nowrap rounded-full px-s2 py-hairline text-caption text-ink"

function Layer({
  assetId,
  label,
  kind,
  clip,
  isMuted,
  video,
  onEnded,
}: {
  assetId: string
  label: string
  kind: UpscaleMode
  clip: string | null
  isMuted: boolean
  video: RefObject<HTMLVideoElement | null>
  onEnded: () => void
}): ReactElement | null {
  const source = useAssetSource(assetId)
  if (source.state !== "ready") {
    return null
  }
  const style = clip === null ? undefined : { clipPath: clip }
  return kind === "video" ? (
    <video
      ref={video}
      src={source.src}
      aria-label={label}
      muted={isMuted}
      playsInline
      preload="metadata"
      onEnded={onEnded}
      className={layerClass}
      style={style}
    />
  ) : (
    <img src={source.src} alt={label} className={layerClass} style={style} />
  )
}

function PlayBoth({
  playback,
}: {
  playback: ReturnType<typeof useStepPlayback>
}): ReactElement {
  return (
    <div>
      <Button size="small" onClick={playback.toggle}>
        {playback.isPlaying ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
        {playback.isPlaying ? t("output.pause") : t("output.play")}
      </Button>
    </div>
  )
}

export function CompareFrame({
  run,
  sides,
}: {
  run: Run
  sides: CompareSides
}): ReactElement {
  const output = useRef<HTMLVideoElement>(null)
  const yours = useRef<HTMLVideoElement>(null)
  const [pair] = useState<Pair>(() => ({ output, yours }))
  const playback = useStepPlayback(pair)
  const [split, setSplit] = useState(50)
  const yoursLabel = t("viewer.compare.yours")
  const outputLabel = joinParts([
    t("viewer.compare.output"),
    run.origin === "demo" ? t("run.demoCaption") : null,
  ])
  return (
    <div className="flex flex-col gap-s2">
      <div
        data-slot="upscale-compare"
        className="relative w-full overflow-hidden rounded-cell bg-(--well)"
        style={aspectStyle(runAspect(run))}
      >
        <Layer
          assetId={sides.outputId}
          label={outputLabel}
          kind={sides.kind}
          clip={null}
          isMuted={false}
          video={output}
          onEnded={playback.ended}
        />
        <Layer
          assetId={sides.inputId}
          label={yoursLabel}
          kind={sides.kind}
          clip={`inset(0 ${100 - split}% 0 0)`}
          isMuted
          video={yours}
          onEnded={() => undefined}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-ink"
          style={{ left: `${split}%` }}
        />
        <span className={`${pillClass} left-s2`}>{yoursLabel}</span>
        <span className={`${pillClass} right-s2`}>{outputLabel}</span>
      </div>
      <Slider
        className="max-w-none"
        value={split}
        min={0}
        max={100}
        aria-label={t("viewer.compare.divider")}
        onValueChange={(value) =>
          setSplit(typeof value === "number" ? value : (value[0] ?? 50))
        }
      />
      {sides.kind === "video" ? <PlayBoth playback={playback} /> : null}
    </div>
  )
}

export function UpscaleCompare({
  run,
  models,
}: {
  run: Run
  models: readonly CatalogModel[]
}): ReactElement | null {
  const [isOn, setOn] = useState(false)
  const sides = compareSidesOf(run, models)
  if (sides === null) {
    return null
  }
  return (
    <>
      <div>
        <Button
          size="small"
          className="aria-pressed:bg-(--tint)"
          aria-pressed={isOn}
          onClick={() => setOn(!isOn)}
        >
          {t("viewer.compare")}
        </Button>
      </div>
      {isOn ? <CompareFrame run={run} sides={sides} /> : null}
    </>
  )
}
