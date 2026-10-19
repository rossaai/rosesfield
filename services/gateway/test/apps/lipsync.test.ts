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

  it("makes one 9:16 video from a clip and 5 seconds of audio, and keeps no photo or scene with the run", async () => {
    open()
    const clipId = await upload(clipBytes, "video/mp4")
    const audioId = await upload(wave, "audio/wav")
    const done = await finished(
      await start(
        { mode: "clip", clip: [clipId], audio: [audioId], length: 5 },
        "lipsync-clip-1",
        "9:16"
      )
    )
    expect(done.status).toBe("done")
    expect(done.aspectRatio).toBe("9:16")
    expect(done.inputs).toEqual({
      mode: "clip",
      clip: [clipId],
      audio: [audioId],
      length: 5,
    })
    expect(done.outputs).toHaveLength(1)
    const output = await outputOf(done.outputs[0] ?? "")
    expect(output.asset).toMatchObject({ kind: "video", mime: "video/mp4" })
    expect(output.asset.height).toBeGreaterThan(output.asset.width ?? 0)
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

  it("starts the runs the declared modes refuse once the definition drops its mode rules", async () => {
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
    expect(statuses).toEqual(planted.map(() => 202))
  })
})
