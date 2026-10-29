import { catalogRoutes } from "@rosesfield/catalog/comfy"
import type { StepPricer } from "@rosesfield/catalog/motion"
import { callRoute } from "@/api/call-route"

type Ask = Parameters<StepPricer["execute"]>[0]

type Priced = Awaited<ReturnType<StepPricer["execute"]>>

type WirePrice = Awaited<
  ReturnType<typeof callRoute<typeof catalogRoutes.priceRun>>
>["price"]

function priceOf(wire: WirePrice): Priced["price"] {
  if (wire.credits === null) {
    return { source: "unknown", credits: null }
  }
  return {
    source: wire.source,
    credits: wire.credits,
    ...(wire.low === undefined ? {} : { low: wire.low }),
    ...(wire.from === undefined ? {} : { from: wire.from }),
    ...(wire.perOutput === undefined ? {} : { perOutput: wire.perOutput }),
  }
}

/** Prices one step of a chain through the gateway's price route, as Generate prices a run. */
export class GatewayStepPricer implements StepPricer {
  async execute(input: Ask): Promise<Priced> {
    const answer = await callRoute(catalogRoutes.priceRun, {
      params: { appId: input.appId },
      body: {
        inputs: input.inputs,
        ...(input.count === undefined ? {} : { count: input.count }),
        ...(input.aspectRatio === undefined
          ? {}
          : { aspectRatio: input.aspectRatio }),
      },
    })
    return { price: priceOf(answer.price) }
  }
}
