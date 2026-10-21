import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import {
  lengthFor,
  limitsFor,
  type MediaFacts,
  nearestRatio,
  problemOf,
} from "@/studio/lipsync/lipsync-checks"

const bounds = { min: 2, max: 10 }
const audioLimits = limitsFor("audio", "audio", bounds)
const clipLimits = limitsFor("clip", "clip", bounds)
const photoLimits = limitsFor("photo", "photo", bounds)

const audio = (change: Partial<MediaFacts>): MediaFacts => ({
  mime: "audio/mpeg",
  bytes: 200_000,
  width: null,
  height: null,
  seconds: 5,
  ...change,
})

const clip = (change: Partial<MediaFacts>): MediaFacts => ({
  mime: "video/mp4",
  bytes: 8_000_000,
  width: 720,
  height: 1280,
  seconds: 5,
  ...change,
})

const photo = (change: Partial<MediaFacts>): MediaFacts => ({
  mime: "image/png",
  bytes: 3_000_000,
  width: 1024,
  height: 1024,
  seconds: null,
  ...change,
})

function words(problem: ReturnType<typeof problemOf>): string | null {
  return problem === null ? null : t(problem.key, problem.values)
}

describe("the lip sync checks", () => {
  it("passes audio that measures a little past 10 seconds or a little under 2", () => {
    expect(problemOf(audio({ seconds: 10.04 }), audioLimits)).toBeNull()
    expect(problemOf(audio({ seconds: 1.96 }), audioLimits)).toBeNull()
    expect(problemOf(clip({ seconds: 10.04 }), clipLimits)).toBeNull()
  })

  it("names a length past the bounds with the number it compared", () => {
    expect(words(problemOf(audio({ seconds: 10.2 }), audioLimits))).toBe(
      "This clip runs 10.2 seconds. Pick one of 10 seconds or less."
    )
    expect(words(problemOf(audio({ seconds: 1.9 }), audioLimits))).toBe(
      "This clip runs 1.9 seconds. Pick one of 2 seconds or more."
    )
  })

  it("refuses audio whose length the browser cannot read", () => {
    expect(words(problemOf(audio({ seconds: null }), audioLimits))).toBe(
      "This input takes an MP3 or WAV file this browser can open. Pick another file."
    )
  })

  it("refuses a clip or a photo whose size the browser cannot read", () => {
    expect(words(problemOf(clip({ width: null }), clipLimits))).toBe(
      "This input takes an MP4, MOV or WebM clip this browser can open. Pick another file."
    )
    expect(words(problemOf(clip({ seconds: null }), clipLimits))).toBe(
      "This input takes an MP4, MOV or WebM clip this browser can open. Pick another file."
    )
    expect(words(problemOf(photo({ height: null }), photoLimits))).toBe(
      "This input takes a PNG, JPEG or WebP photo this browser can open. Pick another file."
    )
    expect(problemOf(photo({}), photoLimits)).toBeNull()
  })

  it("names the format first when a file is both wrong and unreadable", () => {
    expect(
      words(problemOf(audio({ mime: "audio/ogg", seconds: null }), audioLimits))
    ).toBe("This input takes an MP3 or WAV file. Pick another file.")
  })
})

describe("the chosen model's length limit", () => {
  it("names the limit of the model you picked, and the same audio passes a model that takes longer", () => {
    const long = audio({ seconds: 12 })
    const short = limitsFor("audio", "soundFile", bounds)
    expect(words(problemOf(long, short))).toBe(
      "This clip runs 12 seconds. Pick one of 10 seconds or less."
    )
    expect(
      problemOf(long, limitsFor("audio", "soundFile", { min: 4, max: 15 }))
    ).toBeNull()
  })

  it("checks no length when the model declares none", () => {
    expect(
      problemOf(audio({ seconds: 40 }), limitsFor("audio", "soundFile", null))
    ).toBeNull()
  })

  it("never checks the length of a photo", () => {
    expect(limitsFor("photo", "photo", bounds).seconds).toBeNull()
  })
})

describe("the length a model is asked for", () => {
  it("follows the audio inside the model's bounds", () => {
    const field: ModelField = {
      kind: "number",
      name: "duration",
      path: "duration",
      required: false,
      min: 4,
      max: 15,
      integer: true,
      default: 5,
    }
    expect(lengthFor(5.02, field, 1)).toBe(5)
    expect(lengthFor(6.4, field, 1)).toBe(7)
    expect(lengthFor(2, field, 1)).toBe(4)
    expect(lengthFor(30, field, 1)).toBe(15)
  })

  it("picks the shortest choice that holds the audio", () => {
    const field: ModelField = {
      kind: "choice",
      name: "duration",
      path: "duration",
      required: false,
      options: ["5", "10"],
      default: "5",
    }
    expect(lengthFor(4.2, field, null)).toBe("5")
    expect(lengthFor(7, field, null)).toBe("10")
    expect(lengthFor(12, field, null)).toBe("10")
  })
})

describe("the shape a graph run takes", () => {
  it("is the offered ratio nearest the face", () => {
    expect(nearestRatio(720, 1280, ["1:1", "9:16"])).toBe("9:16")
    expect(nearestRatio(720, 1280, ["1:1", "4:3"])).toBe("1:1")
    expect(nearestRatio(720, 1280, [])).toBeNull()
  })
})
