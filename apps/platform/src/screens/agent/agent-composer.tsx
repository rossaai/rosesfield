import { autoRunLimitCredits } from "@rosesfield/catalog/comfy"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { cn } from "@rosesfield/ui/lib/cn"
import { GaugeIcon, SparklesIcon, UserCheckIcon } from "lucide-react"
import type { ReactElement } from "react"
import type { AgentEffort, RunApproval } from "@/api/conversation-wire"
import { formatAmount, formatEstimate } from "@/copy/format"
import { t } from "@/copy/t"
import { DraftBar } from "@/pieces/draft-bar"
import type { DraftState } from "@/pieces/use-draft"
import { keepEffort, useShownEffort } from "@/screens/agent/agent-effort"
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

const effortWords = {
  max: "agent.effort.max",
  xhigh: "agent.effort.xhigh",
  high: "agent.effort.high",
  medium: "agent.effort.medium",
  low: "agent.effort.low",
  minimal: "agent.effort.minimal",
  none: "agent.effort.none",
} as const satisfies Record<AgentEffort, string>

function EffortChip(): ReactElement | null {
  const shown = useShownEffort()
  if (shown === null) {
    return null
  }
  const { model, detail, effort } = shown
  const options = detail.efforts.map((one) => ({
    value: one.effort,
    label: t(effortWords[one.effort]),
    icon: null,
    description: t("run.price.estimated", {
      amount: formatEstimate(one.turn),
    }),
  }))
  return (
    <ChipSelect
      label={t("agent.effort.label")}
      icon={<GaugeIcon aria-hidden="true" />}
      value={effort}
      display={t(effortWords[effort])}
      onValueChange={(next) => keepEffort(model, next)}
      options={options}
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
      details={listed.details}
      recent={listed.recent}
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
          <EffortChip />
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
