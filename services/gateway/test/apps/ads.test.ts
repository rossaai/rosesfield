import { readApps } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  characterResponse,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/ads/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

function adsApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "ads", app }])
  if (parsed === undefined) {
    throw new Error("The ads app did not parse")
  }
  return parsed
}

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe("the ads app through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  function openGateway(): Harness {
    const harness = harnessFor({ portsFor: localPorts, apps: [adsApp()] })
    open.push(harness)
    return harness
  }

  async function uploadPhoto(gateway: Harness): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(pngBytes),
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function saveCharacter(gateway: Harness): Promise<string> {
    const portrait = await uploadPhoto(gateway)
    const response = await gateway.call(
      routes.createCharacter.path,
      jsonInit(
        { name: "June", references: [portrait], notes: "" },
        { "Idempotency-Key": crypto.randomUUID() }
      )
    )
    expect(response.status).toBe(201)
    return characterResponse.parse(await response.json()).character.id
  }

  function start(gateway: Harness, body: unknown) {
    return gateway.call(
      buildPath(routes.startRun.path, { appId: "ads" }),
      jsonInit(body, { "Idempotency-Key": crypto.randomUUID() })
    )
  }

  async function listedRuns(gateway: Harness): Promise<unknown> {
    const listed = await gateway.call(`${routes.listRuns.path}?appId=ads`)
    return listed.json()
  }

  async function finished(gateway: Harness, runId: string) {
    await gateway.drive(runId)
    const read = await gateway.call(buildPath(routes.getRun.path, { runId }))
    return runResponse.parse(await read.json()).run
  }

  it("starts an ad with two photos, drives it to done and keeps 2 images in the library", async () => {
    const gateway = openGateway()
    const first = await uploadPhoto(gateway)
    const second = await uploadPhoto(gateway)
    const started = await start(gateway, {
      inputs: {
        kind: "ad",
        headline: "Fresh cold brew",
        line: "Made in small batches every morning",
        product: [first],
        secondPhoto: [second],
        style: "minimal",
      },
      count: 2,
      aspectRatio: "3:4",
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      count: 2,
      aspectRatio: "3:4",
      inputs: {
        kind: "ad",
        headline: "Fresh cold brew",
        line: "Made in small batches every morning",
        product: [first],
        secondPhoto: [second],
        character: [],
        style: "minimal",
        model: "qwen-image-edit-2511",
      },
    })
    expect(run.inputs).not.toHaveProperty("scene")
    expect(run.seed).not.toBeNull()
    const done = await finished(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(2)
    for (const outputId of done.outputs) {
      const asset = await gateway.call(
        buildPath(routes.getAsset.path, { assetId: outputId })
      )
      expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
        kind: "image",
        mime: "image/png",
        sourceRunId: run.id,
        width: 768,
        height: 1024,
      })
      const content = await gateway.call(
        buildPath(routes.readAssetContent.path, { assetId: outputId })
      )
      const bytes = new Uint8Array(await content.arrayBuffer())
      expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
      expect(pngSize(bytes)).toEqual({ width: 768, height: 1024 })
    }
  })

  it("runs a product shot with one photo and a character on the Qwen Image Edit 2511 graph to done", async () => {
    const gateway = openGateway()
    const photo = await uploadPhoto(gateway)
    const character = await saveCharacter(gateway)
    const started = await start(gateway, {
      inputs: {
        scene: "on a wooden desk",
        product: [photo],
        character: [character],
      },
    })
    expect(started.status).toBe(202)
    const { run } = runResponse.parse(await started.json())
    expect(run.inputs).toMatchObject({
      kind: "product-shot",
      scene: "on a wooden desk",
      character: [character],
      model: "qwen-image-edit-2511",
      style: "studio",
    })
    const done = await finished(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses each run the contract bounds and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await uploadPhoto(gateway)
    const character = await saveCharacter(gateway)
    const three = {
      product: [photo],
      secondPhoto: [photo],
      thirdPhoto: [photo],
    }
    const refused: Record<string, unknown>[] = [
      { inputs: { scene: "on a marble counter" } },
      { inputs: { product: [photo] }, count: 5 },
      { inputs: { product: [photo], model: "nano-banana-2" } },
      { inputs: { product: [photo], thirdPhoto: [photo] } },
      { inputs: { ...three, character: [character] } },
      { inputs: { product: [photo], model: "flux-2-klein-4b" } },
      { inputs: { product: [photo], kind: "ad" } },
      { inputs: { product: [photo], kind: "ad", headline: "a".repeat(61) } },
      {
        inputs: {
          product: [photo],
          kind: "ad",
          headline: "Fresh",
          scene: "on a counter",
        },
      },
      { inputs: { product: [photo], headline: "Fresh cold brew" } },
      { inputs: { product: [photo], scene: "a".repeat(501) } },
    ]
    for (const body of refused) {
      const response = await start(gateway, body)
      expect(response.status, JSON.stringify(body)).toBe(400)
      const { error } = errorEnvelope.parse(await response.json())
      expect(error.code).toBe("RUN_INPUT_INVALID")
    }
    expect(await listedRuns(gateway)).toMatchObject({ runs: [] })
    expect(gateway.jobs.enqueued).toEqual([])
  })
})
