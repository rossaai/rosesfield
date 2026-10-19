import {
  type RouteDefinition,
  type Run,
  type RunInputs,
  routes,
  runInputs,
} from "@rosesfield/contract"
import type { RunPrice } from "@rosesfield/generation"
import type { Context, MiddlewareHandler } from "hono"
import type { SpendCap } from "#spend/spend-cap"
import { SpendCapReachedError } from "#spend/spend-cap-reached.error"

export type PricedRequest = {
  appId: string
  inputs: RunInputs
  count: number
  aspectRatio: string | null
}

export type RunPricer = {
  price: (request: PricedRequest) => Promise<RunPrice>
  runOf: (runId: string) => Promise<Run | null>
}

type SpendGuardOptions = {
  cap: SpendCap
  pricer: RunPricer
}

export function creditsNeeded(
  price: RunPrice,
  count: number,
  unknownRunCredits: number
): number {
  if (price.source === "unknown") {
    return unknownRunCredits * count
  }
  return price.source === "measured" ? price.credits : price.credits * count
}

function fieldOf(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined
}

function countOf(body: unknown): number {
  const count = fieldOf(body, "count")
  return typeof count === "number" && count >= 1 ? Math.ceil(count) : 1
}

function requestOf(appId: string, body: unknown): PricedRequest | null {
  const inputs = runInputs.safeParse(fieldOf(body, "inputs"))
  const aspectRatio = fieldOf(body, "aspectRatio")
  if (!inputs.success) {
    return null
  }
  return {
    appId,
    inputs: inputs.data,
    count: countOf(body),
    aspectRatio: typeof aspectRatio === "string" ? aspectRatio : null,
  }
}

function toolCallsOf(body: unknown): number {
  const messages: unknown[] = Array.isArray(body) ? body : [body]
  return messages
    .filter((message) => fieldOf(message, "method") === "tools/call")
    .reduce<number>(
      (sum, message) =>
        sum + countOf(fieldOf(fieldOf(message, "params"), "arguments")),
      0
    )
}

function bodyOf(c: Context): Promise<unknown> {
  return c.req.raw
    .clone()
    .json()
    .catch(() => null)
}

async function runIdOf(response: Response): Promise<string | null> {
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null)
  const id = fieldOf(fieldOf(body, "run"), "id")
  return typeof id === "string" ? id : null
}

export class SpendGuard {
  private readonly cap: SpendCap
  private readonly pricer: RunPricer

  constructor(options: SpendGuardOptions) {
    this.cap = options.cap
    this.pricer = options.pricer
  }

  forRoute(route: RouteDefinition | null): MiddlewareHandler {
    const holds = route === routes.startRun || route === routes.repeatRun
    return async (c, next) => {
      const needed = await this.neededFor(route, c)
      if (needed === 0) {
        await next()
        return
      }
      const status = await this.cap.read()
      if (needed > status.left) {
        throw new SpendCapReachedError({
          capCredits: this.cap.capCredits,
          needed,
          left: status.left,
        })
      }
      await next()
      if (holds && c.res.status === 202) {
        const runId = await runIdOf(c.res)
        if (runId !== null) {
          await this.cap.hold(runId, needed)
        }
      }
    }
  }

  private async neededFor(
    route: RouteDefinition | null,
    c: Context
  ): Promise<number> {
    const worst = this.cap.unknownRunCredits
    if (route === null) {
      return worst * toolCallsOf(await bodyOf(c))
    }
    if (route === routes.startRun) {
      const body = await bodyOf(c)
      return this.neededOf(requestOf(c.req.param("appId") ?? "", body), worst)
    }
    if (route === routes.repeatRun) {
      const run = await this.pricer
        .runOf(c.req.param("runId") ?? "")
        .catch(() => null)
      return this.neededOf(
        run === null
          ? null
          : {
              appId: run.appId,
              inputs: run.inputs,
              count: run.count,
              aspectRatio: run.aspectRatio,
            },
        worst
      )
    }
    return worst
  }

  private async neededOf(
    request: PricedRequest | null,
    worst: number
  ): Promise<number> {
    if (request === null) {
      return worst
    }
    const price = await this.pricer
      .price(request)
      .catch((): RunPrice => ({ source: "unknown", credits: null }))
    return creditsNeeded(price, request.count, worst)
  }
}
