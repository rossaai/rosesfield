import { cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  calls,
  flux,
  openImage,
  runOf,
  stubEngine,
  zImage,
} from "./image-screen"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function workingTiles(): boolean[] {
  return [1, 2, 3, 4].map(
    (index) =>
      screen.queryByRole("status", {
        name: t("run.working", { index, count: 4 }),
      }) !== null
  )
}

describe("a run of 4 on the Image canvas", () => {
  it("shows four working tiles at once", async () => {
    openImage(
      [
        runOf({
          status: "running",
          inputs: { model: zImage.id, prompt: "a paper boat" },
          count: 4,
          aspectRatio: "16:9",
          finishedAt: null,
        }),
      ],
      []
    )
    await waitFor(() =>
      expect(workingTiles()).toEqual([true, true, true, true])
    )
  })

  it("puts each image in its own tile as it lands while the run still works", async () => {
    const landed = [
      "7b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d01",
      "7b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d02",
    ]
    openImage(
      [
        runOf({
          status: "running",
          inputs: { model: flux.id, prompt: "a paper boat" },
          count: 4,
          aspectRatio: "16:9",
          outputs: landed,
          finishedAt: null,
        }),
      ],
      []
    )
    await waitFor(() =>
      expect(workingTiles()).toEqual([false, false, true, true])
    )
    const row = document.querySelector('[data-slot="output-row"]')
    expect(
      row?.querySelectorAll(":scope > [data-slot=output-cell]")
    ).toHaveLength(4)
    await waitFor(() =>
      expect(
        landed.map((assetId) =>
          calls.some((call) => call.url.endsWith(`/api/assets/${assetId}`))
        )
      ).toEqual([true, true])
    )
  })
})
