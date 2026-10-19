import { describe, expect, it } from "vitest"
import { z } from "zod"
import { appDefinition } from "#app.contract"
import {
  fixedCountOf,
  startRunBody,
  startRunBodyFor,
} from "#start-run.contract"
import { assetUuid, characterUuid, sampleApp } from "./sample"

const body = startRunBodyFor(appDefinition.parse(sampleApp()))

const audioBody = startRunBodyFor(
  appDefinition.parse({
    ...sampleApp(),
    category: "audio",
    output: { kind: "audio", count: { default: 1, max: 1 } },
  })
)

const prompt = "a red door in fog"

function accepts(value: unknown): boolean {
  return body.safeParse(value).success
}

function withInputs(inputs: Record<string, unknown>): {
  inputs: Record<string, unknown>
} {
  return { inputs: { prompt, ...inputs } }
}

describe("startRunBodyFor", () => {
  it("fills every default from the app definition", () => {
    expect(body.parse({ inputs: { prompt } })).toEqual({
      inputs: {
        prompt,
        references: [],
        motion: [],
        voice: [],
        character: [],
        quality: "draft",
        strength: 0.5,
        upscale: "off",
      },
      count: 1,
      aspectRatio: "1:1",
    })
  })

  it("keeps the values a person chose", () => {
    const request = body.parse({
      inputs: {
        prompt,
        references: [assetUuid],
        character: [characterUuid],
        quality: "final",
        strength: 0.75,
        upscale: "on",
        seed: 42,
      },
      count: 4,
      aspectRatio: "9:16",
    })
    expect(request.inputs).toMatchObject({
      references: [assetUuid],
      character: [characterUuid],
      quality: "final",
      strength: 0.75,
      upscale: "on",
      seed: 42,
    })
    expect(request.count).toBe(4)
    expect(request.aspectRatio).toBe("9:16")
  })

  it.each([{ inputs: {} }, { inputs: { prompt: "   " } }])(
    "refuses a required prompt in %j",
    (value) => {
      expect(accepts(value)).toBe(false)
    }
  )

  it("refuses more references than the input takes", () => {
    const five = [assetUuid, assetUuid, assetUuid, assetUuid, assetUuid]
    expect(accepts(withInputs({ references: five.slice(0, 4) }))).toBe(true)
    expect(accepts(withInputs({ references: five }))).toBe(false)
  })

  it("refuses a reference that is not an id", () => {
    expect(accepts(withInputs({ references: ["photo.jpg"] }))).toBe(false)
  })

  it("refuses an input the app does not take", () => {
    expect(accepts(withInputs({ style: "soft" }))).toBe(false)
  })

  it("refuses a choice value outside its options", () => {
    expect(accepts(withInputs({ quality: "best" }))).toBe(false)
  })

  it.each([1.5, -0.05, 0.33])("refuses %d as the strength", (value) => {
    expect(accepts(withInputs({ strength: value }))).toBe(false)
  })

  it.each([-1, 2_147_483_648, 1.5])("refuses %d as the seed", (value) => {
    expect(accepts(withInputs({ seed: value }))).toBe(false)
  })

  it("refuses a count above the output max", () => {
    expect(accepts({ ...withInputs({}), count: 4 })).toBe(true)
    expect(accepts({ ...withInputs({}), count: 5 })).toBe(false)
  })

  it("refuses an aspect ratio the app does not list", () => {
    expect(accepts({ ...withInputs({}), aspectRatio: "4:3" })).toBe(false)
  })

  it("gives an app without aspect ratios a null one and refuses one sent", () => {
    expect(audioBody.parse(withInputs({})).aspectRatio).toBeNull()
    const sent = audioBody.safeParse({ ...withInputs({}), aspectRatio: "1:1" })
    expect(sent.success).toBe(false)
  })

  it("describes the body as JSON Schema for the agent and MCP", () => {
    const schema = z.toJSONSchema(body, { io: "input" })
    expect(schema).toMatchObject({
      type: "object",
      required: ["inputs"],
      additionalProperties: false,
      properties: {
        count: { type: "integer", minimum: 1, maximum: 4, default: 1 },
        aspectRatio: { enum: ["1:1", "16:9", "9:16"], default: "1:1" },
        inputs: {
          required: ["prompt"],
          additionalProperties: false,
          properties: {
            quality: { enum: ["draft", "final"], default: "draft" },
            upscale: { enum: ["on", "off"], default: "off" },
          },
        },
      },
    })
  })
})

function viewsApp(views: { set?: number; single?: number }) {
  const base = sampleApp()
  return {
    ...base,
    inputs: [
      ...base.inputs,
      {
        type: "choice" as const,
        name: "views",
        labelKey: "inputs.views",
        options: [
          { value: "set", labelKey: "views.set", count: views.set },
          { value: "single", labelKey: "views.single", count: views.single },
        ],
        default: "set",
      },
    ],
  }
}

describe("startRunBodyFor with a choice that fixes the count", () => {
  const fixed = startRunBodyFor(
    appDefinition.parse(viewsApp({ set: 4, single: 1 }))
  )

  it("takes the count from the chosen option when the body sends none", () => {
    expect(fixed.parse(withInputs({ views: "single" })).count).toBe(1)
    expect(fixed.parse(withInputs({ views: "set" })).count).toBe(4)
    expect(fixed.parse(withInputs({})).count).toBe(4)
  })

  it("keeps a count that matches the chosen option", () => {
    expect(
      fixed.parse({ ...withInputs({ views: "single" }), count: 1 }).count
    ).toBe(1)
  })

  it("refuses a count the chosen option does not make", () => {
    const single = fixed.safeParse({
      ...withInputs({ views: "single" }),
      count: 4,
    })
    expect(single.success).toBe(false)
    expect(single.error?.issues.map((issue) => issue.path)).toEqual([["count"]])
    expect(
      fixed.safeParse({ ...withInputs({ views: "set" }), count: 1 }).success
    ).toBe(false)
  })

  it("reads the fixed count for a set of inputs, and none for an app without one", () => {
    const app = appDefinition.parse(viewsApp({ set: 4, single: 1 }))
    expect(fixedCountOf(app, { views: "single" })).toBe(1)
    expect(fixedCountOf(app, {})).toBe(4)
    expect(fixedCountOf(appDefinition.parse(sampleApp()), {})).toBeNull()
  })

  it("still describes the body as JSON Schema", () => {
    const schema = z.toJSONSchema(fixed, { io: "input" })
    expect(schema).toMatchObject({
      properties: { count: { type: "integer", minimum: 1, maximum: 4 } },
    })
  })

  it("refuses a definition whose fixed count passes the max or skips an option, the control", () => {
    expect(
      appDefinition.safeParse(viewsApp({ set: 5, single: 1 })).success
    ).toBe(false)
    expect(appDefinition.safeParse(viewsApp({ set: 4 })).success).toBe(false)
    expect(
      appDefinition.safeParse(viewsApp({ set: 4, single: 1 })).success
    ).toBe(true)
  })
})

describe("startRunBody", () => {
  it("accepts a body without count or aspect ratio", () => {
    expect(startRunBody.parse(withInputs({}))).toEqual(withInputs({}))
  })

  it("refuses a key it does not know", () => {
    const result = startRunBody.safeParse({ ...withInputs({}), model: "x" })
    expect(result.success).toBe(false)
  })
})
