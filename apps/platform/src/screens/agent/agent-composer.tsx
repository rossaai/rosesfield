import { autoRunLimitCredits } from "@rosesfield/catalog/comfy"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { cn } from "@rosesfield/ui/lib/cn"
import { SparklesIcon, UserCheckIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { RunApproval } from "@/api/conversation-wire"
import { formatAmount } from "@/copy/format"
import { t } from "@/copy/t"
import { DraftBar } from "@/pieces/draft-bar"
import type { DraftState } from "@/pieces/use-draft"
import {
  useAgentModels,
  useChooseAgentModel,
} from "@/screens/agent/agent-model"
import { keepRunApproval, useRunApproval } from "@/screens/agent/run-approval"
import { AgentModelPicker } from "@/screens/app/hosted/agent-model-picker"

type RunMode = {
  value: RunApproval
  label: string
  description: string
  icon: ReactElement
}

function runModesOf(): readonly [RunMode, RunMode] {
  return [
    {
      value: "auto",
      label: t("agent.mode.auto"),
      description: t("agent.mode.auto.description", {
        credits: formatAmount(autoRunLimitCredits),
      }),
      icon: <SparklesIcon aria-hidden="true" />,
    },
    {
      value: "ask",
      label: t("agent.mode.manual"),
      description: t("agent.mode.manual.description"),
      icon: <UserCheckIcon aria-hidden="true" />,
    },
  ]
}

function RunModeChip(): ReactElement {
  const approval = useRunApproval()
  const modes = runModesOf()
  const chosen = modes.find((mode) => mode.value === approval) ?? modes[0]
  return (
    <ChipSelect
      label={t("agent.mode.label")}
      icon={chosen.icon}
      value={chosen.value}
      display={chosen.label}
      onValueChange={keepRunApproval}
      options={modes}
    />
  )
}

function ModelPill(): ReactElement | null {
  const models = useAgentModels()
  const choose = useChooseAgentModel()
  const listed = models.data
  if (listed === undefined || listed.model === null) {
    return null
  }
  return (
    <AgentModelPicker
      models={listed.models}
      rates={listed.rates}
      chosen={(choose.isPending ? choose.variables : null) ?? listed.model}
      onChoose={(model) => choose.mutate(model)}
      disabled={choose.isPending}
    />
  )
}

type AgentComposerProps = {
  state: DraftState
  isAnswering: boolean
  isStarting?: boolean
  onSend: () => void
  onStop: () => void
  className?: string
}

export function AgentComposer(props: AgentComposerProps): ReactElement {
  const { state } = props
  const send = (): void => {
    if (state.draft.prompt.trim() !== "") {
      props.onSend()
    }
  }
  return (
    <DraftBar
      state={state}
      label={t("agent.prompt.label")}
      placeholder={t("agent.prompt.placeholder")}
      submitLabel={t("agent.send")}
      onSubmit={send}
      chips={
        <>
          <ModelPill />
          <RunModeChip />
        </>
      }
      busy={props.isStarting === true}
      stop={
        props.isAnswering
          ? { label: t("agent.stop"), onStop: props.onStop }
          : undefined
      }
      className={cn("max-w-prompt-max", props.className)}
    />
  )
}
