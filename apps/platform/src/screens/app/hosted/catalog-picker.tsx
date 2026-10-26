import {
  type CatalogModel,
  graphMaker,
  labOfModel,
  type ModelFacts,
} from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { useInfiniteQuery } from "@tanstack/react-query"
import { type ReactElement, useMemo, useRef, useState } from "react"
import { runsOf, runsQuery } from "@/api/queries"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import {
  modelRowsOf,
  pickerWords,
  type RowModel,
  todayOf,
} from "@/screens/app/hosted/model-rows"
import { recentModelsOf } from "@/screens/app/hosted/model-sections"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { useRowPrices } from "@/screens/app/hosted/use-row-prices"

export function makerNameOf(model: CatalogModel): string {
  return model.maker === graphMaker ? t("model.maker.graphs") : model.maker
}

export function labOf(model: {
  maker: string
  facts?: ModelFacts | undefined
}): string {
  return model.facts?.lab ?? model.maker
}

export function chosenLabOf(model: CatalogModel): string | null {
  const lab = model.facts?.lab ?? labOfModel(model.id)
  if (lab !== null) {
    return lab
  }
  return model.maker === graphMaker ? null : model.maker
}

export function modelNameOf(model: CatalogModel): string {
  return model.nameKey !== null && hasCatalogText(model.nameKey)
    ? tCatalog(model.nameKey)
    : model.name
}

export function catalogRowModel(model: CatalogModel): RowModel {
  return {
    id: model.id,
    name: modelNameOf(model),
    lab: labOf(model),
    keywords: [makerNameOf(model)],
    task: model.task,
    facts: model.facts,
    tags: model.tags,
  }
}

export function catalogRowsOf(
  models: readonly CatalogModel[],
  today: string = todayOf(),
  prices: ReadonlyMap<string, ModelPrice> = new Map()
): ModelPickerRow[] {
  return modelRowsOf(models.map(catalogRowModel), { today, prices })
}

type CatalogPickerProps = {
  hosted: HostedState
  defaultOpen?: boolean
  place?: "chip" | "row"
}

export function pickerTrigger(
  hosted: HostedState,
  place: "chip" | "row"
): ReactElement {
  const chosen = hosted.chosen
  const name = chosen === null ? t("model.picker.title") : modelNameOf(chosen)
  const lab = chosen === null ? null : chosenLabOf(chosen)
  const mark = lab === null ? undefined : <LabMark maker={lab} />
  const markProp = mark === undefined ? {} : { mark }
  return (
    <ModelChip
      name={name}
      aria-label={`${t("model.picker.title")} ${name}`}
      width={place === "row" ? "full" : "fit"}
      {...markProp}
    />
  )
}

function priceKeyOf(prices: ReadonlyMap<string, ModelPrice>): string {
  return [...prices].map(([id, price]) => `${id}:${price.amount}`).join("|")
}

export function useSamePrices(
  prices: ReadonlyMap<string, ModelPrice>
): ReadonlyMap<string, ModelPrice> {
  const held = useRef({ key: "", prices })
  const key = priceKeyOf(prices)
  if (held.current.key !== key) {
    held.current = { key, prices }
  }
  return held.current.prices
}

export function useCatalogRows(
  models: readonly CatalogModel[],
  prices: ReadonlyMap<string, ModelPrice>
): ModelPickerRow[] {
  const today = todayOf()
  const samePrices = useSamePrices(prices)
  return useMemo(
    () => catalogRowsOf(models, today, samePrices),
    [models, today, samePrices]
  )
}

export function useRecentModels(appId: string | null): readonly string[] {
  const query = useInfiniteQuery({ ...runsQuery(appId ?? ""), enabled: false })
  const runs = runsOf(query.data)
  return useMemo(() => recentModelsOf(runs), [runs])
}

export function CatalogPicker({
  hosted,
  defaultOpen = false,
  place = "chip",
}: CatalogPickerProps): ReactElement {
  const [isOpen, setOpen] = useState(defaultOpen)
  const { prices, isPricing } = useRowPrices(hosted, isOpen)
  const recent = useRecentModels(hosted.pricing?.appId ?? null)
  const rows = useCatalogRows(hosted.models, prices)
  const isRegular = useIsRegularWindow()
  const isBeside = place === "row" && isRegular
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
      recent={recent}
      side={isBeside ? "right" : "top"}
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
