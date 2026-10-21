import {
  type AppDefinition,
  appDefinition,
  assetResponse,
  buildPath,
  errorEnvelope,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { app } from "../../../../packages/catalog/src/video-edit/app"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const startPath = buildPath(routes.startRun.path, { appId: "video-edit" })
const clip = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73)
const mp4Brand = [0x66, 0x74, 0x79, 0x70]

describe("a Video edit run through the gateway on the demo engine", () => {
  let gateway: Harness

  afterEach(() => gateway.close())

  function open(definition: AppDefinition = appDefinition.parse(app)): Harness {
    gateway = harnessFor({ portsFor: localPorts, apps: [definition] })
    return gateway
  }

  async function upload(): Promise<string> {
    const response = await gateway.call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "video/mp4" },
      body: clip,
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  async function start(
    inputs: Record<string, unknown>,
    aspectRatio: string,
    key: string
  ) {
    return gateway.call(
      startPath,
      jsonInit({ inputs, aspectRatio }, { "idempotency-key": key })
    )
  }

  async function finish(response: Response) {
    expect(response.status).toBe(202)
    const { run } = runResponse.parse(await response.json())
    expect(run).toMatchObject({
      appId: "video-edit",
      origin: "demo",
      count: 1,
    })
    await gateway.drive(run.id)
    const read = await gateway.call(
      buildPath(routes.getRun.path, { runId: run.id })
    )
    return runResponse.parse(await read.json()).run
  }

  async function outputOf(outputs: readonly string[]) {
    expect(outputs).toHaveLength(1)
    const outputId = outputs[0] ?? ""
    const stored = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: outputId })
    )
    const content = await gateway.call(
      buildPath(routes.readAssetContent.path, { assetId: outputId })
    )
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(4, 8)]).toEqual(mp4Brand)
    return assetResponse.parse(await stored.json()).asset
  }

  it("extends a clip by 2 seconds on LTX 2.5 and keeps one clip with its inputs and seed", async () => {
    open()
    const source = await upload()
    const done = await finish(
      await start(
        { mode: "extend", source: [source], next: "the door opens" },
        "16:9",
        "video-edit-extend-1"
      )
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      mode: "extend",
      model: "ltx-2-5",
      source: [source],
      seconds: 2,
      next: "the door opens",
      keepSound: "on",
      resolution: "480p",
    })
    expect(Object.keys(done.inputs).sort()).toEqual(
      [
        "keepSound",
        "mode",
        "model",
        "next",
        "resolution",
        "seconds",
        "source",
      ].sort()
    )
    expect(done.seed).toEqual(expect.any(Number))
    expect(await outputOf(done.outputs)).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      width: 640,
      height: 360,
    })
  })

  it("edits a clip on Dreamina Seedance 2.5 and keeps only the clip and the model", async () => {
    open()
    const source = await upload()
    const done = await finish(
      await start(
        {
          mode: "edit",
          source: [source],
          model: "byteplus/dreamina-seedance-2-5-260628",
        },
        "16:9",
        "video-edit-edit-1"
      )
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toEqual({
      mode: "edit",
      source: [source],
      model: "byteplus/dreamina-seedance-2-5-260628",
    })
    await outputOf(done.outputs)
  })

  it("reframes a clip to 9:16 and makes a tall clip", async () => {
    open()
    const source = await upload()
    const done = await finish(
      await start(
        { mode: "reframe", source: [source], aspect: "9-16" },
        "9:16",
        "video-edit-reframe-1"
      )
    )
    expect(done.status).toBe("done")
    expect(done.inputs).toMatchObject({
      mode: "reframe",
      model: "ltx-2-3-outpaint",
      aspect: "9-16",
      resolution: "480p",
    })
    expect(done.inputs).not.toHaveProperty("seconds")
    expect(await outputOf(done.outputs)).toMatchObject({
      width: 360,
      height: 640,
    })
  })

  it("runs Background and Frame rate with their own choices", async () => {
    open()
    const source = await upload()
    const background = await finish(
      await start(
        { mode: "background", source: [source], color: "black" },
        "16:9",
        "video-edit-background-1"
      )
    )
    const rate = await finish(
      await start(
        {
          mode: "frame-rate",
          source: [source],
          factor: "4x",
          keepSound: "off",
        },
        "16:9",
        "video-edit-rate-1"
      )
    )
    expect(background.status).toBe("done")
    expect(background.inputs).toMatchObject({
      model: "birefnet",
      color: "black",
    })
    expect(background.inputs).not.toHaveProperty("resolution")
    expect(rate.status).toBe("done")
    expect(rate.inputs).toMatchObject({
      model: "film",
      factor: "4x",
      keepSound: "off",
    })
    expect(rate.inputs).not.toHaveProperty("color")
    await outputOf(background.outputs)
    await outputOf(rate.outputs)
  })

  it("control: refuses a run without a clip, an unknown operation, 1 second to add or another tab's graph, and starts nothing", async () => {
    open()
    const source = await upload()
    const refused = await Promise.all([
      start({ mode: "extend" }, "16:9", "video-edit-empty"),
      start({ mode: "trim", source: [source] }, "16:9", "video-edit-trim"),
      start(
        { mode: "extend", source: [source], seconds: 1 },
        "16:9",
        "video-edit-one"
      ),
      start(
        { mode: "extend", source: [source], model: "film" },
        "16:9",
        "video-edit-film"
      ),
    ])
    for (const response of refused) {
      expect(response.status).toBe(400)
      expect(errorEnvelope.parse(await response.json()).error.code).toBe(
        "RUN_INPUT_INVALID"
      )
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })
  it("refuses each input that belongs to another operation and starts nothing", async () => {
    open()
    const source = await upload()
    const runs = [
      { mode: "extend", source: [source], aspect: "9-16" },
      { mode: "extend", source: [source], factor: "4x" },
      { mode: "reframe", source: [source], seconds: 2 },
      { mode: "reframe", source: [source], next: "the door opens" },
      { mode: "background", source: [source], resolution: "720p" },
      { mode: "background", source: [source], around: "a street" },
      { mode: "frame-rate", source: [source], color: "white" },
      { mode: "edit", source: [source], keepSound: "off" },
    ]
    for (const [index, inputs] of runs.entries()) {
      const response = await start(inputs, "16:9", `video-edit-mixed-${index}`)
      expect(response.status, JSON.stringify(inputs)).toBe(400)
      expect(errorEnvelope.parse(await response.json()).error.code).toBe(
        "RUN_INPUT_INVALID"
      )
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("control: a gateway serving Video edit without its operation rules starts a reframe run that carries seconds", async () => {
    const definition = appDefinition.parse(app)
    open(
      appDefinition.parse({
        ...definition,
        inputs: definition.inputs.map((input) => {
          if (input.type === "seed") {
            return input
          }
          const { when: _, ...rest } = input
          return rest
        }),
      })
    )
    const source = await upload()
    const response = await start(
      { mode: "reframe", source: [source], seconds: 2 },
      "1:1",
      "video-edit-loose-1"
    )
    expect(response.status).toBe(202)
    expect(gateway.jobs.enqueued).toHaveLength(1)
  })
})
