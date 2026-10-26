import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { resetFrames } from "../../screens/app/frame-render"
import { bar, openAds, stubEngine } from "./ads-screen-render"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  resetFrames()
  vi.restoreAllMocks()
})

const graphEdit: CatalogModel = {
  id: "qwen-image-edit-2511",
  kind: "graph",
  maker: "Qwen",
  name: "Qwen Image Edit 2511",
  nameKey: "ads.model.qwenImageEdit2511",
  task: "image-edit",
  tags: [{ kind: "open-weights" }],
  form: null,
}

const otherEdit: CatalogModel = {
  ...graphEdit,
  id: "maker/edit-two",
  kind: "hosted",
  name: "Edit Two",
  nameKey: null,
  tags: [{ kind: "hosted" }],
}

const modelChip = `[aria-label^="${t("model.picker.title")} "]`

function kindChip(dock: HTMLElement): Element | null {
  return dock.querySelector(
    `[data-slot=chip-select][aria-label="${tCatalog("ads.input.kind.label")}"]`
  )
}

describe("the Ads chips", () => {
  it("put the kind first, before the model", async () => {
    openAds({ models: [graphEdit, otherEdit] })
    const dock = await vi.waitFor(bar)
    const model = await vi.waitFor(() => {
      const found = dock.querySelector(modelChip)
      expect(found).not.toBeNull()
      return found
    })
    const kind = kindChip(dock)
    expect(kind).not.toBeNull()
    expect(
      (kind?.compareDocumentPosition(model ?? dock) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("draw no model chip while one model is offered", async () => {
    openAds({ models: [graphEdit] })
    const dock = await vi.waitFor(bar)
    expect(kindChip(dock)).not.toBeNull()
    expect(dock.querySelector(modelChip)).toBeNull()
  })

  it("keep the style under Advanced, so the row fits", async () => {
    openAds({ models: [graphEdit, otherEdit] })
    const dock = await vi.waitFor(bar)
    expect(kindChip(dock)).not.toBeNull()
    expect(
      dock.querySelector(
        `[data-slot=chip-select][aria-label="${tCatalog("ads.input.style.label")}"]`
      )
    ).toBeNull()
    expect(dock.textContent).toContain(t("field.advanced"))
  })
})
