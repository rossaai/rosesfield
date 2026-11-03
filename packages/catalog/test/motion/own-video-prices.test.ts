import type { AppDefinition } from "@rosesfield/contract"
import { ComfyGenerationEngine, resolveBinding } from "@rosesfield/generation"
import type { StepRun } from "@rosesfield/generation/bindings"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app as imageInput } from "#image/app"
import { readApps } from "#list-apps"
import { OwnVideoLead } from "#motion/comfy/own-video-lead"
import { recordedSteps } from "#motion/comfy/own-video-prices"
import { motion } from "./motion-replay"

const [parsed] = readApps([{ folder: "image", app: imageInput }])
if (parsed === undefined) {
  throw new Error("the image app did not parse")
}
const image: AppDefinition = parsed

/** The runs Comfy Cloud billed for the edit and the draft of your own video, in credits at 211 per US dollar, with the workflow hash of the graph each ran. Draft run 519360b1 recorded 44.79, since the edit's charge reached the balance while the draft ran. Its bill is the balance change of its Generate, 50.43, less its plan, 0.19, its read, 5.41, and its edit, 24.94. */
const billed = {
  edit: {
    graph: "3db4d0fb684ea59e5520c769507ee0b04244939439dc013710fbe909a2fad38b",
    runs: {
      d024010d: 22.567706,
      be02e083: 22.81349,
      aca68b2d: 24.943086,
      "82248492": 25.15429,
    },
  },
  draft: {
    graph: "abdb8ba05d1ff2c67dd06686ba3ff043c794f95e50bb60347ee70bfe4480faab",
    runs: { "53fdd9f5": 15.087897, "519360b1": 19.89 },
  },
} as const

const lead = new OwnVideoLead({
  ask: {
    clip: assetIdFormat.parse("c496c393-52af-409e-9dc5-0df2a7b85df7"),
    frames: [],
    photos: [assetIdFormat.parse("fb55326a-b858-419a-8724-462d0845b4ea")],
    sentence: "",
    frameSize: { width: 864, height: 1536 },
    aspectRatio: null,
    resolution: "1080p",
    seed: 0,
  },
  heldText: async () => "{}",
})

const [, , edit, draft] = lead.priced

function appOf(step: StepRun): AppDefinition {
  return step.appId === motion.id ? motion : image
}

async function graphOf(step: StepRun | undefined): Promise<string | null> {
  if (step === undefined) {
    return null
  }
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test" })
  return engine.workflowHashOf(
    resolveBinding(appOf(step).engine, step.request.inputs)
  )
}

describe("the recorded price of your own video's edit and draft", () => {
  it("is read from runs of the graph each step runs, so a price measured on another graph fails here", async () => {
    expect(await graphOf(edit)).toBe(billed.edit.graph)
    expect(await graphOf(draft)).toBe(billed.draft.graph)
  })

  it("never sits under a run its graph billed", () => {
    expect(recordedSteps.edit).toBeGreaterThanOrEqual(
      Math.max(...Object.values(billed.edit.runs))
    )
    expect(recordedSteps.draft).toBeGreaterThanOrEqual(
      Math.max(...Object.values(billed.draft.runs))
    )
  })
})
