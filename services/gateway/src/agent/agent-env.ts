import { type AgentModel, routerAgentModel } from "@rosesfield/agent"
import { EnvInvalidError } from "#error/env-invalid.error"

export const goneAgentSettings: readonly string[] = [
  "AGENT_PROVIDER",
  "AGENT_MODEL",
  "AGENT_API_KEY",
  "AGENT_BASE_URL",
]

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function goneProblem(name: string): string {
  return `${name} is set, and the agent no longer reads it. The agent runs on a Comfy Router chat model with your Comfy key. Leave ${name} empty.`
}

export function readAgentEnv(
  source: Readonly<Record<string, unknown>>,
  mode: "owner" | "public" = "owner"
): AgentModel | null {
  const held = goneAgentSettings.filter(
    (name) => textOf(source[name]) !== null
  )
  if (held.length > 0) {
    throw new EnvInvalidError({ problems: held.map(goneProblem) })
  }
  if (mode === "public") {
    return routerAgentModel(null)
  }
  const key = textOf(source.COMFY_API_KEY)
  return key === null ? null : routerAgentModel(key)
}
