import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { AgentHarness } from "@rosesfield/agent"
import type { AppDefinition } from "@rosesfield/contract"
import { FixedClock, runIdFormat } from "@rosesfield/kernel"
import {
  buildHandlers,
  type HandlerPorts,
  type Handlers,
} from "#build-handlers"
import { ownerScope } from "#compose/request-scope"
import { ownerSettings } from "#compose/settings"
import type { OwnerLock } from "#env"
import { createGateway } from "#gateway"
import type { GatewayApp } from "#gateway-env"
import { TokenTries } from "#lock/token-tries"
import { FakeJobRunner } from "./fake/fake-job-runner"
import { start } from "./sample-apps"

export type PortsFor = (clock: FixedClock, folder: string) => HandlerPorts

type HarnessOptions = {
  portsFor: PortsFor
  lock?: OwnerLock
  apps?: readonly AppDefinition[]
}

type CallInit = {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
}

export type Harness = {
  app: GatewayApp
  handlers: Handlers
  jobs: FakeJobRunner
  clock: FixedClock
  call: (path: string, init?: CallInit) => Promise<Response>
  drive: (runId: string) => Promise<void>
  close: () => void
}

export const localHost = { host: "127.0.0.1:8787" }

export function ownerGateway(
  handlers: Handlers,
  apps: readonly AppDefinition[],
  lock: OwnerLock,
  clock: FixedClock,
  agent: AgentHarness | null = null
): GatewayApp {
  const scope = ownerScope({
    handlers,
    agent,
    settings: ownerSettings(
      {
        engine: { target: "demo" },
        access: { mode: "owner", lock },
        agent: null,
      },
      "bun"
    ),
  })
  return createGateway({
    apps,
    guard: {
      mode: "owner",
      lock,
      tries: new TokenTries({ clock }),
      clientOf: () => null,
    },
    scopeFor: async () => scope,
    agent: { mode: "routes" },
    platform: [],
  })
}

export function harnessFor(options: HarnessOptions): Harness {
  const clock = new FixedClock({ now: start })
  const folder = mkdtempSync(join(tmpdir(), "rosesfield-gateway-"))
  const made = options.portsFor(clock, folder)
  const ports = { ...made, apps: options.apps ?? made.apps }
  const jobs = new FakeJobRunner()
  const { handlers } = buildHandlers(ports, () => jobs)
  const app = ownerGateway(
    handlers,
    ports.apps,
    options.lock ?? { mode: "local" },
    clock
  )
  return {
    app,
    handlers,
    jobs,
    clock,
    call: async (path, init = {}) =>
      app.request(path, {
        ...init,
        headers: { ...localHost, ...init.headers },
      }),
    drive: async (runId) => {
      for (let step = 0; step < 20; step += 1) {
        const { nextWakeMs } = await handlers.advanceRun.execute({
          runId: runIdFormat.parse(runId),
        })
        if (nextWakeMs === null) {
          await handlers.advanceRun.priced(runIdFormat.parse(runId))
          return
        }
        clock.advance(nextWakeMs)
      }
      throw new Error(`Run ${runId} did not end in 20 steps`)
    },
    close: () => rmSync(folder, { recursive: true, force: true }),
  }
}

export function jsonInit(body: unknown, headers: Record<string, string> = {}) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }
}
