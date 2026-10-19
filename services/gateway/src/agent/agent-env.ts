import type { AgentModel } from "@rosesfield/agent"
import { z } from "zod"
import { EnvInvalidError } from "#error/env-invalid.error"

export const defaultAgentModel = {
  provider: "cloudflare-workers-ai",
  workersAiModel: "@cf/zai-org/glm-5.3-flash",
  endpointProvider: "openai-compatible",
  workersAiHost: "api.cloudflare.com",
}

const setting = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().optional()
)

const agentSchema = z.object({
  AGENT_PROVIDER: setting,
  AGENT_MODEL: setting,
  AGENT_API_KEY: setting,
  AGENT_BASE_URL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .url({ protocol: /^https?$/, error: "needs an http or https URL" })
      .optional()
  ),
})

type AgentEnv = z.infer<typeof agentSchema>

function problem(text: string): EnvInvalidError {
  return new EnvInvalidError({ problems: [text] })
}

function isWorkersAi(baseUrl: string): boolean {
  return new URL(baseUrl).hostname === defaultAgentModel.workersAiHost
}

function endpointModel(env: AgentEnv, baseUrl: string): AgentModel {
  const model =
    env.AGENT_MODEL ??
    (isWorkersAi(baseUrl) ? defaultAgentModel.workersAiModel : undefined)
  if (model === undefined) {
    throw problem(
      "AGENT_MODEL is missing. AGENT_BASE_URL is set, so the agent needs the id its server serves the model under."
    )
  }
  return {
    provider: env.AGENT_PROVIDER ?? defaultAgentModel.endpointProvider,
    model,
    apiKey: env.AGENT_API_KEY ?? null,
    baseUrl,
  }
}

function providerModel(env: AgentEnv, apiKey: string): AgentModel {
  const provider = env.AGENT_PROVIDER
  if (provider === undefined) {
    throw problem(
      "AGENT_PROVIDER is missing. AGENT_API_KEY is set, so the agent needs AGENT_BASE_URL for an OpenAI-compatible server, or AGENT_PROVIDER set to cloudflare-workers-ai for Workers AI."
    )
  }
  const model =
    env.AGENT_MODEL ??
    (provider === defaultAgentModel.provider
      ? defaultAgentModel.workersAiModel
      : undefined)
  if (model === undefined) {
    throw problem(
      `AGENT_MODEL is missing. AGENT_PROVIDER is ${provider}, so the agent needs one of its models.`
    )
  }
  return { provider, model, apiKey, baseUrl: null }
}

export function readAgentEnv(
  source: Readonly<Record<string, unknown>>,
  mode: "owner" | "public" = "owner"
): AgentModel | null {
  const result = agentSchema.safeParse(source)
  if (!result.success) {
    throw new EnvInvalidError({
      problems: result.error.issues.map(
        (issue) => `${issue.path.join(".")} ${issue.message}.`
      ),
    })
  }
  const env = result.data
  if (env.AGENT_BASE_URL !== undefined) {
    return endpointModel(env, env.AGENT_BASE_URL)
  }
  if (mode === "public" && env.AGENT_PROVIDER !== undefined) {
    throw problem(
      "AGENT_BASE_URL is missing. In public mode each visitor brings the model key, so the agent reaches its model only through AGENT_BASE_URL."
    )
  }
  return env.AGENT_API_KEY === undefined
    ? null
    : providerModel(env, env.AGENT_API_KEY)
}
