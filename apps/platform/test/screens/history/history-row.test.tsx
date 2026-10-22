import { run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HistoryRow, runLabOf } from "@/screens/history/history-row"
import { renderAt } from "../../shell/shell-router"
import { asPhone, resetFrames } from "../app/frame-render"

const done = run.parse({
  id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
  appId: "image",
  status: "done",
  inputs: { prompt: "a red door in fog", model: "z-image-turbo" },
  count: 1,
  aspectRatio: "1:1",
  seed: 1,
  outputs: ["3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"],
  progress: 1,
  engine: {
    adapter: "comfy-workflow",
    models: ["z_image_turbo_bf16.safetensors"],
    workflowHash: null,
  },
  cost: { amount: 0.0065, currency: "USD" },
  origin: "live",
  failure: null,
  createdAt: "2026-10-21T12:00:00.000Z",
  finishedAt: "2026-10-21T12:00:21.000Z",
})

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  resetFrames()
})

async function rowOf(): Promise<HTMLElement> {
  renderAt("/history", () => (
    <ToastProvider>
      <TooltipProvider>
        <ul>
          <HistoryRow run={done} />
        </ul>
      </TooltipProvider>
    </ToastProvider>
  ))
  return screen.findByRole("listitem")
}

describe("a History row", () => {
  it("reads as one line: the thumb, the lab's mark, the app, the prompt and the time", async () => {
    const row = await rowOf()
    const mark = row.querySelector("[data-slot='lab-mark']")
    expect(mark?.getAttribute("data-maker")).toBe(runLabOf(done))
    const name = row.querySelector("[data-slot='row-name']")
    expect(name?.textContent).toBe("Image")
    expect(name?.className.split(" ")).toEqual(
      expect.arrayContaining(["font-medium", "text-body", "text-ink"])
    )
    expect(row.querySelector("[data-slot='row-line']")?.textContent).toBe(
      "a red door in fog"
    )
    expect(row.querySelector("[data-slot='row-time']")).not.toBeNull()
    expect(row.querySelector(".text-caption")).toBeNull()
    expect(row.textContent).not.toMatch(/\d+\.\d+/)
    expect(row.textContent).not.toMatch(/credit/i)
  })

  it("hides its options circle until hover or focus on a wide window, and shows it on a phone", async () => {
    const wide = await rowOf()
    const options = wide.querySelector("[data-slot='row-options']")
    expect(options?.className.split(" ")).toEqual(
      expect.arrayContaining(["opacity-0", "group-hover/reveal:opacity-100"])
    )
    expect(options?.getAttribute("data-density")).toBe("composer")
    cleanup()
    asPhone()
    const phone = await rowOf()
    expect(
      phone.querySelector("[data-slot='row-options']")?.className.split(" ")
    ).not.toContain("opacity-0")
  })

  it("finds the lab of a graph model and of no model", () => {
    expect(runLabOf(done)).toBe("Alibaba Tongyi-MAI")
    expect(runLabOf({ ...done, inputs: { prompt: "x" } })).toBeNull()
  })
})
