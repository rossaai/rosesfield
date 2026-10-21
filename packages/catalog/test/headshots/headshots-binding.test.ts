import { comfyWorkflowAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  editWorkflowId,
  headshotsBinding,
  sizeNode,
} from "#headshots/comfy/headshots-binding"
import { promptOf } from "#headshots/comfy/headshot-words"
import {
  backgrounds,
  clothesValues,
  framings,
  headshotRatios,
  headshotSizes,
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
      expect(textOf(graph, graph["112"]?.inputs.prompt)).toBe(
        promptOf(choices)
      )
    }
  )

  it("binds the photo, the seed and Edit's models", async () => {
    const { graph, models } = await submitted(
      bindingOn(editWorkflow()),
      { aspectRatio: "3:4" },
      77
    )
    expect(graph["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(graph["106"]?.inputs.seed).toBe(77)
    expect(models).toEqual(editModels)
  })

  it.each(headshotRatios)(
    "crops and scales the photo to the size of %s before Edit encodes it",
    async (aspectRatio) => {
      const { graph } = await submitted(bindingOn(editWorkflow()), {
        aspectRatio,
      })
      expect(graph[sizeNode]).toEqual({
        class_type: "ImageScale",
        inputs: {
          image: ["107", 0],
          upscale_method: "lanczos",
          ...headshotSizes[aspectRatio],
          crop: "center",
        },
      })
      expect(graph["100"]?.inputs.image1).toEqual([sizeNode, 0])
      expect(graph["112"]?.inputs.image1).toEqual([sizeNode, 0])
      expect(graph["105"]?.inputs.pixels).toEqual([sizeNode, 0])
    }
  )

  it("leaves no link from Edit's own scale past the crop to the size", () => {
    const graph = apiGraph.parse(bindingOn(editWorkflow()).config.workflow)
    const links = Object.entries(graph).flatMap(([id, node]) =>
      Object.values(node.inputs)
        .filter((value) => Array.isArray(value) && value[0] === "107")
        .map(() => id)
    )
    expect(links).toEqual([sizeNode])
  })

  it("makes one output per job, so each headshot of a run is its own job", () => {
    expect(bindingOn(editWorkflow()).config.outputsPerJob).toBe("one")
  })

  it.each(["prompt", "image", "seed", "megapixels"])(
    "refuses an Edit graph whose input map lacks %s",
    (drop) => {
      expect(() => bindingOn(editWorkflow({ drop }))).toThrow(
        expect.objectContaining({ code: "WORKFLOW_INVALID" })
      )
    }
  )

  it.each(["9201", sizeNode])(
    "refuses an Edit graph that already holds node %s, which Headshot adds",
    (node) => {
      const extra = { [node]: { class_type: "Note", inputs: {} } }
      expect(() => bindingOn(editWorkflow({ extra }))).toThrow(
        expect.objectContaining({ code: "WORKFLOW_INVALID" })
      )
    }
  )

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
