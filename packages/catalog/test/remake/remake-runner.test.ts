import { comfyWorkflowAdapter } from "@rosesfield/generation"
import { ProjectError } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow } from "#list-workflows"
import { remakeCopy } from "#remake/copy.en"
import { EditRefusedError } from "#remake/edit-refused.error"
import {
  shotProblemCodeOf,
  shotProblemCopyOf,
  shotProblemOfCode,
} from "#remake/shot-plan"
import { scoresOf } from "./fake-media-tool"
import {
  filterOf,
  inputsOf,
  planUrl,
  readUntilDone,
  requestOf,
  setup,
  threeShots,
} from "./remake-setup"

async function refusalOf(scores: string): Promise<unknown> {
  const { engine, shots, replay } = setup({ scores, people: ["none"] })
  const refusal = await engine.submit(requestOf()).catch((error) => error)
  expect(shots.sent).toEqual([])
  expect(replay.sent).toEqual([])
  return refusal
}

describe("Remake ends a run before any shot when the edit breaks a limit", () => {
  it.each([
    [
      "1 shot",
      scoresOf(240, []),
      "REMAKE_SHOT_COUNT_1",
      "This edit has 1 shot",
    ],
    [
      "9 shots",
      scoresOf(216, [24, 48, 72, 96, 120, 144, 168, 192]),
      "REMAKE_SHOT_COUNT_9",
      "This edit has 9 shots",
    ],
    [
      "a shot of 7 seconds",
      scoresOf(216, [48]),
      "REMAKE_SHOT_LENGTH_2_168",
      "Shot 2 runs 7 seconds",
    ],
  ])(
    "refuses an edit with %s and names the limit",
    async (_, scores, code, title) => {
      const refusal = await refusalOf(scores)
      expect(refusal).toBeInstanceOf(EditRefusedError)
      const error = refusal as EditRefusedError
      expect(error.code).toBe(code)
      expect(error.code).toMatch(ProjectError.codePattern)
      expect(error.status).toBe(400)
      const problem = shotProblemOfCode(error.code)
      expect(problem).toEqual(error.problem)
      const copy = shotProblemCopyOf(error.problem)
      const words = (remakeCopy[copy.titleKey] ?? "").replace(
        /\{(\w+)\}/g,
        (_match, name: string) => String(copy.values[name])
      )
      expect(words).toBe(title)
      expect(remakeCopy[copy.bodyKey]).toMatch(/Remake takes/)
    }
  )

  it("control: an edit of 3 shots inside the limits starts and makes no shot before its plan", async () => {
    const { engine, shots, replay } = setup({ scores: threeShots })
    const submission = await engine.submit(requestOf())
    expect(submission.ref).toBe("remake-shots|run-1")
    expect(shots.sent).toEqual([])
    expect(replay.sent).toEqual([])
  })

  it("control: a code that is not Remake's reads as no problem", () => {
    expect(shotProblemOfCode("RUN_FAILED")).toBeNull()
    expect(
      shotProblemOfCode(shotProblemCodeOf({ code: "editLength", seconds: 13 }))
    ).toEqual({ code: "editLength", seconds: 13 })
  })
})

describe("Remake plans, makes each shot and joins them into one video", () => {
  it("replaces the shot with one person, rebuilds the others and joins every made shot on its own input", async () => {
    const { engine, shots, replay, media } = setup({
      scores: threeShots,
      people: ["one", "none", "several"],
    })
    const { ref } = await engine.submit(requestOf())
    const status = await readUntilDone(engine, ref)
    expect(status).toMatchObject({
      state: "succeeded",
      cost: { amount: expect.closeTo(0.03, 6), currency: "USD" },
    })
    expect(replay.unused()).toEqual([])
    const [plan] = replay.sent
    expect(plan?.headers.get("X-API-Key")).toBe("comfyui-owner")
    expect(plan?.headers.get("Idempotency-Key")).toBe("remake-shots|run-1-plan")
    expect(JSON.stringify(plan?.body).match(/inlineData/g)).toHaveLength(3)
    expect(shots.sent.map((sent) => sent.idempotencyKey)).toEqual([
      "remake-shots|run-1-shot-1-attempt-1",
      "remake-shots|run-1-shot-2-attempt-1",
      "remake-shots|run-1-shot-3-attempt-1",
    ])
    const [replaced, rebuilt] = shots.sent
    expect(replaced?.inputs).toMatchObject({ model: "ltx-2-3-control" })
    expect(replaced?.files.map((file) => file.mime)).toEqual([
      "image/png",
      "video/mp4",
    ])
    expect(replaced?.inputs.clip).toEqual([replaced?.files[1]?.assetId])
    expect(rebuilt?.inputs).toMatchObject({
      model: "ltx-2-5",
      resolution: "480p",
      length: 3,
      sound: "off",
    })
    const clip = media.runs.find((run) => run.outputs.includes("clip.mp4"))
    expect(filterOf(clip?.args ?? [])).toContain(
      "trim=start_frame=0:end_frame=60"
    )
    const joined = media.joined()
    expect(inputsOf(joined)).toEqual([
      "reference.mp4",
      "shot-1.mp4",
      "shot-2.mp4",
      "shot-3.mp4",
    ])
    const filters = filterOf(joined).split(";")
    expect(filters.slice(0, 3).map((one) => one.slice(0, 5))).toEqual([
      "[1:v]",
      "[2:v]",
      "[3:v]",
    ])
    expect(filters.at(-1)).toBe(
      "[0:a]atrim=start=0:end=7,asetpts=PTS-STARTPTS[a]"
    )
    const [output] = await engine.listOutputs(ref)
    expect(output).toMatchObject({
      kind: "video",
      mime: "video/mp4",
      width: 848,
      height: 480,
      durationSeconds: 7,
    })
  })

  it("keeps the reference's own frames for shots with no person on Keep and makes no call for them", async () => {
    const { engine, shots, media } = setup({
      scores: threeShots,
      people: ["one", "none", "several"],
    })
    const { ref } = await engine.submit(requestOf({ otherShots: "keep" }))
    expect((await readUntilDone(engine, ref)).state).toBe("succeeded")
    expect(shots.sent.map((sent) => sent.idempotencyKey)).toEqual([
      "remake-shots|run-1-shot-1-attempt-1",
    ])
    const filters = filterOf(media.joined()).split(";")
    expect(filters[1]).toMatch(
      /^\[0:v\]fps=24,trim=start_frame=60:end_frame=132,/
    )
    expect(filters[2]).toMatch(
      /^\[0:v\]fps=24,trim=start_frame=132:end_frame=168,/
    )
  })

  it.each([
    ["sound off", { keepSound: "off" }, true],
    ["a reference with no sound", {}, false],
  ] as const)("joins a silent video with %s", async (_, inputs, hasSound) => {
    const { engine, media } = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      hasSound,
    })
    const { ref } = await engine.submit(requestOf(inputs))
    expect((await readUntilDone(engine, ref)).state).toBe("succeeded")
    expect(media.joined()).toContain("-an")
    expect(filterOf(media.joined())).not.toContain("[0:a]")
  })

  it("rebuilds 2 shots with no person at Draft from a plan of 2 entries on the LTX 2.5 text graph at 480p and 5 seconds", async () => {
    const { engine, shots, replay } = setup({
      scores: scoresOf(240, [120]),
      people: ["none", "none"],
    })
    const { ref } = await engine.submit(requestOf())
    expect((await readUntilDone(engine, ref)).state).toBe("succeeded")
    expect(replay.sent.map((sent) => sent.url)).toEqual([planUrl])
    expect(shots.sent).toHaveLength(2)
    const textGraph = findWorkflow("video-ltx-2-5-text")
    expect(textGraph).not.toBeNull()
    for (const sent of shots.sent) {
      expect(sent.binding.adapter).toBe(comfyWorkflowAdapter)
      expect(sent.binding.config.models).toEqual(textGraph?.models)
      expect(sent.inputs).toMatchObject({
        model: "ltx-2-5",
        resolution: "480p",
        length: 5,
        sound: "off",
      })
      expect(sent.files).toEqual([])
    }
  })

  it("sends one shot at a time to an engine that measures each job's cost alone", async () => {
    const { engine, shots } = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isAlone: true,
    })
    const { ref } = await engine.submit(requestOf())
    await engine.read(ref)
    await engine.read(ref)
    expect(shots.sent).toHaveLength(1)
    await engine.read(ref)
    expect(shots.sent).toHaveLength(2)
  })

  it("starts no further shot once the run is stopped", async () => {
    const { engine, shots } = setup({
      scores: threeShots,
      people: ["none", "none", "none"],
      isAlone: true,
    })
    const { ref } = await engine.submit(requestOf())
    await engine.read(ref)
    await engine.read(ref)
    await engine.cancel(ref)
    expect(shots.cancelled).toEqual(["job-1"])
    expect(await engine.read(ref)).toEqual({ state: "cancelled" })
    expect(shots.sent).toHaveLength(1)
  })

  it("control: a plan with one entry for an edit of 3 shots fails the run and makes no shot", async () => {
    const { engine, shots } = setup({ scores: threeShots, people: ["none"] })
    const { ref } = await engine.submit(requestOf())
    const status = await readUntilDone(engine, ref)
    expect(status.state).toBe("failed")
    expect(shots.sent).toEqual([])
  })

  it("control: a ref this server does not hold reads as failed", async () => {
    const { engine } = setup({ scores: threeShots })
    expect((await engine.read("remake-shots|gone")).state).toBe("failed")
  })
})
