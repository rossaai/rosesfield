import { defineRoute, run } from "@rosesfield/contract"
import { z } from "zod"

export const sharedMedia = z.object({
  index: z.number().int().min(0),
  kind: z.enum(["image", "video", "audio"]),
  mime: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  durationSeconds: z.number().positive().nullable(),
})

export const shareView = z.object({
  id: z.string(),
  path: z.string(),
  run,
  media: z.array(sharedMedia),
  poster: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
})

export const shareResponse = z.object({ share: shareView })

export const shareListResponse = z.object({ shares: z.array(shareView) })

export type ShareView = z.infer<typeof shareView>

export const sharePaths = {
  list: "/share",
  page: "/share/:shareId",
  data: "/share/:shareId/data",
  media: "/share/:shareId/media/:index",
  poster: "/share/:shareId/poster",
}

export const shareRoutes = {
  shareRun: defineRoute({
    method: "POST",
    path: "/api/runs/:runId/share",
    params: z.object({ runId: z.string() }),
    query: null,
    body: "bytes",
    response: shareResponse,
    status: 201,
  }),
}
