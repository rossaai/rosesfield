import { appDefinition } from "@rosesfield/contract"
import { resolveBinding } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { app } from "#remake/app"
import {
  remakeEngine,
  type ShotRequestInput,
  shotRequestOf,
} from "#remake/comfy/remake-engine"
import { planShots } from "#remake/shot-plan"
import {
  asset,
  bodyOf,
  clipId,
  expectWorkflow,
  photoId,
  reply,
  requestsFor,
  runId,
  shotApps,
  shotAt,
  shots,
  submit,
  submittedJob,
  uploaded,
  uploadedClip,
  uploadedPhoto,
  wanNamesOf,
} from "./shot-requests"

describe("the engine requests Remake sends to Comfy for each shot", () => {
  it("lists the app with its inputs and binds both shot apps' own engines", () => {
    const definition = appDefinition.parse(app)
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "reference",
      "character",
      "instructions",
      "otherShots",
      "keepSound",
      "quality",
      "seed",
    ])
    expect(definition.engine).toEqual(remakeEngine)
    expect(remakeEngine.config).toEqual({
      plan: { task: "chat", model: "vertexai/gemini-3.1-flash-lite" },
      replace: shotApps.motion.engine,
      rebuild: shotApps.video.engine,
    })
  })

  it("runs no Wan model and no SCAIL-2 graph for any shot", () => {
    expect(wanNamesOf(remakeEngine.config)).toEqual([])
    for (const quality of ["draft", "final"] as const) {
      for (const request of requestsFor(quality, "rebuild", "16:9")) {
        const binding = resolveBinding(
          request?.binding ?? remakeEngine,
          request?.inputs ?? {}
        )
        expect(wanNamesOf(binding.config)).toEqual([])
      }
    }
  })

  it("control: a shot bound to a Wan model's files is caught", () => {
    expect(
      wanNamesOf({
        rebuild: {
          models: ["wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors"],
        },
        replace: { workflow: "recast-character-scail-2" },
      })
    ).toEqual([
      "wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors",
      "recast-character-scail-2",
    ])
  })

  it.each([
    ["draft", "16:9"],
    ["final", "9:16"],
  ] as const)(
    "makes each shot at %s a run its own app's contract accepts",
    (quality, ratio) => {
      const requests = requestsFor(quality, "rebuild", ratio)
      expect(requests.map((request) => request?.app)).toEqual([
        "motion",
        "video",
        "video",
      ])
      for (const request of requests) {
        if (request === null) {
          return expect.unreachable("a shot has no engine request")
        }
        const parsed = bodyOf(request)
        expect(parsed.error?.issues ?? []).toEqual([])
      }
    }
  )

  it("control: a rebuilt shot on a Wan model breaks Video's contract", () => {
    const rebuilt = shotAt(1, "draft", "16:9")
    const parsed = bodyOf({
      ...rebuilt,
      inputs: { ...rebuilt.inputs, model: "wan-2-2" },
    })
    expect(parsed.success).toBe(false)
  })

  it("sends a shot with one person to Motion's Swap a character on the LTX 2.3 control graph at Final", async () => {
    const replaced = shotAt(0, "final", "9:16")
    const { submission, replay, job, workflow } = await submit(replaced, [
      uploaded(uploadedPhoto, "image/png"),
      uploaded(uploadedClip, "video/mp4"),
      submittedJob,
    ])
    expect(replay.unused()).toEqual([])
    expect(job?.headers.get("Idempotency-Key")).toBe(
      `${runId}-shot-1-attempt-1`
    )
    expectWorkflow("motion-ltx-2-3-ic-lora", workflow, submission.models)
    expect(workflow).toMatchObject({
      "200": { inputs: { image: asset(uploadedPhoto) } },
      "199": { inputs: { file: asset(uploadedClip) } },
      "702": { inputs: { value: 704 } },
      "704": { inputs: { seed: 41 } },
    })
    expect(workflow["122"]?.inputs).not.toHaveProperty("audio")
  })

  it("sends a shot with one person to the LTX 2.3 control graph at Draft at its smallest resolution", async () => {
    const replaced = shotAt(0, "draft", "16:9")
    const { workflow } = await submit(replaced, [
      uploaded(uploadedPhoto, "image/png"),
      uploaded(uploadedClip, "video/mp4"),
      submittedJob,
    ])
    expect(workflow).toMatchObject({ "702": { inputs: { value: 480 } } })
    expect(workflow["122"]?.inputs).not.toHaveProperty("audio")
  })

  it("control: a replaced shot with Motion's sound on keeps the clip's audio", async () => {
    const replaced = shotAt(0, "draft", "16:9")
    const { workflow } = await submit(
      { ...replaced, inputs: { ...replaced.inputs, sound: "on" } },
      [
        uploaded(uploadedPhoto, "image/png"),
        uploaded(uploadedClip, "video/mp4"),
        submittedJob,
      ]
    )
    expect(workflow["122"]?.inputs).toHaveProperty("audio")
  })

  it("rebuilds a shot with no person from its words, its move and the next seed with LTX 2.5 at Final", async () => {
    const rebuilt = shotAt(1, "final", "9:16")
    const { submission, replay, job, workflow } = await submit(rebuilt, [
      submittedJob,
    ])
    expect(replay.unused()).toEqual([])
    expect(job?.headers.get("Idempotency-Key")).toBe(
      `${runId}-shot-2-attempt-1`
    )
    expectWorkflow("video-ltx-2-5-text", workflow, submission.models)
    expect(workflow).toMatchObject({
      "900": {
        inputs: {
          string_a: "A wet street at night with lit shop windows. Warm light.",
          string_b: "\nThe camera moves slowly forward, toward the subject.",
        },
      },
      "356": { inputs: { width: 384, height: 672, length: 73 } },
      "339": { inputs: { noise_seed: 42 } },
    })
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
  })

  it("rebuilds a shot of 1.5 seconds as 2 seconds with LTX 2.5 at Draft, at 480p with no sound", async () => {
    const several = shotAt(2, "draft", "16:9")
    const { submission, workflow } = await submit(several, [submittedJob])
    expectWorkflow("video-ltx-2-5-text", workflow, submission.models)
    expect(workflow).toMatchObject({
      "900": {
        inputs: {
          string_a: "A crowd at a market stall. Warm light.",
          string_b: "",
        },
      },
      "356": { inputs: { width: 448, height: 256, length: 49 } },
      "339": { inputs: { noise_seed: 43 } },
    })
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
  })

  it("control: the Final shot's inputs at Draft's resolution ask for the Draft size", async () => {
    const rebuilt = shotAt(1, "final", "16:9")
    const { workflow } = await submit(
      { ...rebuilt, inputs: { ...rebuilt.inputs, resolution: "480p" } },
      [submittedJob]
    )
    expect(workflow["356"]?.inputs).toMatchObject({ width: 448, height: 256 })
  })

  it("sends nothing for shots kept as they are", () => {
    const requests = requestsFor("draft", "keep", "16:9")
    expect(requests.map((request) => request?.shot ?? null)).toEqual([
      1,
      null,
      null,
    ])
  })

  it("keys a second attempt apart from the first", () => {
    const plan = planShots(shots, reply, "rebuild") ?? []
    const [first] = plan
    if (first === undefined) {
      return expect.unreachable("the plan has no first shot")
    }
    const input: Omit<ShotRequestInput, "attempt"> = {
      runId,
      shot: first,
      clip: clipId,
      photo: photoId,
      quality: "draft",
      instructions: "",
      aspectRatio: "16:9",
      seed: 2_147_483_647,
    }
    const once = shotRequestOf({ ...input, attempt: 1 })
    const again = shotRequestOf({ ...input, attempt: 2 })
    expect(once?.idempotencyKey).toBe(`${runId}-shot-1-attempt-1`)
    expect(again?.idempotencyKey).toBe(`${runId}-shot-1-attempt-2`)
    expect(again?.seed).toBe(2_147_483_647)
  })
})
