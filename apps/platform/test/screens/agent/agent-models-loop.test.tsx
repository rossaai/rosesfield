import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { noteAgentModel } from "@/screens/agent/agent-model"
import { AgentStartScreen } from "@/screens/agent/agent-start-screen"
import { conversationsQuery } from "@/screens/agent/conversation-queries"
import { accountQuery } from "@/screens/settings/account-query"
import { KeyDialogProvider } from "@/shell/key-dialog-context"

// Settings the gallery seeds for the "done" state and the server answers for
// an owner whose agent is on: agent "set", keyFrom "server", no visitor key.
const settings: GatewaySettings = {
  mode: "owner",
  place: "bun",
  engine: {
    target: "comfy-cloud",
    address: "https://cloud.comfy.org",
    key: "set",
    origin: "live",
  },
  lock: "local",
  keyFrom: "server",
  agent: "set",
  agentModel: "deepseek/deepseek-v4-flash",
  retentionDays: null,
}

const modelsPath = "/api/agent/models"

type Counts = { models: number }

// A fake fetch that counts GET /api/agent/models and answers with `status` and
// `body`. Every other request waits forever, as the existing agent tests do.
function answerModelsWith(status: number, body: unknown): Counts {
  const counts: Counts = { models: 0 }
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    if (url.endsWith(modelsPath) && (init?.method ?? "GET") === "GET") {
      counts.models += 1
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })
      )
    }
    return new Promise(() => undefined)
  })
  return counts
}

function renderStart(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(accountQuery.queryKey, {
    key: "valid",
    credits: 1316,
    cap: null,
    retentionDays: null,
  })
  client.setQueryData(conversationsQuery.queryKey, [])
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <TooltipProvider>
          <KeyDialogProvider>
            <AgentStartScreen />
          </KeyDialogProvider>
        </TooltipProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/agent"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

// Lets every render, effect and fetch settle with no new input.
async function settle(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

beforeEach(() => {
  noteAgentModel("unknown")
})

afterEach(() => {
  cleanup()
  noteAgentModel("unknown")
  vi.unstubAllGlobals()
})

describe("the agent start screen requests the models over a settled render", () => {
  it("the start screen requests the models at most 3 times with no new input when the server refuses with AGENT_MODEL_MISSING", async () => {
    const counts = answerModelsWith(412, {
      error: { code: "AGENT_MODEL_MISSING", status: 412 },
    })
    renderStart()
    await settle(1500)
    expect(counts.models).toBeLessThanOrEqual(3)
  })

  it("the start screen requests the models once when the server answers 200 with a model", async () => {
    const counts = answerModelsWith(200, {
      models: ["deepseek/deepseek-v4-flash"],
      model: "deepseek/deepseek-v4-flash",
      refusal: null,
      rates: {},
    })
    renderStart()
    await settle(1500)
    expect(counts.models).toBe(1)
  })
})
