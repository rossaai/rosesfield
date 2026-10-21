import { findApp } from "@rosesfield/catalog"
import { traitNames, traitPrompt } from "@rosesfield/catalog/characters"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { aspectItems } from "@/screens/app/fields/output-fields"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/characters/screen"
import { flux, qwen, zImage } from "../image/image-screen"

const characters = appListing.parse(findApp("characters"))

const keyState = "set"

const settings: GatewaySettings = {
  mode: "owner",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: keyState,
    origin: "live",
  },
  lock: "local",
  agent: "unknown",
  agentModel: null,
  retentionDays: null,
}

const editModel: CatalogModel = {
  id: "bfl/flux-3-image-edit",
  kind: "hosted",
  maker: "Black Forest Labs",
  name: "FLUX 3 Image Edit",
  nameKey: null,
  task: "image-edit",
  tags: [],
  form: null,
}

const counted: CatalogModel = {
  id: "maker/picture-2",
  kind: "hosted",
  maker: "Maker",
  name: "Picture 2",
  nameKey: null,
  task: "text-to-image",
  tags: [],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: null,
      default: null,
    },
    {
      kind: "number",
      name: "num_images",
      path: "num_images",
      required: false,
      min: 1,
      max: 2,
      integer: true,
      default: 1,
    },
  ],
}

const graphCredits = 4.5
const fluxCredits = 12.37

type Call = { url: string; method: string; body: unknown }

const calls: Call[] = []

function bodyOf(init?: { body?: unknown }): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : null
}

function modelOf(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("inputs" in body)) {
    return undefined
  }
  const { inputs } = body
  return typeof inputs === "object" && inputs !== null && "model" in inputs
    ? inputs.model
    : undefined
}

function stubGateway(): void {
  calls.length = 0
  vi.stubGlobal(
    "fetch",
    (input: unknown, init?: { method?: string; body?: unknown }) => {
      const url = String(input)
      const body = bodyOf(init)
      calls.push({ url, method: init?.method ?? "GET", body })
      if (url.endsWith(`/api/apps/${characters.id}/price`)) {
        const credits = modelOf(body) === flux.id ? fluxCredits : graphCredits
        return Promise.resolve(
          new Response(
            JSON.stringify({ price: { source: "rates", credits } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      }
      return new Promise(() => undefined)
    }
  )
}

function openCharacters(): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(modelCatalogQuery(characters.id, keyState).queryKey, {
    models: [zImage, qwen, flux, counted, editModel],
    defaultModel: zImage.id,
    refusal: null,
  })
  client.setQueryData(runsQuery(characters.id).queryKey, {
    pages: [{ runs: [], next: null }],
    pageParams: [null],
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <TooltipProvider>
            <AppScreen app={characters} seeds={noSeeds} />
          </TooltipProvider>
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function pricedName(credits: number): string {
  return t("run.generate.priced", { amount: formatNumber(credits) })
}

function trigger(model: CatalogModel): string {
  return `${t("model.picker.title")} ${modelNameOf(model)}`
}

function aspectsIn(caption: string): string[] {
  const group = screen.getByRole("radiogroup", { name: caption })
  return within(group)
    .getAllByRole("radio")
    .map((radio) => radio.textContent ?? "")
}

async function pick(model: CatalogModel): Promise<void> {
  fireEvent.click(
    await screen.findByRole("button", { name: trigger(zImage) })
  )
  fireEvent.click(
    await screen.findByRole("option", { name: modelNameOf(model) })
  )
  await screen.findByRole("button", { name: trigger(model) })
}

function pickFlux(): Promise<void> {
  return pick(flux)
}

function highestCount(): string {
  const group = screen.getByRole("group", { name: t("field.count.label") })
  const more = within(group).getByRole("button", {
    name: t("field.number.increase"),
  })
  for (let press = 0; press < 8 && !more.hasAttribute("disabled"); ) {
    fireEvent.click(more)
    press += 1
  }
  return group.querySelector("output")?.textContent ?? ""
}

function fragmentsOf(name: string): string[] {
  const base = traitPrompt({})
  const input = characters.inputs.find((one) => one.name === name)
  const values =
    input?.type === "choice"
      ? input.options.map((option) => option.value)
      : []
  return values
    .filter((value) => value !== "auto")
    .map((value) => {
      const one = traitPrompt({ [name]: value })
      let start = 0
      while (one[start] === base[start]) {
        start += 1
      }
      return one.slice(start, start + one.length - base.length)
    })
}

function startedBodies(): unknown[] {
  return calls
    .filter(
      (call) =>
        call.method === "POST" &&
        call.url.endsWith(`/api/apps/${characters.id}/runs`)
    )
    .map((call) => call.body)
}

function promptOf(body: unknown): string {
  if (typeof body !== "object" || body === null || !("inputs" in body)) {
    return ""
  }
  const { inputs } = body
  return typeof inputs === "object" &&
    inputs !== null &&
    "prompt" in inputs &&
    typeof inputs.prompt === "string"
    ? inputs.prompt
    : ""
}

function inputNamesOf(body: unknown): string[] {
  if (typeof body !== "object" || body === null || !("inputs" in body)) {
    return []
  }
  const { inputs } = body
  return typeof inputs === "object" && inputs !== null
    ? Object.keys(inputs)
    : []
}

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

  it("list every model of the catalog that makes an image from text, each with its maker, its name and one line", async () => {
    openCharacters()
    fireEvent.click(
      await screen.findByRole("button", { name: trigger(zImage) })
    )
    const options = await screen.findAllByRole("option")
    expect(new Set(options.map((option) => option.dataset.model))).toEqual(
      new Set([zImage.id, qwen.id, flux.id, counted.id])
    )
    const fluxRow = options.find((option) => option.dataset.model === flux.id)
    const text = fluxRow?.parentElement?.textContent ?? ""
    expect(text).toContain(modelNameOf(flux))
    expect(text).toContain(flux.maker)
    expect(text).toContain(t("model.line.textToImage"))
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
    expect(aspectsIn(fieldCaption(aspect))).toEqual(["1:1", "16:9"])
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
      expect(fragments.some((fragment) => prompt.includes(fragment))).toBe(
        true
      )
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
