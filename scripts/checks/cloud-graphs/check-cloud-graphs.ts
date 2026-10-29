import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"

const here = fileURLToPath(new URL(".", import.meta.url))
const root = fileURLToPath(new URL("../../../", import.meta.url))
const weightsPath = "packages/catalog/src/comfy/cloud-weights.json"
const weightFile = /\.(safetensors|sft|ckpt|pt|pth|bin|gguf|onnx)$/i

export type Snapshot = {
  readonly readOn: string
  readonly nodes: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly lists: Readonly<Record<string, readonly string[]>>
}
export type Weights = {
  readonly loaders: Readonly<
    Record<
      string,
      { readonly input: string; readonly files: readonly string[] }
    >
  >
}
type ApiNode = { class_type: string; inputs: Record<string, unknown> }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isApiNode(value: unknown): value is ApiNode {
  return (
    isRecord(value) &&
    typeof value.class_type === "string" &&
    isRecord(value.inputs)
  )
}

export type Refusal = { readonly node: string; readonly reason: string }

function isHeldWeight(
  node: string,
  input: string,
  file: string,
  weights: Weights
): boolean {
  const loader = weights.loaders[node]
  return loader?.input === input && loader.files.includes(file)
}

function fileRefusalOf(
  type: string,
  value: unknown,
  at: { node: string; input: string; snapshot: Snapshot; weights: Weights }
): string | null {
  if (typeof value !== "string") {
    return null
  }
  const listed = type.startsWith("@")
    ? (at.snapshot.lists[type.slice(1)] ?? [])
    : []
  if (!type.startsWith("@") && !weightFile.test(value)) {
    return null
  }
  if (
    listed.includes(value) ||
    isHeldWeight(at.node, at.input, value, at.weights)
  ) {
    return null
  }
  return `${at.input} loads ${value}, which Comfy Cloud does not list for ${at.node} and ${weightsPath} does not hold`
}

export function refusalsOf(
  graph: unknown,
  snapshot: Snapshot,
  weights: Weights
): readonly Refusal[] {
  if (!isRecord(graph) || !Object.values(graph).every(isApiNode)) {
    return [{ node: "-", reason: "the file is not an API graph" }]
  }
  const found: Refusal[] = []
  for (const [id, value] of Object.entries(graph)) {
    const { class_type: node, inputs } = value as ApiNode
    const held = snapshot.nodes[node]
    if (held === undefined) {
      found.push({ node: id, reason: `Comfy Cloud has no node ${node}` })
      continue
    }
    for (const [input, value] of Object.entries(inputs)) {
      const type = held[input]
      const reason =
        type === undefined
          ? `${node} takes no input ${input}`
          : fileRefusalOf(type, value, { node, input, snapshot, weights })
      if (reason !== null) {
        found.push({ node: id, reason })
      }
    }
  }
  return found
}

export async function readSnapshot(): Promise<Snapshot> {
  const text = await readFile(join(here, "cloud-nodes.json"), "utf8")
  return JSON.parse(text)
}

export async function readWeights(): Promise<Weights> {
  const text = await readFile(join(root, weightsPath), "utf8")
  return JSON.parse(text)
}

export async function graphsUnder(
  cwd: string
): Promise<ReadonlyArray<{ path: string; graph: unknown }>> {
  const paths: string[] = []
  for await (const path of new Glob("*/*.api.json").scan({ cwd })) {
    paths.push(path)
  }
  return Promise.all(
    paths.sort().map(async (path) => ({
      path,
      graph: JSON.parse(await readFile(join(cwd, path), "utf8")),
    }))
  )
}

async function controlHolds(
  snapshot: Snapshot,
  weights: Weights
): Promise<boolean> {
  const planted = await graphsUnder(join(here, "planted"))
  return (
    planted.length === 3 &&
    planted.every(
      ({ graph }) => refusalsOf(graph, snapshot, weights).length === 1
    )
  )
}

if (import.meta.main) {
  const [snapshot, weights] = await Promise.all([readSnapshot(), readWeights()])
  const graphs = await graphsUnder(join(root, "workflows"))
  let failed = 0
  for (const { path, graph } of graphs) {
    const refusals = refusalsOf(graph, snapshot, weights)
    failed += refusals.length > 0 ? 1 : 0
    for (const { node, reason } of refusals) {
      console.error(`workflows/${path}: node ${node}: ${reason}.`)
    }
  }
  const control = await controlHolds(snapshot, weights)
  console.log(
    `${graphs.length - failed} of ${graphs.length} graphs load on Comfy Cloud, per its object_info read on ${snapshot.readOn}. The planted graphs were ${control ? "each refused" : "not each refused"}.`
  )
  process.exit(failed === 0 && control ? 0 : 1)
}
