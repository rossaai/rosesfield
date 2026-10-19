import {
  type AppDefinition,
  appDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { app } from "#recast/app"

const definition = appDefinition.parse(app)
const clipId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"

const characterInputs = {
  mode: "character",
  source: [clipId],
  character: [characterId],
}

const objectInputs = {
  mode: "object",
  source: [clipId],
  target: "red mug",
  prompt: "a glass of orange juice",
}

function withoutRules(app: AppDefinition): AppDefinition {
  return {
    ...app,
    inputs: app.inputs.map((input) => {
      if (input.type === "seed") {
        return input
      }
      const { when: _, ...rest } = input
      return "presence" in rest ? { ...rest, presence: "optional" } : rest
    }),
  }
}

const refused: readonly { name: string; inputs: Record<string, unknown> }[] = [
  {
    name: "a character run without a character",
    inputs: { mode: "character", source: [clipId] },
  },
  {
    name: "a character run that names an object",
    inputs: { ...characterInputs, target: "lamp" },
  },
  {
    name: "a character run that describes a replacement",
    inputs: { ...characterInputs, prompt: "a lamp" },
  },
  {
    name: "an object run without the object to change",
    inputs: { mode: "object", source: [clipId], prompt: "a lamp" },
  },
  {
    name: "an object run without what takes its place",
    inputs: { mode: "object", source: [clipId], target: "lamp" },
  },
  {
    name: "an object run that picks a character",
    inputs: { ...objectInputs, character: [characterId] },
  },
  {
    name: "an object run with a blank object name",
    inputs: { ...objectInputs, target: "   " },
  },
]

describe("the contract refuses the same Recast runs for every client", () => {
  it.each(refused)("refuses $name", ({ inputs }) => {
    expect(startRunBodyFor(definition).safeParse({ inputs }).success).toBe(
      false
    )
  })

  it.each(refused)(
    "control: the definition without its mode rules accepts $name",
    ({ inputs }) => {
      expect(
        startRunBodyFor(withoutRules(definition)).safeParse({ inputs }).success
      ).toBe(true)
    }
  )

  it("accepts one whole run in each mode and fills the shared defaults", () => {
    const character = startRunBodyFor(definition).parse({
      inputs: characterInputs,
    })
    const object = startRunBodyFor(definition).parse({ inputs: objectInputs })
    expect(character.inputs).toEqual({
      ...characterInputs,
      keepSound: "on",
      quality: "draft",
    })
    expect(object.inputs).toEqual({
      ...objectInputs,
      keepSound: "on",
      quality: "draft",
    })
  })

  it("refuses an object name past 80 characters", () => {
    const body = { inputs: { ...objectInputs, target: "a".repeat(81) } }
    expect(startRunBodyFor(definition).safeParse(body).success).toBe(false)
  })
})
