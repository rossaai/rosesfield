import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import {
  closingRule,
  type EffectValue,
  effectPrompts,
  openingRule,
} from "#effects/comfy/effect-prompts"
import {
  type Adapter,
  effectRecipes,
  type Recipe,
} from "#effects/comfy/effect-recipes"
import { apiGraph } from "#workflow-entry.contract"

type Link = [string, number]

type Node = { class_type: string; inputs: Record<string, unknown> }

type Graph = Record<string, Node>

export type Sound = "on" | "off"

export const effectsWorkflow = "effects-ltx-2-5"

export const endFrameNodes: readonly string[] = [
  "430",
  "431",
  "432",
  "433",
  "434",
  "435",
  "436",
  "437",
  "438",
  "439",
  "440",
  "441",
  "442",
  "443",
  "444",
  "445",
  "446",
  "447",
]

export const matteNodes: readonly string[] = ["410", "411", "412"]

const guideOutputs = ["positive", "negative", "latent"]

export const motionNode = "420"

export const computedEndFrame = "455"

const paperColor = 0xf2_eb_dd

export function computedEndFrameNodes(): Graph {
  return {
    "450": {
      class_type: "ImageToMask",
      inputs: { image: ["351", 0], channel: "green" },
    },
    "451": { class_type: "MaskToImage", inputs: { mask: ["450", 0] } },
    "452": {
      class_type: "ImageBlur",
      inputs: { image: ["451", 0], blur_radius: 2, sigma: 1 },
    },
    "453": {
      class_type: "ImageQuantize",
      inputs: { image: ["452", 0], colors: 3, dither: "none" },
    },
    "454": {
      class_type: "EmptyImage",
      inputs: { width: 64, height: 64, batch_size: 1, color: paperColor },
    },
    [computedEndFrame]: {
      class_type: "ImageBlend",
      inputs: {
        image1: ["453", 0],
        image2: ["454", 0],
        blend_factor: 1,
        blend_mode: "multiply",
      },
    },
  }
}

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

function joined(...parts: readonly string[]): string {
  return parts.filter((part) => part !== "").join(" ")
}

function setPrompt(
  graph: Graph,
  effect: EffectValue,
  recipe: Recipe,
  sound: Sound
): void {
  const soundLine = effectRecipes[effect].soundLine
  const opening = nodeOf(graph, "501").inputs
  opening.string_a = joined(recipe.motion?.trigger ?? "", openingRule)
  opening.string_b = effectPrompts[effect]
  nodeOf(graph, "503").inputs.string_b =
    sound === "on" && soundLine !== null
      ? joined(soundLine, closingRule)
      : closingRule
}

function addMotion(graph: Graph, motion: Adapter): void {
  graph[motionNode] = {
    class_type: "LoraLoaderModelOnly",
    inputs: {
      model: ["384", 0],
      lora_name: motion.file,
      strength_model: motion.strength,
    },
  }
  nodeOf(graph, "388").inputs.model = [motionNode, 0]
  nodeOf(graph, "391").inputs.model = [motionNode, 0]
}

function setEndFrame(graph: Graph, recipe: Recipe): void {
  const end = recipe.endFrame
  if (end.source === "none") {
    remove(graph, endFrameNodes)
    passThrough(graph, "460")
    passThrough(graph, "463")
    return
  }
  if (end.source === "computed") {
    remove(graph, endFrameNodes)
    Object.assign(graph, computedEndFrameNodes())
  } else {
    const adapter = nodeOf(graph, "430").inputs
    adapter.lora_name = end.adapter.file
    adapter.strength_model = end.adapter.strength
    nodeOf(graph, "435").inputs.text = joined(end.adapter.trigger, end.prompt)
  }
  for (const id of ["460", "463"]) {
    const guide = nodeOf(graph, id).inputs
    guide.strength = end.strength
    if (end.source === "computed") {
      guide.image = [computedEndFrame, 0]
    }
  }
}

function setHold(graph: Graph, recipe: Recipe): void {
  if (recipe.hold === null) {
    passThrough(graph, "461")
    passThrough(graph, "464")
    remove(graph, matteNodes)
    return
  }
  nodeOf(graph, "461").inputs.strength = recipe.hold
  nodeOf(graph, "464").inputs.strength = recipe.hold
}

export function effectGraph(
  workflow: Record<string, unknown>,
  effect: EffectValue,
  recipe: Recipe,
  sound: Sound
): Record<string, unknown> {
  const graph: Graph = apiGraph.parse(workflow)
  setPrompt(graph, effect, recipe, sound)
  if (recipe.motion !== null) {
    addMotion(graph, recipe.motion)
  }
  setEndFrame(graph, recipe)
  setHold(graph, recipe)
  if (recipe.endFrame.source === "none" && recipe.hold === null) {
    passThrough(graph, "462")
    passThrough(graph, "465")
  }
  if (sound === "off") {
    delete graph["358"]
    delete nodeOf(graph, "370").inputs.audio
  }
  return graph
}
