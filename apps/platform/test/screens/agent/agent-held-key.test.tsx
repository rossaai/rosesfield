import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AgentModels } from "@/api/agent-wire"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { holdVisitorKey } from "@/api/visitor-keys"
import { t } from "@/copy/t"
import { agentModelsQuery, noteAgentModel } from "@/screens/agent/agent-model"
import { AgentStartScreen } from "@/screens/agent/agent-start-screen"
import { conversationsQuery } from "@/screens/agent/conversation-queries"
import { accountQuery } from "@/screens/settings/account-query"
import { KeyDialogProvider } from "@/shell/key-dialog-context"

const heldKey = "comfyui-pasted-in-settings"

// What `bun run dev` answers on GET /api/settings for a request that carries
// the pasted key, per services/gateway/test/pasted-key-agent.test.ts.
function devSettings(agent: GatewaySettings["agent"]): GatewaySettings {
  return {
    mode: "owner",
    place: "bun",
    engine: {
      target: "comfy-cloud",
      address: "https://cloud.comfy.org",
      key: "set",
      origin: "live",
    },
    lock: "local",
    keyFrom: "settings",
    agent,
    agentModel: agent === "set" ? "deepseek/deepseek-v4-flash" : null,
    retentionDays: null,
  }
}

const listed: AgentModels = {
  models: ["deepseek/deepseek-v4-flash"],
  model: "deepseek/deepseek-v4-flash",
  refusal: null,
  details: {},
}

const noChat: AgentModels = {
  models: [],
  model: null,
  refusal: null,
  details: {},
}

function renderStart(settings: GatewaySettings, models: AgentModels): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, settings)
  client.setQueryData(accountQuery.queryKey, {
    key: "valid",
    credits: 1316,
    cap: null,
    retentionDays: null,
  })
  client.setQueryData(agentModelsQuery.queryKey, models)
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

async function pressSend(): Promise<void> {
  await screen.findByText(t("agent.start.title"))
  const field = screen.queryByRole("textbox", {
    name: t("agent.prompt.label"),
  })
  if (field === null) {
    return
  }
  fireEvent.change(field, { target: { value: "A red bicycle" } })
  fireEvent.click(screen.getByRole("button", { name: t("agent.send") }))
}

function asksForKey(): boolean {
  return (
    screen.queryAllByText(t("key.title")).length > 0 ||
    screen.queryAllByText(t("key.add")).length > 0
  )
}

beforeEach(() => {
  noteAgentModel("unknown")
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  holdVisitorKey("engine", null)
  noteAgentModel("unknown")
  vi.unstubAllGlobals()
})

describe("the agent screen with a Comfy key this browser holds and Comfy accepted", () => {
  it("never asks for the key when the server says its agent has no model", async () => {
    holdVisitorKey("engine", heldKey)
    renderStart(devSettings("missing"), listed)

    await pressSend()

    expect(asksForKey()).toBe(false)
  })

  it("never asks for the key when the Router lists no chat model for it", async () => {
    holdVisitorKey("engine", heldKey)
    renderStart(devSettings("set"), noChat)
    await screen.findByText(t("agent.start.title"))

    expect(asksForKey()).toBe(false)
  })

  it("control: sends without asking for a key when the server's agent is on", async () => {
    holdVisitorKey("engine", heldKey)
    renderStart(devSettings("set"), listed)

    await pressSend()

    expect(asksForKey()).toBe(false)
  })

  it("control: the instrument sees the key prompt when no key is held", async () => {
    renderStart(devSettings("missing"), listed)

    await pressSend()

    expect(asksForKey()).toBe(true)
  })
})
