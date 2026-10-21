import type { Run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { keyframeBlocksOf } from "@/studio/storyboard/keyframe-blocks"
import { hostedKeyframe, storyboardRun } from "./storyboard-screen"

const scenes = { sceneCount: "3", scene1: "a", scene2: "b", scene3: "c" }
const first = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"

function keyframeRun(
  number: number,
  change: { [Field in keyof Run]?: unknown } = {}
): Run {
  return storyboardRun({
    id: `7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a0${number}`,
    inputs: {
      ...scenes,
      keyframe: String(number),
      model: number === 1 ? "z-image-turbo" : "qwen-image-edit-2511",
      ...(number === 1 ? {} : { firstKeyframe: [first] }),
    },
    seed: 42,
    aspectRatio: "16:9",
    ...change,
  })
}

describe("the blocks of the Storyboard canvas", () => {
  it("holds the runs of one press as one storyboard, led by its first edit", () => {
    const blocks = keyframeBlocksOf([
      keyframeRun(3),
      keyframeRun(2),
      keyframeRun(1),
    ])
    expect(blocks).toHaveLength(1)
    const [block] = blocks
    if (block?.kind !== "chain") {
      throw new Error("no storyboard block")
    }
    expect(block.count).toBe(3)
    expect([...block.runs.keys()].sort()).toEqual([1, 2, 3])
    expect(block.lead.inputs.keyframe).toBe("2")
  })

  it("starts a new storyboard when the inputs or the seed differ, or a keyframe repeats", () => {
    const blocks = keyframeBlocksOf([
      keyframeRun(1, { id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a11", seed: 9 }),
      keyframeRun(2),
      keyframeRun(1),
      keyframeRun(1, { id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4a12" }),
    ])
    expect(
      blocks.map((block) =>
        block.kind === "chain" ? [...block.runs.keys()] : []
      )
    ).toEqual([[1], [2, 1], [1]])
  })

  it("keeps a run that names no keyframe as a run of its own", () => {
    const legacy = storyboardRun({ inputs: scenes, count: 3 })
    const blocks = keyframeBlocksOf([keyframeRun(1), legacy])
    expect(blocks.map((block) => block.kind)).toEqual(["chain", "run"])
  })

  it("holds the runs of one press on a hosted model as one storyboard, from what the press kept of each run", () => {
    const keyframes = [hostedKeyframe(3), hostedKeyframe(2), hostedKeyframe(1)]
    const kept = new Map(keyframes.map((one) => [one.run.id, one.kept]))
    const runs = keyframes.map((one) => one.run)
    const blocks = keyframeBlocksOf(runs, (run) => kept.get(run.id) ?? null)
    expect(blocks).toHaveLength(1)
    const [block] = blocks
    if (block?.kind !== "chain") {
      throw new Error("no storyboard block")
    }
    expect(block.count).toBe(3)
    expect([...block.runs.keys()].sort()).toEqual([1, 2, 3])
    expect(block.lead.inputs).toMatchObject({
      scene1: "the door",
      look: "dusk",
      model: "bfl/flux-3-image",
    })
    expect(keyframeBlocksOf(runs).map((one) => one.kind)).toEqual([
      "run",
      "run",
      "run",
    ])
  })

  it("starts a new storyboard on a new press, even when its inputs are the same", () => {
    const first = hostedKeyframe(1)
    const next = hostedKeyframe(2, {
      id: "7c2e4a6c-8e0a-4c2e-8a4c-6e8a0c2e4b19",
    })
    const kept = new Map([
      [first.run.id, first.kept],
      [next.run.id, { ...next.kept, press: "press-8" }],
    ])
    const blocks = keyframeBlocksOf(
      [next.run, first.run],
      (run) => kept.get(run.id) ?? null
    )
    expect(blocks).toHaveLength(2)
  })
})
