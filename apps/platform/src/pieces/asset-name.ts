import type { Asset } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { assetQuery, runQuery } from "@/api/queries"
import { formatDuration } from "@/copy/format"
import { t } from "@/copy/t"
import { runOutputName } from "@/pieces/run/run-facts"

export function assetLabel(asset: Asset): string {
  return asset.sourceRunId === null
    ? t(`output.upload.${asset.kind}`)
    : t(`output.${asset.kind}`)
}

export function assetLength(asset: Asset): string | undefined {
  return asset.durationSeconds === null
    ? undefined
    : formatDuration(asset.durationSeconds)
}

export function useAssetName(asset: Asset | undefined): string | null {
  const sourceRunId = asset?.sourceRunId ?? null
  const run = useQuery({
    ...runQuery(sourceRunId ?? ""),
    enabled: sourceRunId !== null,
  })
  if (asset === undefined) {
    return null
  }
  return run.data === undefined || sourceRunId === null
    ? assetLabel(asset)
    : runOutputName(run.data.run)
}

export function useAssetNameOf(assetId: string): string | null {
  const asset = useQuery(assetQuery(assetId))
  return useAssetName(asset.data?.asset)
}
