import type { Asset } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useQuery } from "@tanstack/react-query"
import { DownloadIcon, PauseIcon, PlayIcon } from "lucide-react"
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import { formatDuration, joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { assetLabel, useAssetName } from "@/pieces/asset-name"
import { useWaveform } from "@/studio/audio/use-waveform"
import { playedBarsOf } from "@/studio/audio/waveform"

type Playback = {
  ref: RefObject<HTMLAudioElement | null>
  isPlaying: boolean
  fraction: number
  seconds: number | null
  toggle: () => void
  onTime: () => void
  onEnd: () => void
  onMeta: () => void
}

function usePlayback(): Playback {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setPlaying] = useState(false)
  const [fraction, setFraction] = useState(0)
  const [seconds, setSeconds] = useState<number | null>(null)
  return {
    ref,
    isPlaying,
    fraction,
    seconds,
    toggle: () => {
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
    },
    onTime: () => {
      const element = ref.current
      if (element !== null && element.duration > 0) {
        setFraction(element.currentTime / element.duration)
      }
    },
    onEnd: () => {
      setPlaying(false)
      setFraction(0)
    },
    onMeta: () => {
      const duration = ref.current?.duration ?? Number.NaN
      setSeconds(Number.isFinite(duration) ? duration : null)
    },
  }
}

function Bars({
  peaks,
  fraction,
}: {
  peaks: readonly number[]
  fraction: number
}): ReactElement {
  const played = playedBarsOf(fraction, peaks.length)
  return (
    <svg
      data-slot="waveform"
      aria-hidden="true"
      viewBox={`0 0 ${peaks.length} 1`}
      preserveAspectRatio="none"
      className="block h-button w-full"
    >
      {peaks.map((peak, index) => {
        const height = Math.max(0.08, peak)
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: a bar's place in the waveform is its identity
            key={index}
            x={index + 0.2}
            y={(1 - height) / 2}
            width={0.6}
            height={height}
            className={index < played ? "fill-ink" : "fill-track"}
          />
        )
      })}
    </svg>
  )
}

function Track({ fraction }: { fraction: number }): ReactElement {
  return (
    <span className="block h-track w-full overflow-hidden rounded-full bg-track">
      <span
        className={cn("block h-full origin-left bg-ink", motion.control)}
        style={{ transform: `scaleX(${fraction})` }}
      />
    </span>
  )
}

type WaveformPlayerProps = {
  assetId: string
  isDemo?: boolean
  hasDownload?: boolean
  action?: ReactNode
}

function lengthOf(
  asset: Asset,
  decoded: number | null,
  played: number | null
): number | null {
  return asset.durationSeconds ?? decoded ?? played
}

function LoadedPlayer(
  props: WaveformPlayerProps & { asset: Asset; src: string }
): ReactElement {
  const playback = usePlayback()
  const waveform = useWaveform(props.asset.id, props.src)
  const download = useDownloadAsset()
  const name = useAssetName(props.asset) ?? assetLabel(props.asset)
  const seconds = lengthOf(
    props.asset,
    waveform?.seconds ?? null,
    playback.seconds
  )
  const caption = joinParts([
    props.isDemo === true ? t("run.demoCaption") : null,
    seconds === null ? null : formatDuration(seconds),
  ])
  return (
    <div
      data-slot="waveform-player"
      className="flex w-full min-w-0 items-center gap-s3 rounded-cell bg-(--well) p-s2"
    >
      {/* biome-ignore lint/a11y/useMediaCaption: an audio output has no caption track */}
      <audio
        ref={playback.ref}
        src={props.src}
        preload="metadata"
        onTimeUpdate={playback.onTime}
        onEnded={playback.onEnd}
        onLoadedMetadata={playback.onMeta}
      />
      <IconButton
        label={playback.isPlaying ? t("output.pause") : t("output.play")}
        onClick={playback.toggle}
      >
        {playback.isPlaying ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <PlayIcon aria-hidden="true" />
        )}
      </IconButton>
      <div className="flex min-w-0 flex-1 flex-col gap-s1_5">
        <div className="flex items-baseline justify-between gap-s2">
          <span className="min-w-0 truncate text-body">{name}</span>
          {caption === "" ? null : (
            <span className="shrink-0 text-caption text-ink-muted">
              {caption}
            </span>
          )}
        </div>
        {waveform === null || waveform.peaks.length === 0 ? (
          <Track fraction={playback.fraction} />
        ) : (
          <Bars peaks={waveform.peaks} fraction={playback.fraction} />
        )}
      </div>
      {props.hasDownload === false ? null : (
        <IconButton
          label={t("output.download")}
          tone="quiet"
          onClick={() => void download(props.asset)}
        >
          <DownloadIcon aria-hidden="true" />
        </IconButton>
      )}
      {props.action}
    </div>
  )
}

export function WaveformPlayer(props: WaveformPlayerProps): ReactElement {
  const asset = useQuery(assetQuery(props.assetId))
  const source = useAssetSource(props.assetId)
  const loaded = asset.data?.asset
  if (loaded === undefined || source.state !== "ready") {
    return <Skeleton className="h-s12 w-full" />
  }
  return <LoadedPlayer {...props} asset={loaded} src={source.src} />
}
