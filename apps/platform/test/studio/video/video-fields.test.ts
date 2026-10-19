import { describe, expect, it } from "vitest"
import { chipDefaultsOf, videoFieldsOf } from "@/studio/video/video-fields"
import {
  h3MaxTurbo,
  ltxFast,
  minimaxH3,
  pVideo,
  seedanceFast,
  veoLite,
} from "./video-forms"

function names(form: Parameters<typeof videoFieldsOf>[0]) {
  const fields = videoFieldsOf(form)
  return {
    start: fields.start?.name ?? null,
    last: fields.last?.name ?? null,
    references: fields.references?.name ?? null,
    length: fields.length?.name ?? null,
    aspect: fields.aspect?.name ?? null,
    resolution: fields.resolution?.name ?? null,
    sound: fields.sound?.name ?? null,
  }
}

describe("the roles Video reads from a model's schema", () => {
  it.each([
    {
      model: "MiniMax H3",
      form: minimaxH3,
      expected: {
        start: "firstFrame",
        last: "lastFrame",
        references: "references",
        length: "duration",
        aspect: "ratio",
        resolution: "resolution",
        sound: null,
      },
    },
    {
      model: "Veo 3.1 Lite",
      form: veoLite,
      expected: {
        start: "images",
        last: "instancesLastFrameBytesBase64Encoded",
        references: "imageBytesBase64Encoded",
        length: null,
        aspect: "aspectRatio",
        resolution: "resolution",
        sound: "generateAudio",
      },
    },
    {
      model: "P Video 2",
      form: pVideo,
      expected: {
        start: "images",
        last: "inputLastFrameImage",
        references: null,
        length: "duration",
        aspect: "aspectRatio",
        resolution: "resolution",
        sound: "saveAudio",
      },
    },
    {
      model: "H3 Max Turbo",
      form: h3MaxTurbo,
      expected: {
        start: null,
        last: null,
        references: null,
        length: null,
        aspect: "aspectRatio",
        resolution: "resolution",
        sound: null,
      },
    },
    {
      model: "LTX 2.5 Fast",
      form: ltxFast,
      expected: {
        start: null,
        last: null,
        references: null,
        length: "duration",
        aspect: null,
        resolution: "resolution",
        sound: "generateAudio",
      },
    },
  ])("finds the inputs of $model", ({ form, expected }) => {
    expect(names(form)).toEqual(expected)
  })

  it("reads each field's role from the catalog's one rule, so a size list is the resolution and a list of frames is the first frame", () => {
    const fields = videoFieldsOf([
      {
        kind: "choice",
        name: "size",
        path: "size",
        required: false,
        options: ["1280x720", "720x1280"],
        default: null,
      },
      {
        kind: "media",
        name: "keyframes",
        path: "keyframes",
        required: false,
        media: "image",
        min: 1,
        max: 10,
      },
    ])
    expect(fields.resolution?.name).toBe("size")
    expect(fields.start?.name).toBe("keyframes")
    expect(fields.references).toBeNull()
  })

  it("keeps every placed field out of the settings, and the required ones apart", () => {
    const fields = videoFieldsOf(h3MaxTurbo)
    expect(fields.required.map((one) => one.name)).toEqual([
      "promptExpansionMode",
    ])
    expect(fields.rest.map((one) => one.name)).toEqual([
      "duration",
      "seed",
      "enableSafetyChecker",
      "syncMode",
    ])
    const seedance = videoFieldsOf(seedanceFast)
    const shown = [...seedance.required, ...seedance.rest].map(
      (one) => one.name
    )
    expect(shown).not.toContain("firstFrame")
    expect(shown).not.toContain("lastFrame")
    expect(shown).not.toContain("references")
    expect(shown).not.toContain("video")
    expect(shown).not.toContain("ratio")
  })
})

describe("the values Video sets on the chips it shows", () => {
  it("picks 5 seconds, the lowest resolution and 16:9 when the form holds none", () => {
    expect(chipDefaultsOf(videoFieldsOf(minimaxH3), {})).toEqual({
      duration: 5,
      resolution: "768P",
      ratio: "16:9",
    })
    expect(chipDefaultsOf(videoFieldsOf(veoLite), {})).toEqual({
      aspectRatio: "16:9",
      resolution: "720p",
      generateAudio: "on",
    })
    expect(chipDefaultsOf(videoFieldsOf(ltxFast), {})).toMatchObject({
      duration: 5,
      resolution: "1280x720",
    })
  })

  it("replaces a value the model does not take and keeps one it does", () => {
    const fields = videoFieldsOf(minimaxH3)
    expect(
      chipDefaultsOf(fields, { duration: 4, resolution: "480p", ratio: "16:9" })
    ).toEqual({ resolution: "768P" })
    expect(
      chipDefaultsOf(fields, { duration: 20, resolution: "2K", ratio: "1:1" })
    ).toEqual({ duration: 5 })
  })
})
