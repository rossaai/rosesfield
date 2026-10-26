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
import { useShowSettings } from "@/shell/shell-dialogs"

function AgentHasNoModel(): ReactElement {
  const showSettings = useShowSettings()
  return (
    <StateView
      kind="empty"
      density="compact"
      title={t("agent.noModel.title")}
      className="w-full max-w-prompt-max"
      actions={
        <Button onClick={() => showSettings("agent")}>
          {t("agent.noModel.action")}
        </Button>
      }
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
    <Skeleton className="h-[calc(2*var(--spacing-s3)+var(--spacing)*20)] w-full max-w-prompt-max rounded-vessel" />
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

export function asksForKey(model: AgentModelState, reach: KeyReach): boolean {
  return model === "missing" && reach === "add"
}

function composerShows(model: AgentModelState, reach: KeyReach): boolean {
  return model === "ready" || asksForKey(model, reach)
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
