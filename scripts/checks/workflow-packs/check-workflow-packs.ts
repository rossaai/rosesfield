import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Glob } from "bun"
import { workflowEntry } from "../../../packages/catalog/src/workflow-entry.contract"

const here = fileURLToPath(new URL(".", import.meta.url))
const root = fileURLToPath(new URL("../../../", import.meta.url))

export type CloudPacks = {
  readonly readOn: string
  readonly packs: Readonly<Record<string, string>>
}
export type PackGraph = {
  readonly path: string
  readonly graph: unknown
  readonly declared: readonly string[]
}
export type Refusal = { readonly node: string; readonly reason: string }

const registryIds: Readonly<Record<string, string>> = {
  bfsnodes: "comfyui-bfsnodes",
}

export function registryIdOf(folder: string): string {
  return registryIds[folder] ?? folder.toLowerCase()
}

function classOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null
  }
  const node = (value as { class_type?: unknown }).class_type
  return typeof node === "string" ? node : null
}

export function refusalsOf(
  { graph, declared }: PackGraph,
  cloud: CloudPacks
): readonly Refusal[] {
  if (typeof graph !== "object" || graph === null || Array.isArray(graph)) {
    return [{ node: "-", reason: "the file is not an API graph" }]
  }
  const held = new Set(declared.map((one) => one.toLowerCase()))
  const found: Refusal[] = []
  for (const [id, value] of Object.entries(graph)) {
    const node = classOf(value)
    const folder = node === null ? undefined : cloud.packs[node]
    if (folder === undefined) {
      continue
    }
    const pack = registryIdOf(folder)
    if (!held.has(pack)) {
      found.push({
        node: id,
        reason: `${node} comes from the pack ${pack}, which requiresCustomNodes of entry.json does not declare`,
      })
    }
  }
  return found
}

export async function readCloudPacks(): Promise<CloudPacks> {
  return JSON.parse(await readFile(join(here, "cloud-packs.json"), "utf8"))
}

async function declaredOf(folder: string): Promise<readonly string[]> {
  const entry = Bun.file(join(folder, "entry.json"))
  if (!(await entry.exists())) {
    return []
  }
  return workflowEntry.parse(await entry.json()).requiresCustomNodes
}

export async function graphsUnder(cwd: string): Promise<readonly PackGraph[]> {
  const paths: string[] = []
  for await (const path of new Glob("*/*.api.json").scan({ cwd })) {
    paths.push(path)
  }
  return Promise.all(
    paths.sort().map(async (path) => ({
      path,
      graph: JSON.parse(await readFile(join(cwd, path), "utf8")),
      declared: await declaredOf(join(cwd, path, "..")),
    }))
  )
}

export async function plantedRefusals(
  cloud: CloudPacks
): Promise<readonly string[]> {
  const planted = await graphsUnder(join(here, "planted"))
  return planted.flatMap((graph) =>
    refusalsOf(graph, cloud).map((one) => `${graph.path} node ${one.node}`)
  )
}

if (import.meta.main) {
  const cloud = await readCloudPacks()
  const graphs = await graphsUnder(join(root, "workflows"))
  let failed = 0
  for (const graph of graphs) {
    const refusals = refusalsOf(graph, cloud)
    failed += refusals.length > 0 ? 1 : 0
    for (const { node, reason } of refusals) {
      console.error(`workflows/${graph.path}: node ${node}: ${reason}.`)
    }
  }
  const planted = await plantedRefusals(cloud)
  const control =
    planted.join(",") ===
    [359, 360, 361]
      .map((node) => `guide-on-main/guide-on-main.api.json node ${node}`)
      .join(",")
  console.log(
    `${graphs.length - failed} of ${graphs.length} graphs declare every custom node pack they run, per the python_module of each node class in Comfy Cloud's object_info read on ${cloud.readOn}. The planted guide graph, as on main before its packs were declared, was ${control ? "refused at nodes 359, 360 and 361" : `refused at ${planted.length === 0 ? "no node" : planted.join(", ")}, not at nodes 359, 360 and 361`}.`
  )
  process.exit(failed === 0 && control ? 0 : 1)
}
