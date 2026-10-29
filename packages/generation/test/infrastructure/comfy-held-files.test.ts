import { describe, expect, it } from "vitest"
import type { EngineFiles, EngineRequest } from "#domain/generation-engine.port"
import { comfyWorkflow } from "#infrastructure/comfy/comfy-workflow-binding"
import { ComfyGenerationEngine } from "#infrastructure/comfy-generation-engine"
import { cloudUrl, comfyV2, uploadedId } from "./fixtures/comfy-v2"
import { ReplayFetch } from "./replay-fetch"

const binding = comfyWorkflow({
  workflow: {
    "199": { class_type: "LoadVideo", inputs: { file: "" } },
    "9": { class_type: "SaveVideo", inputs: { video: ["199", 0] } },
  },
  bindings: [
    { from: "file", name: "a-motion.mp4", path: ["199", "inputs", "file"] },
  ],
  models: ["sample-model.safetensors"],
})

const request: EngineRequest = {
  idempotencyKey: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
  binding,
  inputs: {},
  files: [],
  count: 1,
  aspectRatio: null,
  seed: 1,
  outputKind: "video",
}

const motion = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])

function engineWith(files: EngineFiles | undefined) {
  const replay = new ReplayFetch([comfyV2.upload(), comfyV2.submit()])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
    ...(files === undefined ? {} : { files }),
  })
  return { engine, replay }
}

describe("a file the engine holds for a graph", () => {
  it("is uploaded with the run and set where the graph names it, with no input of the run", async () => {
    const asked: string[] = []
    const { engine, replay } = engineWith({
      read: async (name) => {
        asked.push(name)
        return { mime: "video/mp4", bytes: motion }
      },
    })
    await engine.submit(request)
    expect(asked).toEqual(["a-motion.mp4"])
    const upload = replay.sent[0]
    expect(upload?.url).toBe(`${cloudUrl}/api/v2/assets`)
    expect(upload?.form?.get("content_type")).toBe("video/mp4")
    const body = replay.sent.find((sent) => sent.url.endsWith("/jobs"))?.body
    expect(JSON.parse(body ?? "{}").workflow["199"].inputs.file).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
  })

  it("fails the run before any request when the engine holds no such file", async () => {
    const { engine, replay } = engineWith({ read: async () => null })
    await expect(engine.submit(request)).rejects.toMatchObject({
      code: "RUN_FAILED",
    })
    expect(replay.sent).toEqual([])
  })

  it("fails the run when no file reader is set", async () => {
    const { engine } = engineWith(undefined)
    await expect(engine.submit(request)).rejects.toMatchObject({
      code: "RUN_FAILED",
    })
  })
})
