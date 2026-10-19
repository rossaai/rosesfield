import { comfyWorkflowAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { promptOf } from "#headshots/comfy/headshot-words"
import {
  backgrounds,
  clothesValues,
  framings,
} from "#headshots/headshots-values"
import {
  danglingLinks,
  defaults,
  headshots,
  promptAt,
  reachable,
  savedSamplers,
  seedValue,
  submitted,
  type Workflow,
} from "./headshots-replay"

const sizes = {
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 896, height: 1152 },
  "4:3": { width: 1152, height: 896 },
} as const

const requests = ([1, 2, 3, 4] as const).flatMap((count) =>
  (["1:1", "3:4", "4:3"] as const).map((aspectRatio) => ({
    count,
    aspectRatio,
  }))
)

describe("each Headshots engine request by count and format", () => {
  it.each(requests)(
    "saves $count branches at the size of $aspectRatio",
    async ({ count, aspectRatio }) => {
      const { workflow } = await submitted({ count, aspectRatio }, 9)
      const samplers = savedSamplers(workflow)
      expect(samplers).toHaveLength(count)
      expect(
        samplers.map((one) => seedValue(workflow, one.inputs.seed))
      ).toEqual(Array.from({ length: count }, (_, index) => 9 + index))
      expect(workflow["192"]?.inputs).toMatchObject(sizes[aspectRatio])
      const sampled = [...reachable(workflow, "9")].filter(
        (id) => workflow[id]?.class_type === "KSampler"
      )
      expect(sampled).toHaveLength(count)
      expect(danglingLinks(workflow)).toEqual([])
    }
  )
})

const choiceRequests = [
  ...framings.map((framing) => ({ ...defaults, framing })),
  ...backgrounds.map((background) => ({ ...defaults, background })),
  ...clothesValues.map((clothes) => ({ ...defaults, clothes })),
  ...(["on", "off"] as const).map((keepGlasses) => ({
    ...defaults,
    keepGlasses,
  })),
]

describe("each Headshots choice in the engine request", () => {
  it.each(choiceRequests)(
    "sends the sentence for $framing, $background, $clothes and glasses $keepGlasses",
    async (choices) => {
      const { workflow } = await submitted({ inputs: choices })
      const prompts = savedSamplers(workflow).map((one) =>
        promptAt(workflow, one)
      )
      expect(prompts).toEqual([promptOf(choices), promptOf(choices)])
    }
  )
})

const partnerNodeClasses: readonly string[] = ["GeminiImage2Node"]

function partnerNodesOf(workflow: Workflow): string[] {
  return Object.values(workflow)
    .map((node) => node.class_type)
    .filter(
      (name) => partnerNodeClasses.includes(name) || /Api|Node$/.test(name)
    )
}

describe("the Headshots binding on open weights only", () => {
  it("binds one ComfyUI workflow with no partner node and no model input", async () => {
    expect(headshots?.engine.adapter).toBe(comfyWorkflowAdapter)
    expect(headshots?.inputs.some((input) => input.name === "model")).toBe(
      false
    )
    const { workflow } = await submitted({ count: 4 })
    expect(partnerNodesOf(workflow)).toEqual([])
  })

  it("finds a planted partner node, the control", async () => {
    const { workflow } = await submitted({})
    const planted = structuredClone(workflow)
    planted["9001"] = {
      class_type: "GeminiImage2Node",
      inputs: { prompt: "", model: "planted" },
    }
    expect(partnerNodesOf(planted)).toEqual(["GeminiImage2Node"])
  })

  it("refuses a model input before any request", async () => {
    await expect(
      submitted({ inputs: { model: "nano-banana-pro" } })
    ).rejects.toThrow()
  })
})
