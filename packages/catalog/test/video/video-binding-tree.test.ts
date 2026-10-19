import { startRunBodyFor } from "@rosesfield/contract"
import { hostedModelOf, resolveBinding } from "@rosesfield/generation"
import type { HostedModel, ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { appTasksOf, defaultModelOf, modelsForApp } from "#comfy/list-models"
import { listWorkflows } from "#list-workflows"
import { app } from "#video/app"
import { ltxStartFrameBinding, ltxTextBinding } from "#video/comfy/video-engine"
import { videoCopy } from "#video/copy.en"
import {
  checked,
  prompt,
  startFrameId,
  videoDefinition,
} from "./video-recordings"

const definition = videoDefinition()
const body = startRunBodyFor(definition)

function imageField(name: string, path: string, max: number): ModelField {
  return {
    kind: "media",
    name,
    path,
    required: true,
    media: "image",
    min: 1,
    max,
  }
}

function onlyFrom(id: string, images: readonly ModelField[]): HostedModel {
  return {
    id,
    provider: "maker",
    takes: ["text", "image"],
    makes: ["video"],
    form: {
      model: id,
      fields: [
        {
          kind: "prompt",
          name: "prompt",
          path: "prompt",
          required: true,
          maxLength: null,
          default: null,
        },
        ...images,
      ],
    },
  }
}

function fieldAt(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (current, key) =>
      typeof current === "object" && current !== null && key in current
        ? Object.entries(current).find(([name]) => name === key)?.[1]
        : undefined,
    value
  )
}

describe("the Video app", () => {
  it("lists the models that make a video from text, an image, references or two frames and opens on MiniMax H3", () => {
    expect(appTasksOf(definition)).toEqual([
      "text-to-video",
      "image-to-video",
      "reference-to-video",
      "first-last-frame",
    ])
    expect(defaultModelOf(definition)).toBe("minimax/minimax-h3")
  })

  it("lists a model that runs only from references or only from two frames", () => {
    const listed = modelsForApp(definition, [
      onlyFrom("maker/clip-from-references", [
        imageField("referenceImages", "reference_images", 4),
      ]),
      onlyFrom("maker/clip-between-frames", [
        imageField("firstFrame", "first_frame_image", 1),
        imageField("lastFrame", "last_frame_image", 1),
      ]),
    ])
    expect(
      listed
        .map((model) => [model.id, model.task])
        .filter(([, task]) => task !== "text-to-video")
    ).toEqual([
      ["maker/clip-between-frames", "first-last-frame"],
      ["maker/clip-from-references", "reference-to-video"],
    ])
  })

  it("publishes as its default the model a run with no model runs", () => {
    const published = fieldAt(z.toJSONSchema(body, { io: "input" }), [
      "properties",
      "inputs",
      "properties",
      "model",
      "default",
    ])
    const approved = body.parse({ inputs: { prompt: "a" } }).inputs.model
    const ran = hostedModelOf(
      resolveBinding(definition.engine, { prompt: "a" })
    )
    expect(published).toBe("minimax/minimax-h3")
    expect(approved).toBe(published)
    expect(ran).toBe(published)
    expect(defaultModelOf(definition)).toBe(published)
  })

  it("keeps the LTX 2.5 graph and no Wan model or workflow", () => {
    const graphs = modelsForApp(definition, []).map((model) => model.id)
    expect(graphs).toEqual(["ltx-2-5"])
    const ids = listWorkflows().map((workflow) => workflow.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "video-ltx-2-5-text",
        "video-ltx-2-5-start-frame",
      ])
    )
    expect(ids.filter((id) => id.startsWith("video-wan"))).toEqual([])
    const values = JSON.stringify(definition.inputs)
    expect(values).not.toMatch(/wan/i)
  })

  it.each([
    {
      name: "LTX 2.5 from text",
      inputs: { model: "ltx-2-5" },
      expected: ltxTextBinding("480p", "on"),
    },
    {
      name: "LTX 2.5 from a start frame",
      inputs: { model: "ltx-2-5", startFrame: [startFrameId] },
      expected: ltxStartFrameBinding("480p", "on"),
    },
    {
      name: "LTX 2.5 at 720p with no sound",
      inputs: { model: "ltx-2-5", resolution: "720p", sound: "off" },
      expected: ltxTextBinding("720p", "off"),
    },
    {
      name: "LTX 2.5 from a start frame at 720p",
      inputs: {
        model: "ltx-2-5",
        startFrame: [startFrameId],
        resolution: "720p",
      },
      expected: ltxStartFrameBinding("720p", "on"),
    },
  ])("resolves $name to its workflow", ({ inputs, expected }) => {
    const result = checked({ prompt, ...inputs })
    expect(result.success).toBe(true)
    const binding = resolveBinding(app.engine, result.data?.inputs ?? {})
    expect(binding).toEqual(expected)
    expect(binding.config.outputsPerJob).toBe("one")
  })

  it.each([
    { name: "a Wan model", inputs: { model: "wan-2-2" }, path: "model" },
    { name: "Auto", inputs: { model: "auto" }, path: "model" },
    { name: "a clip", inputs: { clip: [startFrameId] }, path: "" },
    {
      name: "two start frames",
      inputs: { startFrame: [startFrameId, startFrameId] },
      path: "startFrame",
    },
    { name: "a length of 6", inputs: { length: 6 }, path: "length" },
    { name: "1080p", inputs: { resolution: "1080p" }, path: "resolution" },
    {
      name: "an unknown move",
      inputs: { cameraMove: "orbit" },
      path: "cameraMove",
    },
  ])("refuses $name before a binding is read", ({ inputs, path }) => {
    const result = checked({ prompt, ...inputs })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      path === "" ? "inputs" : `inputs.${path}`,
    ])
  })

  it("makes one video a run and refuses a count of 2", () => {
    expect(checked({ prompt }, 1).success).toBe(true)
    expect(checked({ prompt }, 2).success).toBe(false)
  })

  it("has a string for every key it names, and words for every camera move", () => {
    const keys = [
      definition.nameKey,
      "video.line",
      "video.keywords",
      "video.input.prompt.placeholder",
      ...definition.inputs.flatMap((input) => [
        input.labelKey,
        ...(input.type === "choice"
          ? input.options
              .map((option) => option.labelKey)
              .filter((key) => key !== "choice.auto")
          : []),
        ...(input.name === "cameraMove" && input.type === "choice"
          ? input.options
              .filter((option) => option.value !== "auto")
              .map((option) => `video.cameraMove.${option.value}.words`)
          : []),
      ]),
    ]
    for (const key of keys) {
      expect(videoCopy[key], key).toBeTypeOf("string")
    }
  })
})
