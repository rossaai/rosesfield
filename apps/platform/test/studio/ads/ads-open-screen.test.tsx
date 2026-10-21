import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FormValues } from "@/screens/app/app-form"
import { priceLabelsOf } from "@/screens/app/use-start-run"
import { asPhone, resetFrames } from "../../screens/app/frame-render"
import {
  adsRun,
  attachTile,
  bar,
  character,
  emptyCanvas,
  generate,
  openAds,
  openingValues,
  photos,
  pricedName,
  prompt,
  recreate,
  startedRuns,
  stubEngine,
} from "./ads-screen-render"

beforeEach(stubEngine)

afterEach(() => {
  cleanup()
  resetFrames()
  vi.restoreAllMocks()
})

const adInputs = {
  kind: "ad",
  headline: "Fresh",
  product: [photos[0] ?? ""],
}

const brokenAds = [
  { name: "no headline", text: "", key: "ads.input.headline.required" },
  {
    name: "a headline of 61 characters",
    text: "a".repeat(61),
    key: "ads.input.headline.long",
    values: { max: 60 },
  },
  {
    name: "a second line of 121 characters",
    text: `Fresh\n${"a".repeat(121)}`,
    key: "ads.input.line.long",
    values: { max: 120 },
  },
  {
    name: "3 lines",
    text: "Fresh\nMade daily\nNear you",
    key: "ads.input.line.tooManyLines",
    values: { max: 2 },
  },
]

function alertText(): string {
  return screen
    .getAllByRole("alert")
    .map((alert) => alert.textContent ?? "")
    .join(" ")
}

async function openAd(): Promise<void> {
  openAds({ runs: [adsRun({ inputs: adInputs })] })
  await recreate()
  await vi.waitFor(() => expect(prompt().value).toBe("Fresh"))
}

describe("Ads before any run", () => {
  it("shows the Ads empty title and the empty body, and no example", async () => {
    openAds()
    expect(await emptyCanvas()).toBeDefined()
    expect(screen.getByText(t("app.empty.body"))).toBeDefined()
    const examples = t("app.examples.title", { app: tCatalog("ads.name") })
    expect(screen.queryByText(examples)).toBeNull()
  })
})

describe("the Ads Generate press", () => {
  it("starts no run with no photo, moves focus to the attach button and asks for a photo", async () => {
    openAds()
    await emptyCanvas()
    generate()
    await vi.waitFor(() =>
      expect(alertText()).toContain(tCatalog("ads.input.product.required"))
    )
    expect(attachTile().contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.tagName).toBe("BUTTON")
    expect(startedRuns()).toEqual([])
  })

  it.each(brokenAds)(
    "starts no run for an ad with $name, moves focus to the prompt and names the bound",
    async ({ text, key, values }) => {
      await openAd()
      fireEvent.change(prompt(), { target: { value: text } })
      generate()
      await vi.waitFor(() =>
        expect(alertText()).toContain(tCatalog(key, values))
      )
      expect(document.activeElement).toBe(prompt())
      expect(startedRuns()).toEqual([])
    }
  )

  it("starts no run for more product photos than the model takes beside the character, and names the limit", async () => {
    openAds({
      runs: [
        adsRun({
          inputs: {
            product: [photos[0] ?? ""],
            secondPhoto: [photos[1] ?? ""],
            thirdPhoto: [photos[2] ?? ""],
            character: [character],
          },
        }),
      ],
    })
    await recreate()
    generate()
    await vi.waitFor(() =>
      expect(alertText()).toContain(
        tCatalog("ads.input.model.tooManyPhotos", { max: 3 })
      )
    )
    expect(attachTile().contains(document.activeElement)).toBe(true)
    expect(startedRuns()).toEqual([])
  })
})

describe("the Ads price", () => {
  it("reads Price unknown for a price of 0, and never 0", async () => {
    openAds({ prices: [[openingValues(), 0]] })
    await emptyCanvas()
    await vi.waitFor(() =>
      expect(bar().textContent).toContain(t("run.price.unknown"))
    )
    expect(screen.queryByRole("button", { name: pricedName(0) })).toBeNull()
  })

  it("reads a price below one hundredth of a credit as that price", async () => {
    openAds({ prices: [[openingValues(), 0.004]] })
    const name = priceLabelsOf(0.004, false).priceName ?? ""
    expect(await screen.findByRole("button", { name })).toBeDefined()
    expect(bar().textContent).not.toContain(t("run.price.unknown"))
  })

  it("asks the price of the whole count", async () => {
    const four: FormValues = { ...openingValues(), count: 4 }
    openAds({
      prices: [
        [openingValues(), 14.48],
        [four, 57.92],
      ],
    })
    expect(
      await screen.findByRole("button", { name: pricedName(14.48) })
    ).toBeDefined()
    const more = screen.getByRole("button", { name: t("bar.count.more") })
    for (const _ of [1, 2, 3]) {
      fireEvent.click(more)
    }
    expect(
      await screen.findByRole("button", { name: pricedName(57.92) })
    ).toBeDefined()
  })
})

describe("Use these inputs on Ads", () => {
  it("fills the words, photos, character, kind, style, model, format, count and seed, and starts no run", async () => {
    const inputs = {
      kind: "ad",
      headline: "Fresh",
      line: "Made daily",
      product: [photos[0] ?? ""],
      secondPhoto: [photos[1] ?? ""],
      character: [character],
      style: "bold",
      model: "qwen-image-edit-2511",
    }
    const filled: FormValues = {
      ...openingValues(),
      inputs: { ...openingValues().inputs, ...inputs, seed: 42 },
      seedMode: "fixed",
      count: 3,
      aspectRatio: "3:4",
    }
    openAds({
      runs: [adsRun({ inputs, count: 3, aspectRatio: "3:4", seed: 42 })],
      prices: [[filled, 33.3]],
    })
    await recreate()
    await vi.waitFor(() => expect(prompt().value).toBe("Fresh\nMade daily"))
    expect(
      await screen.findByRole("button", { name: pricedName(33.3) })
    ).toBeDefined()
    expect(startedRuns()).toEqual([])
  })
})

describe("Ads on a phone", () => {
  it("docks the prompt, the attach button, the character button, the Inputs chip and Generate, and the Inputs sheet holds the settings", async () => {
    asPhone()
    openAds()
    const dock = await vi.waitFor(bar)
    expect(dock.querySelector("textarea")).not.toBeNull()
    expect(attachTile()).toBeDefined()
    const mention = `[aria-label="${t("bar.mention")}"]`
    expect(dock.querySelector(mention)).not.toBeNull()
    expect(
      dock.querySelector("[data-slot=prompt-bar] [data-slot=generate-button]")
    ).not.toBeNull()
    expect(dock.textContent).not.toContain(t("model.picker.title"))
    fireEvent.click(screen.getByRole("button", { name: t("app.inputs.open") }))
    const sheet = await screen.findByRole("dialog")
    const text = sheet.textContent ?? ""
    const order = [
      tCatalog("ads.input.kind.label"),
      t("model.picker.title"),
      t("field.aspect.label"),
      t("field.count.label"),
      tCatalog("ads.input.style.label"),
      t("field.advanced"),
    ].map((label) => text.indexOf(label))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(sheet.querySelector("textarea")).toBeNull()
  })

  it("opens with past runs on the newest, at the bottom of the canvas", async () => {
    asPhone()
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(900)
    const scrolled = vi.spyOn(Element.prototype, "scrollTop", "set")
    openAds({ runs: [adsRun({ inputs: { product: [photos[0] ?? ""] } })] })
    await vi.waitFor(bar)
    await vi.waitFor(() => expect(scrolled).toHaveBeenCalledWith(900))
  })
})

const hostedEdit: CatalogModel = {
  id: "maker/edit-two",
  kind: "hosted",
  maker: "Maker",
  name: "Edit Two",
  nameKey: null,
  task: "image-edit",
  tags: [{ kind: "hosted" }, { kind: "references", max: 4 }],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 2000,
      default: null,
    },
    {
      kind: "media",
      name: "input_images",
      path: "input_images",
      required: true,
      media: "image",
      min: 1,
      max: 4,
    },
    {
      kind: "number",
      name: "n",
      path: "n",
      required: false,
      min: 1,
      max: 2,
      integer: true,
      default: 1,
    },
  ],
}

type SentRun = { inputs: Record<string, unknown>; count?: number }

function sentRuns(): SentRun[] {
  return startedRuns().map((call) => {
    const body = call.body
    if (typeof body !== "object" || body === null || !("inputs" in body)) {
      throw new Error("a run started with no inputs")
    }
    return body as SentRun
  })
}

describe("Ads on a hosted model", () => {
  it("shows and sends the count the model takes, 2 for a count of 4", async () => {
    openAds({
      runs: [
        adsRun({
          inputs: { product: [photos[0] ?? ""], model: hostedEdit.id },
          count: 4,
        }),
      ],
      models: [hostedEdit],
    })
    await recreate()
    await vi.waitFor(() =>
      expect(
        bar().querySelector("[data-slot=count-stepper] output")?.textContent
      ).toBe("2/2")
    )
    generate()
    await vi.waitFor(() => expect(startedRuns()).toHaveLength(1))
    expect(sentRuns()[0]?.inputs.n).toBe(2)
  })
})
