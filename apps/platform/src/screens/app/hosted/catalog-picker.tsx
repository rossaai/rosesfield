import {
  type CatalogModel,
  type FactBadge,
  factBadgesOf,
  graphMaker,
  labOfModel,
  type ModelFacts,
  type ModelTag,
  weightsHost,
} from "@rosesfield/catalog/comfy"
import {
  type ModelBadge,
  ModelPicker,
  type ModelPickerSection,
  type ModelPickerTag,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import {
  ModelChip,
  ModelRowTrigger,
} from "@rosesfield/ui/components/model-trigger"
import {
  CircleCheckIcon,
  ClockIcon,
  LockOpenIcon,
  ScanIcon,
  TrophyIcon,
  Volume2Icon,
} from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { type CopyValues, hasCatalogText, t, tCatalog } from "@/copy/t"
import { LabMark, labMarkOf, weightsMaker } from "@/pieces/lab-mark"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import { modelSections } from "@/screens/app/hosted/model-sections"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { useRowPrices } from "@/screens/app/hosted/use-row-prices"
import { openModels } from "@/screens/welcome/open-weights"

export type CatalogWords = (key: string, values?: CopyValues) => string | null

function catalogWords(key: string, values?: CopyValues): string | null {
  return hasCatalogText(key) ? tCatalog(key, values) : null
}

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

export function rankTagOf(
  facts: ModelFacts | undefined
): ModelPickerTag | null {
  const rank = facts?.rank ?? null
  return rank === null
    ? null
    : {
        label: t("model.tag.rank", {
          position: rank.position,
          size: rank.size,
        }),
        icon: <TrophyIcon aria-hidden="true" />,
      }
}

export function capabilitiesOf(
  tags: readonly ModelTag[],
  facts: ModelFacts | undefined
): ModelPickerTag[] {
  const specific = tags.filter(
    (tag) => tag.kind !== "open-weights" && tag.kind !== "hosted"
  )
  const rank = rankTagOf(facts)
  const hosted = tags.filter((tag) => tag.kind === "hosted")
  return [
    ...specific.map(tagOf),
    ...(rank === null ? [] : [rank]),
    ...hosted.map(tagOf),
  ]
}

export function taskTagOf(task: string): ModelPickerTag | null {
  const key = `model.task.${task.replace(/-(\w)/g, (_match: string, letter: string) => letter.toUpperCase())}`
  return hasCatalogText(key) ? { label: tCatalog(key) } : null
}

function isMixedTasks(models: readonly CatalogModel[]): boolean {
  return new Set(models.map((model) => model.task)).size > 1
}

const sectionLabels = {
  featured: "model.picker.featured",
  all: "model.picker.all",
} as const

const factBadgeKeys = {
  new: "comfy.badge.new",
  top: "comfy.badge.top",
  premium: "comfy.badge.premium",
} as const

type FactBadgeKind = keyof typeof factBadgeKeys

export function todayOf(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

const repoPattern = /^[\w.-]+\/[\w.-]+$/

export function weightsLinkOf(id: string): string | null {
  const model = openModels.find((one) => one.id === id)
  if (model === undefined) {
    return null
  }
  if (model.link.startsWith(weightsHost)) {
    return model.link
  }
  const repo = model.files.find(
    (file) => repoPattern.test(file) && !file.endsWith(".safetensors")
  )
  return repo === undefined ? null : `${weightsHost}${repo}`
}

function factBadgeOf(badge: FactBadge, words: CatalogWords): ModelBadge[] {
  if (badge.kind === "open-weights") {
    return []
  }
  const kind: FactBadgeKind = badge.kind
  const label = words(factBadgeKeys[kind])
  return label === null ? [] : [{ kind, label }]
}

function weightsBadgeOf(
  id: string,
  tags: readonly ModelTag[],
  facts: ModelFacts | undefined
): ModelBadge[] {
  if (!tags.some((tag) => tag.kind === "open-weights")) {
    return []
  }
  return [openWeightsBadge(facts?.weights ?? weightsLinkOf(id))]
}

export function openWeightsBadge(href: string | null): ModelBadge {
  const mark = labMarkOf(weightsMaker)
  return {
    kind: "openWeights",
    label: t("model.tag.openWeights"),
    ...(href === null ? {} : { href }),
    ...(mark === null ? {} : { markColour: `#${mark.hex}` }),
  }
}

export function badgesOf(
  id: string,
  tags: readonly ModelTag[],
  facts?: ModelFacts,
  today: string = todayOf(),
  words: CatalogWords = catalogWords
): ModelBadge[] {
  return [
    ...factBadgesOf(facts, today).flatMap((badge) => factBadgeOf(badge, words)),
    ...weightsBadgeOf(id, tags, facts),
  ]
}

export function pickerSections(
  hosted: HostedState,
  today: string = todayOf(),
  prices: ReadonlyMap<string, ModelPrice> = new Map()
): ModelPickerSection[] {
  const first = [
    ...(hosted.defaultModel === null ? [] : [hosted.defaultModel]),
    ...hosted.ranBefore,
  ]
  const models = hosted.models.map((model) => ({
    ...model,
    maker: makerNameOf(model),
  }))
  const isMixed = isMixedTasks(hosted.models)
  return modelSections(models, first, modelNameOf).map((section) => ({
    id: section.id,
    label: t(sectionLabels[section.id]),
    rows: section.rows.map((row) => {
      const price = prices.get(row.id)
      return {
        id: row.id,
        name: row.name,
        maker: row.maker,
        lab: labOf(row),
        tags: [
          ...(isMixed ? [taskTagOf(row.task)] : []).filter(
            (tag): tag is ModelPickerTag => tag !== null
          ),
          ...capabilitiesOf(row.tags, row.facts),
        ],
        mark: <LabMark maker={labOf(row)} />,
        badges: badgesOf(row.id, row.tags, row.facts, today),
        ...(price === undefined ? {} : { price }),
      }
    }),
  }))
}

type CatalogPickerProps = {
  hosted: HostedState
  defaultOpen?: boolean
  settings?: ReactNode
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
  return place === "row" ? (
    <ModelRowTrigger
      caption={t("model.picker.title")}
      name={name}
      aria-label={`${t("model.picker.title")} ${name}`}
      {...markProp}
    />
  ) : (
    <ModelChip
      name={name}
      aria-label={`${t("model.picker.title")} ${name}`}
      {...markProp}
    />
  )
}

export function CatalogPicker({
  hosted,
  defaultOpen = false,
  settings,
  place = "chip",
}: CatalogPickerProps): ReactElement {
  const [isOpen, setOpen] = useState(defaultOpen)
  const { prices, isPricing } = useRowPrices(hosted, isOpen)
  const isRegular = useIsRegularWindow()
  const isBeside = place === "row" && isRegular
  return (
    <ModelPicker
      trigger={pickerTrigger(hosted, place)}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={pickerSections(hosted, todayOf(), prices)}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      open={isOpen}
      onOpenChange={setOpen}
      isPricing={isPricing}
      settings={settings}
      side={isBeside ? "right" : "top"}
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
