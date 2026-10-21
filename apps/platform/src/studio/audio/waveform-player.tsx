import type { Asset } from "@rosesfield/contract"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { assetQuery } from "@/api/queries"
import { useAssetSource } from "@/api/use-asset-source"
import { t } from "@/copy/t"
import { useDownloadAsset } from "@/pieces/asset-actions"
import { assetLabel, useAssetName } from "@/pieces/asset-name"
import { AudioRow } from "@/pieces/audio-row"
import { useWaveform } from "@/studio/audio/use-waveform"
import { playedBarsOf } from "@/studio/audio/waveform"

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

type WaveformPlayerProps = {
  assetId: string
  isDemo?: boolean
  hasDownload?: boolean
  action?: ReactNode
}

function LoadedPlayer(
  props: WaveformPlayerProps & { asset: Asset; src: string }
): ReactElement {
  const waveform = useWaveform(props.asset.id, props.src)
  const download = useDownloadAsset()
  const name = useAssetName(props.asset) ?? assetLabel(props.asset)
  const peaks = waveform?.peaks ?? []
  return (
    <AudioRow
      src={props.src}
      name={name}
      durationSeconds={
        props.asset.durationSeconds ?? waveform?.seconds ?? null
      }
      {...(props.isDemo === true ? { caption: t("run.demoCaption") } : {})}
      {...(props.hasDownload === false
        ? {}
        : { onDownload: () => void download(props.asset) })}
      {...(peaks.length === 0
        ? {}
        : {
            meter: (fraction: number) => (
              <Bars peaks={peaks} fraction={fraction} />
            ),
          })}
      action={props.action}
    />
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
