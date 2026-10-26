import { describe, expect, it } from "vitest"
import { fieldOfRole, fieldRoleOf } from "#domain/field-role"
import type { ModelField } from "#domain/model-form"

function choice(path: string): ModelField {
  return {
    kind: "choice",
    name: path,
    path,
    required: false,
    options: ["a", "b"],
    default: null,
  }
}

function count(path: string): ModelField {
  return {
    kind: "number",
    name: path,
    path,
    required: false,
    min: 1,
    max: 4,
    integer: true,
    default: 1,
  }
}

function image(path: string): ModelField {
  return {
    kind: "media",
    name: "images",
    path,
    required: false,
    media: "image",
    min: 1,
    max: 4,
  }
}

describe("fieldRoleOf", () => {
  it.each([
    ["aspect_ratio", "aspect"],
    ["input.aspect_ratio", "aspect"],
    ["ratio", "aspect"],
    ["resolution", "resolution"],
    ["size", "resolution"],
    ["generationConfig.imageConfig.imageSize", "resolution"],
    ["quality", "quality"],
    ["duration", "length"],
    ["creativity", null],
  ])("names the choice at %s as %s", (path, role) => {
    expect(fieldRoleOf(choice(path), "image")).toBe(role)
  })

  it.each([
    ["n", "count"],
    ["num_images", "count"],
    ["numberResults", "count"],
    ["seed", "seed"],
    ["safety_tolerance", null],
  ])("names the number at %s as %s", (path, role) => {
    expect(fieldRoleOf(count(path), "image")).toBe(role)
  })

  it.each([
    [
      "content.[].{type=image_url}.{role=first_frame}.image_url.url",
      "first-frame",
    ],
    [
      "content.[].{type=image_url}.{role=last_frame}.image_url.url",
      "last-frame",
    ],
    [
      "content.[].{type=image_url}.{role=reference_image}.image_url.url",
      "reference",
    ],
    ["instances.0.lastFrame.bytesBase64Encoded", "last-frame"],
    ["input.last_frame_image", "last-frame"],
    ["reference_images.0.url", "reference"],
    ["style_ref.0.url", "reference"],
    ["image.url", "first-frame"],
  ])("names the image of a video model at %s as %s", (path, role) => {
    expect(fieldRoleOf(image(path), "video")).toBe(role)
  })

  it("names the plain image of an image model a reference, and a mask nothing", () => {
    expect(fieldRoleOf(image("images"), "image")).toBe("reference")
    expect(fieldRoleOf(image("mask"), "image")).toBeNull()
  })

  it.each([
    ["duration", "length"],
    ["input.duration", "length"],
    ["video.duration", "length"],
    ["parameters.durationSeconds", "length"],
    ["settings.duration", "length"],
    ["videoMetadata.endOffset.seconds", null],
    ["videoMetadata.startOffset.seconds", null],
    ["keyframes.0.seconds", null],
    ["multi_prompt.0.duration", null],
  ])(
    "names the number at %s as %s, a length only when it sets how long the result runs",
    (path, role) => {
      expect(fieldRoleOf(count(path), "video")).toBe(role)
    }
  )

  it.each([
    ["sequential_image_generation_options.max_images", "count"],
    ["series_amount", "count"],
  ])("names the multi-image count at %s as %s", (path, role) => {
    expect(fieldRoleOf(count(path), "image")).toBe(role)
  })

  it("names an on or off sound choice a sound, and a sound choice of other words nothing", () => {
    const sound = (options: string[]): ModelField => ({
      kind: "choice",
      name: "sound",
      path: "sound",
      required: false,
      options,
      default: "off",
    })
    expect(fieldRoleOf(sound(["on", "off"]), "video")).toBe("sound")
    expect(fieldRoleOf(sound(["off", "on"]), "video")).toBe("sound")
    expect(fieldRoleOf(sound(["calm", "loud"]), "video")).toBeNull()
  })

  it("finds the first field of a role", () => {
    const fields = [choice("creativity"), choice("aspect_ratio"), count("n")]
    expect(fieldOfRole(fields, "aspect", "image")?.path).toBe("aspect_ratio")
    expect(fieldOfRole(fields, "count", "image")?.path).toBe("n")
    expect(fieldOfRole(fields, "quality", "image")).toBeNull()
  })
})
