import { findApp } from "@rosesfield/catalog"
import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { bodyOf, defaultsOf, type FieldValue } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { useSoundRule } from "@/studio/effects/use-sound-rule"

function effectsListing() {
  const listing = findCatalogApp("effects")
  if (listing === null) {
    throw new Error("The catalog lists no effects app")
  }
  return listing
}

function effectsDefinition(): AppDefinition {
  const definition = findApp("effects")
  if (definition === null) {
    throw new Error("The catalog lists no effects app")
  }
  return definition
}

const listing = effectsListing()

function useForm(effect: string) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({
    ...defaultsOf(listing).inputs,
    effect,
    image: ["4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"],
  })
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const form: AppForm = {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: "16:9" },
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  const hasSound = useSoundRule(listing, form)
  return { form, hasSound, setInput }
}

function accepted(form: AppForm): boolean {
  const body = bodyOf(listing, form.values)
  return startRunBodyFor(effectsDefinition()).safeParse(body).success
}

afterEach(() => {
  cleanup()
})

describe("the effects sound switch follows the contract's rule", () => {
  it("hides sound for an effect with no sound line and sends a body the contract accepts", () => {
    const { result } = renderHook(() => useForm("living-photo"))
    expect(result.current.hasSound).toBe(false)
    expect(result.current.form.values.inputs.sound).toBeUndefined()
    expect(
      bodyOf(listing, result.current.form.values).inputs
    ).not.toHaveProperty("sound")
    expect(accepted(result.current.form)).toBe(true)
  })

  it("shows sound for an effect with a sound line, and gives it back its default after a silent effect", () => {
    const { result } = renderHook(() => useForm("living-photo"))
    act(() => result.current.setInput("effect", "rain"))
    expect(result.current.hasSound).toBe(true)
    expect(result.current.form.values.inputs.sound).toBe("off")
    act(() => result.current.setInput("sound", "on"))
    expect(bodyOf(listing, result.current.form.values).inputs.sound).toBe("on")
    expect(accepted(result.current.form)).toBe(true)
    act(() => result.current.setInput("effect", "living-photo"))
    expect(result.current.form.values.inputs.sound).toBeUndefined()
    expect(accepted(result.current.form)).toBe(true)
  })
})
