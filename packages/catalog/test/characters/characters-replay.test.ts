import { type RunInputs, startRunBodyFor } from "@rosesfield/contract"
import {
  ComfyGenerationEngine,
  type EngineRequest,
  resolveBinding,
} from "@rosesfield/generation"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { app } from "#characters/app"
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

function requestFor(body: Record<string, unknown>): EngineRequest {
  if (characters === undefined) {
    throw new Error("The characters app did not parse")
  }
  const parsed = startRunBodyFor(characters).parse(body)
  const inputs: RunInputs = { ...parsed.inputs }
  const hasCharacter =
    Array.isArray(inputs.character) && inputs.character.length > 0
  if (hasCharacter) {
    inputs.character = [photoId]
  }
  return {
    idempotencyKey: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f",
    binding: resolveBinding(characters.engine, parsed.inputs),
    inputs,
    files: hasCharacter
      ? [
          {
            assetId: photoId,
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

async function submitted(body: Record<string, unknown>) {
  const { sent, fetch } = replay()
  const engine = new ComfyGenerationEngine({ apiKey: "comfyui-test", fetch })
  const submission = await engine.submit(requestFor(body))
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

describe("the Characters engine binding, replayed against Comfy", () => {
  it("builds the traits prompt and the Klein request from the inputs", async () => {
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
    const prompt = textOf(workflow, workflow["4"]?.inputs.text)
    expect(prompt).toBe(
      "Head and shoulders portrait photograph of one person, a woman, middle-aged, in their fifties, long hair, wavy hair, red hair, in front of a plain light grey studio background, neutral expression, looking straight at the camera, front view, soft even light, sharp focus. round glasses"
    )
    expect(workflow["6"]?.inputs).toMatchObject({
      width: 928,
      height: 1648,
      batch_size: 3,
    })
    expect(workflow["12"]?.inputs).toMatchObject({ width: 928, height: 1648 })
    expect(workflow["9"]?.inputs.noise_seed).toBe(42)
    expect(workflow["1"]?.inputs.unet_name).toBe("flux-2-klein-4b.safetensors")
    expect(submission.models).toContain("flux-2-klein-4b.safetensors")
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("drops the hair style and color when the hair length is bald", async () => {
    const { workflow } = await submitted({
      inputs: { hairLength: "bald", hairStyle: "curly", hairColor: "blond" },
    })
    const prompt = textOf(workflow, workflow["4"]?.inputs.text)
    expect(prompt).toContain(", a bald head")
    expect(prompt).not.toContain("curly")
    expect(prompt).not.toContain("blond")
  })

  it("keeps the hair style and color when the hair length is not bald", async () => {
    const { workflow } = await submitted({
      inputs: { hairLength: "short", hairStyle: "curly", hairColor: "blond" },
    })
    const prompt = textOf(workflow, workflow["4"]?.inputs.text)
    expect(prompt).toContain(", short hair, curly hair, blond hair")
  })

  it("refuses a partner model and every input of the other mode before any request", async () => {
    const character = ["5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"]
    for (const inputs of [
      { model: "nano-banana-pro" },
      { mode: "angles", character, angleModel: "nano-banana-pro" },
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
    delete workflow["105"]
    expect(danglingLinks(workflow)).toEqual(["106 -> 105"])
  })

  it("uploads the character's photo and makes 4 named views", async () => {
    const { workflow, sent, submission } = await submitted({
      inputs: {
        mode: "angles",
        character: ["5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"],
        angleSet: "quarters",
      },
    })
    expect(sent.map((one) => one.url)).toEqual([
      `${cloud}/api/v2/assets`,
      `${cloud}/api/v2/jobs`,
    ])
    expect(workflow["40"]?.inputs.image).toEqual({
      __type: "core/ASSET",
      info: { id: uploadedId },
    })
    expect(
      [20, 24, 28, 32].map((id) => workflow[String(id)]?.inputs.prompt)
    ).toEqual([
      "<sks> front-right quarter view eye-level shot medium shot",
      "<sks> back-right quarter view eye-level shot medium shot",
      "<sks> back-left quarter view eye-level shot medium shot",
      "<sks> front-left quarter view eye-level shot medium shot",
    ])
    expect(
      [22, 26, 30, 34].map((id) => workflow[String(id)]?.inputs.seed)
    ).toEqual([42, 42, 42, 42])
    expect(workflow["4"]?.inputs.strength_model).toBe(0.9)
    expect(workflow["50"]?.inputs.images).toEqual(["62", 0])
    expect(submission.models).toContain(
      "qwen-image-edit-2511-multiple-angles-lora.safetensors"
    )
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("names each height of the heights set in the view prompts", async () => {
    const { workflow } = await submitted({
      inputs: {
        mode: "angles",
        character: ["5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"],
        angleSet: "heights",
      },
    })
    const prompts = [20, 24, 28, 32].map((id) =>
      String(workflow[String(id)]?.inputs.prompt)
    )
    expect(
      prompts.map(
        (text) => text.match(/(\w+-angle|eye-level|elevated) shot/)?.[0]
      )
    ).toEqual([
      "low-angle shot",
      "eye-level shot",
      "elevated shot",
      "high-angle shot",
    ])
    expect(danglingLinks(workflow)).toEqual([])
  })

  it("names each side of the turnaround set in the view prompts", async () => {
    const { workflow } = await submitted({
      inputs: {
        mode: "angles",
        character: ["5c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f"],
      },
    })
    expect(
      [20, 24, 28, 32].map((id) => workflow[String(id)]?.inputs.prompt)
    ).toEqual([
      "<sks> front view eye-level shot medium shot",
      "<sks> right side view eye-level shot medium shot",
      "<sks> back view eye-level shot medium shot",
      "<sks> left side view eye-level shot medium shot",
    ])
  })

  it.each([
    { model: "z-image-turbo", file: "z_image_turbo_bf16.safetensors" },
    {
      model: "qwen-image-2512",
      file: "qwen_image_2512_fp8_e4m3fn.safetensors",
    },
  ])(
    "submits the $model traits workflow with every link in place",
    async ({ model, file }) => {
      const { workflow, submission } = await submitted({
        inputs: { model, count: "4", framing: "full-body" },
        aspectRatio: "1:1",
      })
      expect(workflow["6"]?.inputs).toMatchObject({
        width: 1232,
        height: 1232,
        batch_size: 4,
      })
      expect(workflow["7"]?.inputs.seed).toBe(42)
      expect(textOf(workflow, workflow["4"]?.inputs.text)).toMatch(
        /^Full-body photograph of one person/
      )
      expect(submission.models).toContain(file)
      expect(danglingLinks(workflow)).toEqual([])
    }
  )
})
