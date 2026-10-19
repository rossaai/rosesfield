import { describe, expect, it } from "vitest"
import { defaultAgentModel, readAgentEnv } from "#agent/agent-env"
import { EnvInvalidError } from "#error/env-invalid.error"

const workersAi = "https://api.cloudflare.com/client/v4/accounts/0123abcd/ai/v1"

describe("the agent's settings", () => {
  it("read an OpenAI-compatible endpoint with its model and an optional key", () => {
    expect(
      readAgentEnv({
        AGENT_BASE_URL: "http://127.0.0.1:11434/v1",
        AGENT_MODEL: "qwen3.8:27b",
      })
    ).toEqual({
      provider: "openai-compatible",
      model: "qwen3.8:27b",
      apiKey: null,
      baseUrl: "http://127.0.0.1:11434/v1",
    })
    expect(
      readAgentEnv({
        AGENT_BASE_URL: workersAi,
        AGENT_API_KEY: "cf-token",
      })
    ).toEqual({
      provider: "openai-compatible",
      model: defaultAgentModel.workersAiModel,
      apiKey: "cf-token",
      baseUrl: workersAi,
    })
  })

  it("pick GLM-5.3-Flash for Workers AI when no model is named", () => {
    expect(defaultAgentModel.workersAiModel).toBe("@cf/zai-org/glm-5.3-flash")
    expect(
      readAgentEnv({
        AGENT_PROVIDER: "cloudflare-workers-ai",
        AGENT_API_KEY: "cf-token",
      })
    ).toMatchObject({
      provider: "cloudflare-workers-ai",
      model: "@cf/zai-org/glm-5.3-flash",
      baseUrl: null,
    })
  })

  it("give no model when nothing names one", () => {
    expect(readAgentEnv({})).toBeNull()
    expect(readAgentEnv({ AGENT_API_KEY: "  ", AGENT_MODEL: "m" })).toBeNull()
  })

  it("name the setting an endpoint or a key needs beside it", () => {
    expect(() =>
      readAgentEnv({ AGENT_BASE_URL: "http://127.0.0.1:8000/v1" })
    ).toThrow(/AGENT_MODEL is missing/)
    expect(() => readAgentEnv({ AGENT_API_KEY: "k" })).toThrow(
      /AGENT_PROVIDER is missing/
    )
    expect(() =>
      readAgentEnv({ AGENT_PROVIDER: "zai", AGENT_API_KEY: "k" })
    ).toThrow(/AGENT_MODEL is missing/)
    expect(() => readAgentEnv({ AGENT_BASE_URL: "ftp://models" })).toThrow(
      EnvInvalidError
    )
  })

  it("in public mode, reach the model only through an endpoint", () => {
    expect(
      readAgentEnv(
        { AGENT_BASE_URL: workersAi, AGENT_MODEL: "@cf/qwen/qwen3.8-27b" },
        "public"
      )
    ).toMatchObject({ apiKey: null, model: "@cf/qwen/qwen3.8-27b" })
    expect(() =>
      readAgentEnv({ AGENT_PROVIDER: "cloudflare-workers-ai" }, "public")
    ).toThrow(/AGENT_BASE_URL is missing/)
  })
})
