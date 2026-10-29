import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  conversationResponse,
  conversationRoutes,
  defaultChatModel,
  type PiAgentHarness,
  routerAgentModel,
} from "@rosesfield/agent"
import { readApps } from "@rosesfield/catalog"
import { approvedExamples, motionApp } from "@rosesfield/catalog/motion"
import { buildPath, routes, runPageResponse } from "@rosesfield/contract"
import { PriceRunHandler } from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { localAgent } from "#agent/local-agent"
import { buildHandlers } from "#build-handlers"
import { FakeAppCatalog } from "../../../../packages/agent/test/fake/fake-app-catalog"
import { FakePriceEngine } from "../../../../packages/agent/test/fake/fake-price-engine"
import {
  replayRouter,
  textAnswer,
  toolCallAnswer,
} from "../../../../packages/agent/test/fixtures/router-chat-answers"
import { pricedRun } from "../../../../packages/agent/test/harness"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { pngOf } from "../fixtures/examples-gateway"
import { jsonInit, localHost, ownerGateway } from "../harness"
import { localPorts } from "../local-ports"
import { start } from "../sample-apps"

const folders: string[] = []
const agents: PiAgentHarness[] = []

afterEach(async () => {
  await Promise.all(agents.splice(0).map((agent) => agent.close()))
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

async function shapeOfAgentRun(
  inputsFor: (photo: string, clip: string) => Record<string, unknown>
): Promise<string | null> {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-agent-shape-"))
  folders.push(dataDir)
  const clock = new FixedClock({ now: start })
  const apps = readApps([
    { folder: "motion", app: motionApp(approvedExamples) },
  ])
  const ports = { ...localPorts(clock, dataDir), apps }
  const jobs = new FakeJobRunner()
  const { handlers } = buildHandlers(ports, () => jobs)
  const photo = await handlers.uploadAsset.execute({
    bytes: pngOf(1080, 1920),
    mime: "image/png",
    sourceRunId: null,
    width: null,
    height: null,
    durationSeconds: null,
  })
  const clip = await handlers.uploadAsset.execute({
    bytes: Uint8Array.of(0, 0, 0, 24),
    mime: "video/mp4",
    sourceRunId: null,
    width: null,
    height: null,
    durationSeconds: null,
  })
  const replay = replayRouter([
    toolCallAnswer(
      defaultChatModel,
      {
        id: "call_1",
        name: "motion",
        arguments: { inputs: inputsFor(photo.asset.id, clip.asset.id) },
      },
      0.0003
    ),
    textAnswer(defaultChatModel, "Your draft is on its way.", 0.0002),
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
    wait: async () => undefined,
  })
  if (agent !== null) {
    agents.push(agent)
  }
  const app = ownerGateway(handlers, apps, { mode: "local" }, clock, agent)
  const call = (path: string, init: RequestInit = {}) =>
    app.request(path, {
      ...init,
      headers: { ...localHost, ...(init.headers ?? {}) },
    })
  const started = await call(
    conversationRoutes.startConversation.path,
    jsonInit({ runApproval: "auto" })
  )
  const { conversation } = conversationResponse.parse(await started.json())
  const answered = await call(
    buildPath(conversationRoutes.sendMessage.path, {
      conversationId: conversation.id,
    }),
    jsonInit({ text: "Put me in Grab and run" })
  )
  await answered.text()
  const history = runPageResponse.parse(
    await (await call(routes.listRuns.path)).json()
  )
  const [run] = history.runs
  return run?.aspectRatio ?? null
}

describe("the shape of a Motion run the agent starts", () => {
  it("is the example's own shape, 2:3 for Grab and run", async () => {
    const shape = await shapeOfAgentRun((photo) => ({
      example: "grab-and-run",
      photo: [photo],
      resolution: "480p",
    }))
    expect(shape).toBe("2:3")
  })

  it("is the photo's own shape with your own video, 9:16, the control", async () => {
    const shape = await shapeOfAgentRun((photo, clip) => ({
      photo: [photo],
      clip: [clip],
    }))
    expect(shape).toBe("9:16")
  })
})
