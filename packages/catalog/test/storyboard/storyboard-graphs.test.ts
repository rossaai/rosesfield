import { appDefinition, characterReferenceMax } from "@rosesfield/contract"
import type { HostedModel } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { listWorkflows } from "#list-workflows"
import { app } from "#storyboard/app"
import { keyframeTextModel } from "#storyboard/comfy/storyboard-binding"
import { qwenFiles } from "#storyboard/comfy/storyboard-nodes"

const definition = appDefinition.parse(app)

function workflowLeaves(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(workflowLeaves)
  }
  if (typeof value !== "object" || value === null) {
    return []
  }
  const record = Object.fromEntries(Object.entries(value))
  if (record.adapter === "comfy-workflow") {
    const config = record.config
    return typeof config === "object" && config !== null
      ? [Object.fromEntries(Object.entries(config))]
      : []
  }
  return Object.values(record).flatMap(workflowLeaves)
}

describe("the graphs Storyboard runs", () => {
  it("offers Qwen Image Edit 2511 as its one edit graph and the open-weights text default for keyframe 1, and holds no FLUX.2 Klein and no Wan model", () => {
    const model = definition.inputs.find((input) => input.name === "model")
    expect(
      model?.type === "choice" ? model.options.map((one) => one.value) : []
    ).toEqual(["qwen-image-edit-2511", "z-image-turbo"])
    expect(keyframeTextModel?.value).toBe("z-image-turbo")
    const leaves = workflowLeaves(definition.engine)
    expect(leaves).toHaveLength(3 + characterReferenceMax)
    const files = leaves.flatMap((leaf) =>
      Array.isArray(leaf.models) ? leaf.models.map(String) : []
    )
    expect(files).toContain(qwenFiles.edit)
    expect(files.filter((file) => /klein|wan/i.test(file))).toEqual([])
  })

  it("lists the Storyboard edit graph and none of the three graphs it left", () => {
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids).toContain("storyboard-qwen-image-edit-2511")
    expect(
      ids.filter((id) =>
        [
          "storyboard-qwen-image-edit-2511-from-text",
          "storyboard-flux-2-klein-4b",
          "storyboard-flux-2-klein-4b-from-text",
        ].includes(id)
      )
    ).toEqual([])
  })
})

function hosted(
  id: string,
  takes: readonly string[],
  makes: readonly string[]
): HostedModel {
  return { id, provider: id.split("/")[0] ?? id, takes, makes, form: null }
}

describe("the models Storyboard lists", () => {
  it("lists Qwen Image Edit 2511 as the edit default, the text default for keyframe 1 apart, and the catalog's edit models, and no text-only model", () => {
    expect(appTasksOf(definition)).toEqual(["image-edit"])
    expect(defaultModelOf(definition)).toBe("qwen-image-edit-2511")
    const listed = modelsForApp(definition, [
      hosted("bfl/flux-3-image", ["text", "image"], ["image"]),
      hosted("maker/picture", ["text"], ["image"]),
      hosted("maker/clip", ["image"], ["video"]),
    ])
    expect(listed.map((model) => [model.id, model.kind, model.task])).toEqual([
      ["qwen-image-edit-2511", "graph", "image-edit"],
      ["z-image-turbo", "graph", "text-to-image"],
      ["bfl/flux-3-image", "hosted", "image-edit"],
    ])
  })
})
