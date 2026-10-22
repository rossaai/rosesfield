import {
  type AppDefinition,
  appDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { listApps } from "#list-apps"
import { app } from "#remake/app"
import { closeRemake, remakeClosedKey } from "#remake/close-remake"

const definition = appDefinition.parse(app)
const editId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const secondEditId = "1c2d3e4f-5061-4b7c-9d8e-0f1a2b3c4d5e"
const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"
const secondCharacterId = "3e4f5061-7283-4d9e-8f0a-2b3c4d5e6f70"

const whole = { reference: [editId], character: [characterId] }

type Body = { inputs: Record<string, unknown>; [field: string]: unknown }

const refused: readonly { name: string; body: Body }[] = [
  { name: "no reference edit", body: { inputs: { character: [characterId] } } },
  { name: "no character", body: { inputs: { reference: [editId] } } },
  {
    name: "two reference edits",
    body: { inputs: { ...whole, reference: [editId, secondEditId] } },
  },
  {
    name: "two characters",
    body: { inputs: { ...whole, character: [characterId, secondCharacterId] } },
  },
  {
    name: "instructions of 301 characters",
    body: { inputs: { ...whole, instructions: "a".repeat(301) } },
  },
  {
    name: "a choice for shots with no person outside its list",
    body: { inputs: { ...whole, otherShots: "drop" } },
  },
  {
    name: "a quality outside the shared list",
    body: { inputs: { ...whole, quality: "best" } },
  },
  {
    name: "a seed past the platform's bound",
    body: { inputs: { ...whole, seed: 2_147_483_648 } },
  },
  { name: "two videos in one run", body: { inputs: whole, count: 2 } },
  {
    name: "an aspect ratio outside the five",
    body: { inputs: whole, aspectRatio: "21:9" },
  },
  {
    name: "an input the app does not take",
    body: { inputs: { ...whole, model: "ltx-2-5" } },
  },
]

function loosened(app: AppDefinition): AppDefinition {
  return {
    ...app,
    output:
      app.output.kind === "video"
        ? {
            ...app.output,
            count: { default: 1, max: 4 },
            aspectRatios: {
              ...app.output.aspectRatios,
              options: [...app.output.aspectRatios.options, "21:9"],
            },
          }
        : app.output,
    inputs: [
      ...app.inputs.map((input) => {
        switch (input.type) {
          case "video":
          case "character":
            return { ...input, presence: "optional" as const, max: 4 }
          case "prompt":
            return { ...input, maxLength: 1000 }
          case "choice":
            return {
              ...input,
              options: [
                ...input.options,
                { value: "drop", labelKey: input.labelKey },
                { value: "best", labelKey: input.labelKey },
              ],
            }
          default:
            return input
        }
      }),
      {
        type: "choice" as const,
        name: "model",
        labelKey: "remake.name",
        options: [
          { value: "auto", labelKey: "remake.name" },
          { value: "ltx-2-5", labelKey: "remake.name" },
        ],
        default: "auto",
      },
    ],
  }
}

describe("the contract refuses the same Remake runs for every client", () => {
  it("takes a whole run and fills every default", () => {
    const parsed = startRunBodyFor(definition).parse({ inputs: whole })
    expect(parsed).toEqual({
      inputs: {
        ...whole,
        otherShots: "rebuild",
        keepSound: "on",
        quality: "draft",
      },
      count: 1,
      aspectRatio: "16:9",
    })
  })

  it("has no mode and no input that hangs on another", () => {
    expect(
      definition.inputs.filter(
        (input) =>
          input.type !== "seed" &&
          (input.when !== undefined ||
            ("bounds" in input && input.bounds !== undefined))
      )
    ).toEqual([])
  })

  it.each(refused)("refuses a run with $name", ({ body }) => {
    expect(startRunBodyFor(definition).safeParse(body).success).toBe(false)
  })

  it.each(
    refused.filter((one) => one.name !== "a seed past the platform's bound")
  )(
    "control: the definition with its bounds loosened takes a run with $name",
    ({ body }) => {
      const parsed = startRunBodyFor(loosened(definition)).safeParse(body)
      expect(parsed.error?.issues ?? []).toEqual([])
    }
  )
})

describe("Remake in the catalog", () => {
  it("is listed, open, by the catalog the server and the client read", () => {
    const listed = listApps().find((one) => one.id === "remake")
    expect(listed?.nameKey).toBe("remake.name")
    expect(listed?.closedKey).toBeNull()
  })

  it("closes with its own key where it cannot run, and leaves every other app as it is", () => {
    const listed = listApps()
    const closed = closeRemake(listed)
    expect(closed.find((one) => one.id === "remake")?.closedKey).toBe(
      remakeClosedKey
    )
    const others = closed.filter((one) => one.id !== "remake")
    expect(others).toEqual(listed.filter((one) => one.id !== "remake"))
  })
})
