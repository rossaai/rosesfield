import { describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { navGroups, vfxAreaApps } from "@/shell/nav-rows"
import { appIdOfPath, hasFooter, hasInputs } from "@/shell/page-kind"

describe("the top bar's links", () => {
  it("list Explore, then the media areas, then VFX between 3D and Agent, then the rest", () => {
    const groups = navGroups()
    expect(groups.explore.to).toBe("/")
    expect(groups.areas.map((area) => area.id)).toEqual([
      "image",
      "video",
      "audio",
      "mesh",
      "vfx",
    ])
    expect(groups.areas.at(-1)?.label).toBe("shell.area.vfx")
    expect(groups.agent.to).toBe("/agent")
    expect(groups.rest.map((link) => link.to)).toEqual([
      "/characters",
      "/library",
      "/history",
      "/settings",
    ])
  })

  it("put each app under the area of what it makes, in the catalog's order, with 3D models in their own area", () => {
    const groups = navGroups()
    for (const area of groups.areas.filter((one) => one.id !== "vfx")) {
      expect(area.apps.map((app) => app.id)).toEqual(
        catalogApps
          .filter(
            (app) =>
              app.category !== "character" &&
              app.output.kind === area.id &&
              !vfxAreaApps.includes(app.id)
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

  it("move the VFX presets and Effects out of Video into VFX", () => {
    const groups = navGroups()
    const idsOf = (id: string) =>
      groups.areas.find((area) => area.id === id)?.apps.map((app) => app.id)
    expect(idsOf("vfx")).toEqual(["vfx", "effects"])
    expect(idsOf("video")).not.toContain("effects")
    expect(idsOf("video")).not.toContain("vfx")
    expect(idsOf("video")).toContain("motion")
  })

  it("leave out an area with no app", () => {
    const noAudio = catalogApps.filter((app) => app.output.kind !== "audio")
    expect(navGroups(noAudio).areas.map((area) => area.id)).toEqual([
      "image",
      "video",
      "mesh",
      "vfx",
    ])
    const noVfx = catalogApps.filter((app) => !vfxAreaApps.includes(app.id))
    expect(navGroups(noVfx).areas.map((area) => area.id)).not.toContain("vfx")
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
