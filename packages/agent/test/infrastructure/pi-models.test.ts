import { getBuiltinModels } from "@earendil-works/pi-ai/providers/all"
import { describe, expect, it } from "vitest"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { openPiModels } from "#infrastructure/pi-models"

const workersAi = "cloudflare-workers-ai"
const openModel = "@cf/zai-org/glm-5.3-flash"
const processEnv = {
  CLOUDFLARE_ACCOUNT_ID: "0123abcd",
  CLOUDFLARE_API_KEY: "process-key",
}

describe("the agent's model from its settings", () => {
  it("resolves the provider's key from the settings, not from the process", async () => {
    const { models, ref } = await openPiModels({
      provider: workersAi,
      model: openModel,
      apiKey: "cf-rosesfield-test",
      baseUrl: null,
    })

    expect(ref).toEqual({ provider: workersAi, modelId: openModel })
    expect(await models.getAuth(workersAi, { env: processEnv })).toEqual({
      auth: { apiKey: "cf-rosesfield-test" },
      env: { CLOUDFLARE_ACCOUNT_ID: processEnv.CLOUDFLARE_ACCOUNT_ID },
      source: "stored credential",
    })
  })

  it("refuses a model its provider does not list", async () => {
    await expect(
      openPiModels({
        provider: workersAi,
        model: "no-such-model",
        apiKey: "cf-rosesfield-test",
        baseUrl: null,
      })
    ).rejects.toThrow(AgentModelUnknownError)
  })

  it.each(["anthropic", "openai", "google"] as const)(
    "refuses %s, a provider of closed models",
    async (provider) => {
      const model = getBuiltinModels(provider)[0]?.id

      expect(model).toBeDefined()
      await expect(
        openPiModels({
          provider,
          model: model ?? "",
          apiKey: "sk-rosesfield-test",
          baseUrl: null,
        })
      ).rejects.toThrow(AgentModelUnknownError)
    }
  )
})
