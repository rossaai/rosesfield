import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"
import { app } from "#shot/app"
import { shotCopy } from "#shot/copy.en"

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
const scene = "A dog runs on a beach"

function refusedInputs(inputs: Record<string, unknown>): string[] {
  const parsed = startRunBodyFor(definition).safeParse({ inputs })
  return parsed.success
    ? []
    : parsed.error.issues.map((issue) => String(issue.path[1]))
}

function hosted(id: string) {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes: ["text"],
    makes: ["video"],
    form: null,
  }
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

  it("passes the defaults: LTX 2.5, every choice Auto, 5 seconds at 480p with sound", () => {
    const parsed = startRunBodyFor(definition).parse({
      inputs: { prompt: scene },
    })
    expect(parsed.inputs).toMatchObject({
      model: "ltx-2-5",
      movement: "auto",
      color: "auto",
      length: 5,
      resolution: "480p",
      sound: "on",
      startFrame: [],
    })
  })

  it("takes a start frame and every movement on LTX 2.5, since each choice is words", () => {
    expect(
      refusedInputs({
        prompt: scene,
        startFrame: [frame],
        movement: "tilt-down",
        color: "black-and-white",
      })
    ).toEqual([])
  })

  it("refuses the Wan camera model and a length past Video's graphs", () => {
    expect(
      refusedInputs({ prompt: scene, model: "wan-2-2-fun-camera" })
    ).toEqual(["model"])
    expect(refusedInputs({ prompt: scene, length: 8 })).toEqual(["length"])
    expect(refusedInputs({ prompt: scene, resolution: "1080p" })).toEqual([
      "resolution",
    ])
  })
})

describe("the models Shot lists", () => {
  it("reads the text to video and image to video tasks, with LTX 2.5 as the default", () => {
    expect(appTasksOf(definition)).toEqual(["text-to-video", "image-to-video"])
    expect(defaultModelOf(definition)).toBe("ltx-2-5")
  })

  it("lists LTX 2.5 first, the catalog's video models after it, and no Wan model", () => {
    const ids = modelsForApp(definition, [
      hosted("minimax/minimax-h3"),
      hosted("wan/wan-2-2-t2v"),
      hosted("alibaba/wan2.6-t2v"),
    ]).map((model) => model.id)
    expect(ids).toEqual(["ltx-2-5", "minimax/minimax-h3"])
  })

  it("keeps no graph of its own, so both shot graphs are gone", () => {
    expect(findWorkflow("shot-ltx-2-5")).toBeNull()
    expect(findWorkflow("shot-wan-2-2-fun-camera")).toBeNull()
    expect(findWorkflow("video-ltx-2-5-text")).not.toBeNull()
  })
})
