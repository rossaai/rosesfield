import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import {
  type AgentModelState,
  useAgentRefusal,
} from "@/screens/agent/agent-model"
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
    <Skeleton className="h-[calc(2*var(--spacing-s3)+var(--spacing-s2)+2*var(--spacing-s1_5)+var(--text-body--line-height)+var(--spacing-icon-dense))] w-full max-w-prompt-max rounded-vessel" />
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
