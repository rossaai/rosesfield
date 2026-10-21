import type { HostedModel } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { app } from "#characters/app"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { app as imageApp } from "#image/app"
import { readApps } from "#list-apps"
import { listWorkflows } from "#list-workflows"

const [characters, image] = readApps([
  { folder: "characters", app },
  { folder: "image", app: imageApp },
])

function hosted(id: string, takes: string[]): HostedModel {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes,
    makes: ["image"],
    takesTools: false,
    form: null,
  }
}

const hostedModels: readonly HostedModel[] = [
  hosted("wan/wan2.6-t2i", ["text"]),
  hosted("maker/wan-2.5-image", ["text"]),
  hosted("bfl/flux-3-image", ["text", "image"]),
  hosted("maker/picture-1", ["text"]),
]

function listed(): string[] {
  if (characters === undefined) {
    throw new Error("The characters app did not parse")
  }
  return modelsForApp(characters, hostedModels).map((one) => one.id)
}

describe("the models of Characters", () => {
  it("opens on the catalog's open-weights default for text to image", () => {
    if (characters === undefined || image === undefined) {
      throw new Error("An app did not parse")
    }
    expect(defaultModelOf(characters)).toBe(defaultModelOf(image))
    expect(appTasksOf(characters)).toEqual(["text-to-image", "image-edit"])
  })

  it("lists the open-weights graphs of each step and the hosted models of its tasks, with no Wan model", () => {
    const ids = listed()
    expect(ids).toEqual(
      expect.arrayContaining([
        "z-image-turbo",
        "qwen-image-2512",
        "qwen-image-edit-2511",
        "bfl/flux-3-image",
        "maker/picture-1",
      ])
    )
    expect(ids.filter((id) => /wan/i.test(id))).toEqual([])
  })

  it("names each graph by the task of its step", () => {
    if (characters === undefined) {
      throw new Error("The characters app did not parse")
    }
    const graphs = modelsForApp(characters, []).map((one) => [
      one.id,
      one.task,
    ])
    expect(graphs).toEqual([
      ["z-image-turbo", "text-to-image"],
      ["qwen-image-2512", "text-to-image"],
      ["qwen-image-edit-2511", "image-edit"],
    ])
  })

  it("holds no graph of its own, so its traits and angles graphs are gone", () => {
    expect(
      listWorkflows()
        .map((one) => one.id)
        .filter((id) => id.startsWith("characters-"))
    ).toEqual([])
  })
})
