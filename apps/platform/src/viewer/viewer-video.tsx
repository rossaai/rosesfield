import { IconButton } from "@rosesfield/ui/components/button"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { Slider } from "@rosesfield/ui/components/slider"
import { cn } from "@rosesfield/ui/lib/cn"
import { prefersReducedMotion } from "@rosesfield/ui/motion"
import {
  MaximizeIcon,
  PauseIcon,
  PlayIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"
import {
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"

const controlRoomShare = { regular: 0.08, compact: 0.125 } as const

type Playback = {
  isPlaying: boolean
  time: number
  length: number
  isMuted: boolean
  volume: number
}

type VideoRef = RefObject<HTMLVideoElement | null>

const startPlayback: Playback = {
  isPlaying: false,
  time: 0,
  length: 0,
  isMuted: true,
  volume: 1,
}

export function clockOf(seconds: number): string {
  const whole =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const rest = String(whole % 60).padStart(2, "0")
  return `${Math.floor(whole / 60)}:${rest}`
}

export function stageAspectOf(
  aspect: MediaAspect,
  kind: "image" | "video",
  isRegular: boolean
): MediaAspect {
  if (kind === "image") {
    return aspect
  }
  const share = isRegular ? controlRoomShare.regular : controlRoomShare.compact
  return { width: aspect.width, height: aspect.height + aspect.width * share }
}

export function pictureWidthOf(
  aspect: MediaAspect,
  isRegular: boolean
): string {
  const ratio = `${aspect.width} / ${aspect.height}`
  return isRegular
    ? `min(100cqw, (100cqh - 2 * var(--spacing-s12)) * ${ratio})`
    : `min(100cqw, (100cqh - var(--spacing-s12)) * ${ratio})`
}

export function shownVolumeOf(playback: Playback): number {
  return playback.isMuted ? 0 : playback.volume
}

function readPlayback(video: HTMLVideoElement): Playback {
  return {
    isPlaying: !video.paused,
    time: video.currentTime,
    length: Number.isFinite(video.duration) ? video.duration : 0,
    isMuted: video.muted,
    volume: video.volume,
  }
}

function useAutoPlay(video: VideoRef): void {
  useEffect(() => {
    const element = video.current
    if (element !== null && !prefersReducedMotion()) {
      void element.play()?.catch(() => undefined)
    }
  }, [video])
}

function togglePlay(video: VideoRef): void {
  const element = video.current
  if (element === null) {
    return
  }
  if (element.paused) {
    void element.play()?.catch(() => undefined)
  } else {
    element.pause()
  }
}

function toggleSound(video: VideoRef): void {
  const element = video.current
  if (element === null) {
    return
  }
  if (element.muted && element.volume === 0) {
    element.volume = 1
  }
  element.muted = !element.muted
}

function firstOf(value: number | readonly number[]): number | undefined {
  return typeof value === "number" ? value : value[0]
}

function seek(video: VideoRef, value: number | readonly number[]): void {
  const next = firstOf(value)
  if (video.current !== null && next !== undefined) {
    video.current.currentTime = next
  }
}

function changeVolume(
  video: VideoRef,
  value: number | readonly number[]
): void {
  const next = firstOf(value)
  if (video.current !== null && next !== undefined) {
    video.current.volume = next
    video.current.muted = next === 0
  }
}

function showFullScreen(video: VideoRef): void {
  void video.current?.requestFullscreen().catch(() => undefined)
}

function SoundControls({
  video,
  playback,
  hasVolume,
}: {
  video: VideoRef
  playback: Playback
  hasVolume: boolean
}): ReactElement {
  const soundLabel = playback.isMuted
    ? t("explore.video.soundOn")
    : t("explore.video.soundOff")
  return (
    <>
      <IconButton
        label={soundLabel}
        size="dense"
        tone="quiet"
        onClick={() => toggleSound(video)}
      >
        {playback.isMuted ? (
          <VolumeXIcon aria-hidden="true" />
        ) : (
          <Volume2Icon aria-hidden="true" />
        )}
      </IconButton>
      {hasVolume ? (
        <Slider
          className="w-20 shrink-0"
          aria-label={t("explore.video.volume")}
          min={0}
          max={1}
          step={0.05}
          value={shownVolumeOf(playback)}
          onValueChange={(value) => changeVolume(video, value)}
        />
      ) : null}
    </>
  )
}

function Controls({
  video,
  playback,
  isRegular,
}: {
  video: VideoRef
  playback: Playback
  isRegular: boolean
}): ReactElement {
  const playLabel = playback.isPlaying
    ? t("explore.video.pause")
    : t("explore.video.play")
  return (
    <div
      data-slot="viewer-controls"
      className={cn(
        "flex h-s12 shrink-0 items-center",
        isRegular ? "gap-2" : "gap-1"
      )}
    >
      <IconButton
        label={playLabel}
        size="dense"
        tone="quiet"
        onClick={() => togglePlay(video)}
      >
        {playback.isPlaying ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
      </IconButton>
      <span className="shrink-0 text-caption text-ink tabular-nums">
        {`${clockOf(playback.time)} / ${clockOf(playback.length)}`}
      </span>
      <Slider
        className="max-w-none flex-1"
        aria-label={t("explore.video.position")}
        min={0}
        max={Math.max(playback.length, 0.1)}
        step={0.1}
        value={playback.time}
        onValueChange={(value) => seek(video, value)}
      />
      <SoundControls video={video} playback={playback} hasVolume={isRegular} />
      <IconButton
        label={t("explore.video.fullScreen")}
        size="dense"
        tone="quiet"
        onClick={() => showFullScreen(video)}
      >
        <MaximizeIcon aria-hidden="true" />
      </IconButton>
    </div>
  )
}

export function ViewerVideo({
  src,
  label,
  aspect,
  onMeasure,
}: {
  src: string
  label: string
  aspect: MediaAspect
  onMeasure?: (aspect: MediaAspect) => void
}): ReactElement {
  const video = useRef<HTMLVideoElement>(null)
  const [playback, setPlayback] = useState<Playback>(startPlayback)
  const isRegular = useIsRegularWindow()
  useAutoPlay(video)
  const read = (): void => {
    if (video.current !== null) {
      setPlayback(readPlayback(video.current))
    }
  }
  return (
    <div
      data-slot="viewer-video"
      className="flex size-full flex-col items-center justify-center"
      style={{ containerType: "size" }}
    >
      <div
        data-slot="viewer-picture"
        className={cn("flex flex-col", isRegular ? "pt-s12" : "")}
        style={{ width: pictureWidthOf(aspect, isRegular) }}
      >
        <video
          ref={video}
          data-grow-target=""
          src={src}
          aria-label={label}
          muted
          loop
          playsInline
          className="w-full object-contain"
          style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
          onPlay={read}
          onPause={read}
          onTimeUpdate={read}
          onLoadedMetadata={(event) => {
            read()
            onMeasure?.({
              width: event.currentTarget.videoWidth,
              height: event.currentTarget.videoHeight,
            })
          }}
          onVolumeChange={read}
        />
        <Controls video={video} playback={playback} isRegular={isRegular} />
      </div>
    </div>
  )
}
