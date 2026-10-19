import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import {
  headlineSource,
  inputValueText,
  runCaption,
} from "@/pieces/run/run-facts"

const assetId = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: "headshots",
    status: "done",
    inputs: {},
    count: 1,
    aspectRatio: "1:1",
    seed: 7,
    outputs: [assetId],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
    ...change,
  })
}

describe("headlineSource", () => {
  it("names a choice by its label, never by its value", () => {
    const source = headlineSource(runOf({ inputs: { background: "office" } }))
    expect(source).toEqual({
      kind: "text",
      text: tCatalog("headshots.choice.background.office"),
    })
    expect(source).not.toEqual({ kind: "text", text: "office" })
    expect(tCatalog("headshots.choice.background.office")).not.toContain(
      "headshots."
    )
  })

  it("names a toggle by its caption and whether it was on", () => {
    expect(headlineSource(runOf({ inputs: { keepGlasses: "off" } }))).toEqual({
      kind: "text",
      text: `${tCatalog("headshots.input.keepGlasses.label")} off`,
    })
  })

  it("points at the first asset when an asset input leads", () => {
    expect(
      headlineSource(
        runOf({ inputs: { image: [assetId], background: "grey" } })
      )
    ).toEqual({ kind: "asset", assetId })
  })

  it("never takes the mode as the title, and leads with the asset the run used", () => {
    const upscale = findCatalogApp("upscale")
    const mode = upscale?.inputs.find((input) => input.name === "mode")
    const imageLabel =
      mode?.type === "choice"
        ? mode.options.find((option) => option.value === "image")?.labelKey
        : undefined
    expect(imageLabel).toBeDefined()
    expect(
      headlineSource(
        runOf({
          appId: "upscale",
          inputs: { mode: "image", image: [assetId], scale: "2" },
        })
      )
    ).toEqual({ kind: "asset", assetId })
    const bare = headlineSource(
      runOf({ appId: "upscale", inputs: { mode: "image" } })
    )
    expect(bare).toEqual({ kind: "text", text: "Run of Upscale" })
    expect(bare).not.toEqual({
      kind: "text",
      text: tCatalog(imageLabel ?? ""),
    })
  })

  it("uses the prompt when the run has one", () => {
    expect(
      headlineSource(
        runOf({ appId: "image", inputs: { prompt: "  A red bicycle  " } })
      )
    ).toEqual({ kind: "text", text: "A red bicycle" })
  })
})

describe("runCaption", () => {
  it("leads with the demo engine and names no model on a demo run", () => {
    const caption = runCaption(
      runOf({
        inputs: { model: "qwen-image-edit-2511" },
        engine: {
          adapter: "demo",
          models: ["qwen.safetensors"],
          workflowHash: null,
        },
      })
    )
    expect(caption).toBe("Demo engine, made in 3 seconds, no cost")
  })

  it("prints the resolved model, never auto, on a live run", () => {
    const caption = runCaption(
      runOf({
        appId: "video",
        origin: "live",
        inputs: { model: "auto" },
        engine: {
          adapter: "comfy",
          models: ["video/ltx-2.5-dev.safetensors"],
          workflowHash: "abc",
        },
      })
    )
    expect(caption).toBe("ltx-2.5-dev, made in 3 seconds, price unknown")
  })

  it("prints whole seconds", () => {
    const caption = runCaption(
      runOf({ finishedAt: "2026-10-17T09:00:04.100Z" })
    )
    expect(caption).toBe("Demo engine, made in 4 seconds, no cost")
  })

  it("names only the model on a failed run, because nothing was made", () => {
    const failed = runCaption(
      runOf({
        appId: "video",
        status: "failed",
        outputs: [],
        origin: "live",
        inputs: { model: "auto" },
        engine: {
          adapter: "comfy",
          models: ["video/ltx-2.5-dev.safetensors"],
          workflowHash: "abc",
        },
        finishedAt: "2026-10-17T09:00:06.000Z",
      })
    )
    expect(failed).toBe("ltx-2.5-dev")
    expect(failed).not.toContain("made in")
  })

  it("prints nothing on a failed demo run", () => {
    expect(runCaption(runOf({ status: "failed", outputs: [] }))).toBe("")
  })
})

describe("inputValueText", () => {
  it("prints a number with the unit its copy names", () => {
    const expand = findCatalogApp("expand")
    const top = expand?.inputs.find((input) => input.name === "top")
    expect(top).toBeDefined()
    if (expand === null || top === undefined) {
      return
    }
    expect(inputValueText(expand, top, 25)).toBe("25%")
  })
})
