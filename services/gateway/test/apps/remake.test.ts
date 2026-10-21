import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type AppDefinition,
  appDefinition,
  assetResponse,
  buildPath,
  characterResponse,
  errorEnvelope,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { closeRemake } from "@rosesfield/catalog/remake"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import type { EngineSettings } from "#engine/engine-target"
import { app } from "../../../../packages/catalog/src/remake/app"
import { comfyCloud, demoEngine, localEnv } from "../server-env"

const host = { host: "127.0.0.1:8787" }
const startPath = buildPath(routes.startRun.path, { appId: "remake" })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const edit = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)
const mp4Brand = [0x66, 0x74, 0x79, 0x70]
const remake = appDefinition.parse(app)

function loosened(definition: AppDefinition): AppDefinition {
  return appDefinition.parse({
    ...definition,
    output:
      definition.output.kind === "video"
        ? { ...definition.output, count: { default: 1, max: 4 } }
        : definition.output,
    inputs: definition.inputs.map((input) => {
      switch (input.type) {
        case "character":
          return { ...input, presence: "optional" }
        case "prompt":
          return { ...input, maxLength: 1000 }
        default:
          return input
      }
    }),
  })
}

describe("a Remake run through the gateway", () => {
  const folders: string[] = []
  let clock: FixedClock
  let gateway: LocalGateway

  function compose(engine: EngineSettings, definition = remake): void {
    const folder = mkdtempSync(join(tmpdir(), "rosesfield-remake-"))
    folders.push(folder)
    clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
    gateway = composeLocalGateway({
      env: localEnv(folder, engine),
      apps: [definition],
      clock,
      platformRoot: null,
    })
    gateway.jobs.stop()
  }

  afterEach(() => {
    gateway.jobs.stop()
    for (const folder of folders.splice(0)) {
      rmSync(folder, { recursive: true, force: true })
    }
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

  async function runCount(): Promise<number> {
    const response = await call(routes.listRuns.path)
    return runPageResponse.parse(await response.json()).runs.length
  }

  async function startStatus(body: unknown, key: string) {
    const response = await call(startPath, post(body, key))
    return {
      status: response.status,
      code:
        response.status >= 400
          ? errorEnvelope.parse(await response.json()).error.code
          : null,
    }
  }

  async function refusedBodies() {
    const reference = await upload(edit, "video/mp4")
    const character = await saveCharacter()
    const whole = { reference: [reference], character: [character] }
    return [
      { inputs: { reference: [reference] } },
      { inputs: { ...whole, instructions: "a".repeat(301) } },
      { inputs: whole, count: 2 },
    ]
  }

  it("remakes an edit with a saved character on the demo engine and keeps one video", async () => {
    compose(demoEngine)
    const reference = await upload(edit, "video/mp4")
    const character = await saveCharacter()
    const response = await call(
      startPath,
      post(
        {
          inputs: {
            reference: [reference],
            character: [character],
            instructions: "Warm light.",
            seed: 41,
          },
          aspectRatio: "9:16",
        },
        "remake-1"
      )
    )
    expect(response.status).toBe(202)
    const started = runResponse.parse(await response.json()).run
    expect(started).toMatchObject({ appId: "remake", origin: "demo", count: 1 })
    await drive(started.id)
    const read = await call(
      buildPath(routes.getRun.path, { runId: started.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.seed).toBe(41)
    expect(done.aspectRatio).toBe("9:16")
    expect(done.inputs).toEqual({
      reference: [reference],
      character: [character],
      instructions: "Warm light.",
      otherShots: "rebuild",
      keepSound: "on",
      quality: "draft",
      seed: 41,
    })
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
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
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(4, 8)]).toEqual(mp4Brand)
  })

  it("keeps every choice of a run, so Use these inputs fills them back", async () => {
    compose(demoEngine)
    const reference = await upload(edit, "video/mp4")
    const character = await saveCharacter()
    const inputs = {
      reference: [reference],
      character: [character],
      instructions: "",
      otherShots: "keep",
      keepSound: "off",
      quality: "final",
      seed: 7,
    }
    const response = await call(startPath, post({ inputs }, "remake-keep-1"))
    expect(response.status).toBe(202)
    const started = runResponse.parse(await response.json()).run
    await drive(started.id)
    const read = await call(
      buildPath(routes.getRun.path, { runId: started.id })
    )
    const done = runResponse.parse(await read.json()).run
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual(inputs)
    expect(done.aspectRatio).toBe("16:9")
  })

  it("refuses a run with no character, instructions past 300 characters, or two videos, and starts nothing", async () => {
    compose(demoEngine)
    for (const [index, body] of (await refusedBodies()).entries()) {
      const { status, code } = await startStatus(
        body,
        `remake-refused-${index}`
      )
      expect(status, JSON.stringify(body)).toBe(400)
      expect(code).toBe("RUN_INPUT_INVALID")
    }
    expect(await runCount()).toBe(0)
  })

  it("control: a gateway serving Remake with its bounds loosened starts each of those runs", async () => {
    compose(demoEngine, loosened(remake))
    const bodies = await refusedBodies()
    for (const [index, body] of bodies.entries()) {
      const { status } = await startStatus(body, `remake-loose-${index}`)
      expect(status, JSON.stringify(body)).toBe(202)
    }
    expect(await runCount()).toBe(bodies.length)
  })

  it("starts a run on the Remake runner with a Comfy key, because a server on bun runs ffmpeg", async () => {
    compose(comfyCloud("comfyui-test"))
    const reference = await upload(edit, "video/mp4")
    const character = await saveCharacter()
    const response = await call(
      startPath,
      post(
        { inputs: { reference: [reference], character: [character] } },
        "remake-3"
      )
    )
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run.engine.adapter).toBe("remake-shots")
    expect(await runCount()).toBe(1)
  })

  it("control: the same gateway serving Remake closed, as Workers and public mode do, refuses the run and starts nothing", async () => {
    compose(comfyCloud("comfyui-test"), closeRemake([remake])[0] ?? remake)
    const reference = await upload(edit, "video/mp4")
    const character = await saveCharacter()
    const { status, code } = await startStatus(
      { inputs: { reference: [reference], character: [character] } },
      "remake-4"
    )
    expect(status).toBe(409)
    expect(code).toBe("APP_CLOSED")
    expect(await runCount()).toBe(0)
  })
})
