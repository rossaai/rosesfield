import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { audioFramesOf, frameAt, framesOf } from "#effects/comfy/frame-sizes"
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

export const loudnessNode = "359"

export const ceilingNodes: readonly string[] = ["360", "361"]

export const peakMargin = 1

const maxCeilingGain = 24

export const adapterNode = "420"

export const grainNode = "381"

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
  nodeOf(graph, "356").inputs.length = framesOf(recipe.seconds)
  nodeOf(graph, "366").inputs.frames_number = audioFramesOf(recipe.seconds)
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

export const midFrameNodes: readonly string[] = ["470", "471"]

export const midGuideNodes: readonly string[] = ["472", "473"]

export function hasEditPass(recipe: EffectRecipe): boolean {
  return recipe.endFrame.source === "edit" || recipe.midFrame !== null
}

function setEditPass(graph: Graph, recipe: EffectRecipe): void {
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

function setEndFrame(graph: Graph, recipe: EffectRecipe): void {
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

function setMidFrame(graph: Graph, recipe: EffectRecipe): void {
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
  const sound = recipe.design.sound
  if (sound === null) {
    remove(graph, [soundNode, loudnessNode, ...ceilingNodes])
    delete nodeOf(graph, "370").inputs.audio
    return
  }
  const ceiling = sound.truePeakMax - peakMargin
  if (-ceiling > maxCeilingGain) {
    throw invalid(
      `the peak ceiling ${ceiling} dB of ${recipe.effect} is under -${maxCeilingGain} dB`
    )
  }
  const [up, down] = ceilingNodes
  nodeOf(graph, loudnessNode).inputs.lufs =
    (sound.loudness.min + sound.loudness.max) / 2
  nodeOf(graph, up ?? "").inputs.gain_db = -ceiling
  nodeOf(graph, down ?? "").inputs.gain_db = ceiling
}

function setGrain(graph: Graph, recipe: EffectRecipe): void {
  nodeOf(graph, grainNode).inputs.strength = recipe.design.encode.grain
}

export function effectGraph(
  workflow: Record<string, unknown>,
  recipe: EffectRecipe
): Record<string, unknown> {
  const graph: Graph = apiGraph.parse(workflow)
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
  setGrain(graph, recipe)
  return graph
}
