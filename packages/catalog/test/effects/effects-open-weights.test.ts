import type { EngineBinding } from "@rosesfield/contract"
import { selectAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { effectsBinding } from "#effects/comfy/effects-binding"
import { resolutionValues } from "#effects/effect-recipe.contract"
import { effectRecipes } from "#effects/effect-recipes"
import { findWorkflow } from "#list-workflows"
import uiFile from "../../../../workflows/effects-ltx-2-5/effects-ltx-2-5.json"

const coreNodeClasses: readonly string[] = [
  "CFGGuider",
  "CLIPLoader",
  "CLIPTextEncode",
  "ConditioningZeroOut",
  "CreateVideo",
  "EmptyFlux2LatentImage",
  "EmptyLTXVLatentVideo",
  "Flux2Scheduler",
  "GetImageSize",
  "GrowMask",
  "ImageScaleToTotalPixels",
  "KSamplerSelect",
  "LTXVAddGuide",
  "LTXVAudioVAEDecode",
  "LTXVConcatAVLatent",
  "LTXVConditioning",
  "LTXVCropGuides",
  "LTXVDualCFGGuider",
  "LTXVEmptyLatentAudio",
  "LTXVImgToVideoInplace",
  "LTXVLatentUpsampler",
  "LTXVPreprocess",
  "LTXVSeparateAVLatent",
  "LatentUpscaleModelLoader",
  "LoadBackgroundRemovalModel",
  "LoadImage",
  "LoraLoaderModelOnly",
  "ManualSigmas",
  "MaskPreview",
  "PreviewImage",
  "RandomNoise",
  "ReferenceLatent",
  "RemoveBackground",
  "ResizeImageMaskNode",
  "SamplerCustomAdvanced",
  "SaveVideo",
  "StringConcatenate",
  "StringReplace",
  "StringTrim",
  "UNETLoader",
  "VAEDecode",
  "VAEDecodeTiled",
  "VAEEncode",
  "VAELoader",
]

const editorNotes: readonly string[] = ["MarkdownNote", "Note"]

type ApiGraph = Record<string, { class_type: string }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isApiGraph(value: unknown): value is ApiGraph {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (node) => isRecord(node) && typeof node.class_type === "string"
    )
  )
}

function apiGraphOf(value: unknown): ApiGraph {
  if (!isApiGraph(value)) {
    throw new Error("not an API graph")
  }
  return value
}

function leavesOf(binding: EngineBinding, path = ""): [string, ApiGraph][] {
  if (binding.adapter !== selectAdapter) {
    return [[path, apiGraphOf(binding.config.workflow)]]
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

function notCore(classes: readonly string[]): string[] {
  return [...new Set(classes)].filter((name) => !coreNodeClasses.includes(name))
}

function classesOf(graph: ApiGraph): string[] {
  return Object.values(graph).map((node) => node.class_type)
}

function uiClasses(file: unknown): string[] {
  const nodes = isRecord(file) && Array.isArray(file.nodes) ? file.nodes : []
  return nodes.flatMap((node) =>
    isRecord(node) &&
    typeof node.type === "string" &&
    !editorNotes.includes(node.type)
      ? [node.type]
      : []
  )
}

function fileGraph(): ApiGraph {
  const workflow = findWorkflow("effects-ltx-2-5")
  if (workflow === null) {
    throw new Error("workflows/effects-ltx-2-5 is not listed")
  }
  return apiGraphOf(workflow.graph)
}

const partnerNode = "KlingImage2VideoNode"

describe("Effects holds only ComfyUI core nodes", () => {
  it("sends from every leaf only core node classes", () => {
    const leaves = leavesOf(effectsBinding(effectRecipes))
    expect(leaves).toHaveLength(effectRecipes.length * resolutionValues.length)
    expect(effectRecipes).toHaveLength(12)
    for (const [path, graph] of leaves) {
      expect({ path, notCore: notCore(classesOf(graph)) }).toEqual({
        path,
        notCore: [],
      })
    }
  })

  it("holds only core node classes in the API file and the UI file", () => {
    expect(notCore(classesOf(fileGraph()))).toEqual([])
    const ui = uiClasses(uiFile)
    expect(ui.length).toBeGreaterThan(0)
    expect(notCore(ui)).toEqual([])
  })

  it("names a partner node planted in a leaf or in the UI file", () => {
    for (const [path, graph] of leavesOf(effectsBinding(effectRecipes))) {
      const planted = {
        ...graph,
        "75": { ...graph["75"], class_type: partnerNode },
      }
      expect({ path, notCore: notCore(classesOf(planted)) }).toEqual({
        path,
        notCore: [partnerNode],
      })
    }
    const plantedUi = {
      ...uiFile,
      nodes: [...uiFile.nodes, { id: 9999, type: partnerNode }],
    }
    expect(notCore(uiClasses(plantedUi))).toEqual([partnerNode])
  })
})
