import { z } from "zod"
import {
  apiGraph,
  type WorkflowEntry,
  type WorkflowFiles,
  type WorkflowInput,
  type WorkflowOutput,
  workflowEntry,
} from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"
import { workflowFiles } from "#workflows.gen"

export type WorkflowTarget = WorkflowInput & {
  path: [nodeId: string, field: "inputs", inputName: string]
}

export type Workflow = {
  id: string
  mediaType: WorkflowEntry["mediaType"]
  graph: Record<string, unknown>
  inputs: Readonly<Record<string, WorkflowTarget>>
  models: readonly string[]
  outputs: readonly WorkflowOutput[]
  requiresCustomNodes: readonly string[]
  partnerNodes: readonly string[]
  runsOn: WorkflowEntry["runsOn"]
  files: { ui: string; api: string }
}

let listed: readonly Workflow[] | null = null

function invalid(folder: string, reason: string): WorkflowInvalidError {
  return new WorkflowInvalidError({ folder, reason })
}

function parsed<Value>(
  folder: string,
  what: string,
  schema: z.ZodType<Value>,
  value: unknown
): Value {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw invalid(folder, `${what}: ${z.prettifyError(result.error)}`)
  }
  return result.data
}

function targetsOf(
  folder: string,
  entry: WorkflowEntry,
  graph: z.infer<typeof apiGraph>
): Record<string, WorkflowTarget> {
  const targets: Record<string, WorkflowTarget> = {}
  for (const [name, input] of Object.entries(entry.inputBindings)) {
    const node = graph[input.nodeId]
    if (node === undefined) {
      throw invalid(
        folder,
        `the input ${name} names node ${input.nodeId}, which the API file lacks`
      )
    }
    if (!Object.hasOwn(node.inputs, input.inputName)) {
      throw invalid(
        folder,
        `node ${input.nodeId} has no input ${input.inputName}`
      )
    }
    targets[name] = {
      ...input,
      path: [input.nodeId, "inputs", input.inputName],
    }
  }
  return targets
}

function checkGraph(folder: string, graph: z.infer<typeof apiGraph>): void {
  const nested = Object.keys(graph).find((id) => id.includes(":"))
  if (nested !== undefined) {
    throw invalid(
      folder,
      `node ${nested} sits in a subgraph, and a workflow is flat`
    )
  }
}

export function readWorkflow(files: WorkflowFiles): Workflow {
  const { folder } = files
  const entry = parsed(folder, "entry.json", workflowEntry, files.entry)
  if (entry.name !== folder) {
    throw invalid(
      folder,
      `its name is ${entry.name}, and a workflow's name is its folder name`
    )
  }
  const graph = parsed(folder, `${folder}.api.json`, apiGraph, files.graph)
  checkGraph(folder, graph)
  const absent = entry.partnerNodes.find(
    (name) => !Object.values(graph).some((node) => node.class_type === name)
  )
  if (absent !== undefined) {
    throw invalid(
      folder,
      `it names the partner node ${absent}, which the API file lacks`
    )
  }
  const missing = entry.outputs.find(
    (output) => graph[output.nodeId] === undefined
  )
  if (missing !== undefined) {
    throw invalid(
      folder,
      `the output node ${missing.nodeId} is not in the API file`
    )
  }
  return {
    id: entry.name,
    mediaType: entry.mediaType,
    graph,
    inputs: targetsOf(folder, entry, graph),
    models: entry.models,
    outputs: entry.outputs,
    requiresCustomNodes: entry.requiresCustomNodes,
    partnerNodes: entry.partnerNodes,
    runsOn: entry.runsOn,
    files: {
      ui: `workflows/${folder}/${folder}.json`,
      api: `workflows/${folder}/${folder}.api.json`,
    },
  }
}

export function readWorkflows(files: readonly WorkflowFiles[]): Workflow[] {
  const seen = new Set<string>()
  return files.map((one) => {
    if (seen.has(one.folder)) {
      throw invalid(one.folder, "another folder lists the same workflow")
    }
    seen.add(one.folder)
    return readWorkflow(one)
  })
}

export function listWorkflows(): readonly Workflow[] {
  listed ??= readWorkflows(workflowFiles)
  return listed
}

export function findWorkflow(id: string): Workflow | null {
  return listWorkflows().find((workflow) => workflow.id === id) ?? null
}
