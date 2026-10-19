import { findApp } from "@rosesfield/catalog"
import {
  type AppDefinition,
  type AppListing,
  type InputDefinition,
  startRunBodyFor,
} from "@rosesfield/contract"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { bodyOf, defaultsOf, type FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { useInputRules } from "@/studio/image/image-model-settings"
import { correctionsOf, shownInputOf } from "@/studio/image/image-rules"

function imageListing(): AppListing {
  const listing = findCatalogApp("image")
  if (listing === null) {
    throw new Error("The catalog lists no image app")
  }
  return listing
}

function imageDefinition(): AppDefinition {
  const definition = findApp("image")
  if (definition === null) {
    throw new Error("The catalog lists no image app")
  }
  return definition
}

const listing = imageListing()
const body = startRunBodyFor(imageDefinition())

function inputNamed(name: string): InputDefinition {
  const input = listing.inputs.find((one) => one.name === name)
  if (input === undefined) {
    throw new Error(`Image has no ${name} input`)
  }
  return input
}

function shownValues(model: string): string[] | null {
  const shown = shownInputOf(
    listing,
    { model, resolution: "1k" },
    inputNamed("resolution")
  )
  if (shown === null) {
    return null
  }
  return shown.type === "choice"
    ? shown.options.map((option) => option.value)
    : []
}

function useForm(start: Record<string, FieldValue>) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>(start)
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const base = defaultsOf(listing)
  const form: AppForm = {
    values: { ...base, inputs },
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  useInputRules(listing, form)
  return { form, setInput }
}

afterEach(cleanup)

describe("the Image model settings follow the contract's rules", () => {
  it("shows the resolution only for a model that runs more than one", () => {
    expect(shownValues("z-image-turbo")).toEqual(["1k", "2k"])
    expect(shownValues("flux-2-klein-4b")).toBeNull()
    expect(shownValues("qwen-image-2512")).toBeNull()
  })

  it("moves 2K back to 1K when you pick a model that runs 1K only", () => {
    expect(
      correctionsOf(listing, { model: "flux-2-klein-4b", resolution: "2k" })
    ).toEqual({ resolution: "1k" })
    expect(
      correctionsOf(listing, { model: "z-image-turbo", resolution: "2k" })
    ).toEqual({})
  })

  it("sends a body the gateway accepts after the model changes", () => {
    const { result } = renderHook(() =>
      useForm({
        ...defaultsOf(listing).inputs,
        prompt: "a field of roses",
        model: "z-image-turbo",
        resolution: "2k",
      })
    )
    expect(
      body.safeParse(bodyOf(listing, result.current.form.values)).success
    ).toBe(true)
    act(() => result.current.setInput("model", "flux-2-klein-4b"))
    const sent = bodyOf(listing, result.current.form.values)
    expect(sent.inputs).toMatchObject({
      model: "flux-2-klein-4b",
      resolution: "1k",
    })
    expect(body.safeParse(sent).success).toBe(true)
  })

  it("leaves a body the gateway refuses when nothing corrects it", () => {
    const values = {
      ...defaultsOf(listing),
      inputs: {
        ...defaultsOf(listing).inputs,
        prompt: "a field of roses",
        model: "flux-2-klein-4b",
        resolution: "2k",
      },
    }
    expect(body.safeParse(bodyOf(listing, values)).success).toBe(false)
  })
})
