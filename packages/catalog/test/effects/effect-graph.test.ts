import type { EngineBinding } from "@rosesfield/contract"
import { selectAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import {
  adapterNode,
  darkFrameNode,
  editFrameNodes,
  effectGraph,
  endFrameNodes,
  fittedPhotoNode,
  grainNode,
  imageEditNodes,
  matteNodes,
} from "#effects/comfy/effect-graph"
import {
  bedGainNode,
  bedLevelNode,
  brightenNode,
  buildNodes,
  fadeOutNode,
  hitLevelOf,
  hitSlots,
  soundNode,
} from "#effects/comfy/effect-sound"
import {
  effectBinding,
  effectsBinding,
  loadedModels,
} from "#effects/comfy/effects-binding"
import { resolutionValues } from "#effects/effect-recipe.contract"
import { effectRecipes, recipeOf } from "#effects/effect-recipes"
import {
  brokenLinks,
  fileGraph,
  isLink,
  type Workflow,
  workflowOf,
} from "./effects-replay"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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

function ancestorsOf(workflow: Workflow, id: string): string[] {
  const seen = new Set<string>()
  const queue = [id]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const value of Object.values(workflow[next]?.inputs ?? {})) {
      if (isLink(value) && !seen.has(value[0])) {
        seen.add(value[0])
        queue.push(value[0])
      }
    }
  }
  return [...seen].sort()
}

function editReaders(workflow: Workflow): string[] {
  return Object.entries(workflow)
    .filter(([, node]) =>
      Object.values(node.inputs).some(
        (value) => isLink(value) && imageEditNodes.includes(value[0])
      )
    )
    .map(([id]) => id)
    .filter((id) => !imageEditNodes.includes(id))
    .sort()
}

const runTimeNodes: readonly string[] = [
  fadeOutNode,
  bedLevelNode,
  ...hitSlots.map(hitLevelOf),
  bedGainNode,
  ...Object.values(buildNodes),
  brightenNode,
]

describe("the effect recipes", () => {
  it("sends from every leaf a whole graph of file nodes, guides on the video latent only", () => {
    const fileIds = Object.keys(fileGraph())
    const leaves = leavesOf(effectsBinding(effectRecipes))
    expect(leaves).toHaveLength(effectRecipes.length * resolutionValues.length)
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
        (id) => !fileIds.includes(id) && !runTimeNodes.includes(id)
      )
      expect({ path, foreign }).toEqual({ path, foreign: [] })
    }
  })

  it("scales the photo itself to the shape and makes the last frame from it with the image edit model", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), recipeOf("grow-giant"))
    )
    expect(workflow).toMatchObject({
      "606": {
        class_type: "ImageScale",
        inputs: { image: ["395", 0], crop: "center" },
      },
      "620": { inputs: { image1: ["606", 0] } },
      "621": { inputs: { image1: ["606", 0] } },
      "624": { inputs: { image: ["606", 0] } },
      "351": { inputs: { input: ["606", 0] } },
      "357": { inputs: { image: ["350", 0] } },
      "349": { inputs: { image: ["350", 0] } },
      "460": { inputs: { image: ["627", 0] } },
      "463": { inputs: { image: ["627", 0] } },
      "380": { inputs: { image: ["374", 0], crop: "center" } },
      "370": { inputs: { images: [grainNode, 0], audio: ["361", 0] } },
      "75": { inputs: { format: "mp4", "format.codec": "h264" } },
    })
  })

  it("locks frame 0 to the scaled photo, with no image edit node before it, for every look and resolution", () => {
    const leaves = leavesOf(effectsBinding(effectRecipes))
    for (const [path, workflow] of leaves) {
      const lands = path.includes("pull-back-to-space")
      expect({ path, frame0: ancestorsOf(workflow, "351") }).toEqual({
        path,
        frame0: lands
          ? ancestorsOf(workflow, "627").concat("627").sort()
          : ["395", fittedPhotoNode],
      })
      for (const id of ["357", "349"]) {
        expect({ path, id, image: workflow[id]?.inputs.image }).toEqual({
          path,
          id,
          image: ["350", 0],
        })
      }
      expect({ path, readers: editReaders(workflow) }).toEqual({
        path,
        readers:
          workflow["620"] === undefined ? [] : ["620", "621", "626", "627"],
      })
    }
  })

  it("guides the last frame of a dark look with a flat grey frame at the video's size, with no image edit node", () => {
    const recipe = {
      ...recipeOf("melt-away"),
      endFrame: { source: "dark", luma: 8, strength: 0.85 } as const,
    }
    const workflow = workflowOf(effectGraph(fileGraph(), recipe))
    expect(workflow[darkFrameNode]).toEqual({
      class_type: "EmptyImage",
      inputs: {
        width: ["624", 0],
        height: ["624", 1],
        batch_size: 1,
        color: 8 * 65536 + 8 * 256 + 8,
      },
      _meta: { title: "Dark end frame" },
    })
    expect(workflow).toMatchObject({
      "624": { inputs: { image: [fittedPhotoNode, 0] } },
      "460": { inputs: { image: [darkFrameNode, 0], strength: 0.85 } },
      "463": { inputs: { image: [darkFrameNode, 0], strength: 0.85 } },
      "351": { inputs: { input: [fittedPhotoNode, 0] } },
    })
    for (const id of [...editFrameNodes, ...imageEditNodes]) {
      expect({ id, node: workflow[id] }).toEqual({ id, node: undefined })
    }
    expect(brokenLinks(workflow)).toEqual([])
    expect(() => effectBinding(recipe, "720p")).not.toThrow()
  })

  it("keeps no dark frame for a look whose last frame is edited", () => {
    for (const recipe of effectRecipes.filter(
      (one) => one.endFrame.source === "edit"
    )) {
      const workflow = workflowOf(effectGraph(fileGraph(), recipe))
      expect({ effect: recipe.effect, dark: workflow[darkFrameNode] }).toEqual({
        effect: recipe.effect,
        dark: undefined,
      })
    }
  })

  it("opens a look that lands on the photo on its edited frame, and guides its last frame with the photo", () => {
    const recipe = recipeOf("pull-back-to-space")
    const workflow = workflowOf(effectGraph(fileGraph(), recipe))
    expect(recipe.photoFrame).toBe("last")
    expect(workflow).toMatchObject({
      "620": { inputs: { image1: ["606", 0] } },
      "351": { inputs: { input: ["627", 0] } },
      "357": { inputs: { image: ["350", 0], strength: 0.7 } },
      "349": { inputs: { image: ["350", 0], strength: 1 } },
      "460": { inputs: { image: ["606", 0], frame_idx: -1 } },
      "463": { inputs: { image: ["606", 0], frame_idx: -1 } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("removes the end-frame nodes and the crop guides when a look has neither an end frame nor a hold", () => {
    const recipe = {
      ...recipeOf("melt-away"),
      endFrame: { source: "none" } as const,
    }
    const workflow = workflowOf(effectGraph(fileGraph(), recipe))
    for (const id of [
      ...endFrameNodes,
      ...imageEditNodes,
      ...matteNodes,
      "460",
      "462",
    ]) {
      expect({ id, node: workflow[id] }).toEqual({ id, node: undefined })
    }
    expect(workflow).toMatchObject({
      "377": { inputs: { video_latent: ["357", 0] } },
      "388": { inputs: { positive: ["365", 0] } },
      "348": { inputs: { samples: ["367", 0] } },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("keeps the sound for a look with a sound bed and removes it for a silent look", () => {
    const sounding = workflowOf(
      effectGraph(fileGraph(), recipeOf("push-into-eye"))
    )
    const silent = workflowOf(
      effectGraph(fileGraph(), recipeOf("buildings-ripple"))
    )
    expect(sounding[soundNode]).toBeDefined()
    expect(sounding["503"]?.inputs.string_b).toBe(
      recipeOf("push-into-eye").design.sound?.prompt
    )
    expect(silent[soundNode]).toBeUndefined()
    expect(silent["370"]?.inputs).not.toHaveProperty("audio")
    expect(silent["503"]?.inputs.string_b).toBe("")
  })

  it("keeps no audio node for a silent look", () => {
    const silent = effectRecipes.filter((one) => one.design.sound === null)
    expect(silent.length).toBeGreaterThan(0)
    const audioClasses = [
      "LTXVAudioVAEDecode",
      "NormalizeAudioLoudness",
      "AudioAmplify",
    ]
    for (const recipe of silent) {
      const workflow = workflowOf(effectGraph(fileGraph(), recipe))
      const audio = Object.entries(workflow)
        .filter(([, node]) => audioClasses.includes(node.class_type))
        .map(([id]) => id)
      expect({ effect: recipe.effect, audio }).toEqual({
        effect: recipe.effect,
        audio: [],
      })
      expect(brokenLinks(workflow)).toEqual([])
    }
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
      effectGraph(fileGraph(), { ...recipeOf("grow-giant"), seconds: 15 })
    )
    expect(workflow["356"]?.inputs.length).toBe(361)
    expect(workflow["366"]?.inputs.frames_number).toBe(362)
  })

  it("records first the video model the graph's guiders read, through an adapter", () => {
    const graph = fileGraph()
    const videoFile = (graph["384"] as { inputs: { unet_name: string } }).inputs
      .unet_name
    const recipe = {
      ...recipeOf("freeze-and-circle"),
      adapter: { file: "an-adapter.safetensors", strength: 0.8 },
    }
    const models = effectBinding(recipe, "480p").config.models
    expect(Array.isArray(models) ? models[0] : null).toBe(videoFile)
    expect(models).toContain("an-adapter.safetensors")
  })

  it("names the video model the graph loads, not a file named in code", () => {
    const graph = fileGraph()
    const renamed = {
      ...graph,
      "384": {
        ...(graph["384"] as object),
        inputs: {
          weight_dtype: "default",
          unet_name: "another-video.safetensors",
        },
      },
    }
    expect(loadedModels(renamed)[0]).toBe("another-video.safetensors")
  })
})
