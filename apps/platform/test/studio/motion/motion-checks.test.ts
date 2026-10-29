import { describe, expect, it } from "vitest"
import { ratioOfSize } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import {
  clipProblem,
  guideShapeProblem,
  isLengthProblem,
  type MediaFacts,
  photoProblem,
} from "@/studio/motion/motion-checks"
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

  it("passes a clip of 5 seconds and names a clip of 14 seconds in the app's words", () => {
    expect(clipProblem(clip({}))).toBeNull()
    expect(words(clipProblem(clip({ seconds: 14 })))).toBe(
      "This clip runs 14 seconds. Pick one of 10 seconds or less."
    )
    expect(words(clipProblem(clip({ seconds: 1.5 })))).toBe(
      "This clip runs 1.5 seconds. Pick one of 2 seconds or more."
    )
    expect(clipProblem(clip({ seconds: 10 }))).toBeNull()
  })

  it("judges a clip by the range of the chosen model, under the name of its well", () => {
    const range = { min: 3, max: 8 }
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
    expect(clipProblem(clip({ bytes: 120_000_000 }))?.key).toBe(
      "field.asset.tooLarge"
    )
    expect(clipProblem(clip({ mime: "video/x-matroska" }))).toEqual({
      name: "clip",
      key: "field.asset.wrongKind",
      values: { kinds: "MP4, MOV or WebM" },
    })
    expect(clipProblem(clip({ mime: "video/quicktime" }))).toBeNull()
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
    "judges a clip of $seconds seconds by its exact length, because the graph keeps only its first 10 seconds",
    ({ seconds, said }) => {
      expect(words(clipProblem(clip({ seconds })))).toBe(said)
    }
  )

  it("refuses a clip the browser cannot read, so no run starts on an unknown length", () => {
    const said =
      "This input takes an MP4, MOV or WebM video this browser can open. Pick another file."
    expect(words(clipProblem(clip({ seconds: null })))).toBe(said)
    expect(words(clipProblem(clip({ width: null, height: null })))).toBe(said)
    expect(
      words(clipProblem(clip({ seconds: null, width: null, height: null })))
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
      clipProblem(clip({ mime: "video/x-matroska", seconds: null }))?.values
    ).toEqual({ kinds: "MP4, MOV or WebM" })
    expect(
      photoProblem(photo({ bytes: 21_000_000, width: null, height: null }))?.key
    ).toBe("field.asset.tooLarge")
  })
})

describe("the guide's shape beside the photo", () => {
  const portrait = photo({ width: 1080, height: 1920 })
  const guide = (width: number, height: number): MediaFacts =>
    clip({ width, height, seconds: 8.54 })

  it.each([
    { name: "flip, draft", size: [448, 768], at: "480p" },
    { name: "flip, final", size: [704, 1280], at: "720p" },
    { name: "grab and run, draft", size: [448, 768], at: "480p" },
  ])("takes the $name depth video beside a 9:16 photo", ({ size, at }) => {
    const [width = 0, height = 0] = size
    expect(guideShapeProblem(guide(width, height), portrait, at)).toBeNull()
  })

  it("takes the ticket wipe depth video beside a 15:11 photo at both resolutions", () => {
    const wide = photo({ width: 1920, height: 1408 })
    for (const at of ["480p", "720p"]) {
      expect(guideShapeProblem(guide(960, 704), wide, at)).toBeNull()
    }
  })

  it("refuses a wide guide beside a tall photo, naming both sizes, the control", () => {
    const problem = guideShapeProblem(guide(1280, 704), portrait, "720p")
    expect(problem).toEqual({
      name: "clip",
      key: "field.asset.wrongShape",
      values: {
        width: "1280",
        height: "704",
        fitWidth: "704",
        fitHeight: "1280",
      },
    })
    expect(words(problem)).toBe(
      "This video is 1280 by 704, and your photo makes a video of 704 by 1280. Give both the same shape."
    )
  })

  it("waits for a size it can read", () => {
    const unread = clip({ width: null, height: null })
    expect(guideShapeProblem(unread, portrait, "720p")).toBeNull()
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
