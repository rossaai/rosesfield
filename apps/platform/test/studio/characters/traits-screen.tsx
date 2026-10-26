import { findApp } from "@rosesfield/catalog"
import { traitPrompt } from "@rosesfield/catalog/characters"
import { type CatalogModel, factsOf } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { runsQuery, settingsQuery } from "@/api/queries"
import { formatAmount } from "@/copy/format"
import { t } from "@/copy/t"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { modelCatalogQuery } from "@/screens/app/hosted/model-catalog-query"
import { type AppSeeds, noSeeds } from "@/screens/app/use-app-screen"
import { AppScreen } from "@/studio/characters/screen"
import { flux, qwen, zImage } from "../image/image-screen"

export const characters = appListing.parse(findApp("characters"))

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
  keyFrom: "server",
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

export const counted: CatalogModel = {
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

export const anglesEdit: CatalogModel = {
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

export const characterId = characterIdFormat.parse(
  "2d3e4f50-6172-4c8d-8e9f-1a2b3c4d5e6f"
)
export const photos = [
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02",
].map((photo) => assetIdFormat.parse(photo))
export const anglesRunId = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d"

export const graphCredits = 4.5
export const fluxCredits = 12.37
export const viewCredits = 2.5

function creditsOf(model: unknown): number {
  if (model === flux.id) {
    return fluxCredits
  }
  return model === anglesEdit.id ? viewCredits : graphCredits
}

export type Call = { url: string; method: string; body: unknown; key: string }

export const calls: Call[] = []

type RunAnswer = (call: Call) => Response | null

let answerRun: RunAnswer = () => null

export function answerRunsWith(answer: RunAnswer): void {
  answerRun = answer
}

function bodyOf(init?: { body?: unknown }): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : null
}

export function modelOf(body: unknown): unknown {
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

export function stubGateway(): void {
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

const servedFlux: CatalogModel = {
  ...flux,
  facts: factsOf(flux.id, flux.task),
}

export function openCharacters(
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
    models: [zImage, qwen, servedFlux, counted, editModel, anglesEdit],
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

export async function findColumnGenerate(): Promise<HTMLElement> {
  const buttons = await screen.findAllByRole("button", {
    name: t("run.generate"),
  })
  const generate = buttons.find(
    (button) => button.dataset.slot === "generate-button"
  )
  if (generate === undefined) {
    throw new Error("The column shows no Generate button")
  }
  return generate
}

export function pricedName(credits: number): string {
  return t("run.generate.priced", { amount: formatAmount(credits) })
}

export function trigger(model: CatalogModel): string {
  return `${t("model.picker.title")} ${modelNameOf(model)}`
}

export async function aspectsIn(caption: string): Promise<string[]> {
  fireEvent.click(screen.getByRole("combobox", { name: caption }))
  const options = await screen.findAllByRole("option")
  const labels = options.map((option) => option.textContent ?? "")
  fireEvent.keyDown(options[0] ?? document.body, { key: "Escape" })
  return labels
}

export async function pick(model: CatalogModel): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: trigger(zImage) }))
  fireEvent.click(
    await screen.findByRole("option", { name: modelNameOf(model) })
  )
  await screen.findByRole("button", { name: trigger(model) })
}

export function pickFlux(): Promise<void> {
  return pick(flux)
}

export function highestCount(): string {
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

export function fragmentsOf(name: string): string[] {
  const base = traitPrompt({})
  const input = characters.inputs.find((one) => one.name === name)
  const values =
    input?.type === "choice" ? input.options.map((option) => option.value) : []
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

export function startedBodies(): unknown[] {
  return calls
    .filter(
      (call) =>
        call.method === "POST" &&
        call.url.endsWith(`/api/apps/${characters.id}/runs`)
    )
    .map((call) => call.body)
}

export function promptOf(body: unknown): string {
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

export function inputNamesOf(body: unknown): string[] {
  if (typeof body !== "object" || body === null || !("inputs" in body)) {
    return []
  }
  const { inputs } = body
  return typeof inputs === "object" && inputs !== null
    ? Object.keys(inputs)
    : []
}
