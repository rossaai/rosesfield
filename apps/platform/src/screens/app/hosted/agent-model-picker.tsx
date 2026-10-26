import { factsOf, labOfModel, makerOf, nameOf } from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPrice,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { type ReactElement, useMemo } from "react"
import type { AgentModelRate } from "@/api/agent-wire"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import {
  modelRowsOf,
  pickerWords,
  type RowModel,
  todayOf,
} from "@/screens/app/hosted/model-rows"
import { rowPriceOf } from "@/screens/app/hosted/use-row-prices"

export const chatTask = "chat"

export function agentLabOf(model: string): string {
  return labOfModel(model) ?? makerOf(model.split("/")[0] ?? model)
}

export type AgentRates = Readonly<Record<string, AgentModelRate>>

function rateOf(rates: AgentRates, model: string): AgentModelRate | undefined {
  return Object.hasOwn(rates, model) ? rates[model] : undefined
}

export function chatRowModel(
  model: string,
  rate: AgentModelRate | undefined
): RowModel {
  return {
    id: model,
    name: nameOf(model),
    lab: agentLabOf(model),
    keywords: [],
    task: chatTask,
    facts: factsOf(model),
    tags:
      rate === undefined
        ? []
        : [
            { kind: "rate", way: "in", credits: rate.input },
            { kind: "rate", way: "out", credits: rate.output },
          ],
  }
}

export function turnPricesOf(
  models: readonly string[],
  rates: AgentRates
): Map<string, ModelPrice> {
  const prices = new Map<string, ModelPrice>()
  for (const model of models) {
    const turn = rateOf(rates, model)?.turn
    const price = turn === undefined ? null : rowPriceOf(turn, "estimate")
    if (price !== null) {
      prices.set(model, price)
    }
  }
  return prices
}

export function agentRowsOf(
  models: readonly string[],
  rates: AgentRates = {},
  today: string = todayOf()
): ModelPickerRow[] {
  return modelRowsOf(
    models.map((model) => chatRowModel(model, rateOf(rates, model))),
    { today, prices: turnPricesOf(models, rates) }
  )
}

type AgentModelPickerProps = {
  models: readonly string[]
  rates?: AgentRates
  recent?: readonly string[]
  chosen: string
  onChoose: (model: string) => void
  disabled?: boolean
  className?: string
}

const noRates: AgentRates = {}

export function AgentModelPicker({
  models,
  rates = noRates,
  recent,
  chosen,
  onChoose,
  disabled = false,
  className,
}: AgentModelPickerProps): ReactElement {
  const name = nameOf(chosen)
  const rows = useMemo(() => agentRowsOf(models, rates), [models, rates])
  return (
    <ModelPicker
      trigger={
        <ModelChip
          name={name}
          aria-label={`${t("model.picker.title")} ${name}`}
          mark={<LabMark maker={agentLabOf(chosen)} />}
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
