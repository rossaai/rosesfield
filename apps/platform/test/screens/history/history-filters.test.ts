import { describe, expect, it, vi } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { historyFilterGroups } from "@/screens/history/history-filters"

function groupsWith(appId: string | null) {
  const onApp = vi.fn<(appId: string | null) => void>()
  const onKind = vi.fn()
  const groups = historyFilterGroups({
    appId,
    state: "all",
    kind: undefined,
    onApp,
    onState: () => undefined,
    onKind,
  })
  return { groups, onApp, onKind }
}

describe("History's filter groups", () => {
  it("hold the kinds, then the apps grouped by kind, so no group lists every app", () => {
    const { groups } = groupsWith(null)
    const [kinds, ...appGroups] = groups
    expect(kinds?.choices.map((choice) => choice.value)).toEqual([
      "all",
      "image",
      "video",
      "audio",
      "text",
    ])
    expect(appGroups.map((group) => group.id)).toEqual([
      "app-image",
      "app-video",
      "app-audio",
      "app-character",
    ])
    const listed = appGroups.flatMap((group) =>
      group.choices.map((choice) => choice.value)
    )
    expect([...listed].sort()).toEqual(catalogApps.map((app) => app.id).sort())
    for (const group of appGroups) {
      expect(group.choices.length).toBeLessThan(catalogApps.length)
      for (const choice of group.choices) {
        expect(
          catalogApps.find((app) => app.id === choice.value)?.category
        ).toBe(group.id.replace("app-", ""))
        expect(choice.picture, choice.value).toBeTruthy()
      }
    }
  })

  it("marks the chosen app in its kind's group, and choosing it again clears it", () => {
    const { groups, onApp, onKind } = groupsWith("video")
    const video = groups.find((group) => group.id === "app-video")
    const image = groups.find((group) => group.id === "app-image")
    expect(video?.value).toBe("video")
    expect(image?.value).toBe("")
    video?.onChoose("video")
    expect(onApp).toHaveBeenLastCalledWith(null)
    image?.onChoose("image")
    expect(onApp).toHaveBeenLastCalledWith("image")
    const kinds = groups[0]
    kinds?.onChoose("video")
    kinds?.onChoose("all")
    expect(onKind.mock.calls).toEqual([["video"], [undefined]])
  })
})
