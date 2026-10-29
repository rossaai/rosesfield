import { describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { navGroups } from "@/shell/nav-rows"
import { appIdOfPath, hasFooter, hasInputs } from "@/shell/page-kind"

describe("the top bar's links", () => {
  it("list Explore, then the media areas, then the featured pair, then the rest", () => {
    const groups = navGroups()
    expect(groups.explore.to).toBe("/")
    expect(groups.areas.map((area) => area.id)).toEqual([
      "image",
      "video",
      "audio",
      "mesh",
    ])
    expect(groups.featured.agent.to).toBe("/agent")
    expect(groups.rest.map((link) => link.to)).toEqual([
      "/characters",
      "/library",
      "/history",
      "/settings",
    ])
  })

  it("put each app under the area of what it makes, in the catalog's order, with 3D models in their own area", () => {
    const groups = navGroups()
    for (const area of groups.areas) {
      expect(area.apps.map((app) => app.id)).toEqual(
        catalogApps
          .filter(
            (app) => app.category !== "character" && app.output.kind === area.id
          )
          .map((app) => app.id)
      )
    }
    expect(
      groups.areas.find((area) => area.id === "mesh")?.apps.map((app) => app.id)
    ).toEqual(["three-d"])
    const listed = groups.areas.flatMap((area) => area.apps)
    expect(listed.some((app) => app.category === "character")).toBe(false)
  })

  it("pair the Agent with Motion, the Agent first, and keep Motion's row in the Video area right after Video", () => {
    const groups = navGroups()
    expect(groups.featured.agent.id).toBe("agent")
    expect(groups.featured.apps.map((app) => app.id)).toEqual(["motion"])
    const video = groups.areas.find((area) => area.id === "video")
    expect(video?.apps.slice(0, 2).map((app) => app.id)).toEqual([
      "video",
      "motion",
    ])
    const rows = groups.areas
      .flatMap((area) => area.apps)
      .filter((app) => app.id === "motion")
    expect(rows).toHaveLength(1)
  })

  it("give no app but the featured one a second entry", () => {
    const groups = navGroups()
    const entries = [
      ...groups.areas.flatMap((area) => area.apps),
      ...groups.featured.apps,
    ].map((app) => app.id)
    const twice = entries.filter((id, index) => entries.indexOf(id) !== index)
    expect(twice).toEqual(["motion"])
  })

  it("leave out an area with no app", () => {
    const noAudio = catalogApps.filter((app) => app.output.kind !== "audio")
    expect(navGroups(noAudio).areas.map((area) => area.id)).toEqual([
      "image",
      "video",
      "mesh",
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

  it("tells the pages that take inputs", () => {
    for (const path of ["/", "/apps", "/library", "/history", "/characters"]) {
      expect(hasInputs(path)).toBe(false)
    }
    for (const path of ["/apps/image", "/agent", "/characters/new"]) {
      expect(hasInputs(path)).toBe(true)
    }
  })

  it("closes only the browse and legal pages with the footer", () => {
    for (const path of ["/", "/apps", "/apps/", "/privacy", "/terms"]) {
      expect(hasFooter(path)).toBe(true)
    }
    for (const path of [
      "/library",
      "/history",
      "/characters",
      "/settings",
      "/apps/image",
      "/agent",
    ]) {
      expect(hasFooter(path)).toBe(false)
    }
  })
})
