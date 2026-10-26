import { traitNames } from "@rosesfield/catalog/characters"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { aspectItems } from "@/screens/app/fields/output-fields"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { fieldCaption } from "@/screens/app/hosted/field-words"
import { flux, qwen, zImage } from "../image/image-screen"
import {
  aspectsIn,
  characters,
  counted,
  fluxCredits,
  fragmentsOf,
  graphCredits,
  highestCount,
  inputNamesOf,
  modelOf,
  openCharacters,
  pick,
  pickFlux,
  pricedName,
  promptOf,
  startedBodies,
  stubGateway,
  trigger,
} from "./traits-screen"

beforeEach(stubGateway)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the traits of Characters", () => {
  it("open on the catalog's open-weights default for text to image, with its price in Comfy credits on Generate", async () => {
    openCharacters()
    expect(
      await screen.findByRole("button", { name: trigger(zImage) })
    ).toBeDefined()
    expect(
      await screen.findByRole("button", { name: pricedName(graphCredits) })
    ).toBeDefined()
  })

  it("list every model of the catalog that makes an image from text, each with its maker and its name", async () => {
    openCharacters()
    fireEvent.click(
      await screen.findByRole("button", { name: trigger(zImage) })
    )
    const options = await screen.findAllByRole("option")
    expect(new Set(options.map((option) => option.dataset.model))).toEqual(
      new Set([zImage.id, qwen.id, flux.id, counted.id])
    )
    const fluxRow = options.find((option) => option.dataset.model === flux.id)
    const row = fluxRow?.parentElement
    const text = row?.textContent ?? ""
    expect(text).toContain(modelNameOf(flux))
    expect(
      row?.querySelector<HTMLElement>("[data-slot=lab-mark]")?.dataset.maker
    ).toBe(flux.maker)
  })

  it("change the ratio choices to the ones the picked model's schema declares, and the price with them", async () => {
    openCharacters()
    await screen.findByRole("button", { name: pricedName(graphCredits) })
    expect(aspectsIn(t("field.aspect.label"))).toEqual(
      aspectItems(characters).map((item) => item.label)
    )
    await pickFlux()
    expect(
      screen.queryByRole("radiogroup", { name: t("field.aspect.label") })
    ).toBeNull()
    const aspect = flux.form?.find((field) => field.name === "aspectRatio")
    if (aspect === undefined) {
      throw new Error("FLUX 3 Image declares no aspect")
    }
    const caption = fieldCaption(aspect)
    expect(aspectsIn(caption)).toEqual(["1:1", "16:9"])
    expect(
      await screen.findByRole("button", { name: pricedName(fluxCredits) })
    ).toBeDefined()
  })

  it("change the count choices to the ones the picked model's schema declares", async () => {
    openCharacters()
    await screen.findByRole("button", { name: pricedName(graphCredits) })
    expect(highestCount()).toBe("4")
    await pick(counted)
    expect(highestCount()).toBe("2")
  })
})

describe("the traits column", () => {
  it("shows the details, then the model once, then the format and the plain background, with the seed closed under Advanced", async () => {
    openCharacters()
    const model = await screen.findByRole("button", { name: trigger(zImage) })
    await screen.findByRole("button", { name: pricedName(graphCredits) })
    const details = screen.getByRole("textbox")
    const format = screen.getByRole("radiogroup", {
      name: t("field.aspect.label"),
    })
    const plain = screen.getByRole("switch")
    const advanced = screen.getByRole("button", { name: t("field.advanced") })
    const after = (first: Element, second: Element): boolean =>
      (first.compareDocumentPosition(second) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
      0
    expect(after(details, model)).toBe(true)
    expect(after(model, format)).toBe(true)
    expect(after(format, plain)).toBe(true)
    expect(after(plain, advanced)).toBe(true)
    expect(screen.queryByText(t("field.seed.label"))).toBeNull()
  })
})

describe("the random button", () => {
  it("fills every trait group, and Generate sends those traits as words in the picked model's prompt, with the count you chose", async () => {
    openCharacters()
    await pickFlux()
    fireEvent.click(
      screen.getByRole("button", {
        name: tCatalog("characters.studio.random"),
      })
    )
    fireEvent.click(
      await screen.findByRole("button", { name: pricedName(fluxCredits) })
    )
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(1))
    const [body] = startedBodies()
    const prompt = promptOf(body)
    const isBald = prompt.includes(", a bald head")
    for (const name of traitNames) {
      if (isBald && (name === "hairStyle" || name === "hairColor")) {
        continue
      }
      const fragments = fragmentsOf(name)
      expect(fragments.length).toBeGreaterThan(0)
      expect(fragments.some((fragment) => prompt.includes(fragment))).toBe(true)
    }
    expect(modelOf(body)).toBe(flux.id)
    expect(body).toMatchObject({ count: 2 })
    expect(
      inputNamesOf(body).filter((name) =>
        traitNames.some((trait) => trait === name)
      )
    ).toEqual([])
  })
})
