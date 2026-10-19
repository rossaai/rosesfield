import type { HostedModel, ModelField } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { isDeniedModel } from "#comfy/model-deny"
import { makerOf, nameOf } from "#comfy/model-names"
import { hostedTagsOf, topResolutionOf } from "#comfy/model-tags"
import { tasksOfModel } from "#comfy/model-tasks"
import { isProvenFamily } from "#comfy/proven-families"

function hosted(
  id: string,
  takes: string[],
  makes: string[],
  fields: ModelField[] | null = null
): HostedModel {
  return {
    id,
    provider: id.split("/")[0] ?? "",
    takes,
    makes,
    form: fields === null ? null : { model: id, fields },
  }
}

function image(
  name: string,
  path: string,
  required = false,
  max = 1
): ModelField {
  return { kind: "media", name, path, required, media: "image", min: 1, max }
}

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: null,
  default: null,
}

describe("the task of a model", () => {
  it("comes from the media it takes and makes", () => {
    expect(tasksOfModel(hosted("a/b", ["text"], ["image"]))).toEqual([
      "text-to-image",
    ])
    expect(
      tasksOfModel(
        hosted(
          "a/b",
          ["text", "image"],
          ["video", "audio"],
          [prompt, image("images", "image.url")]
        )
      )
    ).toEqual(["text-to-video", "image-to-video"])
    expect(tasksOfModel(hosted("a/b", ["text"], ["audio"]))).toEqual(["speech"])
    expect(tasksOfModel(hosted("a/b", ["text", "image"], ["text"]))).toEqual([
      "chat",
    ])
  })

  it("adds the tasks of the name map", () => {
    expect(
      tasksOfModel(hosted("a/video-upscale-v1", ["video"], ["video"]))
    ).toEqual(["video-edit", "upscale"])
    expect(
      tasksOfModel(hosted("a/eleven-sfx-v2", ["text"], ["audio"]))
    ).toEqual(["speech", "sound"])
  })

  it("lists an edit model that needs an image in Edit and not in text to image", () => {
    const fill = hosted(
      "a/fill",
      ["text", "image"],
      ["image"],
      [prompt, image("images", "image", true)]
    )
    const draw = hosted(
      "a/draw",
      ["text", "image"],
      ["image"],
      [prompt, image("images", "image", false)]
    )
    expect(tasksOfModel(fill)).toEqual(["image-edit"])
    expect(tasksOfModel(draw)).toEqual(["text-to-image", "image-edit"])
  })

  it("lists the reference and the first and last frame tasks of the models that take them", () => {
    const keyframes = hosted(
      "a/clip",
      ["text", "image"],
      ["video"],
      [
        prompt,
        image(
          "firstFrame",
          "content.[].{type=image_url}.{role=first_frame}.image_url.url"
        ),
        image(
          "lastFrame",
          "content.[].{type=image_url}.{role=last_frame}.image_url.url"
        ),
        image(
          "references",
          "content.[].{type=image_url}.{role=reference_image}.image_url.url",
          false,
          4
        ),
      ]
    )
    const startOnly = hosted(
      "a/start",
      ["text", "image"],
      ["video"],
      [prompt, image("images", "image.url", true)]
    )
    expect(tasksOfModel(keyframes)).toEqual([
      "text-to-video",
      "image-to-video",
      "reference-to-video",
      "first-last-frame",
    ])
    expect(tasksOfModel(startOnly)).toEqual(["image-to-video"])
  })
})

describe("the deny list", () => {
  it.each([
    ["wan/wan2.7-t2v", true],
    ["wan/happyhorse-1.1-t2v", true],
    ["higgsfield/higgsfield-wan-3", true],
    ["maker/wan_2", true],
    ["maker/swan-lake", false],
    ["maker/wander-1", false],
    ["bfl/flux-3-image", false],
  ])("reads %s as denied: %s", (id, expected) => {
    expect(isDeniedModel(id)).toBe(expected)
  })
})

describe("the name and maker of a model", () => {
  it("reads them from the id and the maker table", () => {
    expect(nameOf("bfl/flux-3-image")).toBe("FLUX 3 Image")
    expect(nameOf("byteplus/seedance-1-0-pro-250528")).toBe(
      "Seedance 1.0 Pro 250528"
    )
    expect(nameOf("openai/gpt-image-2.5-flare")).toBe("GPT Image 2.5 Flare")
    expect(makerOf("bfl")).toBe("Black Forest Labs")
    expect(makerOf("new_studio")).toBe("New Studio")
  })

  it("keeps a maker's own casing inside a model's name", () => {
    expect(nameOf("minimax/minimax-h3")).toBe("MiniMax H3")
    expect(nameOf("fal/bytedance-seedream")).toBe("Bytedance Seedream")
    expect(nameOf("maker/openai-mix")).toBe("OpenAI Mix")
  })
})

describe("the factual tags of a video model", () => {
  it("show its top resolution, its length range and its sound", () => {
    const tags = hostedTagsOf({
      id: "maker/clip",
      provider: "maker",
      takes: ["text"],
      makes: ["video"],
      form: {
        model: "maker/clip",
        fields: [
          {
            kind: "choice",
            name: "resolution",
            path: "resolution",
            required: false,
            options: ["1280x720", "1920x1080"],
            default: null,
          },
          {
            kind: "choice",
            name: "duration",
            path: "duration",
            required: true,
            options: [2, 4, 6, 8, 10],
            default: null,
          },
          {
            kind: "toggle",
            name: "generateAudio",
            path: "generate_audio",
            required: false,
            default: false,
          },
        ],
      },
    })
    expect(tags).toEqual([
      { kind: "hosted" },
      { kind: "resolution", value: "1080p" },
      { kind: "length", min: 2, max: 10 },
      { kind: "sound" },
    ])
  })

  it("reads 4K from a resolution choice", () => {
    expect(
      topResolutionOf([
        {
          kind: "choice",
          name: "resolution",
          path: "parameters.resolution",
          required: false,
          options: ["720p", "4k"],
          default: null,
        },
      ])
    ).toBe("4K")
  })
})

describe("a proven family", () => {
  it("marks every family Image ran live, and no other", () => {
    for (const provider of ["luma", "bfl", "openai", "krea", "xai", "kling"]) {
      expect(isProvenFamily(provider)).toBe(true)
    }
    expect(isProvenFamily("recraft")).toBe(false)
  })
})
