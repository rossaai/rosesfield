import { setHits, setSound } from "#effects/comfy/effect-sound"
import { audioFramesOf, frameAt, framesOf } from "#effects/comfy/frame-sizes"
import {
  type Graph,
  invalid,
  isLink,
  type Link,
  nodeOf,
  relink,
  remove,
} from "#effects/comfy/graph-edit"
import type {
  LibraryExample,
  PhotoFit,
} from "#motion/examples/library-example.contract"
import { apiGraph } from "#workflow-entry.contract"

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

export const adapterNode = "420"

export const grainNode = "381"

const guideOutputs = ["positive", "negative", "latent"]

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

function setPrompts(graph: Graph, recipe: LibraryExample): void {
  nodeOf(graph, "501").inputs.string_a = recipe.prompt
  nodeOf(graph, "503").inputs.string_b = recipe.design.sound?.prompt ?? ""
}

function setLength(graph: Graph, recipe: LibraryExample): void {
  nodeOf(graph, "356").inputs.length = framesOf(recipe.seconds)
  nodeOf(graph, "366").inputs.frames_number = audioFramesOf(recipe.seconds)
}

function addAdapter(graph: Graph, recipe: LibraryExample): void {
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

export const midFrameNodes: readonly string[] = ["470", "471"]

export const midGuideNodes: readonly string[] = ["472", "473"]

export function hasEditPass(recipe: LibraryExample): boolean {
  return recipe.endFrame.source === "edit" || recipe.midFrame !== null
}

function setEditPass(graph: Graph, recipe: LibraryExample): void {
  const end = recipe.endFrame
  const prompt = end.source === "edit" ? end.prompt : recipe.midFrame?.prompt
  if (end.source !== "dark") {
    remove(graph, [darkFrameNode])
  }
  if (prompt === undefined) {
    remove(graph, [...editFrameNodes, ...imageEditNodes])
    if (end.source !== "dark") {
      remove(graph, [endFrameSizeNode])
    }
    return
  }
  nodeOf(graph, endFramePromptNode).inputs.prompt = prompt
}

function setEndFrame(graph: Graph, recipe: LibraryExample): void {
  const end = recipe.endFrame
  if (end.source === "none") {
    passThrough(graph, "460")
    passThrough(graph, "463")
    return
  }
  if (end.source === "dark") {
    nodeOf(graph, darkFrameNode).inputs.color = greyOf(end.luma)
    for (const id of endGuideNodes) {
      nodeOf(graph, id).inputs.image = [darkFrameNode, 0]
    }
  }
  for (const id of endGuideNodes) {
    nodeOf(graph, id).inputs.strength = end.strength
  }
}

function setMidFrame(graph: Graph, recipe: LibraryExample): void {
  const mid = recipe.midFrame
  if (mid === null) {
    for (const id of midGuideNodes) {
      passThrough(graph, id)
    }
    remove(graph, midFrameNodes)
    return
  }
  for (const id of midGuideNodes) {
    const guide = nodeOf(graph, id)
    guide.inputs.frame_idx = frameAt(mid.time)
    guide.inputs.strength = mid.strength
  }
}

function greyOf(luma: number): number {
  return luma * 0x010101
}

const fittedPhoto: Link = [fittedPhotoNode, 0]

const editedFrame: Link = ["627", 0]

const openingResizeNode = "351"

function setPhotoFrame(graph: Graph, recipe: LibraryExample): void {
  if (recipe.photoFrame === "first") {
    return
  }
  nodeOf(graph, openingResizeNode).inputs.input = [...editedFrame]
  for (const id of endGuideNodes) {
    nodeOf(graph, id).inputs.image = [...fittedPhoto]
  }
}

function setHold(graph: Graph, recipe: LibraryExample): void {
  if (recipe.hold === null) {
    passThrough(graph, "461")
    passThrough(graph, "464")
    remove(graph, matteNodes)
    return
  }
  nodeOf(graph, "461").inputs.strength = recipe.hold
  nodeOf(graph, "464").inputs.strength = recipe.hold
}

export const fitCrops: Readonly<Record<PhotoFit["edges"], string>> = {
  crop: "center",
}

function setFit(graph: Graph, recipe: LibraryExample): void {
  nodeOf(graph, fittedPhotoNode).inputs.crop = fitCrops[recipe.design.fit.edges]
}

function setGrain(graph: Graph, recipe: LibraryExample): void {
  nodeOf(graph, grainNode).inputs.strength = recipe.design.encode.grain
}

export function effectGraph(
  workflow: Record<string, unknown>,
  recipe: LibraryExample
): Record<string, unknown> {
  const graph: Graph = apiGraph.parse(workflow)
  setFit(graph, recipe)
  setPrompts(graph, recipe)
  setLength(graph, recipe)
  addAdapter(graph, recipe)
  setEditPass(graph, recipe)
  setEndFrame(graph, recipe)
  setMidFrame(graph, recipe)
  setPhotoFrame(graph, recipe)
  setHold(graph, recipe)
  const guided =
    recipe.endFrame.source !== "none" ||
    recipe.midFrame !== null ||
    recipe.hold !== null
  if (!guided) {
    passThrough(graph, "462")
    passThrough(graph, "465")
  }
  setSound(graph, recipe)
  setHits(graph, recipe)
  setGrain(graph, recipe)
  return graph
}
