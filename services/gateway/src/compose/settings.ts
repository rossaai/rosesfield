import type { AgentModel } from "@rosesfield/agent"
import type { ServerReach } from "@rosesfield/catalog/effects"
import { type EngineSettings, engineAddressOf } from "#engine/engine-target"
import type { WorkerVars } from "#env"
import type { EngineStatus, Settings } from "#gateway.contract"
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

export function ownerSettings(vars: WorkerVars): Settings {
  const { engine } = vars
  const key = engine.target === "demo" ? null : engine.apiKey
  return {
    ...serverReach(vars),
    engine: engineStatus(engine, key, engine.target !== "demo"),
    agent: agentStatus(vars.agent, true),
  }
}

export function visitorSettings(vars: WorkerVars, keys: VisitorKeys): Settings {
  const { engine } = vars
  const isLive = engine.target !== "demo" && keys.engine !== null
  return {
    ...serverReach(vars),
    engine: engineStatus(engine, keys.engine, isLive),
    agent: agentStatus(vars.agent, keys.engine !== null),
  }
}
