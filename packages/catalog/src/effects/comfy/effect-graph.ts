import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { framesOf } from "#effects/comfy/frame-sizes"
import type { EffectRecipe } from "#effects/effect-recipe.contract"
import { apiGraph } from "#workflow-entry.contract"

type Link = [string, number]

type Node = { class_type: string; inputs: Record<string, unknown> }

type Graph = Record<string, Node>

export const effectsWorkflow = "effects-ltx-2-5"

export const editFrameNodes: readonly string[] = [
  "620",
  "621",
  "622",
  "623",
  "625",
  "626",
  "627",
]

export const endFrameSizeNode = "624"

export const darkFrameNode = "628"

export const endFrameNodes: readonly string[] = [
  ...editFrameNodes,
  endFrameSizeNode,
  darkFrameNode,
]

export const imageEditNodes: readonly string[] = [
  "600",
  "601",
  "602",
  "603",
  "604",
]

export const fittedPhotoNode = "606"

export const endFramePromptNode = "620"

export const matteNodes: readonly string[] = ["410", "411", "412"]

export const soundNode = "358"

export const adapterNode = "420"

const guideOutputs = ["positive", "negative", "latent"]

function invalid(reason: string): AppDefinitionInvalidError {
  return new AppDefinitionInvalidError({ folder: "effects", reason })
}

function nodeOf(graph: Graph, id: string): Node {
  const node = graph[id]
  if (node === undefined) {
    throw invalid(`the workflow ${effectsWorkflow} has no node ${id}`)
  }
  return node
}

function isLink(value: unknown): value is Link {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function relink(graph: Graph, from: Link, to: Link): void {
  for (const node of Object.values(graph)) {
    for (const [name, value] of Object.entries(node.inputs)) {
      if (isLink(value) && value[0] === from[0] && value[1] === from[1]) {
        node.inputs[name] = [...to]
      }
    }
  }
}

function passThrough(graph: Graph, id: string): void {
  const node = nodeOf(graph, id)
  delete graph[id]
  guideOutputs.forEach((name, slot) => {
    const source = node.inputs[name]
    if (!isLink(source)) {
      throw invalid(`node ${id} passes no link through ${name}`)
    }
    relink(graph, [id, slot], source)
  })
}

function remove(graph: Graph, ids: readonly string[]): void {
  for (const id of ids) {
    nodeOf(graph, id)
    delete graph[id]
  }
}

function setPrompts(graph: Graph, recipe: EffectRecipe): void {
  nodeOf(graph, "501").inputs.string_a = recipe.prompt
  nodeOf(graph, "503").inputs.string_b = recipe.design.sound?.prompt ?? ""
}

function setLength(graph: Graph, recipe: EffectRecipe): void {
  const frames = framesOf(recipe.seconds)
  nodeOf(graph, "356").inputs.length = frames
  nodeOf(graph, "366").inputs.frames_number = frames
}

function addAdapter(graph: Graph, recipe: EffectRecipe): void {
  if (recipe.adapter === null) {
    return
  }
  graph[adapterNode] = {
    class_type: "LoraLoaderModelOnly",
    inputs: {
      model: ["384", 0],
      lora_name: recipe.adapter.file,
      strength_model: recipe.adapter.strength,
    },
  }
  nodeOf(graph, "388").inputs.model = [adapterNode, 0]
  nodeOf(graph, "391").inputs.model = [adapterNode, 0]
}

const endGuideNodes: readonly string[] = ["460", "463"]

function setEndFrame(graph: Graph, recipe: EffectRecipe): void {
  const end = recipe.endFrame
  if (end.source === "none") {
    remove(graph, [...endFrameNodes, ...imageEditNodes])
    passThrough(graph, "460")
    passThrough(graph, "463")
    return
  }
  if (end.source === "dark") {
    remove(graph, [...editFrameNodes, ...imageEditNodes])
    nodeOf(graph, darkFrameNode).inputs.color = greyOf(end.luma)
    for (const id of endGuideNodes) {
      nodeOf(graph, id).inputs.image = [darkFrameNode, 0]
    }
  } else {
    remove(graph, [darkFrameNode])
    nodeOf(graph, endFramePromptNode).inputs.prompt = end.prompt
  }
  for (const id of endGuideNodes) {
    nodeOf(graph, id).inputs.strength = end.strength
  }
}

function greyOf(luma: number): number {
  return luma * 0x010101
}

const fittedPhoto: Link = [fittedPhotoNode, 0]

const editedFrame: Link = ["627", 0]

const openingResizeNode = "351"

function setPhotoFrame(graph: Graph, recipe: EffectRecipe): void {
  if (recipe.photoFrame === "first") {
    return
  }
  nodeOf(graph, openingResizeNode).inputs.input = [...editedFrame]
  for (const id of endGuideNodes) {
    nodeOf(graph, id).inputs.image = [...fittedPhoto]
  }
}

function setHold(graph: Graph, recipe: EffectRecipe): void {
  if (recipe.hold === null) {
    passThrough(graph, "461")
    passThrough(graph, "464")
    remove(graph, matteNodes)
    return
  }
  nodeOf(graph, "461").inputs.strength = recipe.hold
  nodeOf(graph, "464").inputs.strength = recipe.hold
}

function setSound(graph: Graph, recipe: EffectRecipe): void {
  if (recipe.design.sound !== null) {
    return
  }
  remove(graph, [soundNode])
  delete nodeOf(graph, "370").inputs.audio
}

export function effectGraph(
  workflow: Record<string, unknown>,
  recipe: EffectRecipe
): Record<string, unknown> {
  const graph: Graph = apiGraph.parse(workflow)
  setPrompts(graph, recipe)
  setLength(graph, recipe)
  addAdapter(graph, recipe)
  setEndFrame(graph, recipe)
  setPhotoFrame(graph, recipe)
  setHold(graph, recipe)
  if (recipe.endFrame.source === "none" && recipe.hold === null) {
    passThrough(graph, "462")
    passThrough(graph, "465")
  }
  setSound(graph, recipe)
  return graph
}
