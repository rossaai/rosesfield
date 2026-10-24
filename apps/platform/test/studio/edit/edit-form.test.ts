import type { ModelField } from "@rosesfield/catalog/comfy"
import { type AppListing, appListing } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { appliedApp } from "@/screens/app/app-form"
import {
  chipNamesOf,
  extraSlotOf,
  imageSlotsOf,
  ratioFor,
  slotMoveOf,
} from "@/studio/edit/edit-form"
import type { EditTool } from "@/studio/edit/edit-tools"
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

  it("shows a chip for each setting that applies, and none for the photo, the seed or the model", () => {
    const app = toolApp()
    expect(chipNamesOf(app, { mode: "set" })).toEqual(["mode", "aspect"])
    expect(chipNamesOf(app, { mode: "single" })).toEqual([
      "mode",
      "side",
      "aspect",
    ])
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
      { name: "images", max: 4 },
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
    const tool: EditTool = { id: "angles", ratio: "photo" }
    expect(ratioFor(tool, toolApp(), {}, { width: 1080, height: 1920 })).toBe(
      "9:16"
    )
    expect(ratioFor(tool, toolApp(), {}, null)).toBeNull()
  })

  it("follows the chosen format on a format tool, when the format is one of the output's ratios", () => {
    const tool: EditTool = { id: "expand", ratio: "format" }
    const size = { width: 1000, height: 1000 }
    expect(ratioFor(tool, toolApp(), { aspect: "9-16" }, size)).toBe("9:16")
    expect(ratioFor(tool, toolApp(), { aspect: "2-1" }, size)).toBeNull()
  })
})
