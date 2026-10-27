import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { type ReactElement, useMemo, useState } from "react"
import {
  catalogRowModel,
  pickerTrigger,
  useSamePrices,
} from "@/screens/app/hosted/catalog-picker"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import {
  modelRowsOf,
  pickerWords,
  type RowModel,
  todayOf,
} from "@/screens/app/hosted/model-rows"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { useRowPrices } from "@/screens/app/hosted/use-row-prices"
import { modelPhotoLimitOf } from "@/studio/ads/ads-rules"

function adsRowModel(app: AppListing, model: CatalogModel): RowModel {
  const row = catalogRowModel(model)
  const max = modelPhotoLimitOf(app, model.id, model)
  return {
    ...row,
    tags: [
      { kind: "references", max },
      ...row.tags.filter((tag) => tag.kind !== "references"),
    ],
  }
}

export function adsRowsOf(
  app: AppListing,
  hosted: Pick<HostedState, "models">,
  prices: ReadonlyMap<string, ModelPrice> = new Map(),
  today: string = todayOf()
): ModelPickerRow[] {
  return modelRowsOf(
    hosted.models.map((model) => adsRowModel(app, model)),
    { today, prices }
  )
}

type AdsCatalogPickerProps = {
  app: AppListing
  hosted: HostedState
  place: "chip" | "row"
}

export function AdsCatalogPicker({
  app,
  hosted,
  place,
}: AdsCatalogPickerProps): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const { prices, isPricing } = useRowPrices(hosted, isOpen)
  const samePrices = useSamePrices(prices)
  const { models } = hosted
  const rows = useMemo(
    () => adsRowsOf(app, { models }, samePrices),
    [app, models, samePrices]
  )
  return (
    <ModelPicker
      trigger={pickerTrigger(hosted, place)}
      words={pickerWords()}
      rows={rows}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      open={isOpen}
      onOpenChange={setOpen}
      isPricing={isPricing}
      side="top"
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
