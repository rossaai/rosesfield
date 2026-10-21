import { assetResponse, buildPath, routes } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  effectsGateways,
  pngOf,
  readRun,
  started,
  upload,
} from "../fixtures/effects-gateway"

describe("the effects app through the gateway", () => {
  const openGateway = effectsGateways()

  it("runs a photo to one MP4 in the library at the ratio the run asked for", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: {
        effect: "push-into-eye",
        image: [photo],
        prompt: "a red scarf",
      },
      aspectRatio: "9:16",
    })
    expect(run).toMatchObject({
      status: "queued",
      origin: "demo",
      aspectRatio: "9:16",
      inputs: {
        effect: "push-into-eye",
        image: [photo],
        prompt: "a red scarf",
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

  it("runs the same effect on another photo, and another effect on the same photo, from a result", async () => {
    const gateway = openGateway()
    const first = await upload(gateway, pngOf(1080, 1920))
    const second = await upload(gateway, pngOf(1200, 1600))
    const run = await started(gateway, {
      inputs: { effect: "push-into-eye", image: [first] },
      aspectRatio: "9:16",
    })
    await gateway.drive(run.id)
    const result = await readRun(gateway, run.id)
    expect(result.status).toBe("done")
    const samePhoto = await started(gateway, {
      inputs: { ...result.inputs, effect: "many-copies" },
      aspectRatio: result.aspectRatio,
    })
    expect(samePhoto.inputs).toMatchObject({
      effect: "many-copies",
      image: [first],
    })
    const sameEffect = await started(gateway, {
      inputs: { ...result.inputs, image: [second] },
      aspectRatio: result.aspectRatio,
    })
    expect(sameEffect.inputs).toMatchObject({
      effect: "push-into-eye",
      image: [second],
    })
    await gateway.drive(samePhoto.id)
    await gateway.drive(sameEffect.id)
    expect((await readRun(gateway, samePhoto.id)).status).toBe("done")
    expect((await readRun(gateway, sameEffect.id)).status).toBe("done")
  })
})
