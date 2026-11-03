import { findApp } from "@rosesfield/catalog"
import {
  type CatalogModel,
  factsOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultsOf, type FormValues } from "@/screens/app/app-form"
import { modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { keepLastUsed } from "@/screens/app/hosted/last-used"
import { useHostedModel } from "@/screens/app/hosted/use-hosted-model"
import { HowItWorks } from "@/screens/app/how-it-works"
import type { AppForm } from "@/screens/app/use-app-form"
import { publishedQuery } from "@/screens/explore/share-api"

const speech = appListing.parse(findApp("speech"))

const voiceFields: readonly ModelField[] = [
  {
    kind: "prompt",
    name: "text",
    path: "inputs.[].text",
    required: true,
    maxLength: null,
    default: null,
  },
]

function hostedOf(id: string, name: string): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker: "ElevenLabs",
    name,
    nameKey: null,
    task: "speech",
    tags: [{ kind: "hosted" }],
    form: [...voiceFields],
    facts: factsOf(id),
  }
}

const chatterbox: CatalogModel = {
  id: "chatterbox",
  kind: "graph",
  maker: "Resemble AI",
  name: "Chatterbox",
  nameKey: "audio.model.chatterbox",
  task: "speech",
  tags: [],
  form: null,
  facts: factsOf("graph/chatterbox"),
}

const speechModels: readonly CatalogModel[] = [
  chatterbox,
  hostedOf("elevenlabs/eleven_v3", "Eleven v3"),
  hostedOf("elevenlabs/eleven_v4", "Eleven V4"),
  hostedOf("elevenlabs/eleven_v4_turbo", "Eleven V4 Turbo"),
]

function useForm(seed: FormValues): AppForm {
  const [values, setValues] = useState<FormValues>(seed)
  return {
    values,
    source: "defaults",
    problems: new Map(),
    setInput: (name, value) =>
      setValues((current) => ({
        ...current,
        inputs: { ...current.inputs, [name]: value },
      })),
    setForm: (change) => setValues((current) => ({ ...current, ...change })),
    fill: setValues,
    validate: () => true,
    register: () => undefined,
  }
}

function Probe() {
  const hosted = useHostedModel(speech, useForm(defaultsOf(speech)))
  return (
    <>
      <output data-testid="picker">
        {hosted.chosen === null ? "" : modelNameOf(hosted.chosen)}
      </output>
      <HowItWorks app={speech} />
    </>
  )
}

function renderSpeech(models: readonly CatalogModel[]): void {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
  })
  client.setQueryData(["settings"], { engine: { key: "set" } })
  client.setQueryData(["models", speech.id, "set"], {
    models: [...models],
    defaultModel: null,
    refusal: null,
  })
  client.setQueryData(publishedQuery.queryKey, [])
  const router = createRouter({
    routeTree: createRootRoute({ component: Probe }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function pickerName(): string {
  return document.querySelector("[data-testid=picker]")?.textContent ?? ""
}

function cardName(): string | null {
  return (
    document.querySelector("[data-step=choose] [data-slot=how-model]")
      ?.textContent ?? null
  )
}

async function openedNames(): Promise<{ picker: string; card: string | null }> {
  await waitFor(() => expect(pickerName()).not.toBe(""))
  await waitFor(() => expect(cardName()).not.toBeNull())
  return { picker: pickerName(), card: cardName() }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe("the How card's model, with no example to show", () => {
  it("names the model Speech's picker opens on, its #1 by rank, never the listing's Chatterbox", async () => {
    renderSpeech(speechModels)
    const names = await openedNames()
    expect(names.picker).not.toBe(modelNameOf(chatterbox))
    expect(names.card).toBe(names.picker)
  })

  it("names the model you last used in Speech when the picker opens on it", async () => {
    keepLastUsed(speech.id, { model: "elevenlabs/eleven_v3", settings: {} })
    renderSpeech(speechModels)
    const names = await openedNames()
    expect(names.picker).toBe("Eleven v3")
    expect(names.card).toBe("Eleven v3")
  })

  it("control: names Chatterbox when Chatterbox is the only model the picker lists", async () => {
    renderSpeech([chatterbox])
    const names = await openedNames()
    expect(names.picker).toBe(modelNameOf(chatterbox))
    expect(names.card).toBe(modelNameOf(chatterbox))
  })
})

const minimaxH3 = hostedOf("minimax/h3", "MiniMax H3")

function cardNameElement(): HTMLElement {
  const shown = document.querySelector<HTMLElement>(
    "[data-step=choose] [data-slot=how-model]"
  )
  if (shown === null) {
    throw new Error("the How card names no model")
  }
  return shown
}

function cutToRoom(text: number, room: number): void {
  const shown = cardNameElement()
  Object.defineProperty(shown, "scrollWidth", { value: text })
  Object.defineProperty(shown, "clientWidth", { value: room })
}

function tipWords(): string | null {
  return (
    document.querySelector("[data-slot='tooltip-content']")?.textContent ?? null
  )
}

describe("the How card's model name in a narrow card", () => {
  it("sets the name on one line cut at its end, never broken inside a word", async () => {
    renderSpeech([minimaxH3])
    await waitFor(() => expect(cardName()).toBe("MiniMax H3"))
    const classes = cardNameElement().classList
    expect(classes.contains("truncate")).toBe(true)
    expect([...classes].filter((one) => one.includes("wrap"))).toEqual([])
  })

  it("shows the whole name in a tooltip when the card cuts it", async () => {
    renderSpeech([minimaxH3])
    await waitFor(() => expect(cardName()).toBe("MiniMax H3"))
    cutToRoom(180, 120)
    fireEvent.focus(cardNameElement())
    await waitFor(() => expect(tipWords()).toBe("MiniMax H3"))
  })

  it("control: shows no tooltip when the whole name fits", async () => {
    renderSpeech([minimaxH3])
    await waitFor(() => expect(cardName()).toBe("MiniMax H3"))
    cutToRoom(120, 180)
    fireEvent.focus(cardNameElement())
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(tipWords()).toBeNull()
  })
})
