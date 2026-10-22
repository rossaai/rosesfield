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
import { appLine } from "@/catalog/app-facts"
import { HowItWorks, samplesOf, stepsOf } from "@/screens/app/how-it-works"
import { publishedQuery, type SharedOutput } from "@/screens/explore/share-api"
import { mediaOf, showcaseOf } from "@/showcase/showcase"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const video = appListing.parse(findApp("video"))
const effects = appListing.parse(findApp("effects"))
const image = appListing.parse(findApp("image"))
const relight = appListing.parse(findApp("relight"))

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

  it("stands three steps, what you add, what you choose and what you get, with Recreate on the result", () => {
    const steps = stepsOf(effects, samplesOf([], "effects"))
    expect(steps.map((step) => step.id)).toEqual(["add", "choose", "get"])
    expect(steps.map((step) => step.action !== undefined)).toEqual([
      false,
      false,
      true,
    ])
  })

  it("shows no media slot for a step with no held example, never another app's still", () => {
    const steps = stepsOf(video, [], [])
    expect(steps.map((step) => step.media)).toEqual([null, null, null])
    const effectsSteps = stepsOf(effects, samplesOf([], "effects"))
    expect(effectsSteps[0]?.media).toBeNull()
    expect(effectsSteps[2]?.media).not.toBeNull()
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

async function stepsShown(count: number): Promise<HTMLElement[]> {
  return await waitFor(() => {
    const found = screen.getAllByRole("listitem")
    expect(found).toHaveLength(count)
    return found
  })
}

describe("How it works, one composition for every app", () => {
  it("heads the canvas with the app's line at the display size, then three cards in a three-column grid", async () => {
    renderHow(() => <HowItWorks app={image} />, [])
    await stepsShown(3)
    const heading = screen.getByRole("heading", { level: 2 })
    expect(heading.textContent).toBe(appLine(image))
    expect(heading.className).toContain("text-display")
    const grid = document.querySelector("[data-slot=how-it-works] ol")
    expect(grid?.className).toContain("@regular:grid-cols-3")
    expect(grid?.className).toContain("grid-cols-1")
    const titles = [...document.querySelectorAll("[data-slot=how-step] h3")]
    expect(titles.every((title) => title.className.includes("font-medium"))).toBe(
      true
    )
    expect(titles.every((title) => title.className.includes("text-body"))).toBe(
      true
    )
  })

  it("shows Relight's input still, its settings and its result", async () => {
    renderHow(() => <HowItWorks app={relight} />, [])
    const steps = await stepsShown(3)
    const [item] = showcaseOf("relight")
    expect(steps[0]?.querySelector("img")?.getAttribute("src")).toBe(
      mediaOf("portrait-woman.webp")
    )
    expect(steps[1]?.querySelector("[data-slot=how-settings]")).not.toBeNull()
    expect(steps[2]?.querySelector("img")?.getAttribute("src")).toBe(item?.src)
  })

  it("plays Effects' clip muted and looping, and shows no still from another app", async () => {
    renderHow(() => <HowItWorks app={effects} />, [])
    const steps = await stepsShown(3)
    expect(steps[0]?.querySelector("[data-slot=how-step-media]")).toBeNull()
    const clip = steps[2]?.querySelector("video")
    expect(clip?.muted).toBe(true)
    expect(clip?.loop).toBe(true)
    const others = showcaseOf("image").map((one) => one.src)
    const shown = [...document.querySelectorAll("img")].map((one) =>
      one.getAttribute("src")
    )
    expect(shown.some((src) => others.includes(src ?? ""))).toBe(false)
    expect(steps[2]?.querySelector("a")?.getAttribute("href")).toBe(
      "/apps/effects"
    )
  })

  it("shows Image's prompt as what you add", async () => {
    renderHow(() => <HowItWorks app={image} />, [])
    const steps = await stepsShown(3)
    const [item] = showcaseOf("image")
    expect(steps[0]?.querySelector("[data-slot=how-prompt]")?.textContent).toBe(
      item?.prompt
    )
  })
})
