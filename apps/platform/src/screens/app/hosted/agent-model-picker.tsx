import { labOfModel, makerOf, nameOf } from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
  type ModelPickerTag,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import { CoinsIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { AgentModelRate } from "@/api/agent-wire"
import { formatAmount } from "@/copy/format"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { pickerFilters } from "@/screens/app/hosted/catalog-picker"

export function agentLabOf(model: string): string {
  return labOfModel(model) ?? makerOf(model.split("/")[0] ?? model)
}

export type AgentRates = Readonly<Record<string, AgentModelRate>>

function creditsText(credits: number): string {
  return formatAmount(credits >= 10 ? Math.round(credits) : credits)
}

function rateTagsOf(rate: AgentModelRate | undefined): ModelPickerTag[] {
  return rate === undefined
    ? []
    : [
        {
          label: t("agent.model.rate", {
            input: creditsText(rate.input),
            output: creditsText(rate.output),
          }),
          icon: <CoinsIcon />,
        },
      ]
}

function agentRowOf(model: string, rates: AgentRates): ModelPickerRow {
  const lab = agentLabOf(model)
  return {
    id: model,
    name: nameOf(model),
    maker: lab,
    lab,
    tags: rateTagsOf(Object.hasOwn(rates, model) ? rates[model] : undefined),
    mark: <LabMark maker={lab} />,
  }
}

export function agentPickerSections(
  models: readonly string[],
  chosen: string | null,
  rates: AgentRates = {}
): ModelPickerSection[] {
  const rows = models.map((model) => agentRowOf(model, rates))
  const featured = rows.filter((row) => row.id === chosen)
  return [
    { id: "featured", label: t("model.picker.featured"), rows: featured },
    { id: "all", label: t("model.picker.all"), rows },
  ].filter((section) => section.rows.length > 0)
}

type AgentModelPickerProps = {
  models: readonly string[]
  rates?: AgentRates
  chosen: string
  onChoose: (model: string) => void
  disabled?: boolean
  className?: string
}

export function AgentModelPicker({
  models,
  rates = {},
  chosen,
  onChoose,
  disabled = false,
  className,
}: AgentModelPickerProps): ReactElement {
  const name = nameOf(chosen)
  return (
    <ModelPicker
      filters={pickerFilters()}
      trigger={
        <ModelChip
          name={name}
          aria-label={`${t("model.picker.title")} ${name}`}
          mark={<LabMark maker={agentLabOf(chosen)} />}
          disabled={disabled}
          {...(className === undefined ? {} : { className })}
        />
      }
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={agentPickerSections(models, chosen, rates)}
      chosen={chosen}
      onChoose={onChoose}
      side="top"
    />
  )
}
