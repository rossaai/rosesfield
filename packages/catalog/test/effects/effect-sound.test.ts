import { describe, expect, it } from "vitest"
import { effectGraph } from "#effects/comfy/effect-graph"
import {
  bedGainNode,
  brightenNode,
  buildNodes,
  ceilingNodes,
  fadeOutNode,
  hitShared,
  hitSlots,
  hitTailSeconds,
  loudnessNode,
  peakMargin,
  soundNode,
} from "#effects/comfy/effect-sound"
import { effectBinding } from "#effects/comfy/effects-binding"
import type { EffectRecipe, SoundBed } from "#effects/effect-recipe.contract"
import { effectRecipes, readRecipes, recipeOf } from "#effects/effect-recipes"
import { brokenLinks, fileGraph, workflowOf } from "./effects-replay"
import { keptRun } from "./passed-recipe"

const ledger = [keptRun("many-copies")]

const opening = {
  prompt: "Soft airy wind that swells. No music, no voice.",
  time: 0,
  seconds: 3,
  gainDb: -6,
}

const boom = {
  prompt: "A deep heavy boom. No music, no voice.",
  time: 2.5,
  seconds: 2,
  gainDb: 3,
}

function soundOf(recipe: EffectRecipe): SoundBed {
  const sound = recipe.design.sound
  if (sound === null) {
    throw new Error(`${recipe.effect} has a sound bed`)
  }
  return sound
}

function eyeWith(change: Partial<SoundBed>): EffectRecipe {
  const eye = recipeOf("push-into-eye")
  return {
    ...eye,
    design: { ...eye.design, sound: { ...soundOf(eye), ...change } },
  }
}

function slotIds(slots: typeof hitSlots): string[] {
  return slots.flatMap((slot) => Object.values(slot))
}

function mixedSound(recipe: EffectRecipe): string {
  const sound = recipe.design.sound
  const last = hitSlots[(sound?.hits.length ?? 0) - 1]
  if (last !== undefined) {
    return last.merged
  }
  if (sound?.brighten) {
    return brightenNode
  }
  if (sound?.build) {
    return buildNodes.sum
  }
  return sound?.bedGainDb ? bedGainNode : soundNode
}

describe("the sound of an effect ends in its fade and carries its hits", () => {
  it("ends the sound of a look with a fade in node 362, after the peak ceiling, and sends no fade node for a look without one", () => {
    const sound = soundOf(recipeOf("push-into-eye"))
    expect(sound.fadeOut).toBeGreaterThan(0)
    const faded = workflowOf(effectGraph(fileGraph(), eyeWith({})))
    expect(faded[fadeOutNode]).toEqual({
      class_type: "AudioFadeOut",
      inputs: {
        audio: [ceilingNodes[1], 0],
        duration_seconds: sound.fadeOut,
      },
    })
    expect(faded["370"]?.inputs.audio).toEqual([fadeOutNode, 0])
    expect(brokenLinks(faded)).toEqual([])
    const unfaded = workflowOf(
      effectGraph(fileGraph(), eyeWith({ fadeOut: 0 }))
    )
    expect(unfaded[fadeOutNode]).toBeUndefined()
    expect(unfaded["370"]?.inputs.audio).toEqual([ceilingNodes[1], 0])
  })

  it("sets each sounding look's loudness to the middle of its band, then holds its peaks under its ceiling, before the video is written", () => {
    const sounding = effectRecipes.filter((one) => one.design.sound !== null)
    expect(sounding.length).toBeGreaterThan(0)
    for (const recipe of sounding) {
      const sound = recipe.design.sound
      const workflow = workflowOf(effectGraph(fileGraph(), recipe))
      const target = sound
        ? (sound.loudness.min + sound.loudness.max) / 2
        : Number.NaN
      const ceiling = sound ? sound.truePeakMax - peakMargin : Number.NaN
      expect({ effect: recipe.effect, chain: workflow }).toMatchObject({
        effect: recipe.effect,
        chain: {
          [loudnessNode]: {
            class_type: "NormalizeAudioLoudness",
            inputs: {
              audio: [mixedSound(recipe), 0],
              lufs: target,
            },
          },
          [ceilingNodes[0] ?? ""]: {
            class_type: "AudioAmplify",
            inputs: { audio: [loudnessNode, 0], gain_db: -ceiling },
          },
          [ceilingNodes[1] ?? ""]: {
            class_type: "AudioAmplify",
            inputs: { audio: [ceilingNodes[0], 0], gain_db: ceiling },
          },
          "370": {
            inputs: {
              audio: [
                (sound?.fadeOut ?? 0) > 0 ? fadeOutNode : ceilingNodes[1],
                0,
              ],
            },
          },
        },
      })
      expect(target).toBeGreaterThanOrEqual(sound?.loudness.min ?? 0)
      expect(target).toBeLessThanOrEqual(sound?.loudness.max ?? 0)
      expect(ceiling).toBeLessThan(sound?.truePeakMax ?? 0)
    }
    expect(
      workflowOf(effectGraph(fileGraph(), recipeOf("push-into-eye")))[
        loudnessNode
      ]?.inputs.lufs
    ).toBe(-23.75)
  })

  it("holds six hit slots of nine nodes each from node 660, beside the shared audio model", () => {
    expect(Object.values(hitShared)).toEqual(["630", "631", "633"])
    expect(slotIds(hitSlots)).toEqual(
      [660, 670, 680, 690, 700, 710].flatMap((first) =>
        Array.from({ length: 9 }, (_, step) => String(first + step))
      )
    )
  })

  it("merges each hit onto the mix before it in recipe order, places a hit at 0 s with no lead, fades each tail, and drops the unused slots", () => {
    const struck = workflowOf(
      effectGraph(
        fileGraph(),
        eyeWith({ hits: [opening, boom], build: null, brighten: null })
      )
    )
    const [first, second] = hitSlots
    if (first === undefined || second === undefined) {
      throw new Error("Effects holds at least two hit slots")
    }
    expect(struck).toMatchObject({
      [first.prompt]: { inputs: { text: opening.prompt } },
      [first.length]: { inputs: { seconds: opening.seconds } },
      [first.gain]: {
        inputs: { audio: [first.decode, 0], volume: opening.gainDb },
      },
      [first.tail]: {
        class_type: "AudioFadeOut",
        inputs: { audio: [first.gain, 0], duration_seconds: hitTailSeconds },
      },
      [first.merged]: {
        class_type: "AudioMerge",
        inputs: { audio1: [soundNode, 0], audio2: [first.tail, 0] },
      },
      [second.prompt]: { inputs: { text: boom.prompt } },
      [second.lead]: {
        class_type: "EmptyAudio",
        inputs: { duration: boom.time },
      },
      [second.placed]: {
        class_type: "AudioConcat",
        inputs: {
          audio1: [second.lead, 0],
          audio2: [second.tail, 0],
          direction: "after",
        },
      },
      [second.merged]: {
        inputs: { audio1: [first.merged, 0], audio2: [second.placed, 0] },
      },
      [loudnessNode]: { inputs: { audio: [second.merged, 0] } },
    })
    expect(struck[first.lead]).toBeUndefined()
    expect(struck[first.placed]).toBeUndefined()
    expect(
      slotIds(hitSlots.slice(2)).filter((id) => struck[id] !== undefined)
    ).toEqual([])
    expect(brokenLinks(struck)).toEqual([])
  })

  it("sends no hit node and no audio model for a look without hits or without sound", () => {
    const hitIds = [...Object.values(hitShared), ...slotIds(hitSlots)]
    const plain = workflowOf(effectGraph(fileGraph(), eyeWith({ hits: [] })))
    expect(hitIds.filter((id) => plain[id] !== undefined)).toEqual([])
    expect(brokenLinks(plain)).toEqual([])
    const silent = workflowOf(
      effectGraph(fileGraph(), recipeOf("buildings-ripple"))
    )
    expect(hitIds.filter((id) => silent[id] !== undefined)).toEqual([])
    expect(brokenLinks(silent)).toEqual([])
  })

  it("builds the bed from its floor and brightens it before the first hit joins, and sends neither node for a look without them", () => {
    const build = { seconds: 4, floorDb: -12 }
    const brighten = { presenceDb: 3, airDb: 2.5 }
    const shaped = workflowOf(
      effectGraph(fileGraph(), eyeWith({ hits: [boom], build, brighten }))
    )
    expect(shaped).toMatchObject({
      [buildNodes.floor]: {
        class_type: "AudioAdjustVolume",
        inputs: { audio: [soundNode, 0], volume: build.floorDb },
      },
      [buildNodes.rise]: {
        class_type: "AudioFadeIn",
        inputs: { audio: [soundNode, 0], duration_seconds: build.seconds },
      },
      [buildNodes.sum]: {
        class_type: "AudioMerge",
        inputs: {
          audio1: [buildNodes.floor, 0],
          audio2: [buildNodes.rise, 0],
          merge_method: "add",
        },
      },
      [brightenNode]: {
        class_type: "AudioParametricEQ",
        inputs: {
          audio: [buildNodes.sum, 0],
          presence_boost_db: brighten.presenceDb,
          air_boost_db: brighten.airDb,
        },
      },
      [hitSlots[0]?.merged ?? ""]: {
        inputs: { audio1: [brightenNode, 0] },
      },
    })
    expect(brokenLinks(shaped)).toEqual([])
    const bare = workflowOf(
      effectGraph(fileGraph(), eyeWith({ hits: [], build, brighten }))
    )
    expect(bare[loudnessNode]?.inputs.audio).toEqual([brightenNode, 0])
    expect(brokenLinks(bare)).toEqual([])
    const flat = workflowOf(
      effectGraph(
        fileGraph(),
        eyeWith({ hits: [], build: null, brighten: null })
      )
    )
    const shapeIds = [...Object.values(buildNodes), brightenNode]
    expect(shapeIds.filter((id) => flat[id] !== undefined)).toEqual([])
    expect(flat[loudnessNode]?.inputs.audio).toEqual([soundNode, 0])
  })

  it("lowers the LTX track by the bed gain before the build and the brighten, and sends no gain node at 0 dB", () => {
    const build = { seconds: 4, floorDb: -12 }
    const lowered = workflowOf(
      effectGraph(
        fileGraph(),
        eyeWith({ hits: [boom], bedGainDb: -8, build, brighten: null })
      )
    )
    expect(lowered).toMatchObject({
      [bedGainNode]: {
        class_type: "AudioAdjustVolume",
        inputs: { audio: [soundNode, 0], volume: -8 },
      },
      [buildNodes.floor]: { inputs: { audio: [bedGainNode, 0] } },
      [buildNodes.rise]: { inputs: { audio: [bedGainNode, 0] } },
    })
    expect(brokenLinks(lowered)).toEqual([])
    const bare = workflowOf(
      effectGraph(
        fileGraph(),
        eyeWith({ hits: [], bedGainDb: -8, build: null, brighten: null })
      )
    )
    expect(bare[loudnessNode]?.inputs.audio).toEqual([bedGainNode, 0])
    const level = workflowOf(
      effectGraph(fileGraph(), eyeWith({ hits: [boom], bedGainDb: 0 }))
    )
    expect(level[bedGainNode]).toBeUndefined()
  })

  it("seeds each hit from the run's seed, and binds no seed for an unused slot", () => {
    const seeded = (recipe: EffectRecipe) =>
      JSON.stringify(effectBinding(recipe, "480p").config.bindings)
    const two = seeded(eyeWith({ hits: [opening, boom] }))
    for (const slot of hitSlots.slice(0, 2)) {
      expect(two).toContain(`"${slot.sampler}","inputs","seed"`)
    }
    for (const slot of hitSlots.slice(2)) {
      expect(two).not.toContain(`"${slot.sampler}"`)
    }
    const six = seeded(eyeWith({ hits: hitSlots.map(() => boom) }))
    for (const slot of hitSlots) {
      expect(six).toContain(`"${slot.sampler}","inputs","seed"`)
    }
    const none = seeded(eyeWith({ hits: [] }))
    for (const slot of hitSlots) {
      expect(none).not.toContain(`"${slot.sampler}"`)
    }
  })

  it("refuses a fade past 2 seconds or off its step, a hit louder than 12 dB, a seventh hit, a bed gain above 0 dB or off the whole dB, and a build or brighten out of bounds", () => {
    const sound = soundOf(recipeOf("push-into-eye"))
    const withSound = (change: Record<string, unknown>) => ({
      ...recipeOf("many-copies"),
      design: {
        ...recipeOf("many-copies").design,
        sound: { ...sound, hits: [boom], ...change },
      },
    })
    const read = (change: Record<string, unknown>) => () =>
      readRecipes({ "many-copies": withSound(change) }, ledger)
    const refused = (field: string) =>
      new RegExp(`many-copies\\.json is invalid: design\\.sound\\.${field}`)
    expect(read({})).not.toThrow()
    expect(read({ fadeOut: 2.1 })).toThrow(refused("fadeOut"))
    expect(read({ fadeOut: 0.45 })).toThrow(refused("fadeOut"))
    expect(read({ hits: [{ ...boom, gainDb: 13 }] })).toThrow(
      refused("hits\\.0\\.gainDb")
    )
    expect(read({ hits: Array.from({ length: 6 }, () => boom) })).not.toThrow()
    expect(read({ hits: Array.from({ length: 7 }, () => boom) })).toThrow(
      refused("hits")
    )
    expect(read({ bedGainDb: 1 })).toThrow(refused("bedGainDb"))
    expect(read({ bedGainDb: -2.5 })).toThrow(refused("bedGainDb"))
    expect(read({ bedGainDb: -25 })).toThrow(refused("bedGainDb"))
    expect(read({ build: { seconds: 7.5, floorDb: -10 } })).toThrow(
      refused("build\\.seconds")
    )
    expect(read({ brighten: { presenceDb: 4.2, airDb: 4 } })).toThrow(
      refused("brighten\\.presenceDb")
    )
  })
})
