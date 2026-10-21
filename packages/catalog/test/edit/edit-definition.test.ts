import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import {
  chosenModelOf,
  comfyWorkflowAdapter,
  hostedModelOf,
  tasksOf,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { app } from "#edit/app"
import { editCopy } from "#edit/copy.en"
import { graphModel, hostedModel } from "#edit/edit-models"
import { readApps } from "#list-apps"

function readEdit(): AppDefinition {
  const [read] = readApps([{ folder: "edit", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Edit")
  }
  return read
}

const definition = readEdit()

function missingKeys(
  read: AppDefinition,
  copy: Readonly<Record<string, string>>
): string[] {
  const keys = [
    read.nameKey,
    `${read.id}.line`,
    ...read.inputs.flatMap((input) => [
      input.labelKey,
      ...(input.type === "choice"
        ? input.options.flatMap((option) =>
            input.name === "model"
              ? [option.labelKey, `${option.labelKey}.line`]
              : [option.labelKey]
          )
        : []),
    ]),
  ]
  return keys.filter((key) => !Object.hasOwn(copy, key))
}

describe("the Edit definition", () => {
  it("lists the photo, the prompt, the model, the size and the seed in order", () => {
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "image",
      "prompt",
      "model",
      "resolution",
      "seed",
    ])
  })

  it("opens on the Qwen Image Edit 2511 graph, with FLUX 3 Image one choice away", () => {
    const model = definition.inputs.find((input) => input.name === "model")
    expect(model).toMatchObject({
      type: "choice",
      default: graphModel,
      options: [{ value: graphModel }, { value: hostedModel }],
    })
    expect(tasksOf(definition.engine)).toEqual(["image-edit"])
    expect(chosenModelOf(definition.engine, {})).toBe(graphModel)
    const hosted = resolveBinding(definition.engine, { model: hostedModel })
    const graph = resolveBinding(definition.engine, { model: graphModel })
    expect(hostedModelOf(hosted)).toBe(hostedModel)
    expect(graph.adapter).toBe(comfyWorkflowAdapter)
  })

  it("takes one PNG, JPEG or WebP photo of up to 20 MB with a short side of 480 pixels or more", () => {
    const image = definition.inputs.find((input) => input.name === "image")
    expect(image).toMatchObject({
      type: "image",
      presence: "required",
      max: 1,
      accept: {
        formats: ["image/png", "image/jpeg", "image/webp"],
        maxBytes: 20_000_000,
        minShortSide: 480,
      },
    })
  })

  it("fills the size, the model and one output when a run names only the photo and the words", () => {
    const parsed = startRunBodyFor(definition).parse({
      inputs: {
        image: ["2b4d6f8a-0c2e-4a6c-8e0b-2d4f6a8c0e2b"],
        prompt: "make the jacket red",
      },
    })
    expect(parsed.inputs).toMatchObject({
      model: graphModel,
      resolution: "full",
      prompt: "make the jacket red",
    })
    expect(parsed.count).toBe(1)
  })

  it("refuses a run with no words, a size it does not list and a Count of 5", () => {
    const photo = ["2b4d6f8a-0c2e-4a6c-8e0b-2d4f6a8c0e2b"]
    const refused = [
      { inputs: { image: photo } },
      { inputs: { image: photo, prompt: "red", resolution: "huge" } },
      { inputs: { image: photo, prompt: "red" }, count: 5 },
    ]
    for (const body of refused) {
      expect(
        startRunBodyFor(definition).safeParse(body).success,
        JSON.stringify(body)
      ).toBe(false)
    }
  })

  it("has a line in its copy for every key it names, and finds a planted missing key, the control", () => {
    expect(missingKeys(definition, editCopy)).toEqual([])
    const { "edit.choice.resolution.small": _, ...planted } = editCopy
    expect(missingKeys(definition, planted)).toEqual([
      "edit.choice.resolution.small",
    ])
  })
})
