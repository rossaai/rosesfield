import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import {
  forgetKeptKeyframes,
  keepKeyframe,
} from "@/studio/storyboard/kept-keyframes"
import { withScenes } from "@/studio/storyboard/storyboard-form"
import { inputsForModel } from "@/studio/storyboard/storyboard-model"
import { asPhone, resetFrames } from "../../screens/app/frame-render"
import {
  addScenes,
  calls,
  emptyCanvas,
  fluxImage,
  hostedKeyframe,
  openingValues,
  openStoryboard,
  pickerTriggerName,
  pricedName,
  qwenEdit,
  sceneFields,
  startedRuns,
  storyboardRun,
  stubEngine,
} from "./storyboard-screen"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("Storyboard before any run", () => {
  it("shows the reference well, the character button, one numbered scene, the look field and the empty canvas", async () => {
    openStoryboard()
    expect(await emptyCanvas()).toBeDefined()
    expect(screen.getByText(t("app.empty.body"))).toBeDefined()
    expect(
      screen.getAllByText(tCatalog("storyboard.input.reference.label")).length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText(tCatalog("storyboard.input.character.label")).length
    ).toBeGreaterThan(0)
    expect(sceneFields()).toHaveLength(1)
    expect(
      screen.getByText(tCatalog("storyboard.scene.number", { number: 1 }))
    ).toBeDefined()
    expect(
      screen.getByPlaceholderText(tCatalog("storyboard.input.look.placeholder"))
    ).toBeDefined()
  })
})

describe("the scene list", () => {
  it("adds scenes up to 8, then shows the limit in place of Add scene", async () => {
    openStoryboard()
    await emptyCanvas()
    addScenes(7)
    expect(sceneFields()).toHaveLength(8)
    expect(
      screen.queryByRole("button", { name: tCatalog("storyboard.scene.add") })
    ).toBeNull()
    expect(
      screen.getByText(tCatalog("storyboard.input.scenes.tooMany"))
    ).toBeDefined()
  })

  it("moves scene 3 above scene 1 and removes scene 2, and the numbers follow", async () => {
    openStoryboard()
    await emptyCanvas()
    addScenes(2)
    const typed = ["the door", "the stairs", "the roof"]
    for (const [index, field] of sceneFields().entries()) {
      fireEvent.change(field, { target: { value: typed[index] } })
    }
    for (const number of [3, 2]) {
      fireEvent.click(
        screen.getByRole("button", {
          name: tCatalog("storyboard.scene.moveUp", { number }),
        })
      )
    }
    fireEvent.click(
      screen.getByRole("button", {
        name: tCatalog("storyboard.scene.remove", { number: 2 }),
      })
    )
    expect(sceneFields().map((field) => field.value)).toEqual([
      "the roof",
      "the stairs",
    ])
    expect(
      screen.queryByText(tCatalog("storyboard.scene.number", { number: 3 }))
    ).toBeNull()
  })
})

describe("Generate with an empty scene", () => {
  it("starts no run, moves focus to that scene and says it is needed, and keeps the other scenes", async () => {
    openStoryboard({ prices: [[openingValues(), qwenEdit, 2]] })
    const generate = await screen.findByRole("button", {
      name: pricedName(2),
    })
    const [first] = sceneFields()
    if (first === undefined) {
      throw new Error("no scene field")
    }
    fireEvent.change(first, { target: { value: "a fox" } })
    addScenes(1)
    fireEvent.click(generate)
    const [, empty] = sceneFields()
    expect(document.activeElement).toBe(empty)
    expect(screen.getByText(t("field.prompt.required"))).toBeDefined()
    expect(sceneFields()[0]?.value).toBe("a fox")
    expect(startedRuns()).toEqual([])
  })
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
    expect(screen.queryByText(t("run.price.unknown"))).toBeNull()
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
    expect(screen.getByText("21:9")).toBeDefined()
    expect(screen.queryByText("9:16")).toBeNull()
    expect(
      await screen.findByRole("button", { name: pricedName(14.48) })
    ).toBeDefined()
  })
})

describe("Use these inputs", () => {
  it("fills the scenes in order and the look, and starts no run", async () => {
    openStoryboard({
      runs: [
        storyboardRun({
          inputs: {
            sceneCount: "2",
            scene1: "the roof",
            scene2: "the door",
            look: "fog",
            model: qwenEdit.id,
          },
          count: 2,
          seed: 42,
          aspectRatio: "1:1",
        }),
      ],
    })
    fireEvent.mouseDown(
      await screen.findByRole("button", { name: t("run.menu") })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: t("run.useInputs") })
    )
    await vi.waitFor(() =>
      expect(sceneFields().map((field) => field.value)).toEqual([
        "the roof",
        "the door",
      ])
    )
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(
        tCatalog("storyboard.input.look.placeholder")
      ).value
    ).toBe("fog")
    expect(startedRuns()).toEqual([])
  })
})

describe("Back to Storyboard", () => {
  it("returns with your scenes in place", async () => {
    const opened = openStoryboard()
    await emptyCanvas()
    addScenes(1)
    for (const [index, field] of sceneFields().entries()) {
      fireEvent.change(field, { target: { value: `scene ${index + 1}` } })
    }
    await act(opened.leave)
    expect(await screen.findByText("elsewhere")).toBeDefined()
    act(opened.back)
    await vi.waitFor(() =>
      expect(sceneFields().map((field) => field.value)).toEqual([
        "scene 1",
        "scene 2",
      ])
    )
  })
})

describe("Storyboard on a phone", () => {
  it("docks Inputs, the price caption and Generate, and the Inputs sheet holds the scenes, the look and the model", async () => {
    asPhone()
    openStoryboard({ prices: [[openingValues(), qwenEdit, 14.48]] })
    const dock = await vi.waitFor(() => {
      const found = document.querySelector("[data-slot=storyboard-dock]")
      if (!(found instanceof HTMLElement)) {
        throw new Error("no docked bar")
      }
      return found
    })
    expect(dock.textContent).toContain(t("app.inputs.open"))
    await vi.waitFor(() =>
      expect(dock.textContent).toContain(
        t("run.price.credits", { amount: "14.48" })
      )
    )
    expect(dock.querySelector("[data-slot=generate-button]")).not.toBeNull()
    expect(sceneFields()).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: t("app.inputs.open") }))
    expect(await screen.findByRole("dialog")).toBeDefined()
    expect(sceneFields()).toHaveLength(1)
    expect(
      screen.getByPlaceholderText(tCatalog("storyboard.input.look.placeholder"))
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: pickerTriggerName(qwenEdit) })
    ).toBeDefined()
  })

  it("sets the keyframes in 2 columns", async () => {
    asPhone()
    openStoryboard({
      runs: [
        storyboardRun({
          inputs: { sceneCount: "2", scene1: "a", scene2: "b" },
          count: 2,
          status: "running",
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
    expect(grid.className.split(" ")).toContain("grid-cols-2")
    expect(grid.querySelectorAll("li")).toHaveLength(2)
  })
})

describe("Storyboard on a hosted edit model", () => {
  it("shows the working runs of one press as one grid of tiles numbered 1 to 3, with no History", async () => {
    window.localStorage.clear()
    forgetKeptKeyframes()
    const keyframes = [3, 2, 1].map((number) =>
      hostedKeyframe(number, { status: "running", finishedAt: null })
    )
    for (const one of keyframes) {
      keepKeyframe(one.run, one.kept)
    }
    openStoryboard({ runs: keyframes.map((one) => one.run) })
    const grid = await vi.waitFor(() => {
      const found = document.querySelector("[data-slot=keyframe-grid]")
      if (found === null) {
        throw new Error("no keyframe grid")
      }
      return found
    })
    expect(document.querySelectorAll("[data-slot=keyframe-grid]")).toHaveLength(
      1
    )
    expect(
      [...grid.querySelectorAll("li")].map(
        (tile) => tile.querySelector(".sr-only")?.textContent
      )
    ).toEqual(
      [1, 2, 3].map((number) =>
        tCatalog("storyboard.keyframe.number", { number })
      )
    )
    expect(screen.queryByText(t("app.history.title"))).toBeNull()
  })
})
