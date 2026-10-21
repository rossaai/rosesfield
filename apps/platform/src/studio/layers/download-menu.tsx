import { routes } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { DownloadIcon } from "lucide-react"
import type { ReactElement } from "react"
import { callRoute } from "@/api/call-route"
import { t, tCatalog } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import type { LayerRow } from "@/studio/layers/layer-list"
import { flattenLayers } from "@/studio/layers/stack-images"

type DownloadMenuProps = {
  runId: string
  rows: readonly LayerRow[]
}

export type LayerFile = {
  name: string
  assetId: string
}

export type StackDownloads = {
  flat: { name: string; assetIds: string[] }
  each: LayerFile[]
}

export function downloadsOf(
  runId: string,
  rows: readonly LayerRow[]
): StackDownloads {
  const bottomFirst = [...rows].reverse().filter((row) => !row.isHidden)
  const base = `rosesfield-layers-${runId.slice(0, 8)}`
  return {
    flat: {
      name: `${base}.png`,
      assetIds: bottomFirst.map((row) => row.shown),
    },
    each: bottomFirst.map((row) => ({
      name: `${base}-${row.layer.number}.png`,
      assetId: row.shown,
    })),
  }
}

export function DownloadMenu({ runId, rows }: DownloadMenuProps): ReactElement {
  const device = useDevice()
  const downloads = downloadsOf(runId, rows)
  const saveFlat = async (): Promise<void> => {
    const blob = await flattenLayers(downloads.flat.assetIds)
    if (blob !== null) {
      await device.save({ name: downloads.flat.name, blob })
    }
  }
  const saveEach = async (): Promise<void> => {
    for (const file of downloads.each) {
      const blob = await callRoute(routes.readAssetContent, {
        params: { assetId: file.assetId },
      })
      await device.save({ name: file.name, blob })
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="small" disabled={downloads.each.length === 0}>
            <DownloadIcon aria-hidden="true" />
            {t("output.download")}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void saveFlat()}>
          {tCatalog("layers.download.flat")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void saveEach()}>
          {tCatalog("layers.download.each")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
