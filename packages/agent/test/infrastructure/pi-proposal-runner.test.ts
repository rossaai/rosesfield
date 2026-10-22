import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { findApp } from "@rosesfield/catalog"
import type { Run as RunRecord } from "@rosesfield/contract"
import { Run } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import type { Proposal } from "#agent.contract"
import { AcceptProposalHandler } from "#application/accept-proposal/accept-proposal.handler"
import type { RunWait } from "#infrastructure/pi-library-tools"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  type Generation,
  generationFor,
  proposalRunnerFor,
  readAll,
} from "../harness"
import { assetUuid, start } from "../sample"

function storyboardApp() {
  const found = findApp("storyboard")
  if (found === null) {
    throw new Error("The catalog lists no Storyboard")
  }
  return found
}

const storyboard = storyboardApp()

const made = assetIdFormat.parse("5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e8f")

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function finishAll(generation: Generation): RunWait {
  return async () => {
    for (const runId of generation.jobs.enqueued) {
      const stored = await generation.runs.get(runId)
      if (stored === null || stored.isFinished()) {
        continue
      }
      const state = stored.toState()
      await generation.runs.save(
        Run.restore({
          ...state,
          record: {
            ...state.record,
            status: "done",
            outputs: [made],
            finishedAt: start.toISOString(),
          },
        })
      )
    }
  }
}

type Accepted = {
  runs: RunRecord[]
  answered: RunRecord[]
  proposal: Proposal
}

async function proposeThenAccept(
  inputs: Record<string, string | string[]>,
  finish: boolean
): Promise<Accepted> {
  const generation = generationFor([storyboard])
  rig = agentFor(appToolsFor([storyboard], generation))
  rig.faux.setResponses([
    fauxAssistantMessage([fauxToolCall("storyboard", { inputs })], {
      stopReason: "toolUse",
    }),
    fauxAssistantMessage("This answer is never asked for."),
  ])
  const { id } = await rig.agent.startConversation({ runApproval: "ask" })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Storyboard a fox" })
  )
  const found = events.find((event) => event.type === "proposal")
  if (found?.type !== "proposal") {
    throw new Error("The answer holds no proposal")
  }
  const accepted = await new AcceptProposalHandler({
    agent: rig.agent,
    runner: proposalRunnerFor(
      generation,
      finish ? finishAll(generation) : undefined
    ),
  }).execute({ conversationId: id, proposalId: found.proposal.id })
  const runs = await Promise.all(
    generation.jobs.enqueued.map(async (runId) => {
      const run = await generation.runs.get(runId)
      if (run === null) {
        throw new Error(`No run ${runId}`)
      }
      return run.toRecord()
    })
  )
  return { runs, answered: accepted.runs, proposal: accepted.proposal }
}

describe("a Storyboard proposal accepted in the ask mode", () => {
  it("makes one keyframe run per scene from a reference, and the proposal holds each", async () => {
    const { runs, answered, proposal } = await proposeThenAccept(
      {
        reference: [assetUuid],
        sceneCount: "3",
        scene1: "a fox at dusk",
        scene2: "the fox in snow",
        scene3: "the fox at dawn",
      },
      false
    )
    expect(runs.map((run) => run.inputs.keyframe).sort()).toEqual([
      "1",
      "2",
      "3",
    ])
    expect(answered.map((run) => run.id).sort()).toEqual(
      runs.map((run) => run.id).sort()
    )
    expect(proposal.status).toBe("accepted")
    expect([...proposal.runIds].sort()).toEqual(
      runs.map((run) => run.id).sort()
    )
  })

  it("makes keyframe 1 from scene 1 with no reference, then edits keyframe 1 for scene 2", async () => {
    const { runs } = await proposeThenAccept(
      { sceneCount: "2", scene1: "a fox at dusk", scene2: "the fox in snow" },
      true
    )
    expect(runs.map((run) => run.inputs.keyframe)).toEqual(["1", "2"])
    expect(runs[1]?.inputs.firstKeyframe).toEqual([made])
    expect(runs[1]?.inputs.scene2).toBe("the fox in snow")
  })

  it("control: one scene from a reference makes one keyframe run", async () => {
    const { runs, proposal } = await proposeThenAccept(
      { reference: [assetUuid], sceneCount: "1", scene1: "a fox at dusk" },
      false
    )
    expect(runs).toHaveLength(1)
    expect(runs[0]?.inputs.scene1).toBe("a fox at dusk")
    expect(proposal.runIds).toEqual([runs[0]?.id])
  })
})
