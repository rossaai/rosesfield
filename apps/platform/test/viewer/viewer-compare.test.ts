import { type Asset, asset, type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { compareInputOf } from "@/viewer/viewer-info"
import {
  catalog,
  fluxVideo,
  graph,
  waveSpeed,
} from "../studio/upscale/upscale-fixtures"

const photo = "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e01"
const clip = "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e03"
const output = "6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e04"
const runId = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e10"

function runOf(inputs: Record<string, unknown>): Run {
  return run.parse({
    id: runId,
    appId: "upscale",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [output],
    progress: null,
    engine: { adapter: "hosted-model", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
  })
}

function outputOf(kind: "image" | "video" | "audio"): Asset {
  return asset.parse({
    id: output,
    kind,
    mime:
      kind === "image"
        ? "image/png"
        : kind === "video"
          ? "video/mp4"
          : "audio/mpeg",
    bytes: 10,
    width: kind === "audio" ? null : 2,
    height: kind === "audio" ? null : 2,
    durationSeconds: kind === "image" ? null : 5,
    sourceRunId: runId,
    createdAt: "2026-10-17T09:00:03.000Z",
  })
}

describe("the file the viewer compares an output with", () => {
  it("is the file of the app's input of the output's kind on a graph run", () => {
    const made = runOf({ mode: "image", model: graph.id, image: [photo] })
    expect(compareInputOf(made, outputOf("image"), [])).toBe(photo)
  })

  it("is the file of the hosted model's own field, which no app input names", () => {
    const image = runOf({ model: waveSpeed.id, inputImage: [photo] })
    const video = runOf({ model: fluxVideo.id, inputVideo: [clip] })
    expect(compareInputOf(image, outputOf("image"), catalog)).toBe(photo)
    expect(compareInputOf(video, outputOf("video"), catalog)).toBe(clip)
  })

  it("is none for a field of another kind, an unknown model or a sound", () => {
    const image = runOf({ model: waveSpeed.id, inputImage: [photo] })
    expect(compareInputOf(image, outputOf("video"), catalog)).toBeNull()
    expect(compareInputOf(image, outputOf("image"), [])).toBeNull()
    expect(compareInputOf(image, outputOf("audio"), catalog)).toBeNull()
    expect(compareInputOf(null, outputOf("image"), catalog)).toBeNull()
  })
})
