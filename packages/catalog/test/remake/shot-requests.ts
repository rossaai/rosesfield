import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { expect } from "vitest"
import { z } from "zod"
import { findWorkflow } from "#list-workflows"
import { app as motionApp } from "#motion/app"
import {
  type RemakeQuality,
  type ShotRequest,
  shotRequestOf,
} from "#remake/comfy/remake-engine"
import { type FoundShot, planShots } from "#remake/shot-plan"
import { app as videoApp } from "#video/app"
import { type Recording, ReplayFetch } from "../motion/motion-replay"
import { withoutVideoStills } from "../workflows/video-stills"

const cloudUrl = "https://cloud.comfy.org"
const jobId = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a"
export const runId = "3f2e1d0c-9b8a-4776-a655-443322110000"
export const clipId = assetIdFormat.parse(
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d"
)
export const photoId = assetIdFormat.parse(
  "1b2c3d4e-5f60-4b7c-9d8e-9f0a1b2c3d4e"
)
export const uploadedClip = "c1d2e3f4-a5b6-4c7d-8e9f-a0b1c2d3e4f5"
export const uploadedPhoto = "d2e3f4a5-b6c7-4d8e-9fa0-b1c2d3e4f5a6"
export const seed = 41

export const shots: FoundShot[] = [
  { number: 1, startSeconds: 0, endSeconds: 2.5 },
  { number: 2, startSeconds: 2.5, endSeconds: 5.5 },
  { number: 3, startSeconds: 5.5, endSeconds: 7 },
]

export const reply = {
  shots: [
    { people: "one", words: null, cameraMove: null },
    {
      people: "none",
      words: "A wet street at night with lit shop windows.",
      cameraMove: "push-in",
    },
    {
      people: "several",
      words: "A crowd at a market stall.",
      cameraMove: null,
    },
  ],
}

export const shotApps = {
  motion: appDefinition.parse(motionApp),
  video: appDefinition.parse(videoApp),
}

type Node = { class_type: string; inputs: Record<string, unknown> }

const sentJob = z.object({
  workflow: z.record(
    z.string(),
    z.object({
      class_type: z.string(),
      inputs: z.record(z.string(), z.unknown()),
    })
  ),
})

const clipFile: EngineFile = {
  assetId: clipId,
  kind: "video",
  mime: "video/mp4",
  bytes: Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70),
}

const photoFile: EngineFile = {
  assetId: photoId,
  kind: "image",
  mime: "image/png",
  bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
}

export function uploaded(id: string, mime: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: mime, created_new: true },
  }
}

export const submittedJob: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", outputs: [] },
}

export function requestsFor(
  quality: RemakeQuality,
  otherShots: "rebuild" | "keep",
  aspectRatio: string
): (ShotRequest | null)[] {
  const plan = planShots(shots, reply, otherShots)
  expect(plan).not.toBeNull()
  return (plan ?? []).map((shot) =>
    shotRequestOf({
      runId,
      attempt: 1,
      shot,
      clip: shot.route === "replace" ? clipId : null,
      photo: photoId,
      quality,
      instructions: "Warm light.",
      aspectRatio,
      seed,
    })
  )
}

export function shotAt(
  index: number,
  quality: RemakeQuality,
  aspectRatio: string
): ShotRequest {
  const request = requestsFor(quality, "rebuild", aspectRatio)[index]
  if (request === null || request === undefined) {
    return expect.unreachable("the shot has no engine request")
  }
  return request
}

export function bodyOf(request: ShotRequest) {
  return startRunBodyFor(shotApps[request.app]).safeParse({
    inputs: { ...request.inputs, seed: request.seed },
    aspectRatio: request.aspectRatio,
  })
}

export async function submit(request: ShotRequest, recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const isReplaced = request.app === "motion"
  const submission = await engine.submit({
    idempotencyKey: request.idempotencyKey,
    binding: resolveBinding(request.binding, request.inputs),
    inputs: request.inputs,
    files: isReplaced ? [photoFile, clipFile] : [],
    count: 1,
    aspectRatio: request.aspectRatio,
    seed: request.seed,
    outputKind: "video",
  })
  const job = replay.sent.find((sent) => sent.url.endsWith("/api/v2/jobs"))
  const { workflow } = sentJob.parse(job?.body ?? { workflow: {} })
  return { submission, replay, job, workflow: withoutVideoStills(workflow) }
}

function classesOf(graph: Record<string, unknown>): string[] {
  return [
    ...new Set(
      Object.values(graph).map((node) =>
        typeof node === "object" && node !== null && "class_type" in node
          ? String(node.class_type)
          : ""
      )
    ),
  ].sort()
}

export function expectWorkflow(
  id: string,
  workflow: Record<string, Node>,
  models: readonly string[]
): void {
  const file = findWorkflow(id)
  if (file === null) {
    throw new Error(`workflows/ holds no ${id}`)
  }
  expect(classesOf(workflow)).toEqual(classesOf(file.graph))
  expect(models).toEqual(file.models)
}

const wanName = /(^|[^a-z])wan[\s_.-]?2|scail/i

export function wanNamesOf(value: unknown): string[] {
  if (typeof value === "string") {
    return wanName.test(value) ? [value] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap(wanNamesOf)
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(wanNamesOf)
  }
  return []
}

export function asset(id: string) {
  return { __type: "core/ASSET", info: { id } }
}
