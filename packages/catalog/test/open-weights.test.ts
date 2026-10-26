import type { EngineBinding } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  partnerNodesOf,
  selectAdapter,
} from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { listApps } from "#list-apps"

const partnerNodeClasses: readonly string[] = [
  "GeminiImage2Node",
  "MeshyImageToModelNode",
  "TripoImageToModelNodeV2",
  "Rodin3D_Gen25_Image",
  "TencentImageToModelNode",
]

const admittedPartnerNodes: Readonly<Record<string, readonly string[]>> = {
  "three-d": ["MeshyImageToModelNode"],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nestedBindings(value: unknown): EngineBinding[] {
  if (Array.isArray(value)) {
    return value.flatMap(nestedBindings)
  }
  if (!isRecord(value)) {
    return []
  }
  if (typeof value.adapter === "string" && isRecord(value.config)) {
    return [{ adapter: value.adapter, config: value.config }]
  }
  return Object.values(value).flatMap(nestedBindings)
}

function leavesOf(binding: EngineBinding): EngineBinding[] {
  if (binding.adapter === comfyWorkflowAdapter) {
    return [binding]
  }
  const nested = nestedBindings(binding.config)
  return nested.length === 0 && binding.adapter !== selectAdapter
    ? [binding]
    : nested.flatMap(leavesOf)
}

function nodeClassesOf(binding: EngineBinding): string[] {
  const graph = binding.config.workflow
  return isRecord(graph)
    ? Object.values(graph).flatMap((node) =>
        isRecord(node) && typeof node.class_type === "string"
          ? [node.class_type]
          : []
      )
    : []
}

function undeclaredPartners(binding: EngineBinding): string[] {
  const declared = partnerNodesOf(binding)
  return nodeClassesOf(binding).filter(
    (name) => partnerNodeClasses.includes(name) && !declared.includes(name)
  )
}

describe("the build runs open weights, and only the partner nodes docs/models.md lists", () => {
  it.each(listApps().map((app) => ({ id: app.id, app })))(
    "$id binds only ComfyUI workflows, and declares each partner node it runs",
    ({ app }) => {
      const leaves = leavesOf(app.engine)
      expect(leaves.map((leaf) => leaf.adapter)).toEqual(
        leaves.map(() => comfyWorkflowAdapter)
      )
      expect(leaves.flatMap(undeclaredPartners)).toEqual([])
      const declared = [...new Set(leaves.flatMap(partnerNodesOf))]
      expect(declared).toEqual(admittedPartnerNodes[app.id] ?? [])
    }
  )

  it("finds a partner node a graph runs without declaring it, the control", () => {
    const graph = {
      "2": { class_type: "MeshyImageToModelNode", inputs: {} },
    }
    const hidden = {
      adapter: comfyWorkflowAdapter,
      config: { workflow: graph },
    }
    expect(undeclaredPartners(hidden)).toEqual(["MeshyImageToModelNode"])
  })
})
