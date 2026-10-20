import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams, useRouterState } from "@tanstack/react-router"
import { type ReactElement, useEffect, useRef, useState } from "react"
import type { Transcript } from "@/api/conversation-wire"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { t } from "@/copy/t"
import { ScreenState } from "@/pieces/screen-state"
import { useDraft } from "@/pieces/use-draft"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { isModelMissing, useAgentModel } from "@/screens/agent/agent-model"
import {
  AgentComposer,
  ComposerSlot,
  NoModel,
} from "@/screens/agent/agent-parts"
import { ConversationsButton } from "@/screens/agent/conversation-list"
import {
  ConversationActions,
  type ConversationDialog,
  ConversationDialogs,
  ConversationMenu,
} from "@/screens/agent/conversation-menu"
import {
  LiveTurn,
  MessageSkeletons,
  TranscriptItems,
} from "@/screens/agent/conversation-messages"
import {
  transcriptQuery,
  useUpdateConversation,
} from "@/screens/agent/conversation-queries"
import { useLiveTurn } from "@/screens/agent/conversation-store"
import {
  type SendMessage,
  useSendMessage,
} from "@/screens/agent/use-send-message"
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
  const list = <ConversationsButton />
  return (
    <ScreenHeader title={t("agent.title")} actions={list} phoneAction={list} />
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

function ConversationHeader({
  transcript,
}: {
  transcript: Transcript
}): ReactElement {
  const [dialog, setDialog] = useState<ConversationDialog>(null)
  const isRegular = useIsRegularWindow()
  const { conversation } = transcript
  return (
    <>
      <ScreenHeader
        title={conversation.title ?? t("agent.untitled")}
        actions={
          <>
            <ConversationsButton />
            <ConversationMenu onDialogChange={setDialog} />
          </>
        }
        phoneAction={
          <ConversationsButton
            {...(isRegular
              ? {}
              : { foot: <ConversationActions onDialogChange={setDialog} /> })}
          />
        }
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
  const model = useAgentModel()
  const approval = useUpdateConversation(conversationId)
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
  const pending = approval.isPending ? approval.variables?.runApproval : null
  const runApproval = pending ?? data?.conversation.runApproval ?? "ask"
  return (
    <div className="flex h-full min-h-0 flex-col">
      {data === undefined ? (
        <PlainHeader />
      ) : (
        <ConversationHeader transcript={data} />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-s5">
        <div className="mx-auto flex w-full max-w-prompt-max flex-col gap-s6 py-s4">
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
      <div className="flex justify-center px-s5 pb-s4">
        <ComposerSlot model={model}>
          <AgentComposer
            state={state}
            isAnswering={isAnswering}
            approval={runApproval}
            onApprovalChange={(next) => approval.mutate({ runApproval: next })}
            onSend={send}
            onStop={actions.stop}
          />
        </ComposerSlot>
      </div>
    </div>
  )
}
