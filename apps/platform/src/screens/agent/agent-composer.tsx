import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { DraftBar } from "@/pieces/draft-bar"
import type { DraftState } from "@/pieces/use-draft"
import {
  useAgentModels,
  useChooseAgentModel,
} from "@/screens/agent/agent-model"
import { AgentModelPicker } from "@/screens/app/hosted/agent-model-picker"

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
      chips={<ModelPill />}
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
