import { describe, expect, it } from "vitest"
import { ratioOfSize } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import {
  clipProblem,
  isLengthProblem,
  type MediaFacts,
  photoProblem,
  trimmedOf,
} from "@/studio/motion/motion-checks"
import type { ClipRange } from "@/studio/motion/motion-tabs"
import { shapeOf } from "@/studio/motion/use-motion-checks"

const clip = (change: Partial<MediaFacts>): MediaFacts => ({
  mime: "video/mp4",
  bytes: 8_000_000,
  width: 720,
  height: 1280,
  seconds: 5,
  ...change,
})

const photo = (change: Partial<MediaFacts>): MediaFacts => ({
  mime: "image/jpeg",
  bytes: 3_000_000,
  width: 3024,
  height: 4032,
  seconds: null,
  ...change,
})

const graph: ClipRange = { min: 2, max: 10, trims: true }

const swapGraph: ClipRange = { min: 2, max: 5, trims: true }

const hosted: ClipRange = { min: 2, max: 10, trims: false }

function words(problem: ReturnType<typeof clipProblem>): string | null {
  return problem === null ? null : t(problem.key, problem.values)
}

describe("the motion checks", () => {
  it.each([
    { width: 1080, height: 1920, ratio: "9:16" },
    { width: 3024, height: 4032, ratio: "3:4" },
    { width: 720, height: 1080, ratio: "2:3" },
    { width: 768, height: 1152, ratio: "2:3" },
    { width: 1080, height: 1350, ratio: "4:5" },
    { width: 1920, height: 1080, ratio: "16:9" },
    { width: 1000, height: 1001, ratio: "1:1" },
  ])(
    "records $ratio, the real shape of a photo of $width by $height",
    ({ width, height, ratio }) => {
      expect(ratioOfSize(width, height)).toBe(ratio)
    }
  )

  it("records no shape for a photo with no size, the control", () => {
    expect(ratioOfSize(0, 1080)).toBeNull()
  })

  it("takes a clip of 38 seconds on a Motion graph, which keeps its first stretch, and still refuses one of 1.5 seconds", () => {
    expect(clipProblem(clip({}), graph)).toBeNull()
    expect(clipProblem(clip({ seconds: 38 }), graph)).toBeNull()
    expect(clipProblem(clip({ seconds: 38 }), swapGraph)).toBeNull()
    expect(words(clipProblem(clip({ seconds: 1.5 }), graph))).toBe(
      "This clip runs 1.5 seconds. Pick one of 2 seconds or more."
    )
    expect(clipProblem(clip({ seconds: 10 }), graph)).toBeNull()
  })

  it("refuses a clip of 38 seconds on a model that does not trim, the control", () => {
    expect(words(clipProblem(clip({ seconds: 38 }), hosted))).toBe(
      "This clip runs 38 seconds. Pick one of 10 seconds or less."
    )
  })

  it("names the stretch a Motion graph keeps of a longer clip, and none for a clip it takes whole or a model that refuses it", () => {
    expect(trimmedOf(38, graph)).toEqual({ max: 10, seconds: "38" })
    expect(trimmedOf(38, swapGraph)).toEqual({ max: 5, seconds: "38" })
    expect(trimmedOf(241 / 24, graph)).toEqual({ max: 10, seconds: "10.04" })
    expect(trimmedOf(10, graph)).toBeNull()
    expect(trimmedOf(4, swapGraph)).toBeNull()
    expect(trimmedOf(38, hosted)).toBeNull()
    expect(trimmedOf(null, graph)).toBeNull()
    expect(trimmedOf(38, null)).toBeNull()
  })

  it("judges a clip by the range of the chosen model, under the name of its well", () => {
    const range = { min: 3, max: 8, trims: false }
    expect(
      clipProblem(clip({ seconds: 5 }), range, "referenceVideo")
    ).toBeNull()
    const long = clipProblem(clip({ seconds: 9 }), range, "referenceVideo")
    expect(long).toEqual({
      name: "referenceVideo",
      key: "field.asset.tooLong",
      values: { seconds: "9", max: 8 },
    })
    expect(long === null ? false : isLengthProblem(long)).toBe(true)
    expect(
      words(clipProblem(clip({ seconds: 2.5 }), range, "referenceVideo"))
    ).toBe("This clip runs 2.5 seconds. Pick one of 3 seconds or more.")
  })

  it("passes a clip of any length for a model whose schema declares none, and still checks its file", () => {
    expect(clipProblem(clip({ seconds: 40 }), null)).toBeNull()
    const large = clipProblem(clip({ seconds: 40, bytes: 120_000_000 }), null)
    expect(large?.key).toBe("field.asset.tooLarge")
  })

  it("refuses a clip past 100 MB and a clip in a format the app does not take", () => {
    expect(clipProblem(clip({ bytes: 120_000_000 }), graph)?.key).toBe(
      "field.asset.tooLarge"
    )
    expect(clipProblem(clip({ mime: "video/x-matroska" }), graph)).toEqual({
      name: "clip",
      key: "field.asset.wrongKind",
      values: { kinds: "MP4, MOV or WebM" },
    })
    expect(clipProblem(clip({ mime: "video/quicktime" }), graph)).toBeNull()
  })

  it("refuses a photo past 20 MB or in GIF, and passes a JPEG of a phone", () => {
    expect(photoProblem(photo({}))).toBeNull()
    expect(photoProblem(photo({ bytes: 21_000_000 }))?.key).toBe(
      "field.asset.tooLarge"
    )
    expect(words(photoProblem(photo({ mime: "image/gif" })))).toBe(
      "This input takes PNG, JPEG or WebP. Pick another file."
    )
  })

  it.each([
    { seconds: 10, said: null },
    { seconds: 240 / 24, said: null },
    { seconds: 2, said: null },
    { seconds: 48 / 24, said: null },
    {
      seconds: 241 / 24,
      said: "This clip runs 10.04 seconds. Pick one of 10 seconds or less.",
    },
    {
      seconds: 10.04,
      said: "This clip runs 10.04 seconds. Pick one of 10 seconds or less.",
    },
    {
      seconds: 1.96,
      said: "This clip runs 1.96 seconds. Pick one of 2 seconds or more.",
    },
    {
      seconds: 10.06,
      said: "This clip runs 10.1 seconds. Pick one of 10 seconds or less.",
    },
    {
      seconds: 12.3,
      said: "This clip runs 12.3 seconds. Pick one of 10 seconds or less.",
    },
  ])(
    "judges a clip of $seconds seconds by its exact length on a model that keeps only 10 seconds and trims nothing",
    ({ seconds, said }) => {
      expect(words(clipProblem(clip({ seconds }), hosted))).toBe(said)
    }
  )

  it("refuses a clip the browser cannot read, so no run starts on an unknown length", () => {
    const said =
      "This input takes an MP4, MOV or WebM video this browser can open. Pick another file."
    expect(words(clipProblem(clip({ seconds: null }), graph))).toBe(said)
    expect(words(clipProblem(clip({ width: null, height: null }), graph))).toBe(
      said
    )
    expect(
      words(
        clipProblem(clip({ seconds: null, width: null, height: null }), graph)
      )
    ).toBe(said)
  })

  it("refuses a photo the browser cannot read, so the ratio never stays at its default", () => {
    expect(words(photoProblem(photo({ width: null, height: null })))).toBe(
      "This input takes a PNG, JPEG or WebP photo this browser can open. Pick another file."
    )
    expect(photoProblem(photo({ height: null }))?.name).toBe("photo")
  })

  it("names the format or size first when a file is both wrong and unreadable", () => {
    expect(
      clipProblem(clip({ mime: "video/x-matroska", seconds: null }), graph)
        ?.values
    ).toEqual({ kinds: "MP4, MOV or WebM" })
    expect(
      photoProblem(photo({ bytes: 21_000_000, width: null, height: null }))?.key
    ).toBe("field.asset.tooLarge")
  })
})

describe("the shape Motion records", () => {
  const read = {
    state: "read",
    facts: photo({ width: 1080, height: 1920 }),
  } as const

  it("is the example's own shape after a Remix, 2:3 for Grab and run", () => {
    expect(shapeOf(read, "2:3")).toBe("2:3")
    expect(shapeOf({ state: "none" }, "2:3")).toBe("2:3")
  })

  it("is the photo's real shape with your own video, and none before the photo is read, the control", () => {
    expect(shapeOf(read, null)).toBe("9:16")
    expect(shapeOf({ state: "reading" }, null)).toBeNull()
  })
})
