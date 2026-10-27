import { afterEach, describe, expect, it } from "vitest"
import type { AgentEffort } from "#agent.contract"
import { openPiModels, routerAgentModel } from "#infrastructure/pi-models"
import { defaultChatModel } from "#infrastructure/router-chat-models"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import {
  type RouterReplay,
  replayRouter,
  textAnswer,
} from "../fixtures/router-chat-answers"
import {
  type AgentRig,
  agentFor,
  allToolsFor,
  generationFor,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

const comfyKey = "comfyui-rosesfield-test"
const opus = "anthropic/claude-opus-5.5"
const fixed = "openai/gpt-5.2-chat"

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function openAgent(answers: number): { rig: AgentRig; replay: RouterReplay } {
  const replay = replayRouter(
    Array.from({ length: answers }, () => textAnswer(opus, "Hi.", 0.0001))
  )
  const generation = generationFor([imageApp()])
  const tools = allToolsFor([imageApp()], generation, {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
  })
  rig = agentFor(tools, () =>
    openPiModels(routerAgentModel(comfyKey), { fetch: replay.fetch })
  )
  return { rig, replay }
}

async function turn(
  agent: AgentRig["agent"],
  effort: AgentEffort | undefined
): Promise<void> {
  const { id } = await agent.startConversation({
    runApproval: "ask",
    ...(effort === undefined ? {} : { effort }),
  })
  await readAll(
    await agent.send({
      conversationId: id,
      text: "Hi",
    })
  )
}

describe("the effort a turn asks of the model", () => {
  it("sends the conversation's effort as OpenRouter's reasoning effort, and the model's opening effort when none is chosen", async () => {
    const opened = openAgent(2)
    await turn(opened.rig.agent, "low")
    await turn(opened.rig.agent, undefined)

    const [chosen, opening] = opened.replay.requests
    expect(chosen?.body.model).toBe(defaultChatModel)
    expect(chosen?.body.reasoning).toEqual({ effort: "low" })
    expect(opening?.body.reasoning).toEqual({ effort: "max" })
  })

  it("sends none as the effort none, and no reasoning for a model with no effort to choose", async () => {
    const opened = openAgent(2)
    await turn(opened.rig.agent, "none")
    await opened.rig.agent.chooseModel(fixed)
    await turn(opened.rig.agent, "high")

    const [none, untuned] = opened.replay.requests
    expect(none?.body.reasoning).toEqual({ effort: "none" })
    expect(untuned?.body.model).toBe(fixed)
    expect(untuned?.body).not.toHaveProperty("reasoning")
  })

  it("resets the effort to the new model's opening effort when the conversation's model changes and the new model does not offer it", async () => {
    const opened = openAgent(2)
    const { agent } = opened.rig
    const { id } = await agent.startConversation({
      runApproval: "ask",
      effort: "none",
    })
    await readAll(
      await agent.send({
        conversationId: id,
        text: "Hi",
      })
    )
    await agent.chooseModel(opus)
    await readAll(
      await agent.send({
        conversationId: id,
        text: "Hi",
      })
    )

    const [first, second] = opened.replay.requests
    expect(first?.body.reasoning).toEqual({ effort: "none" })
    expect(second?.body.model).toBe(opus)
    expect(second?.body.reasoning).toEqual({ effort: "max" })
  })

  it("keeps the effort a conversation changes to", async () => {
    const opened = openAgent(1)
    const { agent } = opened.rig
    const { id } = await agent.startConversation({ runApproval: "ask" })
    const changed = await agent.updateConversation(id, { effort: "high" })
    await readAll(
      await agent.send({
        conversationId: id,
        text: "Hi",
      })
    )

    expect(changed.effort).toBe("high")
    expect(changed.runApproval).toBe("ask")
    expect(opened.replay.requests[0]?.body.reasoning).toEqual({
      effort: "high",
    })
  })
})
