import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { withScenes } from "@/studio/storyboard/storyboard-form"
import { inputsForModel } from "@/studio/storyboard/storyboard-model"
import { resetFrames } from "../../screens/app/frame-render"
import {
  addScenes,
  calls,
  fluxImage,
  openingValues,
  openStoryboard,
  pickerTriggerName,
  pricedName,
  qwenEdit,
  sceneFields,
  stubEngine,
} from "./storyboard-screen"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("the model menu and the price", () => {
  it("opens on Qwen Image Edit 2511 and prices the sum of its calls, one keyframe times the scene count", async () => {
    const eight = withScenes(
      openingValues(),
      Array.from({ length: 8 }, () => "")
    )
    openStoryboard({
      prices: [
        [openingValues(), qwenEdit, 14.48],
        [eight, qwenEdit, 14.48],
      ],
    })
    expect(
      await screen.findByRole("button", { name: pickerTriggerName(qwenEdit) })
    ).toBeDefined()
    expect(
      await screen.findByRole("button", { name: pricedName(14.48) })
    ).toBeDefined()
    addScenes(7)
    expect(
      await screen.findByRole("button", { name: pricedName(115.84) })
    ).toBeDefined()
  })

  it("shows Generate alone for a model with no price, never a price of 0 or Price unknown", async () => {
    openStoryboard({ prices: [[openingValues(), qwenEdit, 0]] })
    await vi.waitFor(() =>
      expect(
        document
          .querySelector("[data-slot=generate-button]")
          ?.getAttribute("data-priced")
      ).toBe("no")
    )
    expect(document.querySelector("[data-slot=storyboard-price]")).toBeNull()
    expect(screen.queryByText("Price unknown")).toBeNull()
    expect(screen.queryByRole("button", { name: pricedName(0) })).toBeNull()
  })

  it("prices every model row in one request when the menu opens, each at its own keyframe call", async () => {
    openStoryboard({ prices: [[openingValues(), qwenEdit, 14.48]] })
    fireEvent.click(
      await screen.findByRole("button", { name: pickerTriggerName(qwenEdit) })
    )
    const priced = await vi.waitFor(() => {
      const found = calls.filter((call) =>
        call.url.endsWith("/api/apps/storyboard/prices")
      )
      expect(found).toHaveLength(1)
      return found
    })
    expect(priced[0]?.method).toBe("POST")
  })

  it("lists FLUX 3 Image one choice away, and picking it keeps the scene and shows the formats of its schema", async () => {
    const flux = withScenes(
      {
        ...openingValues(),
        inputs: inputsForModel(openingValues().inputs, fluxImage),
      },
      ["a fox"]
    )
    openStoryboard({ prices: [[flux, fluxImage, 14.48]] })
    const first = await vi.waitFor(() => {
      const [field] = sceneFields()
      if (field === undefined) {
        throw new Error("no scene field")
      }
      return field
    })
    fireEvent.change(first, { target: { value: "a fox" } })
    fireEvent.click(
      await screen.findByRole("button", { name: pickerTriggerName(qwenEdit) })
    )
    const row = document.querySelector(`[data-model="${fluxImage.id}"]`)
    if (row === null) {
      throw new Error("no row for FLUX 3 Image")
    }
    expect(document.querySelector('[data-model="z-image-turbo"]')).toBeNull()
    fireEvent.click(row)
    expect(
      await screen.findByRole("button", { name: pickerTriggerName(fluxImage) })
    ).toBeDefined()
    expect(sceneFields()[0]?.value).toBe("a fox")
    const aspect = fluxImage.form?.find((field) => field.name === "aspectRatio")
    if (aspect === undefined) {
      throw new Error("FLUX 3 Image declares no aspect")
    }
    fireEvent.click(
      screen.getByRole("combobox", { name: fieldCaption(aspect) })
    )
    const formats = (await screen.findAllByRole("option")).map(
      (option) => option.textContent
    )
    expect(formats).toContain("21:9")
    expect(formats).not.toContain("9:16")
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    })
    expect(
      await screen.findByRole("button", { name: pricedName(14.48) })
    ).toBeDefined()
  })
})
