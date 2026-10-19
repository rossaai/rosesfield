import { describe, expect, it } from "vitest"
import {
  nearestRatioOf,
  type PhotoFacts,
  photoProblemOf,
  readingProblemOf,
} from "@/studio/try-on/try-on-limits"
import {
  messageOf,
  ratioFromPerson,
  type Well,
  wellToFocusOf,
} from "@/studio/try-on/use-try-on-screen"

function png(width: number, height: number): PhotoFacts {
  return { mime: "image/png", bytes: 2_000_000, width, height }
}

function read(facts: PhotoFacts): Well {
  return { empty: false, reading: { state: "read", facts } }
}

const reading: Well = { empty: false, reading: { state: "reading" } }
const empty: Well = { empty: true, reading: { state: "none" } }

const ratios = ["1:2", "9:16", "2:3", "3:4", "1:1", "4:3", "16:9", "2:1"]

describe("the Try-on photo limits", () => {
  it("refuses a Person photo of 480 by 640 with the short side words", () => {
    const problem = photoProblemOf("person", png(480, 640))
    expect(problem).toEqual({ kind: "tooSmall", side: 480, min: 512 })
    expect(problem === null ? "" : messageOf("person", problem)).toBe(
      "This photo is 480 pixels on its short side. Pick one of 512 pixels or more."
    )
  })

  it("refuses a Person photo of 3000 by 1000 with the ratio words", () => {
    const problem = photoProblemOf("person", png(3000, 1000))
    expect(problem).toEqual({ kind: "badRatio", max: 2 })
    expect(problem === null ? "" : messageOf("person", problem)).toBe(
      "This photo's long side is more than 2 times its short side. Pick a photo with a closer ratio."
    )
  })

  it("takes a wide Clothes photo and a Person photo of exactly 2 to 1", () => {
    expect(photoProblemOf("clothes", png(3000, 1000))).toBeNull()
    expect(photoProblemOf("person", png(1024, 512))).toBeNull()
    expect(photoProblemOf("person", png(768, 1024))).toBeNull()
  })

  it("refuses a file past 20 MB and a kind the wells do not take", () => {
    expect(
      photoProblemOf("clothes", { ...png(1024, 1024), bytes: 20_000_001 })
    ).toEqual({ kind: "tooLarge", bytes: 20_000_001, limit: 20_000_000 })
    expect(
      photoProblemOf("person", { ...png(1024, 1024), mime: "image/gif" })
    ).toEqual({ kind: "wrongKind" })
  })

  it("picks the listed ratio nearest the Person photo for the working tile", () => {
    expect(nearestRatioOf(ratios, { width: 768, height: 1024 })).toBe("3:4")
    expect(nearestRatioOf(ratios, { width: 1080, height: 1920 })).toBe("9:16")
    expect(nearestRatioOf(ratios, { width: 2000, height: 1000 })).toBe("2:1")
  })

  it("refuses a photo whose size stays unknown after the measure with the open words", () => {
    const unknown = { ...png(0, 0), width: null, height: null }
    const problem = photoProblemOf("person", unknown)
    expect(problem).toEqual({ kind: "unreadable" })
    expect(problem === null ? "" : messageOf("clothes", problem)).toBe(
      "This browser cannot open this photo, so its size is unknown. Pick another PNG, JPEG or WebP file."
    )
    expect(readingProblemOf("person", { state: "failed" })).toEqual({
      kind: "unreadable",
    })
    expect(readingProblemOf("person", { state: "reading" })).toBeNull()
  })
})

describe("the Try-on Generate press", () => {
  it("holds the run while a filled Person well is still measured", () => {
    expect(
      wellToFocusOf({ person: reading, clothes: read(png(1024, 1024)) })
    ).toBe("person")
    expect(
      wellToFocusOf({ person: read(png(768, 1024)), clothes: reading })
    ).toBe("clothes")
  })

  it("holds the run on an empty well and on a photo the limits refuse", () => {
    expect(wellToFocusOf({ person: empty, clothes: empty })).toBe("person")
    expect(wellToFocusOf({ person: read(png(480, 640)), clothes: empty })).toBe(
      "person"
    )
    expect(
      wellToFocusOf({
        person: read(png(3000, 1000)),
        clothes: read(png(1024, 1024)),
      })
    ).toBe("person")
    expect(
      wellToFocusOf({
        person: read(png(768, 1024)),
        clothes: { empty: false, reading: { state: "failed" } },
      })
    ).toBe("clothes")
  })

  it("lets the run start once both photos are measured and pass", () => {
    expect(
      wellToFocusOf({
        person: read(png(768, 1024)),
        clothes: read(png(3000, 1000)),
      })
    ).toBeNull()
  })
})

describe("the Try-on ratio from the Person photo", () => {
  it("sets no ratio until the Person photo is measured and passes", () => {
    expect(ratioFromPerson(ratios, { state: "reading" })).toBeNull()
    expect(ratioFromPerson(ratios, { state: "failed" })).toBeNull()
    expect(
      ratioFromPerson(ratios, { state: "read", facts: png(3000, 1000) })
    ).toBeNull()
    expect(
      ratioFromPerson(ratios, { state: "read", facts: png(480, 640) })
    ).toBeNull()
    expect(
      ratioFromPerson(ratios, { state: "read", facts: png(1080, 1920) })
    ).toBe("9:16")
  })
})
