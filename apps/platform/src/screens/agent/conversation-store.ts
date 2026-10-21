import { useSyncExternalStore } from "react"
import type { Proposal } from "@/api/conversation-wire"

export type AnswerPart =
  | { kind: "text"; index: number; text: string }
  | { kind: "run"; runId: string }
  | { kind: "proposal"; proposal: Proposal }

export type Turn = {
  key: string
  text: string
  prompt: string
  assetIds: string[]
  characterIds: string[]
  parts: AnswerPart[]
  status: "answering" | "done" | "failed" | "stopped"
  failureCode: string | null
  credits: number | null
  shownItems: number
}

const liveTurns = new Map<string, Turn>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function readLiveTurn(conversationId: string): Turn | null {
  return liveTurns.get(conversationId) ?? null
}

export function setLiveTurn(conversationId: string, turn: Turn | null): void {
  if (turn === null) {
    liveTurns.delete(conversationId)
  } else {
    liveTurns.set(conversationId, turn)
  }
  emit()
}

export function changeLiveTurn(
  conversationId: string,
  key: string,
  change: (turn: Turn) => Turn
): void {
  const turn = liveTurns.get(conversationId)
  if (turn !== undefined && turn.key === key) {
    setLiveTurn(conversationId, change(turn))
  }
}

export function withProposal(
  parts: readonly AnswerPart[],
  proposal: Proposal
): AnswerPart[] {
  return parts.map((part) =>
    part.kind === "proposal" && part.proposal.id === proposal.id
      ? { kind: "proposal", proposal }
      : part
  )
}

export function noteProposal(conversationId: string, proposal: Proposal): void {
  const turn = liveTurns.get(conversationId)
  if (turn !== undefined) {
    setLiveTurn(conversationId, {
      ...turn,
      parts: withProposal(turn.parts, proposal),
    })
  }
}

export function useLiveTurn(conversationId: string): Turn | null {
  return useSyncExternalStore(subscribe, () => readLiveTurn(conversationId))
}
