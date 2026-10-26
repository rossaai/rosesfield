import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { asPhone, resetFrames } from "../../screens/app/frame-render"
import {
  editedLayer,
  editGraph,
  fillGraph,
  firstLayer,
  layersRun,
  photo,
  relightGraph,
  secondLayer,
  seedream,
  splitGraph,
} from "./layers-fixtures"
import { asked, catalogPath, openLayers, served } from "./layers-screen"

function pickerNamed(name: string): Promise<HTMLElement> {
  return screen.findByRole("button", {
    name: `${t("model.picker.title")} ${name}`,
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  asked.length = 0
  served.length = 0
  cleanup()
  resetFrames()
  vi.unstubAllGlobals()
})

describe("Layers before any run", () => {
  it("shows the empty title, what Layers does and one act, Add an image, with no example", async () => {
    openLayers({ runs: [] })
    expect(
      await screen.findByRole("tab", {
        name: t("app.tab.how"),
        selected: true,
      })
    ).not.toBeNull()
    fireEvent.click(screen.getByRole("tab", { name: t("app.tab.history") }))
    const title = await screen.findByText(tCatalog("layers.empty.title"))
    expect(title).not.toBeNull()
    expect(screen.getByText(tCatalog("layers.empty.body"))).not.toBeNull()
    const empty = title.closest<HTMLElement>("[data-slot='state-view']")
    if (empty === null) {
      throw new Error("the empty title sits in no state view")
    }
    expect(
      within(empty).getAllByRole("button", {
        name: tCatalog("layers.empty.action"),
      })
    ).toHaveLength(1)
    expect(document.querySelector("img")).toBeNull()
  })
})

describe("the model of each Layers mode", () => {
  it("opens Split, Edit, Relight and Fill each on its own graph", async () => {
    openLayers({ runs: [], hasCatalog: true })
    expect(await pickerNamed(splitGraph.name)).not.toBeNull()
    const modes = [
      ["edit", editGraph.name],
      ["relight", relightGraph.name],
      ["fill", fillGraph.name],
      ["split", splitGraph.name],
    ] as const
    for (const [mode, name] of modes) {
      fireEvent.click(
        screen.getByRole("tab", {
          name: tCatalog(`layers.choice.mode.${mode}`),
        })
      )
      expect(await pickerNamed(name)).not.toBeNull()
    }
  })

  it("hides the count when you pick a split model whose schema takes none", async () => {
    openLayers({ runs: [], hasCatalog: true, use: photo })
    const label = tCatalog("layers.input.count.label")
    expect(await screen.findAllByText(label)).not.toHaveLength(0)
    fireEvent.click(await pickerNamed(splitGraph.name))
    fireEvent.click(await screen.findByRole("option", { name: seedream.name }))
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(screen.queryAllByText(label)).toHaveLength(0)
  })
})

describe("the Layers mode row", () => {
  it("is the one tab row at the column's top, and no mode segment sits in the column", async () => {
    openLayers({ runs: [], hasCatalog: true })
    await pickerNamed(splitGraph.name)
    const label = tCatalog("layers.input.mode.label")
    const tabs = screen.getByRole("tablist", { name: label })
    expect(tabs.querySelectorAll("[role=tab]").length).toBe(4)
    expect(screen.queryByRole("radiogroup", { name: label })).toBeNull()
  })
})

describe("the Layers column on Split", () => {
  it("shows the image, then the model once, then the quality and the count, with the seed closed under Advanced", async () => {
    openLayers({ runs: [], hasCatalog: true })
    const model = await pickerNamed(splitGraph.name)
    const [image] = screen.getAllByText(tCatalog("layers.input.source.label"))
    const quality = screen.getByText(tCatalog("layers.input.quality.label"))
    const [count] = screen.getAllByText(tCatalog("layers.input.count.label"))
    const advanced = screen.getByRole("button", { name: t("field.advanced") })
    const after = (first: Element | undefined, second: Element): boolean =>
      first !== undefined &&
      (first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
        0
    expect(after(image, model)).toBe(true)
    expect(after(model, quality)).toBe(true)
    expect(after(quality, count ?? quality)).toBe(true)
    expect(after(count, advanced)).toBe(true)
    expect(screen.queryByText(tCatalog("layers.input.seed.label"))).toBeNull()
  })
})

describe("Use these inputs on a hosted split run in History", () => {
  const hostedSplit = layersRun({
    id: "6c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f",
    minute: 5,
    inputs: { mode: "split", model: seedream.id, image: [photo], size: "2K" },
    outputs: [firstLayer, secondLayer],
  })

  it("fills the image and the model and shows that run's stack", async () => {
    openLayers({ runs: [hostedSplit], from: hostedSplit, hasCatalog: true })
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    ).not.toBeNull()
    expect(
      screen.getAllByRole("list", { name: tCatalog("layers.stack.title") })
    ).not.toHaveLength(0)
  })
})

describe("Use these inputs on a run History already holds", () => {
  const heldSplit = layersRun({
    id: "8e2f3041-5b6c-4d7e-9f80-a12b3c4d5e6f",
    minute: 5,
    inputs: { mode: "split", model: seedream.id, image: [photo], size: "2K" },
    outputs: [firstLayer, secondLayer],
  })

  it("fills the form from the held run and never asks for it again", async () => {
    openLayers({
      runs: [heldSplit],
      from: heldSplit,
      isFromFetched: false,
      hasCatalog: true,
    })
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    ).not.toBeNull()
    expect(asked).toContain(catalogPath)
    expect(asked.filter((path) => path.includes(heldSplit.id))).toEqual([])
  })

  it("control: asks for a run History does not hold", async () => {
    served.push(heldSplit)
    openLayers({
      runs: [],
      from: heldSplit,
      isFromFetched: false,
      hasCatalog: true,
    })
    expect(await pickerNamed(seedream.name)).not.toBeNull()
    expect(
      await screen.findByRole("button", { name: t("field.asset.remove") })
    ).not.toBeNull()
    expect(asked).toContain(`/api/runs/${heldSplit.id}`)
  })
})

describe("Layers on a phone", () => {
  it("fills the stage with the canvas and puts the layer strip at its bottom edge", async () => {
    asPhone()
    openLayers({
      runs: [
        layersRun({
          id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
          minute: 0,
          inputs: { mode: "split" },
          outputs: [firstLayer, secondLayer],
        }),
      ],
    })
    const strip = await screen.findByRole("list", {
      name: tCatalog("layers.stack.title"),
    })
    const stack = strip.closest("[data-slot='layers-phone-stack']")
    expect(stack).not.toBeNull()
    expect(stack?.lastElementChild?.contains(strip)).toBe(true)
    expect(
      stack?.querySelector("[data-slot='layers-phone-canvas']")
    ).not.toBeNull()
    expect(
      screen.getAllByRole("list", { name: tCatalog("layers.stack.title") })
    ).toHaveLength(1)
  })
})

describe("the open stack", () => {
  it("shows its canvas first, with the run's facts over it and no caption line above it", async () => {
    openLayers({
      runs: [
        layersRun({
          id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
          minute: 0,
          inputs: { mode: "split" },
          outputs: [firstLayer, secondLayer],
        }),
      ],
    })
    const canvas = await screen.findByRole("figure", {
      name: tCatalog("layers.canvas.label"),
    })
    expect(
      canvas.querySelector("[data-slot='run-facts']")?.textContent
    ).not.toBe("")
    const section = canvas.closest("section")
    expect(section?.querySelectorAll("[data-slot='run-facts']")).toHaveLength(1)
    expect(section?.querySelector("[data-slot='run-prompt']")).toBeNull()
  })
})

describe("the earlier runs under the open stack", () => {
  const stackRun = layersRun({
    id: "7d1e2f30-4a5b-4c6d-8e7f-901a2b3c4d5e",
    minute: 2,
    inputs: { mode: "split" },
    outputs: [firstLayer, secondLayer],
  })
  const olderRun = layersRun({
    id: "8e2f3041-5b6c-4d7e-8f90-a1b2c3d4e5f6",
    minute: 0,
    inputs: { mode: "split", change: "a red hat on a chair" },
    outputs: [editedLayer],
  })

  function keepView(layout: "list" | "grid", size: number): void {
    window.localStorage.setItem(
      "rosesfield.view.app",
      JSON.stringify({ layout, size })
    )
  }

  function earlier(): Element | null {
    return document.querySelector(
      "[data-slot='layers-canvas-area'] > :last-child"
    )
  }

  afterEach(() => window.localStorage.clear())

  it("show as results on Grid and as run cards by the view's columns on List, with the stack kept", async () => {
    keepView("grid", 1)
    openLayers({ runs: [stackRun, olderRun] })
    await screen.findByRole("figure", { name: tCatalog("layers.canvas.label") })
    await vi.waitFor(() =>
      expect(
        earlier()?.querySelectorAll("[data-slot='grid-item']")
      ).toHaveLength(1)
    )
    cleanup()
    keepView("list", 0)
    openLayers({ runs: [stackRun, olderRun] })
    await screen.findByRole("figure", { name: tCatalog("layers.canvas.label") })
    await vi.waitFor(() =>
      expect(earlier()?.getAttribute("data-columns")).toBe("3")
    )
    expect(earlier()?.querySelectorAll("[data-slot='run-card']")).toHaveLength(
      1
    )
  })

  it("keep the ones that hold every word, and show the one no-match state under the stack", async () => {
    keepView("list", 1)
    openLayers({ runs: [stackRun, olderRun] })
    await screen.findByRole("figure", { name: tCatalog("layers.canvas.label") })
    fireEvent.click(
      screen.getByRole("button", { name: t("library.search.open") })
    )
    const field = await screen.findByRole("searchbox", {
      name: t("app.search.label"),
    })
    fireEvent.change(field, { target: { value: "red hat" } })
    await vi.waitFor(() =>
      expect(
        earlier()?.querySelectorAll("[data-slot='run-card']")
      ).toHaveLength(1)
    )
    fireEvent.change(field, { target: { value: "zebra" } })
    await screen.findByText(t("library.filterEmpty.title"))
    expect(
      screen.getByRole("figure", { name: tCatalog("layers.canvas.label") })
    ).toBeTruthy()
  })
})
