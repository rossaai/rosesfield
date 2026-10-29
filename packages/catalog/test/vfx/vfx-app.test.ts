import { appDefinition, type RunInputs } from "@rosesfield/contract"
import {
  type ComfyWorkflowConfig,
  parseComfyWorkflow,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { heldFilesOf } from "#comfy/cloud-weights"
import { vfxApp } from "#vfx/app"
import { isFinalRun, vfxAgentNotes } from "#vfx/vfx-agent"
import type { VfxPreset } from "#vfx/vfx-preset.contract"
import {
  heldPresets,
  offeredPresets,
  presetOrder,
  readPresets,
} from "#vfx/vfx-presets"

type Bound = ComfyWorkflowConfig

const assetId = assetIdFormat.parse("0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a")

function resolved(inputs: RunInputs): Bound {
  const app = appDefinition.parse(vfxApp(offeredPresets))
  return parseComfyWorkflow(resolveBinding(app.engine, inputs))
}

function valueAt(bound: Bound, node: string, name: string, preset: string) {
  const binding = bound.bindings.find(
    (one) => one.path[0] === node && one.path.at(-1) === name
  )
  if (binding === undefined || binding.from !== "input") {
    throw new Error(`No input binding sets ${node}.${name}`)
  }
  return binding.map?.[preset]
}

function presetById(id: string): VfxPreset {
  const preset = offeredPresets.find((one) => one.id === id)
  if (preset === undefined) {
    throw new Error(`${id} is not offered`)
  }
  return preset
}

describe("the VFX presets", () => {
  it("offers the three photo presets and the three clip presets Comfy Cloud holds", () => {
    expect(offeredPresets.map((one) => one.id)).toEqual([
      "flip-into-a-new-place",
      "ticket-wipe",
      "grab-and-run",
      "flood-the-street",
      "day-to-night",
      "vanish",
    ])
  })

  it("drops a clip preset whose adapter Comfy Cloud does not hold", () => {
    const held = new Set(
      [...heldFilesOf()].filter(
        (file) => file !== "ltx-2.3-22b-ic-lora-clean-plate-1.0.safetensors"
      )
    )
    expect(heldPresets(presetOrder, held).map((one) => one.id)).not.toContain(
      "vanish"
    )
  })

  it("refuses two presets with one id", () => {
    const [first] = presetOrder
    expect(() => readPresets([first, first])).toThrow(/own id/)
  })

  it("names no control in a prompt, because the guide carries it", () => {
    for (const preset of offeredPresets) {
      expect(preset.prompt).not.toMatch(/depth|guide|grey|3D|stand-in/i)
    }
  })
})

describe("a photo preset", () => {
  it("runs the depth guide graph with your photo, its guide and its prompt", () => {
    const bound = resolved({
      preset: "grab-and-run",
      photo: [assetId],
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
    const shortSide = bound.bindings.find(
      (one) => one.from === "input" && one.name === "resolution"
    )
    expect(shortSide?.from === "input" && shortSide.map?.["480p"]).toBe(448)
  })
})

describe("a clip preset", () => {
  it.each(["flood-the-street", "day-to-night", "vanish"])(
    "runs %s's adapter, strength and prompts on your clip",
    (id) => {
      const preset = presetById(id)
      if (preset.kind !== "clip") {
        throw new Error(`${id} is not a clip preset`)
      }
      const bound = resolved({ preset: id, clip: [assetId] })
      expect(valueAt(bound, "5146", "lora_name", id)).toBe(preset.adapter.file)
      expect(valueAt(bound, "5146", "strength_model", id)).toBe(
        preset.adapter.strength
      )
      expect(valueAt(bound, "5138", "text", id)).toBe(preset.prompt)
      expect(valueAt(bound, "5131", "text", id)).toBe(preset.negative)
      expect(heldFilesOf().has(preset.adapter.file)).toBe(true)
    }
  )

  it("puts the trigger of the water adapter before its scene", () => {
    expect(presetById("flood-the-street").prompt).toMatch(/\nADD WATER /)
  })
})

describe("the agent's draft and final", () => {
  it("drafts at 480p by default", () => {
    const app = appDefinition.parse(vfxApp(offeredPresets))
    const resolution = app.inputs.find((one) => one.name === "resolution")
    expect(resolution?.type === "choice" && resolution.default).toBe("480p")
  })

  it("holds a 720p run of a preset for the person's yes, and no other app's", () => {
    expect(isFinalRun("vfx", { resolution: "720p" })).toBe(true)
    expect(isFinalRun("vfx", { resolution: "480p" })).toBe(false)
    expect(isFinalRun("motion", { resolution: "720p" })).toBe(false)
  })

  it("tells the agent each preset's need", () => {
    const notes = vfxAgentNotes()
    for (const preset of offeredPresets) {
      expect(notes).toContain(`${preset.id}: `)
    }
    expect(notes).toMatch(/480p draft first/)
  })
})
