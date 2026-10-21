import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  appDefinition,
  assetResponse,
  buildPath,
  characterResponse,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/storyboard/app"
import { localEnv } from "../server-env"

const startPath = buildPath(routes.startRun.path, { appId: "storyboard" })
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const localHost = { host: "127.0.0.1:8787" }

type Call = {
  method?: string
  headers?: Record<string, string>
  body?: string | Uint8Array
}

function postJson(body: unknown, key: string): Call {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(body),
  }
}

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe("a Storyboard run through the local gateway on the demo engine", () => {
  const clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
  let folder = ""
  let gateway: LocalGateway

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  function open(): void {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-storyboard-"))
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
    })
  }

  async function call(path: string, init: Call = {}): Promise<Response> {
    return gateway.app.request(path, {
      ...init,
      headers: { ...localHost, ...init.headers },
    })
  }

  async function drive(runId: string): Promise<void> {
    gateway.jobs.stop()
    for (let step = 0; step < 20; step += 1) {
      const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
        runId: runIdFormat.parse(runId),
      })
      if (nextWakeMs === null) {
        return
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }

  async function upload(): Promise<string> {
    const response = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: Uint8Array.of(...pngSignature, 0, 0, 0, 13),
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  it("makes one keyframe per scene from a reference, keeps them in the library and records the inputs", async () => {
    open()
    const reference = await upload()
    const response = await call(
      startPath,
      postJson(
        {
          inputs: {
            reference: [reference],
            sceneCount: "3",
            scene1: "a fox wakes in a den",
            scene2: "the fox crosses a frozen river",
            scene3: "the fox watches the town lights",
            look: "blue hour, soft fog",
          },
          count: 3,
        },
        "storyboard-run-1"
      )
    )
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({
      appId: "storyboard",
      status: "queued",
      origin: "demo",
      count: 3,
      aspectRatio: "16:9",
    })
    await drive(run.id)

    const read = await call(buildPath(routes.getRun.path, { runId: run.id }))
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(3)
    expect(done.seed).toEqual(expect.any(Number))
    expect(done.inputs).toMatchObject({
      model: "qwen-image-edit-2511",
      sceneCount: "3",
      reference: [reference],
      scene2: "the fox crosses a frozen river",
      look: "blue hour, soft fog",
    })
    for (const outputId of done.outputs) {
      const content = await call(
        buildPath(routes.readAssetContent.path, { assetId: outputId })
      )
      expect(content.headers.get("content-type")).toBe("image/png")
      const bytes = new Uint8Array(await content.arrayBuffer())
      expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
      const size = pngSize(bytes)
      expect(Math.abs(size.width / size.height - 16 / 9)).toBeLessThan(
        (16 / 9) * 0.02
      )
    }
  })

  async function finished(body: unknown, key: string) {
    const response = await call(startPath, postJson(body, key))
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    await drive(run.id)
    const read = await call(buildPath(routes.getRun.path, { runId: run.id }))
    return runResponse.parse(await read.json()).run
  }

  async function refused(body: unknown, key: string): Promise<void> {
    const response = await call(startPath, postJson(body, key))
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    const list = await call(routes.listRuns.path)
    expect(list.status).toBe(200)
    expect(JSON.stringify(await list.json())).not.toContain("storyboard")
  }

  async function accepted(body: unknown, key: string): Promise<void> {
    const response = await call(startPath, postJson(body, key))
    expect(response.status).toBe(202)
  }

  async function savedCharacter(): Promise<string> {
    const photo = await upload()
    const created = await call(routes.createCharacter.path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", references: [photo], notes: "" }),
    })
    expect(created.status).toBe(201)
    return characterResponse.parse(await created.json()).character.id
  }

  it("makes keyframes from a saved character", async () => {
    open()
    const character = await savedCharacter()
    const done = await finished(
      {
        inputs: {
          character: [character],
          sceneCount: "2",
          scene1: "she opens a window",
          scene2: "she waters the plants",
        },
        aspectRatio: "9:16",
      },
      "storyboard-run-4"
    )
    expect(done.status).toBe("done")
    expect(done.count).toBe(2)
    expect(done.outputs).toHaveLength(2)
    expect(done.inputs).toMatchObject({ character: [character] })
  })

  it("makes keyframe 1 from the first scene when there is no reference and no character", async () => {
    open()
    const done = await finished(
      {
        inputs: {
          sceneCount: "4",
          scene1: "a lighthouse at dawn",
          scene2: "a boat leaves the harbour",
          scene3: "the boat passes the lighthouse",
          scene4: "the boat reaches open sea",
        },
      },
      "storyboard-run-5"
    )
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(4)
  })

  it("refuses a reference and a character together before a run starts", async () => {
    open()
    const reference = await upload()
    const character = await savedCharacter()
    await refused(
      {
        inputs: {
          reference: [reference],
          character: [character],
          scene1: "a door",
        },
      },
      "storyboard-run-6"
    )
    await accepted(
      { inputs: { character: [character], scene1: "a door" } },
      "storyboard-run-6b"
    )
  })

  it("refuses an empty scene inside the scene count and a scene past it", async () => {
    open()
    await refused(
      { inputs: { sceneCount: "2", scene1: "a door", scene2: " " } },
      "storyboard-run-7"
    )
    await refused(
      { inputs: { sceneCount: "1", scene1: "a door", scene2: "a hall" } },
      "storyboard-run-8"
    )
    await accepted(
      { inputs: { sceneCount: "2", scene1: "a door", scene2: "a hall" } },
      "storyboard-run-8b"
    )
  })

  it("refuses a count that differs from the scene count", async () => {
    open()
    await refused(
      {
        inputs: { sceneCount: "2", scene1: "a door", scene2: "a hall" },
        count: 3,
      },
      "storyboard-run-9"
    )
    await accepted(
      {
        inputs: { sceneCount: "2", scene1: "a door", scene2: "a hall" },
        count: 2,
      },
      "storyboard-run-9b"
    )
  })

  it("refuses a ninth keyframe before a run starts", async () => {
    open()
    await refused(
      { inputs: { scene1: "a door" }, count: 9 },
      "storyboard-run-2"
    )
  })

  it("refuses a scene longer than 500 characters before a run starts", async () => {
    open()
    await refused(
      { inputs: { scene1: "a".repeat(501) }, count: 1 },
      "storyboard-run-3"
    )
  })
})
