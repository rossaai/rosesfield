import { afterEach, describe, expect, it } from "vitest"
import { type AgentModel, openPiModels } from "#infrastructure/pi-models"
import {
  type FakeEndpoint,
  serveChatStreams,
  textStream,
  toolCallStream,
} from "../fixtures/openai-chat-stream"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  generationFor,
  lastMessageOf,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

const modelId = "qwen3.8:27b"

let endpoint: FakeEndpoint | null = null
let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  await endpoint?.close()
  rig = null
  endpoint = null
})

function modelAt(baseUrl: string, apiKey: string | null): AgentModel {
  return { provider: "openai-compatible", model: modelId, apiKey, baseUrl }
}

describe("the agent's model behind an OpenAI-compatible endpoint", () => {
  it("drives an app tool over the chat completions wire and answers", async () => {
    endpoint = serveChatStreams([
      toolCallStream(modelId, {
        id: "call_1",
        name: "sample-image",
        arguments: { inputs: { prompt: "a red rose" } },
      }),
      textStream(modelId, "The rose is queued."),
    ])
    const generation = generationFor([imageApp()])
    const model = modelAt(endpoint.baseUrl, null)
    rig = agentFor(appToolsFor([imageApp()], generation), () =>
      openPiModels(model)
    )
    const { id } = await rig.agent.startConversation({ runApproval: "auto" })

    const events = await readAll(
      await rig.agent.send({ conversationId: id, text: "Make a red rose" })
    )

    const [runId] = generation.jobs.enqueued
    expect(events).toContainEqual({ type: "run", runId })
    expect(lastMessageOf(events)).toBe("The rose is queued.")
    expect(events.at(-1)).toEqual({ type: "done" })
    const [first, second] = endpoint.requests
    expect(first?.path).toBe("/v1/chat/completions")
    expect(first?.authorization).toBe("Bearer none")
    expect(first?.body).toMatchObject({ model: modelId, stream: true })
    expect(first?.body.max_tokens).toBe(8192)
    expect(first?.body).not.toHaveProperty("store")
    expect(JSON.stringify(first?.body.messages)).not.toContain('"developer"')
    expect(JSON.stringify(first?.body.tools)).toContain('"sample-image"')
    expect(JSON.stringify(second?.body.messages)).toContain(runId)
  })

  it("sends the key from the settings, or the key a request hands it", async () => {
    endpoint = serveChatStreams([
      textStream(modelId, "one"),
      textStream(modelId, "two"),
    ])
    const stored = await openPiModels(modelAt(endpoint.baseUrl, "sk-local"))
    let visitorKey: string | null = "sk-visitor"
    const handed = await openPiModels(modelAt(endpoint.baseUrl, null), {
      keyOf: () => visitorKey,
    })

    const storedAuth = await stored.models.getAuth("openai-compatible")
    const handedAuth = await handed.models.getAuth("openai-compatible")
    visitorKey = null
    const droppedAuth = await handed.models.getAuth("openai-compatible")

    expect(storedAuth?.auth.apiKey).toBe("sk-local")
    expect(handedAuth?.auth.apiKey).toBe("sk-visitor")
    expect(droppedAuth?.auth.apiKey).toBe("none")
  })

  it("leaves the compat flags of a Workers AI address to pi-ai's detection", async () => {
    const workersAi =
      "https://api.cloudflare.com/client/v4/accounts/0123abcd/ai/v1"
    const local = "http://127.0.0.1:11434/v1"

    const cloud = await openPiModels({
      provider: "openai-compatible",
      model: "@cf/zai-org/glm-5.3-flash",
      apiKey: "token",
      baseUrl: workersAi,
    })
    const own = await openPiModels(modelAt(local, null))

    const cloudModel = cloud.models.getModel(
      "openai-compatible",
      "@cf/zai-org/glm-5.3-flash"
    )
    expect(cloudModel).toMatchObject({
      baseUrl: workersAi,
      contextWindow: 65_536,
    })
    expect(cloudModel).not.toHaveProperty("compat")
    expect(own.models.getModel("openai-compatible", modelId)).toMatchObject({
      compat: {
        supportsDeveloperRole: false,
        supportsStore: false,
        maxTokensField: "max_tokens",
      },
    })
  })
})
