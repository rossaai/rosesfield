import { startRunBodyFor } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  type HostedModel,
  hostedModelOf,
  resolveBinding,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { definition, imageId, maskId } from "./layers-comfy"

function hosted(
  id: string,
  takes: readonly string[],
  makes: readonly string[]
): HostedModel {
  return { id, provider: id.split("/")[0] ?? id, takes, makes, form: null }
}

const flux = hosted("bfl/flux-3-image", ["text", "image"], ["image"])
const briaRelight = hosted("bria/relight", ["image"], ["image"])
const wanEdit = hosted("wan/wan2.6-image-edit", ["text", "image"], ["image"])
const textOnly = hosted("maker/picture", ["text"], ["image"])

function workflowOf(body: unknown): string | null {
  const parsed = startRunBodyFor(definition).parse(body)
  const binding = resolveBinding(definition.engine, parsed.inputs)
  expect(binding.adapter).toBe(comfyWorkflowAdapter)
  const graph = binding.config.workflow
  return typeof graph === "object" && graph !== null
    ? JSON.stringify(graph)
    : null
}

describe("the models of each Layers mode", () => {
  it("declares the tasks of its modes and opens on the Qwen Image Layered graph", () => {
    expect(appTasksOf(definition)).toEqual([
      "layer-separation",
      "image-edit",
      "relight",
    ])
    expect(defaultModelOf(definition)).toBe("qwen-image-layered")
  })

  it("lists the four graphs with the task of their mode, then the hosted models of those tasks, and no Wan model", () => {
    const listed = modelsForApp(definition, [
      flux,
      briaRelight,
      wanEdit,
      textOnly,
    ])
    expect(
      listed.slice(0, 5).map((model) => [model.id, model.kind, model.task])
    ).toEqual([
      ["qwen-image-layered", "graph", "layer-separation"],
      ["qwen-image-edit-2511", "graph", "image-edit"],
      ["qwen-image-edit-2509-relight", "graph", "relight"],
      ["qwen-image-inpaint", "graph", "image-edit"],
      ["bfl/flux-3-image", "hosted", "image-edit"],
    ])
    expect(listed.map((model) => model.id).slice(5)).toEqual(["bria/relight"])
  })

  it("control: the same catalog lists the Wan model once it is no longer denied", () => {
    const renamed = { ...wanEdit, id: "maker/image-edit", provider: "maker" }
    const ids = modelsForApp(definition, [renamed]).map((model) => model.id)
    expect(ids).toContain("maker/image-edit")
  })

  it("runs each mode's graph from the mode alone", () => {
    expect(workflowOf({ inputs: { source: [imageId] } })).toContain(
      "EmptyQwenImageLayeredLatentImage"
    )
    expect(
      workflowOf({
        inputs: { mode: "edit", layer: [imageId], change: "a red hat" },
      })
    ).toContain("qwen_image_edit_2511_bf16.safetensors")
    expect(
      workflowOf({ inputs: { mode: "relight", layer: [imageId] } })
    ).toContain("Qwen-Image-Edit-2509-Relight.safetensors")
    expect(
      workflowOf({ inputs: { mode: "fill", layer: [imageId], mask: [maskId] } })
    ).toContain("QwenImageDiffsynthControlnet")
  })

  it("runs a hosted model of the catalog when you pick it", () => {
    const picked = resolveBinding(definition.engine, {
      mode: "edit",
      model: "bfl/flux-3-image",
    })
    expect(hostedModelOf(picked)).toBe("bfl/flux-3-image")
  })
})
