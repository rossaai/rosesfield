import type { EngineBinding } from "@rosesfield/contract"
import { selectAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  computedEndFrame,
  computedEndFrameNodes,
  effectGraph,
  motionNode,
} from "#effects/comfy/effect-graph"
import { adapters, promptOnly, recipeOf } from "#effects/comfy/effect-recipes"
import { effectsBinding } from "#effects/comfy/effects-binding"
import { findWorkflow } from "#list-workflows"
import { brokenLinks, isLink, type Workflow } from "./effects-replay"

function fileGraph(): Record<string, unknown> {
  const workflow = findWorkflow("effects-ltx-2-5")
  if (workflow === null) {
    throw new Error("workflows/effects-ltx-2-5 is not listed")
  }
  return workflow.graph
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isWorkflow(value: unknown): value is Workflow {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (node) =>
        isRecord(node) &&
        typeof node.class_type === "string" &&
        isRecord(node.inputs)
    )
  )
}

function workflowOf(value: unknown): Workflow {
  if (!isWorkflow(value)) {
    throw new Error("not an API graph")
  }
  return value
}

function leavesOf(binding: EngineBinding, path = ""): [string, Workflow][] {
  if (binding.adapter !== selectAdapter) {
    return [[path, workflowOf(binding.config.workflow)]]
  }
  const options = binding.config.options
  return isRecord(options)
    ? Object.entries(options).flatMap(([key, option]) =>
        isRecord(option) &&
        typeof option.adapter === "string" &&
        isRecord(option.config)
          ? leavesOf(
              { adapter: option.adapter, config: option.config },
              `${path} ${key}`
            )
          : []
      )
    : []
}

function guidesOnAudio(workflow: Workflow): string[] {
  return Object.entries(workflow)
    .filter(([, node]) => node.class_type === "LTXVAddGuide")
    .filter(([, node]) => {
      const latent = node.inputs.latent
      return (
        isLink(latent) &&
        workflow[latent[0]]?.class_type === "LTXVConcatAVLatent"
      )
    })
    .map(([id]) => id)
}

const recipeNodes = [motionNode, ...Object.keys(computedEndFrameNodes())]

describe("the effect recipes", () => {
  it("sends from every leaf a whole graph of file and recipe nodes, guides on the video latent only", () => {
    const fileIds = Object.keys(fileGraph())
    const leaves = leavesOf(effectsBinding)
    expect(leaves).toHaveLength(30)
    for (const [path, workflow] of leaves) {
      expect({ path, broken: brokenLinks(workflow) }).toEqual({
        path,
        broken: [],
      })
      expect({ path, guides: guidesOnAudio(workflow) }).toEqual({
        path,
        guides: [],
      })
      const foreign = Object.keys(workflow).filter(
        (id) => !fileIds.includes(id) && !recipeNodes.includes(id)
      )
      expect({ path, foreign }).toEqual({ path, foreign: [] })
    }
  })

  it("builds the ink bloom end frame from the photo with core image nodes", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), "ink-bloom", recipeOf("ink-bloom"), "off")
    )
    expect(workflow[computedEndFrame]).toMatchObject({
      class_type: "ImageBlend",
      inputs: {
        image1: ["453", 0],
        image2: ["454", 0],
        blend_mode: "multiply",
      },
    })
    expect(workflow["450"]?.inputs.image).toEqual(["351", 0])
    expect(workflow["460"]?.inputs).toMatchObject({
      image: [computedEndFrame, 0],
      strength: 0.8,
    })
    expect(workflow["463"]?.inputs.image).toEqual([computedEndFrame, 0])
    for (const id of ["430", "447", "461", "464", "410", "412"]) {
      expect(workflow[id]).toBeUndefined()
    }
    expect(workflow["377"]?.inputs.video_latent).toEqual(["460", 2])
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("takes the day to night end frame from its IC-LoRA and holds no subject", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), "day-to-night", recipeOf("day-to-night"), "on")
    )
    expect(workflow["430"]?.inputs).toMatchObject({
      lora_name: adapters.dayToNight.file,
      strength_model: 1,
    })
    expect(workflow["435"]?.inputs.text).toMatch(/^The same shot at night/)
    expect(workflow["460"]?.inputs.strength).toBe(0.8)
    expect(workflow["411"]).toBeUndefined()
    expect(workflow["388"]?.inputs.positive).toEqual(["460", 0])
    expect(workflow["465"]?.inputs.positive).toEqual(["463", 0])
  })

  it("runs weightless on the Slow-Motion-Control adapter in both stages", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), "weightless", recipeOf("weightless"), "on")
    )
    expect(workflow[motionNode]?.inputs.lora_name).toBe(
      adapters.slowMotion.file
    )
    expect(workflow["388"]?.inputs.model).toEqual([motionNode, 0])
    expect(workflow["391"]?.inputs.model).toEqual([motionNode, 0])
    expect(workflow["442"]).toBeUndefined()
  })

  it("keeps only the frame 0 lock and the two-stage render in the prompt-only fallback", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), "frost-over", promptOnly, "on")
    )
    const mechanism = Object.keys(workflow).filter(
      (id) => Number(id) >= 410 && Number(id) <= 465
    )
    expect(mechanism).toEqual([])
    expect(workflow).toMatchObject({
      "357": { inputs: { latent: ["356", 0], strength: 1 } },
      "377": { inputs: { video_latent: ["357", 0] } },
      "388": { inputs: { model: ["384", 0], positive: ["365", 0] } },
      "348": { inputs: { samples: ["367", 0] } },
      "340": { inputs: { video_latent: ["349", 0] } },
      "374": { inputs: { samples: ["369", 0] } },
      "370": { inputs: { audio: ["358", 0] } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })
})
