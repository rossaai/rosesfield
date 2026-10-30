import { appDefinition, isAppOnly, startRunBodyFor } from "@rosesfield/contract"
import type { ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { app, photoModel, sheetModel } from "#ai-influencer/app"
import { sheetPrompt } from "#ai-influencer/sheet-prompt"
import { sheetHostedInputs, withSheetPrompt } from "#ai-influencer/sheet-run"
import { traitInputNames, traitSections } from "#ai-influencer/traits"
import { appOrder } from "#app-order"
import { listApps } from "#list-apps"

const definition = appDefinition.parse(app)

const body = startRunBodyFor(definition)

const capybara = {
  characterType: "capybara",
  gender: "man",
  hairstyle: "flat-top",
  hairColor: "black",
  outfit: "retro",
}

describe("the AI Influencer app", () => {
  it("is listed in the catalog, right after Characters", () => {
    const ids: string[] = listApps().map((one) => one.id)
    expect(ids.indexOf("ai-influencer")).toBe(ids.indexOf("characters") + 1)
    expect(appOrder.indexOf("ai-influencer")).toBe(
      appOrder.indexOf("characters") + 1
    )
  })

  it("asks one 16:9 image and opens on the model the bar was made on", () => {
    expect(definition.output).toMatchObject({
      kind: "image",
      count: { default: 1, max: 1 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    })
    const model = definition.inputs.find((input) => input.name === "model")
    expect(model?.type === "choice" ? model.default : null).toBe(sheetModel)
    expect(sheetModel).toBe("z-image-turbo")
    expect(definition.engine.config).toMatchObject({
      tasks: ["text-to-image", "image-edit"],
      default: sheetModel,
      graphTasks: { [sheetModel]: "text-to-image", [photoModel]: "image-edit" },
    })
  })

  it("offers every trait as a choice of its own, any by default, kept with the run", () => {
    const traits = definition.inputs.filter((input) =>
      traitInputNames.includes(input.name)
    )
    expect(traits.map((input) => input.name)).toEqual(traitInputNames)
    for (const input of traits) {
      expect(input.type === "choice" ? input.default : null).toBe("any")
      expect(isAppOnly(input)).toBe(true)
    }
    expect(traitInputNames).toEqual(
      expect.arrayContaining(["features1", "features2", "features3"])
    )
  })

  it("lets a person pick several features, several marks and two proportions", () => {
    const slots = Object.fromEntries(
      traitSections.map((section) => [section.name, section.slots])
    )
    expect(slots).toMatchObject({ features: 3, marks: 2, proportions: 2 })
  })

  it("offers only adult ages", () => {
    const age = traitSections.find((section) => section.name === "age")
    expect(age?.values).toEqual(["any", "young-adult", "middle-aged", "older"])
  })
})

describe("a run of AI Influencer", () => {
  it("takes the traits and the prompt they compose", () => {
    const sent = {
      inputs: withSheetPrompt({ ...capybara, model: sheetModel }),
      aspectRatio: "16:9",
    }
    const parsed = body.parse(sent)
    expect(parsed.inputs.prompt).toBe(sheetPrompt(capybara))
    expect(parsed.inputs.characterType).toBe("capybara")
    expect(parsed.aspectRatio).toBe("16:9")
  })

  it("refuses a run with no prompt", () => {
    expect(body.safeParse({ inputs: capybara }).success).toBe(false)
  })

  it("refuses a value a trait does not offer", () => {
    const sent = withSheetPrompt({ ...capybara, characterType: "dragon" })
    expect(body.safeParse({ inputs: sent }).success).toBe(false)
  })

  it("refuses another aspect than 16:9", () => {
    const sent = { inputs: withSheetPrompt(capybara), aspectRatio: "1:1" }
    expect(body.safeParse(sent).success).toBe(false)
  })

  it("refuses the edit model without a photo", () => {
    const sent = withSheetPrompt({ ...capybara, model: photoModel })
    expect(body.safeParse({ inputs: sent }).success).toBe(false)
  })
})

const hostedFields: readonly ModelField[] = [
  {
    kind: "prompt",
    name: "prompt",
    path: "prompt",
    required: true,
    maxLength: null,
    default: null,
  },
  {
    kind: "choice",
    name: "aspect_ratio",
    path: "aspect_ratio",
    required: false,
    options: ["1:1", "16:9", "9:16"],
    default: "1:1",
  },
]

describe("a run of AI Influencer on a hosted model", () => {
  it("writes the composed prompt in the model's prompt field, 16:9 in its aspect field, and keeps the traits", () => {
    expect(sheetHostedInputs(hostedFields, capybara)).toEqual({
      ...capybara,
      prompt: sheetPrompt(capybara),
      aspect_ratio: "16:9",
    })
  })
})
