import type { Recording } from "./replay-fetch"

export const cloudUrl = "https://cloud.comfy.org"
export const jobId = "4c2e6a8b-1d3f-4a5b-9c7d-2e4f6a8b0c1d"

export const submitJob: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: {
    id: jobId,
    status: "queued",
    created_at: "2026-10-17T09:00:00Z",
    started_at: null,
    completed_at: null,
    expires_at: "2026-10-18T09:00:00Z",
    queue_position: 1,
    progress: null,
    outputs: [],
    error: null,
    urls: {
      self: `/api/v2/jobs/${jobId}`,
      events: `/api/v2/jobs/${jobId}/events`,
      cancel: `/api/v2/jobs/${jobId}/cancel`,
    },
  },
}
