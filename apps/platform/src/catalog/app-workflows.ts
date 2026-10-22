import { findApp } from "@rosesfield/catalog"
import { listWorkflows, type Workflow } from "@rosesfield/catalog/workflows"
import type {
  AppListing,
  EngineBinding,
  InputDefinition,
  Run,
} from "@rosesfield/contract"
import { isModeInput } from "@/catalog/mode-input"

type Inputs = Readonly<Record<string, unknown>>
type OutputKind = AppListing["output"]["kind"]
type GraphNodes = ReadonlySet<string>

const selectAdapter = "select"
const taskAdapter = "task"
const workflowAdapter = "comfy-workflow"
const maxDepth = 8
const maxWalk = 32
const leastHeld = 0.5
const matched = new WeakMap<object, Workflow | null>()
let known: ReadonlyArray<{ workflow: Workflow; nodes: GraphNodes }> | null =
  null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function fieldOf(value: unknown, name: string): unknown {
  return isRecord(value) && Object.hasOwn(value, name) ? value[name] : undefined
}

function isBinding(value: unknown): value is EngineBinding {
  return (
    typeof fieldOf(value, "adapter") === "string" &&
    isRecord(fieldOf(value, "config"))
  )
}

function keyOf(by: unknown, value: unknown): string | null {
  const count = Array.isArray(value) ? value.length : 0
  switch (by ?? "value") {
    case "value":
      return typeof value === "string" ? value : null
    case "filled":
      return count === 0 ? "empty" : "filled"
    case "count":
      return String(count)
    default:
      return null
  }
}

function chosen(binding: EngineBinding, inputs: Inputs): EngineBinding | null {
  const input = fieldOf(binding.config, "input")
  const options = fieldOf(binding.config, "options")
  if (typeof input !== "string" || !isRecord(options)) {
    return null
  }
  const key = keyOf(fieldOf(binding.config, "by"), inputs[input])
  const next = key === null ? undefined : fieldOf(options, key)
  return isBinding(next) ? next : null
}

function resolved(
  binding: EngineBinding,
  inputs: Inputs
): EngineBinding | null {
  let current: EngineBinding | null = binding
  for (
    let depth = 0;
    current?.adapter === selectAdapter || current?.adapter === taskAdapter;
    depth += 1
  ) {
    if (depth >= maxDepth) {
      return null
    }
    const next: unknown =
      current.adapter === taskAdapter
        ? fieldOf(current.config, "fallback")
        : chosen(current, inputs)
    current = isBinding(next) ? next : null
  }
  return current
}

function defaultOf(input: InputDefinition): unknown {
  switch (input.type) {
    case "choice":
    case "number":
    case "toggle":
      return input.default
    case "prompt":
      return ""
    case "seed":
      return undefined
    default:
      return []
  }
}

function nodesOf(graph: Record<string, unknown>): GraphNodes {
  return new Set(
    Object.entries(graph).map(
      ([id, node]) => `${id}:${String(fieldOf(node, "class_type"))}`
    )
  )
}

function knownWorkflows(): ReadonlyArray<{
  workflow: Workflow
  nodes: GraphNodes
}> {
  known ??= listWorkflows().map((workflow) => ({
    workflow,
    nodes: nodesOf(workflow.graph),
  }))
  return known
}

type Match = { held: number; overlap: number }

function matchOf(bound: GraphNodes, workflow: GraphNodes): Match {
  const shared = [...bound].filter((node) => workflow.has(node)).length
  return {
    held: shared / bound.size,
    overlap: shared / (bound.size + workflow.size - shared),
  }
}

function isCloser(next: Match, best: Match): boolean {
  return (
    next.held > best.held ||
    (next.held === best.held && next.overlap > best.overlap)
  )
}

function workflowOfGraph(graph: Record<string, unknown>): Workflow | null {
  const cached = matched.get(graph)
  if (cached !== undefined) {
    return cached
  }
  const nodes = nodesOf(graph)
  let best: Workflow | null = null
  let bestMatch: Match = { held: 0, overlap: 0 }
  for (const candidate of knownWorkflows()) {
    const match = matchOf(nodes, candidate.nodes)
    if (isCloser(match, bestMatch)) {
      best = candidate.workflow
      bestMatch = match
    }
  }
  const found = bestMatch.held >= leastHeld ? best : null
  matched.set(graph, found)
  return found
}

export function workflowFor(appId: string, inputs: Inputs): Workflow | null {
  const app = findApp(appId)
  if (app === null) {
    return null
  }
  const filled = Object.fromEntries(
    app.inputs.map((input) => [input.name, defaultOf(input)])
  )
  const binding = resolved(app.engine, { ...filled, ...inputs })
  const graph = fieldOf(binding?.config, "workflow")
  return binding?.adapter === workflowAdapter && isRecord(graph)
    ? workflowOfGraph(graph)
    : null
}

function workflowBindingsIn(value: unknown, depth: number): EngineBinding[] {
  if (depth > maxWalk) {
    return []
  }
  if (isBinding(value)) {
    if (
      value.adapter === workflowAdapter &&
      isRecord(fieldOf(value.config, "workflow"))
    ) {
      return [value]
    }
    return workflowBindingsIn(value.config, depth + 1)
  }
  const children = Array.isArray(value)
    ? value
    : isRecord(value)
      ? Object.values(value)
      : []
  return children.flatMap((child) => workflowBindingsIn(child, depth + 1))
}

export function appWorkflows(appId: string): Workflow[] {
  const app = findApp(appId)
  if (app === null) {
    return []
  }
  const found = new Map<string, Workflow>()
  for (const binding of workflowBindingsIn(app.engine, 0)) {
    const graph = fieldOf(binding.config, "workflow")
    const workflow = isRecord(graph) ? workflowOfGraph(graph) : null
    if (workflow !== null) {
      found.set(workflow.id, workflow)
    }
  }
  return [...found.values()]
}

export function runWorkflow(run: Run): Workflow | null {
  return workflowFor(run.appId, run.inputs)
}

export function outputKindsOf(app: AppListing): OutputKind[] {
  const mode = app.inputs.find(isModeInput)
  if (mode === undefined || mode.type !== "choice") {
    return [app.output.kind]
  }
  const kinds = mode.options.map(
    (option) =>
      workflowFor(app.id, { [mode.name]: option.value })?.outputs[0]?.kind ??
      app.output.kind
  )
  return [...new Set(kinds)]
}
