import {
  type FauxResponseStep,
  fauxAssistantMessage,
  fauxToolCall,
} from "@earendil-works/pi-ai"
import { afterEach, describe, expect, it } from "vitest"
import type { ConversationId } from "#domain/conversation.id"
import { openPiModels, routerAgentModel } from "#infrastructure/pi-models"
import { TurnLimit } from "#infrastructure/pi-turn-limit"
import type { Fetch } from "#infrastructure/router-chat-fetch"
import { defaultChatModel } from "#infrastructure/router-chat-models"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import { toolCallAnswer } from "../fixtures/router-chat-answers"
import {
  type AgentRig,
  agentFor,
  allToolsFor,
  generationFor,
  lastMessageOf,
  readAll,
} from "../harness"
import { imageApp } from "../sample"

const unknownRun = "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f"
const turnLimit = { code: "AGENT_TURN_LIMIT", status: 412 }

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function toolsOf() {
  return allToolsFor([imageApp()], generationFor([imageApp()]), {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
  })
}

function readRunForever(opened: AgentRig): FauxResponseStep {
  const step: FauxResponseStep = () => {
    opened.faux.appendResponses([step])
    return fauxAssistantMessage(
      [fauxToolCall("read_run", { runId: unknownRun })],
      { stopReason: "toolUse" }
    )
  }
  return step
}

async function send(
  opened: AgentRig,
  conversationId: ConversationId,
  text: string
) {
  return readAll(await opened.agent.send({ conversationId, text }))
}

describe("the model calls of one turn", () => {
  it("stop at the cap when the model calls read_run forever, and the turn says why", async () => {
    rig = agentFor(toolsOf())
    rig.faux.setResponses([readRunForever(rig)])
    const { id } = await rig.agent.startConversation({ runApproval: "auto" })

    const events = await send(rig, id, "Wait for my run")

    expect(rig.faux.state.callCount).toBe(TurnLimit.maxModelCalls)
    expect(events.at(-1)).toEqual({ type: "failed", error: turnLimit })
  })

  it("count from zero again on the person's next message", async () => {
    rig = agentFor(toolsOf())
    rig.faux.setResponses([readRunForever(rig)])
    const { id } = await rig.agent.startConversation({ runApproval: "auto" })
    await send(rig, id, "Wait for my run")
    rig.faux.setResponses([fauxAssistantMessage("Your run is not stored.")])

    const events = await send(rig, id, "Is it there?")

    expect(rig.faux.state.callCount).toBe(TurnLimit.maxModelCalls + 1)
    expect(lastMessageOf(events)).toBe("Your run is not stored.")
    expect(events.at(-1)).toEqual({ type: "done" })
  })

  it("send the Router no paid call past the cap", async () => {
    let sent = 0
    const router: Fetch = async () => {
      sent += 1
      const answer = toolCallAnswer(
        defaultChatModel,
        {
          id: `call_${sent}`,
          name: "read_run",
          arguments: { runId: unknownRun },
        },
        0.0001
      )
      return Response.json(answer.body, { status: answer.status })
    }
    rig = agentFor(toolsOf(), () =>
      openPiModels(routerAgentModel("comfyui-rosesfield-test"), {
        fetch: router,
      })
    )
    const { id } = await rig.agent.startConversation({ runApproval: "auto" })

    const events = await send(rig, id, "Wait for my run")

    expect(sent).toBe(TurnLimit.maxModelCalls)
    expect(events.at(-1)).toEqual({ type: "failed", error: turnLimit })
  })
})
