import { assetId, type Run, run } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  compareSidesOf,
  keepInStep,
  type Playable,
  pauseTogether,
  playTogether,
  UpscaleCompare,
} from "@/studio/upscale/upscale-compare"
import { catalog, flashVsr, graph, waveSpeed } from "./upscale-fixtures"

vi.mock("@/api/use-asset-source", () => ({
  useAssetSource: (assetId: string) => ({
    state: "ready",
    src: `blob:${assetId}`,
  }),
}))

const photo1 = assetId.parse("6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e01")
const photo2 = assetId.parse("6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e02")
const clip1 = assetId.parse("6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e03")
const out1 = assetId.parse("6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e04")
const photo3 = assetId.parse("6f9a2c1e-1d2b-4c3d-8e4f-5a6b7c8d9e05")

function runOf(inputs: Run["inputs"], outputs: string[] = [out1]): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e10",
    appId: "upscale",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "16:9",
    seed: null,
    outputs,
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
  })
}

function playable(
  currentTime: number,
  ended = false
): Playable & {
  played: number
  paused: number
} {
  const one = {
    currentTime,
    ended,
    played: 0,
    paused: 0,
    play: () => {
      one.played += 1
      return Promise.resolve()
    },
    pause: () => {
      one.paused += 1
    },
  }
  return one
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("the upscale compare's two sides", () => {
  it("finds your file in the graph's well of the run's tab", () => {
    const made = runOf({ mode: "image", model: graph.id, image: [photo1] })
    expect(compareSidesOf(made, catalog)).toEqual({
      inputId: photo1,
      outputId: out1,
      kind: "image",
    })
  })

  it("finds your file in a hosted model's own field, which no catalog input names", () => {
    const image = runOf({
      mode: "image",
      model: waveSpeed.id,
      inputImage: [photo2],
    })
    const video = runOf({ mode: "video", model: flashVsr.id, video: [clip1] })
    expect(compareSidesOf(image, catalog)?.inputId).toBe(photo2)
    expect(compareSidesOf(video, catalog)).toEqual({
      inputId: clip1,
      outputId: out1,
      kind: "video",
    })
  })

  it("offers no compare for a run with no output or no file", () => {
    expect(
      compareSidesOf(
        runOf({ mode: "image", model: graph.id, image: [photo3] }, []),
        catalog
      )
    ).toBeNull()
    expect(
      compareSidesOf(runOf({ mode: "image", model: waveSpeed.id }), catalog)
    ).toBeNull()
  })
})

describe("the upscale compare's playback", () => {
  it("starts both videos from the result's time with one press", async () => {
    const lead = playable(2.5)
    const follower = playable(0)
    await playTogether(lead, follower)
    expect(lead.played).toBe(1)
    expect(follower.played).toBe(1)
    expect(follower.currentTime).toBe(2.5)
  })

  it("starts both from the start after the result ended", async () => {
    const lead = playable(5, true)
    const follower = playable(5)
    await playTogether(lead, follower)
    expect(lead.currentTime).toBe(0)
    expect(follower.currentTime).toBe(0)
  })

  it("pulls your video back to the result's time when it drifts", () => {
    const lead = playable(3)
    const follower = playable(3.05)
    expect(keepInStep(lead, follower)).toBe(false)
    follower.currentTime = 3.4
    expect(keepInStep(lead, follower)).toBe(true)
    expect(follower.currentTime).toBe(3)
  })

  it("pauses both on the same frame", () => {
    const lead = playable(1.2)
    const follower = playable(1.4)
    pauseTogether(lead, follower)
    expect([lead.paused, follower.paused]).toEqual([1, 1])
    expect(follower.currentTime).toBe(1.2)
  })
})

function renderCompare(made: Run): HTMLElement {
  const { container } = render(
    <TooltipProvider>
      <UpscaleCompare run={made} models={catalog} />
    </TooltipProvider>
  )
  return container
}

describe("the upscale compare on the canvas", () => {
  it("lays your image and the result in the same box, the same size and place", () => {
    const container = renderCompare(
      runOf({ mode: "image", model: graph.id, image: [photo1] })
    )
    fireEvent.click(screen.getByRole("button", { name: t("viewer.compare") }))
    const frame = container.querySelector("[data-slot=upscale-compare]")
    const layers = [...(frame?.querySelectorAll("img") ?? [])]
    expect(layers.map((one) => one.getAttribute("src"))).toEqual([
      `blob:${out1}`,
      `blob:${photo1}`,
    ])
    expect(layers[0]?.className).toBe(layers[1]?.className)
    expect(layers[1]?.style.clipPath).toBe("inset(0 50% 0 0)")
    expect(screen.queryByRole("button", { name: t("output.play") })).toBeNull()
  })

  it("plays both videos with one press on play", async () => {
    const played: string[] = []
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement
    ) {
      played.push(this.getAttribute("src") ?? "")
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
      () => undefined
    )
    renderCompare(runOf({ mode: "video", model: flashVsr.id, video: [clip1] }))
    fireEvent.click(screen.getByRole("button", { name: t("viewer.compare") }))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: t("output.play") }))
      await Promise.resolve()
    })
    expect(played.sort()).toEqual([`blob:${clip1}`, `blob:${out1}`])
    expect(screen.getByRole("button", { name: t("output.pause") })).toBeTruthy()
  })
})
