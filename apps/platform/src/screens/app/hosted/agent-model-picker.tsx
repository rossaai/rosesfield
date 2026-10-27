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
import { formatWholeCredits, joinParts } from "@/copy/format"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import {
  effortOf,
  type KeptEfforts,
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

/** The credits of one message at an effort, rounded up to a whole credit, so never under 1, or null for a model that bills nothing. */
export function messageCreditsOf(
  detail: AgentModelDetail,
  effort: AgentEffort | null
): number | null {
  const found =
    detail.messages.find((one) => one.effort === effort) ??
    detail.messages.find((one) => one.effort === detail.effort) ??
    detail.messages[0]
  if (found === undefined || found.credits <= 0) {
    return null
  }
  return Math.ceil(found.credits)
}

/** A row's price: one message at the effort the composer holds for the model, in whole credits, with its credits per 1M in and out on hover. */
export function messagePriceOf(
  detail: AgentModelDetail,
  effort: AgentEffort | null
): ModelPrice | null {
  const credits = messageCreditsOf(detail, effort)
  if (credits === null) {
    return null
  }
  const amount = formatWholeCredits(credits)
  return {
    amount,
    name: t("agent.model.message", { credits: amount }),
    credits,
    note: joinParts([
      t("agent.model.rate.in", { credits: formatWholeCredits(detail.input) }),
      t("agent.model.rate.out", {
        credits: formatWholeCredits(detail.output),
      }),
    ]),
  }
}

export function messagePricesOf(
  models: readonly string[],
  details: AgentDetails,
  kept: KeptEfforts
): Map<string, ModelPrice> {
  const prices = new Map<string, ModelPrice>()
  for (const model of models) {
    const detail = detailOf(details, model)
    const price =
      detail === undefined
        ? null
        : messagePriceOf(detail, effortOf(model, detail, kept))
    if (price !== null) {
      prices.set(model, price)
    }
  }
  return prices
}

export function agentRowsOf(
  models: readonly string[],
  details: AgentDetails = {},
  kept: KeptEfforts = {},
  today: string = todayOf()
): ModelPickerRow[] {
  return modelRowsOf(
    models.map((model) => chatRowModel(model, detailOf(details, model))),
    { today, prices: messagePricesOf(models, details, kept) }
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
    () => agentRowsOf(models, details, kept),
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
