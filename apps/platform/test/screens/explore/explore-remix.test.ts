import { describe, expect, it } from "vitest"
import { showcaseEntries } from "@/screens/explore/explore-entries"
import { isRemix, recreateTargetOf } from "@/screens/explore/explore-tile"
import { isFeedExample, showcaseItems } from "@/showcase/showcase"

const entries = showcaseEntries(showcaseItems)

describe("Explore's examples from Motion's Library", () => {
  it("shows the approved example as a Motion result in color that Remix opens in Motion with the example", () => {
    const grab = entries.find(
      (entry) => entry.run.inputs.example === "grab-and-run"
    )
    expect(grab?.run.appId).toBe("motion")
    expect(grab?.kind).toBe("video")
    expect(grab?.source).toMatchObject({ kind: "showcase" })
    expect(grab === undefined ? false : isRemix(grab.run)).toBe(true)
    expect(grab === undefined ? null : recreateTargetOf(grab)).toEqual({
      search: { example: "grab-and-run" },
    })
  })

  it("shows no example the operator has not approved", () => {
    const shown = entries.flatMap((entry) => {
      const example = entry.run.inputs.example
      return typeof example === "string" && entry.run.appId === "motion"
        ? [example]
        : []
    })
    expect(shown).toEqual(["grab-and-run"])
  })

  it("keeps Recreate with its draft on every other result, the control", () => {
    const image = entries.find((entry) => entry.run.appId === "image")
    expect(image === undefined ? true : isRemix(image.run)).toBe(false)
    expect(image === undefined ? {} : recreateTargetOf(image)).toHaveProperty(
      "draft"
    )
  })
})

describe("Explore's examples from AI Influencer's Library", () => {
  it("shows the four character sheets as AI Influencer results that Remix opens in AI Influencer with their template", () => {
    const sheets = entries.filter(
      (entry) => entry.run.appId === "ai-influencer"
    )
    expect(sheets.map((entry) => recreateTargetOf(entry))).toEqual([
      { search: { example: "capybara" } },
      { search: { example: "absurd-man" } },
      { search: { example: "frog" } },
      { search: { example: "mantis" } },
    ])
    for (const sheet of sheets) {
      expect(sheet.kind).toBe("image")
      expect(sheet.source).toMatchObject({ kind: "showcase" })
      expect(isRemix(sheet.run)).toBe(true)
      expect(isFeedExample(sheet.run.id)).toBe(true)
    }
  })
})
