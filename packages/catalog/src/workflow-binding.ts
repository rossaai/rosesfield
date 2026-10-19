import type { EngineBinding } from "@rosesfield/contract"
import {
  type ComfyValueBinding,
  comfyWorkflow,
} from "@rosesfield/generation/bindings"
import { findWorkflow, type Workflow } from "#list-workflows"
import { WorkflowInvalidError } from "#workflow-invalid.error"

type Targeted<Binding> = Binding extends { path: unknown }
  ? Omit<Binding, "path"> & { to: string }
  : never

export type WorkflowValueBinding = Targeted<ComfyValueBinding>

type Graph = Record<string, unknown>

type WorkflowBindingOptions = {
  workflow: string
  bindings: readonly WorkflowValueBinding[]
  outputsPerJob?: "all" | "one"
  patch?: (graph: Graph) => Graph
  find?: (id: string) => Workflow | null
}

type Path = ComfyValueBinding["path"]

function pathed(binding: WorkflowValueBinding, path: Path): ComfyValueBinding {
  switch (binding.from) {
    case "input": {
      const { to: _, ...rest } = binding
      return { ...rest, path }
    }
    case "seed": {
      const { to: _, ...rest } = binding
      return { ...rest, path }
    }
    case "count": {
      const { to: _, ...rest } = binding
      return { ...rest, path }
    }
    case "aspectRatio": {
      const { to: _, ...rest } = binding
      return { ...rest, path }
    }
  }
}

export function workflowBinding(
  options: WorkflowBindingOptions
): EngineBinding {
  const find = options.find ?? findWorkflow
  const workflow = find(options.workflow)
  if (workflow === null) {
    throw new WorkflowInvalidError({
      folder: options.workflow,
      reason: "no folder of workflows/ holds it",
    })
  }
  const bindings = options.bindings.map((binding) => {
    const target = Object.hasOwn(workflow.inputs, binding.to)
      ? workflow.inputs[binding.to]
      : undefined
    if (target === undefined) {
      throw new WorkflowInvalidError({
        folder: workflow.id,
        reason: `its input map has no ${binding.to}`,
      })
    }
    return pathed(binding, [...target.path])
  })
  const copy = structuredClone(workflow.graph)
  const graph = options.patch === undefined ? copy : options.patch(copy)
  const lost = bindings.find(
    (binding) => !Object.hasOwn(graph, binding.path[0] ?? "")
  )
  if (lost !== undefined) {
    throw new WorkflowInvalidError({
      folder: workflow.id,
      reason: `the patch removed node ${lost.path[0]}, which a binding uses`,
    })
  }
  return comfyWorkflow({
    workflow: graph,
    bindings,
    models: [...workflow.models],
    outputsPerJob: options.outputsPerJob ?? "all",
  })
}
