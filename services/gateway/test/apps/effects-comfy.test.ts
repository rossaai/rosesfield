import {
  assetResponse,
  buildPath,
  routes,
  runPageResponse,
} from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { runLimitSeconds } from "../../../../packages/catalog/src/effects/app"
import {
  jobId,
  livePorts,
  replayedComfy,
  uploadedId,
  videoModel,
} from "../fixtures/effects-comfy"
import {
  effectsGateways,
  openEffects,
  pngOf,
  readRun,
  started,
  upload,
} from "../fixtures/effects-gateway"

describe("the effects app through the gateway on a replayed Comfy", () => {
  const openGateway = effectsGateways()

  it("lands a Comfy run in the library and History with its effect, model, seed and credits", async () => {
    const comfy = replayedComfy("succeeded")
    const gateway = openGateway(openEffects(), livePorts(comfy))
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: { effect: "push-into-eye", image: [photo] },
      aspectRatio: "9:16",
    })
    await gateway.drive(run.id)
    const [graph] = comfy.graphs
    expect(comfy.graphs).toHaveLength(1)
    expect(graph).toMatchObject({
      "395": { inputs: { image: { info: { id: uploadedId } } } },
      "606": {
        inputs: {
          image: ["395", 0],
          width: 704,
          height: 1280,
          crop: "center",
        },
      },
      "351": { inputs: { input: ["606", 0] } },
      "349": { inputs: { image: ["350", 0], strength: 1 } },
      "339": { inputs: { noise_seed: run.seed } },
      "628": { inputs: { color: 8 * 0x010101 } },
      "460": { inputs: { image: ["628", 0] } },
      "359": { inputs: { audio: ["358", 0], lufs: -23.75 } },
      "370": { inputs: { audio: ["361", 0] } },
    })
    expect(graph?.["626"]).toBeUndefined()
    const history = await gateway.call(routes.listRuns.path)
    const { runs } = runPageResponse.parse(await history.json())
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({
      id: run.id,
      status: "done",
      origin: "live",
      inputs: { effect: "push-into-eye" },
      seed: run.seed,
      engine: { models: expect.arrayContaining([videoModel]) },
      cost: { amount: 1.055 / 211, currency: "USD" },
    })
    expect(runs[0]?.engine.models[0]).toBe(videoModel)
    const found = await gateway.call(
      buildPath(routes.getAsset.path, { assetId: runs[0]?.outputs[0] ?? "" })
    )
    expect(assetResponse.parse(await found.json()).asset).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      sourceRunId: run.id,
    })
  })

  it("ends a run its engine has not finished in 180 seconds, and submits it once", async () => {
    const comfy = replayedComfy("running")
    const gateway = openGateway(openEffects(), livePorts(comfy))
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      inputs: { effect: "push-into-eye", image: [photo] },
      aspectRatio: "9:16",
    })
    const runId = runIdFormat.parse(run.id)
    await gateway.handlers.advanceRun.execute({ runId })
    expect(comfy.graphs).toHaveLength(1)
    gateway.clock.advance((runLimitSeconds - 1) * 1000)
    await gateway.handlers.advanceRun.execute({ runId })
    expect((await readRun(gateway, run.id)).status).toBe("running")
    gateway.clock.advance(2000)
    await gateway.drive(run.id)
    const ended = await readRun(gateway, run.id)
    expect(ended.status).toBe("failed")
    expect(ended.failure?.code).toBe("RUN_TIMED_OUT")
    expect(comfy.graphs).toHaveLength(1)
    expect(comfy.sent).toContain(`POST /api/v2/jobs/${jobId}/cancel`)
  })
})
