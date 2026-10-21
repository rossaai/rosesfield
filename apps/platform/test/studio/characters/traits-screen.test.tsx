import { findApp } from "@rosesfield/catalog"
import {
  anglePromptsOf,
  traitNames,
  traitPrompt,
  viewsOf,
} from "@rosesfield/catalog/characters"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, run } from "@rosesfield/contract"
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
import {
  characterQuery,
  runQuery,
  runsQuery,
  settingsQuery,
} from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { aspectItems } from "@/screens/app/fields/output-fields"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { type AppSeeds, noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/characters/screen"
import { flux, qwen, qwenEdit, zImage } from "../image/image-screen"

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
  place: "bun",
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

const anglesEdit: CatalogModel = {
  id: "maker/turn-2",
  kind: "hosted",
  maker: "Maker",
  name: "Turn 2",
  nameKey: null,
  task: "image-edit",
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
      kind: "media",
      name: "input_images",
      path: "input_images",
      required: false,
      media: "image",
      min: 0,
      max: 3,
    },
  ],
}

const characterId = "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"
const photos = [
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02",
]
const anglesRunId = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d"

const graphCredits = 4.5
const fluxCredits = 12.37
const viewCredits = 2.5

function creditsOf(model: unknown): number {
  if (model === flux.id) {
    return fluxCredits
  }
  return model === anglesEdit.id ? viewCredits : graphCredits
}

type Call = { url: string; method: string; body: unknown; key: string }

const calls: Call[] = []

type RunAnswer = (call: Call) => Response | null

let answerRun: RunAnswer = () => null

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

function keyOf(init?: { headers?: unknown }): string {
  const headers = init?.headers
  if (typeof headers !== "object" || headers === null) {
    return ""
  }
  const key = Object.entries(headers).find(
    ([name]) => name === "Idempotency-Key"
  )?.[1]
  return typeof key === "string" ? key : ""
}

function stubGateway(): void {
  calls.length = 0
  answerRun = () => null
  vi.stubGlobal(
    "fetch",
    (
      input: unknown,
      init?: { method?: string; body?: unknown; headers?: unknown }
    ) => {
      const url = String(input)
      const body = bodyOf(init)
      const call = {
        url,
        method: init?.method ?? "GET",
        body,
        key: keyOf(init),
      }
      calls.push(call)
      const answer = url.endsWith(`/api/apps/${characters.id}/runs`)
        ? answerRun(call)
        : null
      if (answer !== null) {
        return Promise.resolve(answer)
      }
      if (url.endsWith(`/api/apps/${characters.id}/price`)) {
        const credits = creditsOf(modelOf(body))
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

function openCharacters(
  seeds: AppSeeds = noSeeds,
  prime: (client: QueryClient) => void = () => undefined
): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  prime(client)
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(modelCatalogQuery(characters.id, keyState).queryKey, {
    models: [zImage, qwen, flux, counted, editModel, anglesEdit],
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
            <AppScreen app={characters} seeds={seeds} />
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
  return client
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

type AnglesOpen = { model?: CatalogModel; isCharacterRead?: boolean }

function anglesRunOf(id: string, model: CatalogModel) {
  return run.parse({
    id,
    appId: characters.id,
    status: "queued",
    inputs: {
      mode: "angles",
      model: model.id,
      angleSet: "turnaround",
    },
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "comfy-task", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-17T10:00:00.000Z",
    finishedAt: null,
  })
}

function openAngles(open: AnglesOpen = {}): QueryClient {
  const model = open.model ?? anglesEdit
  const shown = run.parse({
    ...anglesRunOf(anglesRunId, model),
    status: "done",
    inputs: {
      mode: "angles",
      model: model.id,
      character: [characterId],
      angleSet: "turnaround",
    },
    outputs: photos.slice(0, 1),
    finishedAt: "2026-10-17T10:00:03.000Z",
  })
  return openCharacters({ use: undefined, from: anglesRunId }, (client) => {
    client.setQueryData(runQuery(anglesRunId).queryKey, { run: shown })
    if (open.isCharacterRead === false) {
      return
    }
    client.setQueryData(characterQuery(characterId).queryKey, {
      character: {
        id: characterId,
        name: "Mara",
        references: photos,
        notes: "",
        createdAt: "2026-10-17T09:00:00.000Z",
      },
    })
  })
}

function priceCalls(): Call[] {
  return calls.filter((call) =>
    call.url.endsWith(`/api/apps/${characters.id}/price`)
  )
}

const viewRunIds = [
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c01",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c02",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c03",
  "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c04",
]

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function viewOf(call: Call): number {
  const found = /-view-(\d)$/.exec(call.key)
  return found === null ? 0 : Number(found[1])
}

describe("the angles of Characters on a hosted image edit model", () => {
  it("price the set at 4 times one view on Generate, and start one run per view, each with the character's photos, the angles mode and the view it asks for", async () => {
    openAngles()
    const generate = await screen.findByRole("button", {
      name: pricedName(viewCredits * 4),
    })
    expect(
      screen.queryByRole("button", { name: pricedName(viewCredits) })
    ).toBeNull()
    fireEvent.click(generate)
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(4))
    const bodies = startedBodies()
    expect(bodies.map(promptOf)).toEqual(anglePromptsOf("turnaround"))
    expect(bodies).toEqual(
      viewsOf("turnaround").map((view, index) => ({
        inputs: {
          mode: "angles",
          model: anglesEdit.id,
          character: [characterId],
          angleSet: "turnaround",
          view,
          prompt: anglePromptsOf("turnaround")[index],
          input_images: photos,
        },
      }))
    )
  })

  it("ask the price of the set once per edit, with no second price request of the plain app form", async () => {
    openAngles()
    await screen.findByRole("button", { name: pricedName(viewCredits * 4) })
    const hosted = priceCalls().filter(
      (call) => modelOf(call.body) === anglesEdit.id
    )
    expect(hosted).toHaveLength(1)
    expect(promptOf(hosted[0]?.body)).toBe(anglePromptsOf("turnaround")[0])
  })

  it("key each view from one key per press and keep each view that starts, so a refused view leaves the started ones in hand and a second press replays them", async () => {
    answerRun = (call) => {
      const view = viewOf(call)
      if (view === 2) {
        return json(400, { error: { code: "RUN_INPUT_INVALID", status: 400 } })
      }
      const id = viewRunIds[view - 1]
      return id === undefined
        ? null
        : json(202, { run: anglesRunOf(id, anglesEdit) })
    }
    const client = openAngles()
    const generate = await screen.findByRole("button", {
      name: pricedName(viewCredits * 4),
    })
    fireEvent.click(generate)
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(4))
    const first = calls.filter((call) => viewOf(call) > 0)
    expect(first.map(viewOf).sort()).toEqual([1, 2, 3, 4])
    const presses = new Set(
      first.map((call) => call.key.replace(/-view-\d$/, ""))
    )
    expect(presses.size).toBe(1)
    expect([...presses][0]).toMatch(/^[0-9a-f-]{36}$/)
    await vi.waitFor(() =>
      expect(client.getQueryData(["run", viewRunIds[0]])).toBeDefined()
    )
    expect(client.getQueryData(["run", viewRunIds[2]])).toBeDefined()
    expect(
      await screen.findByText(t("error.RUN_INPUT_INVALID.title"), {
        exact: false,
      })
    ).toBeDefined()
    fireEvent.click(
      screen.getByRole("button", { name: pricedName(viewCredits * 4) })
    )
    await vi.waitFor(() => expect(startedBodies()).toHaveLength(8))
    const again = calls.filter((call) => viewOf(call) > 0).slice(4)
    expect(again.map((call) => call.key).sort()).toEqual(
      first.map((call) => call.key).sort()
    )
  })

  it("name the next step under the model when the picked model takes no photo, and start no run", async () => {
    openAngles({ model: counted })
    const note = await screen.findByText(tCatalog("video.well.none"))
    const generate = await screen.findByRole("button", {
      name: t("run.generate"),
    })
    fireEvent.click(generate)
    expect(screen.queryByText(t("field.choice.required"))).toBeNull()
    expect(note.isConnected).toBe(true)
    expect(startedBodies()).toEqual([])
  })

  it("control: name no next step when the picked model takes a photo", async () => {
    openAngles()
    await screen.findByRole("button", { name: pricedName(viewCredits * 4) })
    expect(screen.queryByText(tCatalog("video.well.none"))).toBeNull()
  })

  it("keep Generate waiting while the character's photos load, and start no run", async () => {
    openAngles({ isCharacterRead: false })
    const generate = await screen.findByRole("button", {
      name: t("run.generate"),
    })
    expect(generate.getAttribute("aria-busy")).toBe("true")
    fireEvent.click(generate)
    expect(startedBodies()).toEqual([])
  })
})

function anglesPriceModels(): unknown[] {
  return priceCalls()
    .filter((call) => {
      const { body } = call
      return (
        typeof body === "object" &&
        body !== null &&
        "inputs" in body &&
        typeof body.inputs === "object" &&
        body.inputs !== null &&
        "mode" in body.inputs &&
        body.inputs.mode === "angles"
      )
    })
    .map((call) => modelOf(call.body))
}

describe("a fresh Characters screen", () => {
  it("opens the angles on their own default graph, not on the text to image default", async () => {
    openCharacters()
    await screen.findByRole("button", { name: pricedName(graphCredits) })
    await vi.waitFor(() =>
      expect(anglesPriceModels().length).toBeGreaterThan(0)
    )
    expect(new Set(anglesPriceModels())).toEqual(new Set([qwenEdit.id]))
  })
})
