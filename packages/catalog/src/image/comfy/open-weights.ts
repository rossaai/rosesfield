import type { EngineBinding } from "@rosesfield/contract"
import { heightsOf, type SizeTable, widthsOf } from "#image/comfy/image-sizes"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

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

export function flux2Klein4b(table: SizeTable): EngineBinding {
  return workflowBinding({
    workflow: "image-flux-2-klein-4b",
    bindings: [
      ...shared,
      ...sizeBindings(
        table,
        ["schedulerWidth", "width"],
        ["schedulerHeight", "height"]
      ),
    ],
  })
}

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
