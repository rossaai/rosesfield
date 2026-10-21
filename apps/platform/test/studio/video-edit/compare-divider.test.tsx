import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { tCatalog } from "@/copy/t"
import {
  CompareDivider,
  followLead,
  sourceOf,
  splitAt,
} from "@/studio/video-edit/compare-divider"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const clipId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"
const outputId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4e"

function doneRun(inputs: Record<string, unknown>): Run {
  return run.parse({
    id: "93e9078d-0000-4000-8000-000000000009",
    appId: "video-edit",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: "16:9",
    seed: null,
    outputs: [outputId],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    finishedAt: "2026-10-20T10:00:03.000Z",
  })
}

function videoAt(currentTime: number, duration: number): HTMLVideoElement {
  const video = document.createElement("video")
  Object.defineProperty(video, "duration", { value: duration })
  video.currentTime = currentTime
  return video
}

function showCompare(): { yours: HTMLVideoElement; output: HTMLVideoElement } {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CompareDivider
        run={doneRun({ mode: "extend", source: [clipId] })}
        outputId={outputId}
      />
    </QueryClientProvider>
  )
  const yours = screen.getByLabelText(tCatalog("videoEdit.compare.yours"), {
    selector: "video",
  })
  const output = screen.getByLabelText(tCatalog("videoEdit.compare.output"), {
    selector: "video",
  })
  if (
    !(yours instanceof HTMLVideoElement && output instanceof HTMLVideoElement)
  ) {
    throw new Error("the comparison shows no two clips")
  }
  return { yours, output }
}

describe("the comparison's divider", () => {
  it("follows the pointer across the picture, held between its edges", () => {
    expect(splitAt(150, 100, 200)).toBe(25)
    expect(splitAt(40, 100, 200)).toBe(0)
    expect(splitAt(900, 100, 200)).toBe(100)
    expect(splitAt(150, 100, 0)).toBe(50)
  })

  it("moves when you drag it on the picture, and shows your clip left of it", () => {
    const { yours } = showCompare()
    const stage = document.querySelector("[data-slot='compare-stage']")
    if (!(stage instanceof HTMLElement)) {
      throw new Error("the comparison has no picture")
    }
    stage.getBoundingClientRect = () => new DOMRect(0, 0, 400, 225)
    fireEvent.pointerDown(stage, { clientX: 100, pointerId: 1 })
    expect(yours.style.clipPath).toBe("inset(0 75% 0 0)")
    fireEvent.pointerMove(stage, { clientX: 300, pointerId: 1 })
    expect(yours.style.clipPath).toBe("inset(0 25% 0 0)")
    fireEvent.pointerUp(stage, { pointerId: 1 })
    fireEvent.pointerMove(stage, { clientX: 40, pointerId: 1 })
    expect(yours.style.clipPath).toBe("inset(0 25% 0 0)")
    const line = document.querySelector<HTMLElement>(
      "[data-slot='compare-divider']"
    )
    expect(line?.style.left).toBe("75%")
  })
})

describe("one press on play", () => {
  it("starts your clip and the output together from their first frame", () => {
    const { yours, output } = showCompare()
    const played: string[] = []
    for (const [name, video] of [
      ["yours", yours],
      ["output", output],
    ] as const) {
      video.currentTime = 3
      video.play = () => {
        played.push(name)
        return Promise.resolve()
      }
      video.pause = () => undefined
    }
    fireEvent.click(
      screen.getByRole("button", { name: tCatalog("videoEdit.compare.play") })
    )
    expect(played.sort()).toEqual(["output", "yours"])
    expect([yours.currentTime, output.currentTime]).toEqual([0, 0])
    expect(
      screen.getByRole("button", { name: tCatalog("videoEdit.compare.pause") })
    ).toBeTruthy()
  })

  it("keeps your clip on the output's time when it drifts, and lets it rest once it ends", () => {
    const lead = videoAt(2, 9)
    const drifted = videoAt(1.6, 5)
    followLead(lead, drifted)
    expect(drifted.currentTime).toBe(2)
    const close = videoAt(2.05, 5)
    followLead(lead, close)
    expect(close.currentTime).toBe(2.05)
    const shorter = videoAt(5, 5)
    followLead(videoAt(7, 9), shorter)
    expect(shorter.currentTime).toBe(5)
  })
})

describe("the clip a run edited", () => {
  it("is the source of a graph run and the video input of a hosted run", () => {
    expect(sourceOf(doneRun({ source: [clipId] }))).toBe(clipId)
    expect(
      sourceOf(doneRun({ model: "bfl/video-edit-v1", videoUrl: [clipId] }))
    ).toBe(clipId)
    expect(sourceOf(doneRun({ prompt: "make it snow" }))).toBeNull()
  })
})
