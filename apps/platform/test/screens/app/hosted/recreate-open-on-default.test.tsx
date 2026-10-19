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

function openWith(seed: FormValues, source: FormSource) {
  const client = new QueryClient()
  client.setQueryData(["settings"], { engine: { key: "set" } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const view = renderHook(
    () => {
      const form = useFormAt(seed, source)
      useHostedModel(image, form, [])
      return form
    },
    { wrapper }
  )
  act(() => {
    client.setQueryData(["models", "image", "set"], list)
  })
  view.rerender()
  return view.result.current.values
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

  it("moves an untouched form to the task's default model", () => {
    const values = openWith(defaultsOf(image), "defaults")
    expect(values.inputs.model).toBe("bfl/flux-3-image")
  })
})
