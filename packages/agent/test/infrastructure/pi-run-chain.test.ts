import {
  fauxAssistantMessage,
  fauxToolCall,
  type TranscriptContext,
} from "@earendil-works/pi-ai"
import { Run } from "@rosesfield/generation"
import { assetIdFormat, type RunId } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import type { RunWait } from "#infrastructure/pi-library-tools"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import {
  type AgentRig,
  agentFor,
  allToolsFor,
  type Generation,
  generationFor,
  lastMessageOf,
  lastToolResultOf,
  readAll,
  textOf,
} from "../harness"
import { imageApp, motionApp, start } from "../sample"

const imageOutput = assetIdFormat.parse("3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d")
const videoOutput = assetIdFormat.parse("4b5c6d7e-8f9a-4b1c-8d2e-3f4a5b6c7d8e")

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function finishEach(generation: Generation): RunWait {
  const outputs = [imageOutput, videoOutput]
  return async () => {
    const runId = generation.jobs.enqueued.at(-1)
    const stored = runId === undefined ? null : await generation.runs.get(runId)
    if (stored === null || stored.isFinished()) {
      return
    }
    const state = stored.toState()
    await generation.runs.save(
      Run.restore({
        ...state,
        record: {
          ...state.record,
          status: "done",
          outputs: [
            outputs[generation.jobs.enqueued.length - 1] ?? videoOutput,
          ],
          finishedAt: start.toISOString(),
        },
      })
    )
  }
}

function runIdOf(context: TranscriptContext): string {
  return JSON.parse(textOf(lastToolResultOf(context))).run.id
}

function readRun(context: TranscriptContext) {
  return fauxAssistantMessage(
    [fauxToolCall("read_run", { runId: runIdOf(context) })],
    { stopReason: "toolUse" }
  )
}

describe("a chain of runs in one turn", () => {
  it("runs an image, then a video made from it, in order", async () => {
    const apps = [imageApp(), motionApp()]
    const generation = generationFor(apps)
    const library = {
      assets: new FakeAssetRepository(),
      characters: new FakeCharacterRepository(),
    }
    rig = agentFor(
      allToolsFor(apps, generation, library, finishEach(generation))
    )
    rig.faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("sample-image", { inputs: { prompt: "a red rose" } })],
        { stopReason: "toolUse" }
      ),
      readRun,
      (context) => {
        const [made] = JSON.parse(textOf(lastToolResultOf(context))).run.outputs
        return fauxAssistantMessage(
          [
            fauxToolCall("sample-motion", {
              inputs: { image: [made], prompt: "the rose opens" },
            }),
          ],
          { stopReason: "toolUse" }
        )
      },
      readRun,
      (context) => fauxAssistantMessage(`Done: ${runIdOf(context)}`),
    ])
    const { id } = await rig.agent.startConversation({ runApproval: "auto" })

    const events = await readAll(
      await rig.agent.send({
        conversationId: id,
        text: "Make a red rose, then a video of it opening",
      })
    )

    const [imageRun, videoRun] = generation.jobs.enqueued
    const runs = await Promise.all(
      [imageRun, videoRun].map((runId: RunId | undefined) =>
        runId === undefined ? null : generation.runs.get(runId)
      )
    )
    expect(runs.map((run) => run?.toRecord().appId)).toEqual([
      "sample-image",
      "sample-motion",
    ])
    expect(runs[1]?.toRecord().inputs.image).toEqual([imageOutput])
    expect(runs.map((run) => run?.status)).toEqual(["done", "done"])
    expect(
      events.flatMap((event) => (event.type === "run" ? [event.runId] : []))
    ).toEqual([imageRun, videoRun])
    expect(lastMessageOf(events)).toBe(`Done: ${videoRun}`)
    expect(rig.faux.state.callCount).toBe(5)
  })
})
