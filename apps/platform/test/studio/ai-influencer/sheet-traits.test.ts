import { traitSections } from "@rosesfield/catalog/ai-influencer"
import { describe, expect, it } from "vitest"
import {
  pickedOf,
  shuffledTraits,
  togglePick,
  traitGroups,
} from "@/studio/ai-influencer/sheet-traits"

const features = traitSections.find((section) => section.name === "features")

describe("a section that takes several picks", () => {
  it("puts a new pick in the first free slot and takes a picked one out", () => {
    if (features === undefined) {
      throw new Error("AI Influencer lists no features")
    }
    const one = togglePick(features, {}, "freckles")
    expect(one).toEqual({
      features1: "freckles",
      features2: "any",
      features3: "any",
    })
    const two = togglePick(features, one, "unibrow")
    expect(pickedOf(features, two)).toEqual(["freckles", "unibrow"])
    expect(togglePick(features, two, "freckles")).toEqual({
      features1: "unibrow",
      features2: "any",
      features3: "any",
    })
  })

  it("keeps a full section as it was", () => {
    if (features === undefined) {
      throw new Error("AI Influencer lists no features")
    }
    const full = {
      features1: "freckles",
      features2: "unibrow",
      features3: "dimples",
    }
    expect(togglePick(features, full, "pout")).toEqual({})
  })
})

describe("Shuffle", () => {
  it("picks a value in every single section and no repeated pick in a section of several", () => {
    const picks = shuffledTraits(() => 0.99)
    for (const section of traitSections.filter((one) => one.slots === 1)) {
      expect(picks[section.name]).not.toBe("any")
    }
    expect(new Set(pickedOf(features ?? traitSections[0]!, picks)).size).toBe(3)
  })

  it("places every section in one group", () => {
    const placed = traitGroups.flatMap((group) =>
      group.sections.map((section) => section.name)
    )
    expect([...placed].sort()).toEqual(
      traitSections.map((section) => section.name).sort()
    )
  })
})
