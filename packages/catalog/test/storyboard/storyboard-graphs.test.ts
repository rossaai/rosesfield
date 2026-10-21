import { appDefinition, characterReferenceMax } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { listWorkflows } from "#list-workflows"
import { app } from "#storyboard/app"
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
  it("offers Qwen Image Edit 2511 as its one edit graph and holds no FLUX.2 Klein and no Wan model", () => {
    const model = definition.inputs.find((input) => input.name === "model")
    expect(
      model?.type === "choice" ? model.options.map((one) => one.value) : []
    ).toEqual(["qwen-image-edit-2511"])
    const leaves = workflowLeaves(definition.engine)
    expect(leaves).toHaveLength(2 + characterReferenceMax)
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
