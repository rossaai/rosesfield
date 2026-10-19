import {
  type AppDefinition,
  type InputDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { readApps } from "#list-apps"
import { app } from "#shot/app"
import { shotCopy } from "#shot/copy.en"
import { shotProblems } from "#shot/shot-models"

function readShot(): AppDefinition {
  const [read] = readApps([{ folder: "shot", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Shot")
  }
  return read
}

const definition = readShot()
const platformKeys = new Set(["choice.auto"])
const frame = "5c7e9a1b-3d5f-4b7a-9c1e-3f5a7c9e1b2d"
const wanMoves = [
  "auto",
  "static",
  "push-in",
  "pull-out",
  "track-left",
  "track-right",
  "crane-up",
  "crane-down",
]

function defaultOf(input: InputDefinition): unknown {
  switch (input.type) {
    case "choice":
    case "number":
    case "toggle":
      return input.default
    case "image":
      return []
    default:
      return undefined
  }
}

function formWith(inputs: Record<string, unknown>): Record<string, unknown> {
  const values: Record<string, unknown> = { prompt: "A dog runs on a beach" }
  for (const input of definition.inputs) {
    const value = defaultOf(input)
    if (value !== undefined) {
      values[input.name] = value
    }
  }
  return { ...values, ...inputs }
}

function refusedInputs(inputs: Record<string, unknown>): string[] {
  const parsed = startRunBodyFor(definition).safeParse({ inputs })
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => String(issue.path[1]))
}

describe("the Shot definition", () => {
  it("lists the inputs in order", () => {
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "prompt",
      "startFrame",
      "model",
      "movement",
      "camera",
      "lens",
      "focus",
      "light",
      "color",
      "mood",
      "length",
      "resolution",
      "sound",
      "seed",
    ])
  })

  it("has a string in its copy file for every key it names", () => {
    const keys = [
      definition.nameKey,
      ...definition.inputs.flatMap((input) => [
        input.labelKey,
        ...(input.type === "choice"
          ? input.options.map((option) => option.labelKey)
          : []),
      ]),
    ]
    const missing = keys.filter(
      (key) => !Object.hasOwn(shotCopy, key) && !platformKeys.has(key)
    )
    expect(missing).toEqual([])
  })
})

describe("the bounds each model declares in the contract", () => {
  it("passes the defaults and fills each model's own values", () => {
    const parsed = startRunBodyFor(definition).parse({
      inputs: { prompt: "A dog runs on a beach" },
    })
    expect(parsed.inputs).toMatchObject({
      model: "ltx-2-5",
      length: 5,
      resolution: "720p",
      sound: "on",
      startFrame: [],
    })
  })

  it("picks the camera model for a start frame and leaves sound out", () => {
    const parsed = startRunBodyFor(definition).parse({
      inputs: { prompt: "A dog runs on a beach", startFrame: [frame] },
    })
    expect(parsed.inputs).toMatchObject({
      model: "wan-2-2-fun-camera",
      length: 5,
      resolution: "480p",
    })
    expect(parsed.inputs).not.toHaveProperty("sound")
  })

  it("refuses on the camera model a missing frame, pan-left, 720p, 8 seconds and sound", () => {
    expect(
      refusedInputs({
        prompt: "A dog runs on a beach",
        model: "wan-2-2-fun-camera",
        movement: "pan-left",
        resolution: "720p",
        length: 8,
        sound: "on",
      })
    ).toEqual(["model", "movement", "length", "resolution", "sound"])
  })

  it("refuses a start frame on ltx-2-5, which does not read one", () => {
    expect(
      refusedInputs({
        prompt: "A dog runs on a beach",
        model: "ltx-2-5",
        startFrame: [frame],
      })
    ).toEqual(["model"])
  })
})

describe("shotProblems", () => {
  it("finds none in the defaults", () => {
    expect(shotProblems(definition, formWith({}))).toEqual([])
  })

  it("asks for a start frame on the camera model and names what it takes", () => {
    const problems = shotProblems(
      definition,
      formWith({ model: "wan-2-2-fun-camera", movement: "pan-left" })
    )
    expect(problems).toEqual([
      { input: "startFrame", kind: "required" },
      {
        input: "movement",
        kind: "unsupported",
        model: "wan-2-2-fun-camera",
        takes: wanMoves,
      },
      expect.objectContaining({ input: "resolution", takes: ["480p"] }),
    ])
  })

  it("refuses a length the camera model cannot take and names the one it takes", () => {
    const problems = shotProblems(
      definition,
      formWith({
        model: "wan-2-2-fun-camera",
        resolution: "480p",
        length: 8,
        startFrame: [frame],
      })
    )
    expect(problems).toEqual([
      {
        input: "length",
        kind: "unsupported",
        model: "wan-2-2-fun-camera",
        takes: ["5"],
      },
    ])
  })

  it("refuses a start frame on ltx-2-5 and names the model", () => {
    expect(shotProblems(definition, formWith({ startFrame: [frame] }))).toEqual(
      [{ input: "startFrame", kind: "unread", model: "ltx-2-5" }]
    )
    expect(
      shotProblems(
        definition,
        formWith({
          model: "wan-2-2-fun-camera",
          resolution: "480p",
          startFrame: [frame],
        })
      )
    ).toEqual([])
  })

  it("takes every movement and length on ltx-2-5", () => {
    expect(
      shotProblems(definition, formWith({ movement: "pan-left", length: 10 }))
    ).toEqual([])
  })

  it("refuses exactly the runs the contract refuses", () => {
    const cases: Record<string, unknown>[] = [
      {},
      { startFrame: [frame] },
      { model: "wan-2-2-fun-camera" },
      { model: "wan-2-2-fun-camera", startFrame: [frame], resolution: "480p" },
      {
        model: "wan-2-2-fun-camera",
        startFrame: [frame],
        resolution: "480p",
        movement: "tilt-up",
      },
      { movement: "tilt-up", length: 2, resolution: "1080p" },
    ]
    for (const inputs of cases) {
      const form = formWith(inputs)
      const { sound: _, ...body } = form
      const sent = form.model === "wan-2-2-fun-camera" ? body : form
      const problems = shotProblems(definition, form)
      expect(problems.length > 0).toBe(refusedInputs(sent).length > 0)
    }
  })
})
