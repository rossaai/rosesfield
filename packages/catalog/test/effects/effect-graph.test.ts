import type { EngineBinding } from "@rosesfield/contract"
import { selectAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  adapterNode,
  effectGraph,
  referenceNodes,
} from "#effects/comfy/effect-graph"
import { effectsBinding } from "#effects/comfy/effects-binding"
import { recipeOf } from "#effects/effect-recipes"
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

describe("the effect recipes", () => {
  it("sends from every leaf a whole graph of file nodes, guides on the video latent only", () => {
    const fileIds = Object.keys(fileGraph())
    const leaves = leavesOf(effectsBinding)
    expect(leaves.length).toBeGreaterThanOrEqual(26)
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
        (id) => !fileIds.includes(id)
      )
      expect({ path, foreign }).toEqual({ path, foreign: [] })
    }
  })

  it("removes only the reference nodes when it draws the end frame from its prompt", () => {
    const drawn = workflowOf(
      effectGraph(fileGraph(), recipeOf("push-into-eye"))
    )
    const edited = workflowOf(effectGraph(fileGraph(), recipeOf("grow-wings")))
    const removed = Object.keys(edited).filter((id) => drawn[id] === undefined)
    expect(removed.sort()).toEqual([...referenceNodes].sort())
    expect(drawn["534"]?.inputs).toMatchObject({
      positive: ["523", 0],
      negative: ["524", 0],
    })
    expect(edited["534"]?.inputs).toMatchObject({
      positive: ["528", 0],
      negative: ["529", 0],
    })
  })

  it("places a recipe's adapter between the model and both guiders", () => {
    const recipe = {
      ...recipeOf("freeze-and-circle"),
      adapter: { file: "an-adapter.safetensors", strength: 0.8 },
    }
    const workflow = workflowOf(effectGraph(fileGraph(), recipe))
    expect(workflow[adapterNode]).toEqual({
      class_type: "LoraLoaderModelOnly",
      inputs: {
        model: ["384", 0],
        lora_name: "an-adapter.safetensors",
        strength_model: 0.8,
      },
    })
    expect(workflow["388"]?.inputs.model).toEqual([adapterNode, 0])
    expect(workflow["391"]?.inputs.model).toEqual([adapterNode, 0])
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sets the length of both latents from the recipe's seconds", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), { ...recipeOf("grow-giant"), seconds: 3 })
    )
    expect(workflow["356"]?.inputs.length).toBe(73)
    expect(workflow["366"]?.inputs.frames_number).toBe(73)
  })
})
