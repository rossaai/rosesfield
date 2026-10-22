import { findApp } from "@rosesfield/catalog"
import { appListing, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { HowItWorks, samplesOf, stepsOf } from "@/screens/app/how-it-works"
import { publishedQuery, type SharedOutput } from "@/screens/explore/share-api"
import { showcaseOf } from "@/showcase/showcase"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const video = appListing.parse(findApp("video"))
const effects = appListing.parse(findApp("effects"))
const image = appListing.parse(findApp("image"))

function share(
  id: string,
  appId: string,
  kind: "image" | "video" | "audio"
): SharedOutput {
  return {
    id,
    path: `/share/${id}`,
    run: run.parse({
      id: `93e9078d-0000-4000-8000-${id.charCodeAt(0).toString(16).padStart(12, "0")}`,
      appId,
      status: "done",
      inputs: {},
      count: 1,
      aspectRatio: null,
      seed: null,
      outputs: [],
      progress: null,
      engine: { adapter: "demo", models: [], workflowHash: null },
      cost: null,
      origin: "live",
      failure: null,
      createdAt: "2026-10-20T10:00:00.000Z",
      finishedAt: "2026-10-20T10:00:03.000Z",
    }),
    media: [
      {
        index: 0,
        kind,
        mime: `${kind}/x`,
        width: 16,
        height: 9,
        durationSeconds: null,
      },
    ],
    createdAt: "2026-10-20T00:00:00.000Z",
    expiresAt: null,
    sources: [`/share/${id}/media/0`],
  }
}

describe("How it works", () => {
  it("shows only real results of this app, never a sound or another app's", () => {
    const samples = samplesOf(
      [
        share("a", "video", "video"),
        share("b", "image", "image"),
        share("c", "video", "audio"),
        share("d", "video", "image"),
      ],
      "video"
    )
    expect(
      samples.map((sample) => [sample.key, sample.kind, sample.source])
    ).toEqual([
      [
        "share-a",
        "video",
        { kind: "share", shareId: "a", src: "/share/a/media/0" },
      ],
      [
        "share-d",
        "image",
        { kind: "share", shareId: "d", src: "/share/d/media/0" },
      ],
    ])
  })

  it("puts the app's bundled examples first, before its published results", () => {
    const samples = samplesOf([share("a", "effects", "video")], "effects")
    expect(samples.map((sample) => sample.key)).toEqual([
      ...showcaseOf("effects").map((item) => `showcase-${item.file}`),
      "share-a",
    ])
  })

  it("stands three steps, and puts Recreate on the two that play", () => {
    const samples = samplesOf(
      [
        share("a", "video", "image"),
        share("b", "video", "video"),
        share("c", "video", "video"),
      ],
      "video"
    )
    const steps = stepsOf(video, samples)
    expect(steps.map((step) => step.id)).toEqual(["inputs", "model", "result"])
    const withRecreate = steps.map((step) => step.action !== undefined)
    expect(withRecreate).toEqual([false, true, true])
    expect(steps.every((step) => step.media !== null)).toBe(true)
  })

  it("shows no step frame without a real example, rather than an empty one", () => {
    expect(stepsOf(video, [])).toEqual([])
  })

  it("keeps the last steps for fewer examples, so one example is the result", () => {
    const one = stepsOf(
      video,
      samplesOf([share("a", "video", "video")], "video")
    )
    expect(one.map((step) => step.id)).toEqual(["result"])
    expect(one[0]?.media).not.toBeNull()
    expect(one[0]?.action).toBeDefined()
    const two = stepsOf(effects, samplesOf([], "effects"))
    expect(two.map((step) => step.id)).toEqual(["model", "result"])
  })
})

function renderHow(
  node: () => ReturnType<typeof HowItWorks>,
  shares: SharedOutput[]
): void {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
  })
  client.setQueryData(publishedQuery.queryKey, shares)
  const router = createRouter({
    routeTree: createRootRoute({ component: node }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe("How it works with the bundled examples", () => {
  it("plays Effects' two bundled clips, muted and looping, with Recreate on each", async () => {
    renderHow(() => <HowItWorks app={effects} kind="column" />, [])
    const steps = await waitFor(() => {
      const found = screen.getAllByRole("listitem")
      expect(found).toHaveLength(2)
      return found
    })
    for (const step of steps) {
      const clip = step.querySelector("video")
      expect(clip?.muted).toBe(true)
      expect(clip?.loop).toBe(true)
      expect(step.querySelector("a")?.getAttribute("href")).toBe(
        "/apps/effects"
      )
    }
  })

  it("fans four of Image's bundled stills over the prompt bar", async () => {
    renderHow(() => <HowItWorks app={image} kind="bar" />, [])
    const fan = await waitFor(() => {
      const found = document.querySelector("[data-slot=hero-fan]")
      expect(found).not.toBeNull()
      return found
    })
    const shown = [...(fan?.querySelectorAll("img") ?? [])].map((picture) =>
      picture.getAttribute("src")
    )
    expect(shown).toEqual(
      showcaseOf("image")
        .slice(0, 4)
        .map((item) => item.src)
    )
  })
})

describe("How it works on Video's canvas", () => {
  it("shows a published still and two published clips in the three step frames", async () => {
    vi.stubGlobal("fetch", () => new Promise(() => undefined))
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
    })
    client.setQueryData(publishedQuery.queryKey, [
      share("a", "video", "image"),
      share("b", "video", "video"),
      share("c", "video", "video"),
    ])
    const router = createRouter({
      routeTree: createRootRoute({
        component: () => <HowItWorks app={video} kind="column" />,
      }),
      history: createMemoryHistory(),
    })
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    const steps = await waitFor(() => {
      const found = screen.getAllByRole("listitem")
      expect(found).toHaveLength(3)
      return found
    })
    expect(
      steps.map((step) => step.querySelector("img, video")?.tagName ?? null)
    ).toEqual(["IMG", "VIDEO", "VIDEO"])
    expect(steps[1]?.querySelector("video")?.muted).toBe(true)
    expect(steps[1]?.querySelector("video")?.loop).toBe(true)
  })
})
