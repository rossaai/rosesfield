import { readApps } from "@rosesfield/catalog"
import {
  type ChainRun,
  EndKeyLoopHandler,
  OwnVideoLead,
  RunChain,
} from "@rosesfield/catalog/motion"
import {
  ClipPlanGenerationEngine,
  DemoClipPlanTurn,
} from "@rosesfield/catalog/motion/engine"
import {
  type AppDefinition,
  assetPageResponse,
  assetResponse,
  buildPath,
  type Run,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { DemoGenerationEngine } from "@rosesfield/generation"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { app as imageApp } from "../../../../packages/catalog/src/image/app"
import { app as motionDefinition } from "../../../../packages/catalog/src/motion/app"
import { type Harness, harnessFor, jsonInit, type PortsFor } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes } from "../sample-apps"

const mp4Bytes = Uint8Array.of(
  0,
  0,
  0,
  24,
  102,
  116,
  121,
  112,
  105,
  115,
  111,
  109
)

function parsed(): AppDefinition[] {
  return readApps([
    { folder: "motion", app: motionDefinition },
    { folder: "image", app: imageApp },
  ])
}

const demoPorts: PortsFor = (clock, folder) => {
  const ports = localPorts(clock, folder)
  return {
    ...ports,
    engines: [
      new ClipPlanGenerationEngine({
        turn: new DemoClipPlanTurn(),
        origin: "demo",
      }),
      new DemoGenerationEngine({ clock }),
    ],
  }
}

class HarnessChain extends RunChain {
  readonly keys: string[] = []
  private readonly gateway: Harness

  constructor(gateway: Harness) {
    super()
    this.gateway = gateway
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    this.keys.push(key)
    const response = await this.gateway.call(
      buildPath(routes.startRun.path, { appId }),
      jsonInit(
        {
          inputs: request.inputs,
          ...(request.aspectRatio === null
            ? {}
            : { aspectRatio: request.aspectRatio }),
          ...(request.place === undefined ? {} : { place: request.place }),
        },
        { "Idempotency-Key": key }
      )
    )
    const body: unknown = await response.json()
    if (response.status !== 202) {
      throw new Error(`${key} was refused: ${JSON.stringify(body)}`)
    }
    return runResponse.parse(body).run
  }

  async settle(run: Run): Promise<Run> {
    await this.gateway.drive(run.id)
    const read = await this.gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }
}

describe("your own video through the gateway on the demo engine", () => {
  const open: Harness[] = []

  afterEach(() => {
    for (const harness of open.splice(0)) {
      harness.close()
    }
  })

  async function upload(
    gateway: Harness,
    mime: string,
    body: Uint8Array,
    query = ""
  ): Promise<AssetId> {
    const response = await gateway.call(`${routes.uploadAsset.path}${query}`, {
      method: "POST",
      headers: { "content-type": mime },
      body: new Uint8Array(body),
    })
    expect(response.status).toBe(201)
    return assetIdFormat.parse(
      assetResponse.parse(await response.json()).asset.id
    )
  }

  it("plans from the 4 frames uploaded held, reads and edits held, then drafts at 480p, and only the draft reaches History and the library", async () => {
    const gateway = harnessFor({ portsFor: demoPorts, apps: parsed() })
    open.push(gateway)
    const clip = await upload(gateway, "video/mp4", mp4Bytes)
    const photos = await Promise.all(
      [0, 1, 2, 3].map(() => upload(gateway, "image/png", pngBytes))
    )
    const lead = new OwnVideoLead({
      ask: {
        clip,
        frames: [],
        photos,
        sentence: "replace the man",
        frameSize: { width: 720, height: 1280 },
        aspectRatio: "9:16",
        resolution: "1080p",
        seed: 7,
      },
      heldText: async (assetId) => {
        const content = await gateway.call(
          buildPath(routes.readAssetContent.path, { assetId })
        )
        return content.text()
      },
    })
    const chain = new HarnessChain(gateway)
    const loop = new EndKeyLoopHandler({
      chain,
      prices: {
        execute: async () => ({ price: { source: "unknown", credits: null } }),
      },
    })
    const key = "press-1"
    const before = await gateway.call(routes.listAssets.path)
    const uploaded = assetPageResponse.parse(await before.json()).assets.length
    const ledWithoutFrames = await loop.lead({ lead, key })
    expect(ledWithoutFrames).toMatchObject({ status: "stopped", at: "plan" })
    const frames = await Promise.all(
      [0, 1, 2, 3].map(() =>
        upload(gateway, "image/png", pngBytes, "?place=held")
      )
    )
    const framed = new OwnVideoLead({
      ask: {
        clip,
        frames,
        photos,
        sentence: "replace the man",
        frameSize: { width: 720, height: 1280 },
        aspectRatio: "9:16",
        resolution: "1080p",
        seed: 7,
      },
      heldText: async (assetId) =>
        (
          await gateway.call(
            buildPath(routes.readAssetContent.path, { assetId })
          )
        ).text(),
    })
    const pressed = "press-2"
    const led = await loop.lead({ lead: framed, key: pressed })
    if (led.status !== "led") {
      throw new Error(
        `the lead stopped at ${led.at}: ${JSON.stringify(led.run.failure)}`
      )
    }
    expect(framed.plan?.unusedPhotos).toEqual([3])
    const drafted = await loop.draft({ steps: led.steps, key: pressed })
    expect(drafted.draft).toMatchObject({ status: "done", origin: "demo" })
    expect(drafted.draft.inputs).toMatchObject({
      model: "ltx-2-5-guide",
      resolution: "480p",
      scene: "replace the man",
    })
    expect(drafted.frame).not.toBeNull()
    const history = runPageResponse.parse(
      await (await gateway.call(routes.listRuns.path)).json()
    )
    expect(history.runs.map((one) => one.id)).toEqual([drafted.draft.id])
    const library = assetPageResponse.parse(
      await (await gateway.call(routes.listAssets.path)).json()
    )
    const made = library.assets.filter((one) => one.sourceRunId !== null)
    expect(made.map((one) => one.sourceRunId)).toEqual([drafted.draft.id])
    expect(library.assets.length - made.length).toBe(uploaded)
    expect(library.assets.map((one) => one.id)).not.toContain(frames[0])
  })
})
