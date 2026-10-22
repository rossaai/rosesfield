import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, useState } from "react"
import {
  type Conversation,
  type RunApproval,
  startConversation,
  type Transcript,
} from "@/api/conversation-wire"
import { wordsForError } from "@/copy/error-words"
import { t } from "@/copy/t"
import { useDraft } from "@/pieces/use-draft"
import type { Draft } from "@/router-context"
import { AgentComposer } from "@/screens/agent/agent-composer"
import { AgentFrame, ConversationsDrawer } from "@/screens/agent/agent-frame"
import {
  isModelMissing,
  noteAgentModel,
  useAgentModel,
} from "@/screens/agent/agent-model"
import { ComposerSlot } from "@/screens/agent/agent-parts"
import {
  conversationsQuery,
  transcriptKey,
} from "@/screens/agent/conversation-queries"
import { ScreenHeader } from "@/shell/screen-header"

type StartInput = { draft: Draft; approval: RunApproval }

export function useStartConversation() {
  const navigate = useNavigate()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ draft, approval }: StartInput) => ({
      conversation: await startConversation(approval),
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
  const [approval, setApproval] = useState<RunApproval>("ask")
  const send = (): void => {
    if (state.draft.prompt.trim() !== "") {
      start.mutate({ draft: state.draft, approval })
    }
  }
  const failed = start.error !== null && !isModelMissing(start.error)
  return (
    <AgentFrame>
      <ScreenHeader
        title={t("agent.title")}
        phoneAction={<ConversationsDrawer />}
      />
      <div className="flex min-h-0 flex-1 flex-col items-center gap-s6 overflow-y-auto px-s5 pb-s4 @regular:pt-[calc(100dvh/6)]">
        <div className="flex max-w-prompt-max flex-col items-center gap-s2 pt-s12 text-center @regular:pt-0">
          <h2 className="text-display">{t("agent.start.title")}</h2>
          <p className="text-body text-ink-muted">{t("agent.empty.body")}</p>
        </div>
        <div className="sticky bottom-0 order-last mt-auto flex w-full flex-col items-center gap-s2 bg-canvas pt-s3 @regular:static @regular:order-none @regular:mt-0">
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
              approval={approval}
              onApprovalChange={setApproval}
              onSend={send}
              onStop={() => undefined}
            />
          </ComposerSlot>
        </div>
      </div>
    </AgentFrame>
  )
}
