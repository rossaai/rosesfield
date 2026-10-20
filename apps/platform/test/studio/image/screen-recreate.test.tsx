import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import {
  chipValue,
  chipValues,
  flux,
  openImage,
  openingAsk,
  pricedName,
  qwen,
  recreate,
  reference,
  runOf,
  startedRuns,
  stubEngine,
} from "./image-screen"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function promptValue(): unknown {
  return screen.getByRole("textbox", { name: t("home.prompt.label") })
}

describe("Recreate on a run in History", () => {
  it("fills a graph run's prompt, model, size, count, format and seed and starts no run", async () => {
    const inputs = {
      model: qwen.id,
      prompt: "a red door",
      resolution: "1k",
      seed: 12345,
    }
    openImage(
      [runOf({ inputs, count: 2, aspectRatio: "16:9", seed: 12345 })],
      [
        [openingAsk(1), 4.5],
        [{ inputs, count: 2, aspectRatio: "16:9" }, 8.25],
      ]
    )
    await recreate()
    expect(
      await screen.findByRole("button", { name: pricedName(8.25) })
    ).toBeDefined()
    expect(promptValue()).toHaveProperty("value", "a red door")
    expect(
      screen.getByLabelText(`${t("model.picker.title")} ${modelNameOf(qwen)}`)
    ).toBeDefined()
    expect(chipValue(t("field.aspect.label"))).toBe("16:9")
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("2/4")
    expect(startedRuns()).toEqual([])
  })

  it("fills a hosted run's references, format, size and seed and starts no run", async () => {
    const inputs = {
      model: flux.id,
      prompt: "a blue chair",
      images: [reference],
      aspectRatio: "16:9",
      resolution: "2k",
      seed: 7,
    }
    openImage(
      [runOf({ inputs, seed: 7 })],
      [
        [openingAsk(1), 4.5],
        [{ inputs }, 30.17],
      ]
    )
    await recreate()
    expect(
      await screen.findByRole("button", { name: pricedName(30.17) })
    ).toBeDefined()
    expect(promptValue()).toHaveProperty("value", "a blue chair")
    expect(screen.getByLabelText(t("bar.attach"))).toBeDefined()
    expect(chipValues()).toEqual(expect.arrayContaining(["16:9", "2k"]))
    expect(startedRuns()).toEqual([])
  })
})
