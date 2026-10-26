import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import {
  fieldPlaceOf,
  inputPlaceOf,
  sentValueOf,
} from "@/screens/app/setting-table"

function choice(
  path: string,
  options: string[],
  extra: Partial<Extract<ModelField, { kind: "choice" }>> = {}
): ModelField {
  return {
    kind: "choice",
    name: path,
    path,
    required: false,
    options,
    default: null,
    ...extra,
  }
}

function number(path: string): ModelField {
  return {
    kind: "number",
    name: path,
    path,
    required: false,
    min: 0,
    max: 10,
    integer: true,
    default: 1,
  }
}

function toggle(path: string, given: boolean | null): ModelField {
  return { kind: "toggle", name: path, path, required: false, default: given }
}

function text(path: string): ModelField {
  return {
    kind: "text",
    name: path,
    path,
    required: false,
    maxLength: null,
    default: null,
  }
}

function sentOf(field: ModelField): string | number | undefined {
  const place = fieldPlaceOf(field)
  if (place.kind !== "hidden") {
    throw new Error(`${field.path} is ${place.kind}`)
  }
  return sentValueOf(field, place.sent)
}

describe("the normalized settings table", () => {
  it.each([
    [choice("aspect_ratio", ["1:1", "16:9"]), "format"],
    [choice("ratio", ["16:9", "adaptive"]), "format"],
    [choice("resolution", ["480p", "720p"]), "resolution"],
    [choice("size", ["1024x1024", "1536x1024"]), "resolution"],
    [choice("quality", ["low", "high"]), "quality"],
    [choice("rendering_speed", ["DEFAULT", "TURBO", "QUALITY"]), "quality"],
    [choice("mode", ["std", "pro"]), "quality"],
    [number("duration"), "length"],
    [number("n"), "count"],
    [number("sequential_image_generation_options.max_images"), "count"],
    [text("voice_id"), "voice"],
    [text("language_code"), "language"],
    [number("scale_factor"), "scale"],
    [choice("art_style", ["realistic", "sculpture"]), "content"],
  ])("shows %o as the %s setting", (field, setting) => {
    expect(fieldPlaceOf(field)).toEqual({ kind: "show", setting })
  })

  it.each([
    number("seed"),
    text("negative_prompt"),
    toggle("loop", false),
    number("voice_settings.speed"),
    choice("topology", ["quad", "triangle"]),
    number("target_polycount"),
    choice("pose_mode", ["a-pose", "t-pose"]),
  ])("puts %o under Advanced", (field) => {
    expect(fieldPlaceOf(field).kind).toBe("advanced")
  })

  it.each([
    choice("fps", ["24", "25"]),
    number("guidance_scale"),
    number("steps"),
    number("safety_tolerance"),
    toggle("prompt_upsampling", true),
    number("controls.artistic_level"),
    choice("style", ["auto", "manga"]),
    choice("output_format", ["jpeg", "png"]),
    text("parameters.pubsubTopic"),
    number("generationConfig.topK"),
    choice("optimize_prompt_options.mode", ["standard", "fast"]),
    choice("mode", ["text2video", "audio2video"]),
    toggle("draft", false),
  ])(
    "hides %o at the model's own default and never under Advanced",
    (field) => {
      expect(fieldPlaceOf(field)).toEqual({
        kind: "hidden",
        sent: { kind: "model" },
      })
    }
  )

  it("sends sound on, the clip's own sound kept, and no watermark, whatever the model's default", () => {
    expect(sentOf(toggle("generate_audio", false))).toBe("on")
    expect(sentOf(toggle("input.save_audio", null))).toBe("on")
    expect(sentOf(choice("sound", ["on", "off"], { default: "off" }))).toBe(
      "on"
    )
    expect(sentOf(toggle("preserve_audio", null))).toBe("on")
    expect(
      sentOf(choice("video_list.0.keep_original_sound", ["yes", "no"]))
    ).toBe("yes")
    expect(sentOf(toggle("watermark", true))).toBe("off")
    expect(sentOf(toggle("watermark_info.enabled", null))).toBe("off")
    expect(sentOf(toggle("aigc_watermark", null))).toBe("off")
  })

  it("sends the standard service tier and the model's own default for a field it hides", () => {
    expect(sentOf(choice("service_tier", ["default", "flex"]))).toBe("default")
    expect(
      sentOf(choice("alpha_mode", ["auto", "fill"], { required: true }))
    ).toBe("auto")
    expect(sentOf(choice("fps", ["24", "25"], { default: "25" }))).toBe("25")
    expect(sentOf(toggle("prompt_upsampling", true))).toBe("on")
  })

  it("keeps a field shown that the model needs and that has nothing to send, so Generate never waits on a hidden field", () => {
    expect(
      fieldPlaceOf(choice("season", ["spring", "winter"], { required: true }))
    ).toEqual({ kind: "show", setting: "content" })
    expect(
      fieldPlaceOf(choice("mode", ["t2v", "i2v", "v2v"], { required: true }))
    ).toEqual({ kind: "show", setting: "content" })
    expect(
      fieldPlaceOf(choice("mode", ["t2v", "i2v"], { default: "t2v" })).kind
    ).toBe("hidden")
  })

  it("hides an app's own sound switches, keeps its seed under Advanced and shows its other settings", () => {
    expect(inputPlaceOf("sound", "toggle")).toBe("hidden")
    expect(inputPlaceOf("keepSound", "toggle")).toBe("hidden")
    expect(inputPlaceOf("seed", "seed")).toBe("advanced")
    expect(inputPlaceOf("movement", "choice")).toBe("show")
    expect(inputPlaceOf("resolution", "choice")).toBe("show")
  })
})
