import { nameOf } from "@rosesfield/catalog/comfy"
import { Button } from "@rosesfield/ui/components/button"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import type { RunApproval } from "@/api/conversation-wire"
import { t } from "@/copy/t"
import { DraftBar } from "@/pieces/draft-bar"
import type { DraftState } from "@/pieces/use-draft"
import {
  type AgentModelState,
  useAgentModels,
  useAgentRefusal,
  useChooseAgentModel,
} from "@/screens/agent/agent-model"
import { AskSwitch } from "@/screens/agent/ask-switch"
import { ModelNotice } from "@/screens/app/hosted/model-notice"

export function NoModel(): ReactElement {
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("key.title")}
      body={t("key.sentence")}
      className="w-full max-w-prompt-max"
      actions={
        <Button render={<Link to="/settings" />} nativeButton={false}>
          {t("agent.noModel.action")}
        </Button>
      }
    />
  )
}

function ComposerSkeleton(): ReactElement {
  return (
    <Skeleton className="h-[calc(var(--spacing-field)+var(--spacing-button)+3*var(--spacing-s2))] w-full max-w-prompt-max rounded-vessel" />
  )
}

function AgentOff(): ReactElement {
  const refusal = useAgentRefusal()
  return (
    <div className="w-full max-w-prompt-max">
      {refusal === null ? <NoModel /> : <ModelNotice error={refusal} />}
    </div>
  )
}

function ModelChip(): ReactElement | null {
  const models = useAgentModels()
  const choose = useChooseAgentModel()
  const listed = models.data
  if (listed === undefined || listed.model === null) {
    return null
  }
  const chosen = (choose.isPending ? choose.variables : null) ?? listed.model
  return (
    <ChipSelect
      label={t("model.picker.title")}
      value={chosen}
      onValueChange={(model) => choose.mutate(model)}
      options={listed.models.map((model) => ({
        value: model,
        label: nameOf(model),
      }))}
      display={nameOf(chosen)}
      disabled={choose.isPending}
    />
  )
}

export function ComposerSlot({
  model,
  children,
}: {
  model: AgentModelState
  children: ReactNode
}): ReactNode {
  switch (model) {
    case "ready":
      return children
    case "missing":
      return <NoModel />
    case "off":
      return <AgentOff />
    case "unknown":
      return <ComposerSkeleton />
  }
}

type ComposerProps = {
  state: DraftState
  isAnswering: boolean
  isStarting?: boolean
  approval: RunApproval
  onApprovalChange: (approval: RunApproval) => void
  onSend: () => void
  onStop: () => void
}

export function AgentComposer(props: ComposerProps): ReactElement {
  return (
    <DraftBar
      state={props.state}
      label={t("agent.prompt.label")}
      placeholder={t("agent.prompt.placeholder")}
      submitLabel={props.isAnswering ? t("agent.stop") : t("agent.send")}
      onSubmit={props.isAnswering ? props.onStop : props.onSend}
      busy={props.isStarting === true}
      chips={
        <>
          <ModelChip />
          <AskSwitch
            value={props.approval}
            onValueChange={props.onApprovalChange}
          />
        </>
      }
    />
  )
}
