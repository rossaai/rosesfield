import type { UseMutationResult } from "@tanstack/react-query"
import { useEffect, useRef, useSyncExternalStore } from "react"
import type {
  Conversation,
  ConversationChanges,
  RunApproval,
} from "@/api/conversation-wire"
import { useUpdateConversation } from "@/screens/agent/conversation-queries"

const storageKey = "rosesfield.agent.runApproval"
const listeners = new Set<() => void>()

export function readRunApproval(): RunApproval {
  try {
    return window.localStorage.getItem(storageKey) === "auto" ? "auto" : "ask"
  } catch {
    return "ask"
  }
}

export function keepRunApproval(next: RunApproval): void {
  try {
    window.localStorage.setItem(storageKey, next)
  } catch {
    return
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

export function useRunApproval(): RunApproval {
  return useSyncExternalStore(subscribe, readRunApproval, readRunApproval)
}

export function useRunApprovalOf(
  conversationId: string,
  held: RunApproval | undefined
): UseMutationResult<Conversation, Error, ConversationChanges> {
  const choice = useRunApproval()
  const update = useUpdateConversation(conversationId)
  const { mutate } = update
  const tried = useRef<string | null>(null)
  useEffect(() => {
    if (held === undefined) {
      return
    }
    if (held === choice) {
      tried.current = null
      return
    }
    const attempt = `${conversationId}:${choice}`
    if (tried.current === attempt) {
      return
    }
    tried.current = attempt
    mutate({ runApproval: choice })
  }, [conversationId, held, choice, mutate])
  return update
}
