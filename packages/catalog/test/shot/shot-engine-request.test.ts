import type { RunInputs } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineFile,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { findWorkflow, type Workflow as ListedWorkflow } from "#list-workflows"
import { app } from "#shot/app"
import { shotResolutions, withShotWords } from "#shot/comfy/shot-binding"
import { sentWords } from "#shot/shot-words"
import { ltxSizes, videoAspects } from "#video/comfy/video-sizes"
import {
  asset,
  recorded,
  replayFetch,
  type Workflow,
} from "../video/video-recordings"

const frameId = assetIdFormat.parse("5c7e9a1b-3d5f-4b7a-9c1e-3f5a7c9e1b2d")
const scene = "A woman crosses a rainy street at night"

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
  resolution: "480p",
  sound: "on",
}

function filesOf(inputs: RunInputs): EngineFile[] {
  return Array.isArray(inputs.startFrame) && inputs.startFrame.length > 0
    ? [
        {
          assetId: frameId,
          kind: "image",
          mime: "image/png",
          bytes: Uint8Array.of(137, 80, 78, 71),
        },
      ]
    : []
}

async function submitted(
  inputs: RunInputs,
  aspectRatio = "16:9"
): Promise<Workflow> {
  const files = filesOf(inputs)
  const replay = replayFetch([
    ...files.map(() => recorded.upload),
    recorded.submit,
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  await engine.submit({
    idempotencyKey: "shot-replay-1",
    binding: resolveBinding(app.engine, inputs),
    inputs,
    files,
    count: 1,
    aspectRatio,
    seed: 1234,
    outputKind: "video",
  })
  const job = replay.sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  return JSON.parse(job?.body ?? "{}").workflow
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

function promptOf(workflow: Workflow): string {
  const link = workflow["364"]?.inputs.text
  if (!Array.isArray(link) || typeof link[0] !== "string") {
    throw new Error("The prompt encoder reads no text node")
  }
  return textAt(workflow, link[0])
}

function brokenLinks(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.entries(node.inputs)
      .filter(
        ([, value]) =>
          Array.isArray(value) &&
          typeof value[0] === "string" &&
          workflow[value[0]] === undefined
      )
      .map(([name]) => `${id}.${name}`)
  )
}

describe("Shot on Video's LTX 2.5 graphs", () => {
  it("sends the scene and the shot words on the text graph, at 480p and 5 seconds", async () => {
    const inputs = {
      ...defaults,
      movement: "push-in",
      lens: "telephoto",
      light: "night",
      color: "cool",
      mood: "tense",
    }
    const workflow = await submitted(inputs)
    expect(promptOf(workflow)).toBe(sentWords({ scene, choices: inputs }))
    expect(promptOf(workflow)).toContain("toward the subject.")
    expect(workflow["401"]).toBeUndefined()
    expect(workflow["356"]?.inputs).toMatchObject({
      width: 448,
      height: 256,
      length: 121,
    })
    expect(workflow["366"]?.inputs.frames_number).toBe(121)
    expect(workflow["339"]?.inputs.noise_seed).toBe(1234)
    expect(workflow["370"]?.inputs.audio).toEqual(["358", 0])
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("sends the start frame on the start frame graph with push-in and black and white", async () => {
    const inputs = {
      ...defaults,
      startFrame: [frameId],
      movement: "push-in",
      color: "black-and-white",
    }
    const workflow = await submitted(inputs)
    expect(workflow["401"]?.inputs.image).toEqual(asset)
    expect(workflow["402"]).toBeUndefined()
    expect(
      Object.values(workflow).map((node) => node.class_type)
    ).not.toContain("LTXVAddGuide")
    expect(promptOf(workflow)).toBe(
      `${scene}. The camera moves slowly toward the subject. Black and white, with no color.`
    )
    expect(workflow["339"]?.inputs.noise_seed).toBe(1234)
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("adds no words for auto and leaves the audio out when sound is off", async () => {
    const workflow = await submitted({ ...defaults, sound: "off", length: 2 })
    expect(promptOf(workflow)).toBe(`${scene}.`)
    expect(workflow["356"]?.inputs.length).toBe(49)
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(brokenLinks(workflow)).toEqual([])
  })

  it.each(
    shotResolutions.flatMap((resolution) =>
      videoAspects.map((aspect) => ({ resolution, aspect }))
    )
  )("binds $resolution at $aspect to half of Video's size for the first pass", async ({
    resolution,
    aspect,
  }) => {
    const workflow = await submitted({ ...defaults, resolution }, aspect)
    const size = ltxSizes[resolution][aspect]
    expect(workflow["356"]?.inputs).toMatchObject({
      width: size.width / 2,
      height: size.height / 2,
    })
  })

  it("refuses a resolution Video's graphs do not bind, before any request", () => {
    expect(() =>
      resolveBinding(app.engine, { ...defaults, resolution: "1080p" })
    ).toThrow(expect.objectContaining({ code: "ENGINE_BINDING_INVALID" }))
  })

  it("makes one output per job on every graph, so a count of 4 is 4 jobs", () => {
    const engine = new ComfyGenerationEngine({
      apiKey: "comfyui-test",
      fetch: replayFetch([]).fetch,
    })
    for (const inputs of [
      defaults,
      { ...defaults, sound: "off" },
      { ...defaults, startFrame: [frameId] },
      { ...defaults, startFrame: [frameId], resolution: "720p" },
    ]) {
      expect(engine.outputsPerJob(resolveBinding(app.engine, inputs))).toBe(
        "one"
      )
    }
  })
})

describe("withShotWords", () => {
  function videoGraph(): ListedWorkflow {
    const workflow = findWorkflow("video-ltx-2-5-start-frame")
    if (workflow === null) {
      throw new Error("Video's start frame graph is not listed")
    }
    return workflow
  }

  it("points the prompt at the scene node and adds one target per shot list", () => {
    const shot = withShotWords(videoGraph())
    expect(shot.inputs.prompt?.path).toEqual(["950", "inputs", "string"])
    expect(shot.inputs.movement?.path).toEqual(["952", "inputs", "string_b"])
    expect(shot.inputs.mood?.path).toEqual(["958", "inputs", "string_b"])
    expect(shot.inputs).not.toHaveProperty("cameraMove")
  })

  it("refuses a graph whose prompt node joins no text, the control", () => {
    const workflow = videoGraph()
    const graph = { ...workflow.graph, "900": { class_type: "Note", inputs: {} } }
    expect(() => withShotWords({ ...workflow, graph })).toThrow(
      expect.objectContaining({ code: "WORKFLOW_INVALID" })
    )
  })
})
