import type { EndKeySteps, LibraryExample } from "@rosesfield/catalog/motion"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { GatewayStepPricer } from "@/api/gateway-step-pricer"
import { settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { amountOf, type StartRun } from "@/screens/app/use-start-run"
import type { ChainStage } from "@/studio/motion/example-chain-stage"

export type PriceSource = "measured" | "estimate" | "example" | "unknown"

export type StepPrice = { credits: number | null; source: PriceSource }

export type AskedPrice = { credits: number | null; source: string }

export const chainPricer = new GatewayStepPricer()

async function priceOf(
  step: ReturnType<EndKeySteps["restore"]>
): Promise<AskedPrice> {
  const { price } = await chainPricer.execute({
    appId: step.appId,
    inputs: step.request.inputs,
    aspectRatio: step.request.aspectRatio,
  })
  return price
}

const noPrice: StepPrice = { credits: null, source: "unknown" }

function stepPriceOf(asked: AskedPrice): StepPrice {
  if (asked.credits === null) {
    return noPrice
  }
  return {
    credits: asked.credits,
    source: asked.source === "measured" ? "measured" : "estimate",
  }
}

/** The final's price: the person's own measured run, else the example's own measured run at the same resolution, else an estimate. */
export function finalPriceOf(
  asked: AskedPrice,
  example: LibraryExample,
  resolution: string
): StepPrice {
  if (asked.source === "measured" && asked.credits !== null) {
    return { credits: asked.credits, source: "measured" }
  }
  const { preview } = example
  if (preview !== null && preview.resolution === resolution) {
    return { credits: preview.credits, source: "example" }
  }
  return stepPriceOf(asked)
}

function sumOf(restore: StepPrice, final: StepPrice): StepPrice {
  if (restore.credits === null || final.credits === null) {
    return noPrice
  }
  const source =
    restore.source === "measured" && final.source !== "estimate"
      ? final.source
      : "estimate"
  return { credits: restore.credits + final.credits, source }
}

async function stagePriceOf(
  chain: ChainStage,
  steps: EndKeySteps,
  example: LibraryExample,
  resolution: string
): Promise<StepPrice> {
  switch (chain.stage) {
    case "idle":
      return stepPriceOf(await priceOf(steps.draft))
    case "makeFinal": {
      const [restore, final] = await Promise.all([
        priceOf(steps.restore(chain.frame)),
        priceOf(steps.final(chain.draft, chain.frame)),
      ])
      return sumOf(
        stepPriceOf(restore),
        finalPriceOf(final, example, resolution)
      )
    }
    case "renderFinal":
      return finalPriceOf(
        await priceOf(steps.final(chain.draft, chain.endKey)),
        example,
        resolution
      )
    default:
      return noPrice
  }
}

/** The words that say what a price is and where it comes from, shown under Generate before each yes. */
export function priceNoteOf(
  price: StepPrice,
  example: LibraryExample,
  resolution: string
): string | null {
  if (price.credits === null) {
    return null
  }
  switch (price.source) {
    case "example":
      return tCatalog("motion.chain.price.example", {
        amount: formatNumber(price.credits),
        seconds: example.seconds,
        resolution,
      })
    case "measured":
      return t("run.price.measured", { amount: formatNumber(price.credits) })
    case "estimate":
      return t("run.price.estimated", { amount: formatNumber(price.credits) })
    default:
      return null
  }
}

export function priceWordsOf(
  label: string,
  note: string | null,
  price: StepPrice
): Pick<StartRun, "priceValue" | "priceName"> {
  const amount = amountOf(price.credits)
  return amount === null || note === null
    ? { priceValue: null, priceName: null }
    : { priceValue: amount, priceName: `${label}, ${note}` }
}

export function useStagePrice(
  chain: ChainStage,
  steps: EndKeySteps | null,
  example: LibraryExample | null,
  resolution: string
): StepPrice {
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const [price, setPrice] = useState<StepPrice>(noPrice)
  useEffect(() => {
    if (steps === null || example === null || isDemo) {
      setPrice(noPrice)
      return
    }
    let isCurrent = true
    void stagePriceOf(chain, steps, example, resolution)
      .then((next) => isCurrent && setPrice(next))
      .catch(() => isCurrent && setPrice(noPrice))
    return () => {
      isCurrent = false
    }
  }, [chain, steps, example, resolution, isDemo])
  return price
}
