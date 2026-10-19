import { callPathFor, fieldOf, oneOf } from "@/api/call-path"

export type AgentModelStatus = "set" | "missing" | "unknown"

export type EngineTarget =
  | "comfy-cloud"
  | "comfy-deployment"
  | "comfyui"
  | "runpod-pod"
  | "modal"
  | "runpod-serverless"
  | "demo"

export type ServerMode = "owner" | "public"

export type GatewaySettings = {
  mode: ServerMode
  engine: {
    target: EngineTarget
    address: string | null
    key: "set" | "missing"
    origin: "live" | "demo"
  }
  lock: "local" | "token" | "none"
  agent: AgentModelStatus
  agentModel: string | null
  retentionDays: number | null
}

export const engineTargets: readonly EngineTarget[] = [
  "comfy-cloud",
  "comfy-deployment",
  "comfyui",
  "runpod-pod",
  "modal",
  "runpod-serverless",
  "demo",
]

export const settingsPath = "/api/settings"

function addressOf(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  return typeof value === "string" ? value : undefined
}

function agentModelOf(agent: unknown): string | null {
  const models = fieldOf(agent, "models")
  const first: unknown = Array.isArray(models) ? models[0] : undefined
  const id = fieldOf(first, "id")
  return typeof id === "string" && id !== "" ? id : null
}

function retentionOf(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null
}

export function readSettings(body: unknown): GatewaySettings | null {
  const settings = fieldOf(body, "settings")
  const engine = fieldOf(settings, "engine")
  const mode = oneOf(fieldOf(settings, "mode"), ["owner", "public"])
  const target = oneOf(fieldOf(engine, "target"), engineTargets)
  const address = addressOf(fieldOf(engine, "address"))
  const key = oneOf(fieldOf(engine, "key"), ["set", "missing"])
  const origin = oneOf(fieldOf(engine, "origin"), ["live", "demo"])
  const lock = oneOf(fieldOf(settings, "lock"), ["local", "token", "none"])
  const agent = fieldOf(settings, "agent")
  const model = oneOf(fieldOf(agent, "model"), ["set", "missing"])
  if (
    mode === null ||
    target === null ||
    address === undefined ||
    key === null ||
    origin === null ||
    lock === null
  ) {
    return null
  }
  return {
    mode,
    engine: { target, address, key, origin },
    lock,
    agent: model ?? "unknown",
    agentModel: model === "set" ? agentModelOf(agent) : null,
    retentionDays: retentionOf(fieldOf(settings, "retentionDays")),
  }
}

export function fetchSettings(signal?: AbortSignal): Promise<GatewaySettings> {
  return callPathFor(
    { method: "GET", path: settingsPath, signal },
    readSettings
  )
}
