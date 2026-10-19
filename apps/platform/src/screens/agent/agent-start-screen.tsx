import { Button } from "@rosesfield/ui/components/button"
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
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import type { Draft } from "@/router-context"
import {
  isModelMissing,
  noteAgentModel,
  useAgentModel,
} from "@/screens/agent/agent-model"
import { AgentComposer, ComposerSlot } from "@/screens/agent/agent-parts"
import {
  ConversationRows,
  ConversationsButton,
  useHasConversations,
} from "@/screens/agent/conversation-list"
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

function Recent({ onAll }: { onAll: () => void }): ReactElement | null {
  const hasAny = useHasConversations()
  return (
    <section className="flex w-full max-w-prompt-max flex-col gap-s2">
      {hasAny ? (
        <div className="flex items-center justify-between gap-s2">
          <h2 className="text-title">{t("agent.recent.title")}</h2>
          <Button tone="quiet" size="small" onClick={onAll}>
            {t("agent.recent.all")}
          </Button>
        </div>
      ) : null}
      <ConversationRows limit={5} />
    </section>
  )
}

export function AgentStartScreen(): ReactElement {
  const state = useDraft()
  const start = useStartConversation()
  const model = useAgentModel()
  const [approval, setApproval] = useState<RunApproval>("ask")
  const [isListOpen, setListOpen] = useState(false)
  const isRegular = useIsRegularWindow()
  const send = (): void => {
    if (state.draft.prompt.trim() !== "") {
      start.mutate({ draft: state.draft, approval })
    }
  }
  const failed = start.error !== null && !isModelMissing(start.error)
  const listFor = (isShown: boolean): ReactElement => (
    <ConversationsButton
      open={isListOpen && isShown}
      onOpenChange={setListOpen}
    />
  )
  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader
        title={t("agent.title")}
        actions={listFor(isRegular)}
        phoneAction={listFor(!isRegular)}
      />
      <div className="flex flex-1 flex-col items-center gap-s6 px-s5 pb-s5 @regular:px-s4 @regular:pt-[calc(100dvh/6)]">
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
        <Recent onAll={() => window.setTimeout(() => setListOpen(true))} />
      </div>
    </div>
  )
}
