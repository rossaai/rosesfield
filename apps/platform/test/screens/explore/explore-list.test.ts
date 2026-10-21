import { describe, expect, it } from "vitest"
import {
  type ExploreListEntry,
  heldEntries,
} from "@/screens/explore/explore-list"

function entryOf(
  change: Partial<ExploreListEntry["judgment"]> = {},
  shareId = "AbCdEfGhIjKlMnOpQrStUv"
): ExploreListEntry {
  return {
    runId: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    shareId,
    source: "own-open-weights",
    yes: "2026-10-20",
    people: "none",
    brand: false,
    judgment: {
      verdict: "held",
      criteria: "effect-tile",
      judge: "judge-1",
      inputsBy: "builder-1",
      ...change,
    },
  }
}

describe("Explore's list", () => {
  it("keeps an entry a judge held against its criteria", () => {
    const held = entryOf()

    expect(heldEntries([held])).toEqual([held])
  })

  it("leaves out an entry the judge refused", () => {
    expect(heldEntries([entryOf({ verdict: "refused" })])).toEqual([])
  })

  it("leaves out an entry whose judge wrote its inputs", () => {
    expect(
      heldEntries([entryOf({ judge: "builder-1", inputsBy: "builder-1" })])
    ).toEqual([])
  })

  it("leaves out an entry that names no criteria or no judge", () => {
    expect(
      heldEntries([entryOf({ criteria: " " }), entryOf({ judge: "" })])
    ).toEqual([])
  })

  it("leaves out an entry that names no published share", () => {
    expect(heldEntries([entryOf({}, "")])).toEqual([])
  })
})
