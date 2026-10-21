import type { AppDefinition } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  type HostedModel,
  hostedModelOf,
  resolveBinding,
} from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { readApps } from "#list-apps"
import { findWorkflow, listWorkflows } from "#list-workflows"
import { app } from "#try-on/app"

function readTryOn(): AppDefinition {
  const [read] = readApps([{ folder: "try-on", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Try-on")
  }
  return read
}

const definition = readTryOn()

const virtualTryOn: HostedModel = {
  id: "bfl/vto-v1",
  provider: "bfl",
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

describe("the Try-on app", () => {
  it("declares the try-on task and opens on the Qwen try-on graph", () => {
    expect(appTasksOf(definition)).toEqual(["try-on"])
    expect(defaultModelOf(definition)).toBe("qwen-image-edit-2511")
    const opened = resolveBinding(definition.engine, {})
    expect(opened.adapter).toBe(comfyWorkflowAdapter)
    expect(opened.config.workflow).toEqual(
      findWorkflow("try-on-qwen-image-edit-2511")?.graph
    )
  })

  it("runs Flux Virtual Try-On on its maker's service when you pick it", () => {
    const picked = resolveBinding(definition.engine, { model: "bfl/vto-v1" })
    expect(hostedModelOf(picked)).toBe("bfl/vto-v1")
  })

  it("lists the Qwen try-on graph first, then Flux Virtual Try-On, and no other graph or task", () => {
    const listed = modelsForApp(definition, [picture, virtualTryOn])
    expect(listed.map((model) => [model.id, model.kind, model.task])).toEqual(
      [
        ["qwen-image-edit-2511", "graph", "try-on"],
        ["bfl/vto-v1", "hosted", "try-on"],
      ]
    )
  })

  it("keeps no FLUX.2 Klein 4B or Lightning try-on graph in workflows/", () => {
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids).toContain("try-on-qwen-image-edit-2511")
    expect(ids.filter((id) => id.startsWith("try-on-"))).toEqual([
      "try-on-qwen-image-edit-2511",
    ])
  })
})
