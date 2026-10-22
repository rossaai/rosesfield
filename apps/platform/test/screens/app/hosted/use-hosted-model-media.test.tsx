import { findApp } from "@rosesfield/catalog"
import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, renderHook } from "@testing-library/react"
import { type ReactNode, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defaultsOf, type FormValues } from "@/screens/app/app-form"
import { useHostedModel } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const video = appListing.parse(findApp("video"))

const prompt: ModelField = {
  kind: "prompt",
  name: "prompt",
  path: "prompt",
  required: true,
  maxLength: null,
  default: null,
}

function hosted(id: string, form: ModelField[]): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker: "Maker",
    name: id,
    nameKey: null,
    task: "image-to-video",
    tags: [],
    form,
  }
}

const graph: CatalogModel = {
  id: "ltx-2-5",
  kind: "graph",
  maker: "Lightricks",
  name: "LTX 2.5",
  nameKey: null,
  task: "image-to-video",
  tags: [{ kind: "open-weights" }],
  form: null,
}

const fromImage = hosted("maker/from-image", [
  prompt,
  {
    kind: "media",
    name: "mask",
    path: "mask_image",
    required: false,
    media: "image",
    min: 0,
    max: 1,
  },
  {
    kind: "media",
    name: "image",
    path: "image",
    required: false,
    media: "image",
    min: 0,
    max: 1,
  },
])

const fromText = hosted("maker/from-text", [prompt])

const photo = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"

function useFormAt(seed: FormValues): AppForm {
  const [values, setValues] = useState<FormValues>(seed)
  return {
    values,
    source: "placed",
    problems: new Map(),
    setInput: () => undefined,
    setForm: (change) => setValues((current) => ({ ...current, ...change })),
    fill: setValues,
    validate: () => true,
    register: () => undefined,
  }
}

function render(inputs: FormValues["inputs"]) {
  const client = new QueryClient()
  client.setQueryData(["settings"], { engine: { key: "set" } })
  client.setQueryData(["models", "video", "set"], {
    models: [graph, fromImage, fromText],
    defaultModel: graph.id,
    refusal: null,
  })
  const base = defaultsOf(video)
  const seed: FormValues = {
    ...base,
    inputs: {
      ...base.inputs,
      model: graph.id,
      prompt: "a red door",
      ...inputs,
    },
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const view = renderHook(
    () => {
      const form = useFormAt(seed)
      return { form, hosted: useHostedModel(video, form, []) }
    },
    { wrapper }
  )
  return (id: string): FormValues["inputs"] => {
    act(() => {
      view.result.current.hosted.choose(id)
    })
    return view.result.current.form.values.inputs
  }
}

describe("the files a person added, across a change of model", () => {
  it("moves the photo to the new model's start image, holds it through a model that takes none, and brings it back", () => {
    const choose = render({ startFrame: [photo] })
    const onImage = choose(fromImage.id)
    expect(onImage.image).toEqual([photo])
    expect(onImage.mask).toEqual([])
    const onText = choose(fromText.id)
    expect(Object.values(onText).flat()).not.toContain(photo)
    expect(choose(graph.id).startFrame).toEqual([photo])
    expect(choose(fromImage.id).image).toEqual([photo])
  })

  it("leaves the new model's image empty when no photo was added, and keeps the prompt, the control", () => {
    const choose = render({})
    const onImage = choose(fromImage.id)
    expect(onImage.image).toEqual([])
    expect(onImage.prompt).toBe("a red door")
  })
})
