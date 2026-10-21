import { describe, expect, it } from "vitest"
import {
  ceilingNodes,
  effectGraph,
  fadeOutNode,
  hitNodes,
  loudnessNode,
  soundNode,
} from "#effects/comfy/effect-graph"
import { effectBinding } from "#effects/comfy/effects-binding"
import { readRecipes, recipeOf } from "#effects/effect-recipes"
import { brokenLinks, fileGraph, workflowOf } from "./effects-replay"
import { keptRun } from "./passed-recipe"

const ledger = [keptRun("many-copies")]

describe("the sound of an effect ends in its fade and carries its hit", () => {
  it("ends the sound of a look with a fade in node 362, after the peak ceiling, and sends no fade node for a look without one", () => {
    const eye = recipeOf("push-into-eye")
    const sound = eye.design.sound
    if (sound === null) {
      throw new Error("Push into eye has a sound bed")
    }
    const faded = workflowOf(effectGraph(fileGraph(), eye))
    expect(faded[fadeOutNode]).toEqual({
      class_type: "AudioFadeOut",
      inputs: { audio: [ceilingNodes[1], 0], duration_seconds: 0.4 },
    })
    expect(faded["370"]?.inputs.audio).toEqual([fadeOutNode, 0])
    expect(brokenLinks(faded)).toEqual([])
    const unfaded = workflowOf(
      effectGraph(fileGraph(), {
        ...eye,
        design: { ...eye.design, sound: { ...sound, fadeOut: 0 } },
      })
    )
    expect(unfaded[fadeOutNode]).toBeUndefined()
    expect(unfaded["370"]?.inputs.audio).toEqual([ceilingNodes[1], 0])
  })

  it("adds a look's hit to its sound at the hit's time and gain, before the loudness, and sends no hit node for a look without one", () => {
    const eye = recipeOf("push-into-eye")
    const sound = eye.design.sound
    const hit = sound?.hit ?? null
    if (sound === null || hit === null) {
      throw new Error("Push into eye has a sound bed with a hit")
    }
    const ids = Object.values(hitNodes)
    expect(ids).toEqual([
      ...["630", "631", "632", "633", "634", "635"],
      ...["636", "637", "638", "639", "640"],
    ])
    const struck = workflowOf(effectGraph(fileGraph(), eye))
    expect(ids.filter((id) => struck[id] === undefined)).toEqual([])
    expect(struck).toMatchObject({
      [hitNodes.prompt]: {
        class_type: "CLIPTextEncode",
        inputs: { text: hit.prompt },
      },
      [hitNodes.length]: {
        class_type: "EmptyLatentAudio",
        inputs: { seconds: hit.seconds },
      },
      [hitNodes.gain]: {
        class_type: "AudioAdjustVolume",
        inputs: { audio: [hitNodes.decode, 0], volume: hit.gainDb },
      },
      [hitNodes.lead]: {
        class_type: "EmptyAudio",
        inputs: { duration: hit.time },
      },
      [hitNodes.placed]: {
        class_type: "AudioConcat",
        inputs: {
          audio1: [hitNodes.lead, 0],
          audio2: [hitNodes.gain, 0],
          direction: "after",
        },
      },
      [hitNodes.merged]: {
        class_type: "AudioMerge",
        inputs: {
          audio1: [soundNode, 0],
          audio2: [hitNodes.placed, 0],
          merge_method: "add",
        },
      },
      [loudnessNode]: { inputs: { audio: [hitNodes.merged, 0] } },
    })
    expect(hit).toMatchObject({ time: 6.3, gainDb: 4 })
    expect(brokenLinks(struck)).toEqual([])
    const plain = workflowOf(
      effectGraph(fileGraph(), {
        ...eye,
        design: { ...eye.design, sound: { ...sound, hit: null } },
      })
    )
    expect(ids.filter((id) => plain[id] !== undefined)).toEqual([])
    expect(plain[loudnessNode]?.inputs.audio).toEqual([soundNode, 0])
    expect(brokenLinks(plain)).toEqual([])
    const silent = workflowOf(
      effectGraph(fileGraph(), recipeOf("buildings-ripple"))
    )
    expect(ids.filter((id) => silent[id] !== undefined)).toEqual([])
  })

  it("seeds a look's hit from the run's seed, and binds no hit seed for a look without one", () => {
    const eye = recipeOf("push-into-eye")
    const sound = eye.design.sound
    if (sound === null) {
      throw new Error("Push into eye has a sound bed")
    }
    const seeded = (recipe: typeof eye) =>
      JSON.stringify(effectBinding(recipe, "480p").config.bindings)
    expect(seeded(eye)).toContain(`"${hitNodes.sampler}","inputs","seed"`)
    expect(
      seeded({
        ...eye,
        design: { ...eye.design, sound: { ...sound, hit: null } },
      })
    ).not.toContain(`"${hitNodes.sampler}"`)
  })

  it("refuses a fade past 2 seconds or off the 0.1 s step, and a hit louder than 12 dB", () => {
    const sound = recipeOf("push-into-eye").design.sound
    const withSound = (change: Record<string, unknown>) => ({
      ...recipeOf("many-copies"),
      design: {
        ...recipeOf("many-copies").design,
        sound: { ...sound, ...change },
      },
    })
    expect(() =>
      readRecipes({ "many-copies": withSound({}) }, ledger)
    ).not.toThrow()
    expect(() =>
      readRecipes({ "many-copies": withSound({ fadeOut: 2.1 }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: design\.sound\.fadeOut/)
    expect(() =>
      readRecipes({ "many-copies": withSound({ fadeOut: 0.45 }) }, ledger)
    ).toThrow(/many-copies\.json is invalid: design\.sound\.fadeOut/)
    expect(() =>
      readRecipes(
        {
          "many-copies": withSound({ hit: { ...sound?.hit, gainDb: 13 } }),
        },
        ledger
      )
    ).toThrow(/many-copies\.json is invalid: design\.sound\.hit\.gainDb/)
  })
})
