import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
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

const hostedId = "maker/clip-3"

const listed = appListing.parse(findApp("image"))

const app = appListing.parse({
  ...listed,
  inputs: listed.inputs.map((input) =>
    input.name === "model" && input.type === "choice"
      ? {
          ...input,
          default: hostedId,
          options: [...input.options, { ...input.options[0], value: hostedId }],
        }
      : input
  ),
})

const hosted: CatalogModel = {
  id: hostedId,
  kind: "hosted",
  maker: "Maker",
  name: "Clip 3",
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
      name: "renderingSpeed",
      path: "rendering_speed",
      required: false,
      options: ["TURBO", "QUALITY"],
      default: null,
    },
    {
      kind: "choice",
      name: "aspectRatio",
      path: "aspect_ratio",
      required: false,
      options: ["16:9", "1:1"],
      default: "1:1",
    },
  ],
}

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

describe("the settings of the model a form opens on", () => {
  it("opens every shown setting on a value when the app's own default is the hosted model, so no setting is blank", () => {
    const client = new QueryClient()
    client.setQueryData(["settings"], { engine: { key: "set" } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const seed = defaultsOf(app)
    const view = renderHook(
      () => {
        const form = useForm(seed)
        useHostedModel(app, form)
        return form
      },
      { wrapper }
    )
    expect(view.result.current.values.inputs.model).toBe(hostedId)
    act(() => {
      client.setQueryData(["models", "image", "set"], {
        models: [hosted],
        defaultModel: hostedId,
        refusal: null,
      })
    })
    view.rerender()
    expect(view.result.current.values.inputs).toMatchObject({
      renderingSpeed: "QUALITY",
      aspectRatio: "1:1",
    })
  })
})
