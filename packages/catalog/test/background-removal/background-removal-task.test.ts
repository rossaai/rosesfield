import { appDefinition } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { hostedModelOf } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { app } from "#background-removal/app"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"

const definition = appDefinition.parse(app)

function hosted(id: string, makes: string) {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes: ["image"],
    makes: [makes],
    form: null,
  }
}

const router = [
  hosted("bria/remove-background", "image"),
  hosted("bfl/flux-pro-1.0-expand", "image"),
  hosted("topaz/upscale-image", "image"),
]

describe("Remove background's task and default", () => {
  it("declares the background task and opens on the BiRefNet graph", () => {
    expect(appTasksOf(definition)).toEqual(["background"])
    expect(defaultModelOf(definition)).toBe("birefnet")
  })

  it("lists its two graphs first and then the hosted models of its task only", () => {
    const models = modelsForApp(definition, router)
    expect(models.map((one) => [one.kind, one.id])).toEqual([
      ["graph", "birefnet"],
      ["graph", "lucida"],
      ["hosted", "bria/remove-background"],
    ])
  })

  it("runs a hosted model of its task as that model", () => {
    const binding = resolveBinding(definition.engine, {
      image: [],
      model: "bria/remove-background",
    })
    expect(hostedModelOf(binding)).toBe("bria/remove-background")
  })
})
