import { appDefinition, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#storyboard/app"
import {
  keepSentence,
  kleinFiles,
  qwenFiles,
} from "#storyboard/comfy/storyboard-nodes"
import {
  type ApiWorkflow,
  batchOrder,
  danglingLinks,
  jobId,
  ReplayFetch,
  reachableFrom,
  submitJob,
  textAt,
  uploadAnchor,
  uploadedId,
  workflowSent,
} from "./storyboard-replay"

const definition = appDefinition.parse(app)
const anchorId = assetIdFormat.parse("1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e")
const characterId = characterIdFormat.parse(
  "4c6e8a0c-2e4a-4b6c-9d0e-6a8c0e2a4c6e"
)
const look = "late afternoon light, 35 mm lens"
const scenes = [
  "a girl opens the door of a small bakery",
  "she ties an apron and kneads dough",
  "she slides a tray of bread into the oven",
  "she hands a warm loaf to a neighbour",
  "she sweeps the floor after closing",
  "she counts coins at the counter",
  "she turns off the lights",
  "she walks home under the street lamps",
]

type Body = {
  inputs: Record<string, unknown>
  count?: number
  aspectRatio: string
}

function bodyOf(
  count: number,
  extra: Record<string, unknown>,
  aspectRatio = "16:9"
): Body {
  const inputs: Record<string, unknown> = {
    look,
    sceneCount: String(count),
    ...extra,
  }
  scenes.slice(0, count).forEach((scene, index) => {
    inputs[`scene${index + 1}`] = scene
  })
  return { inputs, count, aspectRatio }
}

function anchorIn(inputs: Record<string, unknown>): string | null {
  for (const name of ["reference", "character"]) {
    const value = inputs[name]
    if (Array.isArray(value) && value.length > 0) {
      return name
    }
  }
  return null
}

function requestFor(body: Body, seed: number): EngineRequest {
  const parsed = startRunBodyFor(definition).parse(body)
  const anchor = anchorIn(parsed.inputs)
  const inputs =
    anchor === null ? parsed.inputs : { ...parsed.inputs, [anchor]: [anchorId] }
  return {
    idempotencyKey: "storyboard-key-1",
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs,
    files:
      anchor === null
        ? []
        : [
            {
              assetId: anchorId,
              kind: "image",
              mime: "image/png",
              bytes: Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10),
            },
          ],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed,
    outputKind: "image",
  }
}

function refusal(body: Body): string[] {
  const result = startRunBodyFor(definition).safeParse(body)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

async function submit(
  body: Body,
  seed: number
): Promise<{ workflow: ApiWorkflow; models: readonly string[] }> {
  const replay = new ReplayFetch(
    anchorIn(body.inputs) === null ? [submitJob] : [uploadAnchor, submitJob]
  )
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(requestFor(body, seed))
  expect(submission.ref).toBe(jobId)
  expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
  expect(replay.unused()).toEqual([])
  return { workflow: workflowSent(replay), models: submission.models }
}

function savedKeyframes(workflow: ApiWorkflow): string[] {
  return batchOrder(workflow, workflow["99"]?.inputs.images)
}

function promptOf(workflow: ApiWorkflow, decode: string): string {
  for (const id of reachableFrom(workflow, decode)) {
    const one = workflow[id]
    const value =
      one?.class_type === "TextEncodeQwenImageEditPlus"
        ? one.inputs.prompt
        : one?.class_type === "CLIPTextEncode"
          ? one.inputs.text
          : undefined
    if (Array.isArray(value)) {
      return textAt(workflow, value)
    }
  }
  throw new Error(`No prompt reaches ${decode}`)
}

function seedOf(workflow: ApiWorkflow, decode: string): unknown {
  const reachable = [...reachableFrom(workflow, decode)]
  const sampler = reachable.find((id) =>
    ["KSampler", "RandomNoise"].includes(workflow[id]?.class_type ?? "")
  )
  const inputs = sampler === undefined ? {} : (workflow[sampler]?.inputs ?? {})
  const link = inputs.seed ?? inputs.noise_seed
  if (!Array.isArray(link) || typeof link[0] !== "string") {
    return link
  }
  const source = workflow[link[0]]
  return source?.class_type === "PrimitiveInt"
    ? source.inputs.value
    : source?.inputs.expression
}

describe("the engine request the Storyboard binding produces", () => {
  it("edits the reference once per scene on the Qwen row, in scene order, with the look after each scene", async () => {
    const { workflow, models } = await submit(
      bodyOf(3, { reference: [anchorId] }),
      42
    )
    expect(models).toEqual([qwenFiles.edit, qwenFiles.encoder, qwenFiles.vae])
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow["7"]).toEqual({
      class_type: "LoadImage",
      inputs: { image: { __type: "core/ASSET", info: { id: uploadedId } } },
    })
    const keyframes = savedKeyframes(workflow)
    expect(keyframes).toEqual(["106", "206", "306"])
    keyframes.forEach((decode, index) => {
      expect(promptOf(workflow, decode)).toBe(
        `${keepSentence} ${scenes[index]} ${look}`
      )
    })
    expect(keyframes.map((decode) => seedOf(workflow, decode))).toEqual([
      42,
      "a + 1",
      "a + 2",
    ])
    expect(workflow["11"]).toMatchObject({
      class_type: "EmptySD3LatentImage",
      inputs: { width: 1360, height: 768, batch_size: 1 },
    })
    expect(workflow["105"]).toMatchObject({
      class_type: "KSampler",
      inputs: { steps: 40, cfg: 4, model: ["5", 0], negative: ["10", 0] },
    })
    expect(workflow["806"]?.class_type).toBe("VAEDecode")
    const reached = reachableFrom(workflow, "99")
    expect(reached.has("406")).toBe(false)
    expect(reached.has("806")).toBe(false)
  })

  it("makes keyframe 1 from scene 1 on the Qwen row when there is no anchor, then edits keyframe 1", async () => {
    const { workflow, models } = await submit(bodyOf(4, {}), 7)
    expect(models).toContain(qwenFiles.text)
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow["7"]).toBeUndefined()
    const keyframes = savedKeyframes(workflow)
    expect(keyframes).toEqual(["46", "206", "306", "406"])
    expect(promptOf(workflow, "46")).toBe(`${scenes[0]} ${look}`)
    expect(workflow["45"]).toMatchObject({
      class_type: "KSampler",
      inputs: { steps: 50, cfg: 4, model: ["42", 0] },
    })
    expect(workflow["41"]?.inputs.unet_name).toBe(qwenFiles.text)
    expect(workflow["8"]?.inputs.image).toEqual(["46", 0])
    for (const decode of keyframes.slice(1)) {
      expect(reachableFrom(workflow, decode).has("46")).toBe(true)
    }
  })

  it("runs FLUX.2 Klein 4B at 4 steps from a character's photo for 8 scenes in 9:16", async () => {
    const { workflow, models } = await submit(
      bodyOf(8, { model: "flux-2-klein-4b", character: [characterId] }, "9:16"),
      100
    )
    expect(models).toEqual([
      kleinFiles.unet,
      kleinFiles.encoder,
      kleinFiles.vae,
    ])
    expect(danglingLinks(workflow)).toEqual([])
    const keyframes = savedKeyframes(workflow)
    expect(keyframes).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8].map((scene) => String(scene * 100 + 10))
    )
    expect(keyframes.map((decode) => seedOf(workflow, decode))).toEqual([
      100,
      "a + 1",
      "a + 2",
      "a + 3",
      "a + 4",
      "a + 5",
      "a + 6",
      "a + 7",
    ])
    expect(promptOf(workflow, "810")).toBe(
      `${keepSentence} ${scenes[7]} ${look}`
    )
    expect(workflow["5"]).toMatchObject({
      class_type: "Flux2Scheduler",
      inputs: { steps: 4, width: 768, height: 1360 },
    })
    expect(workflow["11"]?.inputs).toMatchObject({ width: 768, height: 1360 })
    expect(workflow["805"]).toMatchObject({
      class_type: "ReferenceLatent",
      inputs: { latent: ["9", 0] },
    })
  })

  it("makes keyframe 1 with its own text pass on the Klein row when there is no anchor", async () => {
    const { workflow } = await submit(
      bodyOf(2, { model: "flux-2-klein-4b" }, "1:1"),
      3
    )
    expect(danglingLinks(workflow)).toEqual([])
    expect(savedKeyframes(workflow)).toEqual(["50", "210"])
    expect(promptOf(workflow, "50")).toBe(`${scenes[0]} ${look}`)
    expect(workflow["48"]?.inputs).toMatchObject({
      positive: ["43", 0],
      negative: ["44", 0],
    })
    expect(workflow["8"]?.inputs.image).toEqual(["50", 0])
    expect(workflow["11"]?.inputs).toMatchObject({ width: 1024, height: 1024 })
  })

  it("keeps the prompt to the scene alone when the look is empty", async () => {
    const body = bodyOf(1, { reference: [anchorId] })
    delete body.inputs.look
    const { workflow } = await submit(body, 1)
    expect(savedKeyframes(workflow)).toEqual(["106"])
    expect(promptOf(workflow, "106").trim()).toBe(
      `${keepSentence} ${scenes[0]}`
    )
  })

  it("sends a character's first photo as the anchor on the Qwen row", async () => {
    const { workflow } = await submit(
      bodyOf(2, { character: [characterId] }),
      5
    )
    expect(workflow["7"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(savedKeyframes(workflow)).toEqual(["106", "206"])
  })
})

describe("the rules the Storyboard contract gives every client", () => {
  it("takes a run from a reference, from a character or from neither", () => {
    expect(refusal(bodyOf(2, { reference: [anchorId] }))).toEqual([])
    expect(refusal(bodyOf(2, { character: [characterId] }))).toEqual([])
    expect(refusal(bodyOf(2, {}))).toEqual([])
  })

  it("refuses a reference and a character together", () => {
    expect(
      refusal(bodyOf(2, { reference: [anchorId], character: [characterId] }))
    ).toEqual(["inputs.character"])
  })

  it("refuses an empty scene inside the scene count and a scene past it", () => {
    const empty = bodyOf(3, {})
    empty.inputs.scene2 = "  "
    expect(refusal(empty)).toEqual(["inputs.scene2"])
    const past = bodyOf(2, {})
    past.inputs.scene3 = scenes[2]
    expect(refusal(past)).toEqual(["inputs.scene3"])
  })

  it("makes the run's count the scene count and refuses a count that differs", () => {
    const body = bodyOf(4, {})
    delete body.count
    expect(startRunBodyFor(definition).parse(body).count).toBe(4)
    expect(refusal({ ...bodyOf(4, {}), count: 3 })).toEqual(["count"])
    expect(refusal({ ...bodyOf(1, {}), count: 9 })).toEqual(["count"])
  })
})
