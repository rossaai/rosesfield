import { describe, expect, it } from "vitest"
import type { EngineFile } from "#domain/generation-engine.port"
import type { ModelField } from "#domain/model-form"
import { bodyOf } from "#infrastructure/router/router-body"
import { listedOptions } from "#infrastructure/router/router-choices"
import { fieldsOf } from "#infrastructure/router/router-fields"
import { factsOf } from "#infrastructure/router/router-schema"
import { pngBytes, referenceId } from "../sample"
import { routerSchema } from "./fixtures/comfy-router"

const model = "maker/picture-2"

function fieldsFor(
  properties: Record<string, unknown>,
  extra: { required?: string[]; components?: Record<string, unknown> } = {}
): ModelField[] {
  const document = {
    ...routerSchema({
      model,
      takes: ["text", "image"],
      makes: ["video"],
      properties,
      required: extra.required ?? [],
    }),
    components: { schemas: extra.components ?? {} },
  }
  const facts = factsOf(document)
  if (facts === null) {
    throw new Error("no facts")
  }
  return fieldsOf(facts)
}

function named(fields: readonly ModelField[], name: string): ModelField {
  const field = fields.find((one) => one.name === name)
  if (field === undefined) {
    throw new Error(`no field ${name}`)
  }
  return field
}

describe("the choices a schema lists in words", () => {
  it("reads FLUX 3 Image's aspect and resolution as choices", () => {
    const fields = fieldsFor({
      aspect_ratio: {
        type: "string",
        default: "auto",
        description:
          "Output aspect ratio: auto, 21:9, 16:9, 1:1, 9:16, or 9:21. auto follows the first reference image when one is present.",
      },
      resolution: {
        type: "string",
        default: "1k",
        description: "Output resolution class: 768sq, 1k, 1.5k, 2k, or 4k.",
      },
    })
    expect(named(fields, "aspectRatio")).toMatchObject({
      kind: "choice",
      options: ["auto", "21:9", "16:9", "1:1", "9:16", "9:21"],
      default: "auto",
    })
    expect(named(fields, "resolution")).toMatchObject({
      kind: "choice",
      options: ["768sq", "1k", "1.5k", "2k", "4k"],
      default: "1k",
    })
  })

  it("reads the lists that follow Options, one of and Supported values", () => {
    expect(
      listedOptions(
        "Aspect ratio. Options: adaptive (default), 21:9, 16:9, 1:1. Required for text-to-video."
      )
    ).toEqual(["adaptive", "21:9", "16:9", "1:1"])
    expect(
      listedOptions(
        'The light direction, one of "front", "side", or "top-down".'
      )
    ).toEqual(["front", "side", "top-down"])
    expect(
      listedOptions(
        "Output resolution. Supported values are 1K and 2K. Defaults to 1K."
      )
    ).toEqual(["1K", "2K"])
  })

  it("keeps a field as text when its words hold no list, several lists, or not its default", () => {
    expect(
      listedOptions("Aspect ratio between 21:9 and 9:21, e.g. 16:9.")
    ).toBeNull()
    expect(
      listedOptions(
        '"model-a": Optional values: 1K, 2K, 4K. "model-b": Optional values: 2K, 4K.'
      )
    ).toBeNull()
    const fields = fieldsFor({
      size: {
        type: "string",
        default: "2048x2048",
        description: "Image size: 1K, 2K or 4K.",
      },
    })
    expect(named(fields, "size").kind).toBe("text")
  })

  it("reads a list the words state as the values, and keeps an example list as free text", () => {
    const fields = fieldsFor({
      style: {
        type: "string",
        description:
          "The look of the picture, for example: anime, photo or sketch.",
      },
      mode: {
        type: "string",
        description: "Render mode: anime, photo or sketch.",
      },
    })
    expect(named(fields, "style").kind).toBe("text")
    expect(named(fields, "mode")).toMatchObject({
      kind: "choice",
      options: ["anime", "photo", "sketch"],
    })
    expect(
      listedOptions("A short tag such as: city, forest, or sea.")
    ).toBeNull()
  })

  it("offers the sizes GPT Image 2's free text size names, with its own example, and nothing more", () => {
    const fields = fieldsFor({
      size: {
        type: "string",
        example: "1024x1536",
        description: "Size of the image (e.g., 1024x1024, 1536x1024, auto)",
      },
    })
    expect(named(fields, "size")).toMatchObject({
      kind: "choice",
      options: ["1024x1024", "1536x1024", "auto", "1024x1536"],
      default: null,
    })
  })

  it("reads Seedance 2.5's duration bounds from the range beside its auto value", () => {
    const fields = fieldsFor({
      duration: {
        type: "integer",
        anyOf: [{ enum: [-1] }, { minimum: 2, maximum: 30 }],
        description: "Video duration in seconds. Seedance 2.5: [4,30] or -1.",
      },
    })
    expect(named(fields, "duration")).toMatchObject({
      kind: "number",
      min: 2,
      max: 30,
      integer: true,
    })
  })

  it("shows a value the schema lists twice in different case once", () => {
    const fields = fieldsFor({
      resolution: { type: "string", enum: ["2K", "2k", "768P", "768p"] },
    })
    expect(named(fields, "resolution")).toMatchObject({
      kind: "choice",
      options: ["2K", "768P"],
    })
  })
})

describe("the defaults of a form", () => {
  it("gives no default to a field inside an optional object, and keeps one inside a required object", () => {
    const fields = fieldsFor(
      {
        optimize_prompt_options: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["standard", "fast"],
              default: "standard",
            },
          },
        },
        options: {
          type: "object",
          required: ["quality"],
          properties: {
            quality: { type: "string", enum: ["low", "high"], default: "low" },
          },
        },
      },
      { required: ["options"] }
    )
    expect(
      fields.find((field) => field.path === "optimize_prompt_options.mode")
    ).toMatchObject({ kind: "choice", default: null })
    expect(
      fields.find((field) => field.path === "options.quality")
    ).toMatchObject({ kind: "choice", default: "low" })
  })

  it("gives no default to a field inside an optional list item, and keeps a top-level one", () => {
    const fields = fieldsFor(
      {
        creativity: {
          type: "string",
          enum: ["low", "medium"],
          default: "medium",
        },
        moodboards: {
          type: "array",
          items: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "string" },
              strength: {
                type: "number",
                minimum: -0.5,
                maximum: 1.5,
                default: 0.35,
              },
            },
          },
        },
      },
      { required: [] }
    )
    expect(
      fields.find((field) => field.path === "moodboards.0.strength")
    ).toMatchObject({ kind: "number", default: null })
    expect(named(fields, "creativity")).toMatchObject({ default: "medium" })
  })
})

describe("the images of a content list", () => {
  const properties = {
    content: {
      type: "array",
      items: { $ref: "#/components/schemas/Item" },
    },
  }
  const components = {
    Item: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Content item type. Options: text, image_url.",
        },
        role: {
          type: "string",
          description:
            "Role of a media item. Options: first_frame, last_frame, reference_image.",
        },
        text: { type: "string" },
        image_url: {
          type: "object",
          properties: { url: { type: "string", description: "A data URI." } },
        },
      },
    },
  }

  it("gives each image role its own field and writes the role into the body", () => {
    const fields = fieldsFor(properties, {
      required: ["content"],
      components,
    })
    expect(
      fields
        .filter((field) => field.kind === "media")
        .map((field) => [field.name, field.path])
    ).toEqual([
      [
        "firstFrame",
        "content.[].{type=image_url}.{role=first_frame}.image_url.url",
      ],
      [
        "lastFrame",
        "content.[].{type=image_url}.{role=last_frame}.image_url.url",
      ],
      [
        "references",
        "content.[].{type=image_url}.{role=reference_image}.image_url.url",
      ],
    ])
    const file: EngineFile = {
      assetId: referenceId,
      kind: "image",
      mime: "image/png",
      bytes: pngBytes(),
    }
    const body = bodyOf(
      { model, fields },
      { prompt: "a door", lastFrame: [referenceId] },
      [file]
    )
    expect(body.content).toEqual([
      { type: "text", text: "a door" },
      {
        type: "image_url",
        role: "last_frame",
        image_url: {
          url: expect.stringMatching(/^data:image\/png;base64,/),
        },
      },
    ])
  })
})
