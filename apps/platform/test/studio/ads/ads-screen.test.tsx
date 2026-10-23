import { appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  act,
  cleanup,
  render,
  renderHook,
  within,
} from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue, FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { AdsModelSettings } from "@/studio/ads/ads-model-settings"
import { useAdsScreen } from "@/studio/ads/use-ads-screen"
import { app } from "../../../../../packages/catalog/src/ads/app"

const queryClient = new QueryClient()

function WithQuery({ children }: { children: ReactNode }): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

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

vi.mock("@/screens/app/hosted/use-hosted-model", () => ({
  useHostedModel: () => ({
    isTaskApp: false,
    models: [],
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: null,
    chosen: null,
    fields: null,
    ranBefore: [],
    choose: () => undefined,
  }),
}))

vi.mock("@/screens/app/hosted/use-price-refresh", () => ({
  usePriceRefresh: () => undefined,
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
  const client = new QueryClient()
  return renderHook(
    () => useAdsScreen(listing, { use: undefined, from: undefined }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }
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
  it("is the catalog's model row, before the style, in the Inputs settings", () => {
    const { result } = renderScreen({ product: [photo] })
    const view = render(
      <AdsModelSettings
        app={listing}
        state={result.current}
        chips={["kind", "aspectRatio", "count"]}
      />,
      { wrapper: WithQuery }
    )
    const text = view.container.textContent ?? ""
    const row = view.container.querySelector(
      `[aria-label^="${t("model.picker.title")} "]`
    )
    expect(row).not.toBeNull()
    expect(
      within(view.container).queryByRole("radiogroup", {
        name: t("model.picker.title"),
      })
    ).toBeNull()
    const style = tCatalog("ads.input.style.label")
    expect(text.indexOf(t("model.picker.title"))).toBeLessThan(
      text.indexOf(style)
    )
    expect(text).not.toContain(tCatalog("ads.input.kind.label"))
  })
})
