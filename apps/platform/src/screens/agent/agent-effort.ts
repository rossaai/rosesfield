import type { UseMutationResult } from "@tanstack/react-query"
import { useEffect, useRef, useSyncExternalStore } from "react"
import type { AgentModelDetail } from "@/api/agent-wire"
import {
  type AgentEffort,
  agentEfforts,
  type Conversation,
  type ConversationChanges,
} from "@/api/conversation-wire"
import { useAgentModels } from "@/screens/agent/agent-model"
import { useUpdateConversation } from "@/screens/agent/conversation-queries"

export type KeptEfforts = Readonly<Record<string, AgentEffort>>

const storageKey = "rosesfield.agent.effort"
const listeners = new Set<() => void>()
const none: KeptEfforts = {}
let unstored: KeptEfforts = none
let read: { raw: string | null; kept: KeptEfforts } = { raw: null, kept: none }

function isEffort(value: unknown): value is AgentEffort {
  return agentEfforts.some((effort) => effort === value)
}

function keptOf(raw: string | null): KeptEfforts {
  if (raw === null) {
    return none
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) {
      return none
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, AgentEffort] =>
        isEffort(entry[1])
      )
    )
  } catch {
    return none
  }
}

/** Reads the effort you chose for each model, kept in this browser. */
export function readKeptEfforts(): KeptEfforts {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw !== read.raw) {
      read = { raw, kept: keptOf(raw) }
    }
    return read.kept
  } catch {
    return unstored
  }
}

export function keepEffort(model: string, effort: AgentEffort): void {
  const kept = { ...readKeptEfforts(), [model]: effort }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(kept))
  } catch {
    unstored = kept
  }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useKeptEfforts(): KeptEfforts {
  return useSyncExternalStore(subscribe, readKeptEfforts, readKeptEfforts)
}

export function hasEffortChoice(detail: AgentModelDetail): boolean {
  return detail.efforts.length > 1
}

/** The effort a model's turn runs at: the one you kept for the model when it offers it, else the effort it opens on, and none for a model with no effort to choose. */
export function effortOf(
  model: string,
  detail: AgentModelDetail,
  kept: KeptEfforts
): AgentEffort | null {
  if (!hasEffortChoice(detail)) {
    return null
  }
  const chosen = Object.hasOwn(kept, model) ? kept[model] : undefined
  return chosen !== undefined && detail.efforts.includes(chosen)
    ? chosen
    : detail.effort
}

export type ShownEffort = {
  model: string
  detail: AgentModelDetail
  effort: AgentEffort
}

/** The agent's model as the composer shows it, with the effort its next turn runs at, or null for a model with no effort to choose. */
export function useShownEffort(): ShownEffort | null {
  const listed = useAgentModels().data
  const kept = useKeptEfforts()
  const model = listed?.model ?? null
  const detail =
    model === null ||
    listed === undefined ||
    !Object.hasOwn(listed.details, model)
      ? undefined
      : listed.details[model]
  const effort =
    model === null || detail === undefined
      ? null
      : effortOf(model, detail, kept)
  return model === null || detail === undefined || effort === null
    ? null
    : { model, detail, effort }
}

/** Keeps a conversation's effort the one the composer shows, so its next turn asks the model for it. */
export function useEffortOf(
  conversationId: string,
  held: AgentEffort | undefined,
  isHeld: boolean
): UseMutationResult<Conversation, Error, ConversationChanges> {
  const shown = useShownEffort()?.effort ?? null
  const update = useUpdateConversation(conversationId)
  const { mutate } = update
  const tried = useRef<string | null>(null)
  useEffect(() => {
    if (!isHeld || shown === null) {
      return
    }
    if (held === shown) {
      tried.current = null
      return
    }
    const attempt = `${conversationId}:${shown}`
    if (tried.current === attempt) {
      return
    }
    tried.current = attempt
    mutate({ effort: shown })
  }, [conversationId, held, shown, isHeld, mutate])
  return update
}
