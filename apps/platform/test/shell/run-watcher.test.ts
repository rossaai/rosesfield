import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { isRunPlaceOpen } from "@/shell/run-watcher"

function failedRun(appId: string): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId,
    status: "failed",
    inputs: {},
    count: 1,
    aspectRatio: "1:1",
    seed: 7,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: { code: "ENGINE_UNAVAILABLE", status: 502 },
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
  })
}

describe("isRunPlaceOpen", () => {
  it("counts Add a character in traits mode as the Characters app's screen", () => {
    const characters = failedRun("characters")
    expect(
      isRunPlaceOpen(
        { pathname: "/characters/new", searchStr: "?mode=traits" },
        characters
      )
    ).toBe(true)
    expect(
      isRunPlaceOpen(
        { pathname: "/characters/new", searchStr: "?mode=photos" },
        characters
      )
    ).toBe(false)
  })

  it("counts the app's own screen and the run's own screen, and nothing else", () => {
    const image = failedRun("image")
    expect(
      isRunPlaceOpen({ pathname: "/apps/image", searchStr: "" }, image)
    ).toBe(true)
    expect(
      isRunPlaceOpen({ pathname: `/history/${image.id}`, searchStr: "" }, image)
    ).toBe(true)
    expect(
      isRunPlaceOpen(
        { pathname: "/characters/new", searchStr: "?mode=traits" },
        image
      )
    ).toBe(false)
    expect(isRunPlaceOpen({ pathname: "/library", searchStr: "" }, image)).toBe(
      false
    )
  })
})
