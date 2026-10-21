import {
  appIdFormat,
  assetIdFormat,
  characterIdFormat,
} from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { storyboardCopy } from "#storyboard/copy.en"
import {
  type KeyframeRun,
  keyframeOf,
  keyframesOf,
} from "#storyboard/keyframe-facts"

const referenceId = assetIdFormat.parse("1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e")
const characterId = characterIdFormat.parse(
  "4c6e8a0c-2e4a-4b6c-9d0e-6a8c0e2a4c6e"
)
const outputs = [
  "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
  "2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f",
].map((id) => assetIdFormat.parse(id))
const look = "late afternoon light, 35 mm lens"
const scenes = [
  "a girl opens the door of a small bakery",
  "she ties an apron and kneads dough",
  "she slides a tray of bread into the oven",
]

function runOf(
  count: number,
  extra: KeyframeRun["inputs"],
  seed: number | null = 42
): KeyframeRun {
  const inputs: KeyframeRun["inputs"] = {
    look,
    sceneCount: String(count),
    ...extra,
  }
  scenes.slice(0, count).forEach((scene, index) => {
    inputs[`scene${index + 1}`] = scene
  })
  return {
    appId: appIdFormat.parse("storyboard"),
    inputs,
    count,
    seed,
    outputs: outputs.slice(0, count),
  }
}

describe("the facts of each Storyboard keyframe", () => {
  it("makes keyframe 1 from its scene and names keyframe 1 as the anchor of keyframe 2 when there is no reference and no character", () => {
    const [first, second] = keyframesOf(runOf(2, {}))
    expect(first?.anchor).toEqual({ kind: "scene" })
    expect(second?.anchor).toEqual({
      kind: "keyframe",
      number: 1,
      labelKey: "storyboard.anchor.keyframe",
    })
    expect(Object.keys(storyboardCopy)).toContain(
      second?.anchor.kind === "keyframe" ? second.anchor.labelKey : ""
    )
  })

  it("gives each keyframe its number, its asset, its own scene then the look, and its seed, in scene order", () => {
    const facts = keyframesOf(runOf(3, { reference: [referenceId] }))
    expect(facts.map((one) => one.number)).toEqual([1, 2, 3])
    expect(facts.map((one) => one.assetId)).toEqual(outputs)
    expect(facts.map((one) => one.prompt)).toEqual(
      scenes.map((scene) => `${scene} ${look}`)
    )
    expect(facts.map((one) => one.seed)).toEqual([42, 43, 44])
    expect(facts.map((one) => one.anchor)).toEqual(
      scenes.map(() => ({ kind: "reference", assetId: referenceId }))
    )
  })

  it("names the character as the anchor of every keyframe", () => {
    const facts = keyframesOf(runOf(3, { character: [characterId] }))
    expect(facts.map((one) => one.anchor)).toEqual(
      scenes.map(() => ({ kind: "character", characterId }))
    )
  })

  it("keeps the prompt to the scene when the look is empty, and the seed empty when the run has none", () => {
    const run = runOf(1, { look: "" }, null)
    expect(keyframesOf(run)).toEqual([
      {
        number: 1,
        assetId: outputs[0],
        scene: scenes[0],
        prompt: scenes[0],
        seed: null,
        anchor: { kind: "scene" },
      },
    ])
  })

  it("finds one keyframe by its asset, and none for an asset the run did not make", () => {
    const run = runOf(3, {})
    expect(keyframeOf(run, outputs[2] ?? "")?.number).toBe(3)
    expect(keyframeOf(run, outputs[2] ?? "")?.anchor.kind).toBe("keyframe")
    expect(keyframeOf(run, referenceId)).toBeNull()
  })

  it("finds no keyframe in a run of another app", () => {
    const run = { ...runOf(3, {}), appId: appIdFormat.parse("image") }
    expect(keyframesOf(run)).toEqual([])
    expect(keyframeOf(run, outputs[0] ?? "")).toBeNull()
  })

  it("leaves the asset of a keyframe that has not landed empty", () => {
    const run = { ...runOf(3, {}), outputs: [] }
    expect(keyframesOf(run).map((one) => one.assetId)).toEqual([
      null,
      null,
      null,
    ])
  })
})

describe("the facts of a Storyboard run that makes one keyframe", () => {
  function callRun(
    keyframe: string,
    extra: KeyframeRun["inputs"]
  ): KeyframeRun {
    const run = runOf(3, { keyframe, ...extra })
    return { ...run, count: 1, outputs: outputs.slice(0, 1) }
  }

  it("gives the run's one keyframe its own number, its scene then the look, and the seed of its branch", () => {
    expect(keyframesOf(callRun("3", { reference: [referenceId] }))).toEqual([
      {
        number: 3,
        assetId: outputs[0],
        scene: scenes[2],
        prompt: `${scenes[2]} ${look}`,
        seed: 44,
        anchor: { kind: "reference", assetId: referenceId },
      },
    ])
  })

  it("names keyframe 1 as the anchor of a run that edits keyframe 1, and the scene as the anchor of keyframe 1", () => {
    const [second] = keyframesOf(
      callRun("2", { firstKeyframe: [outputs[1] ?? referenceId] })
    )
    expect(second?.anchor).toEqual({
      kind: "keyframe",
      number: 1,
      labelKey: "storyboard.anchor.keyframe",
    })
    const [first] = keyframesOf(callRun("1", {}))
    expect(first?.anchor).toEqual({ kind: "scene" })
    expect(keyframeOf(callRun("2", {}), outputs[0] ?? "")?.number).toBe(2)
  })

  it("finds no keyframe in a run that holds no scene", () => {
    const run = { ...callRun("1", {}), inputs: { prompt: "a fox" } }
    expect(keyframesOf(run)).toEqual([])
  })
})
