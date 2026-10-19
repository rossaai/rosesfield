import { effectsApp, recipeOf } from "@rosesfield/catalog/effects"
import { appDefinition, appListing } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { liveSettings } from "@/gallery/screens/screen-fixtures"
import { bodyOf, type FormValues } from "@/screens/app/app-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { useEffectPrices } from "@/studio/effects/use-effect-prices"

const preview = {
  file: "grow-wings.mp4",
  runId: "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  seed: 7,
  resolution: "480p" as const,
  aspectRatio: "9:16",
  workflowHash:
    "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
}

const app = appListing.parse(
  appDefinition.parse(
    effectsApp(
      ["grow-wings", "melt-away"].map((effect) => ({
        ...recipeOf(effect),
        passed: true,
        preview,
      }))
    )
  )
)

const values: FormValues = {
  inputs: {
    effect: "grow-wings",
    image: ["0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01"],
    resolution: "720p",
  },
  seedMode: "random",
  count: 1,
  aspectRatio: "9:16",
}

afterEach(() => {
  cleanup()
})

function clientWith(answers: (client: QueryClient) => void): QueryClient {
  const client = new QueryClient()
  client.setQueryData(["settings"], liveSettings)
  answers(client)
  return client
}

describe("the price on each effect tile", () => {
  it("reads the answer Generate asked for with the same body, and the other effect's own answer", () => {
    const client = clientWith((one) => {
      one.setQueryData(
        priceQuery(app.id, bodyOf(app, values), liveSettings.engine.key)
          .queryKey,
        { price: { source: "measured", credits: 6.95 } }
      )
      one.setQueryData(
        priceQuery(
          app.id,
          bodyOf(app, {
            ...values,
            inputs: { ...values.inputs, effect: "melt-away" },
          }),
          liveSettings.engine.key
        ).queryKey,
        { price: { source: "unknown", credits: null } }
      )
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(
      () => useEffectPrices(app, ["grow-wings", "melt-away"], values),
      { wrapper }
    )
    expect(result.current.isDemo).toBe(false)
    expect(result.current.creditsOf("grow-wings")).toBe(6.95)
    expect(result.current.creditsOf("melt-away")).toBeNull()
  })
})
