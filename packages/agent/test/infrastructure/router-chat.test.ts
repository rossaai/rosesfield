import { afterEach, describe, expect, it } from "vitest"
import { AgentModelUnknownError } from "#domain/error/agent-model-unknown.error"
import { openPiModels, routerAgentModel } from "#infrastructure/pi-models"
import {
  idempotencyKeyOf,
  routerChatUrl,
} from "#infrastructure/router-chat-fetch"
import {
  defaultChatModel,
  routerChat,
  routerChatModels,
} from "#infrastructure/router-chat-models"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import {
  type RouterAnswer,
  type RouterReplay,
  refusedAnswer,
  replayRouter,
  textAnswer,
  toolCallAnswer,
} from "../fixtures/router-chat-answers"
import {
  type AgentRig,
  agentFor,
  allToolsFor,
  type Generation,
  generationFor,
  lastMessageOf,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

const comfyKey = "comfyui-rosesfield-test"
const creditsPerUsd = 211

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

type Opened = {
  rig: AgentRig
  replay: RouterReplay
  generation: Generation
}

function openRouterAgent(
  answers: readonly RouterAnswer[],
  key: string | null = comfyKey
): Opened {
  const replay = replayRouter(answers)
  const generation = generationFor([imageApp()])
  const tools = allToolsFor([imageApp()], generation, {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
  })
  rig = agentFor(tools, () =>
    openPiModels(routerAgentModel(key), { fetch: replay.fetch })
  )
  return { rig, replay, generation }
}

async function ask(opened: Opened, text: string, approval: "ask" | "auto") {
  const { agent } = opened.rig
  const { id } = await agent.startConversation({ runApproval: approval })
  const events = await readAll(await agent.send({ conversationId: id, text }))
  return { id, events }
}

describe("the agent on a Comfy Router chat model", () => {
  it("answers in words with only a Comfy key, on the cheapest model", async () => {
    const opened = openRouterAgent([
      textAnswer(defaultChatModel, "Ask me for an image or a video.", 0.0004),
    ])

    const { events } = await ask(opened, "What can you do?", "ask")

    expect(lastMessageOf(events)).toBe("Ask me for an image or a video.")
    expect(events.at(-1)).toEqual({
      type: "done",
      credits: 0.0004 * creditsPerUsd,
    })
    const [sent] = opened.replay.requests
    expect(sent?.url).toBe(routerChatUrl())
    expect(sent?.url).toContain(`/v2/models/${routerChat.route}`)
    expect(sent?.headers.get("x-api-key")).toBe(comfyKey)
    expect(sent?.headers.get("idempotency-key")).toMatch(/^agent-[0-9a-f]{64}$/)
    expect(sent?.body.model).toBe(defaultChatModel)
    expect(sent?.body).not.toHaveProperty("stream")
    expect(sent?.body).not.toHaveProperty("stream_options")
    expect(JSON.stringify(sent?.body.tools)).toContain('"sample-image"')
    expect(JSON.stringify(sent?.body.tools)).toContain('"read_run"')
  })

  it("starts the run the model asks for and counts both answers in the turn's credits", async () => {
    const opened = openRouterAgent([
      toolCallAnswer(
        defaultChatModel,
        {
          id: "call_1",
          name: "sample-image",
          arguments: { inputs: { prompt: "a red rose" } },
        },
        0.0003
      ),
      textAnswer(defaultChatModel, "The rose is queued.", 0.0002),
    ])

    const { id, events } = await ask(opened, "Make a red rose", "auto")

    const [runId] = opened.generation.jobs.enqueued
    expect(events).toContainEqual({ type: "run", runId })
    expect(lastMessageOf(events)).toBe("The rose is queued.")
    const credits = (0.0003 + 0.0002) * creditsPerUsd
    expect(events.at(-1)).toMatchObject({ type: "done" })
    const done = events.at(-1)
    expect(done?.type === "done" ? done.credits : null).toBeCloseTo(credits)
    const [, second] = opened.replay.requests
    expect(JSON.stringify(second?.body.messages)).toContain(runId)
    const read = await opened.rig.agent.readConversation(id)
    const last = read.items.at(-1)
    expect(last?.type).toBe("credits")
    expect(last?.type === "credits" ? last.credits : null).toBeCloseTo(credits)
  })

  it("proposes the run under ask and starts none", async () => {
    const opened = openRouterAgent([
      toolCallAnswer(
        defaultChatModel,
        {
          id: "call_1",
          name: "sample-image",
          arguments: { inputs: { prompt: "a red rose" } },
        },
        0.0003
      ),
    ])

    const { events } = await ask(opened, "Make a red rose", "ask")

    const proposed = events.find((event) => event.type === "proposal")
    const appId = proposed?.type === "proposal" ? proposed.proposal.appId : null
    expect(appId).toBe("sample-image")
    expect(opened.generation.runs.count).toBe(0)
    expect(opened.replay.requests).toHaveLength(1)
  })

  it("shows the catalog's code when the Router has not turned the key on", async () => {
    const off = openRouterAgent([
      refusedAnswer(403, "not_enabled", "Router is not enabled for this key"),
    ])
    const { events } = await ask(off, "Hi", "ask")
    expect(events.at(-1)).toEqual({
      type: "failed",
      error: { code: "ENGINE_NOT_ENABLED", status: 412 },
    })
    await off.rig.close()

    const outside = openRouterAgent([
      refusedAnswer(403, "not_enabled", "This key belongs to no workspace"),
    ])
    const second = await ask(outside, "Hi", "ask")
    expect(second.events.at(-1)).toEqual({
      type: "failed",
      error: { code: "ENGINE_KEY_OUTSIDE_WORKSPACE", status: 412 },
    })
  })

  it("asks the Router nothing without a Comfy key", async () => {
    const opened = openRouterAgent([], null)

    const { events } = await ask(opened, "Hi", "ask")

    expect(events.at(-1)).toEqual({
      type: "failed",
      error: { code: "AGENT_MODEL_MISSING", status: 412 },
    })
    expect(opened.replay.requests).toEqual([])
  })

  it("answers with the model you choose from the Router chat models", async () => {
    const opened = openRouterAgent([
      textAnswer("qwen/qwen3.6-flash", "Hi.", 0.0001),
    ])
    const { agent } = opened.rig

    expect(await agent.listModels()).toEqual({
      models: [...routerChatModels],
      model: defaultChatModel,
    })
    await expect(agent.chooseModel("maker/none")).rejects.toBeInstanceOf(
      AgentModelUnknownError
    )
    expect(await agent.chooseModel("qwen/qwen3.6-flash")).toMatchObject({
      model: "qwen/qwen3.6-flash",
    })
    await ask(opened, "Hi", "ask")

    expect(opened.replay.requests[0]?.body.model).toBe("qwen/qwen3.6-flash")
  })

  it("keeps one idempotency key for one request, so a retry is not charged twice", async () => {
    const body = JSON.stringify({ model: defaultChatModel, messages: [] })

    expect(await idempotencyKeyOf(body)).toBe(await idempotencyKeyOf(body))
    expect(await idempotencyKeyOf(body)).not.toBe(
      await idempotencyKeyOf(`${body} `)
    )
  })

  it("refuses a model the Router chat list does not hold", async () => {
    await expect(
      openPiModels({
        provider: routerChat.provider,
        model: "maker/none",
        apiKey: comfyKey,
      })
    ).rejects.toBeInstanceOf(AgentModelUnknownError)
  })
})
