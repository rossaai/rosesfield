import {
  appDefinition,
  type RunInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import {
  appIdFormat,
  assetIdFormat,
  characterIdFormat,
} from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { mingImage01Design } from "#image/comfy/open-weights"
import { app } from "#storyboard/app"
import { textNodeOffset } from "#storyboard/comfy/keyframe-from-text"
import { keyframeSizes } from "#storyboard/comfy/keyframe-sizes"
import { keyframeBindingOf } from "#storyboard/comfy/storyboard-binding"
import { keepSentence, qwenFiles } from "#storyboard/comfy/storyboard-nodes"
import { keyframesOf } from "#storyboard/keyframe-facts"
import {
  anchoredOn,
  type KeyframeCall,
  keyframeCallsOf,
  type StoryboardAsk,
} from "#storyboard/storyboard-chain"
import { WorkflowInvalidError } from "#workflow-invalid.error"
import {
  type ApiWorkflow,
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
const firstId = assetIdFormat.parse("2f4b6d8e-0c1a-4b3c-9d5e-7f9a1b3c5d7e")
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

function askOf(
  count: number,
  extra: RunInputs,
  aspectRatio = "16:9"
): StoryboardAsk {
  const inputs: RunInputs = {
    look,
    sceneCount: String(count),
    model: "qwen-image-edit-2511",
    ...extra,
  }
  scenes.slice(0, count).forEach((scene, index) => {
    inputs[`scene${index + 1}`] = scene
  })
  return { inputs, aspectRatio, hosted: null }
}

function callsOf(ask: StoryboardAsk): KeyframeCall[] {
  return keyframeCallsOf(ask).map((call) =>
    call.waits ? anchoredOn(ask, call, firstId) : call
  )
}

function loadedIn(inputs: RunInputs): string | null {
  for (const name of ["reference", "character", "firstKeyframe"]) {
    const value = inputs[name]
    if (Array.isArray(value) && value.length > 0) {
      return name
    }
  }
  return null
}

function requestFor(call: KeyframeCall, seed: number): EngineRequest {
  const parsed = startRunBodyFor(definition).parse(call.request)
  const loaded = loadedIn(parsed.inputs)
  const inputs =
    loaded === null ? parsed.inputs : { ...parsed.inputs, [loaded]: [anchorId] }
  return {
    idempotencyKey: `storyboard-key-${call.number}`,
    binding: resolveBinding(definition.engine, parsed.inputs),
    inputs,
    files:
      loaded === null
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

function refusal(call: KeyframeCall | { request: unknown }): string[] {
  const result = startRunBodyFor(definition).safeParse(call.request)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}

async function submit(
  call: KeyframeCall,
  seed: number
): Promise<{ workflow: ApiWorkflow; models: readonly string[] }> {
  const replay = new ReplayFetch(
    loadedIn(call.request.inputs) === null
      ? [submitJob]
      : [uploadAnchor, submitJob]
  )
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(requestFor(call, seed))
  expect(submission.ref).toBe(jobId)
  expect(submission.workflowHash).toMatch(/^[0-9a-f]{64}$/)
  expect(replay.unused()).toEqual([])
  return { workflow: workflowSent(replay), models: submission.models }
}

const editModels = [qwenFiles.edit, qwenFiles.encoder, qwenFiles.vae]

const zImageTurboFiles = [
  "z_image_turbo_bf16.safetensors",
  "qwen_3_4b.safetensors",
  "ae.safetensors",
]

function savedKeyframe(workflow: ApiWorkflow): string {
  const link = workflow["99"]?.inputs.images
  if (!Array.isArray(link) || typeof link[0] !== "string") {
    throw new Error("The save node holds no image")
  }
  return link[0]
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

function withKeyframe(call: KeyframeCall, keyframe: string): KeyframeCall {
  const inputs = { ...call.request.inputs, keyframe }
  return { ...call, request: { ...call.request, inputs } }
}

function nth(calls: readonly KeyframeCall[], number: number): KeyframeCall {
  const call = calls.find((one) => one.number === number)
  if (call === undefined) {
    throw new Error(`No call makes keyframe ${number}`)
  }
  return call
}

describe("the calls a Storyboard of 3 scenes and a reference makes", () => {
  const calls = callsOf(askOf(3, { reference: [anchorId] }))

  it("makes one edit call per scene, none of which waits", () => {
    expect(calls.map((call) => [call.number, call.kind, call.waits])).toEqual([
      [1, "edit", false],
      [2, "edit", false],
      [3, "edit", false],
    ])
    for (const call of calls) {
      expect(refusal(call)).toEqual([])
      expect(startRunBodyFor(definition).parse(call.request).count).toBe(1)
    }
  })

  it("sends each call the reference and saves only the branch of its own scene, with the look after the scene", async () => {
    for (const call of calls) {
      const { workflow, models } = await submit(call, 42)
      expect(models).toEqual(editModels)
      expect(danglingLinks(workflow)).toEqual([])
      expect(workflow["7"]).toEqual({
        class_type: "LoadImage",
        inputs: { image: { __type: "core/ASSET", info: { id: uploadedId } } },
      })
      const decode = savedKeyframe(workflow)
      expect(decode).toBe(String(call.number * 100 + 6))
      expect(promptOf(workflow, decode)).toBe(
        `${keepSentence} ${scenes[call.number - 1]} ${look}`
      )
      expect(seedOf(workflow, decode)).toBe(
        call.number === 1 ? 42 : `a + ${call.number - 1}`
      )
      const reached = reachableFrom(workflow, "99")
      for (const other of [1, 2, 3, 8].filter((one) => one !== call.number)) {
        expect(reached.has(String(other * 100 + 6))).toBe(false)
      }
    }
  })
})

describe("the calls a Storyboard with no reference and no character makes", () => {
  it("makes keyframe 1 as a text call on the open-weights text default and the rest as edits that wait for it", () => {
    const planned = keyframeCallsOf(askOf(4, {}))
    expect(
      planned.map((call) => [call.number, call.kind, call.waits])
    ).toEqual([
      [1, "text", false],
      [2, "edit", true],
      [3, "edit", true],
      [4, "edit", true],
    ])
    expect(nth(planned, 1).request.inputs).toMatchObject({
      model: "z-image-turbo",
      keyframe: "1",
    })
    expect(nth(planned, 2).request.inputs).not.toHaveProperty("firstKeyframe")
  })

  it("makes keyframe 1 from scene 1 and the look on the Z-Image Turbo graph alone", async () => {
    const { workflow, models } = await submit(nth(callsOf(askOf(4, {})), 1), 7)
    expect(models).toEqual([...zImageTurboFiles, ...editModels])
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow["7"]).toBeUndefined()
    const first = savedKeyframe(workflow)
    expect(Number(first)).toBeGreaterThan(textNodeOffset)
    expect(promptOf(workflow, first)).toBe(`${scenes[0]} ${look}`)
    expect(seedOf(workflow, first)).toBe(7)
    const reached = [...reachableFrom(workflow, "99")]
    expect(
      reached.filter(
        (id) => workflow[id]?.class_type === "TextEncodeQwenImageEditPlus"
      )
    ).toEqual([])
  })

  it("edits keyframe 1 for keyframe 3, with the fixed sentence, scene 3 and the look, at the smallest format", async () => {
    const call = nth(callsOf(askOf(3, {}, "1:1")), 3)
    expect(call.request.inputs.firstKeyframe).toEqual([firstId])
    expect(refusal(call)).toEqual([])
    const { workflow, models } = await submit(call, 3)
    expect(models).toEqual(editModels)
    expect(danglingLinks(workflow)).toEqual([])
    expect(workflow["7"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(savedKeyframe(workflow)).toBe("306")
    expect(promptOf(workflow, "306")).toBe(
      `${keepSentence} ${scenes[2]} ${look}`
    )
    expect(workflow["11"]?.inputs).toMatchObject({ width: 1024, height: 1024 })
  })

  it("refuses an edit call that holds no anchor at all, and a text call for any keyframe but 1", () => {
    const planned = keyframeCallsOf(askOf(2, {}))
    expect(refusal(nth(planned, 2))).toEqual(["inputs.firstKeyframe"])
    const text = nth(planned, 1)
    expect(refusal(withKeyframe(text, "2"))).toEqual(["inputs.keyframe"])
  })
})

describe("the calls a Storyboard from a character makes", () => {
  it("edits the character's photo once per scene for 8 scenes in 9:16, each on its own branch", async () => {
    const calls = callsOf(askOf(8, { character: [characterId] }, "9:16"))
    expect(calls.every((call) => call.kind === "edit" && !call.waits)).toBe(
      true
    )
    const last = nth(calls, 8)
    const { workflow } = await submit(last, 100)
    expect(savedKeyframe(workflow)).toBe("806")
    expect(seedOf(workflow, "806")).toBe("a + 7")
    expect(promptOf(workflow, "806")).toBe(
      `${keepSentence} ${scenes[7]} ${look}`
    )
    expect(workflow["11"]?.inputs).toMatchObject({ width: 768, height: 1360 })
  })

  it("keeps the prompt to the fixed sentence and the scene when the look is empty", async () => {
    const ask = askOf(1, { reference: [anchorId] })
    delete ask.inputs.look
    const { workflow } = await submit(nth(callsOf(ask), 1), 1)
    expect(promptOf(workflow, "106").trim()).toBe(
      `${keepSentence} ${scenes[0]}`
    )
  })
})

describe("the keyframe facts beside the graph each call sends", () => {
  it("names the prompt each call's graph reads, after the fixed sentence on an edit", async () => {
    for (const extra of [{}, { reference: [anchorId] }]) {
      for (const call of callsOf(askOf(3, extra))) {
        const { workflow } = await submit(call, 9)
        const [facts] = keyframesOf({
          appId: appIdFormat.parse("storyboard"),
          inputs: startRunBodyFor(definition).parse(call.request).inputs,
          count: 1,
          seed: 9,
          outputs: [],
        })
        expect(facts?.number).toBe(call.number)
        const sent = promptOf(workflow, savedKeyframe(workflow))
        expect(sent).toBe(
          facts?.anchor.kind === "scene"
            ? facts.prompt
            : `${keepSentence} ${facts?.prompt}`
        )
      }
    }
  })
})

describe("Storyboard's text pass", () => {
  it("refuses only the run whose text graph it cannot splice, and the catalog still loads", () => {
    const refused = keyframeBindingOf(() => mingImage01Design(keyframeSizes))
    expect(() => resolveBinding(refused, {})).toThrow(/needs one latent node/)
    const missing = keyframeBindingOf(() => {
      throw new WorkflowInvalidError({
        folder: "image-z-image-turbo",
        reason: "no folder of workflows/ holds it",
      })
    })
    expect(() => resolveBinding(missing, {})).toThrow(/no folder/)
    expect(definition.id).toBe("storyboard")
  })
})

describe("the rules the Storyboard contract gives every client", () => {
  it("takes a call from a reference, from a character or from keyframe 1", () => {
    const reference = callsOf(askOf(2, { reference: [anchorId] }))
    expect(refusal(nth(reference, 2))).toEqual([])
    expect(
      refusal(nth(callsOf(askOf(2, { character: [characterId] })), 2))
    ).toEqual([])
    expect(refusal(nth(callsOf(askOf(2, {})), 2))).toEqual([])
  })

  it("refuses a reference and a character together", () => {
    const call = nth(
      callsOf(askOf(2, { reference: [anchorId], character: [characterId] })),
      1
    )
    expect(refusal(call)).toEqual(["inputs.character"])
  })

  it("refuses an empty scene inside the scene count, a scene past it and a keyframe past it", () => {
    const empty = askOf(3, { reference: [anchorId] })
    empty.inputs.scene2 = "  "
    expect(refusal(nth(callsOf(empty), 1))).toEqual(["inputs.scene2"])
    const past = askOf(2, { reference: [anchorId] })
    past.inputs.scene3 = scenes[2] ?? ""
    expect(refusal(nth(callsOf(past), 1))).toEqual(["inputs.scene3"])
    const call = nth(callsOf(askOf(2, { reference: [anchorId] })), 2)
    expect(refusal(withKeyframe(call, "3"))).toEqual(["inputs.keyframe"])
  })

  it("makes one keyframe per run and refuses a count of more", () => {
    const call = nth(callsOf(askOf(4, { reference: [anchorId] })), 4)
    expect(startRunBodyFor(definition).parse(call.request).count).toBe(1)
    expect(refusal({ request: { ...call.request, count: 4 } })).toEqual([
      "count",
    ])
  })
})
