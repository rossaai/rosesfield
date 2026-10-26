import {
  type CatalogModel,
  graphMaker,
  labOfModel,
  type ModelFacts,
  type ModelTag,
} from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerFilters,
  type ModelPickerRow,
  type ModelPickerSection,
  type ModelPickerTag,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  CalendarIcon,
  CircleCheckIcon,
  ClockIcon,
  LockOpenIcon,
  ScanIcon,
  Volume2Icon,
} from "lucide-react"
import { type ReactElement, useMemo, useRef, useState } from "react"
import { runsOf, runsQuery } from "@/api/queries"
import { formatDate } from "@/copy/format"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import {
  mainTaskOf,
  recentModelsOf,
  taskBoardsOf,
  topOrderOf,
} from "@/screens/app/hosted/model-sections"
import { type BadgeContext, badgesOf } from "@/screens/app/hosted/row-badges"
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

export function tagOf(tag: ModelTag): ModelPickerTag {
  switch (tag.kind) {
    case "resolution":
      return { label: tag.value, icon: <ScanIcon aria-hidden="true" /> }
    case "length":
      return {
        label: t("model.tag.length", { min: tag.min, max: tag.max }),
        icon: <ClockIcon aria-hidden="true" />,
      }
    case "sound":
      return {
        label: t("model.tag.sound"),
        icon: <Volume2Icon aria-hidden="true" />,
      }
    case "open-weights":
      return {
        label: t("model.tag.openWeights"),
        icon: <LockOpenIcon aria-hidden="true" />,
      }
    case "hosted":
      return { label: t("model.tag.hosted") }
    case "references":
      return { label: t("model.tag.references", { max: tag.max }) }
    case "proven":
      return {
        label: t("model.tag.proven"),
        icon: <CircleCheckIcon aria-hidden="true" />,
      }
  }
}

export function openWeightsTag(): ModelPickerTag {
  return tagOf({ kind: "open-weights" })
}

export function releaseTagOf(release: string | null): ModelPickerTag | null {
  return release === null
    ? null
    : {
        label: formatDate(`${release}T00:00:00`),
        icon: <CalendarIcon aria-hidden="true" />,
      }
}

const tagOrder: readonly ModelTag["kind"][] = [
  "sound",
  "resolution",
  "length",
  "references",
  "proven",
  "hosted",
]

export function capabilitiesOf(
  tags: readonly ModelTag[],
  facts: ModelFacts | undefined
): ModelPickerTag[] {
  const release = releaseTagOf(facts?.release ?? null)
  const sorted = tagOrder.flatMap((kind) =>
    tags.filter((tag) => tag.kind === kind)
  )
  const sound = sorted.filter((tag) => tag.kind === "sound").map(tagOf)
  const rest = sorted.filter((tag) => tag.kind !== "sound").map(tagOf)
  return [...sound, ...(release === null ? [] : [release]), ...rest]
}

export function taskTagOf(task: string | null): ModelPickerTag | null {
  if (task === null) {
    return null
  }
  const key = `model.task.${task.replace(/-(\w)/g, (_match: string, letter: string) => letter.toUpperCase())}`
  return hasCatalogText(key) ? { label: tCatalog(key) } : null
}

export function todayOf(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function costOf(price: ModelPrice | undefined): number | undefined {
  if (price === undefined) {
    return undefined
  }
  const digits = price.amount.replace(/\D/g, "")
  return price.amount.startsWith("<") || digits === "" ? 0 : Number(digits)
}

function pickerRowOf(
  model: CatalogModel,
  context: BadgeContext,
  price: ModelPrice | undefined
): ModelPickerRow {
  const lab = labOf(model)
  const taskTag = model.task === context.task ? null : taskTagOf(model.task)
  const cost = costOf(price)
  return {
    id: model.id,
    name: modelNameOf(model),
    maker: makerNameOf(model),
    lab,
    tags: [
      ...(taskTag === null ? [] : [taskTag]),
      ...capabilitiesOf(model.tags, model.facts),
    ],
    mark: <LabMark maker={lab} />,
    badges: badgesOf(model.id, model.tags, model.facts, context),
    ...(price === undefined ? {} : { price }),
    ...(cost === undefined ? {} : { cost }),
    ...(model.facts?.release === undefined || model.facts.release === null
      ? {}
      : { released: model.facts.release }),
    isOpen: model.tags.some((tag) => tag.kind === "open-weights"),
  }
}

export function pickerSections(
  hosted: Pick<HostedState, "models">,
  today: string = todayOf(),
  prices: ReadonlyMap<string, ModelPrice> = new Map()
): ModelPickerSection[] {
  const task = mainTaskOf(hosted.models)
  const context = {
    task,
    today,
    taskBoards: taskBoardsOf(hosted.models, task),
  }
  const rows = topOrderOf(hosted.models, task).map((model) =>
    pickerRowOf(model, context, prices.get(model.id))
  )
  return rows.length === 0
    ? []
    : [{ id: "all", label: t("model.picker.all"), rows }]
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

export function pickerFilters(): ModelPickerFilters {
  return {
    order: t("model.picker.order"),
    top: tCatalog("comfy.badge.top"),
    newest: t("model.picker.newest"),
    price: t("model.picker.price"),
    lastUsed: t("model.picker.lastUsed"),
    open: t("model.tag.openWeights"),
  }
}

function priceKeyOf(prices: ReadonlyMap<string, ModelPrice>): string {
  return [...prices].map(([id, price]) => `${id}:${price.amount}`).join("|")
}

function useSamePrices(
  prices: ReadonlyMap<string, ModelPrice>
): ReadonlyMap<string, ModelPrice> {
  const held = useRef({ key: "", prices })
  const key = priceKeyOf(prices)
  if (held.current.key !== key) {
    held.current = { key, prices }
  }
  return held.current.prices
}

export function usePickerSections(
  models: readonly CatalogModel[],
  prices: ReadonlyMap<string, ModelPrice>
): ModelPickerSection[] {
  const today = todayOf()
  const samePrices = useSamePrices(prices)
  return useMemo(
    () => pickerSections({ models }, today, samePrices),
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
  const sections = usePickerSections(hosted.models, prices)
  const isRegular = useIsRegularWindow()
  const isBeside = place === "row" && isRegular
  return (
    <ModelPicker
      trigger={pickerTrigger(hosted, place)}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={sections}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      open={isOpen}
      onOpenChange={setOpen}
      isPricing={isPricing}
      filters={pickerFilters()}
      recent={recent}
      side={isBeside ? "right" : "top"}
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
