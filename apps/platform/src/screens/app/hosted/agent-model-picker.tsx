import { labOfModel, makerOf, nameOf } from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { type ReactElement, useMemo } from "react"
import type { AgentModelDetail } from "@/api/agent-wire"
import { formatWholeCredits, joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
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
    { kind: "input", input: "text" },
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

/** The credits of 1M tokens of the model, 3 input to 1 output. */
export function blendedCreditsOf(detail: AgentModelDetail): number {
  return (3 * detail.input + detail.output) / 4
}

/** A row's price: the model's credits per 1M tokens as a whole number, with its credits per 1M in and out on hover. */
export function ratePriceOf(detail: AgentModelDetail): ModelPrice | null {
  const credits = blendedCreditsOf(detail)
  if (credits <= 0) {
    return null
  }
  const amount = formatWholeCredits(credits)
  return {
    amount,
    name: t("agent.model.rate", { credits: amount }),
    credits,
    note: joinParts([
      t("agent.model.rate.in", { credits: formatWholeCredits(detail.input) }),
      t("agent.model.rate.out", {
        credits: formatWholeCredits(detail.output),
      }),
    ]),
  }
}

export function ratePricesOf(
  models: readonly string[],
  details: AgentDetails
): Map<string, ModelPrice> {
  const prices = new Map<string, ModelPrice>()
  for (const model of models) {
    const detail = detailOf(details, model)
    const price = detail === undefined ? null : ratePriceOf(detail)
    if (price !== null) {
      prices.set(model, price)
    }
  }
  return prices
}

export function agentRowsOf(
  models: readonly string[],
  details: AgentDetails = {},
  today: string = todayOf()
): ModelPickerRow[] {
  return modelRowsOf(
    models.map((model) => chatRowModel(model, detailOf(details, model))),
    { today, prices: ratePricesOf(models, details) }
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
  const rows = useMemo(() => agentRowsOf(models, details), [models, details])
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
