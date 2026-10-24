import { describe, expect, it } from "vitest"
import { z } from "zod"
import { appDefinition } from "#app.contract"
import {
  appliedInputsOf,
  boundedInputOf,
  inputRulesOf,
} from "#input-rule.contract"
import { startRunBodyFor } from "#start-run.contract"
import { appWith, eitherApp, modeApp, modelApp } from "./rule-apps"
import { assetUuid, characterUuid } from "./sample"

type Parsed = ReturnType<ReturnType<typeof startRunBodyFor>["safeParse"]>

function messagesOf(result: Parsed): string[] {
  return result.success ? [] : result.error.issues.map((one) => one.message)
}

describe("modes, as conditions on a choice", () => {
  const body = startRunBodyFor(modeApp)

  it("requires the input of the chosen mode", () => {
    const result = body.safeParse({ inputs: { mode: "character" } })
    expect(messagesOf(result)).toEqual([
      "character is required when mode is character",
    ])
  })

  it("takes the default mode when the mode is not given", () => {
    const result = body.safeParse({ inputs: { target: "a red hat" } })
    expect(messagesOf(result)).toEqual([
      "character is required when mode is character",
      "target applies only when mode is object",
    ])
  })

  it("refuses an input of another mode", () => {
    const result = body.safeParse({
      inputs: {
        mode: "object",
        target: "a red hat",
        character: [characterUuid],
      },
    })
    expect(messagesOf(result)).toEqual([
      "character applies only when mode is character",
    ])
  })

  it("keeps only the inputs of the chosen mode", () => {
    const request = body.parse({
      inputs: { mode: "object", target: "a red hat", character: [] },
    })
    expect(request.inputs).toEqual({ mode: "object", target: "a red hat" })
  })
})

describe("bounds that depend on another input", () => {
  const body = startRunBodyFor(modelApp)

  it("fills defaults that fit the chosen model", () => {
    const request = body.parse({
      inputs: { model: "second-model", startFrame: [assetUuid] },
    })
    expect(request.inputs).toEqual({
      model: "second-model",
      startFrame: [assetUuid],
      length: 5,
      resolution: "480p",
      sound: "off",
    })
  })

  it("keeps the plain defaults when no bound applies", () => {
    expect(body.parse({ inputs: {} }).inputs).toEqual({
      model: "first-model",
      length: 5,
      resolution: "720p",
      sound: "on",
    })
  })

  it("refuses values the chosen model does not take", () => {
    const result = body.safeParse({
      inputs: {
        model: "second-model",
        startFrame: [assetUuid],
        length: 7,
        resolution: "720p",
        sound: "on",
      },
    })
    expect(messagesOf(result)).toEqual([
      "length takes 5 with these inputs",
      "resolution takes 480p with these inputs",
      "sound takes off with these inputs",
    ])
  })

  it("refuses a start frame the first model does not read", () => {
    const result = body.safeParse({
      inputs: { model: "first-model", startFrame: [assetUuid] },
    })
    expect(messagesOf(result)).toEqual([
      "startFrame applies only when model is second-model",
    ])
  })

  it("requires the start frame the second model needs", () => {
    const result = body.safeParse({ inputs: { model: "second-model" } })
    expect(messagesOf(result)).toEqual([
      "startFrame is required when model is second-model",
    ])
  })

  it("gives screens the same narrowed choices", () => {
    const rules = inputRulesOf(modelApp, { model: "second-model" })
    expect(
      rules.map((rule) => ({
        name: rule.input.name,
        allowed: rule.allowed,
        range: rule.range,
        fallback: rule.fallback,
      }))
    ).toEqual([
      {
        name: "model",
        allowed: ["first-model", "second-model"],
        range: null,
        fallback: "first-model",
      },
      { name: "startFrame", allowed: null, range: null, fallback: null },
      { name: "length", allowed: null, range: { min: 5, max: 5 }, fallback: 5 },
      { name: "resolution", allowed: ["480p"], range: null, fallback: "480p" },
      { name: "sound", allowed: ["off"], range: null, fallback: "off" },
    ])
  })

  it("still publishes a JSON schema of the inputs", () => {
    const schema = z.toJSONSchema(body, { io: "input" })
    expect(schema).toMatchObject({
      properties: {
        inputs: {
          properties: {
            startFrame: { type: "array" },
            length: { type: "number" },
          },
        },
      },
    })
  })
})

describe("a condition on whether an asset input is filled", () => {
  const body = startRunBodyFor(eitherApp)

  it("takes references or a character, not both", () => {
    expect(
      body.safeParse({
        inputs: { prompt: "a door", character: [characterUuid] },
      }).success
    ).toBe(true)
    expect(
      body.safeParse({ inputs: { prompt: "a door", references: [assetUuid] } })
        .success
    ).toBe(true)
    const both = body.safeParse({
      inputs: {
        prompt: "a door",
        references: [assetUuid],
        character: [characterUuid],
      },
    })
    expect(messagesOf(both)).toEqual([
      "character applies only when references is empty",
    ])
  })
})

describe("a chain of conditions", () => {
  const chainApp = appDefinition.parse(
    appWith([
      ...modelApp.inputs.slice(0, 2),
      {
        type: "video",
        name: "clip",
        labelKey: "inputs.clip",
        presence: "optional",
        max: 1,
        when: [{ input: "startFrame", state: "empty" }],
      },
    ])
  )

  it("counts an input that does not apply as empty for the inputs after it", () => {
    const names = inputRulesOf(chainApp, {
      model: "first-model",
      startFrame: [assetUuid],
    }).map((rule) => rule.input.name)
    expect(names).toEqual(["model", "clip"])
  })
})

describe("appliedInputsOf", () => {
  it("keeps only the inputs whose conditions hold, in order", () => {
    expect(
      appliedInputsOf(modelApp, { model: "first-model" }).map(
        (input) => input.name
      )
    ).toEqual(["model", "length", "resolution", "sound"])
  })

  it("narrows a choice to its bound values and moves the default inside", () => {
    const resolution = appliedInputsOf(modelApp, {
      model: "second-model",
    }).find((input) => input.name === "resolution")
    expect(resolution?.type === "choice" && resolution.options).toEqual([
      expect.objectContaining({ value: "480p" }),
    ])
    expect(resolution?.type === "choice" && resolution.default).toBe("480p")
  })

  it("narrows a number to its bound range and clamps the default", () => {
    const length = appliedInputsOf(modelApp, { model: "second-model" }).find(
      (input) => input.name === "length"
    )
    expect(length?.type === "number" && [length.min, length.max]).toEqual([
      5, 5,
    ])
    expect(length?.type === "number" && length.default).toBe(5)
  })
})

describe("boundedInputOf", () => {
  it("leaves a choice whole when no value fits, so the problem is reported", () => {
    const [model] = modelApp.inputs
    if (model === undefined) {
      throw new Error("modelApp has no inputs")
    }
    expect(
      boundedInputOf({ input: model, allowed: [], range: null, fallback: null })
    ).toBe(model)
  })
})
