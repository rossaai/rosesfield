import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { resetFrames } from "../../screens/app/frame-render"
import { openStoryboard, storyboardRun, stubEngine } from "./storyboard-screen"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  resetFrames()
})

const landed = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"

describe("the Storyboard keyframes while a run works", () => {
  it("shows one numbered working tile per scene at once, and a landed keyframe replaces its tile", async () => {
    openStoryboard({
      runs: [
        storyboardRun({
          inputs: { sceneCount: "3", scene1: "a", scene2: "b", scene3: "c" },
          count: 3,
          aspectRatio: "16:9",
          status: "running",
          outputs: [landed],
          finishedAt: null,
        }),
      ],
    })
    const grid = await vi.waitFor(() => {
      const found = document.querySelector("[data-slot=keyframe-grid]")
      if (found === null) {
        throw new Error("no keyframe grid")
      }
      return found
    })
    const tiles = [...grid.querySelectorAll("li")]
    expect(tiles).toHaveLength(3)
    expect(
      tiles.map((tile) => tile.querySelector(":scope > span[aria-hidden]")?.textContent)
    ).toEqual(["1", "2", "3"])
    expect(
      screen.queryByLabelText(t("run.working", { index: 1, count: 3 }))
    ).toBeNull()
    expect(
      tiles[0]?.querySelector("[data-slot=working-pulse]") ?? null
    ).toBeNull()
    expect(
      screen.getByLabelText(t("run.working", { index: 2, count: 3 }))
    ).toBeDefined()
    expect(
      screen.getByLabelText(t("run.working", { index: 3, count: 3 }))
    ).toBeDefined()
  })
})
