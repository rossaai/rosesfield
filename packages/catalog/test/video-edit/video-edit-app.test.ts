import { appDefinition, inputRulesOf } from "@rosesfield/contract"
import { hostedModelOf, resolveBinding } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { listWorkflows } from "#list-workflows"
import { app } from "#video-edit/app"
import { videoEditWorkflows } from "#video-edit/comfy/video-edit-engine"

const videoEdit = appDefinition.parse(app)
const seedance = "byteplus/dreamina-seedance-2-5-260628"
const fluxEdit = "bfl/video-edit-v1"

function modelOfMode(mode: string): unknown {
  return inputRulesOf(videoEdit, { mode }).find(
    (rule) => rule.input.name === "model"
  )?.fallback
}

function editsVideo(id: string) {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes: ["text", "video"],
    makes: ["video"],
    form: null,
  }
}

describe("Video edit's models", () => {
  it("opens on Edit with Dreamina Seedance 2.5 and lists the Router's video edit models", () => {
    expect(modelOfMode("edit")).toBe(seedance)
    expect(defaultModelOf(videoEdit)).toBe(seedance)
    expect(appTasksOf(videoEdit)).toContain("video-edit")
  })

  it.each([
    { mode: "edit", model: seedance },
    { mode: "extend", model: "ltx-2-5" },
    { mode: "reframe", model: "ltx-2-3-outpaint" },
    { mode: "background", model: "birefnet" },
    { mode: "frame-rate", model: "film" },
  ])("starts $mode on $model", ({ mode, model }) => {
    expect(modelOfMode(mode)).toBe(model)
  })

  it.each([seedance, fluxEdit])(
    "runs %s in Edit as a hosted model",
    (model) => {
      const binding = resolveBinding(videoEdit.engine, { mode: "edit", model })
      expect(hostedModelOf(binding)).toBe(model)
    }
  )

  it("lists no Wan model and only the kept open-weights graphs", () => {
    const listed = modelsForApp(videoEdit, [
      editsVideo(seedance),
      editsVideo(fluxEdit),
      editsVideo("wan/wan2.6-video-edit"),
      editsVideo("alibaba/wan-2-2-vace"),
    ])
    expect(listed.map((one) => one.id).filter((id) => /wan/i.test(id))).toEqual(
      []
    )
    expect(
      listed.filter((one) => one.kind === "graph").map((one) => one.id)
    ).toEqual(["ltx-2-5", "ltx-2-3-outpaint", "birefnet", "film"])
    expect(listed.map((one) => one.id)).toContain(seedance)
  })

  it("binds only workflow folders that exist, and the Wan folders are gone", () => {
    const folders = listWorkflows().map((one) => one.id)
    for (const folder of Object.values(videoEditWorkflows)) {
      expect(folders).toContain(folder)
    }
    expect(folders).not.toContain("video-edit-extend-wan-2-2")
    expect(folders).not.toContain("video-edit-reframe-wan-vace")
  })

  it("resolves any hosted model id to that model and a graph id to its graph", () => {
    const binding = resolveBinding(videoEdit.engine, {
      mode: "edit",
      model: "maker/any-edit",
    })
    expect(hostedModelOf(binding)).toBe("maker/any-edit")
    const graph = resolveBinding(videoEdit.engine, {
      mode: "extend",
      model: "ltx-2-5",
    })
    expect(hostedModelOf(graph)).toBeNull()
  })
})
