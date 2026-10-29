import { assetResponse, buildPath, routes } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  examplesGateways,
  pngOf,
  readRun,
  started,
  upload,
} from "../fixtures/examples-gateway"

describe("a Library example through the gateway", () => {
  const openGateway = examplesGateways()

  it("runs a photo to one MP4 in the library at the ratio the run asked for", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: {
        example: "push-into-eye",
        photo: [photo],
        scene: "a red scarf",
      },
      aspectRatio: "9:16",
    })
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      aspectRatio: "9:16",
      inputs: {
        example: "push-into-eye",
        photo: [photo],
        scene: "a red scarf",
        resolution: "720p",
      },
    })
    await gateway.drive(run.id)
    const done = await readRun(gateway, run.id)
    expect(done.status).toBe("done")
    expect(done.outputs).toHaveLength(1)
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: done.outputs[0] ?? "" })
    )
    expect(assetResponse.parse(await found.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
    })
  })

  it("runs the same example on another photo, and another example on the same photo, from a result", async () => {
    const gateway = openGateway()
    const first = await upload(gateway, pngOf(1080, 1920))
    const second = await upload(gateway, pngOf(1200, 1600))
    const run = await started(gateway, {
      inputs: { example: "push-into-eye", photo: [first] },
      aspectRatio: "9:16",
    })
    await gateway.drive(run.id)
    const result = await readRun(gateway, run.id)
    expect(result.status).toBe("done")
    const samePhoto = await started(gateway, {
      inputs: { ...result.inputs, example: "many-copies" },
      aspectRatio: result.aspectRatio,
    })
    expect(samePhoto.inputs).toMatchObject({
      example: "many-copies",
      photo: [first],
    })
    const sameEffect = await started(gateway, {
      inputs: { ...result.inputs, photo: [second] },
      aspectRatio: result.aspectRatio,
    })
    expect(sameEffect.inputs).toMatchObject({
      example: "push-into-eye",
      photo: [second],
    })
    await gateway.drive(samePhoto.id)
    await gateway.drive(sameEffect.id)
    expect((await readRun(gateway, samePhoto.id)).status).toBe("done")
    expect((await readRun(gateway, sameEffect.id)).status).toBe("done")
  })
})
