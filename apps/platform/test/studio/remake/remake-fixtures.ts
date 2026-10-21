import {
  type AppListing,
  appDefinition,
  appListing,
  type Run,
  run,
} from "@rosesfield/contract"
import type { RemakePlan } from "@/studio/remake/remake-plan"
import { app } from "../../../../../packages/catalog/src/remake/remake-app"

export const remake: AppListing = appListing.parse(appDefinition.parse(app))

export const editId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
export const outputId = "4f506172-8394-4e0f-9a1b-3c4d5e6f7081"
export const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"
export const runId = "3f2e1d0c-9b8a-4776-a655-443322110000"

export const wirePlanOfThree = {
  shots: [
    {
      number: 1,
      startSeconds: 0,
      endSeconds: 4,
      people: "one",
      route: "replace",
      model: "LTX 2.3 control",
      credits: 8,
      seed: 7,
      words: null,
      cameraMove: null,
    },
    {
      number: 2,
      startSeconds: 4,
      endSeconds: 7.5,
      people: "none",
      route: "rebuild",
      model: "LTX 2.5",
      credits: 4.5,
      seed: 8,
      words: "A wide street at dusk.",
      cameraMove: "push-in",
    },
    {
      number: 3,
      startSeconds: 7.5,
      endSeconds: 10,
      people: "several",
      route: "keep",
      model: null,
      credits: null,
      seed: null,
      words: null,
      cameraMove: null,
    },
  ],
}

export const planOfThree: RemakePlan = {
  shots: [
    {
      number: 1,
      startSeconds: 0,
      endSeconds: 4,
      route: "replace",
      model: "LTX 2.3 control",
      credits: 8,
      seed: 7,
      words: null,
      cameraMove: null,
    },
    {
      number: 2,
      startSeconds: 4,
      endSeconds: 7.5,
      route: "rebuild",
      model: "LTX 2.5",
      credits: 4.5,
      seed: 8,
      words: "A wide street at dusk.",
      cameraMove: "push-in",
    },
    {
      number: 3,
      startSeconds: 7.5,
      endSeconds: 10,
      route: "keep",
      model: null,
      credits: null,
      seed: null,
      words: null,
      cameraMove: null,
    },
  ],
}

type RunFields = { [Field in keyof Run]?: unknown }

export function remakeRun(change: RunFields = {}): Run {
  return run.parse({
    id: runId,
    appId: "remake",
    status: "done",
    inputs: { reference: [editId], character: [characterId] },
    count: 1,
    aspectRatio: "9:16",
    seed: 7,
    outputs: [outputId],
    progress: null,
    engine: { adapter: "remake-shots", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-21T09:00:00.000Z",
    finishedAt: "2026-10-21T09:10:00.000Z",
    ...change,
  })
}
