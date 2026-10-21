import type { EngineBinding } from "@rosesfield/contract"
import { selectAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  bedLevelNode,
  brightenNode,
  buildNodes,
  hitLevelOf,
  hitSlots,
} from "#effects/comfy/effect-sound"
import { effectBinding, effectsBinding } from "#effects/comfy/effects-binding"
import {
  type EffectRecipe,
  resolutionValues,
} from "#effects/effect-recipe.contract"
import { effectRecipes } from "#effects/effect-recipes"
import { findWorkflow } from "#list-workflows"
import uiFile from "../../../../workflows/effects-ltx-2-5/effects-ltx-2-5.json"
import { workflowOf } from "./effects-replay"

const coreNodeClasses: readonly string[] = [
  "AudioAdjustVolume",
  "AudioConcat",
  "AudioMerge",
  "CFGNorm",
  "CLIPLoader",
  "CLIPTextEncode",
  "CheckpointLoaderSimple",
  "CreateVideo",
  "EmptyAudio",
  "EmptyImage",
  "EmptyLTXVLatentVideo",
  "EmptyLatentAudio",
  "EmptySD3LatentImage",
  "FluxKontextImageScale",
  "FluxKontextMultiReferenceLatentMethod",
  "GetImageSize",
  "GrowMask",
  "ImageAddNoise",
  "ImageScale",
  "KSampler",
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
  "ModelSamplingAuraFlow",
  "PreviewImage",
  "RandomNoise",
  "RemoveBackground",
  "ResizeImageMaskNode",
  "SamplerCustomAdvanced",
  "SaveVideo",
  "StringConcatenate",
  "StringReplace",
  "StringTrim",
  "TextEncodeQwenImageEditPlus",
  "UNETLoader",
  "VAEDecode",
  "VAEDecodeAudio",
  "VAEDecodeTiled",
  "VAELoader",
]

const loudnessPacks: Readonly<Record<string, string>> = {
  NormalizeAudioLoudness: "comfyui-wanvideowrapper",
  AudioAmplify: "comfyui_audiotools",
  AudioFadeOut: "comfyui_audiotools",
  AudioFadeIn: "comfyui_audiotools",
  AudioParametricEQ: "comfyui_audiotools",
}

const packCommits: Readonly<Record<string, string>> = {
  NormalizeAudioLoudness: "088128b224242e110d3906c6750e9a3a348a659b",
  AudioAmplify: "c816d0a1629c05a0f463ddb77ea96ada69875d32",
  AudioFadeOut: "c816d0a1629c05a0f463ddb77ea96ada69875d32",
  AudioFadeIn: "c816d0a1629c05a0f463ddb77ea96ada69875d32",
  AudioParametricEQ: "c816d0a1629c05a0f463ddb77ea96ada69875d32",
}

function packNodesOf(recipe: EffectRecipe): string[] {
  const sound = recipe.design.sound
  if (sound === null) {
    return []
  }
  return [
    "359",
    "360",
    "361",
    ...(sound.fadeOut > 0 ? ["362"] : []),
    ...(sound.build === null ? [] : [buildNodes.rise]),
    ...(sound.brighten === null ? [] : [brightenNode]),
    ...(sound.hits.length > 0 ? [bedLevelNode] : []),
    ...hitSlots
      .slice(0, sound.hits.length)
      .flatMap((slot) => [slot.tail, hitLevelOf(slot)]),
  ].sort()
}

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
  return [...new Set(classes)].filter(
    (name) =>
      !coreNodeClasses.includes(name) && !Object.hasOwn(loudnessPacks, name)
  )
}

function packNodes(graph: ApiGraph): string[] {
  return Object.entries(graph)
    .filter(([, node]) => Object.hasOwn(loudnessPacks, node.class_type))
    .map(([id]) => id)
    .sort()
}

function uiNodes(file: unknown): Record<string, unknown>[] {
  const nodes = isRecord(file) && Array.isArray(file.nodes) ? file.nodes : []
  return nodes.filter(isRecord)
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

describe("Effects holds only ComfyUI core nodes, and the pinned loudness nodes on its sound", () => {
  it("sends the loudness nodes only on a look with sound, and lists their packs", () => {
    const workflow = findWorkflow("effects-ltx-2-5")
    expect(workflow?.requiresCustomNodes).toEqual(
      [...new Set(Object.values(loudnessPacks))].sort()
    )
    for (const recipe of effectRecipes) {
      const [path, graph] = leavesOf(effectsBinding([recipe]))[0] ?? []
      expect({ path, pack: graph ? packNodes(graph) : null }).toEqual({
        path,
        pack: packNodesOf(recipe),
      })
    }
    for (const node of uiNodes(uiFile)) {
      const type = typeof node.type === "string" ? node.type : ""
      if (Object.hasOwn(loudnessPacks, type)) {
        expect({ id: node.id, properties: node.properties }).toMatchObject({
          id: node.id,
          properties: { ver: packCommits[type] },
        })
      }
    }
  })

  it("sends from every leaf only core node classes", () => {
    const leaves = leavesOf(effectsBinding(effectRecipes))
    expect(leaves).toHaveLength(effectRecipes.length * resolutionValues.length)
    expect(effectRecipes).toHaveLength(9)
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

const bf16Loaders = [
  {
    id: "384",
    input: "unet_name",
    file: "ltx-2.5-22b-distilled-transformer-bf16.safetensors",
    folder: "diffusion_models",
  },
  {
    id: "387",
    input: "clip_name",
    file: "gemma4-12b-with-proj-ltx-2.5-bf16.safetensors",
    folder: "text_encoders",
  },
] as const

describe("Effects loads the bf16 LTX 2.5 transformer and text encoder", () => {
  it("names the bf16 files on nodes 384 and 387 in the API file and the UI file, with their links", () => {
    const graph = workflowOf(findWorkflow("effects-ltx-2-5")?.graph)
    for (const loader of bf16Loaders) {
      expect(graph[loader.id]?.inputs[loader.input]).toBe(loader.file)
      const node = uiNodes(uiFile).find((one) => String(one.id) === loader.id)
      expect(node).toMatchObject({
        widgets_values: expect.arrayContaining([loader.file]),
        properties: {
          models: [
            {
              name: loader.file,
              url: `https://huggingface.co/Lightricks/LTX-2.5/resolve/main/${loader.folder}/${loader.file}`,
              directory: loader.folder,
            },
          ],
        },
      })
    }
  })

  it("sends the bf16 files from every leaf and records the bf16 transformer first", () => {
    for (const recipe of effectRecipes) {
      for (const resolution of resolutionValues) {
        const binding = effectBinding(recipe, resolution)
        const graph = workflowOf(binding.config.workflow)
        const models = binding.config.models
        const path = `${recipe.effect} ${resolution}`
        expect({
          path,
          sent: bf16Loaders.map((one) => graph[one.id]?.inputs[one.input]),
          first: Array.isArray(models) ? models[0] : null,
          models,
        }).toMatchObject({
          path,
          sent: bf16Loaders.map((one) => one.file),
          first: bf16Loaders[0].file,
          models: expect.arrayContaining(bf16Loaders.map((one) => one.file)),
        })
      }
    }
  })
})
