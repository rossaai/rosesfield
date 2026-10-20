import { IconButton } from "@rosesfield/ui/components/button"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { Slider } from "@rosesfield/ui/components/slider"
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

const controlShare = 0.04

type Playback = {
  isPlaying: boolean
  time: number
  length: number
  isMuted: boolean
}

type VideoRef = RefObject<HTMLVideoElement | null>

const startPlayback: Playback = {
  isPlaying: false,
  time: 0,
  length: 0,
  isMuted: true,
}

export function clockOf(seconds: number): string {
  const whole =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const rest = String(whole % 60).padStart(2, "0")
  return `${Math.floor(whole / 60)}:${rest}`
}

export function stageAspectOf(
  aspect: MediaAspect,
  kind: "image" | "video"
): MediaAspect {
  return kind === "video"
    ? {
        width: aspect.width,
        height: aspect.height + aspect.width * controlShare,
      }
    : aspect
}

function readPlayback(video: HTMLVideoElement): Playback {
  return {
    isPlaying: !video.paused,
    time: video.currentTime,
    length: Number.isFinite(video.duration) ? video.duration : 0,
    isMuted: video.muted,
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
  if (video.current !== null) {
    video.current.muted = !video.current.muted
  }
}

function seek(video: VideoRef, value: number | readonly number[]): void {
  const next = typeof value === "number" ? value : value[0]
  if (video.current !== null && next !== undefined) {
    video.current.currentTime = next
  }
}

function showFullScreen(video: VideoRef): void {
  void video.current?.requestFullscreen().catch(() => undefined)
}

function Controls({
  video,
  playback,
}: {
  video: VideoRef
  playback: Playback
}): ReactElement {
  const playLabel = playback.isPlaying
    ? t("explore.video.pause")
    : t("explore.video.play")
  const soundLabel = playback.isMuted
    ? t("explore.video.soundOn")
    : t("explore.video.soundOff")
  return (
    <div
      data-slot="viewer-controls"
      className="flex h-10 shrink-0 items-center gap-2"
    >
      <IconButton
        label={playLabel}
        place="cardWide"
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
      <IconButton
        label={soundLabel}
        place="cardWide"
        tone="quiet"
        onClick={() => toggleSound(video)}
      >
        {playback.isMuted ? (
          <VolumeXIcon aria-hidden="true" />
        ) : (
          <Volume2Icon aria-hidden="true" />
        )}
      </IconButton>
      <IconButton
        label={t("explore.video.fullScreen")}
        place="cardWide"
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
}: {
  src: string
  label: string
}): ReactElement {
  const video = useRef<HTMLVideoElement>(null)
  const [playback, setPlayback] = useState<Playback>(startPlayback)
  useAutoPlay(video)
  const read = (): void => {
    if (video.current !== null) {
      setPlayback(readPlayback(video.current))
    }
  }
  return (
    <div className="flex size-full flex-col">
      <video
        ref={video}
        src={src}
        aria-label={label}
        muted
        loop
        playsInline
        className="min-h-0 w-full flex-1 object-contain"
        onPlay={read}
        onPause={read}
        onTimeUpdate={read}
        onLoadedMetadata={read}
        onVolumeChange={read}
      />
      <Controls video={video} playback={playback} />
    </div>
  )
}
