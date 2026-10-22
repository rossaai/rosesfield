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
import {
  assetPageResponse,
  buildPath,
  routes,
  runPageResponse,
} from "@rosesfield/contract"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { localAgent } from "#agent/local-agent"
import { buildHandlers, type Handlers } from "#build-handlers"
import type { GatewayApp } from "#gateway-env"
import {
  type RouterRequest,
  replayRouter,
  textAnswer,
  toolCallAnswer,
} from "../../../../packages/agent/test/fixtures/router-chat-answers"
import { imageApp, motionApp } from "../../../../packages/agent/test/sample"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { jsonInit, localHost, ownerGateway } from "../harness"
import { localPorts } from "../local-ports"
import { start } from "../sample-apps"

const toolRun = z.object({
  run: z.object({ id: z.string(), outputs: z.array(z.string()) }),
})
const sentMessages = z.array(
  z.object({ role: z.string(), content: z.unknown() })
)

const folders: string[] = []
const agents: PiAgentHarness[] = []

afterEach(async () => {
  await Promise.all(agents.splice(0).map((agent) => agent.close()))
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function lastRunOf(request: RouterRequest): z.infer<typeof toolRun>["run"] {
  const messages = sentMessages.parse(request.body.messages)
  const result = messages.findLast((message) => message.role === "tool")
  return toolRun.parse(JSON.parse(String(result?.content ?? "{}"))).run
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

type Rig = {
  app: GatewayApp
  requests: RouterRequest[]
}

function chainGateway(): Rig {
  const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-agent-chain-"))
  folders.push(dataDir)
  const clock = new FixedClock({ now: start })
  const apps = [imageApp(), motionApp()]
  const ports = { ...localPorts(clock, dataDir), apps }
  const jobs = new FakeJobRunner()
  const { handlers } = buildHandlers(ports, () => jobs)
  const replay = replayRouter([
    toolCallAnswer(
      defaultChatModel,
      {
        id: "call_1",
        name: "sample-image",
        arguments: { inputs: { prompt: "a red rose" } },
      },
      0.0003
    ),
    (request) =>
      toolCallAnswer(
        defaultChatModel,
        {
          id: "call_2",
          name: "read_run",
          arguments: { runId: lastRunOf(request).id },
        },
        0.0003
      ),
    (request) =>
      toolCallAnswer(
        defaultChatModel,
        {
          id: "call_3",
          name: "sample-motion",
          arguments: {
            inputs: {
              image: lastRunOf(request).outputs,
              prompt: "the rose opens",
            },
          },
        },
        0.0003
      ),
    (request) =>
      toolCallAnswer(
        defaultChatModel,
        {
          id: "call_4",
          name: "read_run",
          arguments: { runId: lastRunOf(request).id },
        },
        0.0003
      ),
    textAnswer(defaultChatModel, "The rose opens in your video.", 0.0002),
  ])
  const agent = localAgent({
    model: routerAgentModel("comfyui-owner"),
    dataDir,
    clock,
    apps,
    handlers,
    modelOptions: { fetch: replay.fetch },
    wait: driveRuns(handlers, jobs, clock),
  })
  if (agent !== null) {
    agents.push(agent)
  }
  const app = ownerGateway(handlers, apps, { mode: "local" }, clock, agent)
  return { app, requests: replay.requests }
}

function call(app: GatewayApp, path: string, init: RequestInit = {}) {
  return app.request(path, {
    ...init,
    headers: { ...localHost, ...(init.headers ?? {}) },
  })
}

function eventsOf(body: string) {
  return body
    .split("\n\n")
    .flatMap((block) => block.split("\n"))
    .filter((line) => line.startsWith("data: "))
    .map((line) => answerEvent.parse(JSON.parse(line.slice("data: ".length))))
}

describe("an image and then a video made from it, asked of the agent", () => {
  it("runs both in order and keeps each result in the library and History", async () => {
    const { app, requests } = chainGateway()
    const started = await call(
      app,
      conversationRoutes.startConversation.path,
      jsonInit({ runApproval: "auto" })
    )
    const { conversation } = conversationResponse.parse(await started.json())

    const answered = await call(
      app,
      buildPath(conversationRoutes.sendMessage.path, {
        conversationId: conversation.id,
      }),
      jsonInit({ text: "Make a red rose, then a video of it opening" })
    )
    const events = eventsOf(await answered.text())
    const history = runPageResponse.parse(
      await (await call(app, routes.listRuns.path)).json()
    )
    const library = assetPageResponse.parse(
      await (await call(app, routes.listAssets.path)).json()
    )

    expect(events.at(-1)).toMatchObject({ type: "done" })
    expect(requests).toHaveLength(5)
    const ran = events.flatMap((event) =>
      event.type === "run" ? [event.runId] : []
    )
    const runs = ran.map((runId) =>
      history.runs.find((run) => run.id === runId)
    )
    expect(runs.map((run) => run?.appId)).toEqual([
      "sample-image",
      "sample-motion",
    ])
    expect(runs.map((run) => run?.status)).toEqual(["done", "done"])
    const [image, video] = runs
    expect(video?.inputs.image).toEqual(image?.outputs)
    const kept = runs.map((run) =>
      library.assets
        .filter((asset) => asset.sourceRunId === run?.id)
        .map((asset) => asset.kind)
    )
    expect(kept).toEqual([["image"], ["video"]])
    expect(image?.outputs).toHaveLength(1)
    const made = [...(image?.outputs ?? []), ...(video?.outputs ?? [])]
    expect(library.assets.map((asset) => asset.id)).toEqual(
      expect.arrayContaining(made)
    )
  })
})
