import { type Run, run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import {
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { runsQuery, settingsQuery } from "@/api/queries"
import { accountQuery } from "@/screens/settings/account-query"
import { RunWatcher } from "@/shell/run-watcher"
import { account, ownerSettings } from "./shell-router"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const runId = "12982553-b781-4739-b338-a325bcd075e8"

function runOf(status: Run["status"]): Run {
  const isEnded = status !== "queued" && status !== "running"
  return run.parse({
    id: runId,
    appId: "image",
    status,
    inputs: { prompt: "a door" },
    count: 1,
    aspectRatio: "3:4",
    seed: 7,
    outputs: status === "done" ? ["562a2fed-3919-423e-af30-3e8b95c05e40"] : [],
    progress: null,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure:
      status === "failed" ? { code: "ENGINE_UNAVAILABLE", status: 502 } : null,
    createdAt: "2026-10-20T22:54:53.722Z",
    finishedAt: isEnded ? "2026-10-20T22:55:10.000Z" : null,
  })
}

type RunPage = { runs: Run[]; next: string | null }

function pagesOf(runs: Run[]): InfiniteData<RunPage, string | null> {
  return { pages: [{ runs, next: null }], pageParams: [null] }
}

async function watchUntil(next: Run["status"]): Promise<QueryClient> {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(settingsQuery.queryKey, ownerSettings)
  client.setQueryData(accountQuery.queryKey, account)
  client.setQueryData(["run", runId], { run: runOf("running") })
  client.setQueryData(runsQuery(null).queryKey, pagesOf([runOf("running")]))
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ToastProvider>
          <RunWatcher />
        </ToastProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ["/apps/image"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  await act(async () => {
    client.setQueryData(runsQuery(null).queryKey, pagesOf([runOf(next)]))
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  return client
}

function isAccountStale(client: QueryClient): boolean | undefined {
  return client.getQueryState(accountQuery.queryKey)?.isInvalidated
}

describe("the run watcher and the credit balance", () => {
  it("reads the balance again when a run is done", async () => {
    const client = await watchUntil("done")
    expect(client.getQueryState(["run", runId])?.isInvalidated).toBe(true)
    expect(isAccountStale(client)).toBe(true)
  })

  it("reads the balance again when a run fails, because a failed run can be charged", async () => {
    const client = await watchUntil("failed")
    expect(isAccountStale(client)).toBe(true)
  })

  it("keeps the balance while the run still works", async () => {
    const client = await watchUntil("running")
    expect(isAccountStale(client)).toBe(false)
  })
})
