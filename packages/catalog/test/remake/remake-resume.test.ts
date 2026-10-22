import { comfyWorkflowAdapter } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { FakeShotEngine } from "./fake-generation-engine"
import {
  inputsOf,
  readUntilDone,
  requestOf,
  restarted,
  resumedOf,
  setup,
  stepsOf,
  threeShots,
} from "./remake-setup"

describe("Remake writes its plan before any shot and resumes from it", () => {
  it("reports the plan with each shot's span, route, model and seed before any shot is made", async () => {
    const { engine, shots } = setup({
      scores: threeShots,
      people: ["one", "none", "several"],
    })
    const { ref } = await engine.submit(requestOf())
    const steps = stepsOf(await engine.read(ref))
    expect(shots.sent).toEqual([])
    expect(steps?.jobs).toEqual([])
    expect(steps?.plan.shots).toEqual([
      {
        number: 1,
        startSeconds: 0,
        endSeconds: 2.5,
        route: "replace",
        model: "ltx-2-3-control",
        credits: null,
        seed: 41,
        words: null,
        cameraMove: null,
      },
      {
        number: 2,
        startSeconds: 2.5,
        endSeconds: 5.5,
        route: "rebuild",
        model: "ltx-2-5",
        credits: null,
        seed: 42,
        words: "A wet street at night.",
        cameraMove: "push-in",
      },
      {
        number: 3,
        startSeconds: 5.5,
        endSeconds: 7,
        route: "rebuild",
        model: "ltx-2-5",
        credits: null,
        seed: 43,
        words: "A wet street at night.",
        cameraMove: "push-in",
      },
    ])
  })

  it("prices each shot before it is made and reads its measured credits once made", async () => {
    const { engine } = setup({
      scores: threeShots,
      people: ["one", "none", "none"],
      credits: 12,
    })
    const { ref } = await engine.submit(requestOf({ otherShots: "keep" }))
    const planned = stepsOf(await engine.read(ref))
    expect(planned?.plan.shots.map((shot) => shot.credits)).toEqual([
      12,
      null,
      null,
    ])
    const done = stepsOf(await readUntilDone(engine, ref))
    expect(done?.plan.shots.map((shot) => shot.credits)).toEqual([
      1,
      null,
      null,
    ])
  })

  it("writes each shot's job as it starts", async () => {
    const { engine } = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isAlone: true,
    })
    const { ref } = await engine.submit(requestOf())
    await engine.read(ref)
    const steps = stepsOf(await engine.read(ref))
    expect(steps?.jobs).toEqual([
      { number: 1, engine: comfyWorkflowAdapter, ref: "job-1" },
    ])
  })

  it("takes every middle frame in one ffmpeg pass, scaled to a long side of 768", async () => {
    const { engine, media } = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
    })
    const { ref } = await engine.submit(requestOf())
    await engine.read(ref)
    const framed = media.runs.filter((run) =>
      run.outputs.some((name) => name.endsWith(".jpg"))
    )
    expect(framed).toHaveLength(1)
    expect(framed[0]?.outputs).toEqual([
      "frame-1.jpg",
      "frame-2.jpg",
      "frame-3.jpg",
    ])
    expect(framed[0]?.args.join(" ")).toContain(
      "select='eq(n,30)+eq(n,96)+eq(n,150)',scale=w='min(768,iw)':h='min(768,ih)':force_original_aspect_ratio=decrease"
    )
  })

  it("resumes on a new server from the steps its run kept, with no second plan turn and no shot sent twice", async () => {
    const first = setup({
      scores: threeShots,
      people: ["one", "none", "none"],
    })
    const { ref } = await first.engine.submit(requestOf())
    await first.engine.read(ref)
    const kept = stepsOf(await first.engine.read(ref))
    expect(first.shots.sent).toHaveLength(3)
    const next = restarted(first.media, first.shots, first.store)
    expect(next.engine.holds(ref)).toBe(false)
    await next.engine.submit(resumedOf(kept))
    expect(next.engine.holds(ref)).toBe(true)
    expect((await readUntilDone(next.engine, ref)).state).toBe("succeeded")
    expect(next.replay.sent).toEqual([])
    expect(first.shots.sent).toHaveLength(3)
    expect(inputsOf(first.media.joined())).toEqual([
      "reference.mp4",
      "shot-1.mp4",
      "shot-2.mp4",
      "shot-3.mp4",
    ])
  })

  it("sends only the shots that had not started when the server stopped", async () => {
    const first = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isAlone: true,
    })
    const { ref } = await first.engine.submit(requestOf())
    await first.engine.read(ref)
    const kept = stepsOf(await first.engine.read(ref))
    expect(first.shots.sent).toHaveLength(1)
    const next = restarted(first.media, first.shots, first.store)
    await next.engine.submit(resumedOf(kept))
    expect((await readUntilDone(next.engine, ref)).state).toBe("succeeded")
    expect(first.shots.sent.map((sent) => sent.idempotencyKey)).toEqual([
      "remake-shots|run-1-shot-1-attempt-1",
      "remake-shots|run-1-shot-2-attempt-1",
      "remake-shots|run-1-shot-3-attempt-1",
    ])
  })

  it("control: a new server given no steps plans again, and with no recording for the plan it never ends", async () => {
    const first = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
    })
    const { ref } = await first.engine.submit(requestOf())
    await first.engine.read(ref)
    const next = restarted(first.media, first.shots, first.store)
    await next.engine.submit(requestOf())
    const status = await next.engine.read(ref)
    expect(status.state).toBe("running")
    expect(stepsOf(status)).toBeUndefined()
  })
})

describe("Remake keeps each step's cost and each made shot across a restart", () => {
  it("ends a resumed run with the plan turn's cost and the cost of every shot made before the restart", async () => {
    const first = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isAlone: true,
      planCredits: 2.11,
    })
    const { ref } = await first.engine.submit(requestOf())
    await first.engine.read(ref)
    await first.engine.read(ref)
    const kept = stepsOf(await first.engine.read(ref))
    expect(kept?.planCost).toEqual({ amount: 0.01, currency: "USD" })
    expect(kept?.jobs.map((job) => job.cost ?? null)).toEqual([
      { amount: 0.01, currency: "USD" },
      null,
    ])
    const unmetered = new FakeShotEngine({ isAlone: true, cost: null })
    const next = restarted(first.media, unmetered, first.store)
    await next.engine.submit(resumedOf(kept))
    const status = await readUntilDone(next.engine, ref)
    expect(status).toMatchObject({
      state: "succeeded",
      cost: { amount: expect.closeTo(0.02, 6), currency: "USD" },
    })
  })

  it("resumes a shot whose model answered at submit from its stored video, with no second call", async () => {
    const first = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isNow: true,
    })
    const { ref } = await first.engine.submit(requestOf())
    await first.engine.read(ref)
    const kept = stepsOf(await first.engine.read(ref))
    expect(first.shots.sent).toHaveLength(3)
    expect(kept?.jobs.map((job) => job.made?.mime)).toEqual([
      "video/mp4",
      "video/mp4",
      "video/mp4",
    ])
    const later = new FakeShotEngine({ isNow: true })
    const next = restarted(first.media, later, first.store)
    await next.engine.submit(resumedOf(kept))
    const status = await readUntilDone(next.engine, ref)
    expect(status).toMatchObject({
      state: "succeeded",
      cost: { amount: expect.closeTo(0.03, 6), currency: "USD" },
    })
    expect(later.sent).toEqual([])
    expect(inputsOf(first.media.joined())).toEqual([
      "reference.mp4",
      "shot-1.mp4",
      "shot-2.mp4",
      "shot-3.mp4",
    ])
    expect(first.store.stored.size).toBe(0)
  })

  it("control: a stored shot whose bytes are gone is read again from its engine", async () => {
    const first = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isNow: true,
    })
    const { ref } = await first.engine.submit(requestOf())
    await first.engine.read(ref)
    const kept = stepsOf(await first.engine.read(ref))
    first.store.stored.clear()
    const next = restarted(
      first.media,
      new FakeShotEngine({ isNow: true }),
      first.store
    )
    await next.engine.submit(resumedOf(kept))
    expect((await readUntilDone(next.engine, ref)).state).toBe("failed")
  })
})
