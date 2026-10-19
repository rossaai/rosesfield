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

export function DownloadMenu({ runId, rows }: DownloadMenuProps): ReactElement {
  const device = useDevice()
  const bottomFirst = [...rows].reverse().filter((row) => !row.isHidden)
  const base = `rosesfield-layers-${runId.slice(0, 8)}`
  const saveFlat = async (): Promise<void> => {
    const blob = await flattenLayers(bottomFirst.map((row) => row.shown))
    if (blob !== null) {
      await device.save({ name: `${base}.png`, blob })
    }
  }
  const saveEach = async (): Promise<void> => {
    for (const row of bottomFirst) {
      const blob = await callRoute(routes.readAssetContent, {
        params: { assetId: row.shown },
      })
      await device.save({ name: `${base}-${row.layer.number}.png`, blob })
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="small" disabled={bottomFirst.length === 0}>
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
