import { comfyWorkflowAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  editWorkflowId,
  headshotsBinding,
} from "#headshots/comfy/headshots-binding"
import { promptOf } from "#headshots/comfy/headshot-words"
import {
  backgrounds,
  clothesValues,
  framings,
} from "#headshots/headshots-values"
import { findWorkflow, listWorkflows, type Workflow } from "#list-workflows"
import { apiGraph } from "#workflow-entry.contract"
import {
  defaults,
  editModels,
  editWorkflow,
  headshots,
  submitted,
  textOf,
  uploadedId,
} from "./headshots-replay"

function bindingOn(edit: Workflow) {
  return headshotsBinding((id) => (id === edit.id ? edit : null))
}

const choiceRequests = [
  ...framings.map((framing) => ({ ...defaults, framing })),
  ...backgrounds.map((background) => ({ ...defaults, background })),
  ...clothesValues.map((clothes) => ({ ...defaults, clothes })),
  ...(["on", "off"] as const).map((keepGlasses) => ({
    ...defaults,
    keepGlasses,
  })),
]

describe("Headshot's words on Edit's graph", () => {
  it.each(choiceRequests)(
    "sends one instruction for $framing, $background, $clothes and glasses $keepGlasses to Edit's prompt",
    async (choices) => {
      const { graph } = await submitted(bindingOn(editWorkflow()), {
        inputs: choices,
      })
      expect(textOf(graph, graph["151"]?.inputs.prompt)).toBe(
        promptOf(choices)
      )
    }
  )

  it("binds the photo, the seed, the size of the format and Edit's models", async () => {
    const { graph, models } = await submitted(
      bindingOn(editWorkflow()),
      { aspectRatio: "3:4" },
      77
    )
    expect(graph["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(graph["3"]?.inputs.seed).toBe(77)
    expect(graph["192"]?.inputs).toMatchObject({ width: 896, height: 1152 })
    expect(models).toEqual(editModels)
  })

  it("leaves the size to Edit's graph when its input map names no width and height", async () => {
    const unsized = bindingOn(editWorkflow({ sized: false }))
    const { graph } = await submitted(unsized, { aspectRatio: "3:4" })
    expect(graph["192"]?.inputs).toMatchObject({ width: 1024, height: 1024 })
  })

  it("makes one output per job, so each headshot of a run is its own job", () => {
    expect(bindingOn(editWorkflow()).config.outputsPerJob).toBe("one")
  })

  it.each(["prompt", "image", "seed"])(
    "refuses an Edit graph whose input map lacks %s",
    (drop) => {
      expect(() => bindingOn(editWorkflow({ drop }))).toThrow(
        expect.objectContaining({ code: "WORKFLOW_INVALID" })
      )
    }
  )

  it("refuses an Edit graph that already holds a node Headshot adds", () => {
    const extra = { "9201": { class_type: "Note", inputs: {} } }
    expect(() => bindingOn(editWorkflow({ extra }))).toThrow(
      expect.objectContaining({ code: "WORKFLOW_INVALID" })
    )
  })

  it("refuses to bind when no folder holds Edit's graph", () => {
    expect(() => headshotsBinding(() => null)).toThrow(
      expect.objectContaining({ code: "WORKFLOW_INVALID" })
    )
  })
})

function headshotGraphs(ids: readonly string[]): string[] {
  return ids.filter((id) => id.startsWith("headshots-"))
}

describe("Headshot in the catalog", () => {
  it("runs on every node of Edit's Qwen Image Edit 2511 graph", () => {
    const edit = findWorkflow(editWorkflowId)
    const graph = headshots?.engine.config.workflow
    expect(headshots?.engine.adapter).toBe(comfyWorkflowAdapter)
    expect(edit).not.toBeNull()
    const classes = Object.entries(apiGraph.parse(edit?.graph ?? {})).map(
      ([id, node]) => [id, { class_type: node.class_type }]
    )
    expect(graph).toMatchObject(Object.fromEntries(classes))
  })

  it("lists no headshot graph of its own", () => {
    expect(headshotGraphs(listWorkflows().map((one) => one.id))).toEqual([])
  })

  it("finds a planted headshot graph, the control", () => {
    const planted = [editWorkflowId, "headshots-qwen-image-edit-2511"]
    expect(headshotGraphs(planted)).toEqual(["headshots-qwen-image-edit-2511"])
  })
})
