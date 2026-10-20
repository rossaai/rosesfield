import { type Run, run } from "@rosesfield/contract"

export const sharedRun: Run = run.parse({
  id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
  appId: "image",
  status: "done",
  inputs: { prompt: "</script><script>alert(1)</script>" },
  count: 1,
  aspectRatio: "1:1",
  seed: 1,
  outputs: [],
  progress: 1,
  engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-19T12:00:00.000Z",
  finishedAt: "2026-10-19T12:00:05.000Z",
})
