import { createNodePhotonImages } from "@earendil-works/pi-durable/images/node"
import { afterEach, describe, expect, it } from "vitest"
import { agentTools } from "#infrastructure/pi-agent-tools"
import type { ImagesOf } from "#infrastructure/pi-asset-media"
import { openPiModels, routerAgentModel } from "#infrastructure/pi-models"
import { routerMedia, unseenNoteOf } from "#infrastructure/router-chat-media"
import { pngOf, wavOf } from "../fixtures/media-files"
import {
  base64,
  closeRigs,
  comfyKey,
  imageModel,
  partsOf,
  readCalls,
  rigs,
  storedLibrary,
  textModel,
  toolTextOf,
  turnsWith,
} from "../fixtures/media-turns"
import { replayRouter, textAnswer } from "../fixtures/router-chat-answers"
import {
  agentFor,
  generationFor,
  noWait,
  readAll,
  toolHandlersFor,
} from "../harness"
import { imageApp } from "../sample"

afterEach(closeRigs)

describe("an image the agent reads", () => {
  it("reaches the body as an image_url part for a model that takes images", async () => {
    const stored = storedLibrary()
    const png = pngOf(4, 3)
    const asset = await stored.add({ width: 4, height: 3 }, png)

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [[asset.id]],
    })

    expect(partsOf(requests[1], "image_url")).toEqual([
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64(png)}` },
      },
    ])
  })

  it("control: never reaches the body for a text-only model, and the note names three models that see images", async () => {
    const stored = storedLibrary()
    const asset = await stored.add({ width: 4, height: 3 }, pngOf(4, 3))

    const { requests } = await turnsWith({
      model: textModel,
      library: stored.library,
      reads: [[asset.id]],
    })

    expect(partsOf(requests[1], "image_url")).toEqual([])
    expect(toolTextOf(requests[1])).toContain(
      JSON.stringify(unseenNoteOf("image"))
    )
  })

  it("is scaled to the bound's side when it is larger, with Photon", async () => {
    const stored = storedLibrary()
    const side = routerMedia.image.side
    const asset = await stored.add(
      { width: side + 1000, height: 600 },
      pngOf(side + 1000, 600)
    )
    const images: ImagesOf = () => createNodePhotonImages({ worker: false })

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [[asset.id]],
      images,
    })

    const [part] = partsOf(requests[1], "image_url")
    const url = String((part as { image_url: { url: string } }).image_url.url)
    const sent = Buffer.from(url.slice(url.indexOf(",") + 1), "base64")
    expect(url.startsWith("data:image/png;base64,")).toBe(true)
    expect(sent.readUInt32BE(16)).toBe(side)
    expect(sent.length).toBeLessThanOrEqual(routerMedia.image.base64Bytes)
  })

  it("sends the library's preview when the image is larger and no processor runs, as on Workers", async () => {
    const stored = storedLibrary()
    const asset = await stored.add(
      { width: 3000, height: 600 },
      pngOf(3000, 600)
    )
    const preview = pngOf(32, 8)
    await stored.library.store.putPreview(asset.id, preview, "image/png")

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [[asset.id]],
    })

    expect(partsOf(requests[1], "image_url")).toEqual([
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64(preview)}` },
      },
    ])
  })
})

describe("a 3D model the agent reads", () => {
  it("sends its still picture to a model that takes images", async () => {
    const stored = storedLibrary()
    const mesh = await stored.add(
      { kind: "mesh", mime: "model/gltf-binary" },
      Uint8Array.of(103, 108, 84, 70)
    )
    const still = pngOf(8, 8)
    await stored.library.store.putPreview(mesh.id, still, "image/png")

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [[mesh.id]],
    })

    expect(partsOf(requests[1], "image_url")).toEqual([
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64(still)}` },
      },
    ])
  })

  it("control: says it has no still when the server holds none", async () => {
    const stored = storedLibrary()
    const mesh = await stored.add(
      { kind: "mesh", mime: "model/gltf-binary" },
      Uint8Array.of(103, 108, 84, 70)
    )

    const { requests } = await turnsWith({
      model: imageModel,
      library: stored.library,
      reads: [[mesh.id]],
    })

    expect(partsOf(requests[1], "image_url")).toEqual([])
    expect(toolTextOf(requests[1])).toContain("has no still picture")
  })
})

describe("a kind the chosen model does not take", () => {
  it("returns the asset's facts and the run that made it, with a note naming the three highest ranked models that can", async () => {
    const stored = storedLibrary()
    const generation = generationFor([imageApp()])
    const { run } = await generation.startRun.execute({
      appId: "sample-image",
      body: { inputs: { prompt: "a red door" } },
      idempotencyKey: null,
      seed: 7,
    })
    const sound = await stored.add(
      {
        kind: "audio",
        mime: "audio/wav",
        durationSeconds: 12.5,
        sourceRunId: run.id,
      },
      wavOf(400)
    )
    const handlers = toolHandlersFor(generation, stored.library)
    const replay = replayRouter([
      readCalls(imageModel, [sound.id]),
      textAnswer(imageModel, "Seen.", 0.0001),
    ])
    const rig = agentFor(
      agentTools({
        apps: [imageApp()],
        handlers: () => handlers,
        wait: noWait,
      }),
      () =>
        openPiModels(routerAgentModel(comfyKey), {
          fetch: replay.fetch,
          media: () => handlers,
        })
    )
    rigs.push(rig)
    await rig.agent.chooseModel(imageModel)
    const { id } = await rig.agent.startConversation({ runApproval: "ask" })
    await readAll(await rig.agent.send({ conversationId: id, text: "Look" }))

    const facts = JSON.parse(toolTextOf(replay.requests[1]))
    expect(facts.asset).toMatchObject({
      kind: "audio",
      bytes: 444,
      durationSeconds: 12.5,
    })
    expect(facts.run).toMatchObject({
      id: run.id,
      appId: "sample-image",
      inputs: { prompt: "a red door" },
    })
    expect(facts.note).toBe(unseenNoteOf("audio"))
    expect(facts.note).toContain(
      "Gemini 4 Argon, Muse Wonder, Gemini 3.8 Flash"
    )
    expect(partsOf(replay.requests[1], "input_audio")).toEqual([])
  })
})
