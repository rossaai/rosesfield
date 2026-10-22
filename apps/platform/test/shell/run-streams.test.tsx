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
import { runsOf, runsQuery, settingsQuery } from "@/api/queries"
import { accountQuery } from "@/screens/settings/account-query"
import { RunWatcher } from "@/shell/run-watcher"
import { account, ownerSettings } from "./shell-router"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const workingId = "12982553-b781-4739-b338-a325bcd075e8"
const doneId = "4b1c2d3e-5f6a-4b7c-8d9e-0f1a2b3c4d5e"

function runOf(
  id: string,
  status: Run["status"],
  progress: number | null
): Run {
  const isEnded = status !== "queued" && status !== "running"
  return run.parse({
    id,
    appId: "image",
    status,
    inputs: { prompt: "a door" },
    count: 1,
    aspectRatio: "3:4",
    seed: 7,
    outputs: status === "done" ? ["562a2fed-3919-423e-af30-3e8b95c05e40"] : [],
    progress,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T22:54:53.722Z",
    finishedAt: isEnded ? "2026-10-20T22:55:10.000Z" : null,
  })
}

type RunPage = { runs: Run[]; next: string | null }

function pagesOf(runs: Run[]): InfiniteData<RunPage, string | null> {
  return { pages: [{ runs, next: null }], pageParams: [null] }
}

function streamOf(runs: readonly Run[]): Response {
  const text = runs
    .map((one) => `event: run\ndata: ${JSON.stringify({ run: one })}\n\n`)
    .join("")
  return new Response(text, {
    headers: { "Content-Type": "text/event-stream" },
  })
}

async function watch(
  runs: Run[],
  frames: Run[]
): Promise<{ client: QueryClient; urls: string[] }> {
  const urls: string[] = []
  vi.stubGlobal("fetch", async (input: string) => {
    urls.push(input)
    return input.endsWith("/events")
      ? streamOf(frames)
      : new Promise<Response>(() => undefined)
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(settingsQuery.queryKey, ownerSettings)
  client.setQueryData(accountQuery.queryKey, account)
  client.setQueryData(runsQuery(null).queryKey, pagesOf(runs))
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
  return { client, urls }
}

describe("the run watcher's streams", () => {
  it("opens one stream for each working run and writes its frames into the run list", async () => {
    const { client, urls } = await watch(
      [runOf(workingId, "running", 0.1), runOf(doneId, "done", 1)],
      [runOf(workingId, "running", 0.6), runOf(workingId, "done", 1)]
    )

    expect(urls.filter((url) => url.endsWith("/events"))).toEqual([
      `/api/runs/${workingId}/events`,
    ])
    expect(urls.some((url) => url.startsWith("/api/runs?"))).toBe(false)
    const listed = runsOf(client.getQueryData(runsQuery(null).queryKey))
    expect(listed.find((one) => one.id === workingId)?.status).toBe("done")
  })

  it("sends nothing while no run works", async () => {
    const { urls } = await watch([runOf(doneId, "done", 1)], [])

    expect(urls).toEqual([])
  })
})
