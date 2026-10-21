import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { nodeInputs } from "#ads/comfy/ads-prompts"
import { qwenSlots, qwenWorkflow } from "#ads/comfy/qwen-edit-workflow"
import { heightsOf, type SizeTable, widthsOf } from "#image/comfy/image-sizes"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

function sizeBindings(
  table: SizeTable,
  widths: readonly string[],
  heights: readonly string[]
): WorkflowValueBinding[] {
  const widthMap = widthsOf(table)
  const heightMap = heightsOf(table)
  return [
    ...widths.map(
      (to): WorkflowValueBinding => ({ from: "aspectRatio", map: widthMap, to })
    ),
    ...heights.map(
      (to): WorkflowValueBinding => ({
        from: "aspectRatio",
        map: heightMap,
        to,
      })
    ),
  ]
}

const shared: readonly WorkflowValueBinding[] = [
  { from: "input", name: "prompt", to: "prompt" },
  { from: "seed", to: "seed" },
  { from: "count", to: "count" },
]

export function zImageTurbo(table: SizeTable): EngineBinding {
  return workflowBinding({
    workflow: "image-z-image-turbo",
    bindings: [...shared, ...sizeBindings(table, ["width"], ["height"])],
  })
}

export function qwenImage2512(table: SizeTable): EngineBinding {
  return workflowBinding({
    workflow: "image-qwen-image-2512",
    bindings: [...shared, ...sizeBindings(table, ["width"], ["height"])],
  })
}

export const referenceInput = "references"

export const editReferenceLimit = 3

type ApiGraph = ReturnType<typeof apiGraph.parse>

function editPatch(graph: ApiGraph, used: number): ApiGraph {
  const slotted = qwenSlots(graph, used)
  nodeInputs(slotted, qwenWorkflow, "508").string_b = ""
  nodeInputs(slotted, qwenWorkflow, "9").filename_prefix = "rosesfield-image"
  return slotted
}

function editWithReferences(table: SizeTable, used: number): EngineBinding {
  return workflowBinding({
    workflow: qwenWorkflow,
    bindings: [
      ...shared,
      ...Array.from(
        { length: used },
        (_, index): WorkflowValueBinding => ({
          from: "input",
          name: referenceInput,
          index,
          to: `reference${index + 1}`,
        })
      ),
      ...sizeBindings(table, ["width"], ["height"]),
    ],
    patch: (source) => editPatch(apiGraph.parse(source), used),
  })
}

export function qwenImageEdit2511(table: SizeTable): EngineBinding {
  return selectBinding({
    input: referenceInput,
    by: "count",
    options: Object.fromEntries(
      Array.from({ length: editReferenceLimit }, (_, index) => [
        String(index + 1),
        editWithReferences(table, index + 1),
      ])
    ),
  })
}
