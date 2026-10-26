import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement, ReactNode } from "react"
import { type KeyReach, useKeyReach } from "@/api/key-reach"
import { t } from "@/copy/t"
import {
  type AgentModelState,
  useAgentRefusal,
} from "@/screens/agent/agent-model"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"

function AgentHasNoModel(): ReactElement {
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("agent.noModel.title")}
      className="w-full max-w-prompt-max"
    />
  )
}

export function NoModel(): ReactElement {
  const reach = useKeyReach()
  const openKey = useOpenKeyDialog()
  if (reach !== "add") {
    return <AgentHasNoModel />
  }
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("key.title")}
      body={t("key.sentence")}
      className="w-full max-w-prompt-max"
      actions={<Button onClick={openKey}>{t("key.add")}</Button>}
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

function composerShows(model: AgentModelState, reach: KeyReach): boolean {
  return model === "ready" || (model === "missing" && reach === "add")
}

export function ComposerSlot({
  model,
  children,
}: {
  model: AgentModelState
  children: ReactNode
}): ReactNode {
  const reach = useKeyReach()
  if (composerShows(model, reach)) {
    return children
  }
  switch (model) {
    case "ready":
    case "missing":
    case "off":
      return <AgentOff />
    case "unknown":
      return <ComposerSkeleton />
  }
}
