import type {
  ChainLead,
  EndKeySteps,
  LibraryExample,
} from "@rosesfield/catalog/motion"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { GatewayStepPricer } from "@/api/gateway-step-pricer"
import { settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { amountOf, type StartRun } from "@/screens/app/use-start-run"
import type { ChainStage } from "@/studio/motion/chain-stage"

export type PriceSource = "measured" | "estimate" | "example" | "unknown"

export type StepPrice = { credits: number | null; source: PriceSource }

export type AskedPrice = { credits: number | null; source: string }

/** What a chain's price is read from: the steps once known, the lead before them, and the example whose runs are measured. */
export type ChainPricing = {
  steps: EndKeySteps | null
  lead: ChainLead | null
  example: LibraryExample | null
  resolution: string
}

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
  example: LibraryExample | null,
  resolution: string
): StepPrice {
  if (asked.source === "measured" && asked.credits !== null) {
    return { credits: asked.credits, source: "measured" }
  }
  const preview = example?.preview ?? null
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

/** The price Generate shows: the draft, and before a lead every step of it as one sum, unknown when one step is. */
async function draftPriceOf(pricing: ChainPricing): Promise<StepPrice> {
  const steps =
    pricing.lead === null
      ? pricing.steps === null
        ? []
        : [pricing.steps.draft]
      : pricing.lead.priced
  if (steps.length === 0) {
    return noPrice
  }
  const prices = (await Promise.all(steps.map(priceOf))).map(stepPriceOf)
  if (prices.some((one) => one.credits === null)) {
    return noPrice
  }
  return {
    credits: prices.reduce((sum, one) => sum + (one.credits ?? 0), 0),
    source: prices.every((one) => one.source === "measured")
      ? "measured"
      : "estimate",
  }
}

async function stagePriceOf(
  chain: ChainStage,
  pricing: ChainPricing
): Promise<StepPrice> {
  const { steps, example, resolution } = pricing
  if (chain.stage === "idle") {
    return draftPriceOf(pricing)
  }
  if (steps === null) {
    return noPrice
  }
  switch (chain.stage) {
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
  example: LibraryExample | null,
  resolution: string
): string | null {
  if (price.credits === null) {
    return null
  }
  switch (price.source) {
    case "example":
      return example === null
        ? null
        : tCatalog("motion.chain.price.example", {
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
  pricing: ChainPricing
): StepPrice {
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const [price, setPrice] = useState<StepPrice>(noPrice)
  const { steps, lead, example, resolution } = pricing
  useEffect(() => {
    if ((steps === null && lead === null) || isDemo) {
      setPrice(noPrice)
      return
    }
    let isCurrent = true
    void stagePriceOf(chain, { steps, lead, example, resolution })
      .then((next) => isCurrent && setPrice(next))
      .catch(() => isCurrent && setPrice(noPrice))
    return () => {
      isCurrent = false
    }
  }, [chain, steps, lead, example, resolution, isDemo])
  return price
}
