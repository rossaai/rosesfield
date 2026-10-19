import { z } from "zod"

export const workflowId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80)

const nodeId = z.string().regex(/^[0-9A-Za-z_.-]{1,40}$/)

export const workflowInput = z.strictObject({
  nodeId,
  inputName: z.string().min(1).max(80),
  type: z.enum(["scalar", "cloud-asset"]),
})

export const workflowOutput = z.strictObject({
  nodeId,
  key: z.string().min(1).max(40),
  kind: z.enum(["image", "video", "audio", "text"]),
})

export const workflowEntry = z.strictObject({
  name: workflowId,
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(600).optional(),
  mediaType: z.enum(["image", "video", "audio"]),
  openSource: z.literal(true),
  models: z.array(z.string().min(1).max(200)).max(16),
  requiresCustomNodes: z.array(z.string().min(1).max(200)).max(16).default([]),
  inputBindings: z.record(
    z
      .string()
      .regex(/^[a-z][a-zA-Z0-9]*$/)
      .max(40),
    workflowInput
  ),
  outputs: z.array(workflowOutput).min(1).max(16),
})

export const apiNode = z.looseObject({
  class_type: z.string().min(1),
  inputs: z.record(z.string(), z.unknown()),
})

export const apiGraph = z.record(z.string(), apiNode)

export type WorkflowFiles = {
  folder: string
  entry: unknown
  graph: unknown
}

export type WorkflowEntry = z.infer<typeof workflowEntry>
export type WorkflowInput = z.infer<typeof workflowInput>
export type WorkflowOutput = z.infer<typeof workflowOutput>
