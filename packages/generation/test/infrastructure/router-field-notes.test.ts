import { describe, expect, it } from "vitest"
import type { ModelField } from "#domain/model-form"
import { fieldsOf } from "#infrastructure/router/router-fields"
import { factsOf } from "#infrastructure/router/router-schema"
import { routerSchema } from "./fixtures/comfy-router"

function fieldsFor(properties: Record<string, unknown>): ModelField[] {
  const facts = factsOf({
    ...routerSchema({
      model: "maker/voice-2",
      takes: ["text"],
      makes: ["audio"],
      properties,
      required: [],
    }),
    components: { schemas: {} },
  })
  if (facts === null) {
    throw new Error("no facts")
  }
  return fieldsOf(facts)
}

function named(fields: readonly ModelField[], name: string): ModelField {
  const field = fields.find((one) => one.name === name)
  if (field === undefined) {
    throw new Error(`no field ${name}`)
  }
  return field
}

describe("the description a model's form publishes for a field", () => {
  it("keeps the first two sentences of a field's description, and none when the form gives none", () => {
    const fields = fieldsFor({
      speed: {
        type: "number",
        minimum: 0.7,
        maximum: 1.2,
        description:
          "Speed adjustment.   1.0 is default, values below slow down. Values above speed up.",
      },
      loop: { type: "boolean" },
    })
    expect(named(fields, "speed").description).toBe(
      "Speed adjustment. 1.0 is default, values below slow down."
    )
    expect(named(fields, "loop")).not.toHaveProperty("description")
  })

  it("drops a description longer than a tip can show", () => {
    const fields = fieldsFor({
      speed: { type: "number", description: `${"word ".repeat(80)}end.` },
    })
    expect(named(fields, "speed")).not.toHaveProperty("description")
  })
})
