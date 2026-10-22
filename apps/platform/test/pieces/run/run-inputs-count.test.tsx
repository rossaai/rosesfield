import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t, tCatalog } from "@/copy/t"
import { RunInputs } from "@/pieces/run/run-inputs"

afterEach(() => cleanup())

const photo = ["0a1b2c3d-4e5f-4a6b-8c7d-8e9fa0b1c2d3"]

function runOf(
  id: string,
  appId: string,
  count: number,
  inputs: Record<string, unknown>
): Run {
  return run.parse({
    id,
    appId,
    status: "done",
    inputs,
    count,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T10:00:00.000Z",
    finishedAt: "2026-10-17T10:00:30.000Z",
  })
}

function Shown({ shown }: { shown: Run }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={client}>
      <RunInputs app={findCatalogApp(shown.appId)} run={shown} />
    </QueryClientProvider>
  )
}

function valuesOf(container: HTMLElement, label: string): string[] {
  return [...container.querySelectorAll("dl > div")]
    .filter((row) => row.querySelector("dt")?.textContent === label)
    .map((row) => row.querySelector("dd")?.textContent ?? "")
}

const relight = runOf("b0000000-0000-4000-8000-000000000001", "layers", 1, {
  mode: "relight",
  count: "1",
  layer: photo,
  light: "left",
  tone: "auto",
  quality: "draft",
})

const split = runOf("b0000000-0000-4000-8000-000000000002", "layers", 2, {
  mode: "split",
  model: "qwen-image-layered",
  count: "2",
  source: photo,
  quality: "draft",
})

const portraits = runOf(
  "b0000000-0000-4000-8000-000000000003",
  "characters",
  3,
  { mode: "traits", count: "3", gender: "woman" }
)

describe("RunInputs count", () => {
  it("shows a layers run's layer count once, under the app's own label", () => {
    const { container } = render(<Shown shown={split} />)
    expect(valuesOf(container, tCatalog("layers.input.count.label"))).toEqual([
      "2",
    ])
    expect(valuesOf(container, t("field.count.label"))).toEqual([])
  })

  it("drops the earlier run's layer count when the list moves to another layers run", () => {
    const { container, rerender } = render(<Shown shown={relight} />)
    rerender(<Shown shown={split} />)
    expect(valuesOf(container, tCatalog("layers.input.count.label"))).toEqual([
      "2",
    ])
  })

  it("shows a characters run's portrait count once, under the app's own label", () => {
    const { container } = render(<Shown shown={portraits} />)
    expect(
      valuesOf(container, tCatalog("characters.input.count.label"))
    ).toEqual(["3"])
    expect(valuesOf(container, t("field.count.label"))).toEqual([])
  })

  it("lists Count for a run of more than one result, and no Count for a run of one", () => {
    const image = (id: string, count: number) =>
      runOf(id, "image", count, {
        prompt: "a red kite",
        model: "z-image-turbo",
      })
    const two = render(
      <Shown shown={image("b0000000-0000-4000-8000-000000000004", 2)} />
    )
    expect(valuesOf(two.container, t("field.count.label"))).toEqual(["2"])
    cleanup()
    const one = render(
      <Shown shown={image("b0000000-0000-4000-8000-000000000005", 1)} />
    )
    expect(valuesOf(one.container, t("field.count.label"))).toEqual([])
  })
})
