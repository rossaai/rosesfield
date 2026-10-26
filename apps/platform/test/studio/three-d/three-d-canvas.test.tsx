import { type Run, run } from "@rosesfield/contract"
import { ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { meshQuery } from "@/studio/three-d/mesh-file"
import { RunStack } from "@/studio/three-d/three-d-canvas"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function doneRun(index: number): Run {
  return run.parse({
    id: `2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e0${index}`,
    appId: "three-d",
    status: "done",
    inputs: { prompt: "a small clay teapot" },
    count: 1,
    aspectRatio: "1:1",
    seed: index,
    outputs: [`3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f0${index}`],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-20T12:00:00.000Z",
    finishedAt: "2026-10-20T12:00:02.000Z",
  })
}

function renderStack(
  runs: readonly Run[],
  opened?: string
): {
  client: QueryClient
  container: HTMLElement
} {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  })
  const root = createRootRoute({
    component: () => (
      <ToastProvider>
        <TooltipProvider>
          <RunStack runs={runs} opened={opened} onUseInputs={() => undefined} />
          <Outlet />
        </TooltipProvider>
      </ToastProvider>
    ),
  })
  const page = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => null,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/three-d"] }),
  })
  const { container } = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { client, container }
}

function outputsOf(container: HTMLElement): number {
  return container.querySelectorAll("[data-slot=mesh-output]").length
}

describe("the 3D run stack", () => {
  it("opens the viewer for the latest run and asks before opening earlier ones", async () => {
    const runs = [doneRun(1), doneRun(2), doneRun(3)]
    const { client, container } = renderStack(runs)
    const shows = await screen.findAllByRole("button", {
      name: "Show the model",
    })

    expect(shows).toHaveLength(2)
    expect(outputsOf(container)).toBe(1)
    for (const earlier of runs.slice(1)) {
      const key = meshQuery(earlier.outputs[0] ?? "").queryKey
      expect(client.getQueryCache().find({ queryKey: key })).toBeUndefined()
    }

    const [first] = shows
    if (first !== undefined) {
      fireEvent.click(first)
    }
    expect(outputsOf(container)).toBe(2)
    const left = screen.getAllByRole("button", { name: "Show the model" })
    expect(left).toHaveLength(1)
  })

  it("opens the viewer for the mesh you pressed in an earlier run, and asks for the latest", async () => {
    const runs = [doneRun(1), doneRun(2), doneRun(3)]
    const pressed = runs[2]?.outputs[0] ?? ""
    const { client, container } = renderStack(runs, pressed)
    const shows = await screen.findAllByRole("button", {
      name: "Show the model",
    })

    expect(shows).toHaveLength(2)
    expect(outputsOf(container)).toBe(1)
    const cache = client.getQueryCache()
    expect(cache.find({ queryKey: meshQuery(pressed).queryKey })).toBeDefined()
    for (const other of runs.slice(0, 2)) {
      const key = meshQuery(other.outputs[0] ?? "").queryKey
      expect(cache.find({ queryKey: key })).toBeUndefined()
    }
  })

  it("opens the viewer for a mesh no run made, such as a GLB you uploaded, and fetches no other model out of view", async () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = (): undefined => undefined
        disconnect = (): undefined => undefined
      }
    )
    const uploaded = "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a09"
    const runs = [doneRun(1)]
    const { client, container } = renderStack(runs, uploaded)
    const shows = await screen.findAllByRole("button", {
      name: "Show the model",
    })

    expect(shows).toHaveLength(1)
    expect(outputsOf(container)).toBe(1)
    const cache = client.getQueryCache()
    expect(cache.find({ queryKey: meshQuery(uploaded).queryKey })).toBeDefined()
    const latest = meshQuery(runs[0]?.outputs[0] ?? "").queryKey
    expect(cache.find({ queryKey: latest })).toBeUndefined()
  })

  it("opens the viewer for a mesh you pressed when 3D has no run", async () => {
    const uploaded = "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7a09"
    const { client, container } = renderStack([], uploaded)
    await waitFor(() => {
      expect(outputsOf(container)).toBe(1)
    })
    const key = meshQuery(uploaded).queryKey
    expect(client.getQueryCache().find({ queryKey: key })).toBeDefined()
  })
})
