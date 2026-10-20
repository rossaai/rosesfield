import type { InputValue } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { checkModelInputs, type ModelField } from "#domain/model-form"
import { bodyOf } from "#infrastructure/router/router-body"
import { fieldsOf } from "#infrastructure/router/router-fields"
import { factsOf } from "#infrastructure/router/router-schema"
import { routerSchema } from "./fixtures/comfy-router"

const model = "krea/krea-2-medium-turbo"

const krea = routerSchema({
  model,
  takes: ["text"],
  makes: ["image"],
  required: ["prompt", "aspect_ratio"],
  properties: {
    prompt: { type: "string" },
    aspect_ratio: { type: "string", enum: ["1:1", "16:9"] },
    creativity: {
      type: "string",
      enum: ["raw", "low", "medium", "high"],
      default: "medium",
    },
    moodboards: {
      type: "array",
      items: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
          strength: {
            type: "number",
            minimum: -0.5,
            maximum: 1.5,
            default: 0.35,
          },
        },
      },
    },
  },
})

function defaultsOf(fields: readonly ModelField[]): Record<string, InputValue> {
  return Object.fromEntries(
    fields.flatMap((field) =>
      "default" in field &&
      field.default !== null &&
      typeof field.default !== "boolean"
        ? [[field.name, field.default]]
        : []
    )
  )
}

function bodyAfterPick(): Record<string, unknown> {
  const facts = factsOf(krea)
  if (facts === null) {
    throw new Error("no facts")
  }
  const fields = fieldsOf(facts)
  const given = {
    ...defaultsOf(fields),
    prompt: "A lighthouse at dusk",
    aspectRatio: "1:1",
  }
  const checked = checkModelInputs({ model, fields }, given)
  if (checked.kind !== "valid") {
    throw new Error(checked.issues.join("; "))
  }
  return bodyOf({ model, fields }, checked.inputs, [])
}

describe("Krea 2 Medium Turbo picked with the defaults its schema gives", () => {
  it("sends no moodboard, so no moodboard goes without its id", () => {
    expect(bodyAfterPick().moodboards).toBeUndefined()
  })

  it("sends the top-level default creativity", () => {
    expect(bodyAfterPick()).toMatchObject({
      prompt: "A lighthouse at dusk",
      aspect_ratio: "1:1",
      creativity: "medium",
    })
  })
})
