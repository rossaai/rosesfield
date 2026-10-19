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
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/recast/app"
import { localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const startPath = buildPath(routes.startRun.path, { appId: "recast" })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const clip = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)
const mp4Brand = [0x66, 0x74, 0x79, 0x70]

describe("a Recast run through the gateway on the demo engine", () => {
  let folder: string
  let clock: FixedClock
  let gateway: LocalGateway

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-recast-"))
    clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
    })
    gateway.jobs.stop()
  })

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  async function call(path: string, init: RequestInit = {}) {
    return gateway.app.request(path, {
      ...init,
      headers: { ...host, ...init.headers },
    })
  }

  function post(body: unknown, key: string): RequestInit {
    return {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body),
    }
  }

  async function upload(bytes: Uint8Array, mime: string): Promise<string> {
    const response = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: bytes,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function saveCharacter(): Promise<string> {
    const portrait = await upload(photo, "image/png")
    const response = await call(
      routes.createCharacter.path,
      post({ name: "June", references: [portrait], notes: "" }, "character-1")
    )
    expect(response.status).toBe(201)
    return characterResponse.parse(await response.json()).character.id
  }

  async function drive(runId: string): Promise<void> {
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

  async function startAndFinish(inputs: Record<string, unknown>, key: string) {
    const response = await call(
      startPath,
      post({ inputs, aspectRatio: "9:16" }, key)
    )
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId: "recast", origin: "demo", count: 1 })
    await drive(run.id)
    const read = await call(buildPath(routes.getRun.path, { runId: run.id }))
    return runResponse.parse(await read.json()).run
  }

  async function expectOneClip(outputs: readonly string[]): Promise<void> {
    expect(outputs).toHaveLength(1)
    const outputId = outputs[0] ?? ""
    const asset = await call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      width: 360,
      height: 640,
    })
    const content = await call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    expect(content.headers.get("content-type")).toBe("video/mp4")
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(4, 8)]).toEqual(mp4Brand)
  }

  it("puts a saved character in a clip and keeps one clip in the library", async () => {
    const source = await upload(clip, "video/mp4")
    const character = await saveCharacter()
    const done = await startAndFinish(
      { mode: "character", source: [source], character: [character] },
      "recast-character-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      mode: "character",
      source: [source],
      character: [character],
      keepSound: "on",
      quality: "draft",
    })
    expect(done.seed).toEqual(expect.any(Number))
    await expectOneClip(done.outputs)
  })

  it("swaps a named object in a clip with its sound off", async () => {
    const source = await upload(clip, "video/mp4")
    const done = await startAndFinish(
      {
        mode: "object",
        source: [source],
        target: "red mug",
        prompt: "a glass of orange juice",
        keepSound: "off",
        quality: "final",
      },
      "recast-object-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({ mode: "object", keepSound: "off" })
    await expectOneClip(done.outputs)
  })

  async function refusal(inputs: Record<string, unknown>, key: string) {
    const response = await call(startPath, post({ inputs }, key))
    return {
      status: response.status,
      body:
        response.status === 400
          ? errorEnvelope.parse(await response.json())
          : null,
    }
  }

  async function runCount(): Promise<number> {
    const response = await call(routes.listRuns.path)
    return runPageResponse.parse(await response.json()).runs.length
  }

  it("refuses a run without a clip and starts nothing", async () => {
    const { status, body } = await refusal(
      { mode: "object", target: "lamp", prompt: "a vase" },
      "recast-empty-1"
    )
    expect(status).toBe(400)
    expect(body?.error.code).toBe("RUN_INPUT_INVALID")
    expect(await runCount()).toBe(0)
  })

  it("refuses each input that belongs to the other mode or is missing in its own", async () => {
    const source = await upload(clip, "video/mp4")
    const character = await saveCharacter()
    const runs = [
      { mode: "character", source: [source] },
      {
        mode: "character",
        source: [source],
        character: [character],
        target: "lamp",
      },
      { mode: "object", source: [source], prompt: "a vase" },
      { mode: "object", source: [source], target: "lamp" },
      {
        mode: "object",
        source: [source],
        target: "lamp",
        prompt: "a vase",
        character: [character],
      },
    ]
    for (const [index, inputs] of runs.entries()) {
      const { status, body } = await refusal(inputs, `recast-refused-${index}`)
      expect(status, JSON.stringify(inputs)).toBe(400)
      expect(body?.error.code).toBe("RUN_INPUT_INVALID")
    }
    expect(await runCount()).toBe(0)
  })
})

describe("control: a gateway serving Recast without its mode rules", () => {
  it("starts a character run that has no character", async () => {
    const folder = mkdtempSync(join(tmpdir(), "rosesfield-recast-control-"))
    const definition = appDefinition.parse(app)
    const loose = {
      ...definition,
      inputs: definition.inputs.map((input) => {
        if (input.type === "seed") {
          return input
        }
        const { when: _, ...rest } = input
        return "presence" in rest && rest.name !== "source"
          ? { ...rest, presence: "optional" as const }
          : rest
      }),
    }
    const gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(loose)],
      clock: new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") }),
      platformRoot: null,
    })
    gateway.jobs.stop()
    try {
      const uploadResponse = await gateway.app.request(
        routes.uploadAsset.path,
        {
          method: "POST",
          headers: { ...host, "content-type": "video/mp4" },
          body: clip,
        }
      )
      const source = assetResponse.parse(await uploadResponse.json()).asset.id
      const response = await gateway.app.request(startPath, {
        method: "POST",
        headers: {
          ...host,
          "content-type": "application/json",
          "idempotency-key": "recast-control-1",
        },
        body: JSON.stringify({
          inputs: { mode: "character", source: [source] },
        }),
      })
      expect(response.status).toBe(202)
    } finally {
      gateway.jobs.stop()
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
