import {
  type AppDefinition,
  appListing,
  routes,
  startRunBodyFor,
} from "@rosesfield/contract"
import { AppNotFoundError } from "@rosesfield/generation"
import type { Context } from "hono"
import { type SSEStreamingApi, streamSSE } from "hono/streaming"
import { z } from "zod"
import { gatewayRoutes } from "#gateway.contract"
import type { GatewayApp, GatewayEnv } from "#gateway-env"
import {
  jsonBodyMaxBytes,
  limitBody,
  type ResponseOf,
  readJson,
  readQuery,
} from "#routes/read-request"

const schemaHeaders = {
  "Cache-Control": "no-cache",
  "Content-Type": "application/schema+json",
}

export function appRoutes(
  app: GatewayApp,
  apps: readonly AppDefinition[]
): void {
  const listing = { apps: apps.map((one) => appListing.parse(one)) }
  app.get(routes.listApps.path, (c) =>
    c.json(
      listing satisfies ResponseOf<typeof routes.listApps>,
      routes.listApps.status
    )
  )
  const schemas = new Map<string, Record<string, unknown>>(
    apps.map((one) => [
      one.id,
      z.toJSONSchema(startRunBodyFor(one), { io: "input" }),
    ])
  )
  app.get(gatewayRoutes.getAppSchema.path, (c) => {
    const appId = c.req.param("appId")
    const schema = schemas.get(appId)
    if (schema === undefined) {
      throw new AppNotFoundError({ appId })
    }
    return c.body(
      JSON.stringify(
        schema satisfies ResponseOf<typeof gatewayRoutes.getAppSchema>
      ),
      gatewayRoutes.getAppSchema.status,
      schemaHeaders
    )
  })
}

type RunFrame = ResponseOf<typeof routes.watchRun>

const keepaliveMs = 15_000

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      signal.removeEventListener("abort", done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener("abort", done, { once: true })
    if (signal.aborted) {
      done()
    }
  })
}

async function writeFrame(
  stream: SSEStreamingApi,
  frame: RunFrame
): Promise<void> {
  await stream.writeSSE({ event: "run", data: JSON.stringify(frame) })
}

async function watchRun(c: Context<GatewayEnv>): Promise<Response> {
  const stop = new AbortController()
  c.req.raw.signal.addEventListener("abort", () => stop.abort(), {
    once: true,
  })
  const frames = c.var.scope.handlers.advanceRun.watch({
    runId: c.req.param("runId") ?? "",
    signal: stop.signal,
    pause,
  })
  const first = await frames.next()
  return streamSSE(c, async (stream) => {
    stream.onAbort(() => stop.abort())
    const beat = setInterval(() => {
      void stream.write(": keepalive\n\n")
    }, keepaliveMs)
    try {
      if (!first.done) {
        await writeFrame(stream, first.value)
      }
      for await (const frame of frames) {
        await writeFrame(stream, frame)
      }
    } finally {
      clearInterval(beat)
      stop.abort()
      await frames.return()
    }
  })
}

export function runRoutes(app: GatewayApp): void {
  app.post(routes.startRun.path, limitBody(jsonBodyMaxBytes), async (c) => {
    const { handlers, keyFor } = c.var.scope
    const started = await handlers.startRun.execute({
      appId: c.req.param("appId"),
      body: await readJson(c),
      idempotencyKey: await keyFor(c.req.header("idempotency-key") ?? null),
      seed: null,
    })
    return c.json(
      started satisfies ResponseOf<typeof routes.startRun>,
      routes.startRun.status
    )
  })
  app.get(routes.listRuns.path, async (c) => {
    const query = readQuery(c, routes.listRuns.query)
    const page = await c.var.scope.handlers.listRuns.execute({
      appId: query.appId ?? null,
      cursor: query.cursor ?? null,
    })
    return c.json(
      page satisfies ResponseOf<typeof routes.listRuns>,
      routes.listRuns.status
    )
  })
  app.get(routes.getRun.path, async (c) => {
    const { handlers, pollRun } = c.var.scope
    const runId = c.req.param("runId")
    await pollRun(runId)
    const found = await handlers.getRun.execute({ runId })
    return c.json(
      found satisfies ResponseOf<typeof routes.getRun>,
      routes.getRun.status
    )
  })
  app.get(routes.watchRun.path, watchRun)
  app.post(routes.cancelRun.path, async (c) => {
    const cancelled = await c.var.scope.handlers.cancelRun.execute({
      runId: c.req.param("runId"),
    })
    return c.json(
      cancelled satisfies ResponseOf<typeof routes.cancelRun>,
      routes.cancelRun.status
    )
  })
  app.post(routes.repeatRun.path, async (c) => {
    const repeated = await c.var.scope.handlers.repeatRun.execute({
      runId: c.req.param("runId"),
    })
    return c.json(
      repeated satisfies ResponseOf<typeof routes.repeatRun>,
      routes.repeatRun.status
    )
  })
}
