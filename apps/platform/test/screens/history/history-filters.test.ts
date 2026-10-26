import { describe, expect, it, vi } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { historyFilterGroups } from "@/screens/history/history-filters"
import { type DateChoice, isWithinDate } from "@/screens/library/filter-groups"

function groupsWith(appId: string | null) {
  const onApp = vi.fn<(appId: string | null) => void>()
  const onDate = vi.fn<(date: DateChoice) => void>()
  const groups = historyFilterGroups({
    appId,
    state: "all",
    kind: undefined,
    date: "any",
    onApp,
    onState: () => undefined,
    onKind: () => undefined,
    onDate,
  })
  return { groups, onApp, onDate }
}

describe("History's filter groups", () => {
  it("hold the apps grouped by kind, then the date, and no kind facet the tabs already hold", () => {
    const { groups } = groupsWith(null)
    const appGroups = groups.filter((group) => group.id.startsWith("app-"))
    expect(groups.map((group) => group.id)).not.toContain("kind")
    expect(groups.at(-1)?.id).toBe("date")
    expect(groups.at(-1)?.choices.map((choice) => choice.value)).toEqual([
      "any",
      "today",
      "week",
      "month",
    ])
    expect(appGroups.map((group) => group.id)).toEqual([
      "app-image",
      "app-video",
      "app-audio",
      "app-character",
    ])
    const listed = appGroups.flatMap((group) =>
      group.choices.slice(1).map((choice) => choice.value)
    )
    expect([...listed].sort()).toEqual(catalogApps.map((app) => app.id).sort())
    for (const group of appGroups) {
      expect(group.choices.length).toBeLessThan(catalogApps.length)
      expect(group.choices[0]?.value).toBe("")
      for (const choice of group.choices.slice(1)) {
        expect(
          catalogApps.find((app) => app.id === choice.value)?.category
        ).toBe(group.id.replace("app-", ""))
        expect(choice.picture, choice.value).toBeTruthy()
      }
    }
  })

  it("marks the chosen app in its kind's group, and its All apps choice clears it", () => {
    const { groups, onApp, onDate } = groupsWith("video")
    const video = groups.find((group) => group.id === "app-video")
    const image = groups.find((group) => group.id === "app-image")
    expect(video?.value).toBe("video")
    expect(image?.value).toBe("")
    video?.onChoose("")
    expect(onApp).toHaveBeenLastCalledWith(null)
    image?.onChoose("image")
    expect(onApp).toHaveBeenLastCalledWith("image")
    groups.at(-1)?.onChoose("week")
    groups.at(-1)?.onChoose("someday")
    expect(onDate.mock.calls).toEqual([["week"]])
  })

  it("keeps a run made within the chosen date", () => {
    const now = new Date("2026-10-22T12:00:00")
    expect(isWithinDate("2026-10-22T01:00:00", "today", now)).toBe(true)
    expect(isWithinDate("2026-10-21T23:00:00", "today", now)).toBe(false)
    expect(isWithinDate("2026-10-16T13:00:00", "week", now)).toBe(true)
    expect(isWithinDate("2026-10-14T12:00:00", "week", now)).toBe(false)
    expect(isWithinDate("2025-01-01T00:00:00", "any", now)).toBe(true)
  })
})
