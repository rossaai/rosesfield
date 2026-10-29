import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"

type Spec = readonly [unknown, Record<string, unknown>?]
type Section = {
  required?: Record<string, Spec>
  optional?: Record<string, Spec>
}
type ObjectInfo = Record<string, { input: Section }>
type Reading = {
  node: string
  lists: Map<string, readonly string[]>
  into: Record<string, string>
}

const output = fileURLToPath(
  new URL(
    "../../../scripts/checks/cloud-graphs/cloud-nodes.json",
    import.meta.url
  )
)
const weightFile = /\.(safetensors|sft|ckpt|pt|pth|bin|gguf|onnx)$/i
const recipe =
  "For each node class object_info lists, the name of every input it takes, required or optional. A dynamic combo adds each option's inputs as <input>.<name>, and an autogrow input adds one <input>.<name> per name its template allows. A combo whose options name a weight file is a file list: fileInputs maps <class>.<input> to its list, and lists keeps each list once"

function optionsOf(spec: Spec): readonly unknown[] | null {
  const [type, config] = spec
  if (Array.isArray(type)) {
    return type
  }
  const options = config?.options
  return Array.isArray(options) ? options : null
}

function readSection(prefix: string, section: Section, at: Reading): void {
  for (const group of [section.required, section.optional]) {
    for (const [key, spec] of Object.entries(group ?? {})) {
      readInput(`${prefix}${key}`, spec, at)
    }
  }
}

function readAutogrow(
  name: string,
  config: Record<string, unknown>,
  at: Reading
): void {
  const template = config.template as {
    input: Section
    names?: readonly string[]
    prefix?: string
    max?: number
  }
  const inner: Reading = { ...at, into: {} }
  readSection("", template.input, inner)
  const names =
    template.names ??
    Array.from(
      { length: template.max ?? 0 },
      (_, index) => `${template.prefix ?? ""}${index}`
    )
  for (const one of names) {
    at.into[`${name}.${one}`] = Object.values(inner.into)[0] ?? "*"
  }
}

function listIdOf(name: string, files: readonly string[], at: Reading): string {
  const key = JSON.stringify(files)
  for (const [id, held] of at.lists) {
    if (JSON.stringify(held) === key) {
      return id
    }
  }
  const id = `${at.node}.${name}`
  at.lists.set(id, files)
  return id
}

function readInput(name: string, spec: Spec, at: Reading): void {
  const [type, config = {}] = spec
  if (type === "COMFY_DYNAMICCOMBO_V3") {
    at.into[name] = "COMBO"
    for (const option of optionsOf(spec) ?? []) {
      const inputs = (option as { inputs?: Section }).inputs ?? {}
      readSection(`${name}.`, inputs, at)
    }
    return
  }
  if (type === "COMFY_AUTOGROW_V3") {
    readAutogrow(name, config, at)
    return
  }
  const options = optionsOf(spec)
  if (options === null) {
    at.into[name] = String(type)
    return
  }
  const files = options.filter((one) => typeof one === "string").sort()
  at.into[name] = files.some((one) => weightFile.test(one))
    ? `@${listIdOf(name, files, at)}`
    : "COMBO"
}

export function snapshotOf(objectInfo: ObjectInfo, readOn: string): unknown {
  const lists = new Map<string, readonly string[]>()
  const nodes: Record<string, readonly string[]> = {}
  const fileInputs: Record<string, string> = {}
  for (const node of Object.keys(objectInfo).sort()) {
    const at: Reading = { node, lists, into: {} }
    readSection("", objectInfo[node]?.input ?? {}, at)
    nodes[node] = Object.keys(at.into).sort()
    for (const [input, type] of Object.entries(at.into)) {
      if (type.startsWith("@")) {
        fileInputs[`${node}.${input}`] = type.slice(1)
      }
    }
  }
  return {
    source: "GET /api/object_info on Comfy Cloud",
    readOn,
    recipe,
    nodes,
    fileInputs,
    lists: Object.fromEntries(lists),
  }
}

if (import.meta.main) {
  const key = process.env.COMFY_API_KEY
  if (!key) {
    console.error("Set COMFY_API_KEY, such as with --env-file=.env.local.")
    process.exit(1)
  }
  const response = await fetch(
    `${ComfyGenerationEngine.cloudUrl}/api/object_info`,
    {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(120_000),
    }
  )
  if (!response.ok) {
    console.error(`object_info answered ${response.status}.`)
    process.exit(1)
  }
  const objectInfo: ObjectInfo = await response.json()
  const readOn = new Date().toISOString().slice(0, 10)
  const snapshot = snapshotOf(objectInfo, readOn)
  writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`)
  Bun.spawnSync(["bunx", "biome", "format", "--write", output])
  console.log(
    `${Object.keys(objectInfo).length} node classes written to ${output}.`
  )
}
