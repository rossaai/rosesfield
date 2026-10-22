import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { findApp } from "@rosesfield/catalog"
import type { Run as RunRecord } from "@rosesfield/contract"
import { Run } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import type { RunWait } from "#infrastructure/pi-library-tools"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  type Generation,
  generationFor,
  lastMessageOf,
  lastToolResultOf,
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

async function callStoryboard(
  inputs: Record<string, string | string[]>,
  finish: boolean
): Promise<{ runs: RunRecord[]; answer: string; runEvents: number }> {
  const generation = generationFor([storyboard])
  rig = agentFor(
    appToolsFor(
      [storyboard],
      generation,
      [],
      finish ? finishAll(generation) : undefined
    )
  )
  rig.faux.setResponses([
    fauxAssistantMessage([fauxToolCall("storyboard", { inputs })], {
      stopReason: "toolUse",
    }),
    (context) =>
      fauxAssistantMessage(
        lastToolResultOf(context)?.isError ? "refused" : "started"
      ),
  ])
  const { id } = await rig.agent.startConversation({ runApproval: "auto" })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Storyboard a fox" })
  )
  const runs = await Promise.all(
    generation.jobs.enqueued.map(async (runId) => {
      const run = await generation.runs.get(runId)
      if (run === null) {
        throw new Error(`No run ${runId}`)
      }
      return run.toRecord()
    })
  )
  return {
    runs,
    answer: lastMessageOf(events),
    runEvents: events.filter((event) => event.type === "run").length,
  }
}

describe("the agent's Storyboard tool", () => {
  it("publishes the scenes the screen takes, and no keyframe or first keyframe", () => {
    const [tool] = appToolsFor([storyboard], generationFor([storyboard]))
    const properties = JSON.stringify(tool?.parameters)
    expect(properties).toContain('"scene8"')
    expect(properties).toContain('"sceneCount"')
    expect(properties).not.toContain('"firstKeyframe"')
    expect(properties).not.toContain('"keyframe"')
  })

  it("makes keyframe 1 from scene 1 with no reference, then edits keyframe 1 for scene 2", async () => {
    const { runs, answer, runEvents } = await callStoryboard(
      { sceneCount: "2", scene1: "a fox at dusk", scene2: "the fox in snow" },
      true
    )
    expect(answer).toBe("started")
    expect(runs.map((run) => run.inputs.keyframe)).toEqual(["1", "2"])
    expect(runs[1]?.inputs.firstKeyframe).toEqual([made])
    expect(runs[1]?.inputs.scene2).toBe("the fox in snow")
    expect(runEvents).toBe(2)
  })

  it("makes one keyframe run per scene from a reference, all at once", async () => {
    const { runs, answer } = await callStoryboard(
      {
        reference: [assetUuid],
        sceneCount: "3",
        scene1: "a fox at dusk",
        scene2: "the fox in snow",
        scene3: "the fox at dawn",
      },
      false
    )
    expect(answer).toBe("started")
    expect(runs.map((run) => run.inputs.keyframe).sort()).toEqual([
      "1",
      "2",
      "3",
    ])
  })

  it("control: one scene from a reference makes one keyframe run", async () => {
    const { runs, answer } = await callStoryboard(
      { reference: [assetUuid], sceneCount: "1", scene1: "a fox at dusk" },
      false
    )
    expect(answer).toBe("started")
    expect(runs.map((run) => run.inputs.keyframe)).toEqual(["1"])
  })

  it("control: refuses a keyframe the agent names, which the chain sets", async () => {
    const { runs, answer } = await callStoryboard(
      {
        reference: [assetUuid],
        sceneCount: "2",
        scene1: "a fox at dusk",
        scene2: "the fox in snow",
        keyframe: "2",
      },
      false
    )
    expect(answer).toBe("refused")
    expect(runs).toEqual([])
  })
})
