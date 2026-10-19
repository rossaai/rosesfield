import { z } from "zod"
import { assetId, runId } from "#id.contract"
import { timestamp } from "#value.contract"

export const assetKind = z.enum(["image", "video", "audio", "text"])

export const mimeType = z
  .string()
  .regex(/^[a-z]+\/[a-z0-9][a-z0-9.+-]*$/)
  .max(127)

export const asset = z.object({
  id: assetId,
  kind: assetKind,
  mime: mimeType,
  bytes: z.number().int().min(0),
  width: z.number().int().min(1).nullable(),
  height: z.number().int().min(1).nullable(),
  durationSeconds: z.number().positive().nullable(),
  sourceRunId: runId.nullable(),
  createdAt: timestamp,
})

export type AssetKind = z.infer<typeof assetKind>
export type Asset = z.infer<typeof asset>
