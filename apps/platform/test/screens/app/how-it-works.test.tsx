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
import { t } from "@/copy/t"
import {
  HowItWorks,
  ownExampleOf,
  samplesOf,
  stepsOf,
} from "@/screens/app/how-it-works"
import { RunSettings } from "@/screens/app/how-media"
import { publishedQuery, type SharedOutput } from "@/screens/explore/share-api"
import { mediaOf, showcaseOf } from "@/showcase/showcase"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const video = appListing.parse(findApp("video"))
const motion = appListing.parse(findApp("motion"))
const lipsync = appListing.parse(findApp("lipsync"))
const image = appListing.parse(findApp("image"))
const relight = appListing.parse(findApp("relight"))
const audio = appListing.parse(findApp("audio"))

const otherId = "93e9078d-0000-4000-8000-0000000000ff"

const madeVideo = run.parse({
  id: "93e9078d-0000-4000-8000-0000000000aa",
  appId: "video",
  status: "done",
  inputs: { prompt: "A field at dusk", model: "ltx-2-5" },
  count: 1,
  aspectRatio: "16:9",
  seed: 4,
  outputs: ["93e9078d-0000-4000-8000-0000000000bb"],
  progress: 1,
  engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
  cost: null,
  origin: "live",
  failure: null,
  createdAt: "2026-10-20T10:00:00.000Z",
  finishedAt: "2026-10-20T10:01:00.000Z",
})

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
        share("a", "motion", "video"),
        share("b", "image", "image"),
        share("c", "motion", "audio"),
        share("d", "motion", "image"),
      ],
      "motion",
      []
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
    const samples = samplesOf([share("a", "motion", "video")], "motion")
    expect(samples.map((sample) => sample.key)).toEqual([
      ...showcaseOf("motion").map((item) => `showcase-${item.file}`),
      "share-a",
    ])
  })

  it("stands three steps, what you add, what you choose and what you get, with Recreate on the result", () => {
    const steps = stepsOf(motion, samplesOf([], "motion"))
    expect(steps.map((step) => step.id)).toEqual(["add", "choose", "get"])
    expect(steps.map((step) => step.action !== undefined)).toEqual([
      false,
      false,
      true,
    ])
  })

  it("fills every step even with no held example, and offers Recreate only on a real run", () => {
    const steps = stepsOf(video, [], [])
    expect(steps.every((step) => step.media !== null)).toBe(true)
    expect(steps.some((step) => step.action !== undefined)).toBe(false)
    const own = stepsOf(video, [], [], madeVideo)
    expect(own[2]?.action).toBeDefined()
  })

  it("takes your newest finished run of this app as the example, never a demo, a failure or another app's", () => {
    const failed = run.parse({ ...madeVideo, id: otherId, status: "failed" })
    const demo = run.parse({ ...madeVideo, id: otherId, origin: "demo" })
    const other = run.parse({ ...madeVideo, id: otherId, appId: "image" })
    expect(ownExampleOf(video, [failed, demo, other, madeVideo])?.id).toBe(
      madeVideo.id
    )
    expect(ownExampleOf(video, [failed, demo, other])).toBeNull()
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
    expect(
      titles.every((title) => title.className.includes("font-medium"))
    ).toBe(true)
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

  it("plays Motion's Library example muted and looping, with Remix opening Motion on that example", async () => {
    renderHow(() => <HowItWorks app={motion} />, [])
    const steps = await stepsShown(3)
    const [item] = showcaseOf("motion")
    const clip = steps[2]?.querySelector("video")
    expect(clip?.getAttribute("src")).toBe(item?.src)
    expect(clip?.muted).toBe(true)
    expect(clip?.loop).toBe(true)
    expect(steps[2]?.querySelector("a")?.getAttribute("href")).toBe(
      "/apps/motion?example=grab-and-run"
    )
  })

  it("shows one glyph for what an app with no example takes, its default model, and one glyph for what it makes, with no picture", async () => {
    renderHow(() => <HowItWorks app={lipsync} />, [])
    const steps = await stepsShown(3)
    expect(steps[0]?.querySelectorAll("[data-made=no]").length).toBeGreaterThan(
      0
    )
    expect(
      steps[1]?.querySelector("[data-slot=how-model]")?.textContent
    ).toBeTruthy()
    expect(
      steps[2]?.querySelector("[data-made=yes]")?.getAttribute("data-kind")
    ).toBe("video")
    expect(document.querySelectorAll("img, video")).toHaveLength(0)
  })

  it("shows Image's prompt as what you add", async () => {
    renderHow(() => <HowItWorks app={image} />, [])
    const steps = await stepsShown(3)
    const [item] = showcaseOf("image")
    expect(steps[0]?.querySelector("[data-slot=how-prompt]")?.textContent).toBe(
      item?.prompt
    )
  })

  it("titles each step with no shared caption, clamps the prompt to three lines and lists no seed", async () => {
    renderHow(() => <HowItWorks app={image} />, [])
    const steps = await stepsShown(3)
    for (const step of steps) {
      expect(step.querySelector(":scope > div ~ p, :scope > p")).toBeNull()
      expect(step.textContent).not.toContain(t("app.how.model.line"))
    }
    const prompt = steps[0]?.querySelector("[data-slot=how-prompt-text]")
    expect(prompt?.className.split(" ")).toContain("line-clamp-3")
    const labels = [
      ...(steps[1]?.querySelectorAll("[data-slot=how-settings] dt") ?? []),
    ].map((label) => label.textContent)
    expect(labels.length).toBeGreaterThan(0)
  })

  it("lists an example's settings with no seed row", () => {
    render(
      <RunSettings
        app={audio}
        run={run.parse({
          ...madeVideo,
          appId: "audio",
          inputs: { prompt: "Here is the one change", language: "en" },
          seed: 1488584158,
          aspectRatio: null,
        })}
      />
    )
    const labels = [
      ...document.querySelectorAll("[data-slot=how-settings] dt"),
    ].map((label) => label.textContent ?? "")
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.some((label) => /seed/i.test(label))).toBe(false)
    expect(document.body.textContent).not.toContain("1488584158")
  })
})
