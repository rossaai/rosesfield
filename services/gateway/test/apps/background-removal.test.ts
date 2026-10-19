import { readApps } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/background-removal/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const appId = "background-removal"
const startPath = buildPath(routes.startRun.path, { appId })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

function backgroundRemovalApp(): AppDefinition {
  const [parsed] = readApps([{ folder: appId, app }])
  if (parsed === undefined) {
    throw new Error("The Remove background app did not parse")
  }
  return parsed
}

describe("a Remove background run through the gateway on the demo engine", () => {
  let gateway: Harness

  beforeEach(() => {
    gateway = harnessFor({
      portsFor: localPorts,
      apps: [backgroundRemovalApp()],
    })
  })

  afterEach(() => gateway.close())

  function post(body: unknown, key: string) {
    return jsonInit(body, { "idempotency-key": key })
  }

  async function upload(): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function startAndFinish(body: unknown, key: string) {
    const response = await gateway.call(startPath, post(body, key))
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({ appId, origin: "demo", count: 1 })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async function refused(body: unknown, key: string): Promise<string[]> {
    const response = await gateway.call(startPath, post(body, key))
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    const listed = await gateway.call(`${routes.listRuns.path}?appId=${appId}`)
    return runPageResponse.parse(await listed.json()).runs.map((run) => run.id)
  }

  it("makes one PNG on Transparent with BiRefNet and keeps no seed", async () => {
    const image = await upload()
    const done = await startAndFinish(
      { inputs: { image: [image] }, aspectRatio: "4:3" },
      "background-removal-transparent-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      image: [image],
      background: "transparent",
      model: "birefnet",
    })
    expect(done.seed).toBeNull()
    expect(done.aspectRatio).toBe("4:3")
    expect(done.outputs).toHaveLength(1)
    const outputId = done.outputs[0] ?? ""
    const asset = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    expect(assetResponse.parse(await asset.json()).asset).toMatchObject({
      kind: "image",
      mime: "image/png",
      width: 1024,
      height: 768,
    })
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    expect(content.headers.get("content-type")).toBe("image/png")
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
  })

  it("ends a Black run on Lucida with one output", async () => {
    const image = await upload()
    const done = await startAndFinish(
      { inputs: { image: [image], background: "black", model: "lucida" } },
      "background-removal-black-1"
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      image: [image],
      background: "black",
      model: "lucida",
    })
    expect(done.outputs).toHaveLength(1)
  })

  it("refuses a run with no image and starts nothing", async () => {
    const runs = await refused(
      { inputs: { background: "white" } },
      "background-removal-none-1"
    )
    expect(runs).toEqual([])
  })

  it("refuses a background the app does not list and starts nothing", async () => {
    const image = await upload()
    const runs = await refused(
      { inputs: { image: [image], background: "gray" } },
      "background-removal-gray-1"
    )
    expect(runs).toEqual([])
  })

  it("refuses a second image in one run and starts nothing", async () => {
    const first = await upload()
    const second = await upload()
    const runs = await refused(
      { inputs: { image: [first, second] } },
      "background-removal-two-1"
    )
    expect(runs).toEqual([])
  })

  it("refuses a second output and a seed, which the app does not take", async () => {
    const image = await upload()
    expect(
      await refused(
        { inputs: { image: [image] }, count: 2 },
        "background-removal-count-1"
      )
    ).toEqual([])
    expect(
      await refused(
        { inputs: { image: [image], seed: 7 } },
        "background-removal-seed-1"
      )
    ).toEqual([])
  })
})
