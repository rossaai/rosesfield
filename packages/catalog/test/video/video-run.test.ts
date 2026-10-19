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

describe("a Video run on the demo engine", () => {
  it("starts from a prompt, ends done and keeps one MP4 output", async () => {
    const gateway = demoGateway()
    const { run } = await gateway.startVideo({ prompt: "a fox in deep snow" })
    expect(run.status).toBe("queued")
    expect(run.origin).toBe("demo")
    expect(run.aspectRatio).toBe("16:9")
    expect(run.inputs).toMatchObject({
      model: "auto",
      length: 5,
      cameraMove: "auto",
      resolution: "720p",
      sound: "off",
    })
    expect(gateway.jobs.queued).toEqual([run.id])

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

  it("keeps the choices a person made in the run record", async () => {
    const gateway = demoGateway()
    const { run } = await gateway.startVideo({
      prompt: "a lighthouse at dusk",
      model: "wan-2-2",
      resolution: "480p",
      length: 3,
      cameraMove: "push-in",
      seed: 77,
    })
    await gateway.drive(run.id)
    const done = gateway.runs.stored.get(run.id)?.toRecord()
    expect(done?.status).toBe("done")
    expect(done?.seed).toBe(77)
    expect(done?.inputs).toMatchObject({ model: "wan-2-2", length: 3 })
  })

  it("makes 4 videos from one start frame at Count 4", async () => {
    const gateway = demoGateway()
    const frame = assetIdFormat.parse(crypto.randomUUID())
    const { run } = await gateway.startVideo(
      { prompt: "a paper boat on a pond", startFrame: [frame] },
      4
    )
    expect(run.count).toBe(4)
    await gateway.drive(run.id)
    const done = gateway.runs.stored.get(run.id)?.toRecord()
    expect(done?.status).toBe("done")
    expect(done?.outputs).toHaveLength(4)
    expect(done?.inputs.startFrame).toEqual([frame])
  })

  it("gives 4 queued outputs of 600 seconds each and a 300 second queue the time to finish", async () => {
    const gateway = demoGateway()
    const { run } = await gateway.startVideo(
      { prompt: "a kite over a field" },
      4
    )
    await gateway.step(run.id)
    gateway.clock.advance((4 * 600 + 300) * 1000)
    await gateway.drive(run.id)
    const done = gateway.runs.stored.get(run.id)?.toRecord()
    expect(done?.status).toBe("done")
    expect(done?.outputs).toHaveLength(4)
  })

  it("ends a run at Count 4 that passes its limit with RUN_TIMED_OUT", async () => {
    const gateway = demoGateway()
    const { run } = await gateway.startVideo(
      { prompt: "a kite over a field" },
      4
    )
    await gateway.step(run.id)
    gateway.clock.advance((4 * 600 + 300 + 1) * 1000)
    await gateway.drive(run.id)
    const done = gateway.runs.stored.get(run.id)?.toRecord()
    expect(done?.status).toBe("failed")
    expect(done?.failure?.code).toBe("RUN_TIMED_OUT")
  })

  it("runs a clip on Wan 2.2 with no camera move", async () => {
    const gateway = demoGateway()
    const clip = assetIdFormat.parse(crypto.randomUUID())
    const { run } = await gateway.startVideo({
      prompt: "the same street in deep snow",
      clip: [clip],
      length: 4,
    })
    expect(run.inputs).toMatchObject({
      clip: [clip],
      model: "wan-2-2",
      resolution: "480p",
      length: 4,
    })
    expect(run.inputs).not.toHaveProperty("cameraMove")
    await gateway.drive(run.id)
    expect(gateway.runs.stored.get(run.id)?.toRecord().status).toBe("done")
  })

  it.each([
    { model: "wan-2-2", resolution: "720p" },
    { model: "wan-2-2", sound: "on" },
    { model: "ltx-2-5", clip: ["2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"] },
    {
      clip: ["2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"],
      startFrame: ["1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"],
    },
  ])("starts no run for the inputs %j that no model takes", async (choice) => {
    const gateway = demoGateway()
    await expect(
      gateway.startVideo({ prompt: "a red kite", ...choice })
    ).rejects.toMatchObject({ code: "RUN_INPUT_INVALID" })
    expect(gateway.runs.stored.size).toBe(0)
    expect(gateway.jobs.queued).toEqual([])
  })

  it.each([
    { prompt: "   " },
    { prompt: "a cat", length: 6 },
    { prompt: "a cat", cameraMove: "orbit" },
    { prompt: "x".repeat(1001) },
  ])("refuses the inputs %j before a run starts", async (inputs) => {
    const gateway = demoGateway()
    await expect(gateway.startVideo(inputs)).rejects.toMatchObject({
      code: "RUN_INPUT_INVALID",
    })
    expect(gateway.runs.stored.size).toBe(0)
  })
})
