import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import type { ReactElement } from "react"
import {
  type AgentEffort,
  type Conversation,
  type RunApproval,
  startConversation,
  type Transcript,
} from "@/api/conversation-wire"
import { useKeyReach } from "@/api/key-reach"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { useDraft } from "@/pieces/use-draft"
import type { Draft } from "@/router-context"
import { AgentComposer } from "@/screens/agent/agent-composer"
import { useShownEffort } from "@/screens/agent/agent-effort"
import { AgentFrame, ConversationsDrawer } from "@/screens/agent/agent-frame"
import {
  isModelMissing,
  noteAgentModel,
  useAgentModel,
} from "@/screens/agent/agent-model"
import { asksForKey, ComposerSlot } from "@/screens/agent/agent-parts"
import {
  conversationsQuery,
  transcriptKey,
} from "@/screens/agent/conversation-queries"
import { useRunApproval } from "@/screens/agent/run-approval"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { ScreenHeader } from "@/shell/screen-header"

type StartInput = {
  draft: Draft
  approval: RunApproval
  effort: AgentEffort | null
}

export function useStartConversation() {
  const navigate = useNavigate()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ draft, approval, effort }: StartInput) => ({
      conversation: await startConversation(approval, effort),
      draft,
    }),
    onSuccess: ({ conversation, draft }) => {
      noteAgentModel("ready")
      const empty: Transcript = { conversation, items: [] }
      client.setQueryData(transcriptKey(conversation.id), empty)
      client.setQueryData<Conversation[]>(
        conversationsQuery.queryKey,
        (list) => [conversation, ...(list ?? [])]
      )
      void navigate({
        to: "/agent/$conversationId",
        params: { conversationId: conversation.id },
        state: { draft },
      })
    },
    onError: (error) => {
      if (isModelMissing(error)) {
        noteAgentModel("missing")
      }
    },
  })
}

export function AgentStartScreen(): ReactElement {
  const state = useDraft()
  const start = useStartConversation()
  const model = useAgentModel()
  const openKey = useOpenKeyDialog()
  const reach = useKeyReach()
  const approval = useRunApproval()
  const effort = useShownEffort()?.effort ?? null
  const send = (): void => {
    if (state.draft.prompt.trim() !== "") {
      start.mutate({ draft: state.draft, approval, effort })
    }
  }
  const failed = start.error !== null && !isModelMissing(start.error)
  return (
    <AgentFrame>
      <ScreenHeader
        title={t("agent.title")}
        phoneLead={<ConversationsDrawer />}
      />
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-s5 pt-s3 pb-s4 @regular:gap-s6 @regular:pt-[calc(100dvh/6)]">
        <div
          data-slot="agent-start-heading"
          className="my-auto flex max-w-prompt-max flex-col items-center gap-s2 text-center @regular:my-0"
        >
          <h2 className="text-display">{t("agent.start.title")}</h2>
          <p className="text-body text-ink-muted">{t("agent.empty.body")}</p>
        </div>
        <div className="sticky bottom-0 order-last flex w-full flex-col items-center gap-s2 bg-canvas pt-s3 @regular:static @regular:order-none">
          {failed ? (
            <p role="alert" className="text-label text-bug-text">
              {wordsForError(start.error, { thing: "conversation" }).title}
            </p>
          ) : null}
          <ComposerSlot model={model}>
            <AgentComposer
              state={state}
              isAnswering={false}
              isStarting={start.isPending}
              onSend={asksForKey(model, reach) ? openKey : send}
              onStop={() => undefined}
            />
          </ComposerSlot>
        </div>
      </div>
    </AgentFrame>
  )
}
