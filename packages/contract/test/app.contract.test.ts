import { describe, expect, it } from "vitest"
import type { z } from "zod"
import { appDefinition, appListing } from "#app.contract"
import { assetKind } from "#asset.contract"
import { sampleApp } from "./sample"

type AppInput = z.input<typeof appDefinition>
type InputInput = AppInput["inputs"][number]
type OutputInput = AppInput["output"]

function withInputs(inputs: AppInput["inputs"]): AppInput {
  return { ...sampleApp(), inputs }
}

function issuePaths(app: unknown): string[] {
  const result = appDefinition.safeParse(app)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

describe("appDefinition", () => {
  it("parses an app with one input of each type and sets no preview", () => {
    const app = appDefinition.parse(sampleApp())
    expect(app.inputs.map((input) => input.type)).toEqual([
      "prompt",
      "image",
      "video",
      "audio",
      "character",
      "choice",
      "number",
      "toggle",
      "seed",
    ])
    expect(app.preview).toBeNull()
  })

  it("refuses two inputs with the same name", () => {
    const prompt = sampleApp().inputs[0]!
    expect(issuePaths(withInputs([prompt, prompt]))).toEqual(["inputs.1.name"])
  })

  it("refuses a second seed input", () => {
    expect(
      issuePaths(
        withInputs([
          { type: "seed", name: "seed", labelKey: "inputs.seed" },
          { type: "seed", name: "otherSeed", labelKey: "inputs.seed" },
        ])
      )
    ).toEqual(["inputs"])
  })

  it("refuses a key the definition does not know", () => {
    const app = { ...sampleApp(), inputz: [] }
    expect(issuePaths(app)).toEqual([""])
  })

  it("refuses a name copy key written as a sentence", () => {
    expect(issuePaths({ ...sampleApp(), nameKey: "Sample app" })).toEqual([
      "nameKey",
    ])
  })
})

describe("choice input", () => {
  const options = [
    { value: "draft", labelKey: "quality.draft" },
    { value: "final", labelKey: "quality.final" },
  ]

  it("refuses a default that is not one of its options", () => {
    const choice: InputInput = {
      type: "choice",
      name: "quality",
      labelKey: "inputs.quality",
      options,
      default: "best",
    }
    expect(issuePaths(withInputs([choice]))).toEqual(["inputs.0.default"])
  })

  it("refuses two options with the same value", () => {
    const choice: InputInput = {
      type: "choice",
      name: "quality",
      labelKey: "inputs.quality",
      options: [options[0]!, options[0]!],
      default: "draft",
    }
    expect(issuePaths(withInputs([choice]))).toEqual(["inputs.0.options"])
  })
})

describe("number input", () => {
  const strength: Extract<InputInput, { type: "number" }> = {
    type: "number",
    name: "strength",
    labelKey: "inputs.strength",
    min: 0,
    max: 1,
    step: 0.25,
    default: 0.5,
  }

  it("refuses a default outside its bounds", () => {
    const input: InputInput = { ...strength, default: 2 }
    expect(issuePaths(withInputs([input]))).toContain("inputs.0.default")
  })

  it("refuses bounds that are not multiples of its step", () => {
    const input: InputInput = { ...strength, max: 0.9 }
    expect(issuePaths(withInputs([input]))).toEqual(["inputs.0"])
  })
})

describe("app output", () => {
  it("refuses a default count above its max", () => {
    const app = sampleApp()
    const output = { ...app.output, count: { default: 5, max: 4 } }
    expect(issuePaths({ ...app, output })).toEqual(["output.count.default"])
  })

  it("refuses a default aspect ratio outside its options", () => {
    const output: OutputInput = {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["16:9"], default: "9:16" },
    }
    expect(issuePaths({ ...sampleApp(), output })).toEqual([
      "output.aspectRatios.default",
    ])
  })

  it("refuses aspect ratios on an audio output", () => {
    const output = {
      kind: "audio",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    }
    expect(issuePaths({ ...sampleApp(), output })).toEqual(["output"])
  })

  it.each(assetKind.options)("accepts an output of kind %s", (kind) => {
    const count = { default: 1, max: 1 }
    const output =
      kind === "image" || kind === "video"
        ? { kind, count, aspectRatios: { options: ["1:1"], default: "1:1" } }
        : { kind, count }
    expect(issuePaths({ ...sampleApp(), output })).toEqual([])
  })
})

describe("appListing", () => {
  it("lists an app without its engine binding", () => {
    const listing = appListing.parse(appDefinition.parse(sampleApp()))
    expect(listing.id).toBe("sample")
    expect("engine" in listing).toBe(false)
  })
})
