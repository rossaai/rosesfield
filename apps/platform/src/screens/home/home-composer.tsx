import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, useState } from "react"
import { appName, hasPrompt } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { DraftBar } from "@/pieces/draft-bar"
import { useDraft } from "@/pieces/use-draft"
import { useAgentModel } from "@/screens/agent/agent-model"
import { useStartConversation } from "@/screens/agent/agent-start-screen"

const agentTarget = "agent"
const appTarget = "image"

const targets = [
  { value: agentTarget, label: t("home.target.agent") },
  ...catalogApps
    .filter(hasPrompt)
    .map((app) => ({ value: app.id, label: appName(app) })),
]

export function HomeComposer({
  className,
}: {
  className?: string
}): ReactElement {
  const state = useDraft()
  const model = useAgentModel()
  const [chosen, setTarget] = useState<string | null>(null)
  const fallback =
    model === "missing"
      ? (targets.find((one) => one.value === appTarget) ?? targets[1])?.value
      : agentTarget
  const target = chosen ?? fallback ?? agentTarget
  const navigate = useNavigate()
  const start = useStartConversation()
  const send = (): void => {
    const { draft } = state
    if (draft.prompt.trim() === "" && draft.assetIds.length === 0) {
      return
    }
    if (target === agentTarget) {
      if (draft.prompt.trim() !== "") {
        start.mutate(
          { draft, approval: "ask" },
          { onError: () => void navigate({ to: "/agent" }) }
        )
      }
      return
    }
    void navigate({
      to: "/apps/$appId",
      params: { appId: target },
      state: { draft },
    })
  }
  return (
    <DraftBar
      state={state}
      label={t("home.prompt.label")}
      placeholder={t("home.prompt.placeholder")}
      submitLabel={t("home.send")}
      onSubmit={send}
      busy={start.isPending}
      chips={
        <ChipSelect
          label={t("home.target.label")}
          value={target}
          onValueChange={setTarget}
          options={targets}
        />
      }
      {...(className === undefined ? {} : { className })}
    />
  )
}
