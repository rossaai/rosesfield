import type { HostedModel, ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { namedTasksOf, taskFieldOf, tasksOfModel } from "#comfy/model-tasks"

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
    expect(namedTasksOf(hosted("byteplus/seedream-5-0-pro-260628"))).toEqual([])
    expect(namedTasksOf(hosted("a/fill"))).toEqual([])
    expect(namedTasksOf(hosted("bfl/flux-pro-1.0-expand"))).toEqual(["expand"])
  })
})

describe("a field that switches a model to a task", () => {
  const layerSwitch: ModelField = {
    kind: "toggle",
    name: "layerDecomposition",
    path: "layer_decomposition",
    required: false,
    default: false,
  }

  function withField(field: ModelField): HostedModel {
    const model = hosted("byteplus/seedream-5-0-pro-260628")
    return { ...model, form: { model: model.id, fields: [field] } }
  }

  it("gives Seedream 5.0 Pro, whose schema switches layer separation on with layer_decomposition, the layer separation task", () => {
    const seedream = withField(layerSwitch)
    expect(namedTasksOf(seedream)).toEqual(["layer-separation"])
    expect(tasksOfModel(seedream)).toEqual([
      "text-to-image",
      "image-edit",
      "layer-separation",
    ])
    expect(taskFieldOf([layerSwitch], "layer-separation")).toBe(layerSwitch)
  })

  it("control: a toggle at another path, or a text field at that path, switches no task", () => {
    const watermark = { ...layerSwitch, name: "watermark", path: "watermark" }
    const text: ModelField = {
      kind: "text",
      name: "layerDecomposition",
      path: "layer_decomposition",
      required: false,
      maxLength: null,
      default: null,
    }
    expect(namedTasksOf(withField(watermark))).toEqual([])
    expect(namedTasksOf(withField(text))).toEqual([])
    expect(taskFieldOf([watermark, text], "layer-separation")).toBeNull()
    expect(taskFieldOf([layerSwitch], "image-edit")).toBeNull()
  })
})

describe("the three-d task", () => {
  function maker(id: string, takes: string[]): HostedModel {
    return { id, provider: "maker", takes, makes: ["3d"], form: null }
  }

  it("gives a model that makes an object from text the three-d task", () => {
    expect(tasksOfModel(maker("meshy/meshy-7.1", ["text"]))).toEqual([
      "three-d",
    ])
  })

  it("gives no task to a tool that takes a 3D model, such as rigging, retopology or texturing", () => {
    expect(tasksOfModel(maker("meshy/rigging", ["3d"]))).toEqual([])
    expect(
      tasksOfModel(maker("tencent/hunyuan-3d-texture-edit", ["3d", "text"]))
    ).toEqual([])
  })
})
