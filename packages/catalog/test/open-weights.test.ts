import type { EngineBinding } from "@rosesfield/contract"
import { comfyWorkflowAdapter } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { listApps } from "#list-apps"

const partnerNodeClasses: readonly string[] = ["GeminiImage2Node"]

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
  return nested.length === 0 ? [binding] : nested.flatMap(leavesOf)
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

describe("the build runs open weights only", () => {
  it.each(listApps().map((app) => ({ id: app.id, app })))(
    "$id binds only ComfyUI workflows with no partner node",
    ({ app }) => {
      const leaves = leavesOf(app.engine)
      expect(leaves.map((leaf) => leaf.adapter)).toEqual(
        leaves.map(() => comfyWorkflowAdapter)
      )
      const partners = leaves
        .flatMap(nodeClassesOf)
        .filter((name) => partnerNodeClasses.includes(name))
      expect(partners).toEqual([])
    }
  )
})
