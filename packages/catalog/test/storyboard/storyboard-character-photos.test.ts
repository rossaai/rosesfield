import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#storyboard/app"
import {
  type ApiWorkflow,
  cloudUrl,
  danglingLinks,
  type Recording,
  ReplayFetch,
  submitJob,
  workflowSent,
} from "./storyboard-replay"

const definition = appDefinition.parse(app)
const photoIds = [
  "1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e",
  "2f4b6d8e-0c1a-4b3c-9d5e-7f9a1b3c5d7e",
  "3a5c7e9f-1b2d-4c4e-8f6a-0b2d4f6a8c9e",
  "4b6d8f0a-2c3e-4d5f-9a7b-1c3e5f7a9b0d",
].map((id) => assetIdFormat.parse(id))
const comfyIds = [
  "8b0d2f4a-6c8e-4a1b-9d3f-5e7a9c1b3d5f",
  "9c1e3a5b-7d9f-4b2c-8e4a-6f8b0d2e4a6c",
  "0d2f4a6b-8c0e-4d3a-9f5b-7a9c1e3b5d7f",
  "1e3a5b7c-9d1f-4e4b-8a6c-8b0d2f4a6c8e",
]
const scenes = ["a girl opens the door of a small bakery", "she kneads dough"]
const loaders = ["7", "12", "13"]
const encoders = ["9", "103", "203", "303", "403", "503", "603", "703", "803"]

function uploadOf(comfyId: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: {
      id: comfyId,
      hash: "blake3:00000000",
      size_bytes: 8,
      content_type: "image/png",
      file_path: `${comfyId}.png`,
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
      url: `${cloudUrl}/api/v2/assets/${comfyId}/content`,
      url_expires_at: "2026-10-17T10:00:00Z",
    },
  }
}

async function sentFor(
  anchor: "character" | "reference",
  photos: readonly AssetId[]
): Promise<ApiWorkflow> {
  const parsed = startRunBodyFor(definition).parse({
    inputs: {
      look: "late afternoon light",
      sceneCount: "2",
      scene1: scenes[0],
      scene2: scenes[1],
      [anchor]: anchor === "character" ? photos.slice(0, 1) : photos,
    },
    count: 2,
    aspectRatio: "16:9",
  })
  const inputs = { ...parsed.inputs, [anchor]: [...photos] }
  const request: EngineRequest = {
    idempotencyKey: "storyboard-character-photos",
    binding: resolveBinding(definition.engine, inputs),
    inputs,
    files: photos.map((assetId) => ({
      assetId,
      kind: "image",
      mime: "image/png",
      bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
    })),
    count: 2,
    aspectRatio: "16:9",
    seed: 42,
    outputKind: "image",
  }
  const replay = new ReplayFetch([
    ...comfyIds.slice(0, photos.length).map(uploadOf),
    submitJob,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit(request)
  expect(replay.unused()).toEqual([])
  return workflowSent(replay)
}

function loadedIn(workflow: ApiWorkflow): string[] {
  return loaders.flatMap((id) => {
    const image = workflow[id]?.inputs.image
    return typeof image === "object" && image !== null && "info" in image
      ? [JSON.stringify(image)]
      : []
  })
}

function slotsOf(workflow: ApiWorkflow, encoder: string): string[] {
  return ["image1", "image2", "image3"].filter((slot) =>
    Object.hasOwn(workflow[encoder]?.inputs ?? {}, slot)
  )
}

describe("the Storyboard character photos sent to Qwen Image Edit 2511", () => {
  it("sends a character's first 3 photos to every edit call", async () => {
    const workflow = await sentFor("character", photoIds.slice(0, 3))
    expect(danglingLinks(workflow)).toEqual([])
    expect(loadedIn(workflow)).toEqual(
      comfyIds
        .slice(0, 3)
        .map((id) => JSON.stringify({ __type: "core/ASSET", info: { id } }))
    )
    for (const encoder of encoders) {
      expect(workflow[encoder]?.inputs).toMatchObject({
        image1: ["8", 0],
        image2: ["12", 0],
        image3: ["13", 0],
      })
    }
  })

  it("sends the first 3 photos of a character that holds 4", async () => {
    const workflow = await sentFor("character", photoIds)
    expect(danglingLinks(workflow)).toEqual([])
    expect(loadedIn(workflow)).toEqual(
      comfyIds
        .slice(0, 3)
        .map((id) => JSON.stringify({ __type: "core/ASSET", info: { id } }))
    )
  })

  it("sends 2 photos and no third image slot for a character with 2", async () => {
    const workflow = await sentFor("character", photoIds.slice(0, 2))
    expect(danglingLinks(workflow)).toEqual([])
    expect(loadedIn(workflow)).toHaveLength(2)
    expect(workflow["13"]).toBeUndefined()
    for (const encoder of encoders) {
      expect(slotsOf(workflow, encoder)).toEqual(["image1", "image2"])
    }
  })

  it("sends one photo and no other image slot for a character with 1", async () => {
    const workflow = await sentFor("character", photoIds.slice(0, 1))
    expect(danglingLinks(workflow)).toEqual([])
    expect(loadedIn(workflow)).toEqual([
      JSON.stringify({ __type: "core/ASSET", info: { id: comfyIds[0] } }),
    ])
    expect(workflow["12"]).toBeUndefined()
    expect(workflow["13"]).toBeUndefined()
    for (const encoder of encoders) {
      expect(slotsOf(workflow, encoder)).toEqual(["image1"])
    }
  })

  it("sends a reference as the one image of every edit call", async () => {
    const workflow = await sentFor("reference", photoIds.slice(0, 1))
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow["12"]).toBeUndefined()
    expect(workflow["13"]).toBeUndefined()
    for (const encoder of encoders) {
      expect(slotsOf(workflow, encoder)).toEqual(["image1"])
    }
  })
})
