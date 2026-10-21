import type { HostedModel } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { namedTasksOf, tasksOfModel } from "#comfy/model-tasks"

function hosted(id: string): HostedModel {
  return {
    id,
    provider: id.split("/")[0] ?? id,
    takes: ["text", "image"],
    makes: ["image"],
    form: null,
  }
}

describe("the layer separation and inpaint tasks", () => {
  it("give a fill model the inpaint task beside image edit", () => {
    expect(tasksOfModel(hosted("bfl/flux-pro-1.0-fill"))).toEqual([
      "text-to-image",
      "image-edit",
      "inpaint",
    ])
    expect(namedTasksOf(hosted("bfl/flux-pro-1.0-fill"))).toEqual(["inpaint"])
    expect(namedTasksOf(hosted("bria/image-edit-gen-fill"))).toEqual([
      "inpaint",
    ])
    expect(namedTasksOf(hosted("maker/qwen-image-inpaint"))).toEqual([
      "inpaint",
    ])
  })

  it("give a layer separation model the layer separation task", () => {
    expect(namedTasksOf(hosted("maker/image-layer-separation"))).toEqual([
      "layer-separation",
    ])
    expect(namedTasksOf(hosted("maker/qwen-image-layered"))).toEqual([
      "layer-separation",
    ])
  })

  it("control: a model whose name holds neither gets no named task", () => {
    expect(namedTasksOf(hosted("byteplus/seedream-5-0-pro-260628"))).toEqual(
      []
    )
    expect(namedTasksOf(hosted("a/fill"))).toEqual([])
    expect(namedTasksOf(hosted("bfl/flux-pro-1.0-expand"))).toEqual(["expand"])
  })
})
