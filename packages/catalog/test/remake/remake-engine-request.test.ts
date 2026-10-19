import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import { app as recastApp } from "#recast/app"
import {
  type RemakeQuality,
  remakeEngine,
  type ShotRequest,
  type ShotRequestInput,
  shotRequestOf,
} from "#remake/comfy/remake-engine"
import { app } from "#remake/remake-app"
import { type FoundShot, planShots } from "#remake/shot-plan"
import { app as videoApp } from "#video/app"
import { type Recording, ReplayFetch } from "../recast/replay-fetch"

const cloudUrl = "https://cloud.comfy.org"
const jobId = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a"
const runId = "3f2e1d0c-9b8a-4776-a655-443322110000"
const clipId = assetIdFormat.parse("0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d")
const photoId = assetIdFormat.parse("1b2c3d4e-5f60-4b7c-9d8e-9f0a1b2c3d4e")
const characterId = characterIdFormat.parse(
  "2c3d4e5f-6071-4c8d-8e9f-0a1b2c3d4e5f"
)
const uploadedClip = "c1d2e3f4-a5b6-4c7d-8e9f-a0b1c2d3e4f5"
const uploadedPhoto = "d2e3f4a5-b6c7-4d8e-9fa0-b1c2d3e4f5a6"
const seed = 41

const shots: FoundShot[] = [
  { number: 1, startSeconds: 0, endSeconds: 2.5 },
  { number: 2, startSeconds: 2.5, endSeconds: 5.5 },
  { number: 3, startSeconds: 5.5, endSeconds: 7 },
]

const reply = {
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

const shotApps = {
  recast: appDefinition.parse(recastApp),
  video: appDefinition.parse(videoApp),
}

type Node = { class_type: string; inputs: Record<string, unknown> }

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

function uploaded(id: string, mime: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: mime, created_new: true },
  }
}

const submittedJob: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", outputs: [] },
}

function requestsFor(
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
      character: characterId,
      quality,
      instructions: "Warm light.",
      aspectRatio,
      seed,
    })
  )
}

function shotAt(
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

function bodyOf(request: ShotRequest) {
  return startRunBodyFor(shotApps[request.app]).safeParse({
    inputs: { ...request.inputs, seed: request.seed },
    aspectRatio: request.aspectRatio,
  })
}

async function submit(request: ShotRequest, recordings: Recording[]) {
  const replay = new ReplayFetch(recordings)
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const isReplaced = request.app === "recast"
  const submission = await engine.submit({
    idempotencyKey: request.idempotencyKey,
    binding: resolveBinding(request.binding, request.inputs),
    inputs: isReplaced
      ? { ...request.inputs, character: [photoId] }
      : request.inputs,
    files: isReplaced ? [clipFile, photoFile] : [],
    count: 1,
    aspectRatio: request.aspectRatio,
    seed: request.seed,
    outputKind: "video",
  })
  const job = replay.sent.find((sent) => sent.url.endsWith("/api/v2/jobs"))
  const body: { workflow: Record<string, Node> } = JSON.parse(job?.body ?? "{}")
  return { submission, replay, job, workflow: body.workflow }
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

function expectWorkflow(
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

function asset(id: string) {
  return { __type: "core/ASSET", info: { id } }
}

describe("the engine requests Remake sends to Comfy for each shot", () => {
  it("lists the app with its inputs and binds both shot apps' own engines", () => {
    const definition = appDefinition.parse(app)
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "reference",
      "character",
      "instructions",
      "otherShots",
      "keepSound",
      "quality",
      "seed",
    ])
    expect(definition.engine).toEqual(remakeEngine)
    expect(remakeEngine.config).toEqual({
      replace: shotApps.recast.engine,
      rebuild: shotApps.video.engine,
    })
  })

  it.each([
    ["draft", "16:9"],
    ["final", "9:16"],
  ] as const)(
    "makes each shot at %s a run its own app's contract accepts",
    (quality, ratio) => {
      const requests = requestsFor(quality, "rebuild", ratio)
      expect(requests.map((request) => request?.app)).toEqual([
        "recast",
        "video",
        "video",
      ])
      for (const request of requests) {
        if (request === null) {
          return expect.unreachable("a shot has no engine request")
        }
        const parsed = bodyOf(request)
        expect(parsed.error?.issues ?? []).toEqual([])
      }
    }
  )

  it("control: a rebuilt shot with sound on at Draft breaks Video's contract", () => {
    const rebuilt = shotAt(1, "draft", "16:9")
    const parsed = bodyOf({
      ...rebuilt,
      inputs: { ...rebuilt.inputs, sound: "on" },
    })
    expect(parsed.success).toBe(false)
  })

  it("sends a shot with one person to the character workflow at Final", async () => {
    const replaced = shotAt(0, "final", "9:16")
    const { submission, replay, job, workflow } = await submit(replaced, [
      uploaded(uploadedClip, "video/mp4"),
      uploaded(uploadedPhoto, "image/png"),
      submittedJob,
    ])
    expect(replay.unused()).toEqual([])
    expect(job?.headers.get("Idempotency-Key")).toBe(
      `${runId}-shot-1-attempt-1`
    )
    expectWorkflow("recast-character-scail-2", workflow, submission.models)
    expect(workflow).toMatchObject({
      "1": { inputs: { file: asset(uploadedClip) } },
      "3": {
        inputs: { "resize_type.width": 704, "resize_type.height": 1248 },
      },
      "11": { inputs: { image: asset(uploadedPhoto) } },
      "20": { inputs: { steps: 40 } },
      "34": { inputs: { noise_seed: 41 } },
      "82": { inputs: { value: false } },
    })
  })

  it("sends a shot with one person to the character workflow at Draft with its smaller size and fewer steps", async () => {
    const replaced = shotAt(0, "draft", "16:9")
    const { workflow } = await submit(replaced, [
      uploaded(uploadedClip, "video/mp4"),
      uploaded(uploadedPhoto, "image/png"),
      submittedJob,
    ])
    expect(workflow).toMatchObject({
      "3": { inputs: { "resize_type.width": 896, "resize_type.height": 512 } },
      "20": { inputs: { steps: 6 } },
      "82": { inputs: { value: false } },
    })
  })

  it("rebuilds a shot with no person from its words, its move and the next seed with LTX 2.5 at Final", async () => {
    const rebuilt = shotAt(1, "final", "9:16")
    const { submission, replay, job, workflow } = await submit(rebuilt, [
      submittedJob,
    ])
    expect(replay.unused()).toEqual([])
    expect(job?.headers.get("Idempotency-Key")).toBe(
      `${runId}-shot-2-attempt-1`
    )
    expectWorkflow("video-ltx-2-5-text", workflow, submission.models)
    expect(workflow).toMatchObject({
      "900": {
        inputs: {
          string_a: "A wet street at night with lit shop windows. Warm light.",
          string_b: "\nThe camera moves slowly forward, toward the subject.",
        },
      },
      "356": { inputs: { width: 384, height: 672, length: 73 } },
      "339": { inputs: { noise_seed: 42 } },
    })
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
  })

  it("rebuilds a shot of 1.5 seconds as 2 seconds with Wan 2.2 at Draft", async () => {
    const several = shotAt(2, "draft", "16:9")
    const { submission, workflow } = await submit(several, [submittedJob])
    expectWorkflow("video-wan-2-2-text", workflow, submission.models)
    expect(workflow).toMatchObject({
      "900": {
        inputs: {
          string_a: "A crowd at a market stall. Warm light.",
          string_b: "",
        },
      },
      "74": { inputs: { width: 848, height: 480, length: 33 } },
      "81": { inputs: { noise_seed: 43 } },
    })
  })

  it("control: the Final shot's inputs with Draft's model reach Wan 2.2 and not LTX 2.5", async () => {
    const rebuilt = shotAt(1, "final", "16:9")
    const { submission, workflow } = await submit(
      {
        ...rebuilt,
        inputs: { ...rebuilt.inputs, model: "wan-2-2", resolution: "480p" },
      },
      [submittedJob]
    )
    expectWorkflow("video-wan-2-2-text", workflow, submission.models)
    expect(workflow).not.toHaveProperty("356")
  })

  it("sends nothing for shots kept as they are", () => {
    const requests = requestsFor("draft", "keep", "16:9")
    expect(requests.map((request) => request?.shot ?? null)).toEqual([
      1,
      null,
      null,
    ])
  })

  it("keys a second attempt apart from the first", () => {
    const plan = planShots(shots, reply, "rebuild") ?? []
    const [first] = plan
    if (first === undefined) {
      return expect.unreachable("the plan has no first shot")
    }
    const input: Omit<ShotRequestInput, "attempt"> = {
      runId,
      shot: first,
      clip: clipId,
      character: characterId,
      quality: "draft",
      instructions: "",
      aspectRatio: "16:9",
      seed: 2_147_483_647,
    }
    const once = shotRequestOf({ ...input, attempt: 1 })
    const again = shotRequestOf({ ...input, attempt: 2 })
    expect(once?.idempotencyKey).toBe(`${runId}-shot-1-attempt-1`)
    expect(again?.idempotencyKey).toBe(`${runId}-shot-1-attempt-2`)
    expect(again?.seed).toBe(2_147_483_647)
  })
})
