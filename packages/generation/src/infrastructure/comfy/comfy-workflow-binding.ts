import type { EngineBinding } from "@rosesfield/contract"
import { z } from "zod"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { isRecord } from "#domain/is-record"
import { comfyValueBinding } from "#infrastructure/comfy/comfy-value-binding"

export const comfyWorkflowAdapter = "comfy-workflow"

export const comfyWorkflowConfig = z
  .strictObject({
    workflow: z.record(z.string(), z.unknown()),
    bindings: z.array(comfyValueBinding).max(64),
    models: z.array(z.string().min(1).max(200)).max(16).optional(),
    outputsPerJob: z.enum(["all", "one"]).default("all"),
    partnerNodes: z.array(z.string().min(1).max(80)).max(16).default([]),
    results: z.array(z.string().min(1).max(32)).max(16).optional(),
  })
  .refine(
    (config) =>
      config.partnerNodes.every((name) =>
        Object.values(config.workflow).some(
          (node) => isRecord(node) && node.class_type === name
        )
      ),
    {
      message: "Every partner node a workflow names is a node of its graph",
      path: ["partnerNodes"],
    }
  )
  .refine(
    (config) =>
      config.outputsPerJob === "all" ||
      config.bindings.every((binding) => binding.from !== "count"),
    {
      message: "A workflow that makes one output per job binds no count",
      path: ["outputsPerJob"],
    }
  )

export type ComfyWorkflowConfig = z.infer<typeof comfyWorkflowConfig>
export type ComfyWorkflowConfigInput = z.input<typeof comfyWorkflowConfig>

export function comfyWorkflow(config: ComfyWorkflowConfigInput): EngineBinding {
  return { adapter: comfyWorkflowAdapter, config }
}

export function parseComfyWorkflow(
  binding: EngineBinding
): ComfyWorkflowConfig {
  const result = comfyWorkflowConfig.safeParse(binding.config)
  if (!result.success) {
    throw new EngineBindingInvalidError({
      adapter: comfyWorkflowAdapter,
      reason: z.prettifyError(result.error),
    })
  }
  return result.data
}

export function resultNodesOf(
  binding: EngineBinding
): readonly string[] | null {
  if (binding.adapter !== comfyWorkflowAdapter) {
    return null
  }
  const result = comfyWorkflowConfig.safeParse(binding.config)
  return result.success ? (result.data.results ?? null) : null
}

export function runsPartnerNode(config: ComfyWorkflowConfig): boolean {
  return config.partnerNodes.length > 0
}

export function partnerNodesOf(binding: EngineBinding): readonly string[] {
  if (binding.adapter !== comfyWorkflowAdapter) {
    return []
  }
  const result = comfyWorkflowConfig.safeParse(binding.config)
  return result.success ? result.data.partnerNodes : []
}

export async function workflowHashOf(
  workflow: Record<string, unknown>
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(workflow))
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}
