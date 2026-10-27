import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing, type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import { type ReactNode, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  defaultsOf,
  type FormValues,
  valuesFromRun,
} from "@/screens/app/app-form"
import { useHostedModel } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm, FormSource } from "@/screens/app/use-app-form"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const listed = appListing.parse(findApp("image"))

const image = appListing.parse({
  ...listed,
  inputs: listed.inputs.map((input) =>
    input.name === "model" && input.type === "choice"
      ? { ...input, default: "z-image-turbo" }
      : input
  ),
})

const flux: CatalogModel = {
  id: "bfl/flux-3-image",
  kind: "hosted",
  maker: "Black Forest Labs",
  name: "FLUX 3 Image",
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
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["auto", "1:1", "16:9"],
      default: "auto",
    },
  ],
  facts: {
    lab: null,
    release: null,
    weights: null,
    lineKey: null,
    scores: {
      "text-to-image": {
        score: 89,
        rank: 1,
        order: 1,
        of: 3,
        sources: [],
        tiers: [],
      },
    },
  },
}

function graph(id: string): CatalogModel {
  return {
    id,
    kind: "graph",
    maker: "comfy-cloud",
    name: id,
    nameKey: null,
    task: "text-to-image",
    tags: [{ kind: "open-weights" }],
    form: null,
  }
}

const photo = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

const list = {
  models: [graph("z-image-turbo"), graph("qwen-image-2512"), flux],
  defaultModel: "bfl/flux-3-image",
  refusal: null,
}

function runOf(model: string): Run {
  return run.parse({
    id: "d05cd6d3-5a6b-4c7d-8e9f-0a1b2c3d4e01",
    appId: "image",
    status: "done",
    inputs: { model, prompt: "a red door", resolution: "2k" },
    count: 2,
    aspectRatio: "16:9",
    seed: 12345,
    outputs: ["0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"],
    progress: null,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T09:00:00.000Z",
    finishedAt: "2026-10-19T09:00:20.000Z",
  })
}

function useFormAt(seed: FormValues, source: FormSource): AppForm {
  const [values, setValues] = useState<FormValues>(seed)
  return {
    values,
    source,
    problems: new Map(),
    setInput: () => undefined,
    setForm: (change) => setValues((current) => ({ ...current, ...change })),
    fill: setValues,
    validate: () => true,
    register: () => undefined,
  }
}

function openHosted(seed: FormValues, source: FormSource, app = image) {
  const client = new QueryClient()
  client.setQueryData(["settings"], { engine: { key: "set" } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const view = renderHook(
    () => {
      const form = useFormAt(seed, source)
      const hosted = useHostedModel(app, form)
      return { form, hosted }
    },
    { wrapper }
  )
  act(() => {
    client.setQueryData(["models", "image", "set"], list)
  })
  view.rerender()
  return view
}

function openWith(
  seed: FormValues,
  source: FormSource,
  app = image
): FormValues {
  return openHosted(seed, source, app).result.current.form.values
}

describe("the model a form opens on when the model list arrives", () => {
  it("keeps a Recreate of a run on the app's graph default", () => {
    const seeded = valuesFromRun(image, runOf("z-image-turbo"))
    expect(openWith(seeded, "seed")).toEqual(seeded)
  })

  it("keeps a Recreate of a run on another graph", () => {
    const seeded = valuesFromRun(image, runOf("qwen-image-2512"))
    expect(openWith(seeded, "seed")).toEqual(seeded)
  })

  it("keeps the file a Use in placed, and the form it placed it in", () => {
    const base = defaultsOf(image)
    const placed: FormValues = {
      ...base,
      inputs: { ...base.inputs, references: [photo] },
    }
    expect(openWith(placed, "placed")).toEqual(placed)
  })

  it("moves an untouched form to the #1 by rank when nothing is kept", () => {
    const values = openWith(defaultsOf(image), "defaults")
    expect(values.inputs.model).toBe("bfl/flux-3-image")
  })
})

const lastUsedKey = "rosesfield.app.last-used"

function keep(record: unknown): void {
  window.localStorage.setItem(lastUsedKey, JSON.stringify({ image: record }))
}

function kept(): unknown {
  const raw = window.localStorage.getItem(lastUsedKey)
  return raw === null ? null : JSON.parse(raw).image
}

describe("the model and settings you last used in an app", () => {
  it("opens an untouched form on the model, its settings, the count and the format you last used", () => {
    keep({
      model: "qwen-image-2512",
      settings: {},
      count: 3,
      aspectRatio: "16:9",
    })
    const values = openWith(defaultsOf(image), "defaults")
    expect(values.inputs.model).toBe("qwen-image-2512")
    expect(values.count).toBe(3)
    expect(values.aspectRatio).toBe("16:9")
  })

  it("restores a hosted model's own setting, and keeps the prompt out", () => {
    keep({
      model: "bfl/flux-3-image",
      settings: { aspectRatio: "16:9", prompt: "kept words" },
      count: 1,
      aspectRatio: null,
    })
    const values = openWith(defaultsOf(image), "defaults")
    expect(values.inputs.model).toBe("bfl/flux-3-image")
    expect(values.inputs.aspectRatio).toBe("16:9")
    expect(values.inputs.prompt).not.toBe("kept words")
  })

  it("keeps nothing on opening, so a new #1 still reaches a person who chose nothing", () => {
    openWith(defaultsOf(image), "defaults")
    expect(kept()).toBeNull()
  })

  it("keeps the model you choose and its settings, for the next visit", () => {
    const view = openHosted(defaultsOf(image), "defaults")
    act(() => {
      view.result.current.hosted.choose("qwen-image-2512")
    })
    view.rerender()
    expect(kept()).toEqual({
      model: "qwen-image-2512",
      settings: {},
      count: defaultsOf(image).count,
      aspectRatio: defaultsOf(image).aspectRatio,
    })
    act(() => {
      view.result.current.hosted.choose("bfl/flux-3-image")
    })
    view.rerender()
    expect(kept()).toMatchObject({
      model: "bfl/flux-3-image",
      settings: { aspectRatio: "auto" },
    })
  })

  it("lets a Recreate of a run fill the form its own way, and keeps nothing until you change it", () => {
    const record = {
      model: "qwen-image-2512",
      settings: {},
      count: 3,
      aspectRatio: null,
    }
    keep(record)
    const seeded = valuesFromRun(image, runOf("z-image-turbo"))
    expect(openWith(seeded, "seed")).toEqual(seeded)
    expect(kept()).toEqual(record)
  })

  it("keeps a mode with a model default of its own on that default, and reads and keeps nothing for it", () => {
    const mode = appListing.parse({
      ...listed,
      inputs: listed.inputs.map((input) =>
        input.name === "model" && input.type === "choice"
          ? { ...input, default: "qwen-image-2512" }
          : input
      ),
    })
    const record = {
      model: "bfl/flux-3-image",
      settings: {},
      count: 3,
      aspectRatio: null,
    }
    keep(record)
    const view = openHosted(defaultsOf(mode), "defaults", mode)
    expect(view.result.current.form.values.inputs.model).toBe("qwen-image-2512")
    act(() => {
      view.result.current.hosted.choose("z-image-turbo")
    })
    view.rerender()
    expect(kept()).toEqual(record)
  })

  it("drops a kept model the catalog no longer lists, and opens on the #1", () => {
    keep({ model: "gone/model", settings: {}, count: 3, aspectRatio: null })
    const values = openWith(defaultsOf(image), "defaults")
    expect(values.inputs.model).toBe("bfl/flux-3-image")
    expect(values.count).toBe(defaultsOf(image).count)
  })
})
