import { beforeEach, describe, expect, it } from "vitest"
import {
  forgetKeptKeyframes,
  keepKeyframe,
  keptKeyframeOf,
  keptRunOf,
} from "@/studio/storyboard/kept-keyframes"
import {
  scenesOf,
  storyboardValuesFromRun,
} from "@/studio/storyboard/storyboard-form"
import {
  hostedKeyframe,
  hostedReference,
  hostedScenes,
  storyboard,
} from "./storyboard-screen"

const storageKey = "rosesfield.storyboard.keyframes"

beforeEach(() => {
  window.localStorage.clear()
  forgetKeptKeyframes()
})

describe("the keyframes a Storyboard press keeps", () => {
  it("gives a hosted run back its keyframe number and its scenes after the page loads again", () => {
    const { run, kept } = hostedKeyframe(2)
    keepKeyframe(run, kept)
    forgetKeptKeyframes()
    expect(keptKeyframeOf(run)).toEqual(kept)
    expect(keptRunOf(run).inputs).toEqual(kept.inputs)
    expect(keptRunOf(run).id).toBe(run.id)
  })

  it("fills Use these inputs on a hosted run with the press's scenes, look, reference and model", () => {
    const { run, kept } = hostedKeyframe(2)
    keepKeyframe(run, kept)
    const values = storyboardValuesFromRun(storyboard, keptRunOf(run))
    expect(scenesOf(values)).toEqual(hostedScenes)
    expect(values.inputs).toMatchObject({
      look: "dusk",
      reference: [hostedReference],
      model: "bfl/flux-3-image",
      aspectRatio: "16:9",
      keyframe: "1",
    })
  })

  it("leaves a run that names its keyframe, and a run the press did not keep, as they are", () => {
    const numbered = hostedKeyframe(1).run
    const own = { ...numbered, inputs: { ...numbered.inputs, keyframe: "1" } }
    keepKeyframe(own, hostedKeyframe(3).kept)
    expect(keptRunOf(own)).toBe(own)
    const other = hostedKeyframe(2).run
    expect(keptRunOf(other)).toBe(other)
  })

  it("reads a stored value it cannot parse as nothing kept", () => {
    const { run } = hostedKeyframe(2)
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([[run.id, { press: 7, inputs: {} }], "broken"])
    )
    expect(keptKeyframeOf(run)).toBeNull()
  })
})
