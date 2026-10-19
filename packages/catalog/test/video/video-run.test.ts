import { DemoGenerationEngine } from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { videoGateway } from "./video-gateway"

function demoGateway() {
  return videoGateway((clock) => new DemoGenerationEngine({ clock }))
}

function hasMp4Header(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp"
}

const limitSeconds = 1500 + 300

describe("a Video run of the LTX 2.5 graph on the demo engine", () => {
  it("starts from a prompt, ends done and keeps one MP4 output", async () => {
    const gateway = demoGateway()
    const { run } = await gateway.startVideo({
      prompt: "a fox in deep snow",
      model: "ltx-2-5",
    })
    expect(run.status).toBe("queued")
    expect(run.origin).toBe("demo")
    expect(run.aspectRatio).toBe("16:9")
    expect(run.inputs).toMatchObject({
      model: "ltx-2-5",
      length: 5,
      cameraMove: "auto",
      resolution: "480p",
      sound: "on",
    })
    await gateway.drive(run.id)
    const done = gateway.runs.stored.get(run.id)?.toRecord()
    expect(done?.status).toBe("done")
    expect(done?.outputs).toHaveLength(1)
    const [output] = gateway.assets.kept
    expect(output?.kind).toBe("video")
    expect(output?.mime).toBe("video/mp4")
    expect(hasMp4Header(output?.bytes ?? new Uint8Array())).toBe(true)
    expect(output?.width).toBeGreaterThan(output?.height ?? Infinity)
  })

  it("keeps the start frame, the move and the seed in the run record", async () => {
    const gateway = demoGateway()
    const frame = assetIdFormat.parse(crypto.randomUUID())
    const { run } = await gateway.startVideo({
      prompt: "a lighthouse at dusk",
      model: "ltx-2-5",
      startFrame: [frame],
      resolution: "720p",
      length: 3,
      cameraMove: "push-in",
      seed: 77,
    })
    await gateway.drive(run.id)
    const done = gateway.runs.stored.get(run.id)?.toRecord()
    expect(done?.status).toBe("done")
    expect(done?.seed).toBe(77)
    expect(done?.inputs).toMatchObject({
      model: "ltx-2-5",
      length: 3,
      cameraMove: "push-in",
      startFrame: [frame],
    })
  })

  it("gives a run its full limit and ends it after with RUN_TIMED_OUT", async () => {
    const inTime = demoGateway()
    const first = await inTime.startVideo({
      prompt: "a kite",
      model: "ltx-2-5",
    })
    await inTime.step(first.run.id)
    inTime.clock.advance(limitSeconds * 1000)
    await inTime.drive(first.run.id)
    expect(inTime.runs.stored.get(first.run.id)?.toRecord().status).toBe("done")

    const late = demoGateway()
    const second = await late.startVideo({ prompt: "a kite", model: "ltx-2-5" })
    await late.step(second.run.id)
    late.clock.advance((limitSeconds + 1) * 1000)
    await late.drive(second.run.id)
    const ended = late.runs.stored.get(second.run.id)?.toRecord()
    expect(ended?.status).toBe("failed")
    expect(ended?.failure?.code).toBe("RUN_TIMED_OUT")
  })

  it.each([
    { prompt: "   ", model: "ltx-2-5" },
    { prompt: "a cat", model: "ltx-2-5", length: 6 },
    { prompt: "a cat", model: "ltx-2-5", cameraMove: "orbit" },
    { prompt: "a cat", model: "wan-2-2" },
    { prompt: "x".repeat(1001), model: "ltx-2-5" },
  ])("refuses the inputs %j before a run starts", async (inputs) => {
    const gateway = demoGateway()
    await expect(gateway.startVideo(inputs)).rejects.toMatchObject({
      code: "RUN_INPUT_INVALID",
    })
    expect(gateway.runs.stored.size).toBe(0)
  })
})
