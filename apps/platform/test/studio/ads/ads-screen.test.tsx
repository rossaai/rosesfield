import { appListing } from "@rosesfield/contract"
import { act, cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { AdsModelSettings } from "@/studio/ads/ads-model-settings"
import { useAdsScreen } from "@/studio/ads/use-ads-screen"
import { app } from "../../../../../packages/catalog/src/ads/app"

const listing = appListing.parse(app)
const photo = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"

const pending = vi.hoisted(() => ({
  inputs: {} as Record<string, FieldValue>,
}))

const run = vi.hoisted(() => ({
  generate: vi.fn(),
  form: null as AppForm | null,
}))

vi.mock("@/screens/app/use-start-run", () => ({
  useStartRun: (_app: unknown, form: AppForm) => {
    run.form = form
    return {
      generate: () => {
        if (form.validate()) {
          run.generate()
        }
      },
      isPending: false,
      error: null,
      price: "",
    }
  },
}))

vi.mock("@/screens/app/app-canvas", () => ({
  useAppRuns: () => ({ runs: [], isPending: false }),
}))

vi.mock("@/screens/app/use-app-form", async () => {
  const react = await import("react")
  const appForm = await import("@/screens/app/app-form")
  return {
    useAppForm: (listed: typeof listing): AppForm => {
      const [values, setValues] = react.useState<FormValues>(() => {
        const first = appForm.defaultsOf(listed)
        return { ...first, inputs: { ...first.inputs, ...pending.inputs } }
      })
      const setInput = react.useCallback(
        (name: string, value: FieldValue) =>
          setValues((current) => ({
            ...current,
            inputs: { ...current.inputs, [name]: value },
          })),
        []
      )
      return {
        values,
        problems: new Map(),
        setInput,
        setForm: (change) =>
          setValues((current) => ({ ...current, ...change })),
        fill: () => undefined,
        validate: () => appForm.problemsOf(listed, values).length === 0,
        register: () => undefined,
      }
    },
  }
})

function renderScreen(inputs: Record<string, FieldValue>) {
  pending.inputs = inputs
  return renderHook(() =>
    useAdsScreen(listing, { use: undefined, from: undefined })
  )
}

afterEach(() => {
  cleanup()
  run.generate.mockReset()
  run.form = null
})

describe("the Ads Generate press", () => {
  it("starts a run for an ad when a scene of 600 characters stays from a product shot", () => {
    const { result } = renderScreen({
      product: [photo],
      scene: "a".repeat(600),
      kind: "ad",
      headline: "Fresh",
    })
    act(() => result.current.start.generate())
    expect(run.generate).toHaveBeenCalledTimes(1)
    expect(result.current.message).toBeNull()
  })

  it("starts a run for a product shot when a headline of 70 characters stays from an ad", () => {
    const { result } = renderScreen({
      product: [photo],
      headline: "a".repeat(70),
    })
    act(() => result.current.start.generate())
    expect(run.generate).toHaveBeenCalledTimes(1)
  })

  it("shows the message and starts no run when the shown words break a bound", () => {
    const { result } = renderScreen({
      product: [photo],
      kind: "ad",
      headline: "a".repeat(61),
    })
    act(() => result.current.start.generate())
    expect(run.generate).not.toHaveBeenCalled()
    expect(result.current.message).not.toBeNull()
  })
})

describe("the Ads model menu", () => {
  it("shows each model's name, its line and Open weights, before the style", () => {
    const { result } = renderScreen({ product: [photo] })
    const view = render(
      <AdsModelSettings
        app={listing}
        state={result.current}
        chips={["kind", "aspectRatio", "count"]}
      />
    )
    const text = view.container.textContent ?? ""
    const model = listing.inputs.find((input) => input.name === "model")
    const options = model?.type === "choice" ? model.options : []
    expect(options.length).toBe(2)
    for (const option of options) {
      expect(text).toContain(tCatalog(option.labelKey))
      expect(text).toContain(tCatalog(`${option.labelKey}.line`))
    }
    expect(text.split(t("field.model.open")).length - 1).toBe(2)
    const style = tCatalog("ads.input.style.label")
    expect(text.indexOf(tCatalog("ads.input.model.label"))).toBeLessThan(
      text.indexOf(style)
    )
    expect(text).not.toContain(tCatalog("ads.input.kind.label"))
  })
})
