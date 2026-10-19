import { IconButton } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { DownloadIcon, PauseIcon, PlayIcon } from "lucide-react"
import { type ReactElement, type RefObject, useRef, useState } from "react"
import { formatDuration, joinParts } from "@/copy/format"
import { t } from "@/copy/t"

type AudioRowProps = {
  src: string
  name: string
  durationSeconds: number | null
  caption?: string
  onDownload?: () => void
  className?: string
}

function useAudio(): {
  ref: RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  fraction: number
  toggle: () => void
  onTime: () => void
  onEnd: () => void
} {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setPlaying] = useState(false)
  const [fraction, setFraction] = useState(0)
  const toggle = (): void => {
    const element = ref.current
    if (element === null) {
      return
    }
    if (element.paused) {
      void element.play().then(
        () => setPlaying(true),
        () => setPlaying(false)
      )
    } else {
      element.pause()
      setPlaying(false)
    }
  }
  const onTime = (): void => {
    const element = ref.current
    if (element !== null && element.duration > 0) {
      setFraction(element.currentTime / element.duration)
    }
  }
  const onEnd = (): void => {
    setPlaying(false)
    setFraction(0)
  }
  return { ref, isPlaying, fraction, toggle, onTime, onEnd }
}

export function AudioRow(props: AudioRowProps): ReactElement {
  const audio = useAudio()
  const caption = joinParts([
    props.caption ?? null,
    props.durationSeconds === null
      ? null
      : formatDuration(props.durationSeconds),
  ])
  return (
    <div
      data-slot="audio-row"
      className={cn(
        "flex w-full min-w-0 items-center gap-s3 rounded-cell bg-(--well) p-s2",
        props.className
      )}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: an audio output has no caption track */}
      <audio
        ref={audio.ref}
        src={props.src}
        preload="metadata"
        onTimeUpdate={audio.onTime}
        onEnded={audio.onEnd}
      />
      <IconButton
        label={audio.isPlaying ? t("output.pause") : t("output.play")}
        onClick={audio.toggle}
      >
        {audio.isPlaying ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
      </IconButton>
      <div className="flex min-w-0 flex-1 flex-col gap-s1_5">
        <div className="flex items-baseline justify-between gap-s2">
          <span className="min-w-0 truncate text-body">{props.name}</span>
          {caption === "" ? null : (
            <span className="shrink-0 text-caption text-ink-muted">
              {caption}
            </span>
          )}
        </div>
        <span className="block h-track w-full overflow-hidden rounded-full bg-track">
          <span
            className={cn("block h-full origin-left bg-ink", motion.control)}
            style={{ transform: `scaleX(${audio.fraction})` }}
          />
        </span>
      </div>
      {props.onDownload === undefined ? null : (
        <IconButton
          label={t("output.download")}
          tone="quiet"
          onClick={props.onDownload}
        >
          <DownloadIcon aria-hidden="true" />
        </IconButton>
      )}
    </div>
  )
}
