import type { EngineBinding } from "@rosesfield/contract"
import { comfyWorkflowAdapter } from "@rosesfield/generation/bindings"
import type { Link } from "#storyboard/comfy/storyboard-nodes"
import { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type ApiGraph = ReturnType<typeof apiGraph.parse>

type Target = { node: string; input: string }

type Bound = { from: string; name: string | null; target: Target }

export type TextWires = {
  prompt: Link
  seed: Link
  latent: Link
}

export type TextPass = {
  nodes: ApiGraph
  keyframe: Link
  models: string[]
}

type TextPassOptions = {
  binding: EngineBinding
  wires: TextWires
  folder: string
}

export const textNodeOffset = 10_000

const saveClass = "SaveImage"

const latentClass = "EmptySD3LatentImage"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isLink(value: unknown): value is Link {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  )
}

function boundOf(binding: unknown): Bound | null {
  if (!isRecord(binding) || typeof binding.from !== "string") {
    return null
  }
  const { path, name } = binding
  if (
    !Array.isArray(path) ||
    typeof path[0] !== "string" ||
    path[1] !== "inputs" ||
    typeof path[2] !== "string"
  ) {
    return null
  }
  return {
    from: binding.from,
    name: typeof name === "string" ? name : null,
    target: { node: path[0], input: path[2] },
  }
}

function parts(options: TextPassOptions): {
  graph: ApiGraph
  bound: Bound[]
  models: string[]
} {
  const fail = invalidFor(options.folder)
  const { adapter, config } = options.binding
  const graph = apiGraph.safeParse(config.workflow)
  if (adapter !== comfyWorkflowAdapter || !graph.success) {
    throw fail("the text graph is no single workflow")
  }
  const bindings = Array.isArray(config.bindings) ? config.bindings : []
  const bound = bindings.map(boundOf)
  if (bound.some((one) => one === null)) {
    throw fail("the text graph binds a value outside a node input")
  }
  const models = Array.isArray(config.models) ? config.models : []
  return {
    graph: graph.data,
    bound: bound.filter((one): one is Bound => one !== null),
    models: models.filter((one): one is string => typeof one === "string"),
  }
}

function invalidFor(folder: string): (reason: string) => WorkflowInvalidError {
  return (reason) => new WorkflowInvalidError({ folder, reason })
}

function renamerFor(folder: string): (id: string) => string {
  return (id) => {
    const number = Number(id)
    if (!/^\d+$/.test(id) || number >= textNodeOffset) {
      throw invalidFor(folder)(
        `the text graph holds node ${id}, which Storyboard cannot renumber`
      )
    }
    return String(textNodeOffset + number)
  }
}

function onlyNode(
  ids: readonly string[],
  what: string,
  folder: string
): string {
  const unique = [...new Set(ids)]
  const [id] = unique
  if (unique.length !== 1 || id === undefined) {
    throw invalidFor(folder)(`the text graph needs one ${what}`)
  }
  return id
}

function wiresOf(
  bound: readonly Bound[],
  wires: TextWires,
  folder: string
): { latentIds: string[]; set: [Target, Link][] } {
  const latentIds: string[] = []
  const set: [Target, Link][] = []
  for (const one of bound) {
    if (one.from === "aspectRatio" || one.from === "count") {
      latentIds.push(one.target.node)
    } else if (one.from === "seed") {
      set.push([one.target, wires.seed])
    } else if (one.from === "input" && one.name === "prompt") {
      set.push([one.target, wires.prompt])
    } else {
      throw invalidFor(folder)(
        `the text graph binds ${one.name ?? one.from}, which Storyboard does not fill`
      )
    }
  }
  if (set.length !== 2) {
    throw invalidFor(folder)("the text graph needs one prompt and one seed")
  }
  return { latentIds, set }
}

export function textPassOf(options: TextPassOptions): TextPass {
  const { folder, wires } = options
  const { graph, bound, models } = parts(options)
  const rename = renamerFor(folder)
  const ids = Object.keys(graph)
  const save = onlyNode(
    ids.filter((id) => graph[id]?.class_type === saveClass),
    "save node",
    folder
  )
  const routed = wiresOf(bound, wires, folder)
  const latent = onlyNode(routed.latentIds, "latent node", folder)
  const image = graph[save]?.inputs.images
  if (graph[latent]?.class_type !== latentClass || !isLink(image)) {
    throw invalidFor(folder)(
      `the text graph needs an ${latentClass} and a saved image`
    )
  }
  const relink = (value: unknown): unknown => {
    if (!isLink(value) || !Object.hasOwn(graph, value[0])) {
      return value
    }
    return value[0] === latent ? wires.latent : [rename(value[0]), value[1]]
  }
  const nodes: ApiGraph = {}
  for (const id of ids.filter((one) => one !== save && one !== latent)) {
    const node = graph[id]
    if (node !== undefined) {
      const inputs = Object.fromEntries(
        Object.entries(node.inputs).map(([name, value]) => [
          name,
          relink(value),
        ])
      )
      nodes[rename(id)] = { ...node, inputs }
    }
  }
  for (const [target, link] of routed.set) {
    const node = nodes[rename(target.node)]
    if (node !== undefined) {
      node.inputs[target.input] = link
    }
  }
  const [source, slot] = image
  return { nodes, keyframe: [rename(source), slot], models }
}
