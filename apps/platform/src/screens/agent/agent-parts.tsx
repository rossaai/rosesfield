import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import type { RunApproval } from "@/api/conversation-wire"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { DraftBar } from "@/pieces/draft-bar"
import type { DraftState } from "@/pieces/use-draft"
import type { AgentModelState } from "@/screens/agent/agent-model"
import { AskSwitch } from "@/screens/agent/ask-switch"

export function NoModel(): ReactElement {
  const settings = useQuery(settingsQuery)
  const isPublic = settings.data?.mode === "public"
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t(isPublic ? "agent.noKey.title" : "agent.noModel.title")}
      body={t(isPublic ? "agent.noKey.body" : "agent.noModel.body")}
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
        <AskSwitch
          value={props.approval}
          onValueChange={props.onApprovalChange}
        />
      }
    />
  )
}
