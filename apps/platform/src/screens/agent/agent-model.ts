import { useQuery } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import type { AgentModelStatus } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"

export type AgentModelState = "unknown" | "missing" | "ready"

const missingCodes: readonly string[] = [
  "AGENT_MODEL_MISSING",
  "AGENT_MODEL_UNKNOWN",
]
const listeners = new Set<() => void>()
let state: AgentModelState = "unknown"

export function isModelMissing(error: unknown): boolean {
  return (
    error instanceof GatewayRefusedError && missingCodes.includes(error.code)
  )
}

export function noteAgentModel(next: AgentModelState): void {
  if (next === state) {
    return
  }
  state = next
  for (const listener of listeners) {
    listener()
  }
}

const fromSettings: Readonly<Record<AgentModelStatus, AgentModelState>> = {
  set: "ready",
  missing: "missing",
  unknown: "missing",
}

export function modelStateOf(
  noted: AgentModelState,
  agent: AgentModelStatus | undefined
): AgentModelState {
  if (noted !== "unknown") {
    return noted
  }
  return agent === undefined ? "unknown" : fromSettings[agent]
}

export function useAgentModel(): AgentModelState {
  const settings = useQuery(settingsQuery)
  const noted = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state
  )
  return modelStateOf(noted, settings.data?.agent)
}
