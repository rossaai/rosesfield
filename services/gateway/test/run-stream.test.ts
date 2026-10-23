import {
  buildPath,
  errorEnvelope,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { DemoGenerationEngine } from "@rosesfield/generation"
import type { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { type Harness, harnessFor, jsonInit, type PortsFor } from "./harness"
import { localPorts } from "./local-ports"

const missingRun = "9b1f6c2e-3a4d-4e5f-8a6b-7c8d9e0f1a2b"

function steppedDemo(clock: FixedClock): DemoGenerationEngine {
  return new DemoGenerationEngine({
    clock,
    timer: {
      after: (ms, callback) => {
        clock.advance(ms)
        queueMicrotask(callback)
        return () => undefined
      },
    },
  })
}

const streamPorts: PortsFor = (clock, folder) => ({
  ...localPorts(clock, folder),
  engines: [steppedDemo(clock)],
})

function framesOf(text: string): Run[] {
  return text
    .split("\n\n")
    .filter((block) => block.startsWith("event: run"))
    .map((block) => {
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n")
      return runResponse.parse(JSON.parse(data)).run
    })
}

async function startRun(gateway: Harness): Promise<string> {
  const response = await gateway.call(
    buildPath(routes.startRun.path, { appId: "sample-image" }),
    jsonInit({ inputs: { prompt: "a red door in fog" } })
  )
  return runResponse.parse(await response.json()).run.id
}

let gateway: Harness | null = null

afterEach(() => {
  gateway?.close()
  gateway = null
})

describe("GET /api/runs/:runId/events", () => {
  it("streams the run from its current state through its progress to its result", async () => {
    gateway = harnessFor({ portsFor: streamPorts })
    const runId = await startRun(gateway)

    const response = await gateway.call(
      buildPath(routes.watchRun.path, { runId })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    const frames = framesOf(await response.text())
    expect(frames[0]).toMatchObject({ id: runId, status: "queued" })
    const progress = frames.flatMap((run) =>
      run.status === "running" && run.progress !== null ? [run.progress] : []
    )
    expect(progress.length).toBeGreaterThan(1)
    expect(progress).toEqual([...progress].sort((left, right) => left - right))
    expect(frames.at(-1)).toMatchObject({ status: "done", progress: 1 })
    expect(frames.at(-1)?.outputs).toHaveLength(1)
  })

  it("sends a finished run as one frame and closes", async () => {
    gateway = harnessFor({ portsFor: streamPorts })
    const runId = await startRun(gateway)
    await gateway.drive(runId)

    const response = await gateway.call(
      buildPath(routes.watchRun.path, { runId })
    )

    const frames = framesOf(await response.text())
    expect(frames.map((run) => run.status)).toEqual(["done"])
  })

  it("answers 404 with RUN_NOT_FOUND before it opens a stream", async () => {
    gateway = harnessFor({ portsFor: streamPorts })

    const response = await gateway.call(
      buildPath(routes.watchRun.path, { runId: missingRun })
    )

    expect(response.status).toBe(404)
    const body = errorEnvelope.parse(await response.json())
    expect(body.error.code).toBe("RUN_NOT_FOUND")
  })
})
