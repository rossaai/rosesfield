import type { AppListing } from "@rosesfield/contract"
import { useQueries, useQuery } from "@tanstack/react-query"
import { settingsQuery } from "@/api/queries"
import { bodyOf, type FormValues } from "@/screens/app/app-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"

export type EffectPrices = {
  isDemo: boolean
  creditsOf: (effect: string) => number | null
}

const effectInput = "effect"

export function useEffectPrices(
  app: AppListing,
  effects: readonly string[],
  values: FormValues
): EffectPrices {
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const keyState = settings.data?.engine.key ?? "unknown"
  const answers = useQueries({
    queries: effects.map((effect) => ({
      ...priceQuery(
        app.id,
        bodyOf(app, {
          ...values,
          inputs: { ...values.inputs, [effectInput]: effect },
        }),
        keyState
      ),
      enabled: !isDemo && settings.data !== undefined,
    })),
  })
  return {
    isDemo,
    creditsOf: (effect) => {
      const price = answers[effects.indexOf(effect)]?.data?.price
      return price === undefined || price.source === "unknown"
        ? null
        : price.credits
    },
  }
}
