import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"
import {
  type WorkflowEntry,
  workflowEntry,
} from "../../../packages/catalog/src/workflow-entry.contract"

const here = fileURLToPath(new URL(".", import.meta.url))
const root = fileURLToPath(new URL("../../../", import.meta.url))
const weightsPath = "packages/catalog/src/comfy/cloud-weights.json"
const weightFile = /\.(safetensors|sft|ckpt|pt|pth|bin|gguf|onnx)$/i

export type Snapshot = {
  readonly readOn: string
  readonly nodes: Readonly<Record<string, readonly string[]>>
  readonly fileInputs: Readonly<Record<string, string>>
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
export type Cloud = { readonly snapshot: Snapshot; readonly weights: Weights }
export type Graph = {
  readonly path: string
  readonly graph: unknown
  readonly runsOn: WorkflowEntry["runsOn"]
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
  value: unknown,
  at: { node: string; input: string; cloud: Cloud }
): string | null {
  const { snapshot, weights } = at.cloud
  const list = snapshot.fileInputs[`${at.node}.${at.input}`]
  if (typeof value !== "string") {
    return null
  }
  if (list === undefined && !weightFile.test(value)) {
    return null
  }
  const listed = list === undefined ? [] : (snapshot.lists[list] ?? [])
  if (
    listed.includes(value) ||
    isHeldWeight(at.node, at.input, value, weights)
  ) {
    return null
  }
  return `${at.input} loads ${value}, which Comfy Cloud does not list for ${at.node} and ${weightsPath} does not hold`
}

export function refusalsOf(
  { graph, runsOn }: Graph,
  cloud: Cloud
): readonly Refusal[] {
  if (!isRecord(graph) || !Object.values(graph).every(isApiNode)) {
    return [{ node: "-", reason: "the file is not an API graph" }]
  }
  const found: Refusal[] = []
  for (const [id, value] of Object.entries(graph)) {
    const { class_type: node, inputs } = value as ApiNode
    const held = cloud.snapshot.nodes[node]
    if (held === undefined) {
      found.push({ node: id, reason: `Comfy Cloud has no node ${node}` })
      continue
    }
    for (const [input, value] of Object.entries(inputs)) {
      const reason = !held.includes(input)
        ? `${node} takes no input ${input}`
        : runsOn === "local-only"
          ? null
          : fileRefusalOf(value, { node, input, cloud })
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

async function runsOnOf(folder: string): Promise<WorkflowEntry["runsOn"]> {
  const entry = Bun.file(join(folder, "entry.json"))
  if (!(await entry.exists())) {
    return "cloud-and-local"
  }
  return workflowEntry.parse(await entry.json()).runsOn
}

export async function graphsUnder(cwd: string): Promise<readonly Graph[]> {
  const paths: string[] = []
  for await (const path of new Glob("*/*.api.json").scan({ cwd })) {
    paths.push(path)
  }
  return Promise.all(
    paths.sort().map(async (path) => ({
      path,
      graph: JSON.parse(await readFile(join(cwd, path), "utf8")),
      runsOn: await runsOnOf(join(cwd, path, "..")),
    }))
  )
}

async function controlHolds(cloud: Cloud): Promise<boolean> {
  const planted = await graphsUnder(join(here, "planted"))
  return (
    planted.length === 4 &&
    planted.every((graph) => refusalsOf(graph, cloud).length === 1)
  )
}

if (import.meta.main) {
  const [snapshot, weights] = await Promise.all([readSnapshot(), readWeights()])
  const cloud = { snapshot, weights }
  const graphs = await graphsUnder(join(root, "workflows"))
  let failed = 0
  for (const graph of graphs) {
    const refusals = refusalsOf(graph, cloud)
    failed += refusals.length > 0 ? 1 : 0
    for (const { node, reason } of refusals) {
      console.error(`workflows/${graph.path}: node ${node}: ${reason}.`)
    }
  }
  const local = graphs.filter((graph) => graph.runsOn === "local-only").length
  const control = await controlHolds(cloud)
  console.log(
    `${graphs.length - failed} of ${graphs.length} graphs load on Comfy Cloud, per its object_info read on ${snapshot.readOn}, ${local} of them local-only, whose weight files Comfy Cloud need not hold. The planted graphs were ${control ? "each refused once" : "not each refused once"}.`
  )
  process.exit(failed === 0 && control ? 0 : 1)
}
