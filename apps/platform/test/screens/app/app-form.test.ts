import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  bodyOf,
  defaultsOf,
  type FormValues,
  heldProblemsOf,
  problemsOf,
  valuesFromRun,
} from "@/screens/app/app-form"
import { assetIds, audioApp, imageApp } from "../../sample-app"

const characterId = "1b2c3d4e-5f60-4718-9a2b-3c4d5e6f7a80"

function filled(change: Partial<FormValues["inputs"]>): FormValues {
  const values = defaultsOf(imageApp())
  return {
    ...values,
    inputs: {
      ...values.inputs,
      prompt: "A red bicycle",
      character: [characterId],
      ...change,
    },
  }
}

describe("defaultsOf", () => {
  it("starts every input at its default and the output at its own", () => {
    const values = defaultsOf(imageApp())
    expect(values.inputs).toEqual({
      prompt: "",
      references: [],
      character: [],
      steps: 20,
      seed: undefined,
    })
    expect(values.count).toBe(1)
    expect(values.aspectRatio).toBe("16:9")
    expect(values.seedMode).toBe("random")
  })
})

describe("bodyOf", () => {
  it("sends the seed only when it is fixed", () => {
    const random = bodyOf(imageApp(), filled({ seed: 42 }))
    expect(random.inputs).not.toHaveProperty("seed")
    const fixed = bodyOf(imageApp(), {
      ...filled({ seed: 42 }),
      seedMode: "fixed",
    })
    expect(fixed.inputs.seed).toBe(42)
  })

  it("sends the count and the format for an image app", () => {
    const body = bodyOf(imageApp(), { ...filled({}), count: 3 })
    expect(body.count).toBe(3)
    expect(body.aspectRatio).toBe("16:9")
  })

  it("leaves out an empty optional prompt, the count and the format for audio", () => {
    const body = bodyOf(audioApp(), defaultsOf(audioApp()))
    expect(body).toEqual({ inputs: {} })
  })
})

describe("problemsOf", () => {
  it("finds no problem in a filled form", () => {
    expect(problemsOf(imageApp(), filled({}))).toEqual([])
  })

  it("names an empty required prompt first", () => {
    const problems = problemsOf(imageApp(), filled({ prompt: "  " }))
    expect(problems[0]).toEqual({
      name: "prompt",
      key: "field.prompt.required",
      values: {},
    })
  })

  it("names a prompt past its length, too many assets and a missing character", () => {
    const problems = problemsOf(
      imageApp(),
      filled({ prompt: "x".repeat(21), references: assetIds, character: [] })
    )
    expect(problems.map((problem) => problem.key)).toEqual([
      "field.prompt.count",
      "field.asset.tooMany",
      "field.character.required",
    ])
  })

  it("asks, in the form a screen checks, for a required input only while its condition holds", () => {
    const base = imageApp()
    const app = {
      ...base,
      inputs: base.inputs.map((input) =>
        input.name === "character"
          ? {
              ...input,
              when: [{ input: "references", state: "filled" as const }],
            }
          : input
      ),
    }
    expect(heldProblemsOf(app, filled({ character: [] }))).toEqual([])
    expect(problemsOf(app, filled({ character: [] }))).toHaveLength(1)
    expect(
      heldProblemsOf(
        app,
        filled({ character: [], references: assetIds.slice(0, 1) })
      )
    ).toHaveLength(1)
  })

  it("names a number outside its bounds", () => {
    const problems = problemsOf(imageApp(), filled({ steps: 51 }))
    expect(problems).toEqual([
      {
        name: "steps",
        key: "field.number.outOfRange",
        values: { min: 1, max: 50 },
      },
    ])
  })
})

describe("valuesFromRun", () => {
  it("fills the form with a run's inputs and fixes its seed", () => {
    const record: Run = run.parse({
      id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
      appId: "sample-image",
      status: "done",
      inputs: {
        prompt: "A lake",
        references: [assetIds[0]],
        character: [characterId],
        steps: 30,
      },
      count: 2,
      aspectRatio: "1:1",
      seed: 77,
      outputs: [],
      progress: null,
      engine: { adapter: "demo", models: [], workflowHash: null },
      cost: null,
      origin: "demo",
      failure: null,
      createdAt: "2026-10-17T10:00:00.000Z",
      finishedAt: "2026-10-17T10:00:03.000Z",
    })
    const values = valuesFromRun(imageApp(), record)
    expect(values.inputs).toEqual({
      prompt: "A lake",
      references: [assetIds[0]],
      character: [characterId],
      steps: 30,
      seed: 77,
    })
    expect(values.seedMode).toBe("fixed")
    expect(values.count).toBe(2)
    expect(values.aspectRatio).toBe("1:1")
  })
})
