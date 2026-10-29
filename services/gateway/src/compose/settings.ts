import type { AgentModel } from "@rosesfield/agent"
import type { ServerReach } from "@rosesfield/catalog/motion"
import { type EngineSettings, engineAddressOf } from "#engine/engine-target"
import type { WorkerVars } from "#env"
import type { EngineStatus, ServedPlace, Settings } from "#gateway.contract"
import type { VisitorKeys } from "#session/visitor-keys"

function engineStatus(
  engine: EngineSettings,
  key: string | null,
  isLive: boolean
): EngineStatus {
  return {
    target: engine.target,
    address: engineAddressOf(engine),
    key: key === null ? "missing" : "set",
    origin: isLive ? "live" : "demo",
  }
}

function agentStatus(
  model: AgentModel | null,
  isReady: boolean
): Settings["agent"] {
  return model === null || !isReady
    ? { model: "missing", models: [] }
    : { model: "set", models: [{ provider: model.provider, id: model.model }] }
}

export function serverReach(vars: WorkerVars): ServerReach {
  const { access } = vars
  return access.mode === "owner"
    ? { mode: "owner", lock: access.lock.mode }
    : { mode: "public", lock: "none" }
}

export function canPasteKey(vars: WorkerVars): boolean {
  const { access } = vars
  return (
    access.mode === "public" ||
    (access.lock.mode === "local" && vars.engine.target === "demo")
  )
}

export function ownerSettings(vars: WorkerVars, place: ServedPlace): Settings {
  const { engine } = vars
  const key = engine.target === "demo" ? null : engine.apiKey
  return {
    ...serverReach(vars),
    place,
    keyFrom: canPasteKey(vars) ? "settings" : "server",
    engine: engineStatus(engine, key, engine.target !== "demo"),
    agent: agentStatus(vars.agent, true),
  }
}

export function visitorSettings(
  vars: WorkerVars,
  keys: VisitorKeys,
  place: ServedPlace
): Settings {
  const { engine } = vars
  const isLive = engine.target !== "demo" && keys.engine !== null
  return {
    ...serverReach(vars),
    place,
    keyFrom: "settings",
    engine: engineStatus(engine, keys.engine, isLive),
    agent: agentStatus(vars.agent, keys.engine !== null),
  }
}
