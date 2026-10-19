import type { AppDefinition } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { app } from "#headshots/app"
import { promptOf } from "#headshots/comfy/headshot-words"
import { headshotsCopy } from "#headshots/copy.en"
import {
  backgrounds,
  clothesValues,
  framings,
  seedOf,
} from "#headshots/headshots-values"
import { readApps } from "#list-apps"

function readHeadshots(): AppDefinition {
  const [read] = readApps([{ folder: "headshots", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Headshots")
  }
  return read
}

const definition = readHeadshots()
const platformKeys = new Set(["field.seed.label"])

function missingKeys(
  read: AppDefinition,
  copy: Readonly<Record<string, string>>
): string[] {
  const keys = [
    read.nameKey,
    `${read.id}.line`,
    `${read.id}.empty.title`,
    ...read.inputs.flatMap((input) => [
      input.labelKey,
      ...(input.type === "choice"
        ? input.options.map((option) => option.labelKey)
        : []),
    ]),
    ...framings.map((framing) => `headshots.input.framing.note.${framing}`),
    "headshots.input.image.tooSmall",
    "headshots.input.image.badRatio",
  ]
  return keys.filter(
    (key) => !Object.hasOwn(copy, key) && !platformKeys.has(key)
  )
}

describe("the Headshots definition", () => {
  it("lists the inputs in order with their defaults", () => {
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "image",
      "background",
      "clothes",
      "framing",
      "keepGlasses",
      "seed",
    ])
    const defaults = Object.fromEntries(
      definition.inputs.flatMap((input) =>
        "default" in input ? [[input.name, input.default]] : []
      )
    )
    expect(defaults).toEqual({
      background: "grey",
      clothes: "keep",
      framing: "standard",
      keepGlasses: "on",
    })
    expect(definition.output).toEqual({
      kind: "image",
      count: { default: 2, max: 4 },
      aspectRatios: { options: ["1:1", "3:4", "4:3"], default: "1:1" },
    })
  })

  it("has a string in its copy file for every key it names", () => {
    expect(missingKeys(definition, headshotsCopy)).toEqual([])
  })

  it("finds a planted missing key, the control", () => {
    const { "headshots.choice.clothes.plainTop": _, ...planted } = headshotsCopy
    expect(missingKeys(definition, planted)).toEqual([
      "headshots.choice.clothes.plainTop",
    ])
  })
})

describe("the headshot words", () => {
  it("writes one distinct sentence for each of the 120 combinations", () => {
    const prompts = backgrounds.flatMap((background) =>
      clothesValues.flatMap((clothes) =>
        framings.flatMap((framing) =>
          (["on", "off"] as const).map((keepGlasses) =>
            promptOf({ background, clothes, framing, keepGlasses })
          )
        )
      )
    )
    expect(new Set(prompts).size).toBe(120)
    expect(
      promptOf({
        framing: "wide",
        background: "office",
        clothes: "jacket",
        keepGlasses: "off",
      })
    ).toBe(
      "Make a headshot of the person in the photo. Keep their face, hair, skin, age and expression exactly as they are. The person faces the camera in even, soft light. The frame shows the head, the shoulders and the upper chest. An office behind the person, out of focus. The person wears a jacket over a collared shirt in a muted color. The person wears no glasses."
    )
  })

  it("counts the seeds of one run modulo 2147483648", () => {
    expect([0, 1, 2, 3].map((index) => seedOf(2_147_483_646, index))).toEqual([
      2_147_483_646, 2_147_483_647, 0, 1,
    ])
  })
})
