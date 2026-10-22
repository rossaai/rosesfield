import { type RunInputs, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#characters/app"
import { smallestSizesOf } from "#characters/comfy/traits-binding"
import { imageModels } from "#image/image-models"
import { readApps } from "#list-apps"

type Node = { class_type: string; inputs: Record<string, unknown> }
type Workflow = Record<string, Node>
type Sent = { method: string; url: string; body: string | null }

const cloud = "https://cloud.comfy.org"
const jobId = "7f3d2c1b-9a8e-4d6f-b012-3c4d5e6f7a8b"
const uploadedId = "9f8a1c0d-2b3e-4f56-8a7b-1c2d3e4f5a6b"
const photoId = assetIdFormat.parse("0b6f4f1e-3c2a-4d5e-8f70-1a2b3c4d5e6f")
const [characters] = readApps([{ folder: "characters", app }])

const recorded: Record<string, { status: number; json: unknown }> = {
  [`POST ${cloud}/api/v2/assets`]: {
    status: 201,
    json: {
      id: uploadedId,
      hash: "blake3:9f8a1c0d",
      size_bytes: 8,
      content_type: "image/png",
      file_path: `${photoId}.png`,
      created_new: true,
      created_at: "2026-10-17T09:00:00Z",
    },
  },
  [`POST ${cloud}/api/v2/jobs`]: {
    status: 201,
    json: {
      id: jobId,
      status: "queued",
      created_at: "2026-10-17T09:00:00Z",
      queue_position: 1,
      progress: null,
      outputs: [],
      error: null,
    },
  },
}

function replay() {
  const sent: Sent[] = []
  const fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const recording = recorded[`${method} ${url}`]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { sent, fetch }
}

function requestFor(
  body: Record<string, unknown>,
  photo: typeof photoId = photoId
): EngineRequest {
  if (characters === undefined) {
    throw new Error("The characters app did not parse")
  }
  const parsed = startRunBodyFor(characters).parse(body)
  const inputs: RunInputs = { ...parsed.inputs }
  const hasCharacter =
    Array.isArray(inputs.character) && inputs.character.length > 0
  if (hasCharacter) {
    inputs.character = [photo]
  }
  return {
    idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    binding: resolveBinding(characters.engine, parsed.inputs),
    inputs,
    files: hasCharacter
      ? [
          {
            assetId: photo,
            kind: "image",
            mime: "image/png",
            bytes: new Uint8Array(8),
          },
        ]
      : [],
    count: parsed.count,
    aspectRatio: parsed.aspectRatio,
    seed: 42,
    outputKind: "image",
  }
}

async function submitted(
  body: Record<string, unknown>,
  photo: typeof photoId = photoId
) {
  const { sent, fetch } = replay()
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
  const submission = await engine.submit(requestFor(body, photo))
  const job = sent.find((one) => one.url.endsWith("/api/v2/jobs"))
  const workflow: Workflow = JSON.parse(job?.body ?? "{}").workflow
  return { sent, submission, workflow }
}

function linkOf(value: unknown): string | null {
  return Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
    ? value[0]
    : null
}

function textOf(workflow: Workflow, value: unknown): string {
  const id = linkOf(value)
  if (id === null) {
    return typeof value === "string" ? value : ""
  }
  const node = workflow[id]
  if (node?.class_type !== "StringConcatenate") {
    throw new Error(`Node ${id} is not text`)
  }
  const { string_a, string_b, delimiter } = node.inputs
  return [textOf(workflow, string_a), textOf(workflow, string_b)].join(
    typeof delimiter === "string" ? delimiter : ""
  )
}

function danglingLinks(workflow: Workflow): string[] {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.values(node.inputs)
      .map(linkOf)
      .filter((target) => target !== null && workflow[target] === undefined)
      .map((target) => `${id} -> ${target}`)
  )
}

const character = ["5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"]

const portraitNodes = {
  "z-image-turbo": { prompt: "27", latent: "13", seed: "3" },
  "qwen-image-2512": { prompt: "227", latent: "232", seed: "230" },
}

function sizeOf(workflow: Workflow, node: string): [number, number] {
  const inputs = workflow[node]?.inputs
  return [Number(inputs?.width), Number(inputs?.height)]
}

function viewWords(workflow: Workflow): string[] {
  return [1, 2, 3, 4].map((view) => {
    const side = workflow[`${view}120`]?.inputs
    const distance = workflow[`${view}121`]?.inputs.string_b
    return `${String(side?.string_a)} ${String(side?.string_b)} ${String(distance)}`
  })
}

describe("the Characters engine binding, replayed against Comfy", () => {
  it("opens on the catalog's open-weights default for text to image, with the traits in its prompt", async () => {
    const { workflow, submission } = await submitted({
      inputs: {
        gender: "woman",
        age: "middle-aged",
        hairLength: "long",
        hairStyle: "wavy",
        hairColor: "red",
        framing: "portrait",
        details: "round glasses",
        count: "3",
      },
      aspectRatio: "9:16",
    })
    const prompt = textOf(workflow, workflow["27"]?.inputs.text)
    expect(prompt).toBe(
      "Head and shoulders portrait photograph of one person, a woman, middle-aged, in their fifties, long hair, wavy hair, red hair, in front of a plain light grey studio background, neutral expression, looking straight at the camera, front view, soft even light, sharp focus. round glasses"
    )
    expect(workflow["13"]?.inputs).toMatchObject({
      width: 768,
      height: 1360,
      batch_size: 3,
    })
    expect(workflow["3"]?.inputs.seed).toBe(42)
    expect(workflow["28"]?.inputs.unet_name).toBe(
      "z_image_turbo_bf16.safetensors"
    )
    expect(submission.models).toContain("z_image_turbo_bf16.safetensors")
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("adds no words for a trait left on auto", async () => {
    const { workflow } = await submitted({ inputs: {} })
    expect(textOf(workflow, workflow["27"]?.inputs.text)).toBe(
      "Half-body photograph of one person, framed from the waist up, in front of a plain light grey studio background, neutral expression, looking straight at the camera, front view, soft even light, sharp focus. "
    )
  })

  it("drops the hair style and color when the hair length is bald", async () => {
    const { workflow } = await submitted({
      inputs: { hairLength: "bald", hairStyle: "curly", hairColor: "blond" },
    })
    const prompt = textOf(workflow, workflow["27"]?.inputs.text)
    expect(prompt).toContain(", a bald head")
    expect(prompt).not.toContain("curly")
    expect(prompt).not.toContain("blond")
  })

  it("keeps the hair style and color when the hair length is not bald", async () => {
    const { workflow } = await submitted({
      inputs: { hairLength: "short", hairStyle: "curly", hairColor: "blond" },
    })
    const prompt = textOf(workflow, workflow["27"]?.inputs.text)
    expect(prompt).toContain(", short hair, curly hair, blond hair")
  })

  it.each(
    Object.entries(portraitNodes).flatMap(([model, nodes]) =>
      ["1", "2", "3", "4"].flatMap((count) =>
        ["3:4", "1:1", "9:16"].map((aspectRatio) => ({
          model,
          nodes,
          count,
          aspectRatio,
        }))
      )
    )
  )(
    "makes $count portraits on $model at $aspectRatio, within 2% of the ratio",
    async ({ model, nodes, count, aspectRatio }) => {
      const { workflow } = await submitted({
        inputs: { model, count },
        aspectRatio,
      })
      const [width, height] = sizeOf(workflow, nodes.latent)
      const [across, down] = aspectRatio.split(":").map(Number)
      const wanted = Number(across) / Number(down)
      expect(Math.abs(width / height / wanted - 1)).toBeLessThanOrEqual(0.02)
      expect(workflow[nodes.latent]?.inputs.batch_size).toBe(Number(count))
      expect(workflow[nodes.seed]?.inputs.seed).toBe(42)
      expect(textOf(workflow, workflow[nodes.prompt]?.inputs.text)).toMatch(
        /^Half-body photograph of one person/
      )
      expect(danglingLinks(workflow)).toEqual([])
    }
  )

  it("sizes each portrait model at the smallest size Image lists for it", async () => {
    const turbo = imageModels.find((one) => one.value === "z-image-turbo")
    if (turbo === undefined) {
      throw new Error("Image lacks Z-Image Turbo")
    }
    const { workflow } = await submitted({ inputs: {}, aspectRatio: "1:1" })
    const square = smallestSizesOf(turbo)["1:1"]
    expect(sizeOf(workflow, "13")).toEqual([square?.width, square?.height])
    expect(sizeOf(workflow, "13")).toEqual([1024, 1024])
  })

  it("refuses a partner model, an edit model in traits and a traits model in angles, before any request", async () => {
    for (const inputs of [
      { model: "nano-banana-pro" },
      { model: "qwen-image-edit-2511" },
      { mode: "angles", character, model: "z-image-turbo" },
      { mode: "angles", character, model: "flux-2-klein-4b" },
      { angleSet: "quarters" },
    ]) {
      await expect(submitted({ inputs })).rejects.toThrow()
    }
  })

  it("throws on a request the replay holds no recording for", async () => {
    const { fetch } = replay()
    await expect(fetch(`${cloud}/api/v2/jobs/${jobId}`)).rejects.toThrow(
      "No recording"
    )
  })

  it("finds a link to a node the workflow lost", async () => {
    const { workflow } = await submitted({ inputs: {} })
    expect(danglingLinks(workflow)).toEqual([])
    delete workflow["8105"]
    expect(danglingLinks(workflow)).toEqual(["8106 -> 8105"])
  })

  it("uploads the character's photo and makes 4 views on Edit's angles set graph", async () => {
    const { workflow, sent, submission } = await submitted({
      inputs: { mode: "angles", character, angleSet: "quarters" },
    })
    expect(sent.map((one) => one.url)).toEqual([
      `${cloud}/api/v2/assets`,
      `${cloud}/api/v2/jobs`,
    ])
    expect(workflow["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(viewWords(workflow)).toEqual([
      "front-right quarter view eye-level shot medium shot",
      "back-right quarter view eye-level shot medium shot",
      "back-left quarter view eye-level shot medium shot",
      "front-left quarter view eye-level shot medium shot",
    ])
    expect(
      [1106, 2106, 3106, 4106].map((id) => workflow[String(id)]?.inputs.seed)
    ).toEqual([42, 42, 42, 42])
    expect(submission.models).toContain(
      "qwen-image-edit-2511-multiple-angles-lora.safetensors"
    )
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("names each height of the heights set in the view words", async () => {
    const { workflow } = await submitted({
      inputs: { mode: "angles", character, angleSet: "heights" },
    })
    expect(viewWords(workflow)).toEqual([
      "front view low-angle shot medium shot",
      "front view eye-level shot medium shot",
      "front view elevated shot medium shot",
      "front view high-angle shot medium shot",
    ])
  })

  it("names each side of the turnaround set in the view words", async () => {
    const { workflow } = await submitted({
      inputs: { mode: "angles", character },
    })
    expect(viewWords(workflow)).toEqual([
      "front view eye-level shot medium shot",
      "right side view eye-level shot medium shot",
      "back view eye-level shot medium shot",
      "left side view eye-level shot medium shot",
    ])
  })

  it("chains 1 portrait at the smallest size into one angle set made from it", async () => {
    const portrait = await submitted({
      inputs: { count: "1" },
      aspectRatio: "3:4",
    })
    expect(portrait.workflow["13"]?.inputs).toMatchObject({
      width: 864,
      height: 1152,
      batch_size: 1,
    })
    const portraitId = assetIdFormat.parse(
      "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d"
    )
    const angles = await submitted(
      { inputs: { mode: "angles", character } },
      portraitId
    )
    expect(angles.sent.map((one) => one.url)).toEqual([
      `${cloud}/api/v2/assets`,
      `${cloud}/api/v2/jobs`,
    ])
    expect(angles.workflow["41"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(viewWords(angles.workflow)).toHaveLength(4)
    expect(danglingLinks(angles.workflow)).toEqual([])
  })
})
