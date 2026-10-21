import { type CatalogModel, isHostedModelId } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import type { ReactElement, ReactNode } from "react"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import {
  pickerSections,
  pickerTrigger,
  tagOf,
} from "@/screens/app/hosted/catalog-picker"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { modelInput, modelPhotoLimitOf } from "@/studio/ads/ads-rules"

function appModelIds(app: AppListing): string[] {
  const input = app.inputs.find((one) => one.name === modelInput)
  return input?.type === "choice"
    ? input.options.map((option) => option.value)
    : []
}

function ownLineOf(model: CatalogModel | undefined): string | null {
  const key = model?.nameKey ?? null
  return key !== null && hasCatalogText(`${key}.line`)
    ? tCatalog(`${key}.line`)
    : null
}

function rowWithPhotos(
  app: AppListing,
  row: ModelPickerRow,
  model: CatalogModel | undefined
): ModelPickerRow {
  const max = modelPhotoLimitOf(app, row.id, model)
  return {
    ...row,
    line: row.line ?? ownLineOf(model),
    tags: [...row.tags, tagOf({ kind: "references", max })],
  }
}

export function adsPickerSections(
  app: AppListing,
  hosted: HostedState
): ModelPickerSection[] {
  const byId = new Map(hosted.models.map((model) => [model.id, model]))
  const featured = {
    ...hosted,
    ranBefore: [
      ...appModelIds(app).filter(isHostedModelId),
      ...hosted.ranBefore,
    ],
  }
  return pickerSections(featured).map((section) => ({
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
  return (
    <ModelPicker
      trigger={pickerTrigger(hosted, place)}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={adsPickerSections(app, hosted)}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      settings={settings}
      side="top"
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
