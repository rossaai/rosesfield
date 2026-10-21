import {
  type AppDefinition,
  appDefinition,
  type InputDefinition,
  inputRulesOf,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { editCopy } from "#edit/copy.en"
import { imageCopy } from "#image/copy.en"
import { app } from "#layers/app"
import { layersCopy } from "#layers/copy.en"
import { relightCopy } from "#relight/copy.en"

const image = "0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"
const mask = "1b2c3d4e-5f6a-4b7c-9d8e-9fa0b1c2d3e4"

const definition = appDefinition.parse(app)

const platformKeys = new Set([
  "choice.auto",
  "choice.quality.draft",
  "choice.quality.final",
])

const catalogRows: Readonly<Record<string, string>> = {
  ...imageCopy,
  ...editCopy,
  ...relightCopy,
  ...layersCopy,
}

const owedRows = [
  "layers.model.qwenImageLayered",
  "layers.model.qwenImageInpaint",
]

function missingKeys(
  read: AppDefinition,
  rows: Readonly<Record<string, string>>
): string[] {
  const keys = [
    read.nameKey,
    ...read.inputs.flatMap((input) => [
      input.labelKey,
      ...(input.type === "choice"
        ? input.options.map((option) => option.labelKey)
        : []),
    ]),
  ]
  return [...new Set(keys)].filter(
    (key) => !Object.hasOwn(rows, key) && !platformKeys.has(key)
  )
}

function withoutRules(input: InputDefinition): InputDefinition {
  switch (input.type) {
    case "seed":
      return input
    case "choice": {
      const { when: _, bounds: _bounds, ...rest } = input
      const options = rest.options.map(({ count: _count, ...option }) => option)
      return { ...rest, options }
    }
    case "number":
    case "toggle": {
      const { when: _, bounds: _bounds, ...rest } = input
      return rest
    }
    default: {
      const { when: _, ...rest } = input
      return { ...rest, presence: "optional" }
    }
  }
}

function withoutModeRules(app: AppDefinition): AppDefinition {
  return { ...app, inputs: app.inputs.map(withoutRules) }
}

function parse(app: AppDefinition, body: unknown) {
  return startRunBodyFor(app).safeParse(body)
}

const refused: ReadonlyArray<{ name: string; body: unknown }> = [
  { name: "a split with no image", body: { inputs: {} } },
  {
    name: "a split of 1 layer",
    body: { inputs: { source: [image], count: "1" }, count: 1 },
  },
  {
    name: "a split whose count differs from its layer count",
    body: { inputs: { source: [image], count: "4" }, count: 6 },
  },
  {
    name: "a split that names a layer",
    body: { inputs: { source: [image], layer: [image] } },
  },
  {
    name: "a split that asks for a light",
    body: { inputs: { source: [image], light: "top" } },
  },
  {
    name: "an edit with no layer",
    body: { inputs: { mode: "edit", change: "a red hat" }, count: 1 },
  },
  {
    name: "an edit with no change",
    body: { inputs: { mode: "edit", layer: [image] }, count: 1 },
  },
  {
    name: "an edit of 5 outputs",
    body: {
      inputs: { mode: "edit", layer: [image], change: "a red hat" },
      count: 5,
    },
  },
  {
    name: "an edit with a layer count of 4",
    body: {
      inputs: { mode: "edit", layer: [image], change: "a red hat", count: "4" },
    },
  },
  {
    name: "an edit that sends a source image",
    body: {
      inputs: {
        mode: "edit",
        layer: [image],
        change: "a red hat",
        source: [image],
      },
    },
  },
  {
    name: "a relight that sends a change",
    body: { inputs: { mode: "relight", layer: [image], change: "x" } },
  },
  {
    name: "a fill with no mask",
    body: { inputs: { mode: "fill", layer: [image] } },
  },
  {
    name: "an edit that names the split graph",
    body: {
      inputs: {
        mode: "edit",
        layer: [image],
        change: "a red hat",
        model: "qwen-image-layered",
      },
    },
  },
  {
    name: "a split that names the fill graph",
    body: { inputs: { source: [image], model: "qwen-image-inpaint" } },
  },
  {
    name: "a fill that asks for a tone",
    body: {
      inputs: { mode: "fill", layer: [image], mask: [mask], tone: "warm" },
    },
  },
]

describe("the Layers definition holds its modes", () => {
  it.each(refused)("refuses $name", ({ body }) => {
    expect(parse(definition, body).success).toBe(false)
  })

  it.each(refused)(
    "control: the definition without its mode rules accepts $name",
    ({ body }) => {
      expect(parse(withoutModeRules(definition), body).success).toBe(true)
    }
  )

  it("fills a split with 4 layers and keeps no input of another mode", () => {
    const parsed = startRunBodyFor(definition).parse({
      inputs: { source: [image] },
    })
    expect(parsed.count).toBe(4)
    expect(parsed.inputs).toEqual({
      mode: "split",
      model: "qwen-image-layered",
      count: "4",
      source: [image],
      quality: "draft",
    })
  })

  it("takes 2 to 8 layers in a split, each as the run's count", () => {
    for (const layers of [2, 3, 4, 5, 6, 7, 8]) {
      const parsed = startRunBodyFor(definition).parse({
        inputs: { source: [image], count: String(layers) },
      })
      expect(parsed.count).toBe(layers)
    }
  })

  it("makes 1 output in each one-layer mode and fills that mode's defaults", () => {
    const relight = startRunBodyFor(definition).parse({
      inputs: { mode: "relight", layer: [image] },
    })
    expect(relight.count).toBe(1)
    expect(relight.inputs).toEqual({
      mode: "relight",
      model: "qwen-image-edit-2509-relight",
      count: "1",
      layer: [image],
      light: "left",
      tone: "auto",
      quality: "draft",
    })
    const fill = startRunBodyFor(definition).parse({
      inputs: { mode: "fill", layer: [image], mask: [mask] },
      count: 1,
    })
    expect(fill.count).toBe(1)
    expect(fill.inputs).toEqual({
      mode: "fill",
      model: "qwen-image-inpaint",
      count: "1",
      layer: [image],
      mask: [mask],
      quality: "draft",
    })
  })

  it("opens each mode on its own graph", () => {
    const opened = (["split", "edit", "relight", "fill"] as const).map(
      (mode) =>
        inputRulesOf(definition, { mode }).find(
          (rule) => rule.input.name === "model"
        )?.fallback
    )
    expect(opened).toEqual([
      "qwen-image-layered",
      "qwen-image-edit-2511",
      "qwen-image-edit-2509-relight",
      "qwen-image-inpaint",
    ])
  })

  it("has an English row for every label key but the two model rows the registry owes, and finds a planted missing key, the control", () => {
    expect(missingKeys(definition, catalogRows)).toEqual(owedRows)
    const { "relight.model.qwenImageEdit2509Relight": _, ...planted } =
      catalogRows
    expect(missingKeys(definition, planted)).toEqual([
      "layers.model.qwenImageLayered",
      "relight.model.qwenImageEdit2509Relight",
      "layers.model.qwenImageInpaint",
    ])
  })
})
