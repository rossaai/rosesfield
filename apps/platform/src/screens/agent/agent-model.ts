import type { ErrorBody } from "@rosesfield/contract"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useSyncExternalStore } from "react"
import {
  type AgentModels,
  chooseAgentModel,
  listAgentModels,
} from "@/api/agent-wire"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import type { AgentModelStatus } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"

export type AgentModelState = "unknown" | "missing" | "off" | "ready"

const missingCodes: readonly string[] = [
  "AGENT_MODEL_MISSING",
  "AGENT_MODEL_UNKNOWN",
]
const offCodes: readonly string[] = [
  "ENGINE_KEY_OUTSIDE_WORKSPACE",
  "ENGINE_NOT_ENABLED",
]
const listeners = new Set<() => void>()
let state: AgentModelState = "unknown"
let refusal: GatewayRefusedError | null = null

export const agentModelsQuery = queryOptions({
  queryKey: ["agent-models"],
  queryFn: ({ signal }) => listAgentModels(signal),
  staleTime: 60_000,
  retry: false,
})

export function isModelMissing(error: unknown): boolean {
  return (
    error instanceof GatewayRefusedError && missingCodes.includes(error.code)
  )
}

export function refusalErrorOf(body: ErrorBody): GatewayRefusedError {
  return new GatewayRefusedError({ ...body, retryAfterSeconds: null })
}

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function noteAgentModel(next: AgentModelState): void {
  if (next === state) {
    return
  }
  state = next
  emit()
}

export function isAgentOffCode(error: GatewayRefusedError): boolean {
  return offCodes.includes(error.code)
}

export function noteAgentRefusal(error: GatewayRefusedError): void {
  if (!isAgentOffCode(error)) {
    return
  }
  refusal = error
  state = "off"
  emit()
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

export function agentStateOf(
  model: AgentModelState,
  models: AgentModels | undefined
): AgentModelState {
  if (model !== "ready" || models === undefined) {
    return model
  }
  return models.refusal !== null || models.models.length === 0 ? "off" : model
}

function useNoted(): AgentModelState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state
  )
}

export function useAgentModels() {
  const model = modelStateOf(useNoted(), useQuery(settingsQuery).data?.agent)
  return useQuery({ ...agentModelsQuery, enabled: model === "ready" })
}

export function useAgentModel(): AgentModelState {
  const settings = useQuery(settingsQuery)
  const model = modelStateOf(useNoted(), settings.data?.agent)
  const models = useAgentModels()
  if (models.isError) {
    return isModelMissing(models.error) ? "missing" : model
  }
  return agentStateOf(model, models.data)
}

export function useAgentRefusal(): GatewayRefusedError | null {
  const noted = useNoted()
  const models = useAgentModels()
  const body = models.data?.refusal ?? null
  if (noted === "off" && refusal !== null) {
    return refusal
  }
  return body === null ? null : refusalErrorOf(body)
}

export function useChooseAgentModel() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (model: string) => chooseAgentModel(model),
    onSuccess: (models) =>
      client.setQueryData(agentModelsQuery.queryKey, models),
  })
}
