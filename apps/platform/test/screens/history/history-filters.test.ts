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
  it("count every app and every kind, each with All first", () => {
    const { groups } = groupsWith(null)
    const [apps, kinds] = groups
    expect(apps?.choices).toHaveLength(catalogApps.length + 1)
    expect(apps?.choices[0]?.value).toBe("all")
    for (const choice of [
      ...(apps?.choices ?? []),
      ...(kinds?.choices ?? []),
    ]) {
      expect(choice.picture, choice.value).toBeTruthy()
    }
    expect(kinds?.choices.map((choice) => choice.value)).toEqual([
      "all",
      "image",
      "video",
      "audio",
      "text",
    ])
  })

  it("marks the chosen app, and choosing All clears it", () => {
    const { groups, onApp, onKind } = groupsWith("image")
    const [apps, kinds] = groups
    expect(apps?.value).toBe("image")
    apps?.onChoose("all")
    expect(onApp).toHaveBeenCalledWith(null)
    kinds?.onChoose("video")
    kinds?.onChoose("all")
    expect(onKind.mock.calls).toEqual([["video"], [undefined]])
  })
})
