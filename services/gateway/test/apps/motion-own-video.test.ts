import {
  ownVideoDraftOf,
  ownVideoFinalCreditsOf,
  ownVideoFinalOf,
} from "@rosesfield/agent"
import { readApps } from "@rosesfield/catalog"
import {
  type ChainRun,
  EndKeyLoopHandler,
  frameEditModels,
  OwnVideoLead,
  RunChain,
} from "@rosesfield/catalog/motion"
import {
  type ClipFrames,
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
  runRequest,
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

/** The frames a server that runs ffmpeg reads from your video, as 4 small images. */
const serverFrames: ClipFrames = {
  secondsOf: async () => 4,
  framesOf: async () =>
    Array.from({ length: 4 }, () => ({
      mime: "image/png" as const,
      base64: btoa(String.fromCharCode(...pngBytes)),
    })),
}

function portsWith(frames: ClipFrames | null): PortsFor {
  return (clock, folder) => ({
    ...localPorts(clock, folder),
    engines: [
      new ClipPlanGenerationEngine({
        turn: new DemoClipPlanTurn(),
        origin: "demo",
        frames,
      }),
      new DemoGenerationEngine({ clock }),
    ],
  })
}

const demoPorts: PortsFor = portsWith(serverFrames)

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
    const chain = new HarnessChain(gateway)
    const loop = new EndKeyLoopHandler({
      chain,
      prices: {
        execute: async () => ({ price: { source: "unknown", credits: null } }),
      },
    })
    const before = await gateway.call(routes.listAssets.path)
    const uploaded = assetPageResponse.parse(await before.json()).assets.length
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

  it("changes your own video for the agent and MCP in one call that makes the 480p draft with the final's credits, then makes the final in a second call that names the draft, reading the clip and the plan only once", async () => {
    const gateway = harnessFor({ portsFor: demoPorts, apps: parsed() })
    open.push(gateway)
    const clip = await upload(gateway, "video/mp4", mp4Bytes)
    const photos = await Promise.all(
      [0, 1, 2, 3].map(() => upload(gateway, "image/png", pngBytes))
    )
    const { handlers } = gateway
    const started: string[] = []
    const runs = (inputs: Record<string, unknown>, key: string) => ({
      handlers: {
        ...handlers,
        startRun: {
          execute: async (
            input: Parameters<typeof handlers.startRun.execute>[0]
          ) => {
            started.push(input.idempotencyKey ?? "")
            return handlers.startRun.execute(input)
          },
        } as typeof handlers.startRun,
      },
      request: runRequest.parse({ inputs, count: 1 }),
      key,
      wait: async () => undefined,
      signal: undefined,
      poll: (runId: string) => gateway.drive(runId),
      editor: frameEditModels.open,
    })
    const drafted = await ownVideoDraftOf(
      runs({ clip: [clip], photo: photos, scene: "replace the man" }, "mcp-1")
    )
    expect(drafted.run).toMatchObject({ status: "done" })
    expect(drafted.run.inputs).toMatchObject({ resolution: "480p" })
    expect(drafted.run.inputs).not.toHaveProperty("sound")
    expect(drafted.leftOutPhotos).toEqual([3])
    expect(drafted.finalCredits).toBeCloseTo(10.86 + 6.76, 6)
    expect(
      await ownVideoFinalCreditsOf(
        handlers,
        runRequest.parse({
          inputs: { photo: photos, resolution: "1080p", draft: drafted.run.id },
          count: 1,
        }),
        drafted.run.id
      )
    ).toBeCloseTo(10.86 + 16.79, 6)
    expect(started.map((key) => key.replace("mcp-1-", ""))).toEqual([
      "plan",
      "read",
      "edit",
      "draft",
    ])
    const ended = await ownVideoFinalOf(
      runs(
        {
          clip: [clip],
          photo: photos,
          resolution: "1080p",
          draft: drafted.run.id,
        },
        "mcp-2"
      ),
      drafted.run.id
    )
    expect(ended.run).toMatchObject({ status: "done" })
    expect(ended.run.inputs).toMatchObject({
      resolution: "1080p",
      guide: drafted.run.inputs.guide,
      seed: drafted.run.inputs.seed,
    })
    expect(ended.run.inputs.endKey).toHaveLength(1)
    expect(started.slice(4).map((key) => key.replace("mcp-2-", ""))).toEqual([
      "restore",
      "final",
    ])
    const history = runPageResponse.parse(
      await (await gateway.call(routes.listRuns.path)).json()
    )
    expect(history.runs.map((one) => one.id).sort()).toEqual(
      [drafted.run.id, ended.run.id].sort()
    )
  })

  async function refusalOf(
    frames: ClipFrames | null
  ): Promise<{ error: unknown; started: number }> {
    const gateway = harnessFor({ portsFor: portsWith(frames), apps: parsed() })
    open.push(gateway)
    const clip = await upload(gateway, "video/mp4", mp4Bytes)
    const photo = await upload(gateway, "image/png", pngBytes)
    const error = await ownVideoDraftOf({
      handlers: gateway.handlers,
      request: runRequest.parse({
        inputs: { clip: [clip], photo: [photo] },
        count: 1,
      }),
      key: "mcp-3",
      wait: async () => undefined,
      signal: undefined,
      poll: (runId: string) => gateway.drive(runId),
    }).catch((caught: unknown) => caught)
    return { error, started: gateway.jobs.enqueued.length }
  }

  it("refuses your own video for the agent and MCP, before any step starts, on a host with no tool that opens a video, in one true sentence", async () => {
    const { error, started } = await refusalOf(null)
    expect(error).toMatchObject({
      code: "MOTION_OWN_VIDEO_IN_APP",
      message:
        "This host cannot read a video for the agent. Open Motion in the app to use your own video.",
    })
    expect(started).toBe(0)
  })

  it("refuses a video over 10 or under 2 seconds before any step starts, in the words the screen uses, and lets 4 seconds through, the control", async () => {
    const framesOf = serverFrames.framesOf
    const long = await refusalOf({ secondsOf: async () => 12, framesOf })
    expect(long.error).toMatchObject({
      code: "MOTION_CLIP_LENGTH",
      message: "This clip runs 12 seconds. Pick one of 10 seconds or less.",
    })
    expect(long.started).toBe(0)
    const short = await refusalOf({ secondsOf: async () => 1.5, framesOf })
    expect(short.error).toMatchObject({
      message: "This clip runs 1.5 seconds. Pick one of 2 seconds or more.",
    })
    const fit = await refusalOf(serverFrames)
    expect(fit.error).toMatchObject({ run: { status: "done" } })
  })
})
