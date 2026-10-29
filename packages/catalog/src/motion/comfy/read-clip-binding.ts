import type { EngineBinding, RunInputs } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import { type ClipPlan, trackTextOf } from "#motion/clip-plan"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

export const readClipWorkflow = "motion-read-clip"

export const readClipOutputNodes = {
  depth: "13",
  mask: "28",
  firstFrame: "31",
} as const

export type ReadClipOutput = keyof typeof readClipOutputNodes

export type MotionStep = "read" | "edit"

export type MotionStepRequest = {
  step: MotionStep
  app: "motion" | "image"
  idempotencyKey: string
  binding: EngineBinding
  inputs: RunInputs
  aspectRatio: string | null
  seed: number
}

const bindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "clip", index: 0, to: "clip" },
  { from: "input", name: "targets", to: "targets" },
]

export const readClipBinding: EngineBinding = workflowBinding({
  workflow: readClipWorkflow,
  bindings,
})

export function stepKeyOf(runId: string, step: MotionStep): string {
  return `${runId}-${step}`
}

export function readClipRequestOf(input: {
  runId: string
  clip: AssetId
  plan: ClipPlan
  seed: number
}): MotionStepRequest {
  return {
    step: "read",
    app: "motion",
    idempotencyKey: stepKeyOf(input.runId, "read"),
    binding: readClipBinding,
    inputs: { clip: [input.clip], targets: trackTextOf(input.plan) },
    aspectRatio: null,
    seed: input.seed,
  }
}
