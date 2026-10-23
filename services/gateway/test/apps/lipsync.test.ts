import { findApp } from "@rosesfield/catalog"
import {
  type ChainRun,
  graphModel,
  SpeechChain,
  speakThenSync,
} from "@rosesfield/catalog/lipsync"
import {
  type AppDefinition,
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  type Run,
  routes,
  runPageResponse,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/lipsync/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const startPath = buildPath(routes.startRun.path, { appId: "lipsync" })
const photo = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)
const wave = Uint8Array.of(82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69)
const clipBytes = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)
const mp4Brand = [0x66, 0x74, 0x79, 0x70]

const lipsync = appDefinition.parse(app)

function withoutModeRules(definition: AppDefinition): AppDefinition {
  return {
    ...definition,
    inputs: definition.inputs.map((input) => {
      if (input.type === "seed" || input.when === undefined) {
        return input
      }
      const { when: _, ...rest } = input
      return "presence" in rest ? { ...rest, presence: "optional" } : rest
    }),
  }
}

describe("a Lip sync run through the gateway on the demo engine", () => {
  let gateway: Harness

  afterEach(() => gateway.close())

  function open(definition: AppDefinition = lipsync): Harness {
    gateway = harnessFor({ portsFor: localPorts, apps: [definition] })
    return gateway
  }

  async function upload(bytes: Uint8Array, mime: string): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": mime },
      body: bytes,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function start(
    inputs: Record<string, unknown>,
    key: string,
    aspectRatio = "4:3"
  ) {
    return gateway.call(
      startPath,
      jsonInit({ inputs, aspectRatio }, { "idempotency-key": key })
    )
  }

  async function finished(response: Response) {
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async function outputOf(outputId: string) {
    const stored = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    return {
      asset: assetResponse.parse(await stored.json()).asset,
      bytes: new Uint8Array(await content.arrayBuffer()),
    }
  }

  async function refusedCode(response: Response): Promise<string> {
    expect(response.status).toBe(400)
    return errorEnvelope.parse(await response.json()).error.code
  }

  it("makes one 4:3 video from a photo and 8 seconds of audio and keeps the inputs with the run", async () => {
    open()
    const photoId = await upload(photo, "image/png")
    const audioId = await upload(wave, "audio/wav")
    const done = await finished(
      await start(
        {
          mode: "photo",
          photo: [photoId],
          audio: [audioId],
          scene: "A small kitchen in morning light",
          length: 8,
        },
        "lipsync-run-1"
      )
    )
    expect(done).toMatchObject({
      appId: "lipsync",
      status: "done",
      origin: "demo",
      count: 1,
      aspectRatio: "4:3",
    })
    expect(done.seed).toEqual(expect.any(Number))
    expect(done.inputs).toEqual({
      mode: "photo",
      model: graphModel,
      photo: [photoId],
      audio: [audioId],
      scene: "A small kitchen in morning light",
      length: 8,
    })
    expect(done.outputs).toHaveLength(1)
    const output = await outputOf(done.outputs[0] ?? "")
    expect(output.asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      width: 640,
      height: 480,
    })
    expect([...output.bytes.slice(4, 8)]).toEqual(mp4Brand)
  })

  it("refuses a clip run on the LTX 2.3 graph, which takes only a photo, and enqueues no job", async () => {
    open()
    const clipId = await upload(clipBytes, "video/mp4")
    const audioId = await upload(wave, "audio/wav")
    const response = await start(
      { mode: "clip", clip: [clipId], audio: [audioId], length: 5 },
      "lipsync-clip-1",
      "9:16"
    )
    expect(response.status).toBe(412)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "ENGINE_BINDING_INVALID"
    )
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("starts no run without audio, with audio longer than 10 seconds, or with the asset of the other mode", async () => {
    open()
    const photoId = await upload(photo, "image/png")
    const clipId = await upload(clipBytes, "video/mp4")
    const audioId = await upload(wave, "audio/wav")
    const refused = [
      { mode: "photo", photo: [photoId], audio: [] },
      { mode: "photo", photo: [photoId], audio: [audioId], length: 14 },
      { mode: "photo", audio: [audioId], length: 5 },
      {
        mode: "photo",
        photo: [photoId],
        clip: [clipId],
        audio: [audioId],
        length: 5,
      },
      { mode: "clip", audio: [audioId], length: 5 },
      {
        mode: "clip",
        clip: [clipId],
        photo: [photoId],
        audio: [audioId],
        length: 5,
      },
      {
        mode: "clip",
        clip: [clipId],
        audio: [audioId],
        scene: "A beach at noon",
        length: 5,
      },
    ]
    const codes = []
    for (const [index, inputs] of refused.entries()) {
      codes.push(await refusedCode(await start(inputs, `lipsync-no-${index}`)))
    }
    expect(codes).toEqual(refused.map(() => "RUN_INPUT_INVALID"))
    expect(gateway.jobs.enqueued).toEqual([])
  })
})

describe("the control of the mode refusals", () => {
  let gateway: Harness

  afterEach(() => gateway.close())

  it("passes the runs the declared modes refuse to the binding once the definition drops its mode rules", async () => {
    gateway = harnessFor({
      portsFor: localPorts,
      apps: [withoutModeRules(lipsync)],
    })
    const upload = async (bytes: Uint8Array, mime: string) => {
      const response = await gateway.call(routes.uploadAsset.path, {
        method: "POST",
        headers: { "content-type": mime },
        body: bytes,
      })
      return assetResponse.parse(await response.json()).asset.id
    }
    const photoId = await upload(photo, "image/png")
    const clipId = await upload(clipBytes, "video/mp4")
    const audioId = await upload(wave, "audio/wav")
    const planted = [
      { mode: "photo", audio: [audioId], length: 5 },
      {
        mode: "photo",
        photo: [photoId],
        clip: [clipId],
        audio: [audioId],
        length: 5,
      },
      { mode: "clip", audio: [audioId], length: 5 },
      {
        mode: "clip",
        clip: [clipId],
        photo: [photoId],
        audio: [audioId],
        length: 5,
      },
      {
        mode: "clip",
        clip: [clipId],
        audio: [audioId],
        scene: "A beach at noon",
        length: 5,
      },
    ]
    const statuses = []
    for (const [index, inputs] of planted.entries()) {
      const response = await gateway.call(
        startPath,
        jsonInit(
          { inputs, aspectRatio: "4:3" },
          { "idempotency-key": `lipsync-planted-${index}` }
        )
      )
      statuses.push(response.status)
    }
    expect(statuses).toEqual([202, 202, 412, 412, 412])
  })
})

class GatewayChain extends SpeechChain {
  private readonly gateway: Harness

  constructor(options: { gateway: Harness }) {
    super()
    this.gateway = options.gateway
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    const body =
      request.aspectRatio === null
        ? { inputs: request.inputs }
        : { inputs: request.inputs, aspectRatio: request.aspectRatio }
    const response = await this.gateway.call(
      buildPath(routes.startRun.path, { appId }),
      jsonInit(body, { "idempotency-key": key })
    )
    expect(response.status).toBe(202)
    return runResponse.parse(await response.json()).run
  }

  async settle(run: Run): Promise<Run> {
    await this.gateway.drive(run.id)
    const read = await this.gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async secondsOf(assetId: string): Promise<number | null> {
    const read = await this.gateway.call(
      buildPath(routes.getAsset.path, { assetId })
    )
    return assetResponse.parse(await read.json()).asset.durationSeconds
  }
}

function audioApp(): AppDefinition {
  const found = findApp("audio")
  if (found === null) {
    throw new Error("The catalog lists no audio app. Run bun run catalog:sync")
  }
  return found
}

describe("Text in Lip sync through the gateway on the demo engine", () => {
  let gateway: Harness

  afterEach(() => gateway.close())

  it("makes the speech on Audio's speech default first, then the video from its audio, and lists both runs", async () => {
    gateway = harnessFor({
      portsFor: localPorts,
      apps: [audioApp(), lipsync],
    })
    const uploaded = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: photo,
    })
    const photoId = assetResponse.parse(await uploaded.json()).asset.id
    const chain = new GatewayChain({ gateway })
    const outcome = await speakThenSync({
      app: audioApp(),
      voices: [],
      target: {
        appId: "lipsync",
        audio: "audio",
        length: "length",
        check: { app: lipsync, form: null },
      },
      request: {
        inputs: {
          mode: "photo",
          photo: [photoId],
          length: 10,
          speechText: "Hello, this is the line I typed.",
          speechModel: "",
        },
        aspectRatio: "1:1",
      },
      key: "lipsync-text-1",
      chain,
    })
    if (outcome.kind !== "started") {
      throw new Error(`The chain stopped at ${outcome.kind}`)
    }
    expect(outcome.speech).toMatchObject({
      appId: "audio",
      status: "done",
      inputs: {
        model: "chatterbox",
        script: "Hello, this is the line I typed.",
      },
    })
    const [spoken] = outcome.speech.outputs
    const video = await chain.settle(outcome.video)
    expect(video).toMatchObject({
      appId: "lipsync",
      status: "done",
      aspectRatio: "1:1",
      inputs: {
        mode: "photo",
        photo: [photoId],
        audio: [spoken],
        length: 2,
      },
    })
    expect(video.inputs).not.toHaveProperty("speechText")
    const listed = await gateway.call(routes.listRuns.path)
    const history = runPageResponse.parse(await listed.json()).runs
    expect(history.map((run) => [run.appId, run.id]).sort()).toEqual(
      [
        ["audio", outcome.speech.id],
        ["lipsync", video.id],
      ].sort()
    )
  })
})
