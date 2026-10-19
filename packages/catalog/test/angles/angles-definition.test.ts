import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  angleSets,
  distances,
  heights,
  sides,
  viewsOf,
} from "#angles/angle-views"
import { app } from "#angles/app"
import {
  loraDistanceWords,
  loraHeightWords,
  loraPromptOf,
  loraSideWords,
} from "#angles/comfy/angle-words"
import { anglesCopy } from "#angles/copy.en"
import { readApps } from "#list-apps"

function readAngles(): AppDefinition {
  const [read] = readApps([{ folder: "angles", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Angles")
  }
  return read
}

const definition = readAngles()
const platformKeys = new Set(["field.seed.label"])

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
        ? input.options.map((option) => option.labelKey)
        : []),
    ]),
    ...angleSets.map((set) => `angles.input.angleSet.note.${set}`),
  ]
  return keys.filter(
    (key) => !Object.hasOwn(copy, key) && !platformKeys.has(key)
  )
}

describe("the Angles definition", () => {
  it("lists the inputs in order", () => {
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "mode",
      "image",
      "angleSet",
      "side",
      "height",
      "distance",
      "seed",
    ])
  })

  it("has a string in its copy file for every key it names", () => {
    expect(missingKeys(definition, anglesCopy)).toEqual([])
  })

  it("finds a planted missing key, the control", () => {
    const { "angles.choice.side.backLeft": _, ...planted } = anglesCopy
    expect(missingKeys(definition, planted)).toEqual([
      "angles.choice.side.backLeft",
    ])
  })
})

describe("the Angles run count", () => {
  const body = startRunBodyFor(definition)
  const image = ["2b4d6f8a-0c2e-4a6c-8e0b-2d4f6a8c0e2b"]

  it("makes 1 output for one view and 4 for a set when the caller sends no count", () => {
    expect(
      body.parse({ inputs: { mode: "single", side: "back", image } }).count
    ).toBe(1)
    expect(body.parse({ inputs: { mode: "set", image } }).count).toBe(4)
    expect(body.parse({ inputs: { image } }).count).toBe(4)
  })

  it("matches the count to the views each mode lists", () => {
    for (const mode of ["set", "single"]) {
      expect(body.parse({ inputs: { mode, image } }).count).toBe(
        viewsOf({ mode }).length
      )
    }
  })

  it("refuses a count the mode does not make, the control", () => {
    expect(
      body.safeParse({ inputs: { mode: "set", image }, count: 1 }).success
    ).toBe(false)
    expect(
      body.safeParse({ inputs: { mode: "single", image }, count: 4 }).success
    ).toBe(false)
  })
})

describe("the Angles mode rule", () => {
  const body = startRunBodyFor(definition)
  const image = ["2b4d6f8a-0c2e-4a6c-8e0b-2d4f6a8c0e2b"]

  it("declares the views of a set for set mode and the side and height for one view", () => {
    const whenOf = (name: string): unknown =>
      definition.inputs.find((input) => input.name === name)
    expect(whenOf("angleSet")).toMatchObject({
      when: [{ input: "mode", is: ["set"] }],
    })
    expect(whenOf("side")).toMatchObject({
      when: [{ input: "mode", is: ["single"] }],
    })
    expect(whenOf("height")).toMatchObject({
      when: [{ input: "mode", is: ["single"] }],
    })
  })

  it("fills only the inputs of the chosen mode", () => {
    expect(body.parse({ inputs: { image } }).inputs).toEqual({
      mode: "set",
      image,
      angleSet: "turnaround",
      distance: "medium",
    })
    expect(body.parse({ inputs: { mode: "single", image } }).inputs).toEqual({
      mode: "single",
      image,
      side: "back",
      height: "eye-level",
      distance: "medium",
    })
  })

  it("refuses an input of the other mode, the control", () => {
    const refused = [
      { mode: "single", image, angleSet: "heights" },
      { mode: "set", image, side: "back" },
      { image, height: "low" },
    ]
    for (const inputs of refused) {
      expect(body.safeParse({ inputs }).success).toBe(false)
    }
  })
})

describe("the view words", () => {
  it("holds words for each of the 96 views and names them in order", () => {
    const prompts = sides.flatMap((side) =>
      heights.flatMap((height) =>
        distances.map((distance) => loraPromptOf({ side, height, distance }))
      )
    )
    expect(new Set(prompts).size).toBe(96)
    expect(
      loraPromptOf({ side: "back-right", height: "high", distance: "medium" })
    ).toBe("<sks> back-right quarter view high-angle shot medium shot")
    expect(Object.keys(loraSideWords)).toEqual([...sides])
    expect(Object.keys(loraHeightWords)).toEqual([...heights])
    expect(Object.keys(loraDistanceWords)).toEqual([...distances])
  })

  it("lists 4 views for each set and 1 for one view", () => {
    for (const angleSet of angleSets) {
      expect(viewsOf({ mode: "set", angleSet })).toHaveLength(4)
    }
    expect(
      viewsOf({
        mode: "single",
        side: "left",
        height: "high",
        distance: "wide",
      })
    ).toEqual([{ side: "left", height: "high", distance: "wide" }])
  })
})
