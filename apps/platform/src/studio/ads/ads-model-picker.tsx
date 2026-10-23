import { adsHostedModel } from "@rosesfield/catalog/ads"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import type { ModelPrice } from "@rosesfield/ui/components/model-row"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import {
  pickerFilters,
  pickerSections,
  pickerTrigger,
  tagOf,
  todayOf,
} from "@/screens/app/hosted/catalog-picker"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { useRowPrices } from "@/screens/app/hosted/use-row-prices"
import { modelPhotoLimitOf } from "@/studio/ads/ads-rules"

function rowWithPhotos(
  app: AppListing,
  row: ModelPickerRow,
  model: CatalogModel | undefined
): ModelPickerRow {
  const photos = tagOf({
    kind: "references",
    max: modelPhotoLimitOf(app, row.id, model),
  })
  return {
    ...row,
    tags: [...row.tags, photos],
  }
}

export function adsPickerSections(
  app: AppListing,
  hosted: HostedState,
  prices: ReadonlyMap<string, ModelPrice> = new Map()
): ModelPickerSection[] {
  const byId = new Map(hosted.models.map((model) => [model.id, model]))
  const featured = {
    ...hosted,
    ranBefore: [adsHostedModel, ...hosted.ranBefore],
  }
  return pickerSections(featured, todayOf(), prices).map((section) => ({
    ...section,
    rows: section.rows.map((row) => rowWithPhotos(app, row, byId.get(row.id))),
  }))
}

type AdsCatalogPickerProps = {
  app: AppListing
  hosted: HostedState
  place: "chip" | "row"
  settings?: ReactNode
}

export function AdsCatalogPicker({
  app,
  hosted,
  place,
  settings,
}: AdsCatalogPickerProps): ReactElement {
  const [isOpen, setOpen] = useState(false)
  const { prices, isPricing } = useRowPrices(hosted, isOpen)
  return (
    <ModelPicker
      trigger={pickerTrigger(hosted, place)}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={adsPickerSections(app, hosted, prices)}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      open={isOpen}
      onOpenChange={setOpen}
      isPricing={isPricing}
      settings={settings}
      settingsLabel={t("bar.settings")}
      filters={pickerFilters()}
      side="top"
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
