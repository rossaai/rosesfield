import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import {
  chipValue,
  inputCaptionOf,
  openImage,
  openingAsk,
  pricedName,
  startedRuns,
  stubEngine,
  zImage,
} from "./image-screen"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("Image opens on its bar", () => {
  it("chooses the catalog's open-weights default and shows its format, size and count chips and Generate with its price, without attach", async () => {
    openImage([], [[openingAsk(1), 4.5]])
    expect(
      await screen.findAllByLabelText(
        `${t("model.picker.title")} ${modelNameOf(zImage)}`
      )
    ).toHaveLength(1)
    expect(
      await screen.findByRole("button", { name: pricedName(4.5) })
    ).toBeDefined()
    expect(chipValue(t("field.aspect.label"))).toBe("1:1")
    expect(chipValue(inputCaptionOf("resolution"))).toBe("1K")
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("1/4")
    expect(screen.queryByLabelText(t("bar.attach"))).toBeNull()
  })
})

describe("the price on Generate", () => {
  it("follows the count before you press Generate, at 3 times one image for a count of 3", async () => {
    openImage(
      [],
      [
        [openingAsk(1), 4.5],
        [openingAsk(3), 13.5],
      ]
    )
    await screen.findByRole("button", { name: pricedName(4.5) })
    const more = screen.getByRole("button", { name: t("bar.count.more") })
    fireEvent.click(more)
    fireEvent.click(more)
    expect(
      screen.getByRole("group", { name: t("field.count.label") }).textContent
    ).toBe("3/4")
    expect(
      await screen.findByRole("button", { name: pricedName(13.5) })
    ).toBeDefined()
    expect(startedRuns()).toEqual([])
  })
})
