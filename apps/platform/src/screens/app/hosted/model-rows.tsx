import {
  type ModelFacts,
  type ModelTag,
  taskScoreOf,
} from "@rosesfield/catalog/comfy"
import type {
  ModelPickerRow,
  ModelPickerTag,
  ModelPickerWords,
  ModelPrice,
  ModelRank,
} from "@rosesfield/ui/components/model-picker"
import { ClockIcon, CoinsIcon, ScanIcon, Volume2Icon } from "lucide-react"
import { formatAmount } from "@/copy/format"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import {
  mainTaskOf,
  taskBoardsOf,
  topOrderOf,
} from "@/screens/app/hosted/model-sections"
import {
  type BadgeContext,
  badgesOf,
  rankNoteOf,
} from "@/screens/app/hosted/row-badges"

export type RowFact =
  | ModelTag
  | { kind: "rate"; way: "in" | "out"; credits: number }

export type RowModel = {
  id: string
  name: string
  lab: string
  keywords: readonly string[]
  task: string | null
  facts: ModelFacts | undefined
  tags: readonly RowFact[]
}

export type RowOptions = {
  today?: string
  prices?: ReadonlyMap<string, ModelPrice>
  words?: BadgeContext["words"]
}

export function todayOf(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function rateText(credits: number): string {
  return formatAmount(credits >= 10 ? Math.round(credits) : credits)
}

export function capabilityOf(fact: RowFact): ModelPickerTag | null {
  switch (fact.kind) {
    case "resolution":
      return { label: fact.value, icon: <ScanIcon aria-hidden="true" /> }
    case "length":
      return {
        label: t("model.tag.length", { min: fact.min, max: fact.max }),
        icon: <ClockIcon aria-hidden="true" />,
      }
    case "sound":
      return {
        label: t("model.tag.sound"),
        icon: <Volume2Icon aria-hidden="true" />,
      }
    case "references":
      return { label: t("model.tag.references", { max: fact.max }) }
    case "rate":
      return {
        label: t(
          fact.way === "in" ? "agent.model.rate.in" : "agent.model.rate.out",
          {
            credits: rateText(fact.credits),
          }
        ),
        icon: <CoinsIcon aria-hidden="true" />,
      }
    case "open-weights":
    case "hosted":
    case "proven":
      return null
  }
}

const capabilityOrder: readonly RowFact["kind"][] = [
  "sound",
  "resolution",
  "length",
  "references",
  "rate",
]

export function taskTagOf(task: string | null): ModelPickerTag | null {
  if (task === null) {
    return null
  }
  const key = `model.task.${task.replace(/-(\w)/g, (_match: string, letter: string) => letter.toUpperCase())}`
  return hasCatalogText(key) ? { label: tCatalog(key) } : null
}

export function capabilitiesOf(
  model: Pick<RowModel, "task" | "tags">,
  mainTask: string | null
): ModelPickerTag[] {
  const task = model.task === mainTask ? null : taskTagOf(model.task)
  const facts = capabilityOrder.flatMap((kind) =>
    model.tags.filter((fact) => fact.kind === kind)
  )
  return [
    ...(task === null ? [] : [task]),
    ...facts.flatMap((fact) => {
      const shown = capabilityOf(fact)
      return shown === null ? [] : [shown]
    }),
  ]
}

function rankOf(model: RowModel, context: BadgeContext): ModelRank | undefined {
  const score = taskScoreOf(model.facts, context.task)
  if (score === null || score.rank === null) {
    return undefined
  }
  const note = rankNoteOf(score.sources, context.taskBoards)
  return {
    place: score.rank,
    label: t("model.picker.rank", { rank: score.rank }),
    ...(note === null ? {} : { note }),
  }
}

function rowOf(
  model: RowModel,
  context: BadgeContext,
  price: ModelPrice | undefined
): ModelPickerRow {
  const rank = rankOf(model, context)
  return {
    id: model.id,
    name: model.name,
    keywords: [model.lab, ...model.keywords],
    mark: <LabMark maker={model.lab} />,
    ...(rank === undefined ? {} : { rank }),
    badges: badgesOf(model.id, model.tags, model.facts, context),
    capabilities: capabilitiesOf(model, context.task),
    ...(price === undefined ? {} : { price }),
  }
}

/** Builds every model picker's rows, in rank order for the models' main task, from any model a picker lists. */
export function modelRowsOf(
  models: readonly RowModel[],
  options: RowOptions = {}
): ModelPickerRow[] {
  const task = mainTaskOf(models)
  const context: BadgeContext = {
    task,
    today: options.today ?? todayOf(),
    taskBoards: taskBoardsOf(models, task),
    ...(options.words === undefined ? {} : { words: options.words }),
  }
  return topOrderOf(models, task).map((model) =>
    rowOf(model, context, options.prices?.get(model.id))
  )
}

export function pickerWords(): ModelPickerWords {
  return {
    title: t("model.picker.title"),
    search: t("model.picker.search"),
    searchPlaceholder: t("model.picker.searchPlaceholder"),
    empty: t("model.picker.empty"),
    sortFilter: t("model.picker.sortFilter"),
    sortBy: t("model.picker.sortBy"),
    sortRank: t("model.picker.sort.rank"),
    sortPrice: t("viewer.label.price"),
    order: t("model.picker.order"),
    orderDown: t("model.picker.order.down"),
    orderUp: t("model.picker.order.up"),
    openOnly: t("model.picker.openOnly"),
    recent: t("model.picker.recent"),
    all: t("model.picker.all"),
  }
}
