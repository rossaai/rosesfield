import { ComfyGenerationEngine, resolveBinding } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { heldFilesOf, isHeldOnCloud } from "#comfy/cloud-weights"
import { modelsForApp } from "#comfy/list-models"
import { findWorkflow } from "#list-workflows"
import {
  guideCropLimit,
  guideCropOf,
  isGuideFit,
  renderSizeOf,
} from "#motion/comfy/guide-fit"
import {
  graphModel,
  guideModel,
  ltx25GuideModel,
  swapModel,
} from "#motion/motion-models"
import { withoutVideoStills } from "../workflows/video-stills"
import {
  both,
  fileGraph,
  type Graph,
  graphSchema,
  linksToMissingNodes,
  motion,
  type Recording,
  ReplayFetch,
  requestFor,
} from "./motion-replay"

const guideWorkflowId = "motion-guide-ltx-2-3-ic-lora"

const poseNodes = ["707", "708", "709", "710", "711", "712"]

const identitySentence =
  "The same person from the opening frame keeps the same face, hair, clothes and skin in every shot."

const cloudUrl = "https://cloud.comfy.org"
const jobId = "6e5d4c3b-2a1f-4e0d-9c8b-7a6f5e4d3c2b"
const photoUpload = "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f"
const guideUpload = "4d5e6f7a-8b9c-4d0e-9f2a-3b4c5d6e7f80"

function guideGraph(): Graph {
  const workflow = findWorkflow(guideWorkflowId)
  if (workflow === null) {
    throw new Error(`workflows/${guideWorkflowId} is not listed`)
  }
  return graphSchema.parse(structuredClone(workflow.graph))
}

function set(graph: Graph, id: string, name: string, value: unknown): void {
  const node = graph[id]
  if (node === undefined) {
    throw new Error(`The graph has no node ${id}`)
  }
  node.inputs[name] = value
}

function recipeGraph(): Graph {
  const graph = fileGraph()
  for (const id of poseNodes) {
    delete graph[id]
  }
  set(graph, "717", "image", ["706", 0])
  set(graph, "719", "image1", ["706", 0])
  set(graph, "900", "string_a", identitySentence)
  set(graph, "68", "filename_prefix", "video/rosesfield-motion-guide")
  delete graph["122"]?.inputs.audio
  return graph
}

function uploaded(id: string, contentType: string): Recording {
  return {
    method: "POST",
    url: `${cloudUrl}/api/v2/assets`,
    status: 201,
    json: { id, content_type: contentType, created_new: true },
  }
}

async function submitted(inputs: Record<string, unknown>) {
  const replay = new ReplayFetch([
    uploaded(photoUpload, "image/jpeg"),
    uploaded(guideUpload, "video/mp4"),
    {
      method: "POST",
      url: `${cloudUrl}/api/v2/jobs`,
      status: 201,
      json: { id: jobId, status: "queued", outputs: [] },
    },
  ])
  const engine = new ComfyGenerationEngine({
    apiKey: "comfyui-test",
    fetch: replay.fetch,
  })
  const submission = await engine.submit(requestFor(inputs))
  const body = replay.sent.find((sent) => sent.url.endsWith("/jobs"))?.body
  const workflow = graphSchema.parse(
    typeof body === "object" && body !== null && "workflow" in body
      ? body.workflow
      : null
  )
  return { submission, replay, workflow: withoutVideoStills(workflow) }
}

describe("the depth guide graph", () => {
  it("is the Motion graph with the recipes' edits: no pose nodes, the guide's frames into nodes 717 and 719, a depth sentence and no sound", () => {
    expect(guideGraph()).toEqual(recipeGraph())
    expect(linksToMissingNodes(guideGraph())).toEqual([])
  })

  it("runs only node classes the Motion graph runs on Comfy Cloud, and loads no pose model", () => {
    const motionClasses = new Set(
      Object.values(fileGraph()).map((node) => node.class_type)
    )
    const classes = Object.values(guideGraph()).map((node) => node.class_type)
    expect(classes.filter((one) => !motionClasses.has(one))).toEqual([])
    expect(classes).not.toContain("SDPoseKeypointExtractor")
    expect(classes).not.toContain("RTDETR_detect")
    expect(findWorkflow(guideWorkflowId)?.models).toEqual([
      "ltx-2.3-22b-distilled-fp8.safetensors",
      "ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors",
      "gemma_3_12B_it_fp4_mixed.safetensors",
    ])
  })

  it("loads only files Comfy Cloud's object_info lists, its checkpoint and its IC-LoRA among them", () => {
    const held = heldFilesOf()
    const files = findWorkflow(guideWorkflowId)?.models ?? []
    expect(files).toHaveLength(3)
    expect(isHeldOnCloud(files, held)).toBe(true)
    expect(held.has("ltx-2.3-22b-distilled-fp8.safetensors")).toBe(true)
    expect(
      held.has("ltx-2.3-22b-ic-lora-union-control-ref0.5.safetensors")
    ).toBe(true)
    expect(
      isHeldOnCloud([...files, "ltx-2.3-22b-ic-lora-pose-v0.safetensors"], held)
    ).toBe(false)
  })

  it("is the graph Motion binds when you pick the depth guide model, with the sound left out either way", () => {
    for (const sound of ["on", "off"]) {
      const binding = resolveBinding(motion.engine, {
        ...both,
        sound,
        model: guideModel,
      })
      expect(binding.config.models).toEqual(
        findWorkflow(guideWorkflowId)?.models
      )
      const graph = graphSchema.parse(binding.config.workflow)
      expect(graph["122"]?.inputs).not.toHaveProperty("audio")
    }
  })

  it("lists the guide under the Motion graph's task, so its price is read from the Motion graph's runs until a run of its own is measured", () => {
    const graphs = modelsForApp(motion, []).map((one) => [one.id, one.task])
    expect(graphs).toEqual([
      [ltx25GuideModel, "motion-transfer"],
      [graphModel, "motion-transfer"],
      [guideModel, "motion-transfer"],
      [swapModel, "character-swap"],
    ])
  })
})

describe("the depth guide request on the Comfy API v2", () => {
  it("uploads the photo and the guide and sends the guide graph with only the bound values set", async () => {
    const { submission, replay, workflow } = await submitted({
      ...both,
      model: guideModel,
      scene: "A stone hall with arched windows",
      resolution: "480p",
      sound: "on",
    })
    expect(submission.models).toEqual(findWorkflow(guideWorkflowId)?.models)
    expect(replay.unused()).toEqual([])
    const expected = recipeGraph()
    set(expected, "200", "image", {
      __type: "core/ASSET",
      info: { id: photoUpload },
    })
    set(expected, "199", "file", {
      __type: "core/ASSET",
      info: { id: guideUpload },
    })
    set(expected, "900", "string_b", "A stone hall with arched windows")
    set(expected, "702", "value", 448)
    set(expected, "704", "seed", 914)
    expect(workflow).toEqual(expected)
    expect(workflow["717"]?.inputs.image).toEqual(["706", 0])
    expect(workflow["719"]?.inputs.image1).toEqual(["706", 0])
    expect(workflow["115"]?.inputs.image).toEqual(["719", 0])
    expect(workflow["198"]?.inputs).toMatchObject({
      image: ["200", 0],
      strength: 1,
    })
  })
})

describe("the guide's shape", () => {
  const portrait = { width: 1080, height: 1920 }
  const wide = { width: 1920, height: 1408 }

  it("renders the size the graph's nodes 722 and 723 compute from the photo", () => {
    expect(renderSizeOf(portrait, "480p")).toEqual({ width: 448, height: 768 })
    expect(renderSizeOf(portrait, "720p")).toEqual({ width: 704, height: 1280 })
    expect(renderSizeOf(wide, "480p")).toEqual({ width: 640, height: 448 })
    expect(renderSizeOf(wide, "720p")).toEqual({ width: 960, height: 704 })
    expect(renderSizeOf(portrait, "1080p")).toBeNull()
  })

  it.each([
    {
      shape: "2:3",
      photo: { width: 1080, height: 1620 },
      at: "480p",
      render: [448, 640],
    },
    {
      shape: "2:3",
      photo: { width: 1080, height: 1620 },
      at: "720p",
      render: [704, 1024],
    },
    {
      shape: "3:2",
      photo: { width: 1620, height: 1080 },
      at: "480p",
      render: [640, 448],
    },
    {
      shape: "3:2",
      photo: { width: 1620, height: 1080 },
      at: "720p",
      render: [1024, 704],
    },
    {
      shape: "3:4",
      photo: { width: 1080, height: 1440 },
      at: "480p",
      render: [448, 576],
    },
    {
      shape: "3:4",
      photo: { width: 1080, height: 1440 },
      at: "720p",
      render: [704, 960],
    },
  ])(
    "rounds a $shape photo's side at $at to the even step, as the graph's round does",
    ({ photo, at, render }) => {
      const [width, height] = render
      expect(renderSizeOf(photo, at)).toEqual({ width, height })
    }
  )

  it.each([
    { piece: "flip, draft", guide: [448, 768], photo: portrait, at: "480p" },
    { piece: "flip, final", guide: [704, 1280], photo: portrait, at: "720p" },
    { piece: "ticket wipe", guide: [960, 704], photo: wide, at: "480p" },
    { piece: "ticket wipe", guide: [960, 704], photo: wide, at: "720p" },
    { piece: "grab and run", guide: [448, 768], photo: portrait, at: "480p" },
    { piece: "grab and run", guide: [448, 768], photo: portrait, at: "720p" },
  ])(
    "takes the $piece depth video at $at beside a photo of its shape",
    ({ guide, photo, at }) => {
      const [width = 0, height = 0] = guide
      const render = renderSizeOf(photo, at)
      expect(render).not.toBeNull()
      if (render !== null) {
        expect(isGuideFit({ width, height }, render)).toBe(true)
      }
    }
  )

  it("refuses a guide whose centre crop would cut more than a tenth of a side, the control", () => {
    const render = { width: 448, height: 768 }
    expect(guideCropLimit).toBe(0.1)
    expect(isGuideFit({ width: 1280, height: 704 }, render)).toBe(false)
    expect(isGuideFit({ width: 704, height: 704 }, render)).toBe(false)
    expect(isGuideFit({ width: 540, height: 720 }, render)).toBe(false)
    expect(guideCropOf({ width: 704, height: 704 }, render)).toBeCloseTo(
      1 - 448 / 768
    )
  })
})
