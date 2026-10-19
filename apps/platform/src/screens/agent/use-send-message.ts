import { type QueryClient, useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef } from "react"
import { type AnswerEvent, sendMessage } from "@/api/agent-wire"
import { isAbort } from "@/api/call-route"
import type { Transcript } from "@/api/conversation-wire"
import { codeOf } from "@/copy/error-words"
import type { Draft } from "@/router-context"
import { isModelMissing, noteAgentModel } from "@/screens/agent/agent-model"
import {
  conversationsQuery,
  transcriptKey,
} from "@/screens/agent/conversation-queries"
import {
  type AnswerPart,
  changeLiveTurn,
  readLiveTurn,
  setLiveTurn,
  type Turn,
} from "@/screens/agent/conversation-store"
import { messageText } from "@/screens/agent/message-text"

export type SendMessage = {
  send: (draft: Draft) => void
  retry: (turn: Turn) => void
  stop: () => void
}

function withEvent(
  parts: readonly AnswerPart[],
  event: AnswerEvent
): AnswerPart[] {
  switch (event.type) {
    case "message": {
      const known = parts.some(
        (part) => part.kind === "text" && part.index === event.index
      )
      return known
        ? parts.map((part) =>
            part.kind === "text" && part.index === event.index
              ? { ...part, text: event.text }
              : part
          )
        : [...parts, { kind: "text", index: event.index, text: event.text }]
    }
    case "run":
      return [...parts, { kind: "run", runId: event.runId }]
    case "proposal":
      return [...parts, { kind: "proposal", proposal: event.proposal }]
    default:
      return [...parts]
  }
}

function endOf(
  event: AnswerEvent
): Pick<Turn, "status" | "failureCode"> | null {
  if (event.type === "done") {
    return { status: "done", failureCode: null }
  }
  return event.type === "failed"
    ? { status: "failed", failureCode: event.error.code }
    : null
}

type StreamOptions = {
  conversationId: string
  key: string
  text: string
  signal: AbortSignal
  client: QueryClient
}

async function settle(options: StreamOptions): Promise<void> {
  const { client, conversationId, key } = options
  void client.invalidateQueries({ queryKey: conversationsQuery.queryKey })
  await client.invalidateQueries({ queryKey: transcriptKey(conversationId) })
  const turn = readLiveTurn(conversationId)
  if (turn?.key === key && turn.status === "done") {
    setLiveTurn(conversationId, null)
  }
}

async function streamAnswer(options: StreamOptions): Promise<void> {
  const { conversationId, key, client } = options
  try {
    for await (const event of sendMessage(
      conversationId,
      options.text,
      options.signal
    )) {
      noteAgentModel("ready")
      if (event.type === "run") {
        void client.invalidateQueries({ queryKey: ["runs"] })
      }
      const end = endOf(event)
      changeLiveTurn(conversationId, key, (turn) => ({
        ...turn,
        parts: withEvent(turn.parts, event),
        ...(end ?? {}),
      }))
    }
    changeLiveTurn(conversationId, key, (turn) =>
      turn.status === "answering" ? { ...turn, status: "done" } : turn
    )
    await settle(options)
  } catch (error) {
    if (isModelMissing(error)) {
      noteAgentModel("missing")
    }
    changeLiveTurn(conversationId, key, (turn) => ({
      ...turn,
      status: isAbort(error) ? "stopped" : "failed",
      failureCode: codeOf(error),
    }))
  }
}

function newTurn(draft: Draft, shownItems: number): Turn {
  return {
    key: crypto.randomUUID(),
    text: messageText(draft),
    prompt: draft.prompt.trim(),
    assetIds: draft.assetIds,
    characterIds: draft.characterIds,
    parts: [],
    status: "answering",
    failureCode: null,
    shownItems,
  }
}

export function useSendMessage(conversationId: string): SendMessage {
  const controller = useRef<AbortController | null>(null)
  const client = useQueryClient()
  const stream = useCallback(
    (turn: Turn): void => {
      const abort = new AbortController()
      controller.current = abort
      setLiveTurn(conversationId, turn)
      void streamAnswer({
        conversationId,
        key: turn.key,
        text: turn.text,
        signal: abort.signal,
        client,
      })
    },
    [conversationId, client]
  )
  const send = useCallback(
    (draft: Draft) => {
      const known = client.getQueryData<Transcript>(
        transcriptKey(conversationId)
      )
      if (readLiveTurn(conversationId) !== null) {
        void client.invalidateQueries({
          queryKey: transcriptKey(conversationId),
        })
      }
      stream(newTurn(draft, known?.items.length ?? 0))
    },
    [conversationId, client, stream]
  )
  const retry = useCallback(
    (turn: Turn) =>
      stream({ ...turn, parts: [], status: "answering", failureCode: null }),
    [stream]
  )
  return { send, retry, stop: () => controller.current?.abort() }
}
