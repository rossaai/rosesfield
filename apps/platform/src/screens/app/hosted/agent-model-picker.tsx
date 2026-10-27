import { labOfModel, makerOf, nameOf } from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { type ReactElement, useMemo } from "react"
import type { AgentModelDetail } from "@/api/agent-wire"
import type { AgentEffort } from "@/api/conversation-wire"
import { formatEstimate, joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import {
  effortOf,
  readEffortOf,
  useKeptEfforts,
} from "@/screens/agent/agent-effort"
import {
  modelRowsOf,
  pickerWords,
  type RowFact,
  type RowModel,
  todayOf,
} from "@/screens/app/hosted/model-rows"

export const chatTask = "chat"

export type AgentDetails = Readonly<Record<string, AgentModelDetail>>

export function agentLabOf(model: string, lab?: string): string {
  return labOfModel(model) ?? makerOf(lab ?? model.split("/")[0] ?? model)
}

function detailOf(
  details: AgentDetails,
  model: string
): AgentModelDetail | undefined {
  return Object.hasOwn(details, model) ? details[model] : undefined
}

function factsOfDetail(detail: AgentModelDetail): RowFact[] {
  return [
    { kind: "context", tokens: detail.context },
    ...(detail.reasons ? [{ kind: "reasons" } as const] : []),
    ...detail.inputs.map((input) => ({ kind: "input", input }) as const),
  ]
}

export function chatRowModel(
  model: string,
  detail: AgentModelDetail | undefined
): RowModel {
  return {
    id: model,
    name: detail?.name ?? nameOf(model),
    lab: agentLabOf(model, detail?.lab),
    keywords: [],
    task: chatTask,
    facts: detail?.facts,
    tags: detail === undefined ? [] : factsOfDetail(detail),
  }
}

/** The credits of one typical turn of the model at an effort, or at the effort it opens on. */
export function turnCreditsOf(
  detail: AgentModelDetail,
  effort: AgentEffort | null
): number {
  return (
    detail.efforts.find((one) => one.effort === effort)?.turn ?? detail.turn
  )
}

export function turnPriceOf(
  detail: AgentModelDetail,
  effort: AgentEffort | null
): ModelPrice | null {
  const credits = turnCreditsOf(detail, effort)
  if (credits <= 0) {
    return null
  }
  const amount = formatEstimate(credits)
  return {
    amount,
    name: t("run.price.estimated", { amount }),
    credits,
    note: joinParts([
      t("agent.model.rate.in", { credits: formatEstimate(detail.input) }),
      t("agent.model.rate.out", { credits: formatEstimate(detail.output) }),
    ]),
  }
}

export function turnPricesOf(
  models: readonly string[],
  details: AgentDetails,
  effortOf: (model: string, detail: AgentModelDetail) => AgentEffort | null
): Map<string, ModelPrice> {
  const prices = new Map<string, ModelPrice>()
  for (const model of models) {
    const detail = detailOf(details, model)
    const price =
      detail === undefined ? null : turnPriceOf(detail, effortOf(model, detail))
    if (price !== null) {
      prices.set(model, price)
    }
  }
  return prices
}

export function agentRowsOf(
  models: readonly string[],
  details: AgentDetails = {},
  today: string = todayOf(),
  effortOf: (
    model: string,
    detail: AgentModelDetail
  ) => AgentEffort | null = readEffortOf
): ModelPickerRow[] {
  return modelRowsOf(
    models.map((model) => chatRowModel(model, detailOf(details, model))),
    { today, prices: turnPricesOf(models, details, effortOf) }
  )
}

type AgentModelPickerProps = {
  models: readonly string[]
  details?: AgentDetails
  recent?: readonly string[]
  chosen: string
  onChoose: (model: string) => void
  disabled?: boolean
  className?: string
}

const noDetails: AgentDetails = {}

export function AgentModelPicker({
  models,
  details = noDetails,
  recent,
  chosen,
  onChoose,
  disabled = false,
  className,
}: AgentModelPickerProps): ReactElement {
  const detail = detailOf(details, chosen)
  const name = detail?.name ?? nameOf(chosen)
  const kept = useKeptEfforts()
  const rows = useMemo(
    () =>
      agentRowsOf(models, details, todayOf(), (model, one) =>
        effortOf(model, one, kept)
      ),
    [models, details, kept]
  )
  return (
    <ModelPicker
      trigger={
        <ModelChip
          name={name}
          aria-label={`${t("model.picker.title")} ${name}`}
          mark={<LabMark maker={agentLabOf(chosen, detail?.lab)} />}
          disabled={disabled}
          {...(className === undefined ? {} : { className })}
        />
      }
      words={pickerWords()}
      rows={rows}
      {...(recent === undefined ? {} : { recent })}
      chosen={chosen}
      onChoose={onChoose}
      side="top"
    />
  )
}
