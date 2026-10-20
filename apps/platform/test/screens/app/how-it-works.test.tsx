import { findApp } from "@rosesfield/catalog"
import { appListing, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { samplesOf, stepsOf } from "@/screens/app/how-it-works"
import type { SharedOutput } from "@/screens/explore/share-api"

const video = appListing.parse(findApp("video"))

function share(
  id: string,
  appId: string,
  kind: "image" | "video" | "audio"
): SharedOutput {
  return {
    id,
    path: `/share/${id}`,
    run: run.parse({
      id: `93e9078d-0000-4000-8000-0000000000${id.charCodeAt(0)}`,
      appId,
      status: "done",
      inputs: {},
      count: 1,
      aspectRatio: null,
      seed: null,
      outputs: [],
      progress: null,
      engine: { adapter: "demo", models: [], workflowHash: null },
      cost: null,
      origin: "live",
      failure: null,
      createdAt: "2026-10-20T10:00:00.000Z",
      finishedAt: "2026-10-20T10:00:03.000Z",
    }),
    media: [
      {
        index: 0,
        kind,
        mime: `${kind}/x`,
        width: 16,
        height: 9,
        durationSeconds: null,
      },
    ],
    createdAt: "2026-10-20T00:00:00.000Z",
    expiresAt: null,
    sources: [`/share/${id}/media/0`],
  }
}

describe("How it works", () => {
  it("shows only real results of this app, never a sound or another app's", () => {
    const samples = samplesOf(
      [
        share("a", "video", "video"),
        share("b", "image", "image"),
        share("c", "video", "audio"),
        share("d", "video", "image"),
      ],
      "video"
    )
    expect(samples).toEqual([
      { shareId: "a", kind: "video", src: "/share/a/media/0" },
      { shareId: "d", kind: "image", src: "/share/d/media/0" },
    ])
  })

  it("stands three steps, and puts Recreate on the two that play", () => {
    const samples = samplesOf(
      [share("a", "video", "image"), share("b", "video", "video"), share("c", "video", "video")],
      "video"
    )
    const steps = stepsOf(video, samples)
    expect(steps.map((step) => step.id)).toEqual(["inputs", "model", "result"])
    expect(steps.map((step) => step.action !== undefined)).toEqual([false, true, true])
    expect(steps.every((step) => step.media !== null)).toBe(true)
  })

  it("leaves a frame empty rather than invent a result", () => {
    const steps = stepsOf(video, [])
    expect(steps.map((step) => step.media)).toEqual([null, null, null])
    expect(steps.some((step) => step.action !== undefined)).toBe(false)
  })
})
