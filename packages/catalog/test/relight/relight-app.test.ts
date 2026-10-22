import {
  comfyWorkflowAdapter,
  type HostedModel,
  hostedModelOf,
  resolveBinding,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { listWorkflows } from "#list-workflows"
import { definition } from "./relight-requests"

const briaRelight: HostedModel = {
  id: "bria/relight",
  provider: "bria",
  takes: ["image"],
  makes: ["image"],
  form: null,
}

const picture: HostedModel = {
  id: "maker/picture",
  provider: "maker",
  takes: ["text"],
  makes: ["image"],
  form: null,
}

describe("the Relight app", () => {
  it("declares the relight task and opens on the Qwen 2509 relight graph with its LoRA", () => {
    expect(appTasksOf(definition)).toEqual(["relight"])
    expect(defaultModelOf(definition)).toBe("qwen-image-edit-2509-relight")
    const opened = resolveBinding(definition.engine, { quality: "draft" })
    expect(opened.adapter).toBe(comfyWorkflowAdapter)
    expect(opened.config.models).toContain(
      "Qwen-Image-Edit-2509-Relight.safetensors"
    )
  })

  it("runs a relight model on its maker's service when you pick it", () => {
    const picked = resolveBinding(definition.engine, { model: "bria/relight" })
    expect(hostedModelOf(picked)).toBe("bria/relight")
  })

  it("lists the Qwen 2509 relight graph and the relight models, and no Qwen Image Edit 2511 relight graph", () => {
    const listed = modelsForApp(definition, [picture, briaRelight])
    expect(listed.map((model) => [model.id, model.kind, model.task])).toEqual([
      ["qwen-image-edit-2509-relight", "graph", "relight"],
      ["bria/relight", "hosted", "relight"],
    ])
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids.filter((id) => id.startsWith("relight-"))).toEqual([
      "relight-qwen-image-edit-2509",
    ])
  })
})
