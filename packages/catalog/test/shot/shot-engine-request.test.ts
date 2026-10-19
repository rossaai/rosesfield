import type { RunInputs } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#shot/app"
import { ltxSizeStep, ltxSizes } from "#shot/comfy/shot-binding"
import { sentWords } from "#shot/shot-words"

type Recording = { method: string; url: string; status: number; json: unknown }
type Sent = { method: string; url: string; body: string | null }
type Workflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>

const cloudUrl = "https://cloud.comfy.org"
const jobId = "3e5a7c9b-1d2f-4a6b-8c0d-2e4f6a8b0c1d"
const uploadedId = "8b0d2f4a-6c8e-4a1b-9d3f-5a7c9e1b3d5f"
const frameId = assetIdFormat.parse("5c7e9a1b-3d5f-4b7a-9c1e-3f5a7c9e1b2d")
const scene = "A woman crosses a rainy street at night"

const submitJob: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/jobs`,
  status: 201,
  json: { id: jobId, status: "queued", progress: null, outputs: [] },
}

const uploadFrame: Recording = {
  method: "POST",
  url: `${cloudUrl}/api/v2/assets`,
  status: 201,
  json: { id: uploadedId, content_type: "image/png" },
}

class Replay {
  readonly sent: Sent[] = []
  private readonly pending: Recording[]

  constructor(recordings: readonly Recording[]) {
    this.pending = [...recordings]
  }

  readonly fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const index = this.pending.findIndex(
      (one) => one.method === method && one.url === url
    )
    const recording = this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    const body = typeof init?.body === "string" ? init.body : null
    this.sent.push({ method, url, body })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
}

const defaults: RunInputs = {
  prompt: scene,
  startFrame: [],
  model: "ltx-2-5",
  movement: "auto",
  camera: "auto",
  lens: "auto",
  focus: "auto",
  light: "auto",
  color: "auto",
  mood: "auto",
  length: 5,
  resolution: "720p",
  sound: "on",
}

function engineWith(replay: Replay): ComfyGenerationEngine {
  return new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
}

async function submitted(
  inputs: RunInputs,
  recordings: readonly Recording[] = [submitJob],
  aspectRatio = "16:9"
): Promise<Workflow> {
  const replay = new Replay(recordings)
  const engine = engineWith(replay)
  const files: EngineRequest["files"] =
    Array.isArray(inputs.startFrame) && inputs.startFrame.length > 0
      ? [
          {
            assetId: frameId,
            kind: "image",
            mime: "image/png",
            bytes: Uint8Array.of(137, 80, 78, 71),
          },
        ]
      : []
  const submission = await engine.submit({
    idempotencyKey: "shot-replay-1",
    binding: resolveBinding(app.engine, inputs),
    inputs,
    files,
    count: 1,
    aspectRatio,
    seed: 1234,
    outputKind: "video",
  })
  expect(submission.ref).toBe(jobId)
  const job = replay.sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  return JSON.parse(job?.body ?? "{}").workflow
}

function inputOf(workflow: Workflow, node: string, name: string): unknown {
  return workflow[node]?.inputs[name]
}

function textAt(workflow: Workflow, node: string): string {
  const entry = workflow[node]
  const read = (name: string): string => {
    const value = entry?.inputs[name]
    if (typeof value === "string") {
      return value
    }
    if (Array.isArray(value) && typeof value[0] === "string") {
      return textAt(workflow, value[0])
    }
    throw new Error(`Node ${node} has no text at ${name}`)
  }
  switch (entry?.class_type) {
    case "StringTrim":
      return read("string").trim()
    case "RegexReplace":
      return read("string").replace(
        new RegExp(read("regex_pattern")),
        read("replace")
      )
    case "StringConcatenate":
      return `${read("string_a")}${read("delimiter")}${read("string_b")}`
    default:
      throw new Error(`Node ${node} is no text node`)
  }
}

function promptOf(workflow: Workflow, encoder: string): string {
  const link = inputOf(workflow, encoder, "text")
  if (!Array.isArray(link) || typeof link[0] !== "string") {
    throw new Error("The prompt encoder reads no text node")
  }
  return textAt(workflow, link[0])
}

describe("the ltx-2-5 engine request", () => {
  it("sends the scene, the shot words, the size, the length and the seed", async () => {
    const inputs = {
      ...defaults,
      movement: "push-in",
      lens: "telephoto",
      light: "night",
      color: "cool",
      mood: "tense",
    }
    const workflow = await submitted(inputs)
    expect(promptOf(workflow, "364")).toBe(
      sentWords({ scene, choices: inputs, movementAsWords: true, closes: true })
    )
    expect(promptOf(workflow, "364")).toContain("toward the subject.")
    expect(inputOf(workflow, "372", "value")).toBe(1280)
    expect(inputOf(workflow, "360", "value")).toBe(704)
    expect(inputOf(workflow, "362", "value")).toBe(5)
    expect(inputOf(workflow, "361", "value")).toBe(24)
    expect(inputOf(workflow, "339", "noise_seed")).toBe(1234)
    expect(inputOf(workflow, "370", "audio")).toEqual(["358", 0])
    expect(
      Object.values(workflow).map((node) => node.class_type)
    ).not.toContain("TextGenerateLTX2Prompt")
  })

  it("adds no words for auto and leaves the audio out when sound is off", async () => {
    const workflow = await submitted({
      ...defaults,
      length: 10,
      resolution: "1080p",
      sound: "off",
    })
    expect(promptOf(workflow, "364")).toBe(`${scene}. One continuous shot.`)
    expect(inputOf(workflow, "362", "value")).toBe(10)
    expect(inputOf(workflow, "372", "value")).toBe(1920)
    expect(inputOf(workflow, "360", "value")).toBe(1088)
    expect(inputOf(workflow, "370", "audio")).toBeUndefined()
  })

  it("refuses a start frame before any request, because its workflow reads none", () => {
    expect(() =>
      resolveBinding(app.engine, { ...defaults, startFrame: [frameId] })
    ).toThrow(expect.objectContaining({ code: "ENGINE_BINDING_INVALID" }))
  })
})

const aspects: Readonly<Record<string, number>> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
}

function numberAt(workflow: Workflow, node: string, name: string): number {
  const value = inputOf(workflow, node, name)
  if (typeof value === "number") {
    return value
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    const source = workflow[value[0]]
    if (source?.class_type === "PrimitiveInt") {
      return numberAt(workflow, value[0], "value")
    }
    if (
      source?.class_type === "ComfyMathExpression" &&
      source.inputs.expression === "a/2" &&
      value[1] === 1
    ) {
      return Math.trunc(numberAt(workflow, value[0], "values.a") / 2)
    }
  }
  throw new Error(`Node ${node} has no number the test can run at ${name}`)
}

function savedSide(workflow: Workflow, side: "width" | "height"): number {
  const latent = Math.floor(numberAt(workflow, "356", side) / 32)
  expect(workflow["348"]?.class_type).toBe("LTXVLatentUpsampler")
  return latent * 2 * 32
}

function savedSize(workflow: Workflow): { width: number; height: number } {
  return {
    width: savedSide(workflow, "width"),
    height: savedSide(workflow, "height"),
  }
}

describe("the ltx-2-5 size the person picks is the size it saves", () => {
  const pairs = Object.entries(ltxSizes).flatMap(([resolution, sizes]) =>
    Object.keys(aspects).map((aspect) => ({
      resolution,
      aspect,
      size: sizes[aspect],
    }))
  )

  it("binds every format and resolution, 15 pairs", () => {
    expect(pairs).toHaveLength(15)
    for (const pair of pairs) {
      expect(pair.size).toBeDefined()
    }
  })

  it.each(pairs)(
    "$resolution at $aspect survives the halving, the floor to 32 and the 2 times upscaler",
    async ({ resolution, aspect, size }) => {
      const workflow = await submitted(
        { ...defaults, resolution },
        [submitJob],
        aspect
      )
      expect(numberAt(workflow, "372", "value")).toBe(size?.width)
      expect(numberAt(workflow, "360", "value")).toBe(size?.height)
      const saved = savedSize(workflow)
      expect(saved).toEqual(size)
      expect(saved.width % ltxSizeStep).toBe(0)
      expect(saved.height % ltxSizeStep).toBe(0)
      const ratio = saved.width / saved.height
      expect(Math.abs(Math.log(ratio / (aspects[aspect] ?? 0)))).toBeLessThan(
        0.03
      )
    }
  )

  it("changes a side that is not a multiple of 64, the control", () => {
    const workflow: Workflow = {
      "348": { class_type: "LTXVLatentUpsampler", inputs: {} },
      "353": {
        class_type: "ComfyMathExpression",
        inputs: { expression: "a/2", "values.a": 1280 },
      },
      "355": {
        class_type: "ComfyMathExpression",
        inputs: { expression: "a/2", "values.a": 736 },
      },
      "356": {
        class_type: "EmptyLTXVLatentVideo",
        inputs: { width: ["353", 1], height: ["355", 1] },
      },
    }
    expect(savedSize(workflow)).toEqual({ width: 1280, height: 704 })
  })
})

describe("one paid run per output", () => {
  const leaves: RunInputs[] = [
    defaults,
    { ...defaults, sound: "off" },
    {
      ...defaults,
      model: "wan-2-2-fun-camera",
      resolution: "480p",
      startFrame: [frameId],
    },
    {
      ...defaults,
      model: "wan-2-2-fun-camera",
      resolution: "480p",
      startFrame: [frameId],
      movement: "crane-up",
    },
  ]

  it.each(leaves.map((inputs, index) => ({ index, inputs })))(
    "binding $index makes one output per job, so a count of 4 is 4 jobs",
    ({ inputs }) => {
      const engine = engineWith(new Replay([]))
      expect(engine.outputsPerJob(resolveBinding(app.engine, inputs))).toBe(
        "one"
      )
    }
  )
})

describe("the wan-2-2-fun-camera engine request", () => {
  const wan = {
    ...defaults,
    model: "wan-2-2-fun-camera",
    resolution: "480p",
    startFrame: [frameId],
  }

  it("sends the movement as the camera input and the frame as the start image", async () => {
    const inputs = { ...wan, movement: "push-in", color: "warm" }
    const workflow = await submitted(inputs, [uploadFrame, submitJob])
    expect(inputOf(workflow, "108", "camera_pose")).toBe("Zoom In")
    expect(inputOf(workflow, "108", "width")).toBe(832)
    expect(inputOf(workflow, "108", "height")).toBe(480)
    expect(inputOf(workflow, "108", "length")).toBe(81)
    expect(inputOf(workflow, "98", "camera_conditions")).toEqual(["108", 0])
    expect(inputOf(workflow, "97", "image")).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(inputOf(workflow, "102", "noise_seed")).toBe(1234)
    expect(promptOf(workflow, "107")).toBe(`${scene}. Warm colors.`)
    expect(promptOf(workflow, "107")).toBe(
      sentWords({
        scene,
        choices: inputs,
        movementAsWords: false,
        closes: false,
      })
    )
  })

  it("sends no camera input for auto", async () => {
    const workflow = await submitted(wan, [uploadFrame, submitJob])
    expect(inputOf(workflow, "98", "camera_conditions")).toBeUndefined()
  })

  it("refuses a movement and a resolution the model cannot take, before any request", () => {
    for (const inputs of [
      { ...wan, movement: "pan-left" },
      { ...wan, resolution: "720p" },
    ]) {
      expect(() => resolveBinding(app.engine, inputs)).toThrow(
        expect.objectContaining({ code: "ENGINE_BINDING_INVALID" })
      )
    }
  })

  it("throws on a request it has no recording for, the control of the replay", async () => {
    await expect(submitted(wan, [submitJob])).rejects.toThrow(
      expect.objectContaining({ code: "ENGINE_UNAVAILABLE" })
    )
  })
})
