import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import {
  countBoundsOf,
  imageFieldsOf,
  isGraphModel,
} from "@/studio/image/image-fields"
import { keptReferences } from "@/studio/image/use-reference-tray"

const fluxThree: readonly ModelField[] = [
  {
    name: "prompt",
    path: "prompt",
    required: true,
    kind: "prompt",
    maxLength: null,
    default: null,
  },
  {
    name: "images",
    path: "images",
    required: false,
    kind: "media",
    media: "image",
    min: 1,
    max: 10,
  },
  {
    name: "safetyTolerance",
    path: "safety_tolerance",
    required: false,
    kind: "number",
    min: 0,
    max: 4,
    integer: true,
    default: 2,
  },
  {
    name: "grounding",
    path: "grounding",
    required: false,
    kind: "toggle",
    default: true,
  },
  {
    name: "aspectRatio",
    path: "aspect_ratio",
    required: false,
    kind: "text",
    maxLength: null,
    default: "auto",
  },
  {
    name: "resolution",
    path: "resolution",
    required: false,
    kind: "text",
    maxLength: null,
    default: "1k",
  },
]

const grok: readonly ModelField[] = [
  {
    name: "prompt",
    path: "prompt",
    required: true,
    kind: "prompt",
    maxLength: null,
    default: null,
  },
  {
    name: "aspectRatio",
    path: "aspect_ratio",
    required: false,
    kind: "choice",
    options: ["1:1", "3:4", "4:3", "9:16", "16:9", "auto"],
    default: "auto",
  },
  {
    name: "quality",
    path: "quality",
    required: false,
    kind: "choice",
    options: ["low", "medium", "high"],
    default: null,
  },
  {
    name: "resolution",
    path: "resolution",
    required: false,
    kind: "choice",
    options: ["1k", "2k"],
    default: "1k",
  },
  {
    name: "n",
    path: "n",
    required: false,
    kind: "number",
    min: 1,
    max: 10,
    integer: true,
    default: 1,
  },
  {
    name: "size",
    path: "size",
    required: false,
    kind: "text",
    maxLength: null,
    default: null,
  },
]

function names(fields: readonly ModelField[]): string[] {
  return fields.map((field) => field.name)
}

const sizedChoice: ModelField = {
  name: "size",
  path: "size",
  required: false,
  kind: "choice",
  options: ["1024x1024", "1536x1024"],
  default: null,
}

describe("the Image bar places each field its model's schema declares", () => {
  it("puts FLUX 3 Image's references on attach and its free-text settings under the model", () => {
    const placed = imageFieldsOf(fluxThree)
    expect(placed.references?.name).toBe("images")
    expect(placed.references?.max).toBe(10)
    expect(placed.aspect).toBeNull()
    expect(placed.resolution).toBeNull()
    expect(placed.quality).toBeNull()
    expect(placed.count).toBeNull()
    expect(names(placed.rest)).toEqual([
      "safetyTolerance",
      "grounding",
      "aspectRatio",
      "resolution",
    ])
  })

  it("gives aspect, quality and resolution a chip each, as the reference shows them, and binds the count", () => {
    const placed = imageFieldsOf(grok)
    expect(placed.references).toBeNull()
    expect(placed.aspect?.name).toBe("aspectRatio")
    expect(placed.quality?.name).toBe("quality")
    expect(placed.resolution?.name).toBe("resolution")
    expect(placed.count?.name).toBe("n")
    expect(names(placed.rest)).toEqual(["size"])
    expect(imageFieldsOf([sizedChoice]).resolution?.name).toBe("size")
  })

  it("shows the count chip for a model whose count field takes at most 1", () => {
    const single: ModelField = {
      name: "n",
      path: "n",
      required: false,
      kind: "number",
      min: 1,
      max: 1,
      integer: true,
      default: 1,
    }
    const placed = imageFieldsOf([...fluxThree, single])
    expect(placed.count).toBeNull()
    expect(placed.isOneAtATime).toBe(true)
  })

  it("tells a graph from a hosted model by its id", () => {
    expect(isGraphModel("z-image-turbo")).toBe(true)
    expect(isGraphModel("bfl/flux-3-image")).toBe(false)
    expect(isGraphModel("")).toBe(false)
  })

  it("holds a count from 1 to 4 however many the model allows", () => {
    const placed = imageFieldsOf(grok)
    if (placed.count === null) {
      throw new Error("Grok declares a count")
    }
    expect(countBoundsOf(placed.count, undefined)).toEqual({
      min: 1,
      max: 4,
      value: 1,
    })
    expect(countBoundsOf(placed.count, 7).value).toBe(4)
  })
})

describe("the references a model takes", () => {
  it("keeps the files that fit the model's limit and counts the rest as refused", () => {
    const held = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
    expect(keptReferences(held, ["j", "k", "l"], 10)).toEqual({
      ids: [...held, "j"],
      refused: 2,
    })
    expect(keptReferences(held, ["a", "j"], 10)).toEqual({
      ids: [...held, "j"],
      refused: 0,
    })
    expect(keptReferences([], ["a"], 10)).toEqual({ ids: ["a"], refused: 0 })
  })
})
