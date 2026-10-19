import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { framesOf } from "#effects/comfy/frame-sizes"
import type { EffectRecipe } from "#effects/effect-recipe.contract"
import { apiGraph } from "#workflow-entry.contract"

type Link = [string, number]

type Node = { class_type: string; inputs: Record<string, unknown> }

type Graph = Record<string, Node>

export const effectsWorkflow = "effects-ltx-2-5"

export const endFrameNodes: readonly string[] = Array.from(
  { length: 17 },
  (_, index) => String(520 + index)
)

export const referenceNodes: readonly string[] = ["527", "528", "529"]

export const matteNodes: readonly string[] = ["410", "411", "412"]

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

function setPrompt(graph: Graph, recipe: EffectRecipe): void {
  nodeOf(graph, "501").inputs.string_a = recipe.prompt
  nodeOf(graph, "503").inputs.string_b = ""
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

function setEndFrame(graph: Graph, recipe: EffectRecipe): void {
  const end = recipe.endFrame
  if (end.source === "none") {
    remove(graph, endFrameNodes)
    passThrough(graph, "460")
    passThrough(graph, "463")
    return
  }
  nodeOf(graph, "523").inputs.text = end.prompt
  nodeOf(graph, "460").inputs.strength = end.strength
  nodeOf(graph, "463").inputs.strength = end.strength
  if (end.source === "draw") {
    remove(graph, referenceNodes)
    const guider = nodeOf(graph, "534").inputs
    guider.positive = ["523", 0]
    guider.negative = ["524", 0]
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

function dropSound(graph: Graph): void {
  remove(graph, ["358"])
  delete nodeOf(graph, "370").inputs.audio
}

export function effectGraph(
  workflow: Record<string, unknown>,
  recipe: EffectRecipe
): Record<string, unknown> {
  const graph: Graph = apiGraph.parse(workflow)
  setPrompt(graph, recipe)
  setLength(graph, recipe)
  addAdapter(graph, recipe)
  setEndFrame(graph, recipe)
  setHold(graph, recipe)
  if (recipe.endFrame.source === "none" && recipe.hold === null) {
    passThrough(graph, "462")
    passThrough(graph, "465")
  }
  dropSound(graph)
  return graph
}
