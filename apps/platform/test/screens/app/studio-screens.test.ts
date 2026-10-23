import { describe, expect, it } from "vitest"
import { preloadStudio, studioScreenFor } from "@/screens/app/studio-screens"
import { AppScreen } from "@/studio/upscale/screen"

describe("a studio screen loaded before its route renders", () => {
  it("is the studio's own screen once preloaded, so the route mounts it with no loading shape", async () => {
    await preloadStudio("upscale")
    expect(studioScreenFor("upscale")).toBe(AppScreen)
  })

  it("keeps the screen it first gave while it loads, so a render after the load never mounts the studio a second time", async () => {
    const first = studioScreenFor("three-d")
    await preloadStudio("three-d")
    expect(studioScreenFor("three-d")).toBe(first)
  })

  it("leaves an app with no studio screen without one", async () => {
    await preloadStudio("not-an-app")
    expect(studioScreenFor("not-an-app")).toBeNull()
  })
})
