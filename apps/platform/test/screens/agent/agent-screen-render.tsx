import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import type { Conversation } from "@/api/conversation-wire"
import type { GatewaySettings } from "@/api/gateway-settings"
import { settingsQuery } from "@/api/queries"
import { agentModelsQuery } from "@/screens/agent/agent-model"
import { conversationsQuery } from "@/screens/agent/conversation-queries"

export const settings: GatewaySettings = {
  mode: "owner",
  place: "bun",
  engine: {
    target: "comfy-cloud",
    address: null,
    key: "set",
    origin: "live",
  },
  lock: "local",
  keyFrom: "server",
  agent: "set",
  agentModel: "deepseek/deepseek-v4-flash",
  retentionDays: null,
}

export const conversations: Conversation[] = [
  {
    id: "c3cfa88a-1688-41ae-a38f-b931f134c3d9",
    title: "A red bicycle",
    runApproval: "ask",
    createdAt: "2026-10-21T22:12:35.755Z",
  },
  {
    id: "452a8025-0ac1-4e71-832e-871863bc1b24",
    title: "A quiet street at dawn",
    runApproval: "ask",
    createdAt: "2026-10-22T00:16:09.848Z",
  },
]

export function renderAgent(
  children: () => ReactNode,
  path = "/agent",
  shown: GatewaySettings = settings
): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(settingsQuery.queryKey, shown)
  client.setQueryData(agentModelsQuery.queryKey, {
    models: ["deepseek/deepseek-v4-flash", "qwen/qwen3.6-flash"],
    model: "deepseek/deepseek-v4-flash",
    refusal: null,
    rates: {},
  })
  client.setQueryData(conversationsQuery.queryKey, conversations)
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <TooltipProvider>{children()}</TooltipProvider>,
    }),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
