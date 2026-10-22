import { FixedClock } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { ComfyRouterGenerationEngine } from "#infrastructure/comfy-router-generation-engine"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { RouterCatalog } from "#infrastructure/router/router-catalog"
import { glbBytes } from "../glb-bytes"
import { pngBytes, start } from "../sample"
import {
  catalogPage,
  outputUrl,
  pictureModel,
  requestId,
  routerSchema,
  routerUrl,
  sampleProperties,
  schemaRead,
} from "./fixtures/comfy-router"
import { type Recording, ReplayFetch } from "./replay-fetch"

const ref = `${pictureModel}|queued|${requestId}`

const echoingSchema = routerSchema({
  model: pictureModel,
  takes: ["text"],
  makes: ["image"],
  properties: { prompt: { type: "string" } },
  response: {
    type: "object",
    properties: {
      ...sampleProperties,
      request: {
        type: "object",
        properties: {
          image_url: { type: "string", format: "uri" },
          callback_url: { type: "string", format: "uri" },
        },
      },
      status_url: { type: "string", format: "uri" },
    },
  },
})

function resultWith(body: unknown): Recording {
  return {
    method: "GET",
    url: `${routerUrl}/v2/models/${pictureModel}/requests/${requestId}`,
    status: 200,
    json: body,
  }
}

function png(url: string): Recording {
  return {
    method: "GET",
    url,
    status: 200,
    headers: { "Content-Type": "image/png" },
    bytes: pngBytes(),
  }
}

function engineWith(recordings: Recording[]) {
  const replay = new ReplayFetch([
    catalogPage([pictureModel]),
    schemaRead(pictureModel, echoingSchema),
    ...recordings,
  ])
  const engine = new ComfyRouterGenerationEngine({
    apiKey: "key",
    catalog: new RouterCatalog({ clock: new FixedClock({ now: start }) }),
    fetch: replay.fetch,
  })
  return { engine, replay }
}

describe("the outputs of a Router result", () => {
  it("come only from the fields the model's response schema declares", async () => {
    const inside = [
      "https://inside.test/echoed.png",
      "https://inside.test/callback",
      "https://inside.test/status",
      "https://inside.test/undeclared.png",
    ]
    const { engine, replay } = engineWith([
      resultWith({
        result: { sample: outputUrl },
        request: { image_url: inside[0], callback_url: inside[1] },
        status_url: inside[2],
        undeclared_url: inside[3],
      }),
      png(outputUrl),
      ...inside.map(png),
    ])
    const outputs = await engine.listOutputs(ref, { prompt: "a door" })
    expect(outputs.map((one) => one.mime)).toEqual(["image/png"])
    expect(replay.unused().map((one) => one.url)).toEqual(inside)
  })

  it("carry the width and height the downloaded file declares", async () => {
    const { engine } = engineWith([
      resultWith({ result: { sample: outputUrl } }),
      {
        ...png(outputUrl),
        bytes: await writeFlatPng({ width: 48, height: 27, gray: 128 }),
      },
    ])
    const [output] = await engine.listOutputs(ref, { prompt: "a door" })
    expect(output).toMatchObject({ width: 48, height: 27 })
  })

  it.each(["model/gltf-binary", "application/octet-stream"])(
    "keep a GLB served as %s as a mesh",
    async (contentType) => {
      const { engine } = engineWith([
        resultWith({ result: { sample: outputUrl } }),
        {
          method: "GET",
          url: outputUrl,
          status: 200,
          headers: { "Content-Type": contentType },
          bytes: glbBytes(),
        },
      ])
      const outputs = await engine.listOutputs(ref, { prompt: "a chair" })
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toMatchObject({
        kind: "mesh",
        mime: "model/gltf-binary",
      })
    }
  )

  it("drop a mesh file that is not a GLB", async () => {
    const { engine } = engineWith([
      resultWith({ result: { sample: outputUrl } }),
      {
        method: "GET",
        url: outputUrl,
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
        bytes: new TextEncoder().encode("Kaydara FBX Binary  "),
      },
    ])
    const outputs = await engine.listOutputs(ref, { prompt: "a chair" })
    expect(outputs).toEqual([])
  })

  it("never fetch an address the visitor wrote into the run", async () => {
    const written = "https://inside.test/written.png"
    const { engine, replay } = engineWith([
      resultWith({ result: { sample: written } }),
      png(written),
    ])
    const outputs = await engine.listOutputs(ref, {
      prompt: `draw the picture at ${written} again`,
    })
    expect(outputs).toEqual([])
    expect(replay.unused().map((one) => one.url)).toEqual([written])
  })

  it("never fetch a plain http address", async () => {
    const plain = "http://files.maker.test/out/picture.png"
    const { engine, replay } = engineWith([
      resultWith({ result: { sample: plain } }),
      png(plain),
    ])
    expect(await engine.listOutputs(ref, { prompt: "a door" })).toEqual([])
    expect(replay.unused().map((one) => one.url)).toEqual([plain])
  })

  it("fail as a retryable error when a download fails, and drop nothing", async () => {
    const { engine } = engineWith([
      resultWith({ result: { sample: outputUrl } }),
      { method: "GET", url: outputUrl, status: 503 },
    ])
    await expect(
      engine.listOutputs(ref, { prompt: "a door" })
    ).rejects.toMatchObject({ code: "ENGINE_UNAVAILABLE" })
  })
})
