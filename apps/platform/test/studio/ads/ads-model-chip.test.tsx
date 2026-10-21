import { adsHostedModel } from "@rosesfield/catalog/ads"
import {
  type CatalogModel,
  factsOf,
  graphMaker,
} from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { choiceMakerOf } from "@/screens/app/bar/model-settings"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { AdsModelChip } from "@/studio/ads/ads-model-settings"
import type { AdsScreenState } from "@/studio/ads/use-ads-screen"
import { app } from "../../../../../packages/catalog/src/ads/app"

afterEach(cleanup)

const listing = appListing.parse(app)
const model = listing.inputs.find((input) => input.name === "model")
const options = model?.type === "choice" ? model.options : []
const chosenByDefault = model?.type === "choice" ? model.default : ""

const noCatalog: HostedState = {
  isTaskApp: false,
  models: [],
  isLoading: false,
  error: null,
  keyState: "set",
  defaultModel: null,
  chosen: null,
  fields: null,
  ranBefore: [],
  choose: () => undefined,
}

function stateWith(chosen: Record<string, FieldValue>[]): AdsScreenState {
  const form: AppForm = {
    values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
    problems: new Map(),
    setInput: (name, value) => chosen.push({ [name]: value }),
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  return {
    countApp: listing,
    form,
    lastSeed: null,
    hosted: noCatalog,
  } as unknown as AdsScreenState
}

describe("the Ads model chip", () => {
  it("is the shared model chip: the lab mark, the name and a chevron", () => {
    render(<AdsModelChip app={listing} state={catalogState([])} chips={[]} />)
    const name = tCatalog(
      options.find((one) => one.value === chosenByDefault)?.labelKey ?? ""
    )
    const chip = screen.getByRole("button", {
      name: `${t("model.picker.title")} ${name}`,
    })
    expect(chip.getAttribute("data-place")).toBe("trigger")
    expect(chip.textContent).not.toContain(t("bar.model"))
    expect(chip.querySelector("[data-slot=lab-mark]")).not.toBeNull()
    expect(chip.querySelector("svg.lucide-chevron-right")).not.toBeNull()
  })

  it("opens the 402 px list with Qwen Image Edit 2511 first and FLUX 3 Image one choice away", () => {
    render(<AdsModelChip app={listing} state={catalogState([])} chips={[]} />)
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`^${t("model.picker.title")} `),
      })
    )
    const picker = document.querySelector("[data-slot=model-picker]")
    expect(picker?.className).toContain("w-100.5")
    expect(picker?.getAttribute("data-side")).toBe("top")
    expect(picker?.getAttribute("data-align")).toBe("start")
    expect(screen.getByRole("searchbox")).toBeTruthy()
    const featured = screen.getByRole("group", {
      name: t("model.picker.featured"),
    })
    expect(
      [...featured.querySelectorAll("[data-model]")].map((row) =>
        row.getAttribute("data-model")
      )
    ).toEqual([chosenByDefault, adsHostedModel])
  })

  it("names the lab by its weights' publisher", () => {
    expect(choiceMakerOf("qwen-image-edit-2511", "Qwen Image Edit 2511")).toBe(
      "Qwen"
    )
    expect(choiceMakerOf("z-image-turbo", "Z-Image Turbo")).toBe("Tongyi-MAI")
    expect(choiceMakerOf("unknown-model", "Some Model")).toBe("Some Model")
  })
})

const qwen: CatalogModel = {
  id: "qwen-image-edit-2511",
  kind: "graph",
  maker: graphMaker,
  name: "Qwen Image Edit 2511",
  nameKey: "ads.model.qwenImageEdit2511",
  task: "image-edit",
  tags: [{ kind: "open-weights" }],
  form: null,
}

const flux: CatalogModel = {
  id: "bfl/flux-3-image",
  kind: "hosted",
  maker: "Black Forest Labs",
  name: "FLUX 3 Image",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "hosted" }, { kind: "references", max: 10 }],
  form: [
    {
      kind: "media",
      name: "input_images",
      path: "input_images",
      required: true,
      media: "image",
      min: 1,
      max: 10,
    },
  ],
  facts: factsOf("bfl/flux-3-image", "image-edit"),
}

const oneImage: CatalogModel = {
  id: "ideogram/ideogram-4.5-edit",
  kind: "hosted",
  maker: "Ideogram",
  name: "Ideogram 4.5 Edit",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "hosted" }],
  form: [
    {
      kind: "media",
      name: "image",
      path: "image",
      required: true,
      media: "image",
      min: 1,
      max: 1,
    },
    {
      kind: "media",
      name: "mask",
      path: "mask",
      required: false,
      media: "image",
      min: 0,
      max: 4,
    },
  ],
}

function catalogState(chosen: Record<string, FieldValue>[]): AdsScreenState {
  const state = stateWith(chosen)
  const hosted: HostedState = {
    ...noCatalog,
    isTaskApp: true,
    models: [qwen, oneImage, flux],
    defaultModel: qwen.id,
    chosen: qwen,
    choose: (id) => state.form.setInput("model", id),
  }
  return { ...state, hosted }
}

function rowOf(id: string): HTMLElement {
  const row = document
    .querySelector(`[data-model="${id}"]`)
    ?.closest<HTMLElement>("[data-slot=model-row]")
  if (row === null || row === undefined) {
    throw new Error(`no row for ${id}`)
  }
  return row
}

describe("the Ads model menu from the catalog", () => {
  it("opens on Qwen Image Edit 2511 and lists every model of the task with its maker, its name, its line and its photos", () => {
    const chosen: Record<string, FieldValue>[] = []
    render(
      <AdsModelChip app={listing} state={catalogState(chosen)} chips={[]} />
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: `${t("model.picker.title")} ${tCatalog(qwen.nameKey ?? "")}`,
      })
    )
    const featured = screen.getByRole("group", {
      name: t("model.picker.featured"),
    })
    expect(
      featured
        .querySelector(`[data-model="${qwen.id}"]`)
        ?.getAttribute("aria-selected")
    ).toBe("true")
    const qwenRow = rowOf(qwen.id)
    expect(qwenRow.textContent).toContain(tCatalog(`${qwen.nameKey}.line`))
    expect(qwenRow.textContent).toContain(t("model.tag.references", { max: 3 }))
    const fluxRow = rowOf(flux.id)
    expect(fluxRow.textContent).toContain("FLUX 3 Image")
    expect(
      fluxRow.querySelector("[data-slot=lab-mark]")?.getAttribute("data-maker")
    ).toBe("Black Forest Labs")
    const fluxPhotos = t("model.tag.references", { max: 10 })
    expect(fluxRow.textContent?.split(fluxPhotos)).toHaveLength(2)
    expect(rowOf(oneImage.id).textContent).toContain(
      t("model.tag.references", { max: 1 })
    )
    const button = fluxRow.querySelector("[data-model]")
    if (!(button instanceof HTMLElement)) {
      throw new Error("no button on the FLUX 3 Image row")
    }
    fireEvent.click(button)
    expect(chosen).toEqual([{ model: flux.id }])
  })
})
