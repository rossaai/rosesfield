import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findCatalogApp } from "@/catalog/catalog-apps"
import {
  type HostedState,
  useHostedModel,
} from "@/screens/app/hosted/use-hosted-model"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const guided = "ltx-2-5-guide"

const control = "ltx-2-3-control"

function graph(id: string, order: number): CatalogModel {
  return {
    id,
    kind: "graph",
    maker: "Lightricks",
    name: id,
    nameKey: null,
    task: "motion-transfer",
    tags: [{ kind: "open-weights" }],
    form: null,
    facts: {
      lab: null,
      release: null,
      weights: null,
      lineKey: null,
      scores: {
        "motion-transfer": {
          score: 90 - order,
          rank: order,
          order,
          of: 2,
          sources: [],
          tiers: [],
        },
      },
    },
  }
}

const list = {
  models: [graph(guided, 1), graph(control, 2)],
  defaultModel: guided,
  refusal: null,
}

function keepLastUsed(model: string): void {
  window.localStorage.setItem(
    "rosesfield.app.last-used",
    JSON.stringify({
      motion: { model, settings: {}, count: 1, aspectRatio: null },
    })
  )
}

/** Opens Motion at the address a Library or Explore tile opens, and lets the model list arrive once the form has filled, as it does on a fresh page. */
async function openMotion(
  example: string | undefined,
  filled: (form: AppForm) => boolean
): Promise<AppForm> {
  const motion = findCatalogApp("motion")
  if (motion === null) {
    throw new Error("no Motion app")
  }
  const opened = motion
  const seen: { form: AppForm; hosted: HostedState }[] = []
  function Probe(): ReactElement | null {
    const form = useAppForm(opened, {
      use: undefined,
      from: undefined,
      example,
    })
    seen.push({ form, hosted: useHostedModel(opened, form) })
    return null
  }
  const client = new QueryClient()
  client.setQueryData(["settings"], { engine: { key: "set" } })
  const router = createRouter({
    routeTree: createRootRoute({ component: Probe }),
    history: createMemoryHistory(),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await waitFor(() => {
    const last = seen.at(-1)
    expect(last !== undefined && filled(last.form)).toBe(true)
  })
  act(() => {
    client.setQueryData(["models", "motion", "set"], list)
  })
  await waitFor(() => {
    expect(seen.at(-1)?.hosted.models).toHaveLength(list.models.length)
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  const last = seen.at(-1)
  if (last === undefined) {
    throw new Error("no form")
  }
  return last.form
}

describe("an example link opens its example over the model you last used", () => {
  it("opens Grab and run on its guided model at 1080p after you used Motion on another model", async () => {
    keepLastUsed(control)
    const form = await openMotion(
      "grab-and-run",
      (one) => one.values.inputs.example === "grab-and-run"
    )
    expect(form.values.inputs.example).toBe("grab-and-run")
    expect(form.values.inputs.model).toBe(guided)
    expect(form.values.inputs.resolution).toBe("1080p")
  })

  it("control: opens Motion with no example on the model you last used", async () => {
    keepLastUsed(control)
    const form = await openMotion(undefined, () => true)
    expect(form.values.inputs.model).toBe(control)
  })
})
