import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { Link, useParams, useRouterState } from "@tanstack/react-router"
import { type ReactElement, useEffect, useRef, useState } from "react"
import type { Transcript } from "@/api/conversation-wire"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { useKeyReach } from "@/api/key-reach"
import { t } from "@/copy/t"
import { ScreenState } from "@/pieces/screen-state"
import { type DraftState, useDraft } from "@/pieces/use-draft"
import { AgentComposer } from "@/screens/agent/agent-composer"
import { useEffortOf } from "@/screens/agent/agent-effort"
import { AgentFrame, ConversationsDrawer } from "@/screens/agent/agent-frame"
import { isModelMissing, useAgentModel } from "@/screens/agent/agent-model"
import { asksForKey, ComposerSlot, NoModel } from "@/screens/agent/agent-parts"
import {
  type ConversationDialog,
  ConversationDialogs,
  ConversationMenu,
} from "@/screens/agent/conversation-menu"
import {
  LiveTurn,
  MessageSkeletons,
  TranscriptItems,
} from "@/screens/agent/conversation-messages"
import { transcriptQuery } from "@/screens/agent/conversation-queries"
import { useLiveTurn } from "@/screens/agent/conversation-store"
import { useRunApprovalOf } from "@/screens/agent/run-approval"
import {
  type SendMessage,
  useSendMessage,
} from "@/screens/agent/use-send-message"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { ScreenHeader } from "@/shell/screen-header"

function isGone(error: unknown): boolean {
  return error instanceof GatewayRefusedError && error.status === 404
}

function useFirstMessage(
  conversationId: string,
  isEmpty: boolean,
  send: SendMessage["send"]
): void {
  const draft = useRouterState({
    select: (state) => state.location.state.draft,
  })
  const sentFor = useRef<string | null>(null)
  useEffect(() => {
    if (
      sentFor.current === conversationId ||
      !isEmpty ||
      draft === undefined ||
      draft.prompt.trim() === ""
    ) {
      return
    }
    sentFor.current = conversationId
    send(draft)
  }, [conversationId, isEmpty, draft, send])
}

function PlainHeader(): ReactElement {
  return (
    <ScreenHeader
      title={t("agent.title")}
      phoneLead={<ConversationsDrawer />}
    />
  )
}

function MissingConversation(): ReactElement {
  return (
    <>
      <PlainHeader />
      <ScreenState
        kind="empty"
        title={t("agent.missing.title")}
        actions={
          <Button
            tone="primary"
            render={<Link to="/agent" />}
            nativeButton={false}
          >
            {t("agent.missing.action")}
          </Button>
        }
      />
    </>
  )
}

const autoTitleLength = 80

export function shownTitleOf(transcript: Transcript): string | null {
  const { title } = transcript.conversation
  const first = transcript.items.find((item) => item.type === "person")
  if (title === null || first === undefined) {
    return title
  }
  const line = first.text.trim().split("\n")[0] ?? ""
  const isCopied = title.length <= autoTitleLength && line.startsWith(title)
  return isCopied ? null : title
}

function ConversationHeader({
  transcript,
}: {
  transcript: Transcript
}): ReactElement {
  const [dialog, setDialog] = useState<ConversationDialog>(null)
  const { conversation } = transcript
  const menu = <ConversationMenu onDialogChange={setDialog} />
  return (
    <>
      <ScreenHeader
        title={shownTitleOf(transcript)}
        actions={menu}
        phoneLead={<ConversationsDrawer />}
        phoneAction={menu}
      />
      <ConversationDialogs
        conversation={conversation}
        dialog={dialog}
        onDialogChange={setDialog}
      />
    </>
  )
}

export function ConversationScreen(): ReactElement {
  const { conversationId } = useParams({
    from: "/_shell/agent/$conversationId",
  })
  const transcript = useQuery(transcriptQuery(conversationId))
  return (
    <AgentFrame>
      <ConversationBody
        conversationId={conversationId}
        transcript={transcript}
      />
    </AgentFrame>
  )
}

function ConversationBody({
  conversationId,
  transcript,
}: {
  conversationId: string
  transcript: UseQueryResult<Transcript>
}): ReactElement {
  if (transcript.isError && isGone(transcript.error)) {
    return <MissingConversation />
  }
  if (transcript.isError && isModelMissing(transcript.error)) {
    return (
      <>
        <PlainHeader />
        <div className="flex justify-center px-s5 py-s12">
          <NoModel />
        </div>
      </>
    )
  }
  if (transcript.isError) {
    return (
      <>
        <PlainHeader />
        <ScreenState
          kind="failed"
          title={t("agent.loadFailed.title")}
          actions={
            <Button onClick={() => void transcript.refetch()}>
              {t("state.tryAgain")}
            </Button>
          }
        />
      </>
    )
  }
  return (
    <KnownConversation conversationId={conversationId} data={transcript.data} />
  )
}

function ComposerDock({
  state,
  isAnswering,
  isStarting,
  onSend,
  onStop,
}: {
  state: DraftState
  isAnswering: boolean
  isStarting: boolean
  onSend: () => void
  onStop: () => void
}): ReactElement {
  const model = useAgentModel()
  const openKey = useOpenKeyDialog()
  const reach = useKeyReach()
  return (
    <div
      data-slot="agent-composer-dock"
      className="flex justify-center px-s5 pb-s4 @regular:pb-4"
    >
      <ComposerSlot model={model}>
        <AgentComposer
          state={state}
          isAnswering={isAnswering}
          isStarting={isStarting}
          onSend={asksForKey(model, reach) ? openKey : onSend}
          onStop={onStop}
        />
      </ComposerSlot>
    </div>
  )
}

function KnownConversation({
  conversationId,
  data,
}: {
  conversationId: string
  data: Transcript | undefined
}): ReactElement {
  const actions = useSendMessage(conversationId)
  const turn = useLiveTurn(conversationId)
  const state = useDraft()
  const approval = useRunApprovalOf(
    conversationId,
    data?.conversation.runApproval
  )
  useEffortOf(conversationId, data?.conversation.effort, data !== undefined)
  const isAnswering = turn?.status === "answering"
  useFirstMessage(
    conversationId,
    data !== undefined && data.items.length === 0 && turn === null,
    actions.send
  )
  const send = (): void => {
    if (state.draft.prompt.trim() !== "" && !isAnswering) {
      actions.send(state.draft)
      state.clear()
    }
  }
  const items =
    turn === null
      ? (data?.items ?? [])
      : (data?.items ?? []).slice(0, turn.shownItems)
  return (
    <>
      {data === undefined ? (
        <PlainHeader />
      ) : (
        <ConversationHeader transcript={data} />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-s5">
        <div
          data-slot="agent-messages"
          className="mx-auto flex w-full max-w-prompt-max flex-col gap-s6 px-[calc(var(--spacing-s3)+var(--spacing-s2))] py-s4"
        >
          {data === undefined ? <MessageSkeletons /> : null}
          <TranscriptItems conversationId={conversationId} items={items} />
          {turn === null ? null : (
            <LiveTurn
              conversationId={conversationId}
              turn={turn}
              onRetry={actions.retry}
            />
          )}
          {approval.isError ? (
            <StateView
              kind="failed"
              density="compact"
              title={t("agent.approval.failed")}
            />
          ) : null}
        </div>
      </div>
      <ComposerDock
        state={state}
        isAnswering={isAnswering}
        isStarting={approval.isPending}
        onSend={send}
        onStop={actions.stop}
      />
    </>
  )
}
