import { appDefinition, type RunInputs } from "@rosesfield/contract"
import {
  type ComfyWorkflowConfig,
  parseComfyWorkflow,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { heldFilesOf } from "#comfy/cloud-weights"
import { effectsApp } from "#effects/app"
import { effectAgentNotes, isFinalRun } from "#effects/effect-agent"
import type { EffectPreset } from "#effects/effect-preset.contract"
import {
  heldEffectPresets,
  heldPresets,
  keptPresets,
  presetOrder,
  readPresets,
  shownPresets,
} from "#effects/effect-presets"
import { passedRecipes } from "#effects/effect-recipes"
import { offeredEffectsApp } from "#effects/offered-effects"

type Bound = ComfyWorkflowConfig

const assetId = assetIdFormat.parse("0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a")

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

function kept(preset: EffectPreset): EffectPreset {
  return { ...preset, result: { runId, file: `${preset.id}.mp4` } }
}

const clipFixture: EffectPreset = {
  id: "clip-fixture",
  kind: "clip",
  adapter: {
    file: "ltx-2.3-22b-ic-lora-day-to-night-0.9.safetensors",
    strength: 1,
  },
  prompt: "A realistic nighttime scene of the same place.",
  negative: "pitch black",
  result: null,
}

const allKept = [...heldEffectPresets, clipFixture].map(kept)

function appWith(presets: readonly EffectPreset[]) {
  return appDefinition.parse(effectsApp(passedRecipes, presets))
}

function resolved(inputs: RunInputs): Bound {
  return parseComfyWorkflow(resolveBinding(appWith(allKept).engine, inputs))
}

function valueAt(bound: Bound, node: string, name: string, effect: string) {
  const binding = bound.bindings.find(
    (one) => one.path[0] === node && one.path.at(-1) === name
  )
  if (binding === undefined || binding.from !== "input") {
    throw new Error(`No input binding sets ${node}.${name}`)
  }
  return binding.map?.[effect]
}

function presetById(id: string): EffectPreset {
  const preset = heldEffectPresets.find((one) => one.id === id)
  if (preset === undefined) {
    throw new Error(`${id} is not held`)
  }
  return preset
}

function effectsOf(presets: readonly EffectPreset[]): string[] {
  const input = appWith(presets).inputs.find((one) => one.name === "effect")
  return input?.type === "choice"
    ? input.options.map((option) => option.value)
    : []
}

describe("the effects built on a guide or on your clip", () => {
  it("hold the three guide effects read from their references, and no clip effect yet", () => {
    expect(heldEffectPresets.map((one) => one.id)).toEqual([
      "flip-into-a-new-place",
      "ticket-wipe",
      "grab-and-run",
    ])
  })

  it("leave Effects until each has a kept result", () => {
    expect(shownPresets).toEqual([])
    expect(effectsOf(shownPresets)).toEqual(
      passedRecipes.map((recipe) => recipe.effect)
    )
    expect(effectsOf(keptPresets(allKept))).toContain("grab-and-run")
  })

  it("stay out of a public host's Effects and reach only the local owner as drafts", () => {
    const publicEffects = offeredEffectsApp(
      passedRecipes,
      { mode: "public", lock: "none" },
      heldEffectPresets
    )
    const ownerEffects = offeredEffectsApp(
      passedRecipes,
      { mode: "owner", lock: "local" },
      heldEffectPresets
    )
    const idsOf = (app: typeof publicEffects) => {
      const input = app.inputs.find((one) => one.name === "effect")
      return input?.type === "choice"
        ? input.options.map((option) => option.value)
        : []
    }
    expect(idsOf(publicEffects)).not.toContain("ticket-wipe")
    expect(idsOf(ownerEffects)).toContain("ticket-wipe")
  })

  it("drops a clip effect whose adapter Comfy Cloud does not hold", () => {
    expect(heldPresets([clipFixture], heldFilesOf())).toEqual([clipFixture])
    expect(heldPresets([clipFixture], new Set())).toEqual([])
  })

  it("refuses two with one id", () => {
    const [first] = presetOrder
    expect(() => readPresets([first, first])).toThrow(/own id/)
  })

  it("names no control in a prompt, because the guide carries it", () => {
    for (const preset of heldEffectPresets) {
      expect(preset.prompt).not.toMatch(/depth|guide|grey|3D|stand-in/i)
    }
  })

  it("asks a guide effect for your photo only, and a clip effect for your clip only", () => {
    const app = appWith(allKept)
    const whenOf = (name: string) => app.inputs.find((one) => one.name === name)
    const clip = whenOf("clip")
    const image = whenOf("image")
    expect(clip?.type !== "seed" && clip?.when?.[0]).toMatchObject({
      input: "effect",
      is: ["clip-fixture"],
    })
    expect(image?.type !== "seed" && image?.when?.[0]).toMatchObject({
      input: "effect",
    })
    const resolution = whenOf("resolution")
    expect(
      resolution?.type === "choice" && resolution.bounds?.[0]?.values
    ).toEqual(["480p", "720p"])
  })
})

describe("a guide effect", () => {
  it("runs the depth guide graph with your photo, its guide and its prompt", () => {
    const bound = resolved({
      effect: "grab-and-run",
      image: [assetId],
      guide: [assetId],
      resolution: "480p",
    })
    expect(bound.workflow["200"]).toBeDefined()
    expect(valueAt(bound, "900", "string_b", "grab-and-run")).toBe(
      presetById("grab-and-run").prompt
    )
    const guide = bound.bindings.find(
      (one) => one.from === "input" && one.name === "guide"
    )
    expect(guide?.path[0]).toBe("199")
    const photo = bound.bindings.find(
      (one) => one.from === "input" && one.name === "image"
    )
    expect(photo?.path[0]).toBe("200")
  })
})

describe("a clip effect", () => {
  it.each(["clip-fixture"])(
    "runs %s's adapter, strength and prompts on your clip",
    (id) => {
      const preset = clipFixture
      if (preset.kind !== "clip") {
        throw new Error(`${id} is not a clip effect`)
      }
      const bound = resolved({ effect: id, clip: [assetId] })
      expect(valueAt(bound, "5146", "lora_name", id)).toBe(preset.adapter.file)
      expect(valueAt(bound, "5146", "strength_model", id)).toBe(
        preset.adapter.strength
      )
      expect(valueAt(bound, "5138", "text", id)).toBe(preset.prompt)
      expect(valueAt(bound, "5131", "text", id)).toBe(preset.negative)
      expect(heldFilesOf().has(preset.adapter.file)).toBe(true)
    }
  )
})

describe("the agent's draft and final", () => {
  it("holds a run of an effect above 480p for the person's yes, and no other app's", () => {
    expect(isFinalRun("effects", { resolution: "720p" })).toBe(true)
    expect(isFinalRun("effects", { resolution: "1080p" })).toBe(true)
    expect(isFinalRun("effects", { resolution: "480p" })).toBe(false)
    expect(isFinalRun("motion", { resolution: "720p" })).toBe(false)
  })

  it("tells the agent each effect's need and to draft first", () => {
    const notes = effectAgentNotes(appWith(allKept))
    for (const preset of allKept) {
      expect(notes).toContain(`${preset.id}: `)
    }
    expect(notes).toMatch(/480p first/)
  })
})
