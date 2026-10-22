import {
  labOfModel,
  lineKeyOf,
  makerOf,
  nameOf,
} from "@rosesfield/catalog/comfy"
import {
  ModelPicker,
  type ModelPickerRow,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import { ModelChip } from "@rosesfield/ui/components/model-trigger"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { modelLineOf } from "@/screens/app/hosted/catalog-picker"

export function agentLabOf(model: string): string {
  return labOfModel(model) ?? makerOf(model.split("/")[0] ?? model)
}

function agentRowOf(model: string): ModelPickerRow {
  const lab = agentLabOf(model)
  return {
    id: model,
    name: nameOf(model),
    maker: lab,
    lab,
    line: modelLineOf(lineKeyOf(model), lab),
    tags: [],
    mark: <LabMark maker={lab} />,
  }
}

export function agentPickerSections(
  models: readonly string[],
  chosen: string | null
): ModelPickerSection[] {
  const rows = models.map(agentRowOf)
  const featured = rows.filter((row) => row.id === chosen)
  return [
    { id: "featured", label: t("model.picker.featured"), rows: featured },
    { id: "all", label: t("model.picker.all"), rows },
  ].filter((section) => section.rows.length > 0)
}

type AgentModelPickerProps = {
  models: readonly string[]
  chosen: string
  onChoose: (model: string) => void
  disabled?: boolean
  className?: string
}

export function AgentModelPicker({
  models,
  chosen,
  onChoose,
  disabled = false,
  className,
}: AgentModelPickerProps): ReactElement {
  const name = nameOf(chosen)
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
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={agentPickerSections(models, chosen)}
      chosen={chosen}
      onChoose={onChoose}
      side="top"
    />
  )
}
