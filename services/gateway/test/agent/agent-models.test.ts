import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type AgentHarness,
  agentModelRoutes,
  agentModelsResponse,
  type Conversation,
  conversationIdFormat,
  routerChat,
} from "@rosesfield/agent"
import { errorEnvelope } from "@rosesfield/contract"
import { type Fetch, RouterCatalog } from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { buildHandlers } from "#build-handlers"
import { pickEngines } from "#compose/pick-engines"
import type { GatewayApp } from "#gateway-env"
import { FakeAgentHarness } from "../../../../packages/agent/test/fake/fake-agent-harness"
import {
  fakeRouter,
  pictureModel,
  schemaOf,
} from "../catalog/router-recordings"
import { FakeJobRunner } from "../fake/fake-job-runner"
import { localHost, ownerGateway } from "../harness"
import { localPorts } from "../local-ports"
import { start } from "../sample-apps"
import { comfyCloud } from "../server-env"

const chatModel = schemaOf({
  model: routerChat.route,
  takes: ["text", "image"],
  makes: ["text"],
  properties: {
    prompt: { type: "string" },
    tools: { type: "array", items: { type: "object" } },
  },
})

const conversation: Conversation = {
  id: conversationIdFormat.parse("5d0c7a3e-9b1f-4e2a-8c6d-3f4a5b6c7d8e"),
  title: null,
  runApproval: "ask",
  createdAt: start.toISOString(),
}

const path = agentModelRoutes.listAgentModels.path
const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function gatewayWith(fetch: Fetch, agent: AgentHarness | null): GatewayApp {
  const clock = new FixedClock({ now: start })
  const folder = mkdtempSync(join(tmpdir(), "rosesfield-agent-models-"))
  folders.push(folder)
  const ports = {
    ...localPorts(clock, folder),
    engines: pickEngines(comfyCloud("comfyui-owner"), {
      clock,
      fetch,
      catalog: new RouterCatalog({ clock }),
    }),
  }
  const { handlers } = buildHandlers(ports, () => new FakeJobRunner())
  return ownerGateway(handlers, ports.apps, { mode: "local" }, clock, agent)
}

async function call(
  app: GatewayApp,
  init: RequestInit = {}
): Promise<Response> {
  return app.request(path, {
    ...init,
    headers: { ...localHost, ...(init.headers ?? {}) },
  })
}

async function modelsOf(response: Response) {
  expect(response.status).toBe(200)
  return agentModelsResponse.parse(await response.json())
}

function agent(): FakeAgentHarness {
  return new FakeAgentHarness(conversation, [])
}

describe("the agent's model list", () => {
  it("lists the chat models while the Router lists its tool-taking chat route, and keeps the one you choose", async () => {
    const router = fakeRouter({ schemas: [pictureModel, chatModel] })
    const app = gatewayWith(router.fetch, agent())

    const listed = await modelsOf(await call(app))
    const chosen = await modelsOf(
      await call(app, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "maker/chat-large" }),
      })
    )

    expect(listed).toEqual({
      models: ["maker/chat-small", "maker/chat-large"],
      model: "maker/chat-small",
      refusal: null,
      rates: {},
    })
    expect(chosen.model).toBe("maker/chat-large")
    expect((await modelsOf(await call(app))).model).toBe("maker/chat-large")
  })

  it("gives each chat model its credits per million text tokens in and out from Comfy's rate card, and none to a model the card holds no pair for", async () => {
    const tokens = "per 1M tokens"
    const router = fakeRouter({
      schemas: [pictureModel, chatModel],
      rates: {
        rates: [
          {
            model_id: "maker/chat-small",
            credits: "63.3",
            unit: tokens,
            conditions: "Input text tokens",
          },
          {
            model_id: "maker/chat-small",
            credits: "316.5",
            unit: tokens,
            conditions: "Output text tokens",
          },
          {
            model_id: "maker/chat-small",
            credits: "6.33",
            unit: tokens,
            conditions: "Cached input tokens",
          },
          {
            model_id: "maker/chat-large",
            credits: "633",
            unit: tokens,
            conditions: "Input text tokens",
          },
        ],
      },
    })
    const app = gatewayWith(router.fetch, agent())

    const listed = await modelsOf(await call(app))

    expect(listed.rates).toEqual({
      "maker/chat-small": { input: 63.3, output: 316.5 },
    })
  })

  it("shows the catalog's refusal and lists no model when the Router has not turned the key on", async () => {
    const router = fakeRouter({
      schemas: [chatModel],
      refuseCatalog: "Comfy Router is not enabled for this account yet.",
    })
    const app = gatewayWith(router.fetch, agent())

    expect(await modelsOf(await call(app))).toEqual({
      models: [],
      model: null,
      refusal: { code: "ENGINE_NOT_ENABLED", status: 412 },
    })
  })

  it("lists no model when the Router lists no chat route that takes tools", async () => {
    const router = fakeRouter({ schemas: [pictureModel] })
    const app = gatewayWith(router.fetch, agent())

    expect(await modelsOf(await call(app))).toEqual({
      models: [],
      model: null,
      refusal: null,
    })
  })

  it("lists no model when the Router's chat route takes no tools", async () => {
    const toolless = schemaOf({
      model: routerChat.route,
      takes: ["text"],
      makes: ["text"],
      properties: { prompt: { type: "string" } },
    })
    const router = fakeRouter({ schemas: [pictureModel, toolless] })
    const app = gatewayWith(router.fetch, agent())

    expect(await modelsOf(await call(app))).toEqual({
      models: [],
      model: null,
      refusal: null,
    })
  })

  it("answers that a model is needed when the server has no agent", async () => {
    const router = fakeRouter({ schemas: [chatModel] })
    const app = gatewayWith(router.fetch, null)

    const response = await call(app)

    expect(response.status).toBe(412)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "AGENT_MODEL_MISSING"
    )
  })
})
