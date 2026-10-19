import { describe, expect, it } from "vitest"
import { hasInputs } from "@/shell/bottom-bar"
import { createRows, navGroups } from "@/shell/nav-rows"
import { tokenOfHash } from "@/shell/token-link"

const everyApp = (): boolean => true

function idsOf(hasApp: (appId: string) => boolean): string[] {
  const groups = navGroups(hasApp)
  return [
    groups.explore.id,
    ...groups.areas.map((row) => row.id),
    ...groups.chains.map((row) => row.id),
    ...groups.work.map((row) => row.id),
  ]
}

describe("the sidebar rows", () => {
  it("list Explore, the areas, the chains, then your work, in the card's order", () => {
    expect(idsOf(everyApp)).toEqual([
      "explore",
      "image",
      "video",
      "video-edit",
      "effects",
      "edit",
      "audio",
      "lipsync",
      "upscale",
      "three-d",
      "motion",
      "characters",
      "shot",
      "storyboard",
      "layers",
      "ads",
      "remake",
      "agent",
      "library",
      "history",
      "connect",
    ])
  })

  it("open Voice from the Audio row until an Audio app exists, and leave out an area with no app", () => {
    const has = (appId: string): boolean =>
      !["audio", "edit", "three-d", "remake"].includes(appId)
    const audio = navGroups(has).areas.find((row) => row.id === "audio")

    expect(audio?.target).toEqual({ kind: "app", appId: "voice" })
    expect(idsOf(has)).not.toContain("edit")
    expect(idsOf(has)).not.toContain("three-d")
    expect(idsOf(has)).not.toContain("remake")
  })

  it("offer the areas and the chains in the phone's Create sheet", () => {
    expect(createRows(navGroups(everyApp)).map((row) => row.id)).toEqual([
      "image",
      "video",
      "video-edit",
      "effects",
      "edit",
      "audio",
      "lipsync",
      "upscale",
      "three-d",
      "motion",
      "characters",
      "shot",
      "storyboard",
      "layers",
      "ads",
      "remake",
    ])
  })
})

describe("the phone's bottom bar", () => {
  it("shows on screens without inputs and leaves screens with inputs their Generate bar", () => {
    expect(hasInputs("/")).toBe(false)
    expect(hasInputs("/apps")).toBe(false)
    expect(hasInputs("/library")).toBe(false)
    expect(hasInputs("/history/2c3d4e5f")).toBe(false)
    expect(hasInputs("/characters")).toBe(false)
    expect(hasInputs("/apps/image")).toBe(true)
    expect(hasInputs("/agent")).toBe(true)
    expect(hasInputs("/agent/2c3d4e5f")).toBe(true)
    expect(hasInputs("/characters/new")).toBe(true)
  })
})

describe("the judge link", () => {
  it("reads the owner token from the link's fragment", () => {
    const token = "a".repeat(40)
    expect(tokenOfHash(`#token=${token}`)).toBe(token)
    expect(tokenOfHash("#token=short")).toBeNull()
    expect(tokenOfHash("")).toBeNull()
  })
})
