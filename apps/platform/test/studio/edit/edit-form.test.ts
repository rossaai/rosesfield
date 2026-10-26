import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { appliedApp } from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import {
  extraSlotOf,
  hasModelChoice,
  imageSlotsOf,
  ratioFor,
  slotMoveOf,
  toolChipsOf,
} from "@/studio/edit/edit-form"
import { type EditTool, editToolOf } from "@/studio/edit/edit-tools"
import { assetIds } from "../../sample-app"

const [photo = "", other = ""] = assetIds

function toolApp(): AppListing {
  return appListing.parse({
    id: "angles",
    nameKey: "angles.name",
    category: "image",
    inputs: [
      {
        type: "choice",
        name: "mode",
        labelKey: "angles.input.mode.label",
        options: [
          { value: "set", labelKey: "angles.choice.mode.set" },
          { value: "single", labelKey: "angles.choice.mode.single" },
        ],
        default: "set",
      },
      {
        type: "image",
        name: "person",
        labelKey: "angles.input.image.label",
        presence: "required",
        max: 1,
      },
      {
        type: "image",
        name: "clothes",
        labelKey: "angles.input.image.label",
        presence: "optional",
        max: 1,
      },
      {
        type: "choice",
        name: "side",
        labelKey: "angles.input.side.label",
        options: [{ value: "back", labelKey: "angles.choice.side.back" }],
        default: "back",
        when: [{ input: "mode", is: ["single"] }],
      },
      {
        type: "choice",
        name: "aspect",
        labelKey: "angles.input.aspect.label",
        options: [
          { value: "9-16", labelKey: "angles.choice.aspect.a" },
          { value: "2-1", labelKey: "angles.choice.aspect.b" },
        ],
        default: "9-16",
      },
      { type: "seed", name: "seed", labelKey: "field.seed.label" },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1", "3:4", "9:16"], default: "1:1" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 1 },
    preview: null,
  })
}

function fixedModeApp(): AppListing {
  return appListing.parse({
    ...toolApp(),
    inputs: [
      {
        type: "choice",
        name: "mode",
        labelKey: "angles.input.mode.label",
        options: [
          { value: "set", labelKey: "angles.choice.mode.set", count: 4 },
          { value: "single", labelKey: "angles.choice.mode.single", count: 1 },
        ],
        default: "set",
      },
      { type: "seed", name: "seed", labelKey: "field.seed.label" },
    ],
  })
}

function resolutionApp(): AppListing {
  return appListing.parse({
    ...toolApp(),
    id: "edit",
    inputs: [
      {
        type: "choice",
        name: "resolution",
        labelKey: "edit.input.resolution.label",
        options: [
          { value: "small", labelKey: "edit.choice.resolution.small" },
          { value: "full", labelKey: "edit.choice.resolution.full" },
        ],
        default: "full",
      },
    ],
  })
}

const catalogModel: CatalogModel = {
  id: "qwen-image-edit-2511",
  kind: "graph",
  maker: "Qwen",
  name: "Qwen Image Edit 2511",
  nameKey: null,
  task: "image-edit",
  tags: [],
  form: null,
}

const hostedFields: ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: null,
    default: null,
  },
  {
    kind: "media",
    name: "images",
    path: "images",
    required: true,
    media: "image",
    min: 1,
    max: 4,
  },
]

describe("the inputs a tool sends", () => {
  it("drops an input whose condition fails, so the run carries only the inputs that apply", () => {
    const app = toolApp()
    const namesIn = (mode: string): string[] =>
      appliedApp(app, { mode }).inputs.map((one) => one.name)
    const inSet = namesIn("set")
    const inSingle = namesIn("single")
    expect(inSet).not.toContain("side")
    expect(inSingle).toContain("side")
  })
})

describe("the chips of a tool on a graph model", () => {
  it("puts the mode first, then a chip for each setting that applies, and none for the photo or the model", () => {
    const tool = editToolOf("angles")
    const inSet = toolChipsOf(tool, toolApp(), { mode: "set" })
    expect(inSet.mode).toBe("mode")
    expect(inSet.main).toEqual(["aspect"])
    const inSingle = toolChipsOf(tool, toolApp(), { mode: "single" })
    expect(inSingle.main).toEqual(["aspect", "side"])
  })

  it("puts the seed under Advanced, so a fixed seed can be set", () => {
    const chips = toolChipsOf(editToolOf("angles"), toolApp(), {})
    expect(chips.advanced).toEqual([
      { kind: "input", input: expect.objectContaining({ name: "seed" }) },
    ])
    expect(chips.main).not.toContain("seed")
  })

  it("draws the one count stepper, and none when the mode fixes the count", () => {
    expect(toolChipsOf(editToolOf("angles"), toolApp(), {}).hasCount).toBe(true)
    const fixed = fixedModeApp()
    expect(toolChipsOf(editToolOf("angles"), fixed, {}).hasCount).toBe(false)
    expect(
      toolChipsOf(editToolOf("angles"), fixed, {}).advanced.map(
        (one) => one.kind
      )
    ).not.toContain("count")
  })

  it("moves a folded setting under Advanced", () => {
    const tool: EditTool = { ...editToolOf("angles"), folded: ["aspect"] }
    const chips = toolChipsOf(tool, toolApp(), {})
    expect(chips.main).toEqual([])
    expect(
      chips.advanced.map((one) => one.kind === "input" && one.input.name)
    ).toEqual(["aspect", "seed"])
  })

  it("names Edit's size Resolution", () => {
    const chips = toolChipsOf(editToolOf("edit"), resolutionApp(), {})
    const resolution = chips.app.inputs.find((one) => one.name === "resolution")
    expect(resolution?.labelKey).toBe("model.field.resolution")
    expect(chips.main).toEqual(["resolution"])
  })
})

describe("the model chip of a tool", () => {
  const hosted = (count: number, error: Error | null): HostedState => ({
    isTaskApp: true,
    models: Array.from({ length: count }, () => catalogModel),
    isLoading: false,
    error,
    keyState: "set",
    defaultModel: null,
    chosen: null,
    fields: null,
    choose: () => undefined,
  })

  it("shows only when two or more models are offered, or the list could not be read", () => {
    expect(hasModelChoice(hosted(1, null))).toBe(false)
    expect(hasModelChoice(hosted(0, null))).toBe(false)
    expect(hasModelChoice(hosted(2, null))).toBe(true)
    expect(hasModelChoice(hosted(0, new Error("refused")))).toBe(true)
  })
})

describe("where the photo goes", () => {
  it("puts the photo in the tool's first image input on a graph, and in the model's first image field on a hosted model", () => {
    const app = toolApp()
    expect(imageSlotsOf(app, null, {}).map((slot) => slot.name)).toEqual([
      "person",
      "clothes",
    ])
    expect(imageSlotsOf(app, hostedFields, {})).toEqual([
      { name: "images", max: 4, presence: "required" },
    ])
  })

  it("puts a second image in the next image input with room", () => {
    const slots = imageSlotsOf(toolApp(), null, {})
    expect(extraSlotOf(slots, { person: [photo] })).toBe("clothes")
    expect(extraSlotOf(slots, { person: [photo], clothes: [other] })).toBe(null)
  })

  it("places the held photo in an empty slot, adopts a photo the form brings, and leaves a matching slot alone", () => {
    expect(slotMoveOf(photo, [])).toEqual({ kind: "place", ids: [photo] })
    expect(slotMoveOf(photo, undefined)).toEqual({
      kind: "place",
      ids: [photo],
    })
    expect(slotMoveOf(null, [other])).toEqual({ kind: "adopt", photo: other })
    expect(slotMoveOf(photo, [other])).toEqual({ kind: "adopt", photo: other })
    expect(slotMoveOf(photo, [photo])).toEqual({ kind: "none" })
    expect(slotMoveOf(null, [])).toEqual({ kind: "none" })
  })
})

describe("the output ratio", () => {
  it("follows the photo on a photo tool", () => {
    const tool = editToolOf("angles")
    expect(ratioFor(tool, toolApp(), {}, { width: 1080, height: 1920 })).toBe(
      "9:16"
    )
    expect(ratioFor(tool, toolApp(), {}, null)).toBeNull()
  })

  it("follows the chosen format on a format tool, when the format is one of the output's ratios", () => {
    const tool = editToolOf("expand")
    const size = { width: 1000, height: 1000 }
    expect(ratioFor(tool, toolApp(), { aspect: "9-16" }, size)).toBe("9:16")
    expect(ratioFor(tool, toolApp(), { aspect: "2-1" }, size)).toBeNull()
  })
})
