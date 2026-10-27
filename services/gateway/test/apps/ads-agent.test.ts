import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  answerEvent,
  conversationResponse,
  conversationRoutes,
  defaultChatModel,
  type PiAgentHarness,
  type RunWait,
  routerAgentModel,
} from "@rosesfield/agent"
import { readApps } from "@rosesfield/catalog"
import {
  type AppDefinition,
  assetPageResponse,
  assetResponse,
  buildPath,
  routes,
  runPageResponse,
} from "@rosesfield/contract"
import { PriceRunHandler } from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { localAgent } from "#agent/local-agent"
import { buildHandlers, type Handlers } from "#build-handlers"
import type { GatewayApp } from "#gateway-env"
import { textsOf } from "../../../../packages/agent/src/infrastructure/router-chat-tool-text"
import { FakeAppCatalog } from "../../../../packages/agent/test/fake/fake-app-catalog"
import { FakePriceEngine } from "../../../../packages/agent/test/fake/fake-price-engine"
import {
  type RouterAnswer,
  type RouterRequest,
  replayRouter,
  textAnswer,
  toolCallAnswer,
} from "../../../../packages/agent/test/fixtures/router-chat-answers"
import { pricedRun } from "../../../../packages/agent/test/harness"
import { adsPromptOf } from "../../../../packages/catalog/src/ads/ads-prompt"
import { app as ads } from "../../../../packages/catalog/src/ads/app"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { jsonInit, localHost, ownerGateway } from "../harness"
import { localPorts } from "../local-ports"
import { pngBytes, start } from "../sample-apps"

const headline = "Fresh cold brew"
const line = "Made in small batches every morning"

const sentMessages = z.array(
  z.object({ role: z.string(), content: z.unknown() })
)
const toolRun = z.object({ run: z.object({ id: z.string() }) })

const folders: string[] = []
const agents: PiAgentHarness[] = []

afterEach(async () => {
  await Promise.all(agents.splice(0).map((agent) => agent.close()))
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function adsApp(): AppDefinition {
  const [parsed] = readApps([{ folder: "ads", app: ads }])
  if (parsed === undefined) {
    throw new Error("The ads app did not parse")
  }
  return parsed
}

function lastToolTextOf(request: RouterRequest): string {
  const messages = sentMessages.parse(request.body.messages)
  const result = messages.findLast((message) => message.role === "tool")
  return result === undefined ? "" : (textsOf(result)?.join("") ?? "")
}

function startedRunOf(text: string): string | null {
  try {
    const started = toolRun.safeParse(JSON.parse(text))
    return started.success ? started.data.run.id : null
  } catch {
    return null
  }
}

function driveRuns(
  handlers: Handlers,
  jobs: FakeJobRunner,
  clock: FixedClock
): RunWait {
  return async (ms) => {
    clock.advance(ms)
    for (const runId of jobs.enqueued) {
      await handlers.advanceRun.execute({ runId })
    }
  }
}

type AdsCall = (photo: string) => Record<string, unknown>

type Rig = {
  app: GatewayApp
  jobs: FakeJobRunner
  requests: RouterRequest[]
  photo: { id: string }
}

function agentGateway(call: AdsCall): Rig {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-ads-agent-"))
  folders.push(dataDir)
  const clock = new FixedClock({ now: start })
  const apps = [adsApp()]
  const ports = { ...localPorts(clock, dataDir), apps }
  const jobs = new FakeJobRunner()
  const { handlers } = buildHandlers(ports, () => jobs)
  const photo = { id: "" }
  const readRun = (request: RouterRequest): RouterAnswer => {
    const runId = startedRunOf(lastToolTextOf(request))
    return runId === null
      ? textAnswer(defaultChatModel, "Ads refused the words.", 0.0002)
      : toolCallAnswer(
          defaultChatModel,
          { id: "call_2", name: "read_run", arguments: { runId } },
          0.0003
        )
  }
  const replay = replayRouter([
    () =>
      toolCallAnswer(
        defaultChatModel,
        { id: "call_1", name: "ads", arguments: { inputs: call(photo.id) } },
        0.0003
      ),
    readRun,
    textAnswer(defaultChatModel, "Your ad is in your library.", 0.0002),
  ])
  const agent = localAgent({
    model: routerAgentModel("comfyui-owner"),
    dataDir,
    clock,
    apps,
    handlers: {
      ...handlers,
      priceRun: new PriceRunHandler({
        apps: new FakeAppCatalog(apps),
        engines: [new FakePriceEngine({ price: pricedRun })],
      }),
    },
    modelOptions: { fetch: replay.fetch },
    wait: driveRuns(handlers, jobs, clock),
  })
  if (agent !== null) {
    agents.push(agent)
  }
  const app = ownerGateway(handlers, apps, { mode: "local" }, clock, agent)
  return { app, jobs, requests: replay.requests, photo }
}

function request(app: GatewayApp, path: string, init: RequestInit = {}) {
  return app.request(path, {
    ...init,
    headers: { ...localHost, ...(init.headers ?? {}) },
  })
}

async function uploadPhoto(rig: Rig): Promise<void> {
  const uploaded = await request(rig.app, routes.uploadAsset.path, {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: new Uint8Array(pngBytes),
  })
  expect(uploaded.status).toBe(201)
  rig.photo.id = assetResponse.parse(await uploaded.json()).asset.id
}

async function ask(rig: Rig, text: string) {
  const started = await request(
    rig.app,
    conversationRoutes.startConversation.path,
    jsonInit({ runApproval: "auto" })
  )
  const { conversation } = conversationResponse.parse(await started.json())
  const answered = await request(
    rig.app,
    buildPath(conversationRoutes.sendMessage.path, {
      conversationId: conversation.id,
    }),
    jsonInit({ text })
  )
  return (await answered.text())
    .split("\n")
    .filter((one) => one.startsWith("data: "))
    .map((one) => answerEvent.parse(JSON.parse(one.slice("data: ".length))))
}

describe("an ad asked of the agent", () => {
  it("calls Ads with the headline and the second line it wrote, and keeps the ad with those words in the library and History", async () => {
    const rig = agentGateway((photo) => ({
      kind: "ad",
      headline,
      line,
      product: [photo],
    }))
    await uploadPhoto(rig)

    const events = await ask(rig, "Make an ad of my cold brew photo")
    const history = runPageResponse.parse(
      await (await request(rig.app, routes.listRuns.path)).json()
    )
    const library = assetPageResponse.parse(
      await (await request(rig.app, routes.listAssets.path)).json()
    )

    expect(events.at(-1)).toMatchObject({ type: "done" })
    const [run] = history.runs
    expect(history.runs).toHaveLength(1)
    expect(run).toMatchObject({
      appId: "ads",
      status: "done",
      inputs: {
        kind: "ad",
        headline,
        line,
        product: [rig.photo.id],
        model: "qwen-image-edit-2511",
      },
    })
    expect(run?.outputs).toHaveLength(1)
    const kept = library.assets.filter((asset) => asset.sourceRunId === run?.id)
    expect(kept.map((asset) => asset.kind)).toEqual(["image"])
    expect(adsPromptOf(run?.inputs ?? {})).toContain(`${headline}", and`)
    expect(adsPromptOf(run?.inputs ?? {})).toContain(`"${line}"`)
  })

  it("refuses a headline of 61 characters with RUN_INPUT_INVALID, the screen's refusal, and starts no run", async () => {
    const rig = agentGateway((photo) => ({
      kind: "ad",
      headline: "a".repeat(61),
      product: [photo],
    }))
    await uploadPhoto(rig)

    const events = await ask(rig, "Make an ad of my cold brew photo")
    const history = runPageResponse.parse(
      await (await request(rig.app, routes.listRuns.path)).json()
    )

    expect(events.at(-1)).toMatchObject({ type: "done" })
    expect(history.runs).toEqual([])
    expect(rig.jobs.enqueued).toEqual([])
    expect(rig.requests).toHaveLength(2)
    const [, refusal] = rig.requests
    const text = refusal === undefined ? "" : lastToolTextOf(refusal)
    expect(text).toMatch(/headline[^\n]*\b60\b/)
    expect(text).toContain("RUN_INPUT_INVALID")
  })
})
