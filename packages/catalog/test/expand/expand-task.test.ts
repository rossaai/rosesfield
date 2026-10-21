import { appDefinition } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import {
  comfyWorkflowAdapter,
  hostedModelOf,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { app } from "#expand/app"
import { formatCheckOf } from "#expand/expand-plan"

const definition = appDefinition.parse(app)

function hosted(id: string) {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes: ["image"],
    makes: ["image"],
    form: null,
  }
}

const router = [
  hosted("bfl/flux-pro-1.0-expand"),
  hosted("bria/remove-background"),
  hosted("bfl/flux-3-image"),
]

describe("Expand's task and default", () => {
  it("declares the expand task and opens on the Qwen Image expand graph", () => {
    expect(appTasksOf(definition)).toEqual(["expand"])
    expect(defaultModelOf(definition)).toBe("qwen-image-inpaint")
    const model = definition.inputs.find((input) => input.name === "model")
    expect(model).toMatchObject({
      type: "choice",
      default: "qwen-image-inpaint",
    })
  })

  it("lists the Qwen Image graph first and FLUX.1 Expand one choice after it", () => {
    const models = modelsForApp(definition, router)
    expect(models.map((one) => [one.kind, one.id])).toEqual([
      ["graph", "qwen-image-inpaint"],
      ["hosted", "bfl/flux-pro-1.0-expand"],
    ])
  })

  it("runs FLUX.1 Expand as that model and the default as the format graph", () => {
    const flux = resolveBinding(definition.engine, {
      model: "bfl/flux-pro-1.0-expand",
    })
    expect(hostedModelOf(flux)).toBe("bfl/flux-pro-1.0-expand")
    const graph = resolveBinding(definition.engine, {
      mode: "format",
      photo: [],
      aspect: "9-16",
    })
    expect(graph.adapter).toBe(comfyWorkflowAdapter)
  })
})

describe("9:16 for a 1:1 photo", () => {
  it("keeps the photo whole in the middle of a canvas within 2% of 9:16", () => {
    const check = formatCheckOf({ width: 1024, height: 1024 }, "9:16")
    if (check.state !== "fits") {
      throw new Error(`The check answered ${check.state}`)
    }
    const { canvas, photo, pads } = check.plan
    expect(Math.abs(canvas.width / canvas.height / (9 / 16) - 1)).toBeLessThan(
      0.02
    )
    expect(photo.width).toBe(canvas.width)
    expect(photo.width).toBe(photo.height)
    expect([pads.left, pads.right]).toEqual([0, 0])
    expect(Math.abs(pads.top - pads.bottom)).toBeLessThanOrEqual(1)
    expect(pads.top + photo.height + pads.bottom).toBe(canvas.height)
  })
})
