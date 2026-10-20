import { describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { navGroups } from "@/shell/nav-rows"
import { appIdOfPath, hasFooter, hasInputs } from "@/shell/page-kind"

describe("the top bar's links", () => {
  it("list Explore, then the media areas, then the rest", () => {
    const groups = navGroups()
    expect(groups.explore.to).toBe("/")
    expect(groups.areas.map((area) => area.id)).toEqual([
      "image",
      "video",
      "audio",
    ])
    expect(groups.rest.map((link) => link.to)).toEqual([
      "/characters",
      "/agent",
      "/library",
      "/history",
      "/settings",
    ])
  })

  it("put each app under the area of its category, in the catalog's order", () => {
    const groups = navGroups()
    for (const area of groups.areas) {
      expect(area.apps.map((app) => app.id)).toEqual(
        catalogApps
          .filter((app) => app.category === area.id)
          .map((app) => app.id)
      )
    }
    const listed = groups.areas.flatMap((area) => area.apps)
    expect(listed.some((app) => app.category === "character")).toBe(false)
  })

  it("leave out an area with no app", () => {
    const noAudio = catalogApps.filter((app) => app.category !== "audio")
    expect(navGroups(noAudio).areas.map((area) => area.id)).toEqual([
      "image",
      "video",
    ])
  })
})

describe("the kind of page", () => {
  it("reads the app of an app page", () => {
    expect(appIdOfPath("/apps/image")).toBe("image")
    expect(appIdOfPath("/apps/video-edit/")).toBe("video-edit")
    expect(appIdOfPath("/apps")).toBeNull()
    expect(appIdOfPath("/")).toBeNull()
  })

  it("closes every page without inputs with the footer", () => {
    for (const path of ["/", "/apps", "/library", "/history", "/characters"]) {
      expect(hasInputs(path)).toBe(false)
      expect(hasFooter(path)).toBe(true)
    }
    for (const path of ["/apps/image", "/agent", "/characters/new"]) {
      expect(hasInputs(path)).toBe(true)
      expect(hasFooter(path)).toBe(false)
    }
  })
})
