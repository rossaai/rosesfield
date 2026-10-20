import { appListing } from "@rosesfield/contract"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import { choiceMakerOf } from "@/screens/app/bar/model-settings"
import type { AppForm } from "@/screens/app/use-app-form"
import { AdsModelChip } from "@/studio/ads/ads-model-settings"
import type { AdsScreenState } from "@/studio/ads/use-ads-screen"
import { app } from "../../../../../packages/catalog/src/ads/app"

afterEach(cleanup)

const listing = appListing.parse(app)
const model = listing.inputs.find((input) => input.name === "model")
const options = model?.type === "choice" ? model.options : []
const chosenByDefault = model?.type === "choice" ? model.default : ""

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
  return { form, lastSeed: null } as unknown as AdsScreenState
}

function renderChip(): Record<string, FieldValue>[] {
  const chosen: Record<string, FieldValue>[] = []
  render(<AdsModelChip app={listing} state={stateWith(chosen)} chips={[]} />)
  return chosen
}

describe("the Ads model chip", () => {
  it("is the shared model chip: the lab mark, the name and a chevron", () => {
    renderChip()
    const name = tCatalog(
      options.find((one) => one.value === chosenByDefault)?.labelKey ?? ""
    )
    const chip = screen.getByRole("button", {
      name: `${t("model.picker.title")} ${name}`,
    })
    expect(chip.getAttribute("data-place")).toBe("trigger")
    expect(chip.textContent).not.toContain(t("bar.model"))
    const mark = chip.querySelector("[data-slot=lab-mark]")
    expect(mark?.getAttribute("data-maker")).toBe(
      choiceMakerOf(chosenByDefault, name)
    )
    expect(chip.querySelector("svg.lucide-chevron-right")).not.toBeNull()
  })

  it("opens the 402 px list of its models, each with its line, and picks one", () => {
    const chosen = renderChip()
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
    const all = screen.getByRole("group", { name: t("model.picker.all") })
    const rows = all.querySelectorAll("[role=option]")
    expect([...rows].map((row) => row.getAttribute("aria-label"))).toEqual(
      options.map((option) => tCatalog(option.labelKey))
    )
    for (const option of options) {
      expect(all.textContent).toContain(tCatalog(`${option.labelKey}.line`))
    }
    const other = options.find((one) => one.value !== chosenByDefault)
    const row = all.querySelector(`[data-model="${other?.value}"]`)
    if (row === null) {
      throw new Error("no row for the other model")
    }
    fireEvent.click(row)
    expect(chosen).toEqual([{ model: other?.value ?? "" }])
  })

  it("names the lab by its weights' publisher", () => {
    expect(choiceMakerOf("qwen-image-edit-2511", "Qwen Image Edit 2511")).toBe(
      "Qwen"
    )
    expect(choiceMakerOf("flux-2-klein-4b", "FLUX.2 Klein 4B")).toBe(
      "black-forest-labs"
    )
    expect(choiceMakerOf("unknown-model", "Some Model")).toBe("Some Model")
  })
})
