import {
  type AskedPrice,
  type ChainLead,
  draftResolution,
  type EndKeySteps,
  finalPartsOf,
  knownCreditsOf,
  type LibraryExample,
  type PartPrice,
  partPriceOf,
  recordedDraftParts,
  recordedFinals,
  recordedSeconds,
  recordedSteps,
  wholeCreditsOf,
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

/** A price before a yes. A recorded run names the seconds and the resolution it was measured at. Unread holds the known part when no run has measured the reading of your video. */
export type StepPrice = {
  credits: number | null
  source: PriceSource
  seconds?: number
  resolution?: string
  unread?: true
}

export type { AskedPrice } from "@rosesfield/catalog/motion"

/** What a chain's price is read from: the steps once known, the lead before them, and the example whose runs are measured. */
export type ChainPricing = {
  steps: EndKeySteps | null
  lead: ChainLead | null
  example: LibraryExample | null
  resolution: string
}

type Step = ReturnType<EndKeySteps["restore"]>

type Ask = (step: Step) => Promise<AskedPrice>

export const chainPricer = new GatewayStepPricer()

const unasked: AskedPrice = { credits: null, source: "unknown" }

const askRoute: Ask = async (step) => {
  const { price } = await chainPricer.execute({
    appId: step.appId,
    inputs: step.request.inputs,
    aspectRatio: step.request.aspectRatio,
  })
  return price
}

/** On the demo engine no route is asked, and only recorded runs price a step. */
const askNothing: Ask = async () => unasked

const noPrice: StepPrice = { credits: null, source: "unknown" }

/** The price of parts of a chain: recorded runs name their clip and resolution, and an unread lead keeps its known part. */
export function partsPriceOf(
  parts: readonly PartPrice[],
  recorded: { seconds: number; resolution: string }
): StepPrice {
  const credits = knownCreditsOf(parts)
  if (credits === null) {
    return noPrice
  }
  const isUnread = parts.some((part) => part.source === "unknown")
  if (isUnread || parts.some((part) => part.source === "recorded")) {
    return {
      credits,
      source: "example",
      ...recorded,
      ...(isUnread ? { unread: true as const } : {}),
    }
  }
  return {
    credits,
    source: parts.every((part) => part.source === "yours")
      ? "measured"
      : "estimate",
  }
}

/** The final's price: the person's own measured run, else the guided render's run measured on a 4-second clip at the same resolution, else an estimate. */
export function finalPriceOf(asked: AskedPrice, resolution: string): StepPrice {
  return partsPriceOf(
    [partPriceOf(asked, recordedFinals[resolution] ?? null)],
    { seconds: recordedSeconds, resolution }
  )
}

/** The restore and the final on Make final, or the final alone on Render, at your resolution. A final whose render holds no price shows none, never its restore alone. */
async function finalStagePriceOf(
  chain: ChainStage,
  steps: EndKeySteps,
  resolution: string,
  ask: Ask
): Promise<StepPrice> {
  switch (chain.stage) {
    case "makeFinal": {
      const [restore, final] = await Promise.all([
        ask(steps.restore(chain.frame)),
        ask(steps.final(chain.draft, chain.frame)),
      ])
      const parts = finalPartsOf(restore, final, resolution)
      return wholeCreditsOf(parts) === null
        ? noPrice
        : partsPriceOf(parts, { seconds: recordedSeconds, resolution })
    }
    case "renderFinal":
      return finalPriceOf(
        await ask(steps.final(chain.draft, chain.endKey)),
        resolution
      )
    default:
      return noPrice
  }
}

/** Generate's price before the first yes: your own video's lead and draft, or an example's draft at 480p. */
async function draftPriceOf(
  pricing: ChainPricing,
  ask: Ask
): Promise<StepPrice> {
  const at = { seconds: recordedSeconds, resolution: draftResolution }
  const { steps, lead, example } = pricing
  if (example !== null) {
    return steps === null
      ? noPrice
      : partsPriceOf(
          [partPriceOf(await ask(steps.draft), recordedSteps.draft)],
          at
        )
  }
  if (lead === null) {
    return noPrice
  }
  const asked = await Promise.all(lead.priced.map(ask))
  const parts = asked.map((one, index) =>
    partPriceOf(one, recordedDraftParts[index] ?? null)
  )
  return partsPriceOf(parts, at)
}

/** The price before each yes: the draft on Generate, the restore and the final on Make final, the final on Render. */
function stagePriceOf(
  chain: ChainStage,
  pricing: ChainPricing,
  ask: Ask
): Promise<StepPrice> {
  if (chain.stage === "idle") {
    return draftPriceOf(pricing, ask)
  }
  return pricing.steps === null
    ? Promise.resolve(noPrice)
    : finalStagePriceOf(chain, pricing.steps, pricing.resolution, ask)
}

/** The words that say what a price is and where it comes from, shown under Generate before each yes. */
export function priceNoteOf(price: StepPrice): string | null {
  if (price.credits === null) {
    return null
  }
  const amount = formatNumber(price.credits)
  const measured = {
    amount,
    seconds: price.seconds ?? recordedSeconds,
    resolution: price.resolution ?? "",
  }
  if (price.unread === true) {
    return tCatalog("motion.chain.price.unread", measured)
  }
  switch (price.source) {
    case "example":
      return tCatalog("motion.chain.price.example", measured)
    case "measured":
      return t("run.price.measured", { amount })
    case "estimate":
      return t("run.price.estimated", { amount })
    default:
      return null
  }
}

/** The price on the button and in its name. A price with an unread part puts no number on the button, so the button never shows a part as the whole. */
export function priceWordsOf(
  label: string,
  note: string | null,
  price: StepPrice
): Pick<StartRun, "priceValue" | "priceName"> {
  if (note === null) {
    return { priceValue: null, priceName: null }
  }
  const amount = price.unread === true ? null : amountOf(price.credits)
  return { priceValue: amount, priceName: `${label}, ${note}` }
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
    if (steps === null && lead === null) {
      setPrice(noPrice)
      return
    }
    let isCurrent = true
    const ask = isDemo ? askNothing : askRoute
    void stagePriceOf(chain, { steps, lead, example, resolution }, ask)
      .then((next) => isCurrent && setPrice(next))
      .catch(() => isCurrent && setPrice(noPrice))
    return () => {
      isCurrent = false
    }
  }, [chain, steps, lead, example, resolution, isDemo])
  return price
}
